"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import type { ReactNode, WheelEvent } from "react";
import Link from "next/link";
import { CameraOff, ChevronLeft, ChevronRight, Gauge, HeartHandshake, Loader2, RefreshCw, RotateCcw, ShieldCheck } from "lucide-react";
import { BrandLogo } from "@/components/brand/BrandLogo";
import { BookRecommendationCard } from "@/components/result/BookRecommendationCard";
import { ThemeToggle } from "@/components/theme/ThemeToggle";
import { honorific, softenFormalPolite } from "@/lib/korean/name";
import type { SajuCalculation, SajuElement } from "@/lib/saju/calculator";
import { stripHanja } from "@/lib/saju/display";
import type { LibraryAnalysisResult } from "@/types/session";

const RESULT_SECTION_COUNT = 5;
const WHEEL_STEP_THRESHOLD = 42;

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
      <main className="grid min-h-screen place-items-center bg-bg-primary px-5 text-text-primary">
        <div className="text-center">
          <Loader2 className="mx-auto h-9 w-9 animate-spin text-accent-info" aria-hidden="true" />
          <p className="mt-4 text-lg font-black">관상 리포트를 불러오고 있어요</p>
        </div>
      </main>
    );
  }

  if (status === "error" || !payload) {
    return (
      <main className="grid min-h-screen place-items-center bg-bg-primary px-5 text-text-primary">
        <section className="glass-panel max-w-md rounded-2xl p-6 text-center">
          <h1 className="text-2xl font-black">결과를 찾지 못했어요</h1>
          <p className="mt-3 text-sm font-bold leading-6 text-text-muted">학번과 입력 정보로 다시 찾아보시거나 새 분석을 시작해 주세요.</p>
          <div className="mt-5 grid gap-2 sm:grid-cols-2">
            <Link href="/lookup" className="inline-flex min-h-12 items-center justify-center gap-2 rounded-lg border border-border bg-bg-card px-5 text-sm font-bold text-text-primary transition hover:bg-bg-card-hover">
              <RefreshCw className="h-5 w-5" aria-hidden="true" />
              결과 다시 찾기
            </Link>
            <Link href="/" className="inline-flex min-h-12 items-center justify-center gap-2 rounded-lg border border-accent-info/35 bg-accent-info/15 px-5 text-sm font-bold text-text-primary transition hover:bg-accent-info/25">
              <RotateCcw className="h-5 w-5" aria-hidden="true" />
              다시 분석하기
            </Link>
          </div>
        </section>
      </main>
    );
  }

  return <ResultContent payload={payload} />;
}

