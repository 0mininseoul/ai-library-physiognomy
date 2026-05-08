export type LibraryBook = {
  source: "data4library" | "naver";
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
