"use client";

import { useEffect, useState } from "react";
import type { ReactNode } from "react";
import Link from "next/link";
import { Activity, CameraOff, ChevronDown, Gauge, Library, Loader2, RefreshCw, RotateCcw, ShieldCheck } from "lucide-react";
import { BookRecommendationCard } from "@/components/result/BookRecommendationCard";
import { honorific } from "@/lib/korean/name";
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
  const result = withResultFallback(payload.result);
  const name = honorific(displayName);
  const cards = buildResultAnalysisCards(result);
  const leftCards = cards.filter((_, index) => index % 2 === 0);
  const rightCards = cards.filter((_, index) => index % 2 === 1);
  const calculation = result.saju.calculation;

  return (
    <main className="min-h-screen bg-black text-text-primary">
      <section className="scanline relative min-h-screen overflow-hidden px-6 py-6">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_43%,rgb(255_255_255_/_0.05)_0,transparent_25%,rgb(0_0_0_/_0.48)_62%,rgb(0_0_0_/_0.9)_100%)]" />

        <header className="relative z-30 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3 rounded-lg border border-border bg-black/[0.45] px-3 py-2.5 text-xs font-bold uppercase tracking-[0.14em] text-text-muted backdrop-blur">
            <span className="grid h-8 w-8 place-items-center rounded-md border border-white/10 bg-white/[0.08] text-lg">猫</span>
            <span>AI 관상가 고양이 / Live Result</span>
          </div>
          <Link href="/" className="inline-flex h-11 items-center justify-center gap-2 rounded-lg border border-border bg-black/45 px-4 text-sm font-black text-text-primary transition hover:border-border-bright hover:bg-white/10">
            <RotateCcw className="h-4 w-4" aria-hidden="true" />
            다시 분석하기
          </Link>
        </header>

        <div className="relative z-20 mx-auto mt-4 max-w-[840px] text-center">
          <p className="text-xs font-black uppercase tracking-[0.18em] text-accent-warn">AI 관상가 고양이</p>
          <h1 className="mt-2 overflow-hidden text-ellipsis whitespace-nowrap text-[clamp(1.9rem,4vw,3.8rem)] font-black leading-none text-text-primary">
            {result.mainCopy || result.readingType.headline}
          </h1>
          <div className="mt-4 flex justify-center gap-2">
            {(result.physiognomy.keywords ?? []).slice(0, 5).map((keyword) => (
              <span key={keyword} className="rounded-full border border-accent-info/25 bg-accent-info/10 px-3 py-1 text-xs font-black text-accent-info">
                {keyword}
              </span>
            ))}
          </div>
        </div>

        <ResultFaceStage displayName={displayName} faceImageUrl={faceImageUrl} />

        <div className="absolute bottom-[10.5rem] left-6 top-[10.5rem] z-20 grid w-[min(560px,32vw)] content-start gap-3 overflow-y-auto pr-1">
          {leftCards.map((card, index) => (
            <ResultAnalysisCard key={card.title} card={card} delayIndex={index * 2} />
          ))}
        </div>

        <div className="absolute bottom-[10.5rem] right-6 top-[10.5rem] z-20 grid w-[min(560px,32vw)] content-start gap-3 overflow-y-auto pl-1">
          {rightCards.map((card, index) => (
            <ResultAnalysisCard key={card.title} card={card} delayIndex={index * 2 + 1} />
          ))}
        </div>

        <section className="result-final-reveal glass-panel absolute bottom-5 left-1/2 z-30 w-[min(780px,64vw)] -translate-x-1/2 rounded-2xl p-4">
          <p className="text-xs font-black uppercase tracking-[0.16em] text-accent-info">§11 FINAL ASSESSMENT</p>
          <h2 className="mt-2 truncate text-2xl font-black text-text-primary">{result.readingType.displayName}</h2>
          <p className="mt-2 max-h-12 overflow-hidden text-sm font-semibold leading-6 text-text-muted">
            {name}은 {calculation ? `${calculation.dayMaster.label} 일간, ${calculation.dominantElementLabels.join("·")} 기운이 강한 흐름` : "생년월일 리듬"}과 얼굴 균형 신호가 같이 잡힌 타입입니다. {result.physiognomy.summary}
          </p>
          <div className="mt-3 flex flex-wrap gap-2">
            <a href="#books" className="inline-flex h-11 items-center justify-center gap-2 rounded-lg border border-accent-info/40 bg-accent-info/20 px-4 text-sm font-black text-text-primary transition hover:bg-accent-info/25">
              <Library className="h-4 w-4" aria-hidden="true" />
              다음 섹션 보기
            </a>
            <span className="inline-flex min-h-11 items-center gap-2 rounded-lg border border-border bg-black/25 px-4 text-xs font-bold leading-5 text-text-faint">
              <ShieldCheck className="h-4 w-4 text-accent-info" aria-hidden="true" />
              본 분석은 흥미용 해석이며, 의학적 소견이나 절대 평가가 아닙니다.
            </span>
          </div>
        </section>
      </section>

      <section id="books" className="mx-auto grid w-full max-w-7xl gap-5 px-5 py-10 md:px-8 md:py-14">
        <div className="glass-panel rounded-2xl p-5 md:p-7">
          <p className="text-xs font-black uppercase tracking-[0.16em] text-accent-warn">FINAL CURATION</p>
          <h2 className="mt-2 text-3xl font-black text-text-primary">지금 {name}에게 필요한 책</h2>
          <p className="mt-3 max-w-3xl text-sm font-semibold leading-6 text-text-muted">
            관상 리포트와 사주 리듬을 끝까지 돌려본 뒤, 마지막으로 도서관에서 바로 찾을 만한 후보만 골랐습니다.
          </p>
          <ul className="mt-5 grid gap-2 md:grid-cols-3">
            {result.readingNeeds.map((need) => (
              <li key={need} className="rounded-lg border border-accent-info/20 bg-accent-info/10 px-4 py-3 text-sm font-black leading-6 text-text-primary">
                {need}
              </li>
            ))}
          </ul>
          <div className="mt-5 grid gap-4">
            {result.recommendations.map((book, index) => (
              <BookRecommendationCard key={`${book.bookId}-${index}`} book={book} index={index} />
            ))}
          </div>
        </div>
      </section>
    </main>
  );
}

