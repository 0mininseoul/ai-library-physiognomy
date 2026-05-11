"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { FormEvent, InputHTMLAttributes } from "react";
import { useRouter } from "next/navigation";
import { ArrowRight, Camera, CheckCircle2, Loader2, RefreshCcw, ScanFace } from "lucide-react";
import { BrandLogo } from "@/components/brand/BrandLogo";
import { BOOK_CATEGORIES } from "@/lib/books/categories";
import { FaceMeshOverlay } from "@/components/analyze/FaceMeshOverlay";
import { ThemeToggle } from "@/components/theme/ThemeToggle";
import { applyConnectedBlackKeyToImageData } from "@/lib/chroma/blackKey";
import { captureVideoFrame } from "@/lib/capture/screenshot";
import { averageLandmarks, computeFaceMetrics } from "@/lib/facemesh/metricsCalculator";
import { displayGivenName, softenFormalPolite } from "@/lib/korean/name";
import { stripHanja } from "@/lib/saju/display";
import { useCamera } from "@/hooks/useCamera";
import { useFaceLandmarker } from "@/hooks/useFaceLandmarker";
import type { Landmark } from "@/types/face";
import type { Gender, LibraryAnalysisResult, StudentInput } from "@/types/session";

type Flow = "entry" | "scanning" | "submitting" | "revealing" | "error";

type AnalyzeResponse = {
  sessionId: string;
  result: LibraryAnalysisResult;
};

const TARGET_SAMPLE_COUNT = 12;
const CAPTURE_SETTLE_MS = 650;
const MIN_ANALYSIS_DURATION_MS = 12_000;
const CARD_REVEAL_INTERVAL_MS = 1_350;
const COMPLETED_CARD_STREAM_INTERVAL_MS = 20;
const COMPLETED_CARD_STREAM_CHARS_PER_TICK = 2;
const COMPLETED_CARD_NEXT_DELAY_MS = 420;
const CAT_ENTRY_START_DELAY_MS = 2_000;
const CAT_ENTRY_FALLBACK_MS = 12_000;
const CAT_CANVAS_MAX_WIDTH = 960;
const CAT_VIDEO_SOURCES = {
  entering: { webm: "/cats/neko1-alpha.webm", safari: "/cats/neko1-safari.mp4" },
  resting: { webm: "/cats/neko2-alpha.webm", safari: "/cats/neko2-safari.mp4" },
} as const;

const ANALYSIS_CARDS = [
  { title: "§1 FACE GEOMETRY", body: "얼굴 외곽, 상중하안 비율, 중심축을 계측 중." },
  { title: "§2 EYES SIGNAL", body: "눈매 각도와 눈 주변 긴장도를 관상 신호로 변환 중." },
  { title: "§3 NOSE & MOUTH", body: "코와 입의 비율에서 표현 리듬을 읽는 중." },
  { title: "§4 JAW BALANCE", body: "턱선, 하관 안정감, 얼굴형 밸런스를 정리 중." },
  { title: "§5 IMPRESSION SCORE", body: "호감도, 신뢰감, 균형감 지표를 스코어로 환산 중." },
  { title: "§6 INNER STYLE", body: "관상 신호와 내면 성향 패턴을 조용히 대조 중." },
  { title: "§7 CHEMI MATCH", body: "함께 있을 때 편한 흐름을 하나로 좁히는 중." },
  { title: "§8 FLOW READY", body: "결과 페이지에서 보여줄 핵심 문장만 고르는 중." },
] as const;

