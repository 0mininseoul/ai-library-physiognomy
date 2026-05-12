import { extractIsbn13, normalizeBookTitle, type MetadataCandidate } from "./metadata-match";
import type { GachonRawBook } from "./types";

const GACHON_LIBRARY_BASE = "https://lib.gachon.ac.kr";
const GACHON_QUERY_DELAY_MS = 250;

export type GachonLibrarySearchItem = {
  itemId: string;
  controlNo: string;
  title: string;
  authors: string[];
  publisher: string;
  publishedYear: number | string | null;
  isbn13: string | null;
  detailUrl: string;
  query: string;
};

type GachonLibraryDetail = {
  isbn13: string | null;
  subjects: string[];
  description: string;
};

type ThumbnailResponse = {
  smallUrl?: string;
  mediumUrl?: string;
  largeUrl?: string;
  linkUrl?: string;
  provider?: string;
};

type ThumbnailCall = {
  isbn: string;
  sysdiv: string;
  ctrl: string;
};

class GachonLibraryClient {
  private readonly cookies = new Map<string, string>();

  async text(pathOrUrl: string, init: RequestInit = {}): Promise<string> {
    const res = await this.request(pathOrUrl, init);
    if (!res.ok) return "";
    return res.text();
  }

  async json<T>(pathOrUrl: string, init: RequestInit = {}): Promise<T | null> {
    const res = await this.request(pathOrUrl, init);
    if (!res.ok) return null;
    try {
      return (await res.json()) as T;
    } catch {
      return null;
    }
  }

  private async request(pathOrUrl: string, init: RequestInit = {}, redirects = 0): Promise<Response> {
    const url = new URL(pathOrUrl, GACHON_LIBRARY_BASE);
    const headers = new Headers(init.headers);
    headers.set("user-agent", headers.get("user-agent") ?? "Mozilla/5.0 metadata-recovery");
    headers.set("accept", headers.get("accept") ?? "text/html,application/xhtml+xml,application/xml,application/json;q=0.9,*/*;q=0.8");
    const cookie = this.cookieHeader();
    if (cookie) headers.set("cookie", cookie);

    const res = await fetch(url, { ...init, headers, redirect: "manual" });
    this.storeCookies(res.headers);

    if (redirects < 5 && res.status >= 300 && res.status < 400) {
      const location = res.headers.get("location");
      if (location) {
        return this.request(new URL(location, url).toString(), { method: "GET", headers: init.headers }, redirects + 1);
      }
    }

    return res;
  }

  private storeCookies(headers: Headers) {
    const getSetCookie = (headers as Headers & { getSetCookie?: () => string[] }).getSetCookie;
    const values = typeof getSetCookie === "function" ? getSetCookie.call(headers) : splitSetCookieHeader(headers.get("set-cookie"));
    for (const value of values) {
      const pair = value.split(";")[0];
      if (!pair) continue;
      const separator = pair.indexOf("=");
      if (separator <= 0) continue;
      this.cookies.set(pair.slice(0, separator), pair.slice(separator + 1));
    }
  }

  private cookieHeader(): string {
    return Array.from(this.cookies.entries())
      .map(([name, value]) => `${name}=${value}`)
      .join("; ");
  }
}

function splitSetCookieHeader(header: string | null): string[] {
  if (!header) return [];
  return header.split(/,(?=\s*[^;=,\s]+=)/g).map((value) => value.trim()).filter(Boolean);
}

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function decodeHtml(value: string): string {
  return value
    .replace(/&quot;/g, "\"")
    .replace(/&#39;/g, "'")
    .replace(/&apos;/g, "'")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&#(\d+);/g, (_, code: string) => String.fromCodePoint(Number.parseInt(code, 10)))
    .replace(/&#x([0-9a-f]+);/gi, (_, code: string) => String.fromCodePoint(Number.parseInt(code, 16)));
}

function stripHtml(value: string | null | undefined): string {
  return decodeHtml(value ?? "")
    .replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<button[\s\S]*?<\/button>/gi, " ")
    .replace(/<input\b[^>]*>/gi, " ")
    .replace(/<br\s*\/?>/gi, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/\s+,/g, ",")
    .replace(/,\s*,/g, ",")
    .replace(/\s+/g, " ")
    .trim();
}

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function parseYear(value: string): number | string | null {
  const match = value.match(/\d{4}/);
  return match ? Number.parseInt(match[0], 10) : null;
}

function parseThumbnailCalls(html: string): Map<string, ThumbnailCall> {
  const calls = new Map<string, ThumbnailCall>();
  const regex = /callThumbnail\('bookImg_(CAT(?:TOT|CAZ)\d+)','([^']*)','([^']*)','([^']*)'\)/g;
  for (const match of html.matchAll(regex)) {
    calls.set(match[1]!, {
      isbn: stripHtml(match[2]),
      sysdiv: stripHtml(match[3]),
      ctrl: stripHtml(match[4]),
    });
  }
  return calls;
}

function extractField(chunk: string, label: string): string {
  const regex = new RegExp(`<dt\\s+class="title">\\s*${escapeRegExp(label)}\\s*<\\/dt>\\s*<dd[^>]*>([\\s\\S]*?)<\\/dd>`, "u");
  const match = chunk.match(regex);
  return stripHtml(match?.[1]);
}

function extractDetailUrl(chunk: string, itemId: string): string {
  const regex = new RegExp(`href="([^"]*/search/detail/${escapeRegExp(itemId)}[^"]*)"`, "u");
  const href = decodeHtml(chunk.match(regex)?.[1] ?? `/search/detail/${itemId}`);
  return new URL(href, GACHON_LIBRARY_BASE).toString();
}

