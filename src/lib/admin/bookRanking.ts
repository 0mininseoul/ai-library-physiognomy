import type { AdminMetrics } from "@/lib/admin/metrics";

export type AggregatedRecommendedBook = {
  key: string;
  title: string;
  author: string;
  category: string;
  tags: string[];
  shelfLocations: string[];
  count: number;
};

export function aggregateRecommendedBooks(books: AdminMetrics["recommendedBooks"]): AggregatedRecommendedBook[] {
  const byKey = new Map<string, AggregatedRecommendedBook>();

  for (const book of books) {
    const key = book.bookId || `${book.title}-${book.author}`;
    const current = byKey.get(key);
    if (current) {
      current.count += 1;
      current.tags = Array.from(new Set([...current.tags, ...(book.tags ?? [])]));
      current.shelfLocations = Array.from(new Set([...current.shelfLocations, book.shelfLocation].filter(Boolean)));
    } else {
      byKey.set(key, {
        key,
        title: book.title,
        author: book.author,
        category: book.category ?? "",
        tags: book.tags ?? [],
        shelfLocations: book.shelfLocation && book.shelfLocation !== "-" ? [book.shelfLocation] : [],
        count: 1,
      });
    }
  }

  return [...byKey.values()].sort((a, b) => b.count - a.count || a.title.localeCompare(b.title, "ko"));
}
