export type BookSource = "data4library" | "naver" | "gachon_curation" | "gachon_open";

export type LibraryBook = {
  id?: string;
  source: BookSource;
  sourceLabel?: "bookcuration" | "openlibrary"; // 가천대 두 DB 구분
  sourceId: string;
  isbn13: string | null;
  title: string;
  author: string;
  publisher: string;
  publishedYear: number | null;
  category: string;
  description: string;
  coverUrl: string | null;
  callNumber: string;
  locationLabel: string;
  locationRoom?: string; // 자료실 (예: "북큐레이션코너(1층)")
  availability?: "available" | "checked_out" | null;
  tags: string[];
};

export type RawData4LibraryBook = {
  no?: string;
  ranking?: string;
  bookname?: string;
  authors?: string;
  publisher?: string;
  publication_year?: string;
  isbn13?: string;
  class_nm?: string;
  bookImageURL?: string;
  bookDtlUrl?: string;
};

export type RawNaverBook = {
  source?: "naver";
  title?: string;
  link?: string;
  image?: string;
  author?: string;
  publisher?: string;
  isbn?: string;
  description?: string;
  pubdate?: string;
};
