import { Mascot } from "@/components/mascot/Mascot";
import { particle } from "@/lib/korean/name";
import type { LibraryAnalysisResult } from "@/types/session";

type ReadingTypeHeroProps = {
  result: LibraryAnalysisResult;
  displayName: string;
};

export function ReadingTypeHero({ result, displayName }: ReadingTypeHeroProps) {
  const name = displayName || "회원";

  return (
    <section className="grid gap-6 rounded-lg bg-library p-6 text-white md:grid-cols-[minmax(0,1fr)_12rem] md:p-8">
      <div>
        <p className="text-sm font-black text-white/75">{result.readingType.displayName}</p>
        <h1 className="mt-3 text-3xl font-black leading-tight md:text-5xl">{result.readingType.headline}</h1>
        <p className="mt-4 text-base font-semibold leading-7 text-white/80">
          {particle(name, "vocative")} 이건 그냥 책 추천이 아니라, 지금 {particle(name, "to")} 꽂히는 책장 처방전이야.
        </p>
        <p className="mt-3 text-base font-semibold leading-7 text-white/80">{result.readingType.description}</p>
      </div>
      <Mascot variant="result" size="md" className="self-center justify-self-center" />
    </section>
  );
}
