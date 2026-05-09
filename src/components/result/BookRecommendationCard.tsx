import { ExternalLink, MapPin, Tag } from "lucide-react";
import type { BookRecommendation } from "@/types/session";

type BookRecommendationCardProps = {
  book: BookRecommendation;
  index: number;
};

export function BookRecommendationCard({ book, index }: BookRecommendationCardProps) {
  const href = book.naverBookUrl ?? naverBookUrl(book.title, book.author);

  return (
    <a
      href={href}
      target="_blank"
      rel="noreferrer"
      className="glass-panel group grid gap-4 rounded-2xl p-4 transition hover:border-accent-info/50 hover:bg-bg-card-hover/70 sm:grid-cols-[6.75rem_minmax(0,1fr)]"
    >
      <div className="aspect-[3/4] overflow-hidden rounded-lg border border-border bg-bg-card">
        {book.coverUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={book.coverUrl} alt={`${book.title} 표지`} className="h-full w-full object-cover transition duration-300 group-hover:scale-105" />
        ) : (
          <div className="flex h-full items-center justify-center px-3 text-center text-xs font-black leading-5 text-text-faint">NO COVER</div>
        )}
      </div>

      <div className="min-w-0">
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="text-xs font-black uppercase tracking-[0.14em] text-accent-info">CURATION #{index + 1}</p>
            <h3 className="mt-2 text-xl font-black leading-tight text-text-primary">{book.title}</h3>
            <p className="mt-1 text-sm font-bold text-text-muted">{book.author}</p>
          </div>
          <ExternalLink className="h-5 w-5 shrink-0 text-accent-info transition group-hover:translate-x-0.5 group-hover:-translate-y-0.5" aria-hidden="true" />
        </div>

        <p className="mt-4 text-sm font-semibold leading-6 text-text-muted">{book.reason}</p>
        <p className="mt-3 rounded-lg border border-accent-info/20 bg-accent-info/10 px-4 py-3 text-sm font-black leading-6 text-text-primary">{book.actionCopy}</p>

        <div className="mt-4 grid gap-2 text-sm font-bold text-text-muted sm:grid-cols-2">
          <p className="inline-flex items-center gap-2">
            <MapPin className="h-4 w-4 text-accent-info" aria-hidden="true" />
            {book.locationLabel}
          </p>
          <p className="inline-flex items-center gap-2">
            <Tag className="h-4 w-4 text-accent-info" aria-hidden="true" />
            {book.callNumber}
          </p>
        </div>
      </div>
    </a>
  );
}

function naverBookUrl(title: string, author: string) {
  return `https://search.shopping.naver.com/book/search?query=${encodeURIComponent(`${title} ${author}`.trim())}`;
}
