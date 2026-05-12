import { describe, expect, it } from "vitest";
import { deriveTags } from "../../scripts/library/tag-gachon-books";
import type { GachonEnrichedBook } from "../../scripts/library/fetch-gachon-covers";

function book(overrides: Partial<GachonEnrichedBook>): GachonEnrichedBook {
  return {
    sourceLabel: "openlibrary",
    registrationNo: "UEM000001",
    title: "테스트 도서",
    author: "",
    publisher: "",
    publishedYear: 2025,
    callNumber: "",
    locationLabel: "중앙도서관",
    locationRoom: "프리덤광장",
    status: "이용가능",
    availability: "available",
    isbn13: null,
    coverUrl: null,
    description: "",
    matchScore: 0,
    matched: false,
    ...overrides,
  };
}

describe("deriveTags", () => {
  it("derives openlibrary philosophy tags from title when description is missing", () => {
    expect(deriveTags(book({ title: "차라투스트라는 이렇게 말했다 : 모든 사람을 위한 책" }))).toContain("철학 입문");
  });

  it("derives openlibrary literature tags from title when description is missing", () => {
    expect(deriveTags(book({ title: "현실 온라인 게임 : 김동식 소설집" }))).toContain("문학");
  });

  it("keeps AI baseline tag for bookcuration rows without description", () => {
    expect(deriveTags(book({ sourceLabel: "bookcuration", title: "AI 반도체 전쟁" }))).toContain("AI");
  });
});
