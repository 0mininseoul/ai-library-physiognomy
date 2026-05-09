import { describe, expect, it } from "vitest";
import { normalizeLibraryAnalysis } from "@/lib/gemini/librarySchema";

describe("normalizeLibraryAnalysis", () => {
  it("accepts allowed reading type codes and three recommendations", () => {
    const result = normalizeLibraryAnalysis({
      reading_type: {
        code: "focus_reboot",
        display_name: "집중력 리부트형",
        headline: "영민님 집중력 리부트 타이밍",
        description: "몰입 루틴이 필요한 상태입니다.",
      },
      main_copy: "영민님 집중 모드 켜짐",
      geometry: {
        symmetry: "좌우 눈높이와 입꼬리 기준으로 균형이 안정적입니다.",
        golden_ratio: "얼굴 폭과 높이 비율이 편안한 첫인상을 만듭니다.",
        thirds: "상중하안 분포가 사고와 실행의 균형 쪽으로 읽힙니다.",
        fifths: "눈 사이 간격과 얼굴 폭의 비례가 차분합니다.",
        face_shape: "전체 윤곽은 부드럽지만 하관 쪽 버티는 힘이 보입니다.",
      },
      parts: {
        forehead: { metrics_text: "이마 면적 기준", comment: "계획 세우는 힘이 보입니다." },
        eyes: { metrics_text: "눈매 각도 기준", comment: "관찰력이 빠른 눈입니다." },
        nose: { metrics_text: "콧대 길이 기준", comment: "시작 전 계산이 들어가는 타입입니다." },
        mouth: { metrics_text: "입꼬리 각도 기준", comment: "핵심에서 표현이 선명합니다." },
        jaw: { metrics_text: "하관 안정감 기준", comment: "버티는 힘이 있습니다." },
        skin: { metrics_text: "전체 분위기 기준", comment: "컨디션이 얼굴에 빠르게 드러납니다." },
      },
      scores: {
        likability: 82,
        trust: 79,
        symmetry: 77,
        balance: 81,
        attractiveness: 80,
        comments: ["호감도 안정", "신뢰감 양호", "대칭성 양호", "균형감 양호", "인상 매력도 양호"],
      },
      physiognomy: {
        keywords: ["집중", "관찰", "재정렬"],
        summary: "이목구비 균형에서 집중 테마를 뽑았습니다.",
        strengths: ["핵심을 좁히는 힘", "조용히 오래 버티는 힘"],
        cautions: ["생각이 길어질 수 있음", "컨디션이 표정에 드러날 수 있음"],
      },
      saju: {
        keywords: ["루틴", "실행", "회복"],
        element_balance: "지금은 목 기운보다 토 기운을 보강하면 좋습니다.",
        current_flow: "월주 흐름은 실행 키워드와 연결됩니다.",
        strength: "한 번 꽂히면 오래 파고듭니다.",
        advice: "작게 시작하면 흐름이 붙습니다.",
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
    expect(result.mainCopy).toBe("영민님 집중 모드 켜짐");
    expect(result.recommendations).toHaveLength(3);
  });

  it("rejects unknown type codes", () => {
    expect(() =>
      normalizeLibraryAnalysis({
        reading_type: { code: "bad", display_name: "bad", headline: "bad", description: "bad" },
        main_copy: "bad",
      }),
    ).toThrow();
  });
});
