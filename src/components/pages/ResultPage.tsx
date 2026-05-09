"use client";

import { useEffect, useMemo, useState } from "react";
import type { ReactNode } from "react";
import Link from "next/link";
import { CameraOff, Gauge, HeartHandshake, Loader2, RefreshCw, RotateCcw, ShieldCheck } from "lucide-react";
import { BookRecommendationCard } from "@/components/result/BookRecommendationCard";
import { honorific } from "@/lib/korean/name";
import { dominantElementText, elementCountItems, koreanDayMaster, koreanPillarSummary, stripHanja } from "@/lib/saju/display";
import type { DetailComment, LibraryAnalysisResult } from "@/types/session";

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
          <p className="mt-4 text-lg font-black">관상 리포트 불러오는 중</p>
        </div>
      </main>
    );
  }

  if (status === "error" || !payload) {
    return (
      <main className="grid min-h-screen place-items-center bg-bg-primary px-5 text-text-primary">
        <section className="glass-panel max-w-md rounded-2xl p-6 text-center">
          <h1 className="text-2xl font-black">결과를 찾지 못했어</h1>
          <p className="mt-3 text-sm font-bold leading-6 text-text-muted">학번과 생년월일로 다시 찾아보거나, 새로 분석을 시작해줘.</p>
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
  const elementItems = elementCountItems(calculation);
  const partCards = buildPartCards(result);
  const dominantText = dominantElementText(calculation);

  return (
    <main className="min-h-screen bg-black text-text-primary">
      <section className="scanline relative overflow-hidden px-5 pb-12 pt-6 md:px-8">
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_50%_12%,rgb(var(--accent-info-rgb)_/_0.16),transparent_30rem),linear-gradient(180deg,rgb(255_255_255_/_0.04),transparent_22rem)]" />

        <header className="relative z-20 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3 rounded-lg border border-border bg-black/[0.45] px-3 py-2.5 text-xs font-bold uppercase tracking-[0.14em] text-text-muted backdrop-blur">
            <span className="grid h-8 w-8 place-items-center rounded-md border border-white/10 bg-white/[0.08]">
              <AppIcon className="h-5 w-5" />
            </span>
            <span>AI 관상가 고양이 / Live Result</span>
          </div>
          <Link href="/" className="inline-flex h-11 items-center justify-center gap-2 rounded-lg border border-border bg-black/45 px-4 text-sm font-black text-text-primary transition hover:border-border-bright hover:bg-white/10">
            <RotateCcw className="h-4 w-4" aria-hidden="true" />
            다시 분석하기
          </Link>
        </header>

        <div className="relative z-10 mx-auto grid min-h-[calc(100vh-6.5rem)] max-w-7xl items-center gap-8 py-10 lg:grid-cols-[0.92fr_1.08fr]">
          <ResultFacePanel displayName={displayName} faceImageUrl={faceImageUrl} />

          <section className="min-w-0">
            <p className="text-xs font-black uppercase tracking-[0.2em] text-accent-warn">AI 관상가 고양이</p>
            <h1 className="mt-3 overflow-hidden text-ellipsis whitespace-nowrap text-[clamp(2.2rem,5vw,5.4rem)] font-black leading-none text-text-primary">
              {cleanCopy(result.mainCopy || result.readingType.headline)}
            </h1>

            <div className="mt-6 grid gap-4 md:grid-cols-[1.1fr_0.9fr]">
              <article className="rounded-2xl border border-border bg-bg-card/70 p-5 shadow-2xl shadow-black/35">
                <p className="text-xs font-black uppercase tracking-[0.16em] text-accent-info">TYPE</p>
                <h2 className="mt-2 text-3xl font-black text-text-primary">{cleanCopy(result.readingType.displayName)}</h2>
                <p className="mt-3 text-base font-bold leading-7 text-text-muted">{cleanCopy(result.readingType.description)}</p>
                <div className="mt-5 flex flex-wrap gap-2">
                  {result.physiognomy.keywords.slice(0, 5).map((keyword) => (
                    <span key={keyword} className="rounded-full border border-accent-info/30 bg-accent-info/10 px-3 py-1.5 text-xs font-black text-accent-info">
                      {cleanCopy(keyword)}
                    </span>
                  ))}
                </div>
              </article>

              <article className="rounded-2xl border border-border bg-bg-card/70 p-5 shadow-2xl shadow-black/35">
                <p className="text-xs font-black uppercase tracking-[0.16em] text-accent-info">SAJU RHYTHM</p>
                <h2 className="mt-2 text-2xl font-black text-text-primary">{koreanDayMaster(calculation)}</h2>
                <p className="mt-3 text-sm font-bold leading-6 text-text-muted">우세 기운: {dominantText}</p>
                <div className="mt-4 grid gap-2">
                  {elementItems.map((item) => (
                    <ElementBar key={item.element} icon={item.icon} label={item.label} value={item.count} max={maxElementCount(elementItems)} />
                  ))}
                </div>
              </article>
            </div>

            <article className="mt-4 rounded-2xl border border-accent-info/25 bg-accent-info/10 p-5">
              <p className="text-xs font-black uppercase tracking-[0.16em] text-accent-info">FINAL MEOW</p>
              <p className="mt-2 text-lg font-black leading-8 text-text-primary">
                {cleanCopy(result.physiognomy.summary)}
              </p>
              <p className="mt-3 text-sm font-bold leading-6 text-text-muted">
                {cleanCopy(result.saju.strength)} {cleanCopy(result.saju.advice)} 야옹이 기준으로는 “조용히 보고 있다가 꽂히면 오래 파는 타입” 신호가 꽤 선명해요.
              </p>
            </article>
          </section>
        </div>
      </section>

      <section className="mx-auto grid max-w-7xl gap-6 px-5 py-10 md:px-8">
        <ReportSection eyebrow="PERSONA" title={`${name} 타입 리포트`}>
          <div className="grid gap-4 lg:grid-cols-3">
            <TextPanel title="관상 총평" text={`${cleanCopy(result.physiognomySummary)} ${cleanCopy(result.physiognomy.strengths.join(" "))}`} />
            <TextPanel title="사주 리듬" text={`${koreanPillarSummary(calculation)}. ${cleanCopy(result.saju.elementBalance)} ${cleanCopy(result.saju.currentFlow)}`} />
            <TextPanel title="주의할 흐름" text={cleanCopy(result.physiognomy.cautions.join(" "))} />
          </div>
        </ReportSection>

        <ReportSection eyebrow="FACE READING" title="이목구비 관상 리포트">
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {partCards.map((part) => (
              <PartCard key={part.title} title={part.title} part={part.part} />
            ))}
          </div>
        </ReportSection>

        <div className="grid gap-6 lg:grid-cols-[0.92fr_1.08fr]">
          <ReportSection eyebrow="INDEX" title="인상 지표">
            <ScoreGrid scores={result.scores} />
          </ReportSection>

          <ReportSection eyebrow="ROMANCE MATCH" title="연애 궁합">
            <div className="grid gap-4">
              <div className="grid gap-3 md:grid-cols-2">
                {result.romanticMatch.bestTypes.map((type) => (
                  <div key={type} className="rounded-xl border border-accent-info/25 bg-accent-info/10 p-4">
                    <HeartHandshake className="h-5 w-5 text-accent-info" aria-hidden="true" />
                    <p className="mt-3 text-lg font-black text-text-primary">{cleanCopy(type)}</p>
                  </div>
                ))}
              </div>
              <TextPanel title="왜 잘 맞냐면" text={cleanCopy(result.romanticMatch.why)} />
              <TextPanel title="데이트 추천" text={cleanCopy(result.romanticMatch.dateStyle)} />
              <TextPanel title="고양이의 경고" text={cleanCopy(result.romanticMatch.caution)} />
            </div>
          </ReportSection>
        </div>

        <ReportSection eyebrow="FIVE ELEMENTS" title="오행 밸런스">
          <div className="grid gap-3 md:grid-cols-5">
            {elementItems.map((item) => (
              <div key={item.element} className="rounded-xl border border-border bg-bg-card/70 p-4">
                <div className="text-3xl" aria-hidden="true">
                  {item.icon}
                </div>
                <p className="mt-3 text-lg font-black text-text-primary">{item.label}</p>
                <p className="mt-1 text-sm font-bold text-text-muted">{item.count}칸 감지</p>
              </div>
            ))}
          </div>
        </ReportSection>

        <ReportSection eyebrow="FINAL CURATION" title={`지금 ${name}에게 필요한 책`} id="books">
          <p className="max-w-3xl text-sm font-bold leading-6 text-text-muted">
            리포트가 끝났다고 생각한 순간, 야옹이가 마지막으로 도서관 레이더를 켰습니다. 지금 {name}에게 빌릴 명분이 가장 센 책만 골랐어요.
          </p>
          <ul className="mt-5 grid gap-2 md:grid-cols-3">
            {result.readingNeeds.map((need) => (
              <li key={need} className="rounded-lg border border-accent-info/20 bg-accent-info/10 px-4 py-3 text-sm font-black leading-6 text-text-primary">
                {cleanCopy(need)}
              </li>
            ))}
          </ul>
          <div className="mt-5 grid gap-4">
            {result.recommendations.map((book, index) => (
              <BookRecommendationCard key={`${book.bookId}-${index}`} book={{ ...book, reason: cleanCopy(book.reason), actionCopy: cleanCopy(book.actionCopy) }} index={index} />
            ))}
          </div>
        </ReportSection>

        <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-border bg-bg-card/65 px-4 py-3 text-xs font-bold leading-5 text-text-faint">
          <span className="inline-flex items-center gap-2">
            <ShieldCheck className="h-4 w-4 text-accent-info" aria-hidden="true" />본 분석은 흥미용 해석이며, 의학적 소견이나 절대 평가가 아닙니다.
          </span>
          <Link href="/" className="inline-flex h-10 items-center justify-center gap-2 rounded-lg border border-border bg-black/30 px-4 text-sm font-black text-text-primary transition hover:bg-white/10">
            <RotateCcw className="h-4 w-4" aria-hidden="true" />
            다시 분석하기
          </Link>
        </div>
      </section>
    </main>
  );
}

