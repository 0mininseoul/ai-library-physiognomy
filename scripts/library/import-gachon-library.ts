import "../books/load-env";

import { createClient } from "@supabase/supabase-js";
import fs from "node:fs/promises";
import path from "node:path";
import type { LibraryBook } from "../../src/lib/books/types";

const IN_PATH = path.join(process.cwd(), "data/library/gachon-books.json");
const CHUNK_SIZE = 100;
const GACHON_SOURCES = ["gachon_curation", "gachon_open"] as const;

type BookRow = {
  source: string;
  source_label: string;
  source_id: string;
  isbn13: string | null;
  title: string;
  author: string;
  publisher: string;
  published_year: number | null;
  category: string;
  description: string;
  cover_url: string | null;
  call_number: string;
  location_label: string;
  location_room: string | null;
  availability: string | null;
  tags: string[];
  active: boolean;
};

function toRow(book: LibraryBook): BookRow {
  return {
    source: book.source,
    source_label: book.sourceLabel ?? "",
    source_id: book.sourceId,
    isbn13: book.isbn13,
    title: book.title,
    author: book.author,
    publisher: book.publisher,
    published_year: book.publishedYear,
    category: book.category,
    description: book.description,
    cover_url: book.coverUrl,
    call_number: book.callNumber,
    location_label: book.locationLabel,
    location_room: book.locationRoom ?? null,
    availability: book.availability ?? null,
    tags: book.tags,
    active: true,
  };
}

async function main() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!supabaseUrl || !serviceRoleKey) throw new Error("Missing Supabase credentials");

  const supabase = createClient(supabaseUrl, serviceRoleKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  const rawBooks = (JSON.parse(await fs.readFile(IN_PATH, "utf8")) as LibraryBook[]).map(toRow);
  const seen = new Set<string>();
  const books: BookRow[] = [];
  let duplicateCount = 0;
  for (const row of rawBooks) {
    const key = `${row.source}|${row.source_id}`;
    if (seen.has(key)) {
      duplicateCount += 1;
      continue;
    }
    seen.add(key);
    books.push(row);
  }
  if (duplicateCount > 0) {
    console.log(`Skipped ${duplicateCount} duplicate source+source_id rows`);
  }

  const { error: deactivateError } = await supabase.from("books").update({ active: false }).in("source", GACHON_SOURCES);
  if (deactivateError) throw deactivateError;
  console.log(`Deactivated previous Gachon imports`);

  for (let index = 0; index < books.length; index += CHUNK_SIZE) {
    const chunk = books.slice(index, index + CHUNK_SIZE);
    const { error } = await supabase.from("books").upsert(chunk, { onConflict: "source,source_id" });
    if (error) throw error;
    console.log(`Imported ${Math.min(index + CHUNK_SIZE, books.length)} / ${books.length}`);
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
