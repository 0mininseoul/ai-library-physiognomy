import Link from "next/link";
import { RotateCcw } from "lucide-react";
import { honorific } from "@/lib/korean/name";
import type { LibraryAnalysisResult } from "@/types/session";

type ReadingTypeHeroProps = {
  result: LibraryAnalysisResult;
  displayName: string;
};

export function ReadingTypeHero({ result, displayName }: ReadingTypeHeroProps) {
  const name = honorific(displayName);
  const headline = result.mainCopy || result.readingType.headline || `${name} 관상 리포트`;

  return (
    <section className="glass-panel relative overflow-hidden rounded-2xl p-5 md:p-7">
      <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-accent-info/60 to-transparent" />
      <div className="flex flex-col justify-between gap-5 md:flex-row md:items-start">
        <div className="min-w-0">
          <p className="text-xs font-black uppercase tracking-[0.18em] text-accent-info">AI 관상가 고양이</p>
          <h1 className="mt-3 overflow-hidden text-ellipsis whitespace-nowrap text-[clamp(1.8rem,4.3vw,4.4rem)] font-black leading-none text-text-primary">
            {headline}
          </h1>
          <p className="mt-4 max-w-3xl text-sm font-semibold leading-6 text-text-muted md:text-base">
            {name}의 얼굴 비율, 이목구비 신호, 사주 리듬을 엮어 만든 관상 리포트입니다.
          </p>
          <div className="mt-4 flex flex-wrap gap-2">
            {(result.physiognomy?.keywords ?? [result.readingType.displayName]).slice(0, 5).map((keyword) => (
              <span key={keyword} className="rounded-full border border-accent-info/25 bg-accent-info/10 px-3 py-1 text-xs font-black text-accent-info">
                {keyword}
              </span>
            ))}
          </div>
        </div>

        <Link
          href="/"
          className="inline-flex h-11 shrink-0 items-center justify-center gap-2 rounded-lg border border-border bg-bg-card/70 px-4 text-sm font-black text-text-primary transition hover:border-border-bright hover:bg-bg-card-hover"
        >
          <RotateCcw className="h-4 w-4" aria-hidden="true" />
          다시 분석하기
        </Link>
      </div>
    </section>
  );
}