function ResultFacePanel({ displayName, faceImageUrl }: { displayName: string; faceImageUrl: string | null }) {
  const name = honorific(displayName);
  const [imageFailed, setImageFailed] = useState(false);
  const shouldShowImage = Boolean(faceImageUrl && !imageFailed);

  return (
    <div className="relative mx-auto aspect-[4/5] w-full max-w-[520px] overflow-hidden rounded-[2rem] border border-white/15 bg-bg-card/70 shadow-2xl shadow-black/50">
      {shouldShowImage ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={faceImageUrl ?? ""} alt={`${name} 얼굴 분석 이미지`} className="h-full w-full object-cover" onError={() => setImageFailed(true)} />
      ) : (
        <div className="flex h-full flex-col items-center justify-center gap-4 px-6 text-center">
          <CameraOff className="h-10 w-10 text-accent-info" aria-hidden="true" />
          <p className="max-w-sm text-base font-black leading-7 text-text-primary">얼굴 이미지는 24시간 이후 삭제됐어요.</p>
        </div>
      )}
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_50%_42%,transparent_0,transparent_44%,rgb(0_0_0_/_0.42)_100%)]" />
      {FACE_MARKERS.map((marker, index) => (
        <span
          key={`${marker.x}-${marker.y}`}
          className="absolute h-3 w-3 -translate-x-1/2 -translate-y-1/2 rounded-full bg-white/90 shadow-[0_0_22px_rgb(141_222_215_/_0.75)]"
          style={{ left: `${marker.x}%`, top: `${marker.y}%`, animationDelay: `${index * 90}ms` }}
        />
      ))}
    </div>
  );
}

function AppIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 64 64" aria-hidden="true">
      <rect width="64" height="64" rx="14" fill="#111315" />
      <circle cx="32" cy="34" r="18" fill="#8dded7" />
      <path d="M18 24 12 12l15 7M46 24l6-12-15 7" fill="#8dded7" />
      <circle cx="25" cy="34" r="3" fill="#111315" />
      <circle cx="39" cy="34" r="3" fill="#111315" />
      <path d="M27 43c3 3 7 3 10 0" fill="none" stroke="#111315" strokeWidth="4" strokeLinecap="round" />
    </svg>
  );
}

const FACE_MARKERS = [
  { x: 50, y: 24 },
  { x: 38, y: 40 },
  { x: 62, y: 40 },
  { x: 50, y: 52 },
  { x: 42, y: 66 },
  { x: 58, y: 66 },
  { x: 50, y: 78 },
];

function ReportSection({ eyebrow, title, id, children }: { eyebrow: string; title: string; id?: string; children: ReactNode }) {
  return (
    <section id={id} className="rounded-2xl border border-border bg-bg-card/62 p-5 shadow-2xl shadow-black/25 md:p-6">
      <p className="text-xs font-black uppercase tracking-[0.16em] text-accent-warn">{eyebrow}</p>
      <h2 className="mt-2 text-2xl font-black text-text-primary md:text-3xl">{title}</h2>
      <div className="mt-5">{children}</div>
    </section>
  );
}

