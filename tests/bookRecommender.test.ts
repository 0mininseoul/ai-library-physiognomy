import { describe, expect, it } from "vitest";
import { bestsellerPenalty, selectBookCandidates } from "@/lib/books/recommender";
import type { LibraryBook } from "@/lib/books/types";

const books: LibraryBook[] = [
  book("1", "집중의 기술", "자기계발", ["집중력", "실행력"]),
  book("2", "마음 회복", "시/에세이", ["회복", "위로"]),
  book("3", "커리어 지도", "진로/학습", ["진로탐색", "커리어"]),
  book("4", "대화 연습", "사회/정치", ["관계", "문해력"]),
];

describe("selectBookCandidates", () => {
  it("prioritizes favorite category and matching tags", () => {
    const selected = selectBookCandidates({
      books,
      favoriteCategory: "진로/학습",
      desiredTags: ["커리어", "진로탐색", "실행력"],
      limit: 2,
    });

    expect(selected.map((book) => book.sourceId)).toEqual(["3", "1"]);
  });

  it("uses a stable Korean title sort when scores tie", () => {
    const selected = selectBookCandidates({
      books: [book("b", "하루 공부", "자기계발", []), book("a", "감정 공부", "자기계발", [])],
      favoriteCategory: "자기계발",
      desiredTags: [],
      limit: 2,
    });

    expect(selected.map((book) => book.title)).toEqual(["감정 공부", "하루 공부"]);
  });

  it("does not let obvious bestsellers dominate equally relevant discovery picks", () => {
    const selected = selectBookCandidates({
      books: [
        book("1", "불편한 편의점", "소설", ["소설", "회복"]),
        book("120", "무명의 회복 노트", "소설", ["소설", "회복", "감정"], "작은 실패를 지나 다시 시작하는 사람을 위한 조용한 이야기입니다."),
      ],
      favoriteCategory: "소설",
      desiredTags: ["회복"],
      limit: 1,
    });

    expect(selected[0].title).toBe("무명의 회복 노트");
  });

  it("detects likely bestseller candidates for prompt cautioning", () => {
    expect(bestsellerPenalty(book("1", "아몬드", "소설", ["소설"]))).toBeGreaterThan(0);
    expect(bestsellerPenalty(book("150", "캠퍼스 고양이의 독서법", "소설", ["소설"]))).toBe(0);
  });
});

function book(sourceId: string, title: string, category: string, tags: string[], description = title): LibraryBook {
  return {
    source: "naver",
    sourceId,
    isbn13: null,
    title,
    author: "작가",
    publisher: "출판사",
    publishedYear: 2024,
    category,
    description,
    coverUrl: null,
    callNumber: "000.000",
    locationLabel: `${category} 추천 서가`,
    tags,
  };
}
