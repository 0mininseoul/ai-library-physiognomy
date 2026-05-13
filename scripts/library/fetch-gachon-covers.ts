import "../books/load-env";

import fs from "node:fs/promises";
import path from "node:path";
import { pathToFileURL } from "node:url";
import {
  extractIsbn13,
  normalizeBookTitle,
  pickBestCandidate,
  scoreMetadataCandidate,
  type MetadataCandidate,
  type MetadataProvider,
} from "./metadata-match";
import { searchGachonLibrary } from "./gachon-library-provider";
import type { GachonRawBook } from "./types";

const IN_PATH = path.join(process.cwd(), "data/library/gachon-raw.json");
const OUT_PATH = path.join(process.cwd(), "data/library/gachon-enriched.json");
const UNMATCHED_PATH = path.join(process.cwd(), "data/library/unmatched.json");
const REVIEW_NEEDED_PATH = path.join(process.cwd(), "data/library/review-needed.json");
const MANUAL_OVERRIDES_PATH = path.join(process.cwd(), "data/library/manual-overrides.json");
const NAVER_BASE = "https://openapi.naver.com/v1/search/book.json";
const GOOGLE_BOOKS_BASE = "https://www.googleapis.com/books/v1/volumes";
const DATA4LIBRARY_SEARCH_BASE = "https://data4library.kr/api/srchBooks";
const DATA4LIBRARY_DETAIL_BASE = "https://data4library.kr/api/srchDtlList";
const QUERY_DELAY_MS = 350;

type MetadataStatus = "matched" | "review_needed" | "unmatched";

type NaverItem = {
  title?: string;
  author?: string;
  image?: string;
  isbn?: string;
  description?: string;
  publisher?: string;
  pubdate?: string;
  link?: string;
};

type GoogleVolume = {
  volumeInfo?: {
    title?: string;
    authors?: string[];
    publisher?: string;
    publishedDate?: string;
    description?: string;
    infoLink?: string;
    imageLinks?: { thumbnail?: string; smallThumbnail?: string };
    industryIdentifiers?: Array<{ type?: string; identifier?: string }>;
  };
};

type Data4LibraryDoc = {
  bookname?: string;
  authors?: string;
  publisher?: string;
  publication_year?: string;
  isbn13?: string;
  bookImageURL?: string;
  bookDtlUrl?: string;
  description?: string;
};

type ManualOverride = {
  isbn13?: string | null;
  title?: string;
  author?: string;
  publisher?: string;
  publishedYear?: number | string | null;
  description?: string;
  coverUrl?: string | null;
  detailUrl?: string | null;
  reason?: string;
};

export type GachonEnrichedBook = GachonRawBook & {
  isbn13: string | null;
  coverUrl: string | null;
  detailUrl?: string | null;
  description: string;
  matchScore: number;
  matched: boolean;
  metadataSource?: MetadataProvider | null;
  metadataStatus?: MetadataStatus;
  metadataScore?: number;
  metadataCandidates?: Array<{
    provider: MetadataProvider;
    title: string;
    authors: string[];
    publisher: string;
    publishedYear: number | string | null;
    isbn13: string | null;
    coverUrl: string | null;
    detailUrl: string | null;
    description: string;
    score: number;
    decision: string;
    signals: Record<string, number | string | boolean>;
    query: string;
  }>;
  metadataNotes?: string[];
};

type CliArgs = {
  dryRun: boolean;
  onlyMissing: boolean;
  limit: number | null;
  sourceLabel: GachonRawBook["sourceLabel"] | null;
};

type CandidateWithScore = {
  candidate: MetadataCandidate;
  score: number;
  decision: string;
  signals: Record<string, number | string | boolean>;
};

