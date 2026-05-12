import { RESULT_FIRST_SECTION_COPY } from "@/lib/reading-types/resultFirstSectionCopy";
import { READING_TYPE_CODES, getReadingType, isReadingTypeCode } from "@/lib/reading-types/types";
import { describe, expect, it } from "vitest";

describe("reading types", () => {
  it("defines exactly 16 allowed reading types", () => {
    expect(READING_TYPE_CODES).toHaveLength(16);
    expect(new Set(READING_TYPE_CODES).size).toBe(16);
  });

  it("validates enum codes", () => {
    expect(isReadingTypeCode("focus_reboot")).toBe(true);
    expect(isReadingTypeCode("unknown")).toBe(false);
  });

  it("returns display metadata", () => {
    expect(getReadingType("career_compass")).toMatchObject({
      displayName: "방향 탐색형",
      definition: expect.stringContaining("방향"),
      headlineTemplate: expect.stringContaining("{nameHonorific}"),
      tags: expect.arrayContaining(["진로", "커리어", "자기이해"]),
    });
  });

  it("keeps first section copy editable and hidden from book context", () => {
    const forbiddenBeforeBookSection = /책|도서|독서|추천도서|서가|청구기호/;

    for (const code of READING_TYPE_CODES) {
      const copy = RESULT_FIRST_SECTION_COPY[code];

      expect(copy.headlineTemplate).toContain("{nameHonorific}");
      expect(copy.description.split(/[.!?。！？]|[.?!]\s/).filter(Boolean).length).toBeGreaterThanOrEqual(1);
      expect([copy.displayName, copy.headlineTemplate, copy.description, ...copy.chips].join(" ")).not.toMatch(forbiddenBeforeBookSection);
    }
  });
});