function TextPanel({ title, text }: { title: string; text: string }) {
  return (
    <article className="rounded-xl border border-border bg-black/20 p-4">
      <h3 className="text-base font-black text-text-primary">{title}</h3>
      <p className="mt-2 text-sm font-bold leading-6 text-text-muted">{text}</p>
    </article>
  );
}

function PartCard({ title, part }: { title: string; part: DetailComment }) {
  return (
    <article className="rounded-xl border border-border bg-black/20 p-4">
      <p className="text-xs font-black uppercase tracking-[0.14em] text-accent-info">{part.metricsText}</p>
      <h3 className="mt-2 text-xl font-black text-text-primary">{title}</h3>
      <p className="mt-3 text-sm font-bold leading-6 text-text-muted">{cleanCopy(part.comment)}</p>
    </article>
  );
}

function ScoreGrid({ scores }: { scores: LibraryAnalysisResult["scores"] }) {
  const items = [
    ["호감도", scores.likability],
    ["신뢰감", scores.trust],
    ["대칭성", scores.symmetry],
    ["균형감", scores.balance],
    ["인상 매력도", scores.attractiveness],
  ] as const;

  return (
    <div className="grid gap-3">
      {items.map(([label, value], index) => (
        <div key={label} className="rounded-xl border border-border bg-black/20 p-3">
          <div className="mb-2 flex items-center justify-between gap-3 text-sm font-black">
            <span className="inline-flex items-center gap-2 text-text-primary">
              <Gauge className="h-4 w-4 text-accent-info" aria-hidden="true" />
              {label}
            </span>
            <span className="tabular-nums text-accent-info">{Math.round(value)}</span>
          </div>
          <div className="h-2 overflow-hidden rounded-full bg-white/10">
            <div className="h-full rounded-full bg-accent-info" style={{ width: `${Math.max(0, Math.min(100, value))}%` }} />
          </div>
          {scores.comments[index] ? <p className="mt-2 text-xs font-bold leading-5 text-text-muted">{cleanCopy(scores.comments[index] ?? "")}</p> : null}
        </div>
      ))}
    </div>
  );
}

function ElementBar({ icon, label, value, max }: { icon: string; label: string; value: number; max: number }) {
  const width = max <= 0 ? 0 : Math.max(8, Math.round((value / max) * 100));

  return (
    <div>
      <div className="mb-1 flex items-center justify-between gap-3 text-xs font-black text-text-muted">
        <span>
          {icon} {label}
        </span>
        <span>{value}</span>
      </div>
      <div className="h-2 overflow-hidden rounded-full bg-white/10">
        <div className="h-full rounded-full bg-accent-info" style={{ width: `${width}%` }} />
      </div>
    </div>
  );
}

function buildPartCards(result: LibraryAnalysisResult) {
  return [
    { title: "이마", part: result.parts.forehead },
    { title: "눈", part: result.parts.eyes },
    { title: "코", part: result.parts.nose },
    { title: "입", part: result.parts.mouth },
    { title: "턱", part: result.parts.jaw },
    { title: "전체 인상", part: result.parts.impression },
  ];
}

function maxElementCount(items: Array<{ count: number }>) {
  return Math.max(1, ...items.map((item) => item.count));
}