type ReviewNeededRow = GachonRawBook & {
  metadataCandidates: GachonEnrichedBook["metadataCandidates"];
};

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function stripHtml(value: string | null | undefined): string {
  return (value ?? "")
    .replace(/<[^>]+>/g, "")
    .replace(/&quot;/g, "\"")
    .replace(/&#39;/g, "'")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/\s+/g, " ")
    .trim();
}

function parseArgs(argv: string[]): CliArgs {
  const flags = (argv[0]?.startsWith("--") ? argv : argv.slice(2)).filter((arg) => arg !== "--");
  const args: CliArgs = { dryRun: false, onlyMissing: false, limit: null, sourceLabel: null };

  for (let i = 0; i < flags.length; i += 1) {
    const arg = flags[i]!;
    if (arg === "--dry-run") args.dryRun = true;
    else if (arg === "--only-missing") args.onlyMissing = true;
    else if (arg === "--limit") {
      const value = Number.parseInt(flags[i + 1] ?? "", 10);
      if (!Number.isFinite(value) || value < 1) throw new Error("--limit requires a positive integer");
      args.limit = value;
      i += 1;
    } else if (arg === "--source-label") {
      const value = flags[i + 1];
      if (value !== "bookcuration" && value !== "openlibrary") throw new Error("--source-label must be bookcuration or openlibrary");
      args.sourceLabel = value;
      i += 1;
    } else {
      throw new Error(`Unknown option: ${arg}`);
    }
  }

  return args;
}

function titleVariants(book: GachonRawBook): string[] {
  const normalized = normalizeBookTitle(book.title);
  const beforeColon = normalized.split(/\s*[:：]\s*/)[0]!.trim();
  const beforeEquals = normalized.split(/\s*=\s*/)[0]!.trim();
  return Array.from(new Set([normalized, beforeColon, beforeEquals, book.title].map((value) => value.trim()).filter(Boolean)));
}

function candidateQueryVariants(book: GachonRawBook): string[] {
  return Array.from(
    new Set(
      titleVariants(book)
        .flatMap((title) => [`${title} ${book.author}`, `${title} ${book.publisher}`, title])
        .map((query) => query.trim().slice(0, 100))
        .filter(Boolean),
    ),
  );
}

function naverItemToCandidate(item: NaverItem, query: string): MetadataCandidate {
  return {
    provider: "naver",
    isbn13: extractIsbn13(item.isbn) ?? null,
    title: stripHtml(item.title),
    authors: stripHtml(item.author)
      .split(/\s*\|\s*|\s*,\s*|;\s*/)
      .filter(Boolean),
    publisher: stripHtml(item.publisher),
    publishedYear: item.pubdate ?? null,
    description: stripHtml(item.description),
    coverUrl: item.image ?? null,
    detailUrl: item.link ?? null,
    query,
    fetchedAt: new Date().toISOString(),
  };
}

async function searchNaver(clientId: string, secret: string, query: string, sort: "sim" | "date"): Promise<MetadataCandidate[]> {
  const url = new URL(NAVER_BASE);
  url.searchParams.set("query", query);
  url.searchParams.set("display", "10");
  url.searchParams.set("sort", sort);

  for (let attempt = 1; attempt <= 3; attempt += 1) {
    const res = await fetch(url, {
      headers: { "X-Naver-Client-Id": clientId, "X-Naver-Client-Secret": secret },
    });
    if (res.ok) {
      const json = (await res.json()) as { items?: NaverItem[] };
      return (json.items ?? []).map((item) => naverItemToCandidate(item, `${query} sort=${sort}`));
    }
    if (res.status === 429 && attempt < 3) {
      await sleep(800 * attempt);
      continue;
    }
    throw new Error(`Naver API ${res.status}`);
  }
  return [];
}

function googleVolumeToCandidate(volume: GoogleVolume, query: string): MetadataCandidate {
  const info = volume.volumeInfo ?? {};
  const isbn13 =
    info.industryIdentifiers?.find((item) => item.type === "ISBN_13")?.identifier ??
    extractIsbn13(info.industryIdentifiers?.map((item) => item.identifier).join(" "));
  return {
    provider: "google_books",
    isbn13: isbn13 ?? null,
    title: info.title ?? "",
    authors: info.authors ?? [],
    publisher: info.publisher ?? "",
    publishedYear: info.publishedDate ?? null,
    description: stripHtml(info.description),
    coverUrl: info.imageLinks?.thumbnail ?? info.imageLinks?.smallThumbnail ?? null,
    detailUrl: info.infoLink ?? null,
    query,
    fetchedAt: new Date().toISOString(),
  };
}

async function searchGoogleBooks(book: GachonRawBook): Promise<MetadataCandidate[]> {
  const title = normalizeBookTitle(book.title);
  const author = book.author.split(/[,\s]/).filter(Boolean)[0] ?? "";
  const queries = [`intitle:${title} inauthor:${author}`, `intitle:${title} inpublisher:${book.publisher}`].filter(Boolean);
  const candidates: MetadataCandidate[] = [];

  for (const query of queries) {
    const url = new URL(GOOGLE_BOOKS_BASE);
    url.searchParams.set("q", query);
    url.searchParams.set("maxResults", "5");
    const res = await fetch(url);
    if (!res.ok) continue;
    let json: { items?: GoogleVolume[] };
    try {
      json = (await res.json()) as { items?: GoogleVolume[] };
    } catch {
      continue;
    }
    candidates.push(...(json.items ?? []).map((volume) => googleVolumeToCandidate(volume, query)));
    await sleep(QUERY_DELAY_MS);
  }

  return candidates;
}

function data4LibraryDocToCandidate(doc: Data4LibraryDoc, query: string): MetadataCandidate {
  return {
    provider: "data4library",
    isbn13: extractIsbn13(doc.isbn13) ?? null,
    title: stripHtml(doc.bookname),
    authors: stripHtml(doc.authors)
      .split(/\s*;\s*|\s*,\s*/)
      .filter(Boolean),
    publisher: stripHtml(doc.publisher),
    publishedYear: doc.publication_year ?? null,
    description: stripHtml(doc.description ?? doc.bookDtlUrl),
    coverUrl: doc.bookImageURL ?? null,
    detailUrl: doc.bookDtlUrl ?? null,
    query,
    fetchedAt: new Date().toISOString(),
  };
}

async function searchData4Library(authKey: string, book: GachonRawBook): Promise<MetadataCandidate[]> {
  const candidates: MetadataCandidate[] = [];
  for (const query of titleVariants(book).slice(0, 2)) {
    const url = new URL(DATA4LIBRARY_SEARCH_BASE);
    url.searchParams.set("authKey", authKey);
    url.searchParams.set("keyword", query);
    url.searchParams.set("pageNo", "1");
    url.searchParams.set("pageSize", "10");
    url.searchParams.set("format", "json");
    const res = await fetch(url);
    if (!res.ok) continue;
    let json: { response?: { docs?: Array<{ doc?: Data4LibraryDoc }> } };
    try {
      json = (await res.json()) as { response?: { docs?: Array<{ doc?: Data4LibraryDoc }> } };
    } catch {
      continue;
    }
    candidates.push(...(json.response?.docs ?? []).flatMap((item) => (item.doc ? [data4LibraryDocToCandidate(item.doc, query)] : [])));
    await sleep(QUERY_DELAY_MS);
  }
  return candidates;
}

async function fetchData4LibraryDetail(authKey: string, isbn13: string): Promise<Partial<MetadataCandidate> | null> {
  const url = new URL(DATA4LIBRARY_DETAIL_BASE);
  url.searchParams.set("authKey", authKey);
  url.searchParams.set("isbn13", isbn13);
  url.searchParams.set("format", "json");
  const res = await fetch(url);
  if (!res.ok) return null;
  let json: { response?: { detail?: Array<{ book?: Data4LibraryDoc }> } };
  try {
    json = (await res.json()) as { response?: { detail?: Array<{ book?: Data4LibraryDoc }> } };
  } catch {
    return null;
  }
  const book = json.response?.detail?.[0]?.book;
  if (!book) return null;
  return {
    description: stripHtml(book.description),
    coverUrl: book.bookImageURL ?? null,
    detailUrl: book.bookDtlUrl ?? null,
  };
}

async function ensureManualOverrideFile(): Promise<Record<string, ManualOverride>> {
  try {
    return JSON.parse(await fs.readFile(MANUAL_OVERRIDES_PATH, "utf8")) as Record<string, ManualOverride>;
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code !== "ENOENT") throw error;
    await fs.writeFile(MANUAL_OVERRIDES_PATH, "{}\n", "utf8");
    return {};
  }
}