export function ResultContent({ payload }: { payload: ResultPayload }) {
  const { displayName, faceImageUrl } = payload;
  const result = useMemo(() => withResultFallback(payload.result), [payload.result]);
  const name = honorific(displayName);
  const calculation = result.saju.calculation;
  const rhythmItems = rhythmSignalItems(calculation);
  const innerStyle = innerStyleProfile(result, rhythmItems);
  const matchProfile = buildMatchProfile(result, innerStyle.strong);
  const topScore = topScoreItem(result.scores);
  const topScores = topScoreItems(result.scores, 4);
  const [activeSection, setActiveSection] = useState(0);
  const faceSignals = useMemo(() => buildFaceSignals(result), [result]);

  const goToSection = (index: number) => {
    setActiveSection(clampInt(index, 0, RESULT_SECTION_COUNT - 1));
  };
  const goBy = useCallback((delta: number) => {
    setActiveSection((current) => clampInt(current + delta, 0, RESULT_SECTION_COUNT - 1));
  }, []);
  const handleWheel = useCallback(
    (event: WheelEvent<HTMLElement>) => {
      const primaryDelta = Math.abs(event.deltaX) > Math.abs(event.deltaY) ? event.deltaX : event.deltaY;
      if (Math.abs(primaryDelta) < WHEEL_STEP_THRESHOLD) return;
      event.preventDefault();
      goBy(primaryDelta > 0 ? 1 : -1);
    },
    [goBy],
  );

  return (
    <main data-testid="result-horizontal-shell" className="result-shell relative h-screen overflow-hidden bg-bg-primary text-text-primary" onWheel={handleWheel}>
      <header className="fixed left-0 right-0 top-0 z-40 border-b border-border bg-bg-card/78 px-8 py-4 shadow-glass backdrop-blur-2xl">
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-4">
          <div className="flex min-w-0 items-center gap-3 text-sm font-black tracking-[0.04em] text-text-muted md:text-base">
            <span className="grid h-9 w-9 shrink-0 place-items-center rounded-xl border border-border bg-bg-card/70 shadow-glass">
              <BrandLogo className="h-8 w-8 object-contain" />
            </span>
            <span className="truncate uppercase">AI 관상가 고양이 / Live Result</span>
          </div>
          <div className="flex items-center gap-2">
            <ThemeToggle />
            <Link href="/" className="inline-flex h-11 shrink-0 items-center justify-center gap-2 rounded-xl border border-border bg-bg-card/70 px-4 text-sm font-black text-text-primary shadow-glass transition hover:border-border-bright hover:bg-bg-card-hover">
              <RotateCcw className="h-4 w-4" aria-hidden="true" />
              다시 분석하기
            </Link>
          </div>
        </div>
      </header>

      <div
        data-testid="result-horizontal-track"
        className="flex h-screen transition-transform duration-700 ease-[cubic-bezier(0.22,1,0.36,1)]"
        style={{ transform: `translateX(-${activeSection * 100}vw)` }}
      >
        <StorySection active={activeSection === 0} index={0} eyebrow="FACE REVEAL" title={`야옹이가 본 ${name}의 얼굴`} lines={sectionLines(result, "faceReveal", buildOpeningSummaryLines(result))}>
          <div className="grid min-h-0 grid-cols-[28rem_minmax(0,1fr)] items-stretch gap-7">
            <RevealItem active={activeSection === 0} delay={120} className="min-h-0">
              <ResultFacePanel displayName={displayName} faceImageUrl={faceImageUrl} />
            </RevealItem>

            <div className="grid min-h-0 gap-4">
              <RevealItem active={activeSection === 0} delay={220} className="min-h-0">
                <SummaryCard title="TYPE" value={cleanCopy(result.readingType.displayName)} description={cleanCopy(result.readingType.description)} chips={result.physiognomy.keywords.slice(0, 4)}>
                  <TypeSupportBlocks name={name} topScore={topScore} />
                </SummaryCard>
              </RevealItem>
            </div>
          </div>
        </StorySection>

        <StorySection active={activeSection === 1} index={1} eyebrow="FACE SIGNAL" title={`야옹이가 본 ${name}의 얼굴 신호`} lines={sectionLines(result, "faceSignal", buildFaceSignalSummaryLines(result, topScore))}>
          <div className="grid min-h-0 gap-5 lg:grid-cols-[0.86fr_1.14fr]">
            <RevealItem active={activeSection === 1} delay={120}>
              <ImpressionScorePanel scores={topScores} />
            </RevealItem>
            <RevealItem active={activeSection === 1} delay={220}>
              <div className="grid h-full min-h-0 gap-3">
                {faceSignals.slice(0, 3).map((signal) => (
                  <SignalCard key={signal.title} title={signal.title} kicker={signal.kicker} text={signal.text} compact />
                ))}
              </div>
            </RevealItem>
          </div>
        </StorySection>

        <StorySection active={activeSection === 2} index={2} eyebrow="INNER STYLE" title={`${name}은 ${innerStyle.strong.title}`} lines={sectionLines(result, "innerStyle", buildInnerStyleSummaryLines(innerStyle))}>
          <div className="grid min-h-0 gap-5 lg:grid-cols-[1fr_1fr]">
            <RevealItem active={activeSection === 2} delay={120}>
              <InnerStyleCard tone="strong" title="가장 또렷한 성향" item={innerStyle.strong} />
            </RevealItem>
            <RevealItem active={activeSection === 2} delay={220}>
              <InnerStyleCard tone="support" title="보완하면 좋은 성향" item={innerStyle.support} />
            </RevealItem>
          </div>
        </StorySection>

        <StorySection active={activeSection === 3} index={3} eyebrow="CHEMI MATCH" title={`${name}은 이런 사람과 흐름이 좋아요`} lines={sectionLines(result, "chemiMatch", [matchProfile.summary, matchProfile.caution])}>
          <RevealItem active={activeSection === 3} delay={140}>
            <MatchFocusCard match={matchProfile} />
          </RevealItem>
        </StorySection>

        <StorySection active={activeSection === 4} index={4} eyebrow="BOOK CURATION" title={`지금 ${name}에게 필요한 책이에요`} lines={sectionLines(result, "bookCuration", buildBookSectionLines(result))} id="books">
          <RevealItem active={activeSection === 4} delay={140}>
            <BookCurationSection result={result} />
          </RevealItem>
        </StorySection>
      </div>

      <button
        type="button"
        className="fixed left-10 top-1/2 z-40 grid h-10 w-10 -translate-y-1/2 place-items-center rounded-full border border-border bg-bg-card/65 text-text-primary shadow-glass backdrop-blur-2xl transition hover:border-border-bright disabled:cursor-not-allowed disabled:opacity-35"
        aria-label="이전 섹션"
        disabled={activeSection === 0}
        onClick={() => goBy(-1)}
      >
        <ChevronLeft className="h-5 w-5" aria-hidden="true" />
      </button>
      <button
        type="button"
        className="fixed right-10 top-1/2 z-40 grid h-10 w-10 -translate-y-1/2 place-items-center rounded-full border border-border bg-bg-card/65 text-text-primary shadow-glass backdrop-blur-2xl transition hover:border-border-bright disabled:cursor-not-allowed disabled:opacity-35"
        aria-label="다음 섹션"
        disabled={activeSection === RESULT_SECTION_COUNT - 1}
        onClick={() => goBy(1)}
      >
        <ChevronRight className="h-5 w-5" aria-hidden="true" />
      </button>

      <nav className="fixed bottom-5 left-1/2 z-40 flex -translate-x-1/2 items-center gap-2 rounded-full border border-border bg-bg-card/75 px-3 py-2 shadow-glass backdrop-blur-2xl" aria-label="결과 섹션">
        {Array.from({ length: RESULT_SECTION_COUNT }, (_, index) => (
          <button
            key={index}
            type="button"
            className={["h-2.5 rounded-full transition-all", activeSection === index ? "w-8 bg-accent-info" : "w-2.5 bg-bg-raised hover:bg-text-faint"].join(" ")}
            aria-label={`${index + 1}번째 섹션 보기`}
            aria-current={activeSection === index ? "step" : undefined}
            onClick={() => goToSection(index)}
          />
        ))}
      </nav>

      {activeSection === RESULT_SECTION_COUNT - 1 ? (
        <footer className="fixed right-8 top-24 z-40 max-w-md rounded-xl border border-border bg-bg-card/75 px-4 py-3 text-xs font-bold leading-5 text-text-faint shadow-glass backdrop-blur-2xl">
          <span className="inline-flex items-center gap-2">
            <ShieldCheck className="h-4 w-4 text-accent-info" aria-hidden="true" />본 분석은 흥미용 해석이며, 의학적 소견이나 절대 평가가 아니에요.
          </span>
        </footer>
      ) : null}
    </main>
  );
}

function ResultFacePanel({ displayName, faceImageUrl }: { displayName: string; faceImageUrl: string | null }) {
  const name = honorific(displayName);
  const [imageFailed, setImageFailed] = useState(false);
  const [retryNonce, setRetryNonce] = useState(0);
  const shouldShowImage = Boolean(faceImageUrl && !imageFailed);
  const imageSrc = faceImageUrl && retryNonce > 0 ? `${faceImageUrl}${faceImageUrl.includes("?") ? "&" : "?"}retry=${retryNonce}` : faceImageUrl;

  return (
    <div className="glass-card relative mx-auto flex h-full min-h-[25rem] w-full overflow-hidden rounded-[1.75rem]">
      {shouldShowImage ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={imageSrc ?? ""}
          alt={`${name} 얼굴 분석 이미지`}
          className="h-full w-full object-cover"
          onError={() => {
            if (retryNonce === 0) {
              setRetryNonce(1);
              return;
            }
            setImageFailed(true);
          }}
        />
      ) : faceImageUrl ? (
        <div className="flex h-full w-full flex-col items-center justify-center gap-4 px-6 text-center">
          <CameraOff className="h-10 w-10 text-accent-info" aria-hidden="true" />
          <p className="max-w-[14rem] text-base font-black leading-7 text-text-primary">이미지를 다시 불러오고 있어요.</p>
          <button
            type="button"
            className="text-sm font-bold text-accent-info underline underline-offset-4"
            onClick={() => {
              setImageFailed(false);
              setRetryNonce((value) => value + 1);
            }}
          >
            한 번 더 불러오기
          </button>
        </div>
      ) : (
        <div className="flex h-full w-full flex-col items-center justify-center gap-4 px-6 text-center">
          <CameraOff className="h-10 w-10 text-accent-info" aria-hidden="true" />
          <p className="max-w-[14rem] text-base font-black leading-7 text-text-primary">얼굴 이미지는 24시간 이후 삭제되었어요.</p>
        </div>
      )}
    </div>
  );
}

