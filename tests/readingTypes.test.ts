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
      displayName: "진로 GPS 재설정 중",
      tags: expect.arrayContaining(["진로", "커리어", "자기이해"]),
    });
  });
});
