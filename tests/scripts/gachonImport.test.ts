import { describe, expect, it } from "vitest";
import {
  assertReviewImportAllowed,
  dedupeBookRows,
  parseImportArgs,
  summarizeImportRows,
  type BookRow,
} from "../../scripts/library/import-gachon-library";

function row(overrides: Partial<BookRow> = {}): BookRow {
  return {
    source: "gachon_open",
    source_label: "openlibrary",
    source_id: "UEM000000001",
    isbn13: "9780000000001",
    title: "테스트 책",
    author: "홍길동",
    publisher: "테스트출판",
    published_year: 2026,
    category: "general",
    description: "설명",
    cover_url: "https://example.com/cover.jpg",
    detail_url: "https://lib.gachon.ac.kr/search/detail/CATTOT000000000001",
    call_number: "001 홍18ㅌ",
    location_label: "중앙도서관",
    location_room: "자료실",
    availability: "available",
    tags: ["technology"],
    active: true,
    ...overrides,
  };
}

describe("Gachon import helpers", () => {
  it("parses safe import mode flags from argv", () => {
    expect(parseImportArgs(["node", "script.ts", "--dry-run", "--only-metadata", "--allow-review-needed"])).toEqual({
      dryRun: true,
      onlyMetadata: true,
      allowReviewNeeded: true,
      skipReviewNeeded: false,
    });
  });

  it("ignores the npm argument separator", () => {
    expect(parseImportArgs(["node", "script.ts", "--", "--dry-run"])).toEqual({
      dryRun: true,
      onlyMetadata: false,
      allowReviewNeeded: false,
      skipReviewNeeded: false,
    });
  });

  it("parses safe import mode flags from a flag-only list", () => {
    expect(parseImportArgs(["--dry-run", "--skip-review-needed"])).toEqual({
      dryRun: true,
      onlyMetadata: false,
      allowReviewNeeded: false,
      skipReviewNeeded: true,
    });
  });

  it("rejects unknown import flags", () => {
    expect(() => parseImportArgs(["node", "script.ts", "--unsafe"])).toThrow(/Unknown option: --unsafe/);
  });

  it("deduplicates rows by source and source_id while reporting duplicate keys", () => {
    const result = dedupeBookRows([
      row({ source: "gachon_open", source_id: "UEM1", title: "first" }),
      row({ source: "gachon_open", source_id: "UEM1", title: "second duplicate" }),
      row({ source: "gachon_curation", source_id: "UEM1", title: "same id different source" }),
    ]);

    expect(result.books.map((book) => book.title)).toEqual(["first", "same id different source"]);
    expect(result.duplicateCount).toBe(1);
    expect(result.duplicates).toEqual([{ source: "gachon_open", source_id: "UEM1", count: 2 }]);
  });

  it("summarizes unique rows, duplicates, missing metadata, and review-needed rows", () => {
    const summary = summarizeImportRows(
      [
        row({ isbn13: null, cover_url: null, description: "", tags: [] }),
        row({ source_id: "UEM2", description: "  ", tags: ["history"] }),
        row({ source_id: "UEM3", cover_url: "", tags: null as unknown as string[] }),
      ],
      2,
      4,
    );

    expect(summary).toEqual({
      uniqueRows: 3,
      duplicateRows: 2,
      missingCover: 2,
      missingDescription: 2,
      missingIsbn13: 1,
      missingTags: 2,
      reviewNeeded: 4,
    });
  });

  it("blocks write imports when review-needed rows exist unless explicitly allowed", () => {
    expect(() =>
      assertReviewImportAllowed({
        dryRun: false,
        allowReviewNeeded: false,
        skipReviewNeeded: false,
        reviewNeededCount: 3,
      }),
    ).toThrow(/3 rows need review/);

    expect(() =>
      assertReviewImportAllowed({
        dryRun: true,
        allowReviewNeeded: false,
        skipReviewNeeded: false,
        reviewNeededCount: 3,
      }),
    ).not.toThrow();

    expect(() =>
      assertReviewImportAllowed({
        dryRun: false,
        allowReviewNeeded: true,
        skipReviewNeeded: false,
        reviewNeededCount: 3,
      }),
    ).not.toThrow();

    expect(() =>
      assertReviewImportAllowed({
        dryRun: false,
        allowReviewNeeded: false,
        skipReviewNeeded: true,
        reviewNeededCount: 3,
      }),
    ).not.toThrow();
  });
});
