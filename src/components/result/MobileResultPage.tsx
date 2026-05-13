"use client";

import type { ReactNode } from "react";
import { Compass, Sparkles } from "lucide-react";
import { BookRecommendationCard } from "@/components/result/BookRecommendationCard";
import { ShareableTypeCard } from "@/components/result/ShareableTypeCard";
import { getResultFirstSectionCopy } from "@/lib/reading-types/resultFirstSectionCopy";
import type { ResultPayload } from "@/components/pages/ResultPage";

export function MobileResultPage({ payload }: { payload: ResultPayload }) {
  const { displayName, result } = payload;
  const typeMeta = getResultFirstSectionCopy(result.readingType.code);

  return (
    <main className="min-h-screen bg-bg-primary text-text-primary">
      <header className="px-5 py-4">
        <p className="text-[0.65rem] font-black uppercase tracking-[0.2em] text-text-faint">AI 관상가 고양이</p>
      </header>

      <section className="px-5">
        <ShareableTypeCard displayName={displayName} typeName={typeMeta.displayName} headline={typeMeta.headlineTemplate} />
      </section>

      <section className="mt-8 px-5">
        <h2 className="text-lg font-black text-text-primary">지금 읽기 좋은 책 3권</h2>
        <p className="mt-1 text-sm font-semibold text-text-muted">청구기호와 자료실은 도서관에서 책을 바로 찾는 단서예요.</p>
        <div className="mt-4 grid gap-4">
          {result.recommendations.slice(0, 3).map((book, index) => (
            <BookRecommendationCard key={`${book.bookId}-${index}`} book={book} index={index} variant="mobile" />
          ))}
        </div>
      </section>

      <section className="mt-8 px-5">
        <div className="grid gap-3">
          <MobileInsightCard
            eyebrow="FACE SIGNAL"
            title="관상 분석"
            icon={<Sparkles className="h-4 w-4" aria-hidden="true" />}
            summary={result.physiognomySummary || result.physiognomy.summary}
            chips={result.physiognomy.strengths.slice(0, 2)}
            note={result.physiognomy.cautions[0]}
          />
          <MobileInsightCard
            eyebrow="RHYTHM"
            title="사주 분석"
            icon={<Compass className="h-4 w-4" aria-hidden="true" />}
            summary={result.saju.currentFlow || result.sajuSummary}
            chips={result.saju.keywords.slice(0, 3)}
            note={result.saju.advice}
          />
        </div>
      </section>

      {result.innerStyleInsight ? (
        <section className="mt-8 px-5">
          <h2 className="text-lg font-black text-text-primary">{displayName}님의 성향</h2>
          <div className="mt-4 space-y-3">
            <article className="rounded-2xl border border-border/60 bg-bg-card/60 p-4">
              <p className="text-xs font-black uppercase tracking-[0.16em] text-accent-info">가장 또렷한 성향</p>
              <h3 className="mt-2 text-xl font-bold">{result.innerStyleInsight.dominantLabel}</h3>
              <p className="mt-2 text-sm leading-6 text-text-muted">{result.innerStyleInsight.dominantDetail}</p>
            </article>
            <article className="rounded-2xl border border-border/60 bg-bg-card/60 p-4">
              <p className="text-xs font-black uppercase tracking-[0.16em] text-accent-info">보완하면 좋은 성향</p>
              <h3 className="mt-2 text-xl font-bold">{result.innerStyleInsight.growthLabel}</h3>
              <p className="mt-2 text-sm leading-6 text-text-muted">{result.innerStyleInsight.growthAction}</p>
            </article>
          </div>
        </section>
      ) : null}

      {result.chemiInsight ? (
        <section className="mt-8 px-5">
          <h2 className="text-lg font-black text-text-primary">잘 맞는 사람</h2>
          <article className="mt-4 rounded-2xl border border-border/60 bg-bg-card/60 p-4">
            <h3 className="text-xl font-bold">{result.chemiInsight.typeLabel}</h3>
            <p className="mt-2 text-sm leading-6 text-text-muted">{result.chemiInsight.why}</p>
          </article>
        </section>
      ) : null}
    </main>
  );
}

function MobileInsightCard({
  eyebrow,
  title,
  icon,
  summary,
  chips,
  note,
}: {
  eyebrow: string;
  title: string;
  icon: ReactNode;
  summary: string;
  chips: string[];
  note?: string;
}) {
  return (
    <article className="rounded-2xl border border-border/60 bg-bg-card/64 p-4 shadow-glass">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-[0.65rem] font-black uppercase tracking-[0.16em] text-accent-info">{eyebrow}</p>
          <h2 className="mt-1 text-lg font-black leading-tight text-text-primary">{title}</h2>
        </div>
        <span className="grid h-8 w-8 shrink-0 place-items-center rounded-lg border border-accent-info/25 bg-accent-info/[0.12] text-accent-info">{icon}</span>
      </div>
      <p className="mt-3 text-sm font-semibold leading-6 text-text-muted">{summary}</p>
      {chips.length ? (
        <div className="mt-3 flex flex-wrap gap-1.5">
          {chips.map((chip) => (
            <span key={chip} className="rounded-full border border-border/70 bg-bg-raised/60 px-2.5 py-1 text-[0.7rem] font-black text-text-primary">
              {chip}
            </span>
          ))}
        </div>
      ) : null}
      {note ? <p className="mt-3 border-t border-border/55 pt-3 text-xs font-semibold leading-5 text-text-faint">{note}</p> : null}
    </article>
  );
}
