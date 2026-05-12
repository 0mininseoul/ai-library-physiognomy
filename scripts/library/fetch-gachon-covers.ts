import "../books/load-env";

import fs from "node:fs/promises";
import path from "node:path";
import type { GachonRawBook } from "./types";

const IN_PATH = path.join(process.cwd(), "data/library/gachon-raw.json");
const OUT_PATH = path.join(process.cwd(), "data/library/gachon-enriched.json");
const UNMATCHED_PATH = path.join(process.cwd(), "data/library/unmatched.json");
const NAVER_BASE = "https://openapi.naver.com/v1/search/book.json";
const QUERY_DELAY_MS = 350;

type NaverItem = {
  title?: string;
  author?: string;
  image?: string;
  isbn?: string;
  description?: string;
  publisher?: string;
  pubdate?: string;
};

export type GachonEnrichedBook = GachonRawBook & {
  isbn13: string | null;
  coverUrl: string | null;
  description: string;
  matchScore: number;
  matched: boolean;
};

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function normalizeText(input: string): string {
  return input
    .replace(/<[^>]+>/g, "")
    .toLowerCase()
    .replace(/[()\[\]【】〈〉「」『』:：=].*$/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

function titleMatchRatio(left: string, right: string): number {
  const l = normalizeText(left);
  const r = normalizeText(right);
  if (!l || !r) return 0;
  const longer = l.length >= r.length ? l : r;
  const shorter = l.length >= r.length ? r : l;
  if (!shorter.length) return 0;
  let matched = 0;
  for (const ch of shorter) {
    if (longer.includes(ch)) matched += 1;
  }
  return matched / longer.length;
}

function publisherMatchScore(bookPublisher: string, itemPublisher: string): number {
  const a = normalizeText(bookPublisher);
  const b = normalizeText(itemPublisher);
  if (!a || !b) return 0;
  if (a === b) return 1;
  const aFirst = a.split(/[:/]/)[0]!.trim();
  const bFirst = b.split(/[:/]/)[0]!.trim();
  if (aFirst === bFirst) return 1;
  if (a.includes(bFirst) || b.includes(aFirst)) return 0.7;
  return 0;
}

function yearMatchScore(bookYear: number | null, itemPubdate: string | undefined): number {
  if (!bookYear || !itemPubdate || itemPubdate.length < 4) return 0;
  const itemYear = Number.parseInt(itemPubdate.slice(0, 4), 10);
  if (!Number.isFinite(itemYear)) return 0;
  const diff = Math.abs(bookYear - itemYear);
  if (diff === 0) return 1;
  if (diff === 1) return 0.6;
  if (diff === 2) return 0.3;
  return 0;
}

function compositeMatchScore(book: GachonRawBook, item: NaverItem): number {
  const title = titleMatchRatio(book.title, item.title ?? "");
  const publisher = publisherMatchScore(book.publisher, item.publisher ?? "");
  const year = yearMatchScore(book.publishedYear, item.pubdate);
  return title * 0.55 + publisher * 0.3 + year * 0.15;
}

function pickBestMatch(book: GachonRawBook, items: NaverItem[]): { item: NaverItem; score: number } | null {
  if (!items.length) return null;
  const scored = items
    .map((item) => ({ item, score: compositeMatchScore(book, item) }))
    .sort((a, b) => b.score - a.score);
  const top = scored[0]!;
  const minTitle = titleMatchRatio(book.title, top.item.title ?? "");
  if (top.score >= 0.55 && minTitle >= 0.35) return top;
  return null;
}

async function searchNaver(clientId: string, secret: string, query: string): Promise<NaverItem[]> {
  const url = new URL(NAVER_BASE);
  url.searchParams.set("query", query);
  url.searchParams.set("display", "10");
  for (let attempt = 1; attempt <= 3; attempt += 1) {
    const res = await fetch(url, {
      headers: { "X-Naver-Client-Id": clientId, "X-Naver-Client-Secret": secret },
    });
    if (res.ok) {
      const json = (await res.json()) as { items?: NaverItem[] };
      return json.items ?? [];
    }
    if (res.status === 429 && attempt < 3) {
      await sleep(800 * attempt);
      continue;
    }
    throw new Error(`Naver API ${res.status}`);
  }
  return [];
}

async function main() {
  const clientId = process.env.NAVER_CLIENT_ID;
  const clientSecret = process.env.NAVER_CLIENT_SECRET;
  if (!clientId || !clientSecret) throw new Error("Missing NAVER_CLIENT_ID/NAVER_CLIENT_SECRET");

  const raw = JSON.parse(await fs.readFile(IN_PATH, "utf8")) as GachonRawBook[];
  const enriched: GachonEnrichedBook[] = [];
  const unmatched: GachonRawBook[] = [];

  for (let i = 0; i < raw.length; i += 1) {
    const book = raw[i]!;
    const query = `${book.title} ${book.author}`.trim().slice(0, 100);
    let best: { item: NaverItem; score: number } | null = null;
    try {
      const items = await searchNaver(clientId, clientSecret, query);
      best = pickBestMatch(book, items);
      if (!best && book.publisher) {
        const fallback = await searchNaver(clientId, clientSecret, `${book.title} ${book.publisher}`.slice(0, 100));
        best = pickBestMatch(book, fallback);
        await sleep(QUERY_DELAY_MS);
      }
    } catch (error) {
      console.warn(`Naver search failed for #${i} "${book.title}":`, error);
    }

    enriched.push({
      ...book,
      isbn13: best?.item.isbn?.split(" ").find((part) => part.length === 13) ?? null,
      coverUrl: best?.item.image ?? null,
      description: best?.item.description?.replace(/<[^>]+>/g, "").trim() ?? "",
      matchScore: best?.score ?? 0,
      matched: Boolean(best),
    });
    if (!best) unmatched.push(book);

    if (i % 25 === 0) console.log(`Enriched ${i + 1}/${raw.length}`);
    await sleep(QUERY_DELAY_MS);
  }

  await fs.writeFile(OUT_PATH, JSON.stringify(enriched, null, 2), "utf8");
  await fs.writeFile(UNMATCHED_PATH, JSON.stringify(unmatched, null, 2), "utf8");
  console.log(`Matched ${enriched.filter((b) => b.matched).length}/${enriched.length}. Unmatched logged.`);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
