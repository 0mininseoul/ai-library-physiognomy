import fs from "node:fs/promises";
import path from "node:path";
import { pathToFileURL } from "node:url";
import { inferBookCategory } from "../../src/lib/books/categories";
import type { LibraryBook, RawData4LibraryBook, RawNaverBook } from "../../src/lib/books/types";

type RawMvpBook = RawData4LibraryBook & {
  mvp_category?: string;
  mvp_query?: string;
};

type RawNaverMvpBook = RawNaverBook & {
  mvp_category?: string;
  mvp_query?: string;
};

const RAW_PATH = path.join(process.cwd(), "data/books/books.raw.json");
const OUT_PATH = path.join(process.cwd(), "data/books/books.normalized.json");

const CLASS_PREFIXES: Array<{ pattern: RegExp; prefix: string }> = [
  { pattern: /총류|컴퓨터|정보/, prefix: "000" },
  { pattern: /철학|심리|윤리/, prefix: "100" },
  { pattern: /종교/, prefix: "200" },
  { pattern: /사회|경제|교육|커뮤니케이션|정치|법/, prefix: "300" },
  { pattern: /자연|과학|수학|물리|화학|생물/, prefix: "400" },
  { pattern: /기술|의학|건강|가정|경영|생산성/, prefix: "500" },
  { pattern: /예술|취미|스포츠/, prefix: "600" },
  { pattern: /언어/, prefix: "700" },
  { pattern: /문학|소설|시|에세이/, prefix: "800" },
  { pattern: /역사|지리|여행/, prefix: "900" },
];

function clean(value: string | null | undefined): string {
  return value?.replace(/\s+/g, " ").trim() ?? "";
}

function stripHtml(value: string | null | undefined): string {
  return clean(value)
    .replace(/<[^>]+>/g, "")
    .replace(/&quot;/g, "\"")
    .replace(/&#39;/g, "'")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">");
}

function emptyToNull(value: string): string | null {
  return value.length > 0 ? value : null;
}

function parsePublishedYear(value: string | undefined): number | null {
  const match = value?.match(/\d{4}/);
  if (!match) return null;

  const year = Number.parseInt(match[0], 10);
  const nextYear = new Date().getFullYear() + 1;
  if (year < 1400 || year > nextYear) return null;
  return year;
}

function classPrefix(className: string): string {
  return CLASS_PREFIXES.find(({ pattern }) => pattern.test(className))?.prefix ?? "000";
}

function stableSuffix(book: RawMvpBook): string {
  const id = clean(book.no) || clean(book.isbn13) || clean(book.ranking) || clean(book.bookname);
  const digits = id.replace(/\D/g, "");
  if (digits.length > 0) return digits.slice(-3).padStart(3, "0");
  return "001";
}

function stableNaverSuffix(book: RawNaverMvpBook): string {
  const id = clean(book.isbn) || clean(book.link) || clean(book.title);
  const digits = id.replace(/\D/g, "");
  if (digits.length > 0) return digits.slice(-3).padStart(3, "0");
  return "001";
}

function isbn13(value: string | null | undefined): string | null {
  return value?.match(/\b\d{13}\b/)?.[0] ?? null;
}

function uniqueTags(tags: string[]): string[] {
  return Array.from(new Set(tags.map(clean).filter(Boolean))).slice(0, 8);
}

export function normalizeRawBook(raw: RawMvpBook): LibraryBook {
  const title = clean(raw.bookname);
  const className = clean(raw.class_nm);
  const category = inferBookCategory({ title, description: `${className} ${clean(raw.bookDtlUrl)}`, categoryHint: clean(raw.mvp_category) });
  const prefix = classPrefix(className);

  return {
    source: "data4library",
    sourceId: clean(raw.no) || clean(raw.isbn13) || `${title}-${clean(raw.authors)}`,
    isbn13: emptyToNull(clean(raw.isbn13)),
    title,
    author: clean(raw.authors),
    publisher: clean(raw.publisher),
    publishedYear: parsePublishedYear(raw.publication_year),
    category,
    description: clean(raw.bookDtlUrl),
    coverUrl: emptyToNull(clean(raw.bookImageURL)),
    callNumber: `${prefix}.${stableSuffix(raw)}`,
    locationLabel: `${category} 자료실`,
    tags: uniqueTags([category, raw.mvp_query ?? "", className]),
  };
}

function normalizeRawNaverBook(raw: RawNaverMvpBook): LibraryBook {
  const title = stripHtml(raw.title);
  const description = stripHtml(raw.description);
  const category = inferBookCategory({ title, description, categoryHint: clean(raw.mvp_category) });
  const parsedIsbn13 = isbn13(raw.isbn);
  const prefix = classPrefix(category);

  return {
    source: "naver",
    sourceId: parsedIsbn13 || clean(raw.link) || `${title}-${stripHtml(raw.author)}`,
    isbn13: parsedIsbn13,
    title,
    author: stripHtml(raw.author),
    publisher: stripHtml(raw.publisher),
    publishedYear: parsePublishedYear(raw.pubdate),
    category,
    description,
    coverUrl: emptyToNull(clean(raw.image)),
    callNumber: `${prefix}.${stableNaverSuffix(raw)}`,
    locationLabel: `${category} 추천 서가`,
    tags: uniqueTags([category, raw.mvp_query ?? "", "네이버 책"]),
  };
}

export function normalizeAnyRawBook(raw: RawMvpBook | RawNaverMvpBook): LibraryBook {
  if ("source" in raw && raw.source === "naver") {
    return normalizeRawNaverBook(raw);
  }

  return normalizeRawBook(raw as RawMvpBook);
}

function dedupeBooks(books: LibraryBook[]): LibraryBook[] {
  const seen = new Set<string>();
  const deduped: LibraryBook[] = [];

  for (const book of books) {
    const key = book.isbn13 || `${book.source}:${book.sourceId}` || `${book.title}:${book.author}`;
    if (seen.has(key)) continue;
    seen.add(key);
    deduped.push(book);
  }

  return deduped;
}

async function main() {
  const raw = JSON.parse(await fs.readFile(RAW_PATH, "utf8")) as Array<RawMvpBook | RawNaverMvpBook>;
  const books = dedupeBooks(raw.map(normalizeAnyRawBook).filter((book) => book.title.length > 0));

  await fs.mkdir(path.dirname(OUT_PATH), { recursive: true });
  await fs.writeFile(OUT_PATH, JSON.stringify(books, null, 2));
  console.log(`Wrote ${books.length} normalized books to ${OUT_PATH}`);
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  main().catch((error) => {
    console.error(error);
    process.exit(1);
  });
}
