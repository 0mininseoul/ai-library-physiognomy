import type { LibraryBook } from "./types";

export function selectBookCandidates({
  books,
  favoriteCategory,
  desiredTags,
  limit = 20,
}: {
  books: LibraryBook[];
  favoriteCategory: string;
  desiredTags: string[];
  limit?: number;
}): LibraryBook[] {
  return [...books]
    .map((book) => ({ book, score: scoreBook(book, favoriteCategory, desiredTags) }))
    .sort((a, b) => b.score - a.score || a.book.title.localeCompare(b.book.title, "ko"))
    .slice(0, limit)
    .map((item) => item.book);
}

function scoreBook(book: LibraryBook, favoriteCategory: string, desiredTags: string[]): number {
  const categoryScore = book.category === favoriteCategory ? 10 : 0;
  const tagScore = desiredTags.filter((tag) => book.tags.includes(tag)).length * 4;
  const descriptionScore = book.description ? 1 : 0;
  return categoryScore + tagScore + descriptionScore;
}
