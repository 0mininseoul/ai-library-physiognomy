import { describe, expect, it } from "vitest";
import {
  buildMetadataAudit,
  findDuplicateSourceIds,
  summarizeLocalRows,
  summarizeSupabaseRows,
} from "../../scripts/library/audit-gachon-metadata";

describe("Gachon metadata audit helpers", () => {
  const localRows = [
    {
      source: "gachon_open",
      sourceLabel: "openlibrary",
      sourceId: "UEM123",
      isbn13: "9780000000001",
      description: "Readable local description",
      coverUrl: "https://example.com/one.jpg",
      tags: ["novel"],
    },
    {
      source: "gachon_open",
      sourceLabel: "openlibrary",
      sourceId: "UEM123",
      isbn13: "9780000000002",
      description: "Duplicate registration",
      coverUrl: null,
      tags: ["history"],
    },
    {
      source: "gachon_curation",
      sourceLabel: "bookcuration",
      sourceId: "CUR456",
      isbn13: null,
      description: "Curated row",
      coverUrl: "https://example.com/curated.jpg",
      tags: [],
    },
  ];

  const supabaseRows = [
    {
      source: "gachon_open",
      source_label: "openlibrary",
      source_id: "UEM123",
      isbn13: "9780000000001",
      description: "Readable remote description",
      cover_url: "https://example.com/one.jpg",
      tags: ["novel"],
      active: true,
    },
    {
      source: "gachon_curation",
      source_label: "bookcuration",
      source_id: "CUR456",
      isbn13: "9780000000002",
      description: "",
      cover_url: "https://example.com/curated.jpg",
      tags: ["science"],
      active: true,
    },
    {
      source: "gachon_open",
      source_label: "openlibrary",
      source_id: "OLD789",
      isbn13: null,
      description: "Inactive row",
      cover_url: null,
      tags: [],
      active: false,
    },
  ];

  it("summarizes local metadata gaps", () => {
    const summary = summarizeLocalRows(localRows);

    expect(summary.total).toBe(3);
    expect(summary.missingCover).toBe(1);
    expect(summary.bySource.gachon_open).toMatchObject({ total: 2, missingCover: 1 });
    expect(summary.bySourceLabel.bookcuration).toMatchObject({ total: 1, missingTags: 1 });
  });

  it("summarizes active Supabase metadata gaps", () => {
    const summary = summarizeSupabaseRows(supabaseRows);

    expect(summary.activeTotal).toBe(2);
    expect(summary.inactiveTotal).toBe(1);
    expect(summary.active.missingDescription).toBe(1);
    expect(summary.inactive.missingCover).toBe(1);
    expect(summary.active.bySourceLabel.openlibrary).toMatchObject({ total: 1, missingDescription: 0 });
  });

  it("detects duplicate local source and sourceId pairs", () => {
    expect(findDuplicateSourceIds(localRows)).toEqual([
      { source: "gachon_open", sourceId: "UEM123", count: 2 },
    ]);
  });

  it("builds an audit report from local and Supabase rows", () => {
    const audit = buildMetadataAudit({
      localRows,
      supabaseRows,
      generatedAt: "2026-05-13T00:00:00.000Z",
    });

    expect(audit.summary.local.total).toBe(3);
    expect(audit.summary.local.missingCover).toBe(1);
    expect(audit.summary.supabase.activeTotal).toBe(2);
    expect(audit.summary.supabase.active.missingDescription).toBe(1);
    expect(audit.duplicates).toEqual([
      { source: "gachon_open", sourceId: "UEM123", count: 2 },
    ]);
  });
});