function manualCandidate(book: GachonRawBook, overrides: Record<string, ManualOverride>): MetadataCandidate | null {
  const override = overrides[book.registrationNo];
  if (!override) return null;
  return {
    provider: "manual",
    isbn13: extractIsbn13(override.isbn13) ?? null,
    title: override.title ?? book.title,
    authors: [override.author ?? book.author].filter(Boolean),
    publisher: override.publisher ?? book.publisher,
    publishedYear: override.publishedYear ?? book.publishedYear,
    description: override.description ?? "",
    coverUrl: override.coverUrl ?? null,
    detailUrl: override.detailUrl ?? null,
    query: `manual:${book.registrationNo}`,
    fetchedAt: new Date().toISOString(),
  };
}

function scoreCandidates(book: GachonRawBook, candidates: MetadataCandidate[]): CandidateWithScore[] {
  return candidates
    .map((candidate) => ({ candidate, ...scoreMetadataCandidate(book, candidate) }))
    .sort((left, right) => right.score - left.score);
}

function serializableCandidates(scored: CandidateWithScore[]): GachonEnrichedBook["metadataCandidates"] {
  return scored.slice(0, 5).map(({ candidate, score, decision, signals }) => ({
    provider: candidate.provider,
    title: candidate.title,
    authors: candidate.authors,
    publisher: candidate.publisher,
    publishedYear: candidate.publishedYear,
    isbn13: candidate.isbn13,
    coverUrl: candidate.coverUrl,
    detailUrl: candidate.detailUrl,
    description: candidate.description,
    score,
    decision,
    signals,
    query: candidate.query,
  }));
}

