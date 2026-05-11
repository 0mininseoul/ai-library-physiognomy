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
  const reason = compactBookReason(book.reason, featured ? 118 : 72);
  const fitReason = compactBookReason(book.fitReason ?? book.reason, featured ? 118 : 70);
  const readingMoment = compactBookCopy(book.readingMoment ?? book.actionCopy, featured ? 82 : 48);
  const actionCopy = compactBookCopy(book.actionCopy, featured ? 76 : 44);

  if (featured) {
    return (
      <a
        href={href}
        target="_blank"
        rel="noreferrer"
        className="glass-card group grid min-h-[18.5rem] grid-cols-[10.75rem_minmax(0,1fr)] gap-5 overflow-hidden rounded-3xl p-5 transition hover:border-accent-info/50 hover:bg-bg-card-hover/70"
      >
        <div className="h-[16rem] w-full overflow-hidden rounded-2xl border border-border bg-bg-card shadow-2xl shadow-black/20">
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
              <p className="inline-flex items-center gap-2 rounded-full border border-accent-info/20 bg-accent-info/[0.08] px-3 py-1.5 text-xs font-black uppercase tracking-[0.12em] text-accent-info">
                <BookOpen className="h-4 w-4" aria-hidden="true" />
                대표 추천
              </p>
              <h3 className="mt-3 line-clamp-2 text-[1.35rem] font-semibold leading-tight text-text-primary">{book.title}</h3>
              <p className="mt-2 truncate text-base font-bold text-text-muted">{book.author}</p>
            </div>
            <span className="grid h-10 w-10 shrink-0 place-items-center rounded-full border border-border bg-bg-card/62 text-accent-info shadow-glass transition group-hover:translate-x-0.5 group-hover:-translate-y-0.5">
              <ExternalLink className="h-4 w-4" aria-hidden="true" />
            </span>
          </div>

          <div className="mt-4 grid gap-2.5">
            <BookReasonBlock label="왜 이 책인지" text={fitReason || reason} />
            <BookReasonBlock label="읽기 좋은 순간" text={readingMoment || actionCopy} compact />
          </div>

          <BookLocation book={book} className="mt-auto flex flex-wrap gap-2 pt-4 text-xs font-bold text-text-muted" />
        </div>
      </a>
    );
  }

  return (
    <a
      href={href}
      target="_blank"
      rel="noreferrer"
      className="glass-card group grid min-h-[11.25rem] grid-cols-[6.25rem_minmax(0,1fr)] gap-4 overflow-hidden rounded-3xl p-4 transition hover:border-accent-info/50 hover:bg-bg-card-hover/70"
    >
      <div className="h-[9.25rem] w-full overflow-hidden rounded-2xl border border-border bg-bg-card shadow-2xl shadow-black/20">
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
              <h3 className="mt-1 text-[0.95rem] font-semibold leading-5 text-text-primary">{book.title}</h3>
              <p className="mt-1 truncate text-xs font-bold text-text-muted">{book.author}</p>
            </div>
            <ExternalLink className="h-4 w-4 shrink-0 text-accent-info transition group-hover:translate-x-0.5 group-hover:-translate-y-0.5" aria-hidden="true" />
          </div>

          <p className="mt-2 line-clamp-2 text-xs font-semibold leading-5 text-text-muted">{fitReason || reason}</p>
          <BookLocation book={book} className="mt-auto flex flex-wrap gap-x-3 gap-y-1 pt-3 text-xs font-bold text-text-muted" />
        </div>
      </div>
    </a>
  );
}

function BookReasonBlock({ label, text, compact = false }: { label: string; text: string; compact?: boolean }) {
  return (
    <div className="rounded-2xl border border-border/70 bg-bg-card/52 px-4 py-3 shadow-[inset_0_1px_0_rgb(255_255_255_/_0.26)]">
      <p className="text-[0.68rem] font-black uppercase tracking-[0.12em] text-accent-info">{label}</p>
      <p className={[compact ? "mt-1 line-clamp-2 text-[0.85rem] leading-6" : "mt-2 line-clamp-3 text-[0.9rem] leading-6", "font-bold text-text-muted"].join(" ")}>{text}</p>
    </div>
  );
}

function BookLocation({ book, className }: { book: BookRecommendation; className: string }) {
  return (
    <div className={className}>
      <p className="inline-flex min-w-0 items-center gap-2 rounded-full border border-border/65 bg-bg-card/48 px-3 py-2">
        <MapPin className="h-4 w-4 shrink-0 text-accent-info" aria-hidden="true" />
        <span className="truncate">{book.locationLabel}</span>
      </p>
      <p className="inline-flex min-w-0 items-center gap-2 rounded-full border border-border/65 bg-bg-card/48 px-3 py-2">
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
