import { describe, expect, it } from "vitest";
import { normalizeLibraryAnalysis, normalizeLibraryRecommendations, parseLibraryRecommendationsResponse } from "@/lib/gemini/librarySchema";

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
        impression: { metrics_text: "표정 안정감 기준", comment: "차분하게 몰입하는 인상이 있습니다." },
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
      romantic_match: {
        best_types: ["불꽃 실행형", "잔잔한 물결형"],
        why: "영민님의 깊게 파고드는 리듬을 상대가 가볍게 환기해줄 때 케미가 좋습니다.",
        date_style: "조용한 전시나 책방처럼 대화가 천천히 열리는 코스가 잘 맞습니다.",
        caution: "답장이 늦다고 바로 의미 부여하면 고양이 귀 접힙니다.",
      },
      section_copy: {
        face_reveal: ["영민님은 첫 화면부터 차분한 집중감이 보여요."],
        face_signal: ["눈과 하관 좌표에서 안정적인 인상 신호가 보여요."],
        inner_style: ["탐색은 선명하고 추진은 조금 보완하면 좋아요."],
        chemi_match: ["가볍게 환기해주는 사람과 흐름이 좋아요."],
        book_curation: ["지금은 집중을 좁혀주는 책이 잘 맞아요."],
      },
      inner_style: {
        dominant_label: "탐색",
        dominant_emoji: "🌱",
        dominant_headline: "궁금한 건 끝까지 파고드는 편이에요.",
        dominant_detail: "관심사가 생기면 자료를 모으고 연결하는 속도가 빨라요.",
        growth_label: "추진",
        growth_emoji: "🔥",
        growth_headline: "시작 버튼이 조금 늦게 눌릴 수 있어요.",
        growth_detail: "생각이 충분히 쌓일 때까지 기다리다 타이밍을 놓칠 수 있어요.",
        growth_action: "작은 실행을 먼저 하나만 정하면 균형이 좋아져요.",
      },
      chemi_match: {
        type_label: "에너지 실행형",
        headline: "가볍게 시동을 걸어주는 사람과 흐름이 좋아요.",
        why: "영민님의 깊은 생각을 현실 쪽으로 살짝 당겨줘요.",
        friction: "속도를 강요하면 오히려 귀가 접힐 수 있어요.",
        good_scene: "짧게 산책하며 생각을 말로 꺼내는 장면이 좋아요.",
      },
      physiognomy_summary: "이목구비 균형에서 집중 테마를 뽑았습니다.",
      saju_summary: "월주 흐름은 실행 키워드와 연결됩니다.",
      reading_needs: ["집중력 회복", "실행력", "사고 확장"],
      recommendations: [
        { book_id: "1", reason: "집중 루틴에 맞습니다.", action_copy: "첫 장만 읽어도 시동 걸림", fit_reason: "탐색 성향을 집중으로 좁혀줘요.", reading_moment: "공부 시작 전 15분에 좋아요." },
        { book_id: "2", reason: "실행력을 보강합니다.", action_copy: "빌리면 오늘의 나 칭찬 가능" },
        { book_id: "3", reason: "사고를 정리합니다.", action_copy: "머릿속 탭 정리용" },
      ],
    });

    expect(result.readingType.code).toBe("focus_reboot");
    expect(result.mainCopy).toBe("영민님 집중 모드 켜짐");
    expect(result.parts.impression.comment).toContain("차분하게");
    expect(result.romanticMatch.bestTypes).toContain("에너지 실행형");
    expect(result.sectionCopy?.faceReveal[0]).toContain("영민님");
    expect(result.innerStyleInsight?.growthLabel).toBe("추진");
    expect(result.chemiInsight?.typeLabel).toBe("에너지 실행형");
    expect(result.recommendations[0].fitReason).toContain("탐색");
    expect(JSON.stringify(result)).not.toMatch(/사주|오행|생년월일|물 기운|불꽃 실행형|잔잔한 물결형|월주/);
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

  it("normalizes an analysis payload before recommendations are generated", () => {
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
        impression: { metrics_text: "표정 안정감 기준", comment: "차분하게 몰입하는 인상이 있습니다." },
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
      romantic_match: {
        best_types: ["에너지 실행형"],
        why: "영민님의 깊게 파고드는 리듬을 상대가 가볍게 환기해줄 때 케미가 좋습니다.",
        date_style: "조용한 전시나 책방처럼 대화가 천천히 열리는 코스가 잘 맞습니다.",
        caution: "답장이 늦다고 바로 의미 부여하면 고양이 귀 접힙니다.",
      },
      section_copy: {
        face_reveal: ["영민님은 첫 화면부터 차분한 집중감이 보여요."],
        face_signal: ["눈과 하관 좌표에서 안정적인 인상 신호가 보여요."],
        inner_style: ["탐색은 선명하고 추진은 조금 보완하면 좋아요."],
        chemi_match: ["가볍게 환기해주는 사람과 흐름이 좋아요."],
      },
      inner_style: {
        dominant_label: "탐색",
        dominant_emoji: "🌱",
        dominant_headline: "궁금한 건 끝까지 파고드는 편이에요.",
        dominant_detail: "관심사가 생기면 자료를 모으고 연결하는 속도가 빨라요.",
        growth_label: "추진",
        growth_emoji: "🔥",
        growth_headline: "시작 버튼이 조금 늦게 눌릴 수 있어요.",
        growth_detail: "생각이 충분히 쌓일 때까지 기다리다 타이밍을 놓칠 수 있어요.",
        growth_action: "작은 실행을 먼저 하나만 정하면 균형이 좋아져요.",
      },
      chemi_match: {
        type_label: "에너지 실행형",
        headline: "가볍게 시동을 걸어주는 사람과 흐름이 좋아요.",
        why: "영민님의 깊은 생각을 현실 쪽으로 살짝 당겨줘요.",
        friction: "속도를 강요하면 오히려 귀가 접힐 수 있어요.",
        good_scene: "짧게 산책하며 생각을 말로 꺼내는 장면이 좋아요.",
      },
      physiognomy_summary: "이목구비 균형에서 집중 테마를 뽑았습니다.",
      saju_summary: "월주 흐름은 실행 키워드와 연결됩니다.",
    });

    expect(result.readingNeeds).toEqual([]);
    expect(result.recommendations).toEqual([]);
    expect(result.sectionCopy?.bookCuration).toEqual([]);
  });

  it("treats blank personaConfirmed as omitted", () => {
    const result = normalizeLibraryAnalysis({
      ...validAnalysisPayload(),
      personaConfirmed: "",
    });

    expect(result.personaConfirmed).toBeUndefined();
  });

  it("normalizes recommendation-only payloads for the async book section", () => {
    const result = normalizeLibraryRecommendations({
      section_copy: {
        book_curation: ["지금은 집중을 좁혀주는 책이 잘 맞아요."],
      },
      reading_needs: ["집중력 회복", "실행력", "사고 확장"],
      recommendations: [
        { book_id: "1", reason: "피부 근거", action_copy: "처방", fit_reason: "탐색 성향을 집중으로 좁혀줘요.", reading_moment: "공부 시작 전 15분에 좋아요." },
        { book_id: "2", reason: "실행력을 보강합니다.", action_copy: "빌리면 오늘의 나 칭찬 가능", fit_reason: "작게 시작하게 도와줘요.", reading_moment: "오전 루틴 전에 좋아요." },
        { book_id: "3", reason: "사고를 정리합니다.", action_copy: "머릿속 탭 정리용", fit_reason: "생각을 문장으로 정리하게 해줘요.", reading_moment: "잠들기 전 20분에 좋아요." },
      ],
    });

    expect(result.recommendations).toHaveLength(3);
    expect(result.recommendations[0].reason).toContain("전체 인상");
    expect(result.sectionCopy.bookCuration[0]).toContain("집중");
  });

  it("parses recommendation-only Gemini text with raw newlines in string values", () => {
    const result = parseLibraryRecommendationsResponse(`{
      "section_copy": {
        "book_curation": ["지금은 집중을
좁혀주는 책이 잘 맞아요."]
      },
      "reading_needs": ["집중력 회복", "실행력", "사고 확장"],
      "recommendations": [
        {"book_id": "1", "reason": "첫 줄
둘째 줄", "action_copy": "첫 장부터", "fit_reason": "탐색 성향을 좁혀줘요.", "reading_moment": "오전 15분"},
        {"book_id": "2", "reason": "실행력을 보강합니다.", "action_copy": "오늘 바로", "fit_reason": "작게 시작하게 도와줘요.", "reading_moment": "점심 전"},
        {"book_id": "3", "reason": "사고를 정리합니다.", "action_copy": "메모하며 읽기", "fit_reason": "생각을 문장으로 정리하게 해줘요.", "reading_moment": "잠들기 전"}
      ]
    }`);

    expect(result.recommendations).toHaveLength(3);
    expect(result.recommendations[0].reason).toContain("둘째 줄");
    expect(result.sectionCopy.bookCuration[0]).toContain("좁혀주는 책");
  });

  it("removes banned user-facing terms while allowing relationship wording", () => {
    const result = normalizeLibraryAnalysis({
      reading_type: {
        code: "focus_reboot",
        display_name: "집중 처방형",
        headline: "영민 학생에게 필요한 처방",
        description: "피부 근거가 아니라 얼굴 균형 설명입니다.",
      },
      main_copy: "영민 학생 연애 처방",
      geometry: {
        symmetry: "대칭 근거",
        golden_ratio: "비율 근거",
        thirds: "상중하안 근거",
        fifths: "오등분 근거",
        face_shape: "얼굴형 근거",
      },
      parts: {
        forehead: { metrics_text: "피부 근거", comment: "영민 학생에게 해줘" },
        eyes: { metrics_text: "눈 근거", comment: "연애 데이트 흐름" },
        nose: { metrics_text: "코 근거", comment: "처방전이 필요해요" },
        mouth: { metrics_text: "입 근거", comment: "좋아요" },
        jaw: { metrics_text: "턱 근거", comment: "골랐어요" },
        impression: { metrics_text: "피부 근거", comment: "이건 근거입니다." },
      },
      scores: {
        likability: 82,
        trust: 79,
        symmetry: 77,
        balance: 81,
        attractiveness: 80,
        comments: ["피부", "처방", "학생", "연애", "근거"],
      },
      physiognomy: {
        keywords: ["피부", "처방", "연애"],
        summary: "피부 근거입니다.",
        strengths: ["처방이 좋아요", "학생에게 맞아요"],
        cautions: ["연애 근거", "데이트 근거"],
      },
      saju: {
        keywords: ["루틴", "실행", "회복"],
        element_balance: "근거",
        current_flow: "처방",
        strength: "학생",
        advice: "연애",
      },
      romantic_match: {
        best_types: ["연애형", "데이트형"],
        why: "연애 근거",
        date_style: "데이트",
        caution: "학생",
      },
      reading_needs: ["피부", "처방", "연애"],
      recommendations: [
        { book_id: "1", reason: "피부 근거", action_copy: "처방" },
        { book_id: "2", reason: "학생 연애", action_copy: "데이트" },
        { book_id: "3", reason: "근거", action_copy: "좋아요" },
      ],
    });

    const serialized = JSON.stringify(result);
    expect(serialized).not.toMatch(/피부|처방|학생|근거/);
    expect(result.parts.forehead.metricsText).toContain("전체 인상");
    expect(result.romanticMatch.why).toContain("연애");
    expect(result.romanticMatch.dateStyle).toContain("데이트");
    expect(result.recommendations[2].actionCopy).toBe("좋아요");
  });
});