function existingNeedsMetadata(book: GachonEnrichedBook | undefined): boolean {
  return !book || !book.coverUrl || !book.description || !book.isbn13 || book.metadataStatus === "review_needed" || book.metadataStatus === "unmatched";
}

async function collectCandidates(book: GachonRawBook, overrides: Record<string, ManualOverride>): Promise<MetadataCandidate[]> {
  const manual = manualCandidate(book, overrides);
  if (manual) return [manual];

  const candidates: MetadataCandidate[] = [];
  const clientId = process.env.NAVER_CLIENT_ID;
  const clientSecret = process.env.NAVER_CLIENT_SECRET;
  if (clientId && clientSecret) {
    for (const query of candidateQueryVariants(book).slice(0, 4)) {
      candidates.push(...(await searchNaver(clientId, clientSecret, query, "sim")));
      if (hasConfidentCandidate(book, candidates)) return candidates;
      if ((book.publishedYear ?? 0) >= 2024) candidates.push(...(await searchNaver(clientId, clientSecret, query, "date")));
      if (hasConfidentCandidate(book, candidates)) return candidates;
      await sleep(QUERY_DELAY_MS);
    }
  }

  candidates.push(...(await searchGoogleBooks(book)));
  if (hasConfidentCandidate(book, candidates)) return candidates;

  const data4LibraryKey = process.env.DATA4LIBRARY_AUTH_KEY;
  if (data4LibraryKey) {
    candidates.push(...(await searchData4Library(data4LibraryKey, book)));
  }
  if (hasConfidentCandidate(book, candidates)) return candidates;

  candidates.push(...(await searchGachonLibrary(book)));

  return candidates;
}

function hasConfidentCandidate(book: GachonRawBook, candidates: MetadataCandidate[]): boolean {
  const best = pickBestCandidate(book, candidates);
  return Boolean(best && best.decision === "accept" && best.score >= 0.9 && best.candidate.isbn13);
}

async function enrichBook(book: GachonRawBook, overrides: Record<string, ManualOverride>): Promise<GachonEnrichedBook> {
  const notes: string[] = [];
  const candidates = await collectCandidates(book, overrides);
  const scored = scoreCandidates(book, candidates);
  const best = pickBestCandidate(book, candidates);
  let candidate = best?.candidate ?? null;
  let score = best?.score ?? 0;
  let status: MetadataStatus = best?.decision === "accept" ? "matched" : best?.decision === "review_needed" ? "review_needed" : "unmatched";

  if (candidate?.isbn13 && process.env.DATA4LIBRARY_AUTH_KEY) {
    const detail = await fetchData4LibraryDetail(process.env.DATA4LIBRARY_AUTH_KEY, candidate.isbn13);
    if (detail) {
      candidate = {
        ...candidate,
        description: detail.description || candidate.description,
        coverUrl: detail.coverUrl || candidate.coverUrl,
        detailUrl: detail.detailUrl || candidate.detailUrl,
      };
      notes.push("data4library_detail_enriched");
      const rescored = scoreMetadataCandidate(book, candidate);
      score = rescored.score;
      status = rescored.decision === "accept" ? "matched" : rescored.decision === "review_needed" ? "review_needed" : "unmatched";
    }
  }

  if (!candidate) status = "unmatched";
  if (candidate?.provider === "manual") {
    status = "matched";
    score = 1;
  }

  return {
    ...book,
    isbn13: candidate?.isbn13 ?? null,
    coverUrl: candidate?.coverUrl ?? null,
    detailUrl: candidate?.detailUrl ?? null,
    description: candidate?.description ?? "",
    matchScore: score,
    matched: status === "matched",
    metadataSource: candidate?.provider ?? null,
    metadataStatus: status,
    metadataScore: score,
    metadataCandidates: serializableCandidates(scored),
    metadataNotes: notes,
  };
}

