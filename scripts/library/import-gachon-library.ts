import "../books/load-env";

import { createClient } from "@supabase/supabase-js";
import fs from "node:fs/promises";
import path from "node:path";
import { pathToFileURL } from "node:url";
import type { LibraryBook } from "../../src/lib/books/types";

const IN_PATH = path.join(process.cwd(), "data/library/gachon-books.json");
const REVIEW_NEEDED_PATH = path.join(process.cwd(), "data/library/review-needed.json");
const CHUNK_SIZE = 100;
const GACHON_SOURCES = ["gachon_curation", "gachon_open"] as const;

export type BookRow = {
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
  detail_url: string | null;
  call_number: string;
  location_label: string;
  location_room: string | null;
  availability: string | null;
  tags: string[];
  active: boolean;
};

export type ImportArgs = {
  dryRun: boolean;
  onlyMetadata: boolean;
  allowReviewNeeded: boolean;
  skipReviewNeeded: boolean;
};

type ImportSummary = {
  uniqueRows: number;
  duplicateRows: number;
  missingCover: number;
  missingDescription: number;
  missingIsbn13: number;
  missingTags: number;
  reviewNeeded: number;
};

type DuplicateSourceId = {
  source: string;
  source_id: string;
  count: number;
};

type DedupeResult = {
  books: BookRow[];
  duplicateCount: number;
  duplicates: DuplicateSourceId[];
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
    detail_url: book.detailUrl ?? null,
    call_number: book.callNumber,
    location_label: book.locationLabel,
    location_room: book.locationRoom ?? null,
    availability: book.availability ?? null,
    tags: book.tags,
    active: true,
  };
}

export function parseImportArgs(argv: string[]): ImportArgs {
  const args: ImportArgs = {
    dryRun: false,
    onlyMetadata: false,
    allowReviewNeeded: false,
    skipReviewNeeded: false,
  };

  const flags = (argv[0]?.startsWith("--") ? argv : argv.slice(2)).filter((arg) => arg !== "--");

  for (const arg of flags) {
    if (arg === "--dry-run") {
      args.dryRun = true;
    } else if (arg === "--only-metadata") {
      args.onlyMetadata = true;
    } else if (arg === "--allow-review-needed") {
      args.allowReviewNeeded = true;
    } else if (arg === "--skip-review-needed") {
      args.skipReviewNeeded = true;
    } else {
      throw new Error(`Unknown option: ${arg}`);
    }
  }

  return args;
}

export function dedupeBookRows(rows: BookRow[]): DedupeResult {
  const counts = new Map<string, DuplicateSourceId>();
  const seen = new Set<string>();
  const books: BookRow[] = [];
  let duplicateCount = 0;

  for (const row of rows) {
    const key = `${row.source}|${row.source_id}`;
    const current = counts.get(key);
    counts.set(key, {
      source: row.source,
      source_id: row.source_id,
      count: (current?.count ?? 0) + 1,
    });

    if (seen.has(key)) {
      duplicateCount += 1;
      continue;
    }

    seen.add(key);
    books.push(row);
  }

  return {
    books,
    duplicateCount,
    duplicates: Array.from(counts.values()).filter((duplicate) => duplicate.count > 1),
  };
}

export function summarizeImportRows(
  rows: BookRow[],
  duplicateCount: number,
  reviewNeededCount: number,
): ImportSummary {
  return {
    uniqueRows: rows.length,
    duplicateRows: duplicateCount,
    missingCover: rows.filter((row) => !row.cover_url?.trim()).length,
    missingDescription: rows.filter((row) => !row.description?.trim()).length,
    missingIsbn13: rows.filter((row) => !row.isbn13?.trim()).length,
    missingTags: rows.filter((row) => !Array.isArray(row.tags) || row.tags.length === 0).length,
    reviewNeeded: reviewNeededCount,
  };
}

export function assertReviewImportAllowed({
  dryRun,
  allowReviewNeeded,
  skipReviewNeeded,
  reviewNeededCount,
}: {
  dryRun: boolean;
  allowReviewNeeded: boolean;
  skipReviewNeeded?: boolean;
  reviewNeededCount: number;
}) {
  if (!dryRun && !allowReviewNeeded && !skipReviewNeeded && reviewNeededCount > 0) {
    throw new Error(
      `${reviewNeededCount} rows need review in data/library/review-needed.json. Pass --allow-review-needed to import anyway.`,
    );
  }
}

