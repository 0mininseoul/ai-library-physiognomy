export type LibraryBook = {
  source: "data4library";
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