export function AnalyzePage() {
  const router = useRouter();
  const [flow, setFlow] = useState<Flow>("entry");
  const [input, setInput] = useState<StudentInput | null>(null);
  const [formError, setFormError] = useState<string | null>(null);
  const [analysisError, setAnalysisError] = useState<string | null>(null);
  const [completedResult, setCompletedResult] = useState<LibraryAnalysisResult | null>(null);
  const [completedSessionId, setCompletedSessionId] = useState<string | null>(null);
  const [sampleCount, setSampleCount] = useState(0);
  const [displayProgress, setDisplayProgress] = useState(0);
  const [revealCount, setRevealCount] = useState(0);
  const [completedRevealFinished, setCompletedRevealFinished] = useState(false);
  const startedRef = useRef(false);
  const scanStartedAtRef = useRef<number | null>(null);
  const sampleRef = useRef<Landmark[][]>([]);
  const completedStreamHandledRef = useRef(-1);
  const completedStreamTimersRef = useRef<number[]>([]);
  const { videoRef, status: cameraStatus, error: cameraError, start: startCamera, stop: stopCamera } = useCamera({ persistGlobal: true });
  const face = useFaceLandmarker(videoRef, flow !== "entry" && cameraStatus === "ready", {
    imageFallback: true,
    imageFallbackAfterMs: 2_500,
  });

  const displayName = useMemo(() => displayGivenName(input?.name ?? ""), [input?.name]);
  const progress = Math.max(displayProgress, Math.min(100, Math.round((sampleCount / TARGET_SAMPLE_COUNT) * 42)));
  const facePositionHint = useMemo(() => getFacePositionHint(face.landmarks), [face.landmarks]);

  useEffect(() => {
    void startCamera();
  }, [startCamera]);

  useEffect(() => {
    return () => stopCamera();
  }, [stopCamera]);

  const resetCapture = useCallback(() => {
    completedStreamTimersRef.current.forEach((timer) => window.clearTimeout(timer));
    completedStreamTimersRef.current = [];
    completedStreamHandledRef.current = -1;
    startedRef.current = false;
    scanStartedAtRef.current = null;
    sampleRef.current = [];
    setSampleCount(0);
    setDisplayProgress(0);
    setRevealCount(0);
    setCompletedRevealFinished(false);
    setCompletedResult(null);
    setCompletedSessionId(null);
  }, []);

  const submitAnalysis = useCallback(
    async (samples: Landmark[][]) => {
      if (!input || !videoRef.current) return;

      try {
        setAnalysisError(null);
        setFlow("submitting");
        await delay(CAPTURE_SETTLE_MS);

        const video = videoRef.current;
        if (!video || video.readyState < 2) throw new Error("카메라 프레임이 아직 안정화되지 않았어요. 다시 한 번만 진행해 주세요.");

        const selectedSamples = samples.length > 0 ? samples : sampleRef.current;
        const landmarks = averageLandmarks(selectedSamples.slice(-TARGET_SAMPLE_COUNT));
        const metrics = computeFaceMetrics(landmarks);
        const imageBase64 = captureVideoFrame(video);

        const elapsed = scanStartedAtRef.current ? Date.now() - scanStartedAtRef.current : 0;
        const minimumDelay = delay(Math.max(0, MIN_ANALYSIS_DURATION_MS - elapsed));
        const request = fetch("/api/analyze", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ input, landmarks, metrics, imageBase64 }),
        }).then(async (res) => {
          const payload = await res.json();
          if (!res.ok) throw new Error(apiErrorCopy(payload?.error));
          return payload as AnalyzeResponse;
        });
        const [payload] = await Promise.all([request, minimumDelay]);

        setCompletedResult(payload.result);
        setCompletedSessionId(payload.sessionId);
        setDisplayProgress(100);
        setRevealCount(0);
        setFlow("revealing");
      } catch (caught) {
        startedRef.current = false;
        setAnalysisError(caught instanceof Error ? caught.message : "분석실이 잠시 멈췄어요. 다시 시도해 주세요.");
        setFlow("error");
      }
    },
    [input, videoRef],
  );

  useEffect(() => {
    if (flow !== "scanning" || startedRef.current || !face.landmarks) return;

    const nextSamples = [...sampleRef.current.slice(-(TARGET_SAMPLE_COUNT - 1)), face.landmarks];
    sampleRef.current = nextSamples;
    setSampleCount(nextSamples.length);

    if (nextSamples.length >= TARGET_SAMPLE_COUNT) {
      startedRef.current = true;
      void submitAnalysis(nextSamples);
    }
  }, [face.landmarks, flow, submitAnalysis]);

  useEffect(() => {
    if (flow !== "scanning" && flow !== "submitting") return;
    if (!scanStartedAtRef.current) scanStartedAtRef.current = Date.now();

    const update = () => {
      const elapsed = Date.now() - (scanStartedAtRef.current ?? Date.now());
      const timedProgress = Math.min(96, Math.max(8, Math.round((elapsed / MIN_ANALYSIS_DURATION_MS) * 96)));
      setDisplayProgress(timedProgress);
      setRevealCount(Math.min(ANALYSIS_CARDS.length, Math.max(1, Math.floor(elapsed / CARD_REVEAL_INTERVAL_MS) + 1)));
    };

    update();
    const interval = window.setInterval(update, 180);
    return () => window.clearInterval(interval);
  }, [flow]);

  useEffect(() => {
    if (flow !== "revealing" || !completedResult) return;

    completedStreamTimersRef.current.forEach((timer) => window.clearTimeout(timer));
    completedStreamTimersRef.current = [];
    completedStreamHandledRef.current = -1;
    setCompletedRevealFinished(false);
    setRevealCount(0);
    const first = window.setTimeout(() => setRevealCount(1), 280);

    return () => {
      window.clearTimeout(first);
      completedStreamTimersRef.current.forEach((timer) => window.clearTimeout(timer));
      completedStreamTimersRef.current = [];
    };
  }, [completedResult, flow]);

  const handleCompletedCardStreamComplete = useCallback((index: number) => {
    if (completedStreamHandledRef.current >= index) return;
    completedStreamHandledRef.current = index;

    const timer = window.setTimeout(() => {
      if (index < ANALYSIS_CARDS.length - 1) {
        setRevealCount(index + 2);
      } else {
        setCompletedRevealFinished(true);
      }
    }, COMPLETED_CARD_NEXT_DELAY_MS);
    completedStreamTimersRef.current.push(timer);
  }, []);

  function handleStart(nextInput: StudentInput) {
    setInput(nextInput);
    setFormError(null);
    setAnalysisError(null);
    setCompletedResult(null);
    setCompletedSessionId(null);
    resetCapture();
    scanStartedAtRef.current = Date.now();
    setDisplayProgress(8);
    setRevealCount(1);
    setFlow("scanning");
    if (cameraStatus === "idle" || cameraStatus === "denied" || cameraStatus === "error") void startCamera();
  }

  function retry() {
    setAnalysisError(null);
    resetCapture();
    setFlow("scanning");
    void startCamera();
  }

  const statusLabel =
    flow === "entry" ? getStatusLabel({ flow, cameraStatus, isModelLoading: face.isLoading, hasFace: Boolean(face.landmarks) }) : facePositionHint ?? getStatusLabel({ flow, cameraStatus, isModelLoading: face.isLoading, hasFace: Boolean(face.landmarks) });
  const completedCards = useMemo(() => (completedResult ? buildCompletedAnalysisCards(completedResult) : null), [completedResult]);
  const showFinalCard = flow === "revealing" && completedResult && completedSessionId && completedRevealFinished;

  return (
    <main className={["relative h-screen overflow-hidden bg-bg-primary text-text-primary", flow !== "entry" ? "analysis-stage" : ""].join(" ")}>
      <video
        ref={videoRef}
        className="live-camera-feed pointer-events-none absolute inset-0 h-full w-full scale-x-[-1] object-cover opacity-100"
        muted
        playsInline
        autoPlay
        controls={false}
        disablePictureInPicture
        controlsList="nodownload nofullscreen noremoteplayback"
      />
      <div className={flow === "entry" ? "camera-entry-vignette absolute inset-0" : "camera-scan-vignette absolute inset-0"} />
      <div className="absolute inset-x-0 top-0 z-20 h-px bg-gradient-to-r from-transparent via-white/20 to-transparent" />
      {flow === "entry" ? <CatGatekeeperOverlay /> : null}
      {flow !== "entry" ? <FaceMeshOverlay result={face.result} /> : null}

      {flow === "entry" ? (
        <>
          <header className="entry-brand-header fixed left-7 top-6 z-30 flex h-14 items-center gap-4 rounded-xl px-4 text-[0.94rem] font-black uppercase tracking-[0.03em] max-md:left-4">
            <span className="entry-brand-mark grid h-10 w-10 shrink-0 place-items-center rounded-lg">
              <BrandLogo className="h-10 w-10 object-contain" />
            </span>
            <span className="whitespace-nowrap">AI 관상가 고양이 / Live Face Scan</span>
          </header>
        </>
      ) : (
        <header className="fixed left-7 top-6 z-30 flex h-12 items-center gap-3 rounded-lg border border-border bg-bg-card/65 px-3 text-xs font-bold uppercase tracking-[0.14em] text-text-muted shadow-glass backdrop-blur">
          <span className="grid h-8 w-8 place-items-center rounded-md border border-border bg-bg-card/70">
            <BrandLogo className="h-8 w-8 object-contain" />
          </span>
          <span>AI 관상가 고양이 / Live Face Scan</span>
        </header>
      )}

      {flow === "entry" ? (
        <EntryModal
          cameraStatus={cameraStatus}
          cameraError={cameraError}
          error={formError}
          onError={setFormError}
          onStart={handleStart}
          onRetryCamera={() => void startCamera()}
        />
      ) : (
        <>
          {flow === "revealing" ? <TopStatus label="야옹이가 관상 좌표를 유심히 보고 있어요" /> : <AnalysisHud flow={flow} displayName={displayName} progress={progress} statusLabel={statusLabel} />}
          <FloatingCards
            progress={progress}
            revealCount={revealCount}
            completedCards={completedCards}
            activeCompletedIndex={completedCards && !completedRevealFinished ? Math.max(0, revealCount - 1) : null}
            finalCardVisible={Boolean(showFinalCard)}
            onCompletedCardStreamComplete={handleCompletedCardStreamComplete}
          />

          {showFinalCard ? (
            <FinalRevealCard
              displayName={displayName}
              result={completedResult}
              onOpenResult={() => {
                stopCamera();
                router.push(`/result/${completedSessionId}`);
              }}
            />
          ) : null}

          {analysisError ? (
            <div className="fixed inset-0 z-50 grid place-items-center bg-black/[0.78] px-6">
              <div className="glass-panel max-w-lg rounded-2xl p-8 text-center">
                <Camera className="mx-auto h-10 w-10 text-accent-info" aria-hidden="true" />
                <h1 className="mt-4 text-2xl font-extrabold text-text-primary">관상 분석실이 잠시 멈췄어요</h1>
                <p className="mt-3 text-sm font-semibold leading-6 text-text-muted">{analysisError}</p>
                <button
                  type="button"
                  onClick={retry}
                  className="mt-6 inline-flex h-12 w-full items-center justify-center gap-2 rounded-lg border border-accent-info/[0.45] bg-accent-info/[0.15] px-5 text-sm font-black text-text-primary transition hover:bg-accent-info/[0.22]"
                >
                  <RefreshCcw className="h-4 w-4" aria-hidden="true" />
                  다시 스캔하기
                </button>
              </div>
            </div>
          ) : null}
        </>
      )}

      {cameraStatus !== "ready" ? (
        <div className="fixed bottom-8 left-7 z-20 w-[min(390px,calc(100vw-3.5rem))] rounded-xl border border-border bg-bg-card/75 px-4 py-4 text-sm font-semibold text-text-muted shadow-glass backdrop-blur-xl">
          <div className="flex items-start gap-3">
            {cameraStatus === "requesting" ? (
              <Loader2 className="mt-0.5 h-4 w-4 animate-spin text-accent-info" aria-hidden="true" />
            ) : (
              <Camera className="mt-0.5 h-4 w-4 text-accent-info" aria-hidden="true" />
            )}
            <div>
              <p className="font-black text-text-primary">{cameraStatusCopy(cameraStatus)}</p>
              <p className="mt-1 text-xs font-medium leading-5 text-text-faint">{friendlyCameraError(cameraStatus, cameraError)}</p>
            </div>
          </div>
        </div>
      ) : null}
    </main>
  );
}

