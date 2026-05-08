import { describe, expect, it } from "vitest";
import { normalizeAnyRawBook, normalizeRawBook } from "../../scripts/books/normalize-books";

describe("normalizeRawBook", () => {
  it("normalizes Data4Library fields into MVP book records", () => {
    const book = normalizeRawBook({
      no: "123",
      bookname: "생각 정리의 기술",
      authors: "홍길동",
      publisher: "도서출판 테스트",
      publication_year: "2024",
      isbn13: "9791190000001",
      class_nm: "총류",
      bookImageURL: "https://example.com/cover.jpg",
      mvp_category: "자기계발",
      mvp_query: "집중",
    });

    expect(book).toMatchObject({
      source: "data4library",
      sourceId: "123",
      title: "생각 정리의 기술",
      author: "홍길동",
      category: "자기계발",
      callNumber: expect.stringMatching(/^000/),
      locationLabel: expect.stringContaining("자료실"),
    });
  });

  it("normalizes Naver Book API fields into MVP book records", () => {
    const book = normalizeAnyRawBook({
      source: "naver",
      title: "<b>소년이 온다</b>",
      author: "한강",
      publisher: "창비",
      pubdate: "20140519",
      isbn: "8936434128 9788936434120",
      image: "https://example.com/naver-cover.jpg",
      description: "상처를 마주 보는 문학",
      link: "https://example.com/book",
      mvp_category: "소설",
      mvp_query: "문학",
    });

    expect(book).toMatchObject({
      source: "naver",
      sourceId: "9788936434120",
      isbn13: "9788936434120",
      title: "소년이 온다",
      author: "한강",
      category: "소설",
      publishedYear: 2014,
      locationLabel: "소설 추천 서가",
    });
  });
});