type ResultCard = {
  eyebrow: string;
  title: string;
  text: string;
  gauges?: Array<{ label: string; value: number; comment?: string }>;
  facts?: string[];
};

function ResultFaceStage({ displayName, faceImageUrl }: { displayName: string; faceImageUrl: string | null }) {
  const name = honorific(displayName);
  const [imageFailed, setImageFailed] = useState(false);
  const shouldShowImage = Boolean(faceImageUrl && !imageFailed);

  return (
    <div className="pointer-events-none absolute inset-0 z-10 grid place-items-center px-[34vw] pt-20">
      <div className="relative aspect-[4/5] w-[min(430px,30vw)] overflow-hidden rounded-[2rem] border border-white/15 bg-black/28 shadow-2xl shadow-black/50">
        {shouldShowImage ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={faceImageUrl ?? ""} alt={`${name} 얼굴 분석 이미지`} className="h-full w-full object-cover opacity-90" onError={() => setImageFailed(true)} />
        ) : (
          <div className="flex h-full flex-col items-center justify-center gap-4 px-6 text-center">
            <CameraOff className="h-10 w-10 text-accent-info" aria-hidden="true" />
            <p className="max-w-sm text-base font-black leading-7 text-text-primary">얼굴 이미지는 24시간 이후 삭제됐어요.</p>
          </div>
        )}
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_42%,transparent_0,transparent_42%,rgb(0_0_0_/_0.45)_100%)]" />
        {FACE_MARKERS.map((marker, index) => (
          <span
            key={`${marker.x}-${marker.y}`}
            className="absolute h-2.5 w-2.5 -translate-x-1/2 -translate-y-1/2 rounded-full bg-white/85 shadow-[0_0_22px_rgb(141_222_215_/_0.75)]"
            style={{ left: `${marker.x}%`, top: `${marker.y}%`, animationDelay: `${index * 90}ms` }}
          />
        ))}
      </div>
    </div>
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

