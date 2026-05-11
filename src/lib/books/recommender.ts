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
  const discoveryBonus = isDiscoveryFriendly(book) ? 2 : 0;
  return categoryScore + tagScore + descriptionScore + discoveryBonus - bestsellerPenalty(book);
}

export function bestsellerPenalty(book: LibraryBook): number {
  const rank = Number.parseInt(book.sourceId, 10);
  const data4LibraryRankPenalty = book.source === "data4library" && Number.isFinite(rank) ? Math.max(0, 5 - Math.floor((rank - 1) / 20)) : 0;
  const titlePenalty = OBVIOUS_BESTSELLER_PATTERNS.some((pattern) => pattern.test(book.title)) ? 4 : 0;
  return data4LibraryRankPenalty + titlePenalty;
}

function isDiscoveryFriendly(book: LibraryBook) {
  return book.description.length >= 40 || book.tags.length >= 3;
}

const OBVIOUS_BESTSELLER_PATTERNS = [
  /불편한\s*편의점/,
  /아몬드/,
  /역행자/,
  /세이노의\s*가르침/,
  /원씽|the\s*one\s*thing/i,
  /데미안/,
  /어린\s*왕자/,
  /미움받을\s*용기/,
  /돈의\s*속성/,
  /달러구트/,
] as const;
