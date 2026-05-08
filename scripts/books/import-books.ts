import { createClient } from "@supabase/supabase-js";
import fs from "node:fs/promises";
import path from "node:path";
import type { LibraryBook } from "../../src/lib/books/types";

const TAGGED_PATH = path.join(process.cwd(), "data/books/books.tagged.json");
const NORMALIZED_PATH = path.join(process.cwd(), "data/books/books.normalized.json");
const CHUNK_SIZE = 100;

type BookRow = {
  source: LibraryBook["source"];
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
  tags: string[];
  active: boolean;
};

async function readBooks(): Promise<LibraryBook[]> {
  try {
    return JSON.parse(await fs.readFile(TAGGED_PATH, "utf8")) as LibraryBook[];
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code !== "ENOENT") throw error;
    return JSON.parse(await fs.readFile(NORMALIZED_PATH, "utf8")) as LibraryBook[];
  }
}

function toRow(book: LibraryBook): BookRow {
  return {
    source: book.source,
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
    tags: book.tags,
    active: true,
  };
}

async function main() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl) {
    throw new Error("NEXT_PUBLIC_SUPABASE_URL is required to import book data");
  }
  if (!serviceRoleKey) {
    throw new Error("SUPABASE_SERVICE_ROLE_KEY is required to import book data");
  }

  const supabase = createClient(supabaseUrl, serviceRoleKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const rows = (await readBooks()).map(toRow);

  for (let index = 0; index < rows.length; index += CHUNK_SIZE) {
    const chunk = rows.slice(index, index + CHUNK_SIZE);
    const { error } = await supabase.from("books").upsert(chunk, {
      onConflict: "source,source_id",
    });
    if (error) throw error;
    console.log(`Imported ${Math.min(index + CHUNK_SIZE, rows.length)} / ${rows.length} books`);
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