export function parseGachonLibrarySearchResults(html: string, query: string): GachonLibrarySearchItem[] {
  const thumbnailCalls = parseThumbnailCalls(html);
  const itemMatches = Array.from(html.matchAll(/<li id="item_(CAT(?:TOT|CAZ)\d+)"[^>]*>/g));
  return itemMatches.flatMap((match, index) => {
    const itemId = match[1]!;
    const start = match.index ?? 0;
    const end = itemMatches[index + 1]?.index ?? html.length;
    const chunk = html.slice(start, end);
    const thumbnail = thumbnailCalls.get(itemId);
    const title = extractField(chunk, "서명");
    if (!title) return [];

    const author = extractField(chunk, "저자");
    const publisher = extractField(chunk, "출판사");
    const publishedYear = parseYear(extractField(chunk, "출판년"));
    const isbn13 = extractIsbn13(thumbnail?.isbn) ?? null;
    return [
      {
        itemId,
        controlNo: thumbnail?.ctrl ?? itemId.match(/\d+$/)?.[0] ?? itemId,
        title,
        authors: author ? [author] : [],
        publisher,
        publishedYear,
        isbn13,
        detailUrl: extractDetailUrl(chunk, itemId),
        query,
      },
    ];
  });
}

export function parseGachonLibraryDetailXml(xml: string): GachonLibraryDetail {
  const profiles = new Map<string, string>();
  const profileRegex = /<profile[^>]*>\s*<name>([\s\S]*?)<\/name>\s*<value><!\[CDATA\[([\s\S]*?)\]\]><\/value>\s*<\/profile>/g;
  for (const match of xml.matchAll(profileRegex)) {
    profiles.set(stripHtml(match[1]), stripHtml(match[2]));
  }

  const subjects = [
    ...(profiles.get("비통제주제어") ?? "").split(/\s*,\s*/),
    ...(profiles.get("주제명") ?? "").split(/\s*,\s*/),
  ]
    .map((subject) => subject.trim())
    .filter(Boolean);

  const descriptionParts = [
    subjects.length > 0 ? `가천대학교 중앙도서관 주제어: ${subjects.join(", ")}` : "",
    profiles.get("일반주기") ? `일반주기: ${profiles.get("일반주기")}` : "",
    profiles.get("형태사항") ? `형태사항: ${profiles.get("형태사항")}` : "",
  ].filter(Boolean);

  return {
    isbn13: extractIsbn13(profiles.get("ISBN")) ?? null,
    subjects,
    description: descriptionParts.join(" / "),
  };
}

export function gachonLibraryItemToCandidate(
  item: GachonLibrarySearchItem,
  detail: GachonLibraryDetail | null,
  thumbnail: ThumbnailResponse | null,
): MetadataCandidate {
  return {
    provider: "gachon_library",
    isbn13: detail?.isbn13 ?? item.isbn13,
    title: item.title,
    authors: item.authors,
    publisher: item.publisher,
    publishedYear: item.publishedYear,
    description: detail?.description ?? "",
    coverUrl: thumbnail?.largeUrl ?? thumbnail?.mediumUrl ?? thumbnail?.smallUrl ?? null,
    detailUrl: item.detailUrl,
    query: item.query,
    fetchedAt: new Date().toISOString(),
  };
}

function queryVariants(book: GachonRawBook): string[] {
  const normalized = normalizeBookTitle(book.title);
  const beforeColon = normalized.split(/\s*[:：]\s*/)[0]!.trim();
  return Array.from(new Set([book.title, normalized, beforeColon, `${normalized} ${book.author}`, `${normalized} ${book.publisher}`].map((query) => query.trim()).filter(Boolean)));
}

async function fetchThumbnail(client: GachonLibraryClient, item: GachonLibrarySearchItem): Promise<ThumbnailResponse | null> {
  if (!item.isbn13 || !item.controlNo) return null;
  const body = new URLSearchParams({ isbn: item.isbn13, sysdiv: "CAT", ctrl: item.controlNo });
  return client.json<ThumbnailResponse>("/openapi/thumbnail", {
    method: "POST",
    headers: { "content-type": "application/x-www-form-urlencoded; charset=UTF-8", accept: "application/json" },
    body,
  });
}

async function fetchDetail(client: GachonLibraryClient, item: GachonLibrarySearchItem): Promise<GachonLibraryDetail | null> {
  const xml = await client.text(`/search/prevDetail/${item.itemId}`, {
    method: "POST",
    headers: { "content-type": "application/x-www-form-urlencoded; charset=UTF-8", accept: "application/xml,text/xml,*/*" },
  });
  if (!xml) return null;
  return parseGachonLibraryDetailXml(xml);
}

export async function searchGachonLibrary(book: GachonRawBook): Promise<MetadataCandidate[]> {
  const client = new GachonLibraryClient();
  const candidates: MetadataCandidate[] = [];

  for (const query of queryVariants(book).slice(0, 4)) {
    const url = new URL("/search/caz/result", GACHON_LIBRARY_BASE);
    url.searchParams.set("st", "KWRD");
    url.searchParams.set("si", "TOTAL");
    url.searchParams.set("q", query);
    const html = await client.text(url.toString());
    const items = parseGachonLibrarySearchResults(html, query).slice(0, 5);

    for (const item of items) {
      const [detail, thumbnail] = await Promise.all([fetchDetail(client, item), fetchThumbnail(client, item)]);
      candidates.push(gachonLibraryItemToCandidate(item, detail, thumbnail));
    }

    await sleep(GACHON_QUERY_DELAY_MS);
  }

  return candidates;
}
