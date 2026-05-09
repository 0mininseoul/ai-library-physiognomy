import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { ResultContent, type ResultPayload } from "@/components/pages/ResultPage";

const payload: ResultPayload = {
  id: "session-1",
  createdAt: "2026-05-09T00:00:00.000Z",
  displayName: "영민",
  faceImageUrl: null,
  result: {
    readingType: {
      code: "focus_reboot",
      displayName: "집중 리부트형",
      headline: "집중력 재부팅이 시급한 얼굴",
      description: "오늘은 산만함을 한 번 좁혀야 하는 타입입니다.",
    },
    mainCopy: "영민님 집중 모드 켜짐",
    geometry: {
      symmetry: "좌우 눈높이와 입꼬리 기준으로 균형이 안정적입니다.",
      goldenRatio: "얼굴 폭과 높이 비율이 편안한 첫인상을 만듭니다.",
      thirds: "상중하안 분포가 사고와 실행의 균형 쪽으로 읽힙니다.",
      fifths: "눈 사이 간격과 얼굴 폭의 비례가 차분합니다.",
      faceShape: "전체 윤곽은 부드럽지만 하관 쪽 버티는 힘이 보입니다.",
    },
    parts: {
      forehead: { metricsText: "이마 면적 기준", comment: "계획 세우는 힘이 보입니다." },
      eyes: { metricsText: "눈매 각도 기준", comment: "관찰력이 빠른 눈입니다." },
      nose: { metricsText: "콧대 길이 기준", comment: "시작 전 계산이 들어가는 타입입니다." },
      mouth: { metricsText: "입꼬리 각도 기준", comment: "핵심에서 표현이 선명합니다." },
      jaw: { metricsText: "하관 안정감 기준", comment: "버티는 힘이 있습니다." },
      impression: { metricsText: "표정 안정감 기준", comment: "차분하게 몰입하는 인상이 있습니다." },
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
      summary: "이마와 눈매 밸런스에서 목표 재정렬 신호가 보입니다.",
      strengths: ["핵심을 좁히는 힘", "조용히 오래 버티는 힘"],
      cautions: ["생각이 길어질 수 있음", "컨디션이 표정에 드러날 수 있음"],
    },
    saju: {
      keywords: ["루틴", "실행", "회복"],
      elementBalance: "지금은 목 기운보다 토 기운을 보강하면 좋습니다.",
      currentFlow: "루틴과 실행력을 끌어올릴 타이밍입니다.",
      strength: "한 번 꽂히면 오래 파고듭니다.",
      advice: "작게 시작하면 흐름이 붙습니다.",
    },
    romanticMatch: {
      bestTypes: ["불꽃 실행형", "잔잔한 물결형"],
      why: "영민님의 깊게 파고드는 리듬을 상대가 가볍게 환기해줄 때 케미가 좋습니다.",
      dateStyle: "조용한 전시나 책방처럼 대화가 천천히 열리는 코스가 잘 맞습니다.",
      caution: "답장이 늦다고 바로 의미 부여하면 고양이 귀 접힙니다.",
    },
    physiognomySummary: "이마와 눈매 밸런스에서 목표 재정렬 신호가 보입니다.",
    sajuSummary: "지금은 루틴과 실행력을 끌어올릴 책이 잘 맞습니다.",
    readingNeeds: ["루틴 회복", "몰입 강화", "실행 동기 충전"],
    recommendations: [
      {
        bookId: "book-1",
        title: "몰입의 기술",
        author: "김도서",
        coverUrl: "https://example.com/cover.jpg",
        naverBookUrl: "https://search.shopping.naver.com/book/search?query=%EB%AA%B0%EC%9E%85%EC%9D%98%20%EA%B8%B0%EC%88%A0",
        callNumber: "181.3 김25ㅁ",
        locationLabel: "중앙도서관 3층",
        reason: "목표를 다시 좁히는 데 좋습니다.",
        actionCopy: "이건 영민님 책상 위에 바로 올리면 집중각입니다.",
      },
    ],
  },
};

describe("ResultContent", () => {
  it("uses the display name with Korean particles and hides expired face images", () => {
    render(<ResultContent payload={payload} />);

    expect(screen.getByText(/영민님 집중 모드 켜짐/)).toBeInTheDocument();
    expect(screen.getByText("지금 영민님에게 필요한 책")).toBeInTheDocument();
    expect(screen.getByText("연애 궁합")).toBeInTheDocument();
    expect(screen.queryByText(/피부/)).not.toBeInTheDocument();
    expect(screen.getByText("얼굴 이미지는 24시간 이후 삭제됐어요.")).toBeInTheDocument();
    expect(screen.getByText("몰입의 기술")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /몰입의 기술/ })).toHaveAttribute("href", expect.stringContaining("search.shopping.naver.com"));
  });
});