function EntryModal({
  cameraStatus,
  cameraError,
  error,
  onError,
  onStart,
  onRetryCamera,
}: {
  cameraStatus: ReturnType<typeof useCamera>["status"];
  cameraError: string | null;
  error: string | null;
  onError: (error: string | null) => void;
  onStart: (input: StudentInput) => void;
  onRetryCamera: () => void;
}) {
  const [name, setName] = useState("");
  const [studentId, setStudentId] = useState("");
  const [gender, setGender] = useState<Gender | "">("");
  const [birthYear, setBirthYear] = useState("2000");
  const [birthMonth, setBirthMonth] = useState("01");
  const [birthDay, setBirthDay] = useState("01");
  const [favoriteCategory, setFavoriteCategory] = useState<string>(BOOK_CATEGORIES[0]);
  const [consentAccepted, setConsentAccepted] = useState(false);

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const trimmedName = name.trim();
    const trimmedStudentId = studentId.trim();
    const birthDate = buildBirthDate(birthYear, birthMonth, birthDay);

    if (!trimmedName || !trimmedStudentId || !gender || !birthDate || !favoriteCategory) {
      onError("빈칸이 있으면 고양이 수염 레이더가 흔들려요. 모두 채워 주세요.");
      return;
    }
    if (!consentAccepted) {
      onError("동의 체크가 필요해요. 고양이도 개인정보 앞에서는 진지해집니다.");
      return;
    }

    onStart({
      name: trimmedName,
      studentId: trimmedStudentId,
      gender,
      birthDate,
      favoriteCategory,
      consentAccepted,
    });
  }

  return (
    <section className="fixed bottom-6 right-6 z-30 max-h-[calc(100vh-3rem)] w-[min(420px,calc(100vw-2.5rem))] overflow-y-auto md:right-8">
      <form onSubmit={submit} className="glass-panel relative rounded-2xl px-5 py-4">
        <div className="mb-3 flex items-center justify-between gap-3">
          <div className="min-w-0">
            <div className="flex items-center gap-2 text-sm font-black uppercase tracking-[0.08em] text-text-muted">
              <Camera className="h-4 w-4 text-accent-info" aria-hidden="true" />
              CAMERA INPUT
            </div>
            <div className="mt-1 text-[0.68rem] font-bold uppercase tracking-[0.14em] text-text-faint">{cameraBadgeCopy(cameraStatus)}</div>
          </div>
          <ThemeToggle className="h-10 min-h-10 rounded-lg px-3 text-xs" />
        </div>

        <div className="mb-5 rounded-xl border border-border/70 bg-bg-card/68 px-4 py-3 shadow-[inset_0_1px_0_rgb(255_255_255_/_0.16)]">
          <p className="text-[0.82rem] font-bold leading-5 text-text-muted">
            <span className="block">정보를 채운 뒤 정면 얼굴이 잡히면 자동 분석돼요.</span>
            <span className="block">얼굴 이미지는 결과 화면에서 24시간까지만 표시돼요.</span>
          </p>
        </div>

        <div className="mb-5 flex items-start justify-between gap-4">
          <div>
            <p className="text-sm font-black text-accent-info">AI 관상가 고양이</p>
            <h1 className="mt-1 text-[1.72rem] font-extrabold leading-tight text-text-primary">
              야옹이가 관상 봐드립니다
            </h1>
          </div>
        </div>

        <div className="grid gap-3">
          <div className="grid gap-3 md:grid-cols-[minmax(0,1fr)_minmax(0,1fr)] md:gap-5">
            <DarkInput label="이름" name="name" value={name} placeholder="박영민" autoComplete="name" onChange={(event) => setName(event.target.value)} />
            <DarkInput label="학번(또는 사번)" name="studentId" value={studentId} placeholder="20260000" inputMode="numeric" autoComplete="off" onChange={(event) => setStudentId(event.target.value)} />
          </div>

          <fieldset className="grid gap-2">
            <legend className="text-sm font-black text-text-primary">성별</legend>
            <div className="grid grid-cols-2 gap-3">
              {[
                { value: "male" as const, label: "남성" },
                { value: "female" as const, label: "여성" },
              ].map((option) => (
                <button
                  key={option.value}
                  type="button"
                  className={[
                    "liquid-glass-button min-h-10 rounded-lg border px-4 text-sm font-bold transition",
                    gender === option.value
                      ? "border-accent-info/80 bg-accent-info/[0.16] text-text-primary shadow-[0_0_0_1px_rgb(var(--accent-info-rgb)_/_0.18)]"
                      : "border-border/60 bg-bg-card/82 text-text-muted shadow-[inset_0_1px_0_rgb(255_255_255_/_0.18)] hover:border-border-bright/70 hover:bg-bg-card-hover",
                  ].join(" ")}
                  onClick={() => setGender(option.value)}
                >
                  {option.label}
                </button>
              ))}
            </div>
          </fieldset>

          <BirthDateSelects
            year={birthYear}
            month={birthMonth}
            day={birthDay}
            onYearChange={setBirthYear}
            onMonthChange={setBirthMonth}
            onDayChange={setBirthDay}
          />

          <label className="grid min-w-0 gap-2 text-sm font-black text-text-primary" htmlFor="favoriteCategory">
            <span>선호하는 책 카테고리</span>
            <select
              id="favoriteCategory"
              name="favoriteCategory"
              value={favoriteCategory}
              className="h-11 w-full min-w-0 rounded-lg border border-border/30 bg-bg-card/76 px-4 text-sm font-semibold text-text-primary shadow-[inset_0_1px_0_rgb(255_255_255_/_0.14)] outline-none transition focus:border-accent-info/60 focus:ring-2 focus:ring-accent-info/25"
              onChange={(event) => setFavoriteCategory(event.target.value)}
            >
              {BOOK_CATEGORIES.map((category) => (
                <option key={category} value={category}>
                  {category}
                </option>
              ))}
            </select>
          </label>

          <label className="flex cursor-pointer items-start gap-3 rounded-xl border border-border/30 bg-bg-card/76 p-3 text-sm text-text-muted shadow-[inset_0_1px_0_rgb(255_255_255_/_0.14)] transition hover:bg-bg-card-hover">
            <input className="mt-1 h-4 w-4 accent-[var(--accent-info)]" type="checkbox" checked={consentAccepted} onChange={(event) => setConsentAccepted(event.target.checked)} />
            <span className="font-medium leading-6">
              개인정보처리방침 및 이용약관 동의
              <span className="mt-1 block text-xs text-text-faint">얼굴 이미지는 24시간 이후 삭제돼요.</span>
            </span>
          </label>
        </div>

        {error ? (
          <p role="alert" className="mt-4 rounded-xl border border-accent-info/[0.35] bg-accent-info/[0.12] px-4 py-3 text-sm font-bold text-text-primary">
            {error}
          </p>
        ) : null}

        <button
          type="submit"
          className="liquid-glass-button mt-4 inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-xl border border-accent-info/55 bg-accent-info/[0.24] px-5 py-3 text-sm font-black text-text-primary transition hover:bg-accent-info/[0.32] disabled:cursor-not-allowed disabled:opacity-[0.45]"
          disabled={cameraStatus === "requesting"}
        >
          <ScanFace className="h-5 w-5" aria-hidden="true" />
          내 관상 분석하기
        </button>

        {cameraStatus === "denied" || cameraStatus === "error" ? (
          <button type="button" className="mt-3 w-full text-sm font-bold text-accent-info underline underline-offset-4" onClick={onRetryCamera}>
            카메라 권한 다시 요청
          </button>
        ) : null}
      </form>
    </section>
  );
}