function StorySection({ active, index, eyebrow, title, lines, id, children }: { active: boolean; index: number; eyebrow: string; title: string; lines: string[]; id?: string; children: ReactNode }) {
  const streamedLines = useTypewriterLines(lines, index, active);
  const readableLines = useMemo(() => streamedLines.flatMap(splitReadableSentences), [streamedLines]);

  return (
    <section id={id} className="scanline relative h-screen w-screen shrink-0 overflow-hidden px-28 pb-20 pt-28">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_80%_16%,rgb(var(--accent-info-rgb)_/_0.12),transparent_28rem),radial-gradient(circle_at_10%_90%,rgb(255_255_255_/_0.055),transparent_26rem),linear-gradient(180deg,rgb(255_255_255_/_0.035),transparent_18rem)]" />
      <div className="relative z-10 mx-auto grid h-full max-w-7xl grid-rows-[auto_minmax(0,1fr)] content-start gap-5">
        <div className="max-w-6xl">
          <p className="text-xs font-black uppercase tracking-[0.18em] text-accent-info">{eyebrow}</p>
          {index === 0 ? (
            <h1 className="mt-3 max-w-[72rem] text-5xl font-bold leading-[1.08] text-text-primary lg:text-[3.75rem] xl:text-[4rem]">{title}</h1>
          ) : (
            <h2 className="mt-3 max-w-[72rem] text-5xl font-bold leading-[1.1] text-text-primary lg:text-[3.45rem] xl:text-[3.75rem]">{title}</h2>
          )}
          {readableLines.length > 0 ? (
            <div className="mt-6 min-h-[5.7rem] max-w-5xl overflow-hidden border-l-2 border-accent-info/55 bg-gradient-to-r from-bg-card/62 via-bg-card/38 to-transparent py-2 pl-5 pr-5" aria-live="polite">
              {readableLines.map((line, lineIndex) => (
                <p key={`${index}-${lineIndex}`} className="text-sm font-semibold leading-7 text-text-muted md:text-[0.98rem]">
                  {line}
                </p>
              ))}
            </div>
          ) : null}
        </div>
        <div
          className={[
            "grid min-h-0 content-start gap-4 transition duration-700 ease-[cubic-bezier(0.22,1,0.36,1)] motion-reduce:transform-none motion-reduce:transition-none",
            active ? "translate-y-0 opacity-100" : "translate-y-7 opacity-0",
          ].join(" ")}
          style={{ transitionDelay: active ? "150ms" : "0ms" }}
        >
          {children}
        </div>
      </div>
    </section>
  );
}

function RevealItem({ active, delay = 0, className = "", children }: { active: boolean; delay?: number; className?: string; children: ReactNode }) {
  return (
    <div
      className={[
        "h-full transition duration-700 ease-[cubic-bezier(0.22,1,0.36,1)] motion-reduce:transform-none motion-reduce:transition-none",
        active ? "translate-y-0 opacity-100" : "translate-y-8 opacity-0",
        className,
      ].join(" ")}
      style={{ transitionDelay: active ? `${delay}ms` : "0ms" }}
    >
      {children}
    </div>
  );
}

function SummaryCard({ title, value, description, chips = [], children }: { title: string; value: string; description?: string; chips?: string[]; children?: ReactNode }) {
  return (
    <article className="glass-card flex h-full min-h-[25rem] rounded-3xl p-7">
      <div className="flex h-full w-full flex-col">
        <p className="text-xs font-black tracking-[0.16em] text-accent-info">{title}</p>
        <h2 className="mt-2 text-4xl font-bold text-text-primary">{value}</h2>
        {chips.length ? <ChipList items={chips} className="mt-5" /> : null}
        {description ? <p className="mt-5 max-w-3xl border-t border-border/55 pt-4 text-base font-bold leading-7 text-text-muted">{description}</p> : null}
        {children ? <div className="mt-auto pt-5">{children}</div> : null}
      </div>
    </article>
  );
}

function TypeSupportBlocks({ name, topScore }: { name: string; topScore: { label: string; value: number } }) {
  return (
    <div className="grid gap-3 md:grid-cols-2">
      <div className="rounded-2xl border border-border/55 bg-bg-card/45 px-4 py-3">
        <p className="text-xs font-black tracking-[0.14em] text-accent-info">첫인상 키워드</p>
        <p className="mt-2 text-sm font-bold leading-6 text-text-muted">처음에는 안정감이 먼저 보이고, 곧바로 집중력 있는 분위기가 따라와요.</p>
      </div>
      <div className="rounded-2xl border border-border/55 bg-bg-card/45 px-4 py-3">
        <p className="text-xs font-black tracking-[0.14em] text-accent-info">야옹이 코멘트</p>
        <p className="mt-2 text-sm font-bold leading-6 text-text-muted">
          {name}은 {topScore.label} 신호가 또렷해서 첫 화면부터 믿음직하게 읽혀요.
        </p>
      </div>
    </div>
  );
}

function SignalCard({ title, kicker, text, compact = false }: { title: string; kicker: string; text: string; compact?: boolean }) {
  return (
    <article className={["glass-card rounded-3xl p-5", compact ? "min-h-[7.25rem]" : "min-h-48"].join(" ")}>
      <p className="text-xs font-black uppercase tracking-[0.14em] text-accent-info">{kicker}</p>
      <h3 className={["font-black text-text-primary", compact ? "mt-2 text-xl" : "mt-3 text-2xl"].join(" ")}>{title}</h3>
      <p className={["text-sm font-bold text-text-muted", compact ? "mt-2 leading-5" : "mt-4 leading-6"].join(" ")}>{text}</p>
    </article>
  );
}

