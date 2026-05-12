import "../books/load-env";

import { createClient } from "@supabase/supabase-js";
import fs from "node:fs/promises";
import path from "node:path";
import { pathToFileURL } from "node:url";

const LOCAL_BOOKS_PATH = path.join(process.cwd(), "data/library/gachon-books.json");
const AUDIT_OUT_PATH = path.join(process.cwd(), "data/library/metadata-audit.json");
const GACHON_SOURCES = ["gachon_curation", "gachon_open"] as const;
const PAGE_SIZE = 1000;

export type LocalMetadataRow = {
  source: string;
  sourceLabel?: string | null;
  sourceId: string;
  isbn13?: string | null;
  description?: string | null;
  coverUrl?: string | null;
  tags?: string[] | null;
};

export type SupabaseMetadataRow = {
  source: string;
  source_label?: string | null;
  source_id: string;
  isbn13?: string | null;
  description?: string | null;
  cover_url?: string | null;
  tags?: string[] | null;
  active?: boolean | null;
};

export type GapSummary = {
  total: number;
  missingIsbn13: number;
  missingDescription: number;
  missingCover: number;
  missingTags: number;
};

export type GroupedGapSummary = GapSummary & {
  bySource: Record<string, GapSummary>;
  bySourceLabel: Record<string, GapSummary>;
};

export type SupabaseAuditSummary = {
  total: number;
  activeTotal: number;
  inactiveTotal: number;
  all: GroupedGapSummary;
  active: GroupedGapSummary;
  inactive: GroupedGapSummary;
};

export type DuplicateSourceId = {
  source: string;
  sourceId: string;
  count: number;
};

export type MetadataAuditReport = {
  generatedAt: string;
  summary: {
    local: GroupedGapSummary;
    supabase: SupabaseAuditSummary;
  };
  duplicates: DuplicateSourceId[];
};

function emptySummary(): GapSummary {
  return {
    total: 0,
    missingIsbn13: 0,
    missingDescription: 0,
    missingCover: 0,
    missingTags: 0,
  };
}

function emptyGroupedSummary(): GroupedGapSummary {
  return {
    ...emptySummary(),
    bySource: {},
    bySourceLabel: {},
  };
}

function isBlank(value: string | null | undefined): boolean {
  return value == null || value.trim().length === 0;
}

function hasNoTags(tags: string[] | null | undefined): boolean {
  return !Array.isArray(tags) || tags.length === 0 || tags.every((tag) => isBlank(tag));
}

function groupKey(value: string | null | undefined): string {
  return isBlank(value) ? "(none)" : value!.trim();
}

function getGroup(groups: Record<string, GapSummary>, key: string): GapSummary {
  groups[key] ??= emptySummary();
  return groups[key];
}

function increment(
  summary: GapSummary,
  row: {
    isbn13?: string | null;
    description?: string | null;
    coverUrl?: string | null;
    tags?: string[] | null;
  },
): void {
  summary.total += 1;
  if (isBlank(row.isbn13)) summary.missingIsbn13 += 1;
  if (isBlank(row.description)) summary.missingDescription += 1;
  if (isBlank(row.coverUrl)) summary.missingCover += 1;
  if (hasNoTags(row.tags)) summary.missingTags += 1;
}

function summarizeRows<Row>(
  rows: Row[],
  read: (row: Row) => {
    source: string;
    sourceLabel?: string | null;
    isbn13?: string | null;
    description?: string | null;
    coverUrl?: string | null;
    tags?: string[] | null;
  },
): GroupedGapSummary {
  const summary = emptyGroupedSummary();

  for (const inputRow of rows) {
    const row = read(inputRow);
    increment(summary, row);
    increment(getGroup(summary.bySource, groupKey(row.source)), row);
    increment(getGroup(summary.bySourceLabel, groupKey(row.sourceLabel)), row);
  }

  return summary;
}

export function summarizeLocalRows(rows: LocalMetadataRow[]): GroupedGapSummary {
  return summarizeRows(rows, (row) => ({
    source: row.source,
    sourceLabel: row.sourceLabel,
    isbn13: row.isbn13,
    description: row.description,
    coverUrl: row.coverUrl,
    tags: row.tags,
  }));
}

