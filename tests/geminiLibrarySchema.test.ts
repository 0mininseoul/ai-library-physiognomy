import { describe, expect, it } from "vitest";
import { normalizeLibraryAnalysis } from "@/lib/gemini/librarySchema";

describe("normalizeLibraryAnalysis", () => {
  it("accepts allowed reading type codes and three recommendations", () => {
    const result = normalizeLibraryAnalysis({
      reading_type: {
        code: "focus_reboot",
        display_name: "집중력 리부트형",
        headline: "영민아, 지금은 집중력 리부트 처방이 떴다",
        description: "몰입 루틴이 필요한 상태입니다.",
      },
      physiognomy_summary: "이목구비 균형에서 집중 테마를 뽑았습니다.",
      saju_summary: "월주 흐름은 실행 키워드와 연결됩니다.",
      reading_needs: ["집중력 회복", "실행력", "사고 확장"],
      recommendations: [
        { book_id: "1", reason: "집중 루틴에 맞습니다.", action_copy: "첫 장만 읽어도 시동 걸림" },
        { book_id: "2", reason: "실행력을 보강합니다.", action_copy: "빌리면 오늘의 나 칭찬 가능" },
        { book_id: "3", reason: "사고를 정리합니다.", action_copy: "머릿속 탭 정리용" },
      ],
    });

    expect(result.readingType.code).toBe("focus_reboot");
    expect(result.recommendations).toHaveLength(3);
  });

  it("rejects unknown type codes", () => {
    expect(() =>
      normalizeLibraryAnalysis({
        reading_type: { code: "bad", display_name: "bad", headline: "bad", description: "bad" },
        physiognomy_summary: "x",
        saju_summary: "x",
        reading_needs: ["x", "y", "z"],
        recommendations: [
          { book_id: "1", reason: "x", action_copy: "x" },
          { book_id: "2", reason: "x", action_copy: "x" },
          { book_id: "3", reason: "x", action_copy: "x" },
        ],
      }),
    ).toThrow();
  });
});
