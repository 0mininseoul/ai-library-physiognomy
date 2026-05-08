import type { SupabaseClient } from "@supabase/supabase-js";
import type { LibraryBook } from "./types";

type BookSource = LibraryBook["source"];

type BookRow = {
  source: string;
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
  tags: string[] | null;
};

export interface BookProvider {
  listActiveBooks(): Promise<LibraryBook[]>;
}

export class SupabaseBookProvider implements BookProvider {
  constructor(private readonly supabase: SupabaseClient) {}

  async listActiveBooks(): Promise<LibraryBook[]> {
    const { data, error } = await this.supabase
      .from("books")
      .select(
        "source, source_id, isbn13, title, author, publisher, published_year, category, description, cover_url, call_number, location_label, tags",
      )
      .eq("active", true);

    if (error) throw error;

    return ((data ?? []) as BookRow[]).map(toLibraryBook);
  }
}

function toLibraryBook(row: BookRow): LibraryBook {
  return {
    source: toBookSource(row.source),
    sourceId: row.source_id,
    isbn13: row.isbn13,
    title: row.title,
    author: row.author,
    publisher: row.publisher,
    publishedYear: row.published_year,
    category: row.category,
    description: row.description,
    coverUrl: row.cover_url,
    callNumber: row.call_number,
    locationLabel: row.location_label,
    tags: row.tags ?? [],
  };
}

function toBookSource(source: string): BookSource {
  return source === "naver" ? "naver" : "data4library";
}
