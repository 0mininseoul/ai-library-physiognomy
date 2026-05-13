import type { SupabaseClient } from "@supabase/supabase-js";
import type { BookSource, LibraryBook } from "./types";

type BookRow = {
  id: string;
  source: string;
  source_label: string | null;
  source_id: string;
  isbn13: string | null;
  title: string;
  author: string;
  publisher: string;
  published_year: number | null;
  category: string;
  description: string;
  cover_url: string | null;
  detail_url: string | null;
  call_number: string;
  location_label: string;
  location_room: string | null;
  availability: string | null;
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
        "id, source, source_label, source_id, isbn13, title, author, publisher, published_year, category, description, cover_url, detail_url, call_number, location_label, location_room, availability, tags",
      )
      .eq("active", true);

    if (error) throw error;

    return ((data ?? []) as BookRow[]).map(toLibraryBook);
  }
}

function toLibraryBook(row: BookRow): LibraryBook {
  return {
    id: row.id,
    source: toBookSource(row.source),
    sourceLabel: row.source_label === "bookcuration" || row.source_label === "openlibrary" ? row.source_label : undefined,
    sourceId: row.source_id,
    isbn13: row.isbn13,
    title: row.title,
    author: row.author,
    publisher: row.publisher,
    publishedYear: row.published_year,
    category: row.category,
    description: row.description,
    coverUrl: row.cover_url,
    detailUrl: row.detail_url,
    callNumber: row.call_number,
    locationLabel: row.location_label,
    locationRoom: row.location_room ?? undefined,
    availability: row.availability === "available" || row.availability === "checked_out" ? row.availability : null,
    tags: row.tags ?? [],
  };
}

function toBookSource(source: string): BookSource {
  if (source === "naver" || source === "gachon_curation" || source === "gachon_open") return source;
  return "data4library";
}