function CatGatekeeperOverlay() {
  const [phase, setPhase] = useState<"entering" | "resting">("entering");
  const [shouldStart, setShouldStart] = useState(false);
  const isEntering = phase === "entering";

  useEffect(() => {
    const timeout = window.setTimeout(() => setShouldStart(true), CAT_ENTRY_START_DELAY_MS);
    return () => window.clearTimeout(timeout);
  }, []);

  return (
    <div className="cat-gatekeeper-stage pointer-events-none fixed inset-0 z-[12] overflow-hidden" aria-hidden="true">
      {shouldStart ? (
        <div className={["cat-gatekeeper-anchor", isEntering ? "cat-gatekeeper-anchor--entering" : "cat-gatekeeper-anchor--resting"].join(" ")} data-cat-phase={phase}>
          <ChromaKeyCatSequence className="cat-gatekeeper-canvas" onPhaseChange={setPhase} />
        </div>
      ) : null}
    </div>
  );
}

function BirthDateSelects({
  year,
  month,
  day,
  onYearChange,
  onMonthChange,
  onDayChange,
}: {
  year: string;
  month: string;
  day: string;
  onYearChange: (value: string) => void;
  onMonthChange: (value: string) => void;
  onDayChange: (value: string) => void;
}) {
  const years = useMemo(() => {
    const currentYear = new Date().getFullYear();
    return Array.from({ length: currentYear - 1949 }, (_, index) => String(currentYear - index));
  }, []);
  const months = useMemo(() => Array.from({ length: 12 }, (_, index) => pad2(index + 1)), []);
  const days = useMemo(() => {
    const maxDay = daysInMonth(Number(year), Number(month));
    return Array.from({ length: maxDay }, (_, index) => pad2(index + 1));
  }, [month, year]);

  useEffect(() => {
    if (!days.includes(day)) onDayChange(days[days.length - 1] ?? "01");
  }, [day, days, onDayChange]);

  return (
    <fieldset className="grid gap-2">
      <legend className="text-sm font-black text-text-primary">생년월일</legend>
      <div className="grid grid-cols-[minmax(0,1.15fr)_minmax(0,0.85fr)_minmax(0,0.85fr)] gap-2">
        <DateSelect label="년도" value={year} values={years} suffix="년" onChange={onYearChange} />
        <DateSelect label="월" value={month} values={months} suffix="월" onChange={onMonthChange} />
        <DateSelect label="일" value={day} values={days} suffix="일" onChange={onDayChange} />
      </div>
    </fieldset>
  );
}

function DateSelect({
  label,
  value,
  values,
  suffix,
  onChange,
}: {
  label: string;
  value: string;
  values: string[];
  suffix: string;
  onChange: (value: string) => void;
}) {
  return (
    <label className="grid min-w-0 gap-1 text-xs font-black uppercase tracking-[0.08em] text-text-faint">
      <select
        aria-label={label}
        value={value}
        className="h-11 w-full min-w-0 rounded-lg border border-border/30 bg-bg-card/76 px-4 text-sm font-semibold text-text-primary shadow-[inset_0_1px_0_rgb(255_255_255_/_0.14)] outline-none transition focus:border-accent-info/60 focus:ring-2 focus:ring-accent-info/25"
        onChange={(event) => onChange(event.target.value)}
      >
        {values.map((nextValue) => (
          <option key={nextValue} value={nextValue}>
            {Number(nextValue)}
            {suffix}
          </option>
        ))}
      </select>
    </label>
  );
}

