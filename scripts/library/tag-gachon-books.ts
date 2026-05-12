import "../books/load-env";

import fs from "node:fs/promises";
import path from "node:path";
import { pathToFileURL } from "node:url";
import { inferBookCategory } from "../../src/lib/books/categories";
import type { GachonEnrichedBook } from "./fetch-gachon-covers";
import type { LibraryBook } from "../../src/lib/books/types";

const IN_PATH = path.join(process.cwd(), "data/library/gachon-enriched.json");
const OUT_PATH = path.join(process.cwd(), "data/library/gachon-books.json");

export function deriveTags(book: GachonEnrichedBook): string[] {
  const tags = new Set<string>();
  const text = `${book.title} ${book.description} ${book.publisher}`;

  if (book.sourceLabel === "bookcuration") {
    tags.add("AI");
    if (/디자인|마케팅|업무|비즈니스|일잘러|커리어|취업/.test(text)) tags.add("커리어");
    if (/입문|기초|이해|개론/.test(text)) tags.add("입문서");
    if (/창업|투자|경영|경제|반도체|전략/.test(text)) tags.add("비즈니스");
    if (/데이터|코딩|파이썬|LLM|머신러닝|딥러닝|인공지능|AI/.test(text)) tags.add("기술");
  } else {
    if (/철학|사상|러셀|니체|스토아|세네카|차라투스트라|쇼펜하우어|소크라테스|부처|에머슨|카뮈/.test(text)) tags.add("철학 입문");
    if (/에세이|산문|수필|위로|마음|인연|사랑|행복|관계|인터뷰/.test(text)) tags.add("에세이");
    if (/고전/.test(text)) tags.add("고전");
    if (/심리|관계|대화/.test(text)) tags.add("관계");
    if (/소설|문학|장편|단편|시집|시인|김동식|문학동네|민음사|창비/.test(text)) tags.add("문학");
    if (/시간관리|생산성|습관|디톡스|집중|해내는/.test(text)) tags.add("생산성");
    if (/경제|투자|주식|부의|리스크|경영/.test(text)) tags.add("비즈니스");
    if (/과학|물리학|블랙홀|뇌 과학|기술|AI|디지털/.test(text)) tags.add("과학");
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

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  main().catch((error) => {
    console.error(error);
    process.exit(1);
  });
}
