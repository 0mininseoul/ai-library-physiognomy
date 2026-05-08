import { BookOpenCheck, MapPin, Tag } from "lucide-react";
import type { BookRecommendation } from "@/types/session";

type BookRecommendationCardProps = {
  book: BookRecommendation;
  index: number;
  displayName: string;
};

export function BookRecommendationCard({ book, index, displayName }: BookRecommendationCardProps) {
  const name = displayName || "회원";

  return (
    <article className="rounded-lg border border-ink/10 bg-white p-5 shadow-sm">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-xs font-black text-library">{name} 맞춤 처방 #{index + 1}</p>
          <h3 className="mt-2 text-xl font-black leading-tight text-ink">{book.title}</h3>
          <p className="mt-1 text-sm font-bold text-ink/60">{book.author}</p>
        </div>
        <BookOpenCheck className="h-6 w-6 shrink-0 text-prescription" aria-hidden="true" />
      </div>

      <p className="mt-4 text-sm font-bold leading-6 text-ink/75">{book.reason}</p>
      <p className="mt-3 rounded-lg bg-[#f4f7f1] px-4 py-3 text-sm font-black leading-6 text-library">{book.actionCopy}</p>

      <div className="mt-4 grid gap-2 text-sm font-bold text-ink/70 sm:grid-cols-2">
        <p className="inline-flex items-center gap-2">
          <MapPin className="h-4 w-4 text-library" aria-hidden="true" />
          {book.locationLabel}
        </p>
        <p className="inline-flex items-center gap-2">
          <Tag className="h-4 w-4 text-library" aria-hidden="true" />
          {book.callNumber}
        </p>
      </div>
    </article>
  );
}
