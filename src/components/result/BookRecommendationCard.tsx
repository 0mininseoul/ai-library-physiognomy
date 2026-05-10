import { ExternalLink, MapPin, Tag } from "lucide-react";
import type { BookRecommendation } from "@/types/session";

type BookRecommendationCardProps = {
  book: BookRecommendation;
  index: number;
};

export function BookRecommendationCard({ book, index }: BookRecommendationCardProps) {
  const href = book.naverBookUrl ?? naverBookUrl(book.title, book.author);
  const reason = compactBookReason(book.reason, 56);
  const actionCopy = compactBookCopy(book.actionCopy, 44);

  return (
    <a
      href={href}
      target="_blank"
      rel="noreferrer"
      className="glass-card group grid h-full min-h-[19.5rem] grid-rows-[8.5rem_minmax(0,1fr)] rounded-3xl p-4 transition hover:border-accent-info/50 hover:bg-bg-card-hover/70 lg:h-[20.25rem] lg:min-h-0 lg:grid-rows-[4.9rem_minmax(0,1fr)] lg:p-3"
    >
      <div className="mx-auto aspect-[3/4] h-full overflow-hidden rounded-2xl border border-border bg-bg-card shadow-2xl shadow-black/20 lg:rounded-xl">
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
              <h3 className="mt-2 line-clamp-2 text-xl font-black leading-tight text-text-primary lg:mt-1 lg:text-base lg:leading-5">{book.title}</h3>
              <p className="mt-1 truncate text-sm font-bold text-text-muted lg:text-xs">{book.author}</p>
            </div>
            <ExternalLink className="h-5 w-5 shrink-0 text-accent-info transition group-hover:translate-x-0.5 group-hover:-translate-y-0.5" aria-hidden="true" />
          </div>

          <p className="mt-3 text-sm font-semibold leading-6 text-text-muted lg:mt-2 lg:text-xs lg:leading-4">{reason}</p>
          <p className="mt-3 rounded-xl border border-accent-info/20 bg-accent-info/10 px-4 py-3 text-sm font-black leading-6 text-text-primary lg:mt-2 lg:px-3 lg:py-2 lg:text-xs lg:leading-4">{actionCopy}</p>

          <div className="mt-auto grid gap-2 pt-4 text-sm font-bold text-text-muted lg:flex lg:flex-wrap lg:gap-x-3 lg:gap-y-1 lg:pt-2 lg:text-xs">
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
