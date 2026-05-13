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
      displayName: RESULT_FIRST_SECTION_COPY.career_compass.displayName,
      definition: expect.stringContaining("방향"),
      headlineTemplate: expect.stringContaining("{nameHonorific}"),
      tags: expect.arrayContaining(["진로", "커리어", "자기이해"]),
    });
  });

  it("keeps first section copy editable and hidden from book context", () => {
    const forbiddenBeforeBookSection = /책|도서|독서|추천도서|서가|청구기호|캠퍼스|과제|교수님|조별|전공|연애|데이트|로맨스|로맨틱|Gemini|gemini/;
    const prescriptionLikeDisplayName = /정리형|재설정형|보강형|필요형|실행형|전환형|회복형|처방형/;

    for (const code of READING_TYPE_CODES) {
      const copy = RESULT_FIRST_SECTION_COPY[code];

      expect(copy.definition).toMatch(/^관찰 성향: .+ 필요한 방향: .+/);
      expect(copy.displayName).not.toMatch(prescriptionLikeDisplayName);
      expect(copy.headlineTemplate.match(/{nameHonorific}/g)).toHaveLength(1);
      expect(copy.description.split(/(?<=[.!?])\s+/)).toHaveLength(2);
      expect(copy.chips).toHaveLength(4);
      expect([copy.definition, copy.displayName, copy.headlineTemplate, copy.description, ...copy.chips].join(" ")).not.toMatch(forbiddenBeforeBookSection);
    }
  });
});