function ImpressionScorePanel({ scores }: { scores: Array<{ label: string; value: number; comment?: string }> }) {
  const [primary, ...secondary] = scores;

  return (
    <article className="glass-card flex min-h-[20rem] rounded-3xl p-6">
      <div className="flex w-full flex-col">
        <p className="text-xs font-black uppercase tracking-[0.16em] text-accent-info">IMPRESSION SCORE</p>
        {primary ? (
          <>
            <div className="mt-4 flex items-end justify-between gap-5">
              <div>
                <p className="text-sm font-black text-text-muted">가장 또렷한 신호</p>
                <h3 className="mt-2 text-4xl font-bold text-text-primary">{primary.label}</h3>
              </div>
              <span className="text-5xl font-bold tabular-nums text-accent-info">{Math.round(primary.value)}</span>
            </div>
            <div className="mt-5 h-2.5 overflow-hidden rounded-full bg-bg-raised/70">
              <div className="h-full rounded-full bg-accent-info" style={{ width: `${Math.max(0, Math.min(100, primary.value))}%` }} />
            </div>
            {primary.comment ? <p className="mt-4 text-sm font-bold leading-6 text-text-muted">{cleanCopy(primary.comment)}</p> : null}
          </>
        ) : null}
        <div className="mt-5 grid gap-3">
          {secondary.map((score) => (
            <div key={score.label} className="rounded-2xl border border-border/60 bg-bg-card/48 px-4 py-3">
              <div className="flex items-center justify-between gap-3 text-sm font-black">
                <span className="inline-flex items-center gap-2 text-text-primary">
                  <Gauge className="h-4 w-4 text-accent-info" aria-hidden="true" />
                  {score.label}
                </span>
                <span className="tabular-nums text-accent-info">{Math.round(score.value)}</span>
              </div>
              <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-bg-raised/70">
                <div className="h-full rounded-full bg-accent-info" style={{ width: `${Math.max(0, Math.min(100, score.value))}%` }} />
              </div>
            </div>
          ))}
        </div>
      </div>
    </article>
  );
}

function InnerStyleCard({ title, item, tone }: { title: string; item: InnerStyleDisplayItem; tone: "strong" | "support" }) {
  return (
    <article className="glass-card grid h-full min-h-[21rem] grid-rows-[auto_1fr_auto] rounded-3xl p-7">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-xs font-black uppercase tracking-[0.16em] text-accent-info">{title}</p>
          <h3 className="mt-3 text-4xl font-semibold text-text-primary">{item.label}</h3>
        </div>
        <span className="grid h-14 w-14 shrink-0 place-items-center rounded-2xl border border-accent-info/20 bg-accent-info/10 text-3xl" aria-hidden="true">
          {item.emoji}
        </span>
      </div>
      <div className="mt-6">
        <p className="text-xl font-semibold leading-8 text-text-primary">{item.summary}</p>
        <p className="mt-3 text-base font-semibold leading-7 text-text-muted">{item.description}</p>
      </div>
      <div className="mt-6 rounded-2xl border border-border/60 bg-bg-card/50 px-4 py-3">
        <p className="text-sm font-bold leading-6 text-text-muted">{tone === "strong" ? item.note : item.action}</p>
      </div>
    </article>
  );
}

function MatchFocusCard({ match }: { match: MatchProfile }) {
  return (
    <article className="glass-card grid min-h-[22rem] gap-6 rounded-3xl p-7 lg:grid-cols-[0.72fr_1fr]">
      <div className="flex flex-col justify-between rounded-3xl border border-accent-info/25 bg-accent-info/10 p-6">
        <HeartHandshake className="h-7 w-7 text-accent-info" aria-hidden="true" />
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-xs font-black uppercase tracking-[0.16em] text-accent-info">BEST MATCH</p>
            <h3 className="mt-3 text-4xl font-semibold leading-tight text-text-primary">{match.label}</h3>
          </div>
        </div>
        <p className="mt-6 text-base font-bold leading-7 text-text-muted">{match.headline}</p>
      </div>
      <div className="grid content-center gap-4">
        <div className="rounded-2xl border border-border/60 bg-bg-card/48 p-5">
          <p className="text-xs font-black uppercase tracking-[0.14em] text-accent-info">잘 맞는 이유</p>
          <p className="mt-3 text-base font-bold leading-7 text-text-muted">{match.reason}</p>
        </div>
        <div className="grid gap-4 md:grid-cols-2">
          <div className="rounded-2xl border border-border/60 bg-bg-card/48 p-5">
            <p className="text-xs font-black uppercase tracking-[0.14em] text-accent-info">어긋나는 순간</p>
            <p className="mt-3 text-sm font-bold leading-6 text-text-muted">{match.friction}</p>
          </div>
          <div className="rounded-2xl border border-border/60 bg-bg-card/48 p-5">
            <p className="text-xs font-black uppercase tracking-[0.14em] text-accent-info">같이 있으면 좋은 장면</p>
            <p className="mt-3 text-sm font-bold leading-6 text-text-muted">{match.goodScene}</p>
          </div>
        </div>
      </div>
    </article>
  );
}

function BookCurationSection({ result }: { result: LibraryAnalysisResult }) {
  const books = result.recommendations.slice(0, 3).map((book) => ({
    ...book,
    reason: publicResultCopy(book.reason),
    actionCopy: publicResultCopy(book.actionCopy),
  }));
  const [featured, ...supporting] = books;

  if (!featured) {
    return (
      <div className="glass-card grid min-h-[18rem] place-items-center rounded-3xl p-8 text-center">
        <p className="text-lg font-black text-text-primary">추천할 책을 고르는 중이에요.</p>
      </div>
    );
  }

  return (
    <div className="grid min-h-0 gap-5 lg:grid-cols-[minmax(0,1.28fr)_minmax(21rem,0.72fr)]">
      <BookRecommendationCard book={featured} index={0} variant="featured" />
      <div className="grid min-h-0 content-start gap-4">
        <p className="text-sm font-black uppercase tracking-[0.16em] text-accent-info">함께 읽으면 좋은 책</p>
        {supporting.slice(0, 2).map((book, index) => (
          <BookRecommendationCard key={`${book.bookId}-${index + 1}`} book={book} index={index + 1} variant="compact" />
        ))}
      </div>
    </div>
  );
}

