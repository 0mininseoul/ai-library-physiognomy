import { describe, expect, it } from "vitest";
import { BOOK_CATEGORIES, inferBookCategory } from "../../src/lib/books/categories";

describe("book category taxonomy", () => {
  it("uses bookstore-style categories for user preference input", () => {
    expect(BOOK_CATEGORIES).toEqual(
      expect.arrayContaining(["소설", "시/에세이", "자기계발", "경제/경영", "과학/기술"]),
    );
    expect(BOOK_CATEGORIES).not.toContain("관계/대화");
  });

  it("classifies real-estate auction books as economy/business", () => {
    expect(
      inferBookCategory({
        title: "AI 부동산 경매",
        description: "AI와 빅데이터를 활용해 부동산 경매 탐색부터 낙찰까지 시스템화하는 투자 실전서",
        categoryHint: "관계/대화",
      }),
    ).toBe("경제/경영");
  });
});