function ChromaKeyCatSequence({ className, onPhaseChange }: { className: string; onPhaseChange: (phase: "entering" | "resting") => void }) {
  const entryVideoRef = useRef<HTMLVideoElement>(null);
  const restingVideoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [useDirectPlayback, setUseDirectPlayback] = useState(false);
  const [directPhase, setDirectPhase] = useState<"entering" | "resting">("entering");

  useEffect(() => {
    const entryVideo = entryVideoRef.current;
    const restingVideo = restingVideoRef.current;
    const canvas = canvasRef.current;
    const context = canvas?.getContext("2d", { willReadFrequently: true });
    if (!entryVideo || !restingVideo || !canvas || !context) return;

    const directPlayback = isDesktopSafari();
    setUseDirectPlayback(directPlayback);
    const entrySource = selectCatVideoSource("entering", directPlayback);
    const restingSource = selectCatVideoSource("resting", directPlayback);
    if (entryVideo.getAttribute("src") !== entrySource) entryVideo.src = entrySource;
    if (restingVideo.getAttribute("src") !== restingSource) restingVideo.src = restingSource;

    let animationFrame = 0;
    let stopped = false;
    let lastPaintAt = 0;
    let lastPlayAttemptAt = 0;
    let activeVideo = entryVideo;
    let phase: "entering" | "resting" = "entering";

    const resizeCanvas = (video: HTMLVideoElement) => {
      const sourceWidth = video.videoWidth || 1280;
      const sourceHeight = video.videoHeight || 720;
      const width = Math.min(sourceWidth, CAT_CANVAS_MAX_WIDTH);
      const height = Math.round(width * (sourceHeight / sourceWidth));

      if (canvas.width !== width || canvas.height !== height) {
        canvas.width = width;
        canvas.height = height;
      }

      return { width, height };
    };

    function switchToResting() {
      if (phase === "resting" || stopped) return;
      phase = "resting";
      setDirectPhase("resting");
      activeVideo = restingVideo!;
      onPhaseChange("resting");
      restingVideo!.currentTime = 0;
      void restingVideo!.play().catch(() => undefined);
    }

    const paint = (timestamp: number) => {
      if (stopped) return;

      if (activeVideo.paused && !activeVideo.ended && timestamp - lastPlayAttemptAt > 800) {
        lastPlayAttemptAt = timestamp;
        void activeVideo.play().catch(() => undefined);
      }

      if (phase === "entering" && entryVideo.duration > 0 && entryVideo.currentTime >= entryVideo.duration - 0.08) {
        switchToResting();
      }

      if (activeVideo.readyState >= HTMLMediaElement.HAVE_CURRENT_DATA && activeVideo.videoWidth > 0 && timestamp - lastPaintAt >= 32) {
        const { width, height } = resizeCanvas(activeVideo);
        context.clearRect(0, 0, width, height);
        context.drawImage(activeVideo, 0, 0, width, height);

        const imageData = context.getImageData(0, 0, width, height);
        applyConnectedBlackKeyToImageData(imageData);
        context.putImageData(imageData, 0, 0);
        lastPaintAt = timestamp;
      }

      animationFrame = window.requestAnimationFrame(paint);
    };

    const start = () => {
      onPhaseChange("entering");
      setDirectPhase("entering");
      entryVideo.currentTime = 0;
      restingVideo.currentTime = 0;
      void restingVideo.play().then(() => restingVideo.pause()).catch(() => undefined);
      void entryVideo.play().catch(() => undefined);
      animationFrame = window.requestAnimationFrame(paint);
    };
    const fallbackTimeout = window.setTimeout(switchToResting, CAT_ENTRY_FALLBACK_MS);

    entryVideo.loop = false;
    restingVideo.loop = true;
    entryVideo.muted = true;
    restingVideo.muted = true;
    entryVideo.playsInline = true;
    restingVideo.playsInline = true;
    entryVideo.controls = false;
    restingVideo.controls = false;
    entryVideo.disablePictureInPicture = true;
    restingVideo.disablePictureInPicture = true;
    entryVideo.setAttribute("webkit-playsinline", "true");
    restingVideo.setAttribute("webkit-playsinline", "true");
    entryVideo.load();
    restingVideo.load();
    entryVideo.addEventListener("ended", switchToResting);
    if (entryVideo.readyState >= HTMLMediaElement.HAVE_METADATA) {
      start();
    } else {
      entryVideo.addEventListener("loadedmetadata", start, { once: true });
    }

    return () => {
      stopped = true;
      window.clearTimeout(fallbackTimeout);
      window.cancelAnimationFrame(animationFrame);
      entryVideo.removeEventListener("ended", switchToResting);
      entryVideo.removeEventListener("loadedmetadata", start);
      entryVideo.pause();
      restingVideo.pause();
    };
  }, [onPhaseChange]);

  return (
    <>
      <video
        ref={entryVideoRef}
        className={["cat-gatekeeper-source-video", useDirectPlayback && directPhase === "entering" ? "cat-gatekeeper-direct-video" : ""].join(" ")}
        src={CAT_VIDEO_SOURCES.entering.webm}
        muted
        playsInline
        preload="auto"
        tabIndex={-1}
        aria-hidden="true"
        disablePictureInPicture
        controls={false}
        controlsList="nodownload nofullscreen noremoteplayback"
      />
      <video
        ref={restingVideoRef}
        className={["cat-gatekeeper-source-video", useDirectPlayback && directPhase === "resting" ? "cat-gatekeeper-direct-video" : ""].join(" ")}
        src={CAT_VIDEO_SOURCES.resting.webm}
        muted
        playsInline
        preload="auto"
        loop
        tabIndex={-1}
        aria-hidden="true"
        disablePictureInPicture
        controls={false}
        controlsList="nodownload nofullscreen noremoteplayback"
      />
      <canvas ref={canvasRef} className={[className, useDirectPlayback ? "cat-gatekeeper-canvas--hidden" : ""].join(" ")} />
    </>
  );
}

function selectCatVideoSource(phase: keyof typeof CAT_VIDEO_SOURCES, directPlayback = isDesktopSafari()) {
  return directPlayback ? CAT_VIDEO_SOURCES[phase].safari : CAT_VIDEO_SOURCES[phase].webm;
}

function isDesktopSafari() {
  if (typeof navigator === "undefined") return false;
  const ua = navigator.userAgent;
  const vendor = navigator.vendor;
  return /Safari/i.test(ua) && /Apple/i.test(vendor) && !/Chrome|Chromium|CriOS|FxiOS|Edg|OPR/i.test(ua);
}

function DarkInput(props: InputHTMLAttributes<HTMLInputElement> & { label: string }) {
  const { label, id, name, className = "", ...inputProps } = props;
  const inputId = id ?? name;

  return (
    <label className="grid min-w-0 gap-2 text-sm font-black text-text-primary" htmlFor={inputId}>
      <span>{label}</span>
      <input
        id={inputId}
        name={name}
        className={`h-11 w-full min-w-0 rounded-lg border border-border/30 bg-bg-card/76 px-4 text-sm font-semibold text-text-primary shadow-[inset_0_1px_0_rgb(255_255_255_/_0.14)] outline-none transition placeholder:font-semibold placeholder:text-text-faint focus:border-accent-info/60 focus:ring-2 focus:ring-accent-info/25 ${className}`.trim()}
        {...inputProps}
      />
    </label>
  );
}

function AnalysisHud({ flow, displayName, progress, statusLabel }: { flow: Flow; displayName: string; progress: number; statusLabel: string }) {
  const name = `${displayName || "회원"}님`;

  return (
    <>
      <div className="glass-panel fixed left-1/2 top-6 z-30 -translate-x-1/2 rounded-lg px-4 py-2 text-sm font-bold text-accent-info shadow-glass">
        {statusLabel}
      </div>

      <section className="glass-panel fixed bottom-5 left-6 z-20 w-[min(420px,calc(100vw-3rem))] rounded-xl px-4 py-4 text-sm font-semibold text-text-muted shadow-glass">
        <div className="mb-3 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            {flow === "submitting" ? (
              <Loader2 className="h-4 w-4 shrink-0 animate-spin text-accent-info" aria-hidden="true" />
            ) : (
              <ScanFace className="h-4 w-4 shrink-0 text-accent-info" aria-hidden="true" />
            )}
            <span>{flow === "submitting" ? `${name}의 관상 좌표를 고양이 눈으로 읽고 있어요` : `${name}의 얼굴 신호를 차분히 모으고 있어요`}</span>
          </div>
          <span className="text-2xl font-black tabular-nums text-text-primary">{Math.max(8, progress)}%</span>
        </div>
        <div className="h-2 overflow-hidden rounded-full bg-bg-raised/65">
          <div className="h-full rounded-full bg-accent-info transition-[width] duration-500 ease-out" style={{ width: `${Math.max(8, progress)}%` }} />
        </div>
        <p className="mt-3 text-xs font-medium leading-5 text-text-faint">관상 좌표가 안정화되면 결과 화면으로 바로 넘어갑니다.</p>
      </section>
    </>
  );
}

