import { describe, expect, it } from "vitest";
import { selectBookCandidates } from "@/lib/books/recommender";
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
});

function book(sourceId: string, title: string, category: string, tags: string[]): LibraryBook {
  return {
    source: "naver",
    sourceId,
    isbn13: null,
    title,
    author: "작가",
    publisher: "출판사",
    publishedYear: 2024,
    category,
    description: title,
    coverUrl: null,
    callNumber: "000.000",
    locationLabel: `${category} 추천 서가`,
    tags,
  };
}
