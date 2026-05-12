import "../books/load-env";

import fs from "node:fs/promises";
import path from "node:path";
import { inferBookCategory } from "../../src/lib/books/categories";
import type { GachonEnrichedBook } from "./fetch-gachon-covers";
import type { LibraryBook } from "../../src/lib/books/types";

const IN_PATH = path.join(process.cwd(), "data/library/gachon-enriched.json");
const OUT_PATH = path.join(process.cwd(), "data/library/gachon-books.json");

function deriveTags(book: GachonEnrichedBook): string[] {
  const tags = new Set<string>();
  const text = `${book.title} ${book.description}`;

  if (book.sourceLabel === "bookcuration") {
    tags.add("AI");
    if (/디자인|마케팅|업무|비즈니스|일잘러/.test(text)) tags.add("커리어");
    if (/입문|기초|이해|개론/.test(text)) tags.add("입문서");
    if (/창업|투자|경영/.test(text)) tags.add("비즈니스");
  } else {
    if (/철학|사상|러셀|니체|스토아|세네카/.test(text)) tags.add("철학 입문");
    if (/에세이|산문|위로|마음/.test(text)) tags.add("에세이");
    if (/고전/.test(text)) tags.add("고전");
    if (/심리|관계|대화/.test(text)) tags.add("관계");
    if (/소설|문학/.test(text)) tags.add("문학");
    if (/시간관리|생산성|습관/.test(text)) tags.add("생산성");
  }
  return Array.from(tags);
}

function toLibraryBook(book: GachonEnrichedBook): LibraryBook {
  const source = book.sourceLabel === "bookcuration" ? "gachon_curation" : "gachon_open";
  const category = inferBookCategory({ title: book.title, description: book.description });
  return {
    source,
    sourceLabel: book.sourceLabel,
    sourceId: book.registrationNo,
    isbn13: book.isbn13,
    title: book.title,
    author: book.author,
    publisher: book.publisher,
    publishedYear: book.publishedYear,
    category,
    description: book.description,
    coverUrl: book.coverUrl,
    callNumber: book.callNumber,
    locationLabel: book.locationLabel,
    locationRoom: book.locationRoom,
    availability: book.availability,
    tags: deriveTags(book),
  };
}

async function main() {
  const raw = JSON.parse(await fs.readFile(IN_PATH, "utf8")) as GachonEnrichedBook[];
  const books = raw.map(toLibraryBook);
  await fs.writeFile(OUT_PATH, JSON.stringify(books, null, 2), "utf8");
  console.log(`Tagged ${books.length} books → ${OUT_PATH}`);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
