"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Loader2, RefreshCw } from "lucide-react";
import { BookRecommendationCard } from "@/components/result/BookRecommendationCard";
import { FaceImage } from "@/components/result/FaceImage";
import { ReadingTypeHero } from "@/components/result/ReadingTypeHero";
import { Mascot } from "@/components/mascot/Mascot";
import { particle } from "@/lib/korean/name";
import type { LibraryAnalysisResult } from "@/types/session";

export type ResultPayload = {
  id: string;
  createdAt: string;
  displayName: string;
  result: LibraryAnalysisResult;
  faceImageUrl: string | null;
};

export function ResultPage({ sessionId }: { sessionId: string }) {
  const [payload, setPayload] = useState<ResultPayload | null>(null);
  const [status, setStatus] = useState<"loading" | "ready" | "error">("loading");

  useEffect(() => {
    let cancelled = false;
    setStatus("loading");

    fetch(`/api/result/${sessionId}`)
      .then(async (res) => {
        if (!res.ok) throw new Error("not_found");
        return (await res.json()) as ResultPayload;
      })
      .then((nextPayload) => {
        if (cancelled) return;
        setPayload(nextPayload);
        setStatus("ready");
      })
      .catch(() => {
        if (cancelled) return;
        setStatus("error");
      });

    return () => {
      cancelled = true;
    };
  }, [sessionId]);

  if (status === "loading") {
    return (
      <main className="flex min-h-screen items-center justify-center bg-paper px-5 text-ink">
        <div className="text-center">
          <Loader2 className="mx-auto h-9 w-9 animate-spin text-library" aria-hidden="true" />
          <p className="mt-4 text-lg font-black">고양이 처방전 불러오는 중</p>
        </div>
      </main>
    );
  }

  if (status === "error" || !payload) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-paper px-5 text-ink">
        <section className="max-w-md rounded-lg border border-ink/10 bg-white p-6 text-center shadow-sm">
          <Mascot variant="retry" size="md" />
          <h1 className="mt-4 text-2xl font-black">결과를 찾지 못했어</h1>
          <p className="mt-3 text-sm font-bold leading-6 text-ink/60">학번과 생년월일로 다시 찾아보면 최근 처방전을 불러올 수 있어.</p>
          <Link
            href="/lookup"
            className="mt-5 inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-lg bg-library px-5 text-sm font-bold text-white transition hover:bg-library/90"
          >
            <RefreshCw className="h-5 w-5" aria-hidden="true" />
            결과 다시 찾기
          </Link>
        </section>
      </main>
    );
  }

  return <ResultContent payload={payload} />;
}

export function ResultContent({ payload }: { payload: ResultPayload }) {
  const { displayName, result, faceImageUrl } = payload;

  return (
    <main className="min-h-screen bg-paper text-ink">
      <div className="mx-auto grid w-full max-w-5xl gap-6 px-5 py-8 md:px-8">
        <ReadingTypeHero result={result} displayName={displayName} />
        <FaceImage displayName={displayName} faceImageUrl={faceImageUrl} />

        <section className="rounded-lg border border-ink/10 bg-white p-5 shadow-sm md:p-6">
          <p className="text-sm font-black text-prescription">관상 분석 결과</p>
          <h2 className="mt-2 text-2xl font-black text-ink">{displayName} 얼굴에서 읽은 책장 신호</h2>
          <p className="mt-4 text-base font-semibold leading-7 text-ink/75">{result.physiognomySummary}</p>
        </section>

        <section className="rounded-lg border border-ink/10 bg-white p-5 shadow-sm md:p-6">
          <p className="text-sm font-black text-prescription">사주 리듬 분석</p>
          <h2 className="mt-2 text-2xl font-black text-ink">요즘 {particle(displayName, "topic")} 이런 책이 잘 맞음</h2>
          <p className="mt-4 text-base font-semibold leading-7 text-ink/75">{result.sajuSummary}</p>
        </section>

        <section className="rounded-lg border border-library/20 bg-[#f4f7f1] p-5 md:p-6">
          <p className="text-sm font-black text-prescription">지금 필요한 것</p>
          <h2 className="mt-2 text-2xl font-black text-ink">지금 {particle(displayName, "to")} 필요한 책장 처방</h2>
          <ul className="mt-5 grid gap-3">
            {result.readingNeeds.map((need) => (
              <li key={need} className="rounded-lg bg-white px-4 py-3 text-sm font-black leading-6 text-library">
                {need}
              </li>
            ))}
          </ul>
        </section>

        <section>
          <p className="text-sm font-black text-prescription">대출 추천 리스트</p>
          <h2 className="mt-2 text-3xl font-black text-ink">지금 {particle(displayName, "to")} 필요한 책</h2>
          <div className="mt-5 grid gap-4">
            {result.recommendations.map((book, index) => (
              <BookRecommendationCard key={`${book.bookId}-${index}`} book={book} index={index} displayName={displayName} />
            ))}
          </div>
        </section>
      </div>
    </main>
  );
}