function TopStatus({ label }: { label: string }) {
  return (
    <div className="glass-panel fixed left-1/2 top-6 z-30 -translate-x-1/2 rounded-lg px-4 py-2 text-sm font-bold text-accent-info shadow-glass">
      {label}
    </div>
  );
}

type CompletedAnalysisCard = {
  title: string;
  body: string;
  scores?: Array<{ label: string; value: number; comment?: string }>;
};

function FloatingCards({
  progress,
  revealCount,
  completedCards,
  activeCompletedIndex,
  finalCardVisible,
  onCompletedCardStreamComplete,
}: {
  progress: number;
  revealCount: number;
  completedCards: CompletedAnalysisCard[] | null;
  activeCompletedIndex: number | null;
  finalCardVisible: boolean;
  onCompletedCardStreamComplete: (index: number) => void;
}) {
  const sourceCards = completedCards ?? ANALYSIS_CARDS;
  const isCompletedView = Boolean(completedCards);
  const visibleCards = sourceCards.slice(0, Math.max(1, revealCount)).map((card, index) => ({
    ...card,
    index,
    progress: isCompletedView ? 100 : stepProgress(progress, index),
  }));
  const leftCards = visibleCards.filter((card) => card.index % 2 === 0);
  const rightCards = visibleCards.filter((card) => card.index % 2 === 1);
  const leftRailRef = useRef<HTMLDivElement>(null);
  const rightRailRef = useRef<HTMLDivElement>(null);
  const railBaseClassName = "analysis-card-column fixed z-20 grid w-[min(470px,31vw)] content-start gap-3 overflow-y-auto pr-1";
  const leftRailClassName = [
    railBaseClassName,
    "left-6",
    isCompletedView ? "top-[84px] bottom-5" : "top-[86px] bottom-[8.75rem]",
  ].join(" ");
  const rightRailClassName = [
    railBaseClassName,
    "right-6",
    isCompletedView && finalCardVisible ? "top-[84px] bottom-[15.5rem]" : isCompletedView ? "top-[84px] bottom-5" : "top-[86px] bottom-[8.75rem]",
  ].join(" ");

  useEffect(() => {
    if (!isCompletedView) return;
    for (const rail of [leftRailRef.current, rightRailRef.current]) {
      if (!rail) continue;
      rail.scrollTo({ top: rail.scrollHeight, behavior: "smooth" });
    }
  }, [isCompletedView, visibleCards.length]);

  return (
    <>
      <AnalysisCardConnectors visibleIndexes={visibleCards.map((card) => card.index)} />
      <div ref={leftRailRef} className={leftRailClassName}>
        {leftCards.map((card) => (
          <AnalysisStepCard
            key={card.title}
            index={card.index}
            title={card.title}
            body={card.body}
            progress={card.progress}
            scores={"scores" in card ? card.scores : undefined}
            completedView={isCompletedView}
            isActiveCompleted={isCompletedView && card.index === activeCompletedIndex}
            onCompletedStreamComplete={onCompletedCardStreamComplete}
          />
        ))}
      </div>
      <div ref={rightRailRef} className={rightRailClassName}>
        {rightCards.map((card) => (
          <AnalysisStepCard
            key={card.title}
            index={card.index}
            title={card.title}
            body={card.body}
            progress={card.progress}
            scores={"scores" in card ? card.scores : undefined}
            completedView={isCompletedView}
            isActiveCompleted={isCompletedView && card.index === activeCompletedIndex}
            onCompletedStreamComplete={onCompletedCardStreamComplete}
          />
        ))}
      </div>
    </>
  );
}

const ANALYSIS_CONNECTORS = [
  { fromX: 27, fromY: 24, toX: 50, toY: 32 },
  { fromX: 73, fromY: 24, toX: 50, toY: 44 },
  { fromX: 27, fromY: 36, toX: 43, toY: 46 },
  { fromX: 73, fromY: 36, toX: 50, toY: 53 },
  { fromX: 27, fromY: 48, toX: 50, toY: 64 },
  { fromX: 73, fromY: 48, toX: 50, toY: 73 },
  { fromX: 27, fromY: 60, toX: 54, toY: 48 },
  { fromX: 73, fromY: 60, toX: 50, toY: 58 },
  { fromX: 27, fromY: 72, toX: 46, toY: 35 },
  { fromX: 73, fromY: 72, toX: 50, toY: 68 },
] as const;

function AnalysisCardConnectors({ visibleIndexes }: { visibleIndexes: number[] }) {
  return (
    <svg className="pointer-events-none fixed inset-0 z-[19] h-full w-full" viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden="true">
      {visibleIndexes.map((index) => {
        const connector = ANALYSIS_CONNECTORS[index];
        if (!connector) return null;

        return (
          <g key={index} className="opacity-70">
            <line x1={connector.fromX} y1={connector.fromY} x2={connector.toX} y2={connector.toY} stroke="rgb(var(--accent-info-rgb) / 0.38)" strokeWidth="0.06" />
            <circle cx={connector.fromX} cy={connector.fromY} r="0.18" fill="rgb(var(--accent-info-rgb) / 0.85)" />
            <circle cx={connector.toX} cy={connector.toY} r="0.22" fill="rgb(255 255 255 / 0.88)" />
          </g>
        );
      })}
    </svg>
  );
}

function AnalysisStepCard({
  index,
  title,
  body,
  progress,
  scores,
  completedView,
  isActiveCompleted,
  onCompletedStreamComplete,
}: {
  index: number;
  title: string;
  body: string;
  progress: number;
  scores?: Array<{ label: string; value: number; comment?: string }>;
  completedView: boolean;
  isActiveCompleted: boolean;
  onCompletedStreamComplete: (index: number) => void;
}) {
  const complete = progress >= 100;
  const shouldStream = completedView && isActiveCompleted;
  const { text: displayBody, isComplete: bodyStreamComplete } = useStreamingText(body, shouldStream, COMPLETED_CARD_STREAM_INTERVAL_MS);
  const streamNotifiedRef = useRef(false);

  useEffect(() => {
    if (!completedView || !isActiveCompleted) {
      streamNotifiedRef.current = false;
      return;
    }
    if (!bodyStreamComplete || streamNotifiedRef.current) return;

    streamNotifiedRef.current = true;
    onCompletedStreamComplete(index);
  }, [bodyStreamComplete, completedView, index, isActiveCompleted, onCompletedStreamComplete]);

  return (
    <article className={["glass-panel rounded-xl p-4 transition", completedView ? "min-h-[120px]" : ""].join(" ")}>
      <div className="mb-2 flex items-center justify-between gap-4">
        <h2 className="text-xs font-black uppercase tracking-[0.16em] text-text-primary">{title}</h2>
        {complete ? <CheckCircle2 className="h-4 w-4 text-accent-info" aria-hidden="true" /> : <Loader2 className="h-4 w-4 animate-spin text-accent-info" aria-hidden="true" />}
      </div>
      {scores ? (
        <div>
          <p className="text-sm font-black leading-6 text-text-primary">{displayBody}</p>
          {bodyStreamComplete ? (
            <div className="mt-3 grid gap-2">
              {scores.map((score) => (
                <div key={score.label} className="rounded-lg border border-border/60 bg-bg-card/55 px-3 py-2">
                  <div className="mb-1.5 flex items-center justify-between gap-3">
                    <span className="text-xs font-black text-text-primary">{score.label}</span>
                    <span className="text-sm font-black tabular-nums text-text-primary">{Math.round(score.value)}</span>
                  </div>
                  <div className="h-1.5 overflow-hidden rounded-full bg-bg-raised/65">
                    <div className="h-full rounded-full bg-accent-info transition-[width] duration-700 ease-out" style={{ width: `${clampInt(score.value, 0, 100)}%` }} />
                  </div>
                  {score.comment ? <p className="mt-1.5 text-xs font-bold leading-5 text-text-primary">{cleanAnalysisCopy(score.comment, 58)}</p> : null}
                </div>
              ))}
            </div>
          ) : null}
        </div>
      ) : (
        <p className={["text-sm font-black leading-6 text-text-primary", completedView ? "min-h-[58px]" : ""].join(" ")}>{displayBody}</p>
      )}
      {!scores && !completedView ? (
        <div className="mt-3 flex items-center gap-3">
          <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-bg-raised/65">
            <div className="h-full rounded-full bg-accent-info transition-[width] duration-300 ease-out" style={{ width: `${progress}%` }} />
          </div>
          <span className="w-10 text-right text-xs font-black tabular-nums text-text-primary">{progress}%</span>
        </div>
      ) : null}
    </article>
  );
}