function validAnalysisPayload() {
  return {
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
      impression: { metrics_text: "표정 안정감 기준", comment: "차분하게 몰입하는 인상이 있습니다." },
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
      element_balance: "지금은 탐색 성향보다 정리 성향을 보강하면 좋습니다.",
      current_flow: "오늘의 흐름은 실행 키워드와 연결됩니다.",
      strength: "한 번 꽂히면 오래 파고듭니다.",
      advice: "작게 시작하면 흐름이 붙습니다.",
    },
    romantic_match: {
      best_types: ["에너지 실행형"],
      why: "영민님의 깊게 파고드는 리듬을 상대가 가볍게 환기해줄 때 케미가 좋습니다.",
      date_style: "조용한 전시나 책방처럼 대화가 천천히 열리는 코스가 잘 맞습니다.",
      caution: "답장이 늦다고 바로 의미 부여하면 거리감이 생길 수 있어요.",
    },
    section_copy: {
      face_reveal: ["영민님은 첫 화면부터 차분한 집중감이 보여요."],
      face_signal: ["눈과 하관 좌표에서 안정적인 인상 신호가 보여요."],
      inner_style: ["탐색은 선명하고 추진은 조금 보완하면 좋아요."],
      chemi_match: ["가볍게 환기해주는 사람과 흐름이 좋아요."],
    },
    inner_style: {
      dominant_label: "탐색",
      dominant_emoji: "seedling",
      dominant_headline: "궁금한 건 끝까지 파고드는 편이에요.",
      dominant_detail: "관심사가 생기면 자료를 모으고 연결하는 속도가 빨라요.",
      growth_label: "추진",
      growth_emoji: "fire",
      growth_headline: "시작 버튼이 조금 늦게 눌릴 수 있어요.",
      growth_detail: "생각이 충분히 쌓일 때까지 기다리다 타이밍을 놓칠 수 있어요.",
      growth_action: "작은 실행을 먼저 하나만 정하면 균형이 좋아져요.",
    },
    chemi_match: {
      type_label: "에너지 실행형",
      headline: "가볍게 시동을 걸어주는 사람과 흐름이 좋아요.",
      why: "영민님의 깊은 생각을 현실 쪽으로 살짝 당겨줘요.",
      friction: "속도를 강요하면 오히려 거리가 생길 수 있어요.",
      good_scene: "짧게 산책하며 생각을 말로 꺼내는 장면이 좋아요.",
    },
  };
}
