import fs from "node:fs/promises";
import path from "node:path";
import { pathToFileURL } from "node:url";
import type { LibraryBook, RawData4LibraryBook } from "../../src/lib/books/types";

type RawMvpBook = RawData4LibraryBook & {
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

function uniqueTags(tags: string[]): string[] {
  return Array.from(new Set(tags.map(clean).filter(Boolean))).slice(0, 8);
}

export function normalizeRawBook(raw: RawMvpBook): LibraryBook {
  const title = clean(raw.bookname);
  const category = clean(raw.mvp_category) || "교양/세계관";
  const className = clean(raw.class_nm);
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
  const raw = JSON.parse(await fs.readFile(RAW_PATH, "utf8")) as RawMvpBook[];
  const books = dedupeBooks(raw.map(normalizeRawBook).filter((book) => book.title.length > 0));

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