function useStreamingText(text: string, enabled: boolean, intervalMs: number) {
  const [visibleLength, setVisibleLength] = useState(enabled ? 0 : text.length);

  useEffect(() => {
    if (!enabled) {
      setVisibleLength(text.length);
      return;
    }

    setVisibleLength(0);
    const interval = window.setInterval(() => {
      setVisibleLength((length) => {
        const nextLength = Math.min(text.length, length + COMPLETED_CARD_STREAM_CHARS_PER_TICK);
        if (nextLength >= text.length) window.clearInterval(interval);
        return nextLength;
      });
    }, intervalMs);

    return () => window.clearInterval(interval);
  }, [enabled, intervalMs, text]);

  return { text: text.slice(0, visibleLength), isComplete: visibleLength >= text.length };
}

function FinalRevealCard({ displayName, result, onOpenResult }: { displayName: string; result: LibraryAnalysisResult | null; onOpenResult: () => void }) {
  const name = `${displayName || "회원"}님`;
  const dominantLabel = normalizeStyleLabel(result?.innerStyleInsight?.dominantLabel ?? "몰입형 사고");
  const faceSummary = leadWithName(name, result?.physiognomySummary ?? "겉으로는 차분해 보여도 안쪽에서는 생각이 꽤 오래 이어지는 분이에요.", 118);
  const body = [
    faceSummary,
    cleanAnalysisCopy(result?.innerStyleInsight?.dominantDetail ?? result?.sajuSummary ?? "머릿속에 탭이 여러 개 열려 있어도, 중요한 것 하나는 끝까지 붙잡는 쪽이에요.", 118),
    cleanAnalysisCopy(`야옹이 최종 판정은 이거예요. ${dominantLabel} 성향이 선명해서, 말보다 흐름으로 설득하는 타입이에요.`, 118),
  ].join("\n");
  const { text: streamedBody, isComplete } = useStreamingText(body, true, COMPLETED_CARD_STREAM_INTERVAL_MS);

  return (
    <section className="fixed bottom-5 left-1/2 z-30 w-[min(880px,calc(100vw-39rem))] min-w-[34rem] -translate-x-1/2">
      <article className="glass-panel rounded-2xl border-accent-info/[0.35] p-5 shadow-glass">
        <p className="text-xs font-black uppercase tracking-[0.16em] text-accent-info">FINAL ASSESSMENT</p>
        <h2 className="mt-2 text-2xl font-black text-text-primary">{`${name}은 ${dominantLabel} 타입이에요`}</h2>
        <p className="mt-3 whitespace-pre-line text-sm font-semibold leading-6 text-text-primary">{streamedBody}</p>
        {isComplete ? (
          <button
            type="button"
            onClick={onOpenResult}
            className="mt-5 inline-flex h-12 w-full items-center justify-center gap-2 rounded-lg border border-accent-info/45 bg-accent-info/20 px-5 text-sm font-black text-text-primary transition hover:bg-accent-info/30"
          >
            <ArrowRight className="h-4 w-4" aria-hidden="true" />
            결과 페이지로 이동
          </button>
        ) : null}
      </article>
    </section>
  );
}

function buildCompletedAnalysisCards(result: LibraryAnalysisResult): CompletedAnalysisCard[] {
  const innerLabel = normalizeStyleLabel(result.innerStyleInsight?.dominantLabel ?? cleanAnalysisCopy(result.saju.strength, 42));
  const growthLabel = normalizeStyleLabel(result.innerStyleInsight?.growthLabel ?? cleanAnalysisCopy(result.saju.advice, 42));
  const matchTypes = result.chemiInsight?.typeLabel ?? result.romanticMatch.bestTypes.slice(0, 1).join(", ");

  return [
    { title: "§1 FACE GEOMETRY", body: cleanAnalysisCopy(`${result.geometry.symmetry} ${result.geometry.faceShape} 야옹이 확대경 기준으로는 중심선과 얼굴형 리듬을 먼저 봤어요.`, 152) },
    { title: "§2 EYES SIGNAL", body: cleanAnalysisCopy(`${result.parts.eyes.metricsText} ${result.parts.eyes.comment} 눈 신호는 첫인상에서 생각보다 빠르게 읽혀요.`, 152) },
    { title: "§3 NOSE & MOUTH", body: cleanAnalysisCopy(`${result.parts.nose.metricsText} ${result.parts.nose.comment} ${result.parts.mouth.comment}`, 164) },
    { title: "§4 JAW BALANCE", body: cleanAnalysisCopy(`${result.parts.jaw.metricsText} ${result.parts.jaw.comment} 하관은 끝까지 남는 인상이라 야옹이가 꽤 오래 봤어요.`, 152) },
    {
      title: "§5 IMPRESSION SCORE",
      body: "호감도와 신뢰감 신호를 고양이식 점수판으로 정리했어요.",
      scores: [
        { label: "호감도", value: result.scores.likability, comment: result.scores.comments[0] },
        { label: "신뢰감", value: result.scores.trust, comment: result.scores.comments[1] },
        { label: "균형감", value: result.scores.balance, comment: result.scores.comments[3] },
      ],
    },
    { title: "§6 INNER STYLE", body: cleanAnalysisCopy(`${innerLabel} 성향이 가장 또렷하고, ${growthLabel} 쪽은 보완하면 좋아요. ${result.innerStyleInsight?.dominantDetail ?? result.saju.strength}`, 156) },
    { title: "§7 CHEMI MATCH", body: cleanAnalysisCopy(`${matchTypes} 타입과 흐름이 잘 맞아요. ${result.chemiInsight?.why ?? result.romanticMatch.why}`, 156) },
    { title: "§8 FLOW READY", body: cleanAnalysisCopy("야옹이가 결과 화면에서 보여줄 핵심 문장만 골랐어요. 이제 긴 설명보다 바로 읽히는 리포트로 넘어갈 차례예요.", 140) },
  ];
}

