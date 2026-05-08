import { describe, expect, it } from "vitest";
import { normalizeRawBook } from "../../scripts/books/normalize-books";

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
      mvp_category: "집중/실행",
      mvp_query: "집중",
    });

    expect(book).toMatchObject({
      source: "data4library",
      sourceId: "123",
      title: "생각 정리의 기술",
      author: "홍길동",
      category: "집중/실행",
      callNumber: expect.stringMatching(/^000/),
      locationLabel: expect.stringContaining("자료실"),
    });
  });
});