function withResultFallback(result: LibraryAnalysisResult): LibraryAnalysisResult {
  const oldResult = result as Partial<LibraryAnalysisResult>;
  const legacyParts = oldResult.parts as (Partial<LibraryAnalysisResult["parts"]> & { skin?: DetailComment }) | undefined;
  const physiognomySummary = cleanCopy(oldResult.physiognomySummary ?? "얼굴 비율과 인상 신호를 바탕으로 관상 리포트를 구성했습니다.");
  const sajuSummary = cleanCopy(oldResult.sajuSummary ?? "생년월일 리듬을 현재 컨디션 흐름과 함께 해석했습니다.");

  return {
    ...result,
    mainCopy: cleanCopy(oldResult.mainCopy ?? oldResult.readingType?.headline ?? "관상 리포트 도착"),
    readingType: {
      code: oldResult.readingType?.code ?? result.readingType.code,
      displayName: cleanCopy(oldResult.readingType?.displayName ?? "딥다이브 학자형"),
      headline: cleanCopy(oldResult.readingType?.headline ?? "관상 리포트 도착"),
      description: cleanCopy(oldResult.readingType?.description ?? "깊게 관찰하고 차분하게 파고드는 타입입니다."),
    },
    geometry: oldResult.geometry ?? {
      symmetry: "좌우 중심축과 눈·입꼬리 기준의 균형을 확인했습니다.",
      goldenRatio: "얼굴 폭과 높이 비율에서 전체 인상 균형을 읽었습니다.",
      thirds: "상안·중안·하안의 분포로 사고와 실행 흐름을 나눠봤습니다.",
      fifths: "오등분 기준으로 눈 사이 간격과 얼굴 폭의 안정감을 비교했습니다.",
      faceShape: "전체 윤곽은 인상 강도와 부드러움이 같이 보이는 타입입니다.",
    },
    parts: {
      forehead: legacyParts?.forehead ?? { metricsText: "이마 면적과 눈썹 라인 기준", comment: "계획을 세우는 힘이 보이고, 머릿속 회의가 길어질 때가 있습니다." },
      eyes: legacyParts?.eyes ?? { metricsText: "눈매 각도와 좌우 차이 기준", comment: "관찰력이 빠르고 표정 변화가 생각보다 솔직하게 드러나는 편입니다." },
      nose: legacyParts?.nose ?? { metricsText: "콧대 길이와 폭 기준", comment: "추진력은 있는데 시작 전 계산이 한 번 들어가는 타입입니다." },
      mouth: legacyParts?.mouth ?? { metricsText: "입술 비율과 입꼬리 기준", comment: "말을 아끼다가 핵심에서 꽤 선명하게 표현하는 흐름입니다." },
      jaw: legacyParts?.jaw ?? { metricsText: "턱선과 하관 안정감 기준", comment: "버티는 힘은 있지만 피로가 쌓이면 표정 리듬이 바로 달라질 수 있습니다." },
      impression: legacyParts?.impression ?? legacyParts?.skin ?? { metricsText: "표정 안정감과 전체 인상 기준", comment: "차분한 첫인상 안에 은근한 탐구심이 같이 잡힙니다." },
    },
    scores: oldResult.scores ?? {
      likability: 78,
      trust: 76,
      symmetry: 74,
      balance: 77,
      attractiveness: 75,
      comments: ["전반적인 인상 균형은 안정적입니다.", "눈 주변 신호가 리포트의 핵심입니다.", "하관은 버티는 힘 쪽으로 읽힙니다.", "표정 변화가 리듬을 빠르게 드러냅니다.", "관상 키워드는 집중과 재정렬입니다."],
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
      currentFlow: "지금은 속도를 더 내기보다 방향을 다듬는 흐름이 강합니다.",
      strength: "한 번 꽂히면 오래 파고드는 지속력이 강점입니다.",
      advice: "루틴을 작게 쪼개면 기운이 더 안정적으로 붙습니다.",
    },
    romanticMatch: oldResult.romanticMatch ?? {
      bestTypes: ["불꽃 실행형", "잔잔한 물결형"],
      why: "깊게 생각하는 리듬을 상대가 가볍게 환기해줄 때 케미가 좋습니다.",
      dateStyle: "조용한 전시, 책방, 산책처럼 대화가 천천히 열리는 코스가 잘 맞습니다.",
      caution: "답장이 늦다고 바로 의미 부여하면 고양이 귀 접힙니다. 천천히 확인하는 쪽이 좋아요.",
    },
    physiognomySummary,
    sajuSummary,
    readingNeeds: oldResult.readingNeeds ?? ["집중 회복", "생각 정리", "실행 리듬"],
    recommendations: oldResult.recommendations ?? [],
  };
}

function cleanCopy(input: string) {
  return stripHanja(input).replace(/피부/g, "전체 인상");
}