function ResultAnalysisCard({ card, delayIndex }: { card: ResultCard; delayIndex: number }) {
  return (
    <article className="result-card-reveal glass-panel relative overflow-hidden rounded-xl p-4" style={{ animationDelay: `${delayIndex * 230}ms` }}>
      <button type="button" className="mb-3 flex w-full items-center justify-between gap-4 text-left" aria-expanded="true">
        <span className="flex min-w-0 items-center gap-2">
          <span className="h-6 w-1 shrink-0 rounded-full bg-accent-info" />
          <span className="truncate text-xs font-black uppercase tracking-[0.16em] text-text-faint">{card.eyebrow}</span>
        </span>
        <ChevronDown className="h-4 w-4 rotate-180 text-text-faint" aria-hidden="true" />
      </button>
      <h3 className="mb-2 text-lg font-black leading-tight text-text-primary">{card.title}</h3>
      {card.facts ? (
        <ul className="mb-3 grid gap-1.5">
          {card.facts.map((fact) => (
            <li key={fact} className="rounded-md border border-accent-info/20 bg-accent-info/10 px-3 py-2 text-xs font-bold leading-5 text-accent-info">
              {fact}
            </li>
          ))}
        </ul>
      ) : null}
      {card.gauges ? (
        <div className="grid gap-2">
          {card.gauges.map((gauge) => (
            <MetricGauge key={gauge.label} label={gauge.label} value={gauge.value} comment={gauge.comment} />
          ))}
        </div>
      ) : (
        <p className="max-h-[132px] overflow-y-auto pr-1 text-sm font-semibold leading-6 text-text-muted">{card.text}</p>
      )}
    </article>
  );
}

function MetricGauge({ label, value, comment }: { label: string; value: number; comment?: string }) {
  const safeValue = Math.max(0, Math.min(100, value));

  return (
    <div className="rounded-lg border border-white/10 bg-black/22 px-3 py-2.5">
      <div className="mb-2 flex items-center justify-between gap-3">
        <span className="inline-flex items-center gap-2 text-xs font-black text-text-muted">
          <Activity className="h-3.5 w-3.5 text-accent-info" aria-hidden="true" />
          {label}
        </span>
        <span className="text-base font-black tabular-nums text-text-primary">{Math.round(safeValue)}</span>
      </div>
      <div className="h-1.5 overflow-hidden rounded-full bg-white/10">
        <div className="h-full rounded-full bg-accent-info" style={{ width: `${safeValue}%` }} />
      </div>
      {comment ? <p className="mt-2 text-xs font-medium leading-5 text-text-faint">{comment}</p> : null}
    </div>
  );
}

