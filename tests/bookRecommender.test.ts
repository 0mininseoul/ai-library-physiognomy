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

import { enforceSourceMix, scoreBookWithPersona } from "@/lib/books/recommender";

function gachonBook(sourceLabel: "bookcuration" | "openlibrary", sourceId: string, title: string, category: string, tags: string[]): LibraryBook {
  return {
    source: sourceLabel === "bookcuration" ? "gachon_curation" : "gachon_open",
    sourceLabel,
    sourceId,
    isbn13: null,
    title,
    author: "저자",
    publisher: "출판사",
    publishedYear: 2024,
    category,
    description: "긴 설명이 들어가는 자리",
    coverUrl: null,
    callNumber: "000.0 ㄱ000",
    locationLabel: "중앙도서관",
    locationRoom: sourceLabel === "bookcuration" ? "북큐레이션코너(1층)" : "프리덤광장",
    availability: "available",
    tags,
  };
}

describe("scoreBookWithPersona", () => {
  it("applies persona tag weights on top of category match", () => {
    const book = gachonBook("bookcuration", "X", "AI 입문", "과학/기술", ["AI", "입문서"]);
    const score = scoreBookWithPersona(book, {
      favoriteCategory: "과학/기술",
      personaWeights: { AI: 4, "입문서": 3 },
      needFocus: "stimulation",
      saltSeed: "seed-1",
    });
    expect(score).toBeGreaterThan(15);
  });

  it("returns higher score when persona tags match more", () => {
    const matching = gachonBook("openlibrary", "M", "스토아 철학", "인문/철학", ["철학 입문", "에세이"]);
    const nonMatching = gachonBook("openlibrary", "N", "공룡 도감", "과학/기술", ["과학"]);
    const personaWeights = { "철학 입문": 4, "에세이": 3 };
    const base = { favoriteCategory: "인문/철학", personaWeights, needFocus: "depth" as const, saltSeed: "s" };
    expect(scoreBookWithPersona(matching, base)).toBeGreaterThan(scoreBookWithPersona(nonMatching, base));
  });

  it("rewards books matching the needFocus axis", () => {
    const comfortBook = gachonBook("openlibrary", "C", "위로 에세이", "시/에세이", ["위로", "에세이"]);
    const utilityBook = gachonBook("openlibrary", "U", "생산성 마스터", "자기계발", ["실행력", "생산성"]);
    const personaWeights = {};
    const comfortScore = scoreBookWithPersona(comfortBook, { favoriteCategory: "시/에세이", personaWeights, needFocus: "comfort", saltSeed: "s" });
    const utilityScore = scoreBookWithPersona(utilityBook, { favoriteCategory: "시/에세이", personaWeights, needFocus: "comfort", saltSeed: "s" });
    expect(comfortScore).toBeGreaterThan(utilityScore);
  });
});

describe("enforceSourceMix", () => {
  const candidates = [
    gachonBook("bookcuration", "A1", "AI 1", "과학/기술", ["AI"]),
    gachonBook("bookcuration", "A2", "AI 2", "과학/기술", ["AI"]),
    gachonBook("bookcuration", "A3", "AI 3", "과학/기술", ["AI"]),
    gachonBook("bookcuration", "A4", "AI 4", "과학/기술", ["AI"]),
    gachonBook("openlibrary", "B1", "철학 1", "인문/철학", ["철학 입문"]),
    gachonBook("openlibrary", "B2", "철학 2", "인문/철학", ["철학 입문"]),
  ];

  it("swaps last pick when all 3 picks are same source", () => {
    const picks = candidates.slice(0, 3);
    const mixed = enforceSourceMix(picks, candidates, { curationRatio: 2, openRatio: 1 });
    const labels = mixed.map((book) => book.sourceLabel);
    expect(labels.filter((l) => l === "openlibrary")).toHaveLength(1);
  });

  it("keeps picks unchanged when ratio already met", () => {
    const picks = [candidates[0]!, candidates[1]!, candidates[4]!];
    const mixed = enforceSourceMix(picks, candidates, { curationRatio: 2, openRatio: 1 });
    expect(mixed.map((book) => book.sourceId)).toEqual(["A1", "A2", "B1"]);
  });
});
