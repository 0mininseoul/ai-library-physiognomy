const GACHON_LIBRARY_ORIGIN = "https://lib.gachon.ac.kr";

type GachonLinkBook = {
  title: string;
  author?: string | null;
  isbn13?: string | null;
  libraryDetailUrl?: string | null;
  detailUrl?: string | null;
};

export function bookLibraryHref(book: GachonLinkBook): string {
  const explicitUrl = cleanUrl(book.libraryDetailUrl) ?? cleanUrl(book.detailUrl);
  if (explicitUrl && isGachonLibraryUrl(explicitUrl)) return explicitUrl;
  return gachonCatalogSearchUrl(book);
}

export function gachonCatalogSearchUrl(book: Pick<GachonLinkBook, "title" | "author" | "isbn13">): string {
  const query = cleanText(book.isbn13) ?? cleanText([book.title, book.author].filter(Boolean).join(" ")) ?? cleanText(book.title) ?? "";
  const url = new URL("/search/tot/result", GACHON_LIBRARY_ORIGIN);
  url.searchParams.set("st", "KWRD");
  url.searchParams.set("si", "TOTAL");
  url.searchParams.set("q", query);
  return url.toString();
}

function isGachonLibraryUrl(input: string): boolean {
  try {
    return new URL(input).hostname === "lib.gachon.ac.kr";
  } catch {
    return false;
  }
}

function cleanUrl(input: string | null | undefined): string | null {
  const value = cleanText(input);
  if (!value) return null;
  try {
    return new URL(value).toString();
  } catch {
    return null;
  }
}

function cleanText(input: string | null | undefined): string | null {
  const value = input?.trim();
  return value ? value : null;
}
