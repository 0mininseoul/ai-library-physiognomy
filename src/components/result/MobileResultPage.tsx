"use client";

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

      <footer className="mt-12 px-5 pb-12 text-center text-xs font-medium text-text-faint">본 분석은 흥미용 해석이에요.</footer>
    </main>
  );
}
