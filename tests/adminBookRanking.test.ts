import { describe, expect, it } from "vitest";
import { aggregateRecommendedBooks } from "@/lib/admin/bookRanking";

describe("admin book ranking", () => {
  it("aggregates shelf locations from recommended book source metadata", () => {
    const rows = aggregateRecommendedBooks([
      {
        bookId: "OPEN-1",
        title: "열린 서가의 발견",
        author: "이오픈",
        category: "소설",
        tags: ["탐색"],
        callNumber: "813 이65ㅇ",
        locationLabel: "중앙도서관",
        source: "gachon_open",
        shelfLocation: "오픈라이브러리",
        reason: "관심 확장",
        actionCopy: "같이 읽기",
      },
      {
        bookId: "OPEN-1",
        title: "열린 서가의 발견",
        author: "이오픈",
        category: "소설",
        tags: ["몰입"],
        callNumber: "813 이65ㅇ",
        locationLabel: "중앙도서관",
        source: "gachon_open",
        shelfLocation: "오픈라이브러리",
        reason: "관심 확장",
        actionCopy: "같이 읽기",
      },
    ]);

    expect(rows).toMatchObject([
      {
        title: "열린 서가의 발견",
        count: 2,
        shelfLocations: ["오픈라이브러리"],
      },
    ]);
  });
});