async function readExistingEnriched(): Promise<Map<string, GachonEnrichedBook>> {
  try {
    const rows = JSON.parse(await fs.readFile(OUT_PATH, "utf8")) as GachonEnrichedBook[];
    return new Map(rows.map((row) => [row.registrationNo, row]));
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === "ENOENT") return new Map();
    throw error;
  }
}

async function main() {
  const args = parseArgs(process.argv);
  const raw = JSON.parse(await fs.readFile(IN_PATH, "utf8")) as GachonRawBook[];
  const overrides = await ensureManualOverrideFile();
  const existing = await readExistingEnriched();
  const enriched: GachonEnrichedBook[] = [];
  const unmatched: GachonRawBook[] = [];
  const reviewNeeded: ReviewNeededRow[] = [];
  let processed = 0;

  for (let i = 0; i < raw.length; i += 1) {
    const book = raw[i]!;
    const existingBook = existing.get(book.registrationNo);
    const eligibleSource = !args.sourceLabel || book.sourceLabel === args.sourceLabel;
    const eligibleMissing = !args.onlyMissing || existingNeedsMetadata(existingBook);
    const withinLimit = args.limit == null || processed < args.limit;

    if (!eligibleSource || !eligibleMissing || !withinLimit) {
      enriched.push(existingBook ?? ({ ...book, isbn13: null, coverUrl: null, description: "", matchScore: 0, matched: false } as GachonEnrichedBook));
      continue;
    }

    let row: GachonEnrichedBook;
    try {
      row = await enrichBook(book, overrides);
    } catch (error) {
      console.warn(`Metadata fetch failed for #${i} "${book.title}":`, error);
      row = {
        ...book,
        isbn13: null,
        coverUrl: null,
        description: "",
        matchScore: 0,
        matched: false,
        metadataStatus: "unmatched",
        metadataSource: null,
        metadataScore: 0,
        metadataCandidates: [],
        metadataNotes: ["fetch_error"],
      };
    }

    processed += 1;
    enriched.push(row);
    if (row.metadataStatus === "unmatched") unmatched.push(book);
    if (row.metadataStatus === "review_needed") reviewNeeded.push({ ...book, metadataCandidates: row.metadataCandidates });
    console.log(`${args.dryRun ? "Dry-run" : "Enriched"} ${processed}: ${row.metadataStatus} ${row.metadataScore ?? 0} "${book.title}"`);
  }

  if (args.dryRun) {
    console.log(`Dry-run complete. processed=${processed}, matched=${enriched.filter((book) => book.metadataStatus === "matched").length}, reviewNeeded=${reviewNeeded.length}, unmatched=${unmatched.length}`);
    return;
  }

  await fs.writeFile(OUT_PATH, JSON.stringify(enriched, null, 2), "utf8");
  await fs.writeFile(UNMATCHED_PATH, JSON.stringify(unmatched, null, 2), "utf8");
  await fs.writeFile(REVIEW_NEEDED_PATH, JSON.stringify(reviewNeeded, null, 2), "utf8");
  console.log(`Matched ${enriched.filter((book) => book.metadataStatus === "matched").length}/${enriched.length}. Review ${reviewNeeded.length}. Unmatched ${unmatched.length}.`);
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  main().catch((error) => {
    console.error(error);
    process.exit(1);
  });
}