function normalizeStyleLabel(input: string) {
  const label = cleanAnalysisCopy(input, 20)
    .replace(/(?:이|가|은|는|을|를)\s*(?:또렷|선명|강함|강한|보완).*$/g, "")
    .replace(/(?:타입|성향|분|쪽)$/g, "")
    .replace(/[.,!?]+$/g, "")
    .trim();

  return label || "몰입형 사고";
}

function leadWithName(name: string, input: string, maxLength: number) {
  const copy = cleanAnalysisCopy(input, maxLength);
  if (copy.startsWith(name) || copy.startsWith(`${name.slice(0, -1)}님`)) return copy;
  return cleanAnalysisCopy(`${name}은 ${copy}`, maxLength);
}

function cleanAnalysisCopy(input: string, maxLength: number) {
  const normalized = stripHanja(input)
    .replace(/피부/g, "전체 인상")
    .replace(/처방전?/g, "추천")
    .replace(/학생/g, "님")
    .replace(/연애/g, "관계")
    .replace(/연인/g, "상대")
    .replace(/상대과/g, "상대와")
    .replace(/데이트/g, "함께하는 시간")
    .replace(/함께하는 시간를/g, "함께하는 시간을")
    .replace(/함께하는 시간가/g, "함께하는 시간이")
    .replace(/근거 더 보기/g, "더보기")
    .replace(/근거/g, "설명")
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
    .replace(/우세한?\s*기운/g, "가장 또렷한 성향")
    .replace(/우세\s*오행/g, "주요 성향")
    .replace(/오행/g, "성향 패턴")
    .replace(/사주/g, "내면 성향")
    .replace(/일간|월주|년주|일주|시주/g, "내면 신호")
    .replace(/기운/g, "성향")
    .replace(/강한\s+깊게 몰입하는 성향/g, "깊게 몰입하는 성향")
    .replace(/강한\s+(탐색|추진|정리|판단)\s*성향/g, "또렷한 $1 성향")
    .replace(/해줘/g, "해 주세요")
    .replace(/했어/g, "했어요")
    .replace(/…|\.\.\./g, "")
    .replace(/\s+/g, " ")
    .trim();
  const softened = softenFormalPolite(normalized);

  if (softened.length <= maxLength) return softened;
  const clipped = softened.slice(0, maxLength);
  const sentenceStops = ["입니다.", "합니다.", "해요.", "예요.", "이에요.", "줘요.", "네요.", "어요.", "아요.", ".", "!", "?"];
  const bestStop = sentenceStops.reduce((best, stop) => {
    const position = clipped.lastIndexOf(stop);
    return position > best ? position + stop.length : best;
  }, -1);

  if (bestStop > Math.floor(maxLength * 0.55)) return clipped.slice(0, bestStop).trim();
  return clipped.replace(/[,\s/·:;]+$/g, "").trim();
}

function stepProgress(overallProgress: number, index: number) {
  const staggeredStart = index * 7;
  return clampInt(Math.round((overallProgress - staggeredStart) * 1.65), 0, 100);
}

function getFacePositionHint(landmarks: Landmark[] | null) {
  if (!landmarks?.length) return null;

  const xs = landmarks.map((point) => point.x);
  const ys = landmarks.map((point) => point.y);
  const centerX = 1 - (Math.min(...xs) + Math.max(...xs)) / 2;
  const centerY = (Math.min(...ys) + Math.max(...ys)) / 2;

  if (centerX < 0.42) return "얼굴을 화면 중앙보다 조금 오른쪽에 맞춰 주세요";
  if (centerX > 0.58) return "얼굴을 화면 중앙보다 조금 왼쪽에 맞춰 주세요";
  if (centerY < 0.34) return "얼굴을 화면 중앙보다 조금 아래로 맞춰 주세요";
  if (centerY > 0.66) return "얼굴을 화면 중앙보다 조금 위로 맞춰 주세요";
  return null;
}

function getStatusLabel({
  flow,
  cameraStatus,
  isModelLoading,
  hasFace,
}: {
  flow: Flow;
  cameraStatus: ReturnType<typeof useCamera>["status"];
  isModelLoading: boolean;
  hasFace: boolean;
}) {
  if (flow === "revealing") return "고양이 관상 노트가 열리고 있어요";
  if (cameraStatus !== "ready") return "카메라 준비 중";
  if (flow === "scanning" || flow === "submitting") return "야옹이가 관상 좌표를 유심히 보고 있어요";
  if (isModelLoading) return "관상 엔진 로딩 중";
  if (hasFace) return "야옹이가 관상 좌표를 유심히 보고 있어요";
  return "정면 스캔 대기";
}

function cameraStatusCopy(status: ReturnType<typeof useCamera>["status"]) {
  if (status === "requesting") return "카메라 여는 중";
  if (status === "denied") return "카메라 권한이 막혀 있어요";
  if (status === "error") return "카메라가 잠시 멈췄어요";
  return "카메라 준비 중";
}

function cameraBadgeCopy(status: ReturnType<typeof useCamera>["status"]) {
  if (status === "requesting") return "요청 중";
  if (status === "ready") return "준비됨";
  if (status === "denied") return "권한 필요";
  if (status === "error") return "오류";
  return "대기";
}

function friendlyCameraError(status: ReturnType<typeof useCamera>["status"], error: string | null) {
  if (status === "denied") return "브라우저 주소창에서 카메라 권한을 허용하면 실시간 화면이 켜져요.";
  if (status === "error") return error?.includes("NotFound") ? "연결된 카메라를 찾지 못했어요." : "카메라가 잠시 멈췄어요. 권한과 연결 상태를 확인해 주세요.";
  return "브라우저 카메라 권한을 허용하면 실시간 화면이 바로 켜져요.";
}

function apiErrorCopy(code: string | undefined) {
  if (code === "not_enough_books") return "분석 후보 데이터가 부족해요. 관리자 데이터를 먼저 확인해 주세요.";
  if (code === "invalid_request") return "입력값이 빠졌어요. 처음부터 한 번만 다시 진행해 주세요.";
  if (code === "session_create_failed") return "세션 저장이 실패했어요. 잠시 뒤 다시 시도해 주세요.";
  return "분석실이 잠시 멈췄어요. 다시 시도해 주세요.";
}

function delay(ms: number) {
  return new Promise((resolve) => window.setTimeout(resolve, ms));
}

function buildBirthDate(year: string, month: string, day: string) {
  const normalized = `${year}-${month}-${day}`;
  const date = new Date(`${normalized}T00:00:00`);
  if (Number.isNaN(date.getTime())) return "";
  if (date > new Date()) return "";
  return normalized;
}

function daysInMonth(year: number, month: number) {
  if (!Number.isFinite(year) || !Number.isFinite(month)) return 31;
  return new Date(year, month, 0).getDate();
}

function pad2(value: number) {
  return String(value).padStart(2, "0");
}

function clampInt(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}