function ChipList({ items, className = "" }: { items: string[]; className?: string }) {
  return (
    <div className={["flex flex-wrap gap-2", className].join(" ")}>
      {items.map((item) => (
        <span key={item} className="rounded-full border border-accent-info/30 bg-accent-info/10 px-3 py-1.5 text-xs font-black text-accent-info">
          {cleanCopy(item)}
        </span>
      ))}
    </div>
  );
}

const RHYTHM_ORDER: SajuElement[] = ["wood", "fire", "earth", "metal", "water"];

type RhythmProfileItem = {
  element: SajuElement;
  label: string;
  title: string;
  summary: string;
  description: string;
  supportCopy: string;
  emoji: string;
  count: number;
  percent: number;
};

type InnerStyleDisplayItem = {
  label: string;
  title: string;
  emoji: string;
  summary: string;
  description: string;
  note: string;
  action: string;
};

type MatchProfile = {
  label: string;
  headline: string;
  summary: string;
  reason: string;
  friction: string;
  goodScene: string;
  caution: string;
};

const RHYTHM_META: Record<SajuElement, { label: string; title: string; summary: string; description: string; supportCopy: string; emoji: string }> = {
  wood: {
    label: "탐색",
    title: "새로운 가능성을 빠르게 키우는 분이네요",
    emoji: "🌱",
    summary: "아이디어를 발견하고 확장하는 감각이 또렷해요.",
    description: "새로운 주제에 호기심이 빨리 붙어요.",
    supportCopy: "새로운 관점을 일부러 열어두면 선택지가 더 풍성해져요.",
  },
  fire: {
    label: "추진",
    title: "분위기를 움직이는 실행감이 또렷한 분이네요",
    emoji: "🔥",
    summary: "생각이 행동으로 넘어가는 속도가 장점으로 읽혀요.",
    description: "시동이 걸리면 주변 흐름까지 같이 끌어올려요.",
    supportCopy: "작은 실행 버튼을 먼저 누르면 생각이 오래 고이지 않아요.",
  },
  earth: {
    label: "정리",
    title: "복잡한 흐름을 안정적으로 정리하는 분이네요",
    emoji: "🧭",
    summary: "상황을 차분히 붙잡고 균형을 맞추는 힘이 보여요.",
    description: "흩어진 정보를 구조로 묶는 데 강해요.",
    supportCopy: "해야 할 일을 작게 나누면 집중이 더 오래 유지돼요.",
  },
  metal: {
    label: "판단",
    title: "기준을 세우고 선명하게 판단하는 분이네요",
    emoji: "⚖️",
    summary: "선택지가 많아도 핵심 기준을 빠르게 잡는 편이에요.",
    description: "필요한 것과 아닌 것을 가르는 감각이 있어요.",
    supportCopy: "기준을 한 줄로 적어두면 고민이 빠르게 정리돼요.",
  },
  water: {
    label: "몰입",
    title: "조용히 깊이를 쌓는 분이네요",
    emoji: "🌊",
    summary: "겉으로는 차분해도 안쪽에서는 생각의 깊이가 오래 이어져요.",
    description: "한 번 꽂힌 주제는 끝까지 파고드는 쪽이에요.",
    supportCopy: "깊게 파고드는 시간과 쉬어가는 시간을 나누면 균형이 좋아져요.",
  },
};

function rhythmSignalItems(calculation?: SajuCalculation | null) {
  return RHYTHM_ORDER.map((element) => ({
    element,
    ...RHYTHM_META[element],
    count: calculation?.elementCounts[element] ?? 0,
  }));
}

function buildFaceSignals(result: LibraryAnalysisResult) {
  return [
    {
      title: "균형 좌표",
      kicker: "SYMMETRY",
      text: compactCopy(`${result.geometry.symmetry} ${result.geometry.goldenRatio}`, 132),
    },
    {
      title: "눈 신호",
      kicker: "EYES",
      text: compactCopy(`${result.parts.eyes.metricsText} ${result.parts.eyes.comment}`, 132),
    },
    {
      title: "코와 입의 흐름",
      kicker: "NOSE / MOUTH",
      text: compactCopy(`${result.parts.nose.metricsText} ${result.parts.nose.comment} ${result.parts.mouth.comment}`, 136),
    },
    {
      title: "하관 리듬",
      kicker: "JAW",
      text: compactCopy(`${result.parts.jaw.metricsText} ${result.parts.jaw.comment}`, 132),
    },
  ];
}

function buildFaceSignalSummaryLines(result: LibraryAnalysisResult, topScore: { label: string; value: number }) {
  return [`얼굴 비율과 이목구비 좌표에서 읽힌 신호만 따로 모았어요.`, `가장 또렷한 측정 신호는 ${topScore.label} ${Math.round(topScore.value)}점이에요.`];
}

function buildOpeningSummaryLines(result: LibraryAnalysisResult) {
  const summary = compactCopy(result.physiognomySummary, 138);
  const strengths = cleanCopy(result.physiognomy.strengths.join(" "));

  return [summary, compactCopy(strengths, 112)].filter(Boolean);
}

type SectionCopyKey = keyof NonNullable<LibraryAnalysisResult["sectionCopy"]>;

function sectionLines(result: LibraryAnalysisResult, key: SectionCopyKey, fallback: string[]) {
  const custom = result.sectionCopy?.[key]?.map(publicResultCopy).filter(Boolean) ?? [];
  const unique = dedupeLines(custom.length > 0 ? custom : fallback.map(publicResultCopy));
  return unique.slice(0, 2);
}

function dedupeLines(lines: string[]) {
  const seen = new Set<string>();
  return lines.filter((line) => {
    const normalized = line.replace(/\s+/g, " ").trim();
    if (!normalized || seen.has(normalized)) return false;
    seen.add(normalized);
    return true;
  });
}

function buildInnerStyleSummaryLines(style: { strong: InnerStyleDisplayItem; support: InnerStyleDisplayItem }) {
  return [`${style.strong.label}이 가장 또렷하고, ${style.support.label}은 의식적으로 보완하면 좋아요.`, "숫자표 대신 지금 체감하기 쉬운 성향 두 가지만 골랐어요."];
}

function buildBookSectionLines(result: LibraryAnalysisResult) {
  const firstNeed = cleanCopy(result.readingNeeds[0] ?? "지금 필요한 독서 방향");
  return [`${firstNeed}에 맞춰 지금 바로 집어 들기 좋은 책을 먼저 골랐어요.`, "대표 책 1권과 함께 읽기 좋은 책 2권만 간단히 추렸어요."];
}