function buildResultAnalysisCards(result: LibraryAnalysisResult): ResultCard[] {
  const calculation = result.saju.calculation;

  return [
    { eyebrow: "§1 FACIAL GEOMETRY", title: "얼굴 비율·대칭성", text: `${result.geometry.symmetry} ${result.geometry.goldenRatio} ${result.geometry.faceShape}` },
    { eyebrow: "§2 FOREHEAD", title: "이마", text: `${result.parts.forehead.metricsText} ${result.parts.forehead.comment}` },
    { eyebrow: "§3 EYES", title: "눈", text: `${result.parts.eyes.metricsText} ${result.parts.eyes.comment}` },
    { eyebrow: "§4 NOSE", title: "코", text: `${result.parts.nose.metricsText} ${result.parts.nose.comment}` },
    { eyebrow: "§5 MOUTH", title: "입", text: `${result.parts.mouth.metricsText} ${result.parts.mouth.comment}` },
    { eyebrow: "§6 JAW", title: "턱", text: `${result.parts.jaw.metricsText} ${result.parts.jaw.comment}` },
    { eyebrow: "§7 SKIN", title: "피부·분위기", text: `${result.parts.skin.metricsText} ${result.parts.skin.comment}` },
    {
      eyebrow: "§8 INDEX",
      title: "인상 지표",
      text: "",
      gauges: [
        { label: "호감도", value: result.scores.likability, comment: result.scores.comments[0] },
        { label: "신뢰감", value: result.scores.trust, comment: result.scores.comments[1] },
        { label: "대칭성", value: result.scores.symmetry, comment: result.scores.comments[2] },
        { label: "균형감", value: result.scores.balance, comment: result.scores.comments[3] },
      ],
    },
    {
      eyebrow: "§9 PHYSIOGNOMY",
      title: "관상 해석",
      text: `${result.physiognomy.summary} 강하게 보이는 신호: ${result.physiognomy.strengths.join(" ")} 조심하면 좋은 흐름: ${result.physiognomy.cautions.join(" ")}`,
    },
    {
      eyebrow: "§10 SAJU RHYTHM",
      title: "사주 리듬",
      text: `${result.saju.elementBalance} ${result.saju.currentFlow} ${result.saju.strength} ${result.saju.advice}`,
      facts: calculation?.facts,
    },
  ];
}

function ReportPanel({ eyebrow, title, children }: { eyebrow: string; title: string; children: ReactNode }) {
  return (
    <section className="glass-panel rounded-2xl p-5 md:p-6">
      <p className="text-xs font-black uppercase tracking-[0.16em] text-accent-warn">{eyebrow}</p>
      <h2 className="mt-2 text-2xl font-black text-text-primary">{title}</h2>
      <div className="mt-5">{children}</div>
    </section>
  );
}

function TextBlock({ label, text }: { label: string; text: string }) {
  return (
    <div className="rounded-lg border border-border bg-bg-card/70 px-4 py-3">
      <p className="text-xs font-black uppercase tracking-[0.12em] text-text-faint">{label}</p>
      <p className="mt-2 text-sm font-semibold leading-6 text-text-muted">{text}</p>
    </div>
  );
}

function PartCard({ title, part }: { title: string; part: DetailComment }) {
  return (
    <article className="rounded-lg border border-border bg-bg-card/70 p-4">
      <h3 className="text-lg font-black text-text-primary">{title}</h3>
      <p className="mt-2 text-xs font-bold leading-5 text-accent-info">{part.metricsText}</p>
      <p className="mt-3 text-sm font-semibold leading-6 text-text-muted">{part.comment}</p>
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
      {items.map(([label, value]) => (
        <div key={label} className="rounded-lg border border-border bg-bg-card/70 p-3">
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
        </div>
      ))}
      <ul className="grid gap-2 pt-2">
        {scores.comments.slice(0, 5).map((comment) => (
          <li key={comment} className="text-sm font-semibold leading-6 text-text-muted">
            {comment}
          </li>
        ))}
      </ul>
    </div>
  );
}

function KeywordRow({ values }: { values: string[] }) {
  return (
    <div className="flex flex-wrap gap-2">
      {values.map((value) => (
        <span key={value} className="rounded-full border border-accent-info/25 bg-accent-info/10 px-3 py-1 text-xs font-black text-accent-info">
          {value}
        </span>
      ))}
    </div>
  );
}

function TwoColumnList({ leftTitle, leftValues, rightTitle, rightValues }: { leftTitle: string; leftValues: string[]; rightTitle: string; rightValues: string[] }) {
  return (
    <div className="mt-5 grid gap-3 md:grid-cols-2">
      <TextList title={leftTitle} values={leftValues} />
      <TextList title={rightTitle} values={rightValues} />
    </div>
  );
}

function TextList({ title, values }: { title: string; values: string[] }) {
  return (
    <div className="rounded-lg border border-border bg-bg-card/70 p-4">
      <h3 className="text-sm font-black text-text-primary">{title}</h3>
      <ul className="mt-3 grid gap-2">
        {values.map((value) => (
          <li key={value} className="text-sm font-semibold leading-6 text-text-muted">
            {value}
          </li>
        ))}
      </ul>
    </div>
  );
}

