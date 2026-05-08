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
      description: "오늘은 산만함을 책으로 압축해야 하는 타입입니다.",
    },
    physiognomySummary: "이마와 눈매 밸런스에서 목표 재정렬 신호가 보입니다.",
    sajuSummary: "지금은 루틴과 실행력을 끌어올릴 책이 잘 맞습니다.",
    readingNeeds: ["루틴 회복", "몰입 강화", "대출 동기 충전"],
    recommendations: [
      {
        bookId: "book-1",
        title: "몰입의 기술",
        author: "김도서",
        callNumber: "181.3 김25ㅁ",
        locationLabel: "중앙도서관 3층",
        reason: "목표를 다시 좁히는 데 좋습니다.",
        actionCopy: "이건 영민이 책상 위에 바로 올려야 하는 처방입니다.",
      },
    ],
  },
};

describe("ResultContent", () => {
  it("uses the display name with Korean particles and hides expired face images", () => {
    render(<ResultContent payload={payload} />);

    expect(screen.getByText(/영민아/)).toBeInTheDocument();
    expect(screen.getByText("지금 영민이에게 필요한 책")).toBeInTheDocument();
    expect(screen.getByText("얼굴 이미지는 24시간 이후 삭제됐어요.")).toBeInTheDocument();
    expect(screen.getByText("몰입의 기술")).toBeInTheDocument();
  });
});