function innerStyleProfile(result: LibraryAnalysisResult, items: ReturnType<typeof rhythmSignalItems>) {
  if (result.innerStyleInsight) {
    return {
      strong: {
        label: result.innerStyleInsight.dominantLabel,
        title: `${result.innerStyleInsight.dominantLabel}이 또렷한 분이네요`,
        emoji: result.innerStyleInsight.dominantEmoji,
        summary: result.innerStyleInsight.dominantHeadline,
        description: result.innerStyleInsight.dominantDetail,
        note: "야옹이 기준으로 이 부분은 이미 꽤 선명하게 보여요.",
        action: result.innerStyleInsight.dominantDetail,
      },
      support: {
        label: result.innerStyleInsight.growthLabel,
        title: `${result.innerStyleInsight.growthLabel}을 보완하면 좋아요`,
        emoji: result.innerStyleInsight.growthEmoji,
        summary: result.innerStyleInsight.growthHeadline,
        description: result.innerStyleInsight.growthDetail,
        note: result.innerStyleInsight.growthDetail,
        action: result.innerStyleInsight.growthAction,
      },
    };
  }

  const percentItems = rhythmPercentItems(items).sort((left, right) => right.percent - left.percent) as RhythmProfileItem[];
  const strong = percentItems[0] ?? ({ ...RHYTHM_META.water, element: "water", count: 1, percent: 100 } satisfies RhythmProfileItem);
  const support =
    [...percentItems]
      .filter((item) => item.element !== strong.element)
      .sort((left, right) => left.percent - right.percent)[0] ?? strong;

  return {
    strong: rhythmToDisplay(strong, "strong"),
    support: rhythmToDisplay(support, "support"),
  };
}

function rhythmToDisplay(item: RhythmProfileItem, tone: "strong" | "support"): InnerStyleDisplayItem {
  return {
    label: item.label,
    title: item.title,
    emoji: item.emoji,
    summary: tone === "strong" ? item.summary : `${item.label}이 부족하면 좋은 생각도 실행 전 대기실에 오래 머물 수 있어요.`,
    description: tone === "strong" ? item.description : item.supportCopy,
    note: "야옹이 확대경으로 보면 이미 잘 쓰고 있는 쪽이에요.",
    action: `${item.label}을 아주 작게 한 번만 꺼내 쓰면 균형이 훨씬 편해져요.`,
  };
}

function rhythmPercentItems(items: ReturnType<typeof rhythmSignalItems>) {
  const total = totalRhythmCount(items);
  return items.map((item) => ({
    ...item,
    percent: Math.round((item.count / total) * 100),
  }));
}

function totalRhythmCount(items: Array<{ count: number }>) {
  return Math.max(
    1,
    items.reduce((sum, item) => sum + item.count, 0),
  );
}

function buildMatchProfile(result: LibraryAnalysisResult, strong: InnerStyleDisplayItem): MatchProfile {
  const rawLabel = result.chemiInsight?.typeLabel ?? result.romanticMatch.bestTypes[0] ?? `${strong.label}을 편하게 받아주는 사람`;
  const label = compactPublicCopy(rawLabel, 34);
  const why = publicResultCopy(result.chemiInsight?.why ?? result.romanticMatch.why);
  const caution = publicResultCopy(result.romanticMatch.caution);
  const reason = compactCopy(firstPublicSentence(why) || `${strong.label} 성향을 편안하게 받아주고 대화 흐름을 차분히 이어주는 사람이 잘 맞아요.`, 126);
  const headline = compactCopy(result.chemiInsight?.headline ?? `${label}과 있으면 생각이 너무 오래 고이지 않고 자연스럽게 움직여요.`, 116);
  const friction = compactCopy(result.chemiInsight?.friction ?? firstPublicSentence(caution) ?? "혼자 의미를 오래 쌓아두면 작은 오해도 고양이 털처럼 커질 수 있어요.", 112);
  const goodScene = compactCopy(result.chemiInsight?.goodScene ?? firstPublicSentence(publicResultCopy(result.romanticMatch.dateStyle)) ?? "조용한 대화와 가벼운 환기가 함께 있는 시간이 잘 맞아요.", 112);

  return {
    label,
    headline,
    summary: `${label}과 가장 흐름이 좋아요.`,
    reason,
    friction,
    goodScene,
    caution: compactCopy(firstPublicSentence(caution) || "혼자 의미를 쌓아두기보다 바로 말로 확인하면 관계 흐름이 편해져요.", 112),
  };
}

function topScoreItem(scores: LibraryAnalysisResult["scores"]) {
  return topScoreItems(scores, 1)[0] ?? { label: "신뢰감", value: scores.trust, comment: scores.comments[1] };
}

function topScoreItems(scores: LibraryAnalysisResult["scores"], count = 3) {
  const items = [
    { label: "호감도", value: scores.likability },
    { label: "신뢰감", value: scores.trust },
    { label: "대칭성", value: Math.min(scores.symmetry, 90) },
    { label: "균형감", value: scores.balance },
    { label: "인상 매력도", value: scores.attractiveness },
  ];

  return items
    .map((item, index) => ({ ...item, comment: scores.comments[index] }))
    .sort((left, right) => right.value - left.value)
    .slice(0, count);
}

function useTypewriterLines(lines: string[], sectionIndex: number, active: boolean) {
  const [visibleText, setVisibleText] = useState(() => (active || prefersReducedMotion() ? lines.join("\n") : ""));
  const lineKey = lines.join("\n");
  const stableLines = useMemo(() => (lineKey ? lineKey.split("\n") : []), [lineKey]);
  const fullText = stableLines.join("\n");

  useEffect(() => {
    if (!active) {
      setVisibleText("");
      return;
    }

    if (prefersReducedMotion()) {
      setVisibleText(fullText);
      return;
    }

    let cancelled = false;
    let charIndex = 0;
    let timeout: number | undefined;

    setVisibleText("");

    const tick = () => {
      if (cancelled || charIndex >= fullText.length) return;

      charIndex += 1;
      setVisibleText(fullText.slice(0, charIndex));

      if (charIndex < fullText.length) {
        timeout = window.setTimeout(tick, 18 + Math.min(14, sectionIndex * 2));
      }
    };

    timeout = window.setTimeout(tick, 180);

    return () => {
      cancelled = true;
      if (timeout) window.clearTimeout(timeout);
    };
  }, [active, fullText, sectionIndex]);

  const nextLines = visibleText.length > 0 ? visibleText.split("\n") : active && fullText.length > 0 ? [""] : [];
  return nextLines.map((line) => line ?? "").filter((line, index) => line.length > 0 || index === 0);
}