async function readReviewNeededCount(): Promise<number> {
  try {
    const raw = await fs.readFile(REVIEW_NEEDED_PATH, "utf8");
    const parsed = JSON.parse(raw) as unknown;
    return Array.isArray(parsed) ? parsed.length : 0;
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === "ENOENT") return 0;
    throw error;
  }
}

async function readReviewNeededSourceIds(): Promise<Set<string>> {
  try {
    const raw = await fs.readFile(REVIEW_NEEDED_PATH, "utf8");
    const parsed = JSON.parse(raw) as Array<{ registrationNo?: string; sourceId?: string }>;
    if (!Array.isArray(parsed)) return new Set();
    return new Set(parsed.map((row) => row.registrationNo ?? row.sourceId).filter((value): value is string => Boolean(value)));
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === "ENOENT") return new Set();
    throw error;
  }
}

function metadataOnlyRow(row: BookRow) {
  return {
    isbn13: row.isbn13,
    description: row.description,
    cover_url: row.cover_url,
    detail_url: row.detail_url,
    tags: row.tags,
    category: row.category,
    updated_at: new Date().toISOString(),
  };
}

function logSummary(summary: ImportSummary, dryRun: boolean, wouldDeactivate: boolean) {
  if (dryRun) {
    console.log(`would_deactivate_gachon_rows=${wouldDeactivate}`);
  }
  console.log(`unique_rows=${summary.uniqueRows}`);
  console.log(`duplicate_rows=${summary.duplicateRows}`);
  console.log(`missing_cover=${summary.missingCover}`);
  console.log(`review_needed=${summary.reviewNeeded}`);
}

async function main() {
  const args = parseImportArgs(process.argv);
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  const rawBooks = (JSON.parse(await fs.readFile(IN_PATH, "utf8")) as LibraryBook[]).map(toRow);
  const reviewNeededIds = await readReviewNeededSourceIds();
  const reviewNeededCount = reviewNeededIds.size || (await readReviewNeededCount());
  const importRows = args.skipReviewNeeded ? rawBooks.filter((row) => !reviewNeededIds.has(row.source_id)) : rawBooks;
  const { books, duplicateCount } = dedupeBookRows(importRows);
  const summary = summarizeImportRows(books, duplicateCount, reviewNeededCount);
  logSummary(summary, args.dryRun, !args.onlyMetadata);

  if (duplicateCount > 0) {
    console.log(`Skipped ${duplicateCount} duplicate source+source_id rows`);
  }

  if (args.dryRun) return;

  assertReviewImportAllowed({
    dryRun: args.dryRun,
    allowReviewNeeded: args.allowReviewNeeded,
    skipReviewNeeded: args.skipReviewNeeded,
    reviewNeededCount,
  });

  if (!supabaseUrl || !serviceRoleKey) throw new Error("Missing Supabase credentials");

  const supabase = createClient(supabaseUrl, serviceRoleKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  if (!args.onlyMetadata) {
    const { error: deactivateError } = await supabase.from("books").update({ active: false }).in("source", GACHON_SOURCES);
    if (deactivateError) throw deactivateError;
    console.log(`Deactivated previous Gachon imports`);
  }

  for (let index = 0; index < books.length; index += CHUNK_SIZE) {
    const chunk = books.slice(index, index + CHUNK_SIZE);
    if (args.onlyMetadata) {
      for (const book of chunk) {
        const { error } = await supabase
          .from("books")
          .update(metadataOnlyRow(book))
          .eq("source", book.source)
          .eq("source_id", book.source_id);
        if (error) throw error;
      }
    } else {
      const { error } = await supabase.from("books").upsert(chunk, { onConflict: "source,source_id" });
      if (error) throw error;
    }
    console.log(`Imported ${Math.min(index + CHUNK_SIZE, books.length)} / ${books.length}`);
  }
}

if (import.meta.url === pathToFileURL(process.argv[1] ?? "").href) {
  main().catch((error) => {
    console.error(error);
    process.exit(1);
  });
}
