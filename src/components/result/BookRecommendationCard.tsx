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
      className="glass-card group grid h-full min-h-[22rem] grid-rows-[10rem_minmax(0,1fr)] rounded-3xl p-4 transition hover:border-accent-info/50 hover:bg-white/[0.08]"
    >
      <div className="mx-auto aspect-[3/4] h-full overflow-hidden rounded-2xl border border-white/[0.12] bg-bg-card shadow-2xl shadow-black/35">
        {book.coverUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={book.coverUrl} alt={`${book.title} 표지`} className="h-full w-full object-cover transition duration-300 group-hover:scale-105" />
        ) : (
          <div className="flex h-full items-center justify-center px-3 text-center text-xs font-black leading-5 text-text-faint">NO COVER</div>
        )}
      </div>

      <div className="min-w-0">
        <div className="flex h-full flex-col">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <p className="text-xs font-black uppercase tracking-[0.14em] text-accent-info">CURATION #{index + 1}</p>
              <h3 className="mt-2 line-clamp-2 text-xl font-black leading-tight text-text-primary">{book.title}</h3>
              <p className="mt-1 truncate text-sm font-bold text-text-muted">{book.author}</p>
            </div>
            <ExternalLink className="h-5 w-5 shrink-0 text-accent-info transition group-hover:translate-x-0.5 group-hover:-translate-y-0.5" aria-hidden="true" />
          </div>

          <p className="mt-4 line-clamp-3 text-sm font-semibold leading-6 text-text-muted">{book.reason}</p>
          <p className="mt-3 rounded-xl border border-accent-info/20 bg-accent-info/10 px-4 py-3 text-sm font-black leading-6 text-text-primary">{book.actionCopy}</p>

          <div className="mt-auto grid gap-2 pt-4 text-sm font-bold text-text-muted">
            <p className="inline-flex min-w-0 items-center gap-2">
              <MapPin className="h-4 w-4 shrink-0 text-accent-info" aria-hidden="true" />
              <span className="truncate">{book.locationLabel}</span>
            </p>
            <p className="inline-flex min-w-0 items-center gap-2">
              <Tag className="h-4 w-4 shrink-0 text-accent-info" aria-hidden="true" />
              <span className="truncate">{book.callNumber}</span>
            </p>
          </div>
        </div>
      </div>
    </a>
  );
}

function naverBookUrl(title: string, author: string) {
  return `https://search.shopping.naver.com/book/search?query=${encodeURIComponent(`${title} ${author}`.trim())}`;
}