function clampInt(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}

function prefersReducedMotion() {
  if (typeof window === "undefined" || typeof window.matchMedia !== "function") return false;
  return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

function withResultFallback(result: LibraryAnalysisResult): LibraryAnalysisResult {
  const oldResult = result as Partial<LibraryAnalysisResult>;
  const legacyParts = oldResult.parts as (Partial<LibraryAnalysisResult["parts"]> & { skin?: LibraryAnalysisResult["parts"]["impression"] }) | undefined;
  const physiognomySummary = cleanCopy(oldResult.physiognomySummary ?? "얼굴 비율과 인상 신호를 바탕으로 관상 리포트를 구성했어요.");
  const sajuSummary = cleanCopy(oldResult.sajuSummary ?? "내면 흐름을 현재 컨디션과 함께 해석했어요.");

  return {
    ...result,
    mainCopy: cleanCopy(oldResult.mainCopy ?? oldResult.readingType?.headline ?? "관상 리포트 도착"),
    readingType: {
      code: oldResult.readingType?.code ?? result.readingType.code,
      displayName: cleanCopy(oldResult.readingType?.displayName ?? "딥다이브 학자형"),
      headline: cleanCopy(oldResult.readingType?.headline ?? "관상 리포트 도착"),
      description: cleanCopy(oldResult.readingType?.description ?? "깊게 관찰하고 차분하게 파고드는 타입이에요."),
    },
    geometry: oldResult.geometry ?? {
      symmetry: "좌우 중심축과 눈·입꼬리 기준의 균형을 확인했어요.",
      goldenRatio: "얼굴 폭과 높이 비율에서 전체 인상 균형을 읽었어요.",
      thirds: "상안·중안·하안의 분포로 사고와 실행 흐름을 나눠봤어요.",
      fifths: "오등분 기준으로 눈 사이 간격과 얼굴 폭의 안정감을 비교했어요.",
      faceShape: "전체 윤곽은 인상 강도와 부드러움이 같이 보이는 타입이에요.",
    },
    parts: {
      forehead: legacyParts?.forehead ?? { metricsText: "이마 면적과 눈썹 라인 기준", comment: "계획을 세우는 힘이 보이고, 머릿속 회의가 길어질 때가 있어요." },
      eyes: legacyParts?.eyes ?? { metricsText: "눈매 각도와 좌우 차이 기준", comment: "관찰력이 빠르고 표정 변화가 생각보다 솔직하게 드러나는 편이에요." },
      nose: legacyParts?.nose ?? { metricsText: "콧대 길이와 폭 기준", comment: "추진력은 있는데 시작 전 계산이 한 번 들어가는 타입이에요." },
      mouth: legacyParts?.mouth ?? { metricsText: "입술 비율과 입꼬리 기준", comment: "말을 아끼다가 핵심에서 꽤 선명하게 표현하는 흐름이에요." },
      jaw: legacyParts?.jaw ?? { metricsText: "턱선과 하관 안정감 기준", comment: "버티는 힘은 있지만 피로가 쌓이면 표정 리듬이 바로 달라질 수 있어요." },
      impression: legacyParts?.impression ?? legacyParts?.skin ?? { metricsText: "표정 안정감과 전체 인상 기준", comment: "차분한 첫인상 안에 은근한 탐구심이 같이 잡혀요." },
    },
    scores: oldResult.scores ?? {
      likability: 78,
      trust: 76,
      symmetry: 74,
      balance: 77,
      attractiveness: 75,
      comments: ["전반적인 인상 균형은 안정적이에요.", "눈 주변 신호가 리포트의 핵심이에요.", "하관은 버티는 힘 쪽으로 읽혀요.", "표정 변화가 리듬을 빠르게 드러내요.", "관상 키워드는 집중과 재정렬이에요."],
    },
    physiognomy: oldResult.physiognomy ?? {
      keywords: ["집중", "재정렬", "관찰력"],
      summary: physiognomySummary,
      strengths: ["상황을 빠르게 읽고 핵심을 좁히는 힘", "조용히 버티다가 필요한 순간 움직이는 실행력"],
      cautions: ["생각이 길어지면 시작이 늦어질 수 있음", "표정 리듬이 컨디션을 바로 드러낼 수 있음"],
    },
    saju: oldResult.saju ?? {
      keywords: ["리듬", "균형", "회복"],
      elementBalance: sajuSummary,
      currentFlow: "지금은 속도를 더 내기보다 방향을 다듬는 흐름이 강해요.",
      strength: "한 번 꽂히면 오래 파고드는 지속력이 강점이에요.",
      advice: "루틴을 작게 쪼개면 기운이 더 안정적으로 붙어요.",
    },
    romanticMatch: oldResult.romanticMatch ?? {
      bestTypes: ["에너지 실행형", "차분한 조율형"],
      why: "깊게 생각하는 리듬을 상대가 가볍게 환기해줄 때 케미가 좋아요.",
      dateStyle: "조용한 전시, 책방, 산책처럼 대화가 천천히 열리는 코스가 잘 맞아요.",
      caution: "답장이 늦다고 바로 의미 부여하면 고양이 귀 접혀요. 천천히 확인하는 쪽이 좋아요.",
    },
    physiognomySummary,
    sajuSummary,
    readingNeeds: oldResult.readingNeeds ?? ["집중 회복", "생각 정리", "실행 리듬"],
    recommendations: oldResult.recommendations ?? [],
    calibratedScores: oldResult.calibratedScores,
    sectionCopy: oldResult.sectionCopy ?? {
      faceReveal: [physiognomySummary, "얼굴에서 먼저 보이는 안정감과 리듬을 중심으로 읽었어요."],
      faceSignal: ["얼굴 비율과 이목구비 좌표에서 읽힌 신호만 따로 모았어요.", "좋고 나쁨보다 어떤 인상으로 읽히는지 중심으로 정리했어요."],
      innerStyle: ["숫자표 대신 지금 체감하기 쉬운 성향 두 가지만 골랐어요.", "강하게 드러나는 쪽과 보완하면 편해지는 쪽을 나눠 봤어요."],
      chemiMatch: ["잘 맞는 사람은 여러 명보다 한 유형으로 좁혀야 더 믿을 만해요.", "야옹이가 흐름이 가장 편한 타입 하나만 골랐어요."],
      bookCuration: ["지금 필요한 독서 방향에 맞춰 바로 집어 들기 좋은 책을 골랐어요.", "대표 책 1권과 함께 읽기 좋은 책 2권만 간단히 추렸어요."],
    },
    innerStyleInsight: oldResult.innerStyleInsight,
    chemiInsight: oldResult.chemiInsight,
  };
}

function cleanCopy(input: string) {
  const cleaned = stripHanja(input)
    .replace(/피부/g, "전체 인상")
    .replace(/처방전?/g, "추천")
    .replace(/학생/g, "님")
    .replace(/근거 더 보기/g, "더보기")
    .replace(/근거/g, "설명")
    .replace(new RegExp(["연", "애"].join(""), "g"), "관계 궁합")
    .replace(/연인/g, "상대")
    .replace(/상대과/g, "상대와")
    .replace(/데이트/g, "함께하는 시간")
    .replace(/함께하는 시간를/g, "함께하는 시간을")
    .replace(/함께하는 시간가/g, "함께하는 시간이")
    .replace(/해줘/g, "해 주세요")
    .replace(/했어/g, "했어요")
    .replace(/이건/g, "이 책은");

  return softenFormalPolite(cleaned);
}

function publicResultCopy(input: string) {
  const cleaned = cleanCopy(input)
    .replace(/(\d{4})년\s*[^,.!?]+년,\s*[^,.!?]+월,\s*[^,.!?]+일에 태어난\s*[^,.!?]+?(?:이네요|이에요|입니다|입니다\.)?/g, "내면 흐름이 꽤 선명해요")
    .replace(/생년월일(?:에서|로|을|를|의| 기반| 신호| 리듬)?/g, "내면")
    .replace(/[갑을병정무기경신임계]?\s*나무\s*일간답게/g, "차분한 탐색 성향답게")
    .replace(/흘러가는\s*물처럼/g, "잠깐 속도를 낮추듯")
    .replace(/물처럼/g, "잠깐 속도를 낮추듯")
    .replace(/지식의\s*바다/g, "지식 탐색")
    .replace(/불꽃/g, "에너지")
    .replace(/잔잔한\s*물결/g, "차분한 조율")
    .replace(/물결/g, "조율")
    .replace(/(?:목|나무)의?\s*(?:기운|리듬|흐름)/g, "탐색 성향")
    .replace(/(?:화|불)의?\s*(?:기운|리듬|흐름)/g, "추진 성향")
    .replace(/(?:토|흙)의?\s*(?:기운|리듬|흐름)/g, "정리 성향")
    .replace(/(?:금)의?\s*(?:기운|리듬|흐름)/g, "판단 성향")
    .replace(/(?:수|물)의?\s*(?:기운|리듬|흐름)/g, "깊게 몰입하는 성향")
    .replace(/넘쳐나는\s+깊게 몰입하는 성향을/g, "생각이 많아질 때 방향을")
    .replace(/깊게 몰입하는 성향을 원하는 방향으로 흐르게/g, "몰입을 원하는 방향으로 정리하게")
    .replace(/나무\s*(\d+)/g, "탐색 $1")
    .replace(/불\s*(\d+)/g, "추진 $1")
    .replace(/흙\s*(\d+)/g, "정리 $1")
    .replace(/금\s*(\d+)/g, "판단 $1")
    .replace(/물\s*(\d+)/g, "몰입 $1")
    .replace(/목\s*기운/g, "탐색 리듬")
    .replace(/화\s*기운/g, "추진 리듬")
    .replace(/토\s*기운/g, "정리 리듬")
    .replace(/금\s*기운/g, "판단 리듬")
    .replace(/수\s*기운/g, "몰입 리듬")
    .replace(/나무\s*기운/g, "탐색 리듬")
    .replace(/불\s*기운/g, "추진 리듬")
    .replace(/흙\s*기운/g, "정리 리듬")
    .replace(/물\s*기운/g, "몰입 리듬")
    .replace(/물\s*흐름/g, "몰입 리듬")
    .replace(/불\s*흐름/g, "추진 리듬")
    .replace(/나무는/g, "탐색 리듬은")
    .replace(/불은/g, "추진 리듬은")
    .replace(/흙은/g, "정리 리듬은")
    .replace(/금은/g, "판단 리듬은")
    .replace(/물은/g, "몰입 리듬은")
    .replace(/물이\s*너무/g, "몰입 리듬이 너무")
    .replace(/물이\s*많/g, "몰입 리듬이 많")
    .replace(/우세한?\s*기운/g, "가장 또렷한 성향")
    .replace(/우세\s*오행/g, "주요 성향")
    .replace(/오행/g, "성향 패턴")
    .replace(/사주/g, "내면 성향")
    .replace(/일간|월주|년주|일주|시주/g, "내면 신호")
    .replace(/기운/g, "성향")
    .replace(/강한\s+깊게 몰입하는 성향/g, "깊게 몰입하는 성향")
    .replace(/강한\s+(탐색|추진|정리|판단)\s*성향/g, "또렷한 $1 성향")
    .replace(/\s{2,}/g, " ")
    .trim();

  return softenFormalPolite(cleaned);
}

function compactPublicCopy(input: string, maxLength: number) {
  return compactCopy(publicResultCopy(input), maxLength);
}

function firstPublicSentence(input: string) {
  return splitReadableSentences(publicResultCopy(input))[0] ?? "";
}

function compactCopy(input: string, maxLength: number) {
  const cleaned = cleanCopy(input).replace(/\s+/g, " ").trim();
  if (cleaned.length <= maxLength) return cleaned;
  const clipped = cleaned.slice(0, maxLength);
  const stops = ["입니다.", "합니다.", "해요.", "예요.", "이에요.", "습니다.", ".", "!", "?"];
  const bestStop = stops.reduce((best, stop) => {
    const position = clipped.lastIndexOf(stop);
    return position > best ? position + stop.length : best;
  }, -1);

  if (bestStop > Math.floor(maxLength * 0.35)) return clipped.slice(0, bestStop).trim();
  return clipped.replace(/[,\s/·:;]+$/g, "").trim();
}

function splitReadableSentences(line: string) {
  return line
    .split(/(?<=[.!?])\s+/)
    .map((sentence) => sentence.trim())
    .filter(Boolean);
}
