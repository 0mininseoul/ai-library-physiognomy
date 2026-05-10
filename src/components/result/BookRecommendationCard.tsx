import { BookOpen, ExternalLink, MapPin, Tag } from "lucide-react";
import type { BookRecommendation } from "@/types/session";

type BookRecommendationCardProps = {
  book: BookRecommendation;
  index: number;
  variant?: "featured" | "compact";
};

export function BookRecommendationCard({ book, index, variant = "compact" }: BookRecommendationCardProps) {
  const href = book.naverBookUrl ?? naverBookUrl(book.title, book.author);
  const featured = variant === "featured";
  const reason = compactBookReason(book.reason, featured ? 94 : 58);
  const actionCopy = compactBookCopy(book.actionCopy, featured ? 72 : 42);

  if (featured) {
    return (
      <a
        href={href}
        target="_blank"
        rel="noreferrer"
        className="glass-card group grid min-h-[20rem] grid-cols-[11.25rem_minmax(0,1fr)] gap-5 overflow-hidden rounded-3xl p-5 transition hover:border-accent-info/50 hover:bg-bg-card-hover/70"
      >
        <div className="aspect-[3/4] w-full overflow-hidden rounded-2xl border border-border bg-bg-card shadow-2xl shadow-black/20">
          {book.coverUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={book.coverUrl} alt={`${book.title} 표지`} className="h-full w-full object-cover transition duration-300 group-hover:scale-105" />
          ) : (
            <div className="flex h-full items-center justify-center px-3 text-center text-xs font-black leading-5 text-text-faint">NO COVER</div>
          )}
        </div>

        <div className="flex min-w-0 flex-col">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <p className="inline-flex items-center gap-2 text-xs font-black uppercase tracking-[0.14em] text-accent-info">
                <BookOpen className="h-4 w-4" aria-hidden="true" />
                대표 추천
              </p>
              <h3 className="mt-3 line-clamp-3 text-[1.65rem] font-bold leading-tight text-text-primary">{book.title}</h3>
              <p className="mt-2 truncate text-base font-bold text-text-muted">{book.author}</p>
            </div>
            <ExternalLink className="h-5 w-5 shrink-0 text-accent-info transition group-hover:translate-x-0.5 group-hover:-translate-y-0.5" aria-hidden="true" />
          </div>

          <p className="mt-5 text-base font-semibold leading-7 text-text-muted">{reason}</p>
          <p className="mt-4 rounded-2xl border border-accent-info/20 bg-accent-info/10 px-4 py-3 text-sm font-black leading-6 text-text-primary">{actionCopy}</p>

          <BookLocation book={book} className="mt-4 grid gap-2 pt-1 text-sm font-bold text-text-muted" />
        </div>
      </a>
    );
  }

  return (
    <a
      href={href}
      target="_blank"
      rel="noreferrer"
      className="glass-card group grid min-h-[10.5rem] grid-cols-[4.75rem_minmax(0,1fr)] gap-4 rounded-3xl p-4 transition hover:border-accent-info/50 hover:bg-bg-card-hover/70"
    >
      <div className="aspect-[3/4] h-[8.5rem] overflow-hidden rounded-2xl border border-border bg-bg-card shadow-2xl shadow-black/20">
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
              <p className="text-xs font-black uppercase tracking-[0.14em] text-accent-info">함께 추천 #{index + 1}</p>
              <h3 className="mt-1 line-clamp-2 text-lg font-black leading-tight text-text-primary">{book.title}</h3>
              <p className="mt-1 truncate text-xs font-bold text-text-muted">{book.author}</p>
            </div>
            <ExternalLink className="h-4 w-4 shrink-0 text-accent-info transition group-hover:translate-x-0.5 group-hover:-translate-y-0.5" aria-hidden="true" />
          </div>

          <p className="mt-2 text-xs font-semibold leading-5 text-text-muted">{reason}</p>
          <BookLocation book={book} className="mt-auto flex flex-wrap gap-x-3 gap-y-1 pt-3 text-xs font-bold text-text-muted" />
        </div>
      </div>
    </a>
  );
}

function BookLocation({ book, className }: { book: BookRecommendation; className: string }) {
  return (
    <div className={className}>
      <p className="inline-flex min-w-0 items-center gap-2">
        <MapPin className="h-4 w-4 shrink-0 text-accent-info" aria-hidden="true" />
        <span className="truncate">{book.locationLabel}</span>
      </p>
      <p className="inline-flex min-w-0 items-center gap-2">
        <Tag className="h-4 w-4 shrink-0 text-accent-info" aria-hidden="true" />
        <span className="truncate">{book.callNumber}</span>
      </p>
    </div>
  );
}

function naverBookUrl(title: string, author: string) {
  return `https://search.shopping.naver.com/book/search?query=${encodeURIComponent(`${title} ${author}`.trim())}`;
}

function compactBookReason(input: string, maxLength: number) {
  const cleaned = input.replace(/\s+/g, " ").trim();
  if (cleaned.length <= maxLength) return cleaned;
  const nameLead = cleaned.match(/^(.{0,38}?님(?:에게|에게는|이))/)?.[1];
  if (nameLead) return nameLead.endsWith("이") ? `${nameLead} 읽기 좋은 책이에요.` : `${nameLead} 잘 맞는 책이에요.`;
  return compactBookCopy(cleaned, maxLength);
}

function compactBookCopy(input: string, maxLength: number) {
  const cleaned = input.replace(/\s+/g, " ").trim();
  if (cleaned.length <= maxLength) return cleaned;
  const clipped = cleaned.slice(0, maxLength);
  const stops = ["이에요.", "예요.", "해요.", "돼요.", "어요.", "아요.", ".", "!", "?"];
  const bestStop = stops.reduce((best, stop) => {
    const position = clipped.lastIndexOf(stop);
    return position > best ? position + stop.length : best;
  }, -1);

  if (bestStop > Math.floor(maxLength * 0.45)) return clipped.slice(0, bestStop).trim();
  const lastSpace = clipped.lastIndexOf(" ");
  if (lastSpace > Math.floor(maxLength * 0.45)) return clipped.slice(0, lastSpace).replace(/[,\s/·:;]+$/g, "").trim();
  return clipped.replace(/[,\s/·:;]+$/g, "").trim();
}