export function summarizeSupabaseRows(rows: SupabaseMetadataRow[]): SupabaseAuditSummary {
  const activeRows = rows.filter((row) => row.active !== false);
  const inactiveRows = rows.filter((row) => row.active === false);
  const summarize = (inputRows: SupabaseMetadataRow[]) =>
    summarizeRows(inputRows, (row) => ({
      source: row.source,
      sourceLabel: row.source_label,
      isbn13: row.isbn13,
      description: row.description,
      coverUrl: row.cover_url,
      tags: row.tags,
    }));

  return {
    total: rows.length,
    activeTotal: activeRows.length,
    inactiveTotal: inactiveRows.length,
    all: summarize(rows),
    active: summarize(activeRows),
    inactive: summarize(inactiveRows),
  };
}

export function findDuplicateSourceIds(rows: LocalMetadataRow[]): DuplicateSourceId[] {
  const counts = new Map<string, DuplicateSourceId>();

  for (const row of rows) {
    const key = `${row.source}\u0000${row.sourceId}`;
    const current = counts.get(key) ?? { source: row.source, sourceId: row.sourceId, count: 0 };
    current.count += 1;
    counts.set(key, current);
  }

  return Array.from(counts.values())
    .filter((item) => item.count > 1)
    .sort((left, right) => left.source.localeCompare(right.source) || left.sourceId.localeCompare(right.sourceId));
}

export function buildMetadataAudit({
  localRows,
  supabaseRows,
  generatedAt = new Date().toISOString(),
}: {
  localRows: LocalMetadataRow[];
  supabaseRows: SupabaseMetadataRow[];
  generatedAt?: string;
}): MetadataAuditReport {
  return {
    generatedAt,
    summary: {
      local: summarizeLocalRows(localRows),
      supabase: summarizeSupabaseRows(supabaseRows),
    },
    duplicates: findDuplicateSourceIds(localRows),
  };
}

async function fetchSupabaseRows(): Promise<SupabaseMetadataRow[]> {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!supabaseUrl || !serviceRoleKey) throw new Error("Missing Supabase credentials");

  const supabase = createClient(supabaseUrl, serviceRoleKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  const rows: SupabaseMetadataRow[] = [];
  for (let from = 0; ; from += PAGE_SIZE) {
    const { data, error } = await supabase
      .from("books")
      .select("source, source_label, source_id, isbn13, description, cover_url, tags, active")
      .in("source", GACHON_SOURCES)
      .range(from, from + PAGE_SIZE - 1);

    if (error) throw error;
    rows.push(...((data ?? []) as SupabaseMetadataRow[]));
    if (!data || data.length < PAGE_SIZE) break;
  }

  return rows;
}

function compactCounts(label: string, counts: GapSummary): string {
  return `${label}: total=${counts.total}, missingCover=${counts.missingCover}, missingDescription=${counts.missingDescription}, missingIsbn13=${counts.missingIsbn13}, missingTags=${counts.missingTags}`;
}

function printAudit(report: MetadataAuditReport): void {
  console.log(compactCounts("local", report.summary.local));
  console.log(compactCounts("supabase active", report.summary.supabase.active));
  console.log(compactCounts("supabase inactive", report.summary.supabase.inactive));
  console.log(`supabase total=${report.summary.supabase.total}, activeTotal=${report.summary.supabase.activeTotal}`);
  console.log(`local duplicate source+sourceId=${report.duplicates.length}`);
  console.log(`wrote ${AUDIT_OUT_PATH}`);
}

async function main(): Promise<void> {
  const localRows = JSON.parse(await fs.readFile(LOCAL_BOOKS_PATH, "utf8")) as LocalMetadataRow[];
  const supabaseRows = await fetchSupabaseRows();
  const report = buildMetadataAudit({ localRows, supabaseRows });

  await fs.writeFile(AUDIT_OUT_PATH, `${JSON.stringify(report, null, 2)}\n`, "utf8");
  printAudit(report);
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  main().catch((error) => {
    console.error(error);
    process.exit(1);
  });
}