function withResultFallback(result: LibraryAnalysisResult): LibraryAnalysisResult {
  const oldResult = result as Partial<LibraryAnalysisResult>;
  const physiognomySummary = oldResult.physiognomySummary ?? "얼굴 비율과 인상 신호를 바탕으로 관상 리포트를 구성했습니다.";
  const sajuSummary = oldResult.sajuSummary ?? "생년월일 리듬을 현재 컨디션 흐름과 함께 해석했습니다.";

  return {
    ...result,
    mainCopy: oldResult.mainCopy ?? oldResult.readingType?.headline ?? "관상 리포트 도착",
    geometry: oldResult.geometry ?? {
      symmetry: "좌우 중심축과 눈·입꼬리 기준의 균형을 확인했습니다.",
      goldenRatio: "얼굴 폭과 높이 비율에서 전체 인상 균형을 읽었습니다.",
      thirds: "상안·중안·하안의 분포로 사고/실행/표현 흐름을 나눠봤습니다.",
      fifths: "오등분 기준으로 눈 사이 간격과 얼굴 폭의 안정감을 비교했습니다.",
      faceShape: "전체 윤곽은 인상 강도와 부드러움이 같이 보이는 타입입니다.",
    },
    parts: oldResult.parts ?? {
      forehead: { metricsText: "이마 면적과 눈썹 라인 기준", comment: "계획을 세우는 힘이 보이지만, 가끔 머릿속 회의가 길어질 수 있습니다." },
      eyes: { metricsText: "눈매 각도와 좌우 차이 기준", comment: "관찰력이 빠르고 표정 변화가 생각보다 솔직하게 드러나는 편입니다." },
      nose: { metricsText: "콧대 길이와 폭 기준", comment: "추진력은 있는데 시작 전 계산이 한 번 들어가는 타입입니다." },
      mouth: { metricsText: "입술 비율과 입꼬리 기준", comment: "말을 아끼다가 핵심에서 꽤 선명하게 표현하는 흐름입니다." },
      jaw: { metricsText: "턱선과 하관 안정감 기준", comment: "버티는 힘은 있지만 피로가 쌓이면 표정에 바로 티가 날 수 있습니다." },
      skin: { metricsText: "화면 밝기와 전체 인상 기준", comment: "컨디션 신호가 얼굴 분위기에 빨리 반영되는 편입니다." },
    },
    scores: oldResult.scores ?? {
      likability: 78,
      trust: 76,
      symmetry: 74,
      balance: 77,
      attractiveness: 75,
      comments: ["전반적인 인상 균형은 안정적입니다.", "눈 주변 신호가 리포트의 핵심입니다.", "하관은 버티는 힘 쪽으로 읽힙니다.", "표정 변화가 컨디션을 빠르게 드러냅니다.", "관상 키워드는 집중과 재정렬입니다."],
    },
    physiognomy: oldResult.physiognomy ?? {
      keywords: ["집중", "재정렬", "관찰력"],
      summary: physiognomySummary,
      strengths: ["상황을 빠르게 읽고 핵심을 좁히는 힘", "조용히 버티다가 필요한 순간 움직이는 실행력"],
      cautions: ["생각이 길어지면 시작이 늦어질 수 있음", "컨디션 저하가 표정에 바로 드러날 수 있음"],
    },
    saju: oldResult.saju ?? {
      keywords: ["리듬", "균형", "회복"],
      elementBalance: sajuSummary,
      currentFlow: "지금은 속도를 더 내기보다 방향을 다듬는 흐름이 강합니다.",
      strength: "한 번 꽂히면 오래 파고드는 지속력이 강점입니다.",
      advice: "루틴을 작게 쪼개면 기운이 더 안정적으로 붙습니다.",
    },
    physiognomySummary,
    sajuSummary,
    readingNeeds: oldResult.readingNeeds ?? ["집중 회복", "생각 정리", "실행 리듬"],
    recommendations: oldResult.recommendations ?? [],
  };
}
