"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { FormEvent, InputHTMLAttributes } from "react";
import { useRouter } from "next/navigation";
import { ArrowRight, Camera, CheckCircle2, Loader2, RefreshCcw, ScanFace } from "lucide-react";
import { BOOK_CATEGORIES } from "@/lib/books/categories";
import { FaceMeshOverlay } from "@/components/analyze/FaceMeshOverlay";
import { captureVideoFrame } from "@/lib/capture/screenshot";
import { averageLandmarks, computeFaceMetrics } from "@/lib/facemesh/metricsCalculator";
import { displayGivenName } from "@/lib/korean/name";
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
const COMPLETED_CARD_REVEAL_INTERVAL_MS = 850;
const CAT_ENTRY_START_DELAY_MS = 1_000;
const CAT_ENTRY_FALLBACK_MS = 12_000;
const CAT_CANVAS_MAX_WIDTH = 960;

const ANALYSIS_CARDS = [
  { title: "§1 FACE GEOMETRY", body: "얼굴 외곽, 상중하안 비율, 중심축을 계측 중." },
  { title: "§2 SYMMETRY MAP", body: "좌우 눈·광대·입꼬리 기준으로 대칭성 편차를 비교 중." },
  { title: "§3 EYES SIGNAL", body: "눈매 각도와 눈 주변 긴장도를 관상 신호로 변환 중." },
  { title: "§4 NOSE FLOW", body: "콧대 길이와 콧방울 폭에서 추진력 패턴을 읽는 중." },
  { title: "§5 MOUTH TONE", body: "입술 비율과 입꼬리 각도로 표현 습관을 분석 중." },
  { title: "§6 JAW BALANCE", body: "턱선, 하관 안정감, 얼굴형 밸런스를 정리 중." },
  { title: "§7 SKIN SIGNAL", body: "화면 밝기와 표정 분위기에서 컨디션 신호를 분리 중." },
  { title: "§8 AESTHETIC INDEX", body: "호감도, 신뢰감, 균형감 지표를 스코어로 환산 중." },
  { title: "§9 SAJU RHYTHM", body: "생년월일 기반 오행 분포와 현재 리듬을 대조 중." },
  { title: "§10 FINAL REPORT", body: "관상과 사주 해석을 한 줄 결론까지 정리 중." },
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
  const startedRef = useRef(false);
  const scanStartedAtRef = useRef<number | null>(null);
  const sampleRef = useRef<Landmark[][]>([]);
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
    startedRef.current = false;
    scanStartedAtRef.current = null;
    sampleRef.current = [];
    setSampleCount(0);
    setDisplayProgress(0);
    setRevealCount(0);
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
        if (!video || video.readyState < 2) throw new Error("카메라 프레임이 아직 덜 올라왔어. 다시 한 번만 가자.");

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
        setAnalysisError(caught instanceof Error ? caught.message : "분석실이 잠깐 삐끗했어. 다시 가보자.");
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

    setRevealCount(0);
    const first = window.setTimeout(() => setRevealCount(1), 280);
    const interval = window.setInterval(() => {
      setRevealCount((count) => Math.min(ANALYSIS_CARDS.length, count + 1));
    }, COMPLETED_CARD_REVEAL_INTERVAL_MS);

    return () => {
      window.clearTimeout(first);
      window.clearInterval(interval);
    };
  }, [completedResult, flow]);

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
  const showFinalCard = flow === "revealing" && completedResult && completedSessionId && revealCount >= ANALYSIS_CARDS.length;

  return (
    <main className="relative h-screen overflow-hidden bg-black text-text-primary">
      <video ref={videoRef} className="absolute inset-0 h-full w-full scale-x-[-1] object-cover opacity-90" muted playsInline autoPlay />
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_44%,transparent_0,transparent_30%,rgb(0_0_0_/_0.34)_68%,rgb(0_0_0_/_0.78)_100%)]" />
      <div className="absolute inset-x-0 top-0 z-20 h-px bg-gradient-to-r from-transparent via-white/20 to-transparent" />
      {flow === "entry" ? <CatGatekeeperOverlay /> : null}
      {flow !== "entry" ? <FaceMeshOverlay result={face.result} /> : null}

      <header className="fixed left-7 top-6 z-30 flex items-center gap-3 rounded-lg border border-border bg-black/[0.45] px-3 py-2.5 text-xs font-bold uppercase tracking-[0.14em] text-text-muted backdrop-blur">
        <span className="grid h-8 w-8 place-items-center rounded-md border border-white/10 bg-white/[0.08] text-lg">猫</span>
        <span>AI 관상가 고양이 / Live Face Scan</span>
      </header>

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
          {flow === "revealing" ? <TopStatus label="관상 리포트 정리 완료" /> : <AnalysisHud flow={flow} displayName={displayName} progress={progress} statusLabel={statusLabel} />}
          <FloatingCards progress={progress} revealCount={revealCount} completedCards={completedCards} />

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
                <Camera className="mx-auto h-10 w-10 text-accent-warn" aria-hidden="true" />
                <h1 className="mt-4 text-2xl font-extrabold text-text-primary">관상 분석실이 잠깐 멈췄어</h1>
                <p className="mt-3 text-sm font-semibold leading-6 text-text-muted">{analysisError}</p>
                <button
                  type="button"
                  onClick={retry}
                  className="mt-6 inline-flex h-12 w-full items-center justify-center gap-2 rounded-lg border border-accent-info/[0.45] bg-accent-info/[0.15] px-5 text-sm font-black text-text-primary transition hover:bg-accent-info/[0.22]"
                >
                  <RefreshCcw className="h-4 w-4" aria-hidden="true" />
                  다시 스캔
                </button>
              </div>
            </div>
          ) : null}
        </>
      )}

      {cameraStatus !== "ready" ? (
        <div className="fixed bottom-8 left-7 z-20 w-[min(390px,calc(100vw-3.5rem))] rounded-xl border border-border bg-black/50 px-4 py-4 text-sm font-semibold text-text-muted shadow-2xl shadow-black/30 backdrop-blur">
          <div className="flex items-start gap-3">
            {cameraStatus === "requesting" ? (
              <Loader2 className="mt-0.5 h-4 w-4 animate-spin text-accent-info" aria-hidden="true" />
            ) : (
              <Camera className="mt-0.5 h-4 w-4 text-accent-info" aria-hidden="true" />
            )}
            <div>
              <p className="font-black text-text-primary">{cameraStatusCopy(cameraStatus)}</p>
              <p className="mt-1 text-xs font-medium leading-5 text-text-faint">{cameraError ?? "브라우저 카메라 권한을 허용하면 실시간 화면이 바로 켜집니다."}</p>
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
  const [birthDate, setBirthDate] = useState("");
  const [favoriteCategory, setFavoriteCategory] = useState<string>(BOOK_CATEGORIES[0]);
  const [consentAccepted, setConsentAccepted] = useState(false);

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const trimmedName = name.trim();
    const trimmedStudentId = studentId.trim();

    if (!trimmedName || !trimmedStudentId || !gender || !birthDate || !favoriteCategory) {
      onError("빈칸 있으면 분석이 삐끗해요. 전부 채워줘.");
      return;
    }
    if (!consentAccepted) {
      onError("동의 체크가 필요해. 고양이도 개인정보 앞에서는 진지해져.");
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
    <section className="fixed bottom-5 right-5 z-30 max-h-[calc(100vh-6rem)] w-[min(500px,calc(100vw-2.5rem))] overflow-y-auto md:bottom-8 md:right-8">
      <form onSubmit={submit} className="glass-panel relative rounded-2xl p-4 md:p-5">
        <div className="mb-2 flex items-center justify-between px-1">
          <div className="flex items-center gap-2 text-sm font-semibold text-text-muted">
            <Camera className="h-4 w-4 text-accent-info" aria-hidden="true" />
            CAMERA INPUT
          </div>
          <div className="text-xs uppercase tracking-[0.16em] text-text-faint">{cameraStatus}</div>
        </div>

        <div className="mb-4 rounded-lg border border-border bg-black/[0.35] px-4 py-2.5">
          <p className="text-xs font-semibold leading-5 text-text-muted">
            <span className="block">정보를 채운 뒤 정면 얼굴이 잡히면 자동 분석됩니다.</span>
            <span className="block">얼굴 이미지는 결과 화면에서 24시간까지만 표시됩니다.</span>
          </p>
        </div>

        <div className="mb-4 flex items-start justify-between gap-4">
          <div>
            <p className="text-sm font-black text-accent-warn">AI 관상가 고양이</p>
            <h1 className="mt-1.5 text-2xl font-black leading-tight text-text-primary md:text-3xl">
              야옹이가 관상 봐드립니다
            </h1>
          </div>
        </div>

        <div className="grid gap-3">
          <DarkInput label="이름" name="name" value={name} placeholder="박영민" autoComplete="name" onChange={(event) => setName(event.target.value)} />
          <DarkInput label="학번(또는 사번)" name="studentId" value={studentId} placeholder="20260000" inputMode="numeric" autoComplete="off" onChange={(event) => setStudentId(event.target.value)} />

          <fieldset className="grid gap-2">
            <legend className="text-sm font-bold text-text-primary">성별</legend>
            <div className="grid grid-cols-2 gap-3">
              {[
                { value: "male" as const, label: "남성" },
                { value: "female" as const, label: "여성" },
              ].map((option) => (
                <button
                  key={option.value}
                  type="button"
                  className={[
                    "min-h-11 rounded-lg border px-4 text-sm font-black transition",
                    gender === option.value
                      ? "border-accent-info bg-accent-info/[0.12] text-text-primary shadow-[0_0_0_1px_rgb(141_222_215_/_0.20)]"
                      : "border-border bg-bg-card/70 text-text-muted hover:border-border-bright hover:bg-bg-card-hover",
                  ].join(" ")}
                  onClick={() => setGender(option.value)}
                >
                  {option.label}
                </button>
              ))}
            </div>
          </fieldset>

          <DarkInput label="생년월일" name="birthDate" type="date" value={birthDate} max={new Date().toISOString().slice(0, 10)} onChange={(event) => setBirthDate(event.target.value)} />

          <label className="grid gap-2 text-sm font-bold text-text-primary" htmlFor="favoriteCategory">
            <span>선호 카테고리</span>
            <select
              id="favoriteCategory"
              name="favoriteCategory"
              value={favoriteCategory}
              className="h-11 rounded-lg border border-border bg-bg-card/70 px-4 text-sm font-bold text-text-primary outline-none transition focus:border-accent-info focus:ring-2 focus:ring-accent-info/25"
              onChange={(event) => setFavoriteCategory(event.target.value)}
            >
              {BOOK_CATEGORIES.map((category) => (
                <option key={category} value={category}>
                  {category}
                </option>
              ))}
            </select>
          </label>

          <label className="flex cursor-pointer items-start gap-3 rounded-lg border border-border bg-bg-card/70 p-3 text-sm text-text-muted transition hover:border-border-bright">
            <input className="mt-1 h-4 w-4 accent-[var(--accent-info)]" type="checkbox" checked={consentAccepted} onChange={(event) => setConsentAccepted(event.target.checked)} />
            <span className="font-medium leading-6">
              개인정보처리방침 및 이용약관 동의
              <span className="mt-1 block text-xs text-text-faint">얼굴 이미지는 24시간 이후 삭제됩니다.</span>
            </span>
          </label>
        </div>

        {error ? (
          <p role="alert" className="mt-4 rounded-lg border border-accent-bad/[0.35] bg-accent-bad/[0.12] px-4 py-3 text-sm font-bold text-accent-bad">
            {error}
          </p>
        ) : null}

        <button
          type="submit"
          className="mt-4 inline-flex h-12 w-full items-center justify-center gap-2 rounded-lg border border-accent-info/40 bg-accent-info/[0.18] px-5 text-sm font-black text-text-primary transition hover:bg-accent-info/25 disabled:cursor-not-allowed disabled:opacity-[0.45]"
          disabled={cameraStatus === "requesting"}
        >
          <ScanFace className="h-5 w-5" aria-hidden="true" />
          내 관상 분석하기
        </button>

        {cameraStatus === "denied" || cameraStatus === "error" ? (
          <button type="button" className="mt-3 w-full text-sm font-bold text-accent-warn underline underline-offset-4" onClick={onRetryCamera}>
            {cameraError ?? "카메라 권한 다시 요청"}
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

function ChromaKeyCatSequence({ className, onPhaseChange }: { className: string; onPhaseChange: (phase: "entering" | "resting") => void }) {
  const entryVideoRef = useRef<HTMLVideoElement>(null);
  const restingVideoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const entryVideo = entryVideoRef.current;
    const restingVideo = restingVideoRef.current;
    const canvas = canvasRef.current;
    const context = canvas?.getContext("2d", { willReadFrequently: true });
    if (!entryVideo || !restingVideo || !canvas || !context) return;

    let animationFrame = 0;
    let stopped = false;
    let lastPaintAt = 0;
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

    const applyBlackKey = (imageData: ImageData) => {
      const pixels = imageData.data;
      const alphaMask = new Uint8Array(imageData.width * imageData.height);

      for (let index = 0; index < pixels.length; index += 4) {
        const red = pixels[index] ?? 0;
        const green = pixels[index + 1] ?? 0;
        const blue = pixels[index + 2] ?? 0;
        const max = Math.max(red, green, blue);
        const min = Math.min(red, green, blue);
        const colorSpread = max - min;

        if (max < 30) {
          pixels[index + 3] = 0;
        } else if (max < 70 && colorSpread < 22) {
          const featheredAlpha = Math.round(((max - 30) / 40) * 255);
          pixels[index + 3] = Math.max(0, Math.min(pixels[index + 3] ?? 255, featheredAlpha));
        }

        const alpha = pixels[index + 3] ?? 255;
        alphaMask[index / 4] = alpha > 12 ? 1 : 0;
      }

      for (let y = 2; y < imageData.height - 2; y += 1) {
        for (let x = 2; x < imageData.width - 2; x += 1) {
          const pixelIndex = y * imageData.width + x;
          if (!alphaMask[pixelIndex]) continue;

          let edgeDistance = 3;
          for (let dy = -2; dy <= 2; dy += 1) {
            for (let dx = -2; dx <= 2; dx += 1) {
              if (dx === 0 && dy === 0) continue;
              const neighborIndex = pixelIndex + dy * imageData.width + dx;
              if (alphaMask[neighborIndex]) continue;
              edgeDistance = Math.min(edgeDistance, Math.max(Math.abs(dx), Math.abs(dy)));
            }
          }

          if (edgeDistance === 3) continue;

          const offset = pixelIndex * 4;
          const red = pixels[offset] ?? 0;
          const green = pixels[offset + 1] ?? 0;
          const blue = pixels[offset + 2] ?? 0;
          const max = Math.max(red, green, blue);
          const min = Math.min(red, green, blue);
          const lowSaturation = max - min < 58;
          const brightHalo = max > 150 && lowSaturation;

          if (edgeDistance <= 1 || (edgeDistance <= 2 && brightHalo)) {
            pixels[offset + 3] = 0;
          } else if (brightHalo) {
            pixels[offset + 3] = Math.round((pixels[offset + 3] ?? 255) * 0.12);
          } else if (edgeDistance <= 2) {
            pixels[offset + 3] = Math.round((pixels[offset + 3] ?? 255) * 0.36);
          } else {
            pixels[offset + 3] = Math.round((pixels[offset + 3] ?? 255) * 0.68);
          }
        }
      }
    };

    function switchToResting() {
      if (phase === "resting" || stopped) return;
      phase = "resting";
      activeVideo = restingVideo!;
      onPhaseChange("resting");
      restingVideo!.currentTime = 0;
      void restingVideo!.play().catch(() => undefined);
    }

    const paint = (timestamp: number) => {
      if (stopped) return;

      if (phase === "entering" && entryVideo.duration > 0 && entryVideo.currentTime >= entryVideo.duration - 0.08) {
        switchToResting();
      }

      if (activeVideo.readyState >= HTMLMediaElement.HAVE_CURRENT_DATA && activeVideo.videoWidth > 0 && timestamp - lastPaintAt >= 32) {
        const { width, height } = resizeCanvas(activeVideo);
        context.clearRect(0, 0, width, height);
        context.drawImage(activeVideo, 0, 0, width, height);

        const imageData = context.getImageData(0, 0, width, height);
        applyBlackKey(imageData);
        context.putImageData(imageData, 0, 0);
        lastPaintAt = timestamp;
      }

      animationFrame = window.requestAnimationFrame(paint);
    };

    const start = () => {
      onPhaseChange("entering");
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
      <video ref={entryVideoRef} className="cat-gatekeeper-source-video" src="/cats/neko1-alpha.webm" muted autoPlay playsInline preload="auto" />
      <video ref={restingVideoRef} className="cat-gatekeeper-source-video" src="/cats/neko2-alpha.webm" muted playsInline preload="auto" loop />
      <canvas ref={canvasRef} className={className} />
    </>
  );
}

function DarkInput(props: InputHTMLAttributes<HTMLInputElement> & { label: string }) {
  const { label, id, name, className = "", ...inputProps } = props;
  const inputId = id ?? name;

  return (
    <label className="grid gap-1.5 text-sm font-bold text-text-primary" htmlFor={inputId}>
      <span>{label}</span>
      <input
        id={inputId}
        name={name}
        className={`h-11 rounded-lg border border-border bg-bg-card/70 px-4 text-sm font-semibold text-text-primary outline-none transition placeholder:text-text-faint focus:border-accent-info focus:ring-2 focus:ring-accent-info/25 ${className}`.trim()}
        {...inputProps}
      />
    </label>
  );
}

function AnalysisHud({ flow, displayName, progress, statusLabel }: { flow: Flow; displayName: string; progress: number; statusLabel: string }) {
  const name = `${displayName || "회원"}님`;

  return (
    <>
      <div className="fixed left-1/2 top-7 z-30 -translate-x-1/2 rounded-md border border-accent-info/[0.35] bg-black/[0.55] px-4 py-2 text-sm font-semibold text-accent-info backdrop-blur">
        {statusLabel}
      </div>

      <section className="fixed bottom-8 left-7 z-20 w-[min(420px,calc(100vw-3.5rem))] rounded-xl border border-border bg-black/50 px-4 py-4 text-sm font-semibold text-text-muted shadow-2xl shadow-black/30 backdrop-blur">
        <div className="mb-3 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            {flow === "submitting" ? (
              <Loader2 className="h-4 w-4 shrink-0 animate-spin text-accent-info" aria-hidden="true" />
            ) : (
              <ScanFace className="h-4 w-4 shrink-0 text-accent-info" aria-hidden="true" />
            )}
            <span>{flow === "submitting" ? `${name}의 관상 리포트 작성 중` : `${name}의 얼굴 신호 수집 중`}</span>
          </div>
          <span className="text-2xl font-black tabular-nums text-text-primary">{Math.max(8, progress)}%</span>
        </div>
        <div className="h-2 overflow-hidden rounded-full bg-white/10">
          <div className="h-full rounded-full bg-accent-info transition-[width] duration-500 ease-out" style={{ width: `${Math.max(8, progress)}%` }} />
        </div>
        <p className="mt-3 text-xs font-medium leading-5 text-text-faint">관상 좌표가 안정화되면 결과 화면으로 바로 넘어갑니다.</p>
      </section>
    </>
  );
}

function TopStatus({ label }: { label: string }) {
  return (
    <div className="fixed left-1/2 top-7 z-30 -translate-x-1/2 rounded-md border border-accent-info/[0.35] bg-black/[0.55] px-4 py-2 text-sm font-semibold text-accent-info backdrop-blur">
      {label}
    </div>
  );
}

type CompletedAnalysisCard = {
  title: string;
  body: string;
  scores?: Array<{ label: string; value: number; comment?: string }>;
};

function FloatingCards({ progress, revealCount, completedCards }: { progress: number; revealCount: number; completedCards: CompletedAnalysisCard[] | null }) {
  const sourceCards = completedCards ?? ANALYSIS_CARDS;
  const visibleCards = sourceCards.slice(0, Math.max(1, revealCount)).map((card, index) => ({
    ...card,
    index,
    progress: completedCards ? 100 : stepProgress(progress, index),
  }));
  const leftCards = visibleCards.filter((card) => card.index % 2 === 0);
  const rightCards = visibleCards.filter((card) => card.index % 2 === 1);

  return (
    <>
      <div className="fixed left-6 top-[104px] z-20 grid w-[min(500px,34vw)] gap-3">
        {leftCards.map((card) => (
          <AnalysisStepCard key={card.title} title={card.title} body={card.body} progress={card.progress} scores={"scores" in card ? card.scores : undefined} />
        ))}
      </div>
      <div className="fixed right-6 top-[104px] z-20 grid w-[min(500px,34vw)] gap-3">
        {rightCards.map((card) => (
          <AnalysisStepCard key={card.title} title={card.title} body={card.body} progress={card.progress} scores={"scores" in card ? card.scores : undefined} />
        ))}
      </div>
    </>
  );
}

function AnalysisStepCard({ title, body, progress, scores }: { title: string; body: string; progress: number; scores?: Array<{ label: string; value: number; comment?: string }> }) {
  const complete = progress >= 100;

  return (
    <article className="glass-panel rounded-xl p-4 transition">
      <div className="mb-2 flex items-center justify-between gap-4">
        <h2 className="text-xs font-black uppercase tracking-[0.16em] text-text-faint">{title}</h2>
        {complete ? <CheckCircle2 className="h-4 w-4 text-accent-info" aria-hidden="true" /> : <Loader2 className="h-4 w-4 animate-spin text-accent-info" aria-hidden="true" />}
      </div>
      {scores ? (
        <div className="grid gap-2">
          {scores.map((score) => (
            <div key={score.label} className="rounded-lg border border-white/10 bg-black/20 px-3 py-2">
              <div className="mb-1.5 flex items-center justify-between gap-3">
                <span className="text-xs font-black text-text-muted">{score.label}</span>
                <span className="text-sm font-black tabular-nums text-text-primary">{Math.round(score.value)}</span>
              </div>
              <div className="h-1.5 overflow-hidden rounded-full bg-white/10">
                <div className="h-full rounded-full bg-accent-info transition-[width] duration-500 ease-out" style={{ width: `${clampInt(score.value, 0, 100)}%` }} />
              </div>
              {score.comment ? <p className="mt-1.5 text-xs font-medium leading-5 text-text-faint">{score.comment}</p> : null}
            </div>
          ))}
        </div>
      ) : (
        <p className="text-sm font-semibold leading-6 text-text-muted">{body}</p>
      )}
      {!scores ? (
        <div className="mt-3 flex items-center gap-3">
          <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-white/10">
            <div className="h-full rounded-full bg-accent-info transition-[width] duration-300 ease-out" style={{ width: `${progress}%` }} />
          </div>
          <span className="w-10 text-right text-xs font-black tabular-nums text-text-primary">{progress}%</span>
        </div>
      ) : null}
    </article>
  );
}

function FinalRevealCard({ displayName, result, onOpenResult }: { displayName: string; result: LibraryAnalysisResult; onOpenResult: () => void }) {
  const name = `${displayName || "회원"}님`;
  const calculation = result.saju.calculation;
  const sajuLine = calculation ? `${calculation.dayMaster.label} 일간, ${calculation.dominantElementLabels.join("·")} 기운이 강한 흐름까지 확인 완료.` : result.saju.currentFlow;

  return (
    <section className="fixed bottom-8 left-1/2 z-30 w-[min(980px,72vw)] -translate-x-1/2">
      <article className="glass-panel rounded-2xl border-accent-info/[0.35] p-5 shadow-2xl shadow-black/40">
        <p className="text-xs font-black uppercase tracking-[0.16em] text-accent-info">§11 FINAL ASSESSMENT</p>
        <h2 className="mt-2 truncate text-2xl font-black text-text-primary">{result.mainCopy}</h2>
        <p className="mt-3 text-sm font-semibold leading-6 text-text-muted">
          {name}의 얼굴 비율, 이목구비 신호, 대칭성, 관상 리듬을 한 번에 정리했어. {sajuLine}
        </p>
        <button
          type="button"
          onClick={onOpenResult}
          className="mt-5 inline-flex h-12 w-full items-center justify-center gap-2 rounded-lg border border-accent-info/45 bg-accent-info/20 px-5 text-sm font-black text-text-primary transition hover:bg-accent-info/30"
        >
          <ArrowRight className="h-4 w-4" aria-hidden="true" />
          결과 페이지로 이동
        </button>
      </article>
    </section>
  );
}

function buildCompletedAnalysisCards(result: LibraryAnalysisResult): CompletedAnalysisCard[] {
  const calculation = result.saju.calculation;
  const sajuIntro = calculation
    ? `${calculation.yearPillar.label}년 ${calculation.monthPillar.label}월 ${calculation.dayPillar.label}일, 일간 ${calculation.dayMaster.label}. 우세 오행은 ${calculation.dominantElementLabels.join(", ")}로 계산됨.`
    : "";

  return [
    { title: "§1 FACE GEOMETRY", body: `${result.geometry.symmetry} ${result.geometry.faceShape}` },
    { title: "§2 SYMMETRY MAP", body: `${result.geometry.goldenRatio} ${result.geometry.thirds} ${result.geometry.fifths}` },
    { title: "§3 EYES SIGNAL", body: `${result.parts.eyes.metricsText} ${result.parts.eyes.comment}` },
    { title: "§4 NOSE FLOW", body: `${result.parts.nose.metricsText} ${result.parts.nose.comment}` },
    { title: "§5 MOUTH TONE", body: `${result.parts.mouth.metricsText} ${result.parts.mouth.comment}` },
    { title: "§6 JAW BALANCE", body: `${result.parts.jaw.metricsText} ${result.parts.jaw.comment}` },
    { title: "§7 SKIN SIGNAL", body: `${result.parts.skin.metricsText} ${result.parts.skin.comment}` },
    {
      title: "§8 AESTHETIC INDEX",
      body: "인상 지표 계산 완료",
      scores: [
        { label: "호감도", value: result.scores.likability, comment: result.scores.comments[0] },
        { label: "신뢰감", value: result.scores.trust, comment: result.scores.comments[1] },
        { label: "대칭성", value: result.scores.symmetry, comment: result.scores.comments[2] },
      ],
    },
    { title: "§9 SAJU RHYTHM", body: `${sajuIntro} ${result.saju.elementBalance} ${result.saju.currentFlow}` },
    { title: "§10 FINAL REPORT", body: `${result.physiognomy.summary} ${result.saju.strength} ${result.saju.advice}` },
  ];
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

  if (centerX < 0.42) return "얼굴을 화면 중앙보다 조금 오른쪽에 맞춰줘";
  if (centerX > 0.58) return "얼굴을 화면 중앙보다 조금 왼쪽에 맞춰줘";
  if (centerY < 0.34) return "얼굴을 화면 중앙보다 조금 아래로 맞춰줘";
  if (centerY > 0.66) return "얼굴을 화면 중앙보다 조금 위로 맞춰줘";
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
  if (flow === "revealing") return "관상 리포트 정리 완료";
  if (flow === "submitting") return "관상 리포트 작성 중";
  if (cameraStatus !== "ready") return "카메라 준비 중";
  if (isModelLoading) return "관상 엔진 로딩 중";
  if (hasFace) return "얼굴 인식 완료, 자동 분석 중";
  return "정면 스캔 대기";
}

function cameraStatusCopy(status: ReturnType<typeof useCamera>["status"]) {
  if (status === "requesting") return "카메라 여는 중";
  if (status === "denied") return "카메라 권한이 막혔어";
  if (status === "error") return "카메라가 삐끗했어";
  return "카메라 준비 중";
}

function apiErrorCopy(code: string | undefined) {
  if (code === "not_enough_books") return "분석 후보 데이터가 부족해. 관리자 데이터를 먼저 확인해야 해.";
  if (code === "invalid_request") return "입력값이 빠졌어. 처음부터 한 번만 다시 가자.";
  if (code === "session_create_failed") return "세션 저장이 실패했어. 잠깐 뒤 다시 시도해줘.";
  return "분석실이 잠깐 삐끗했어. 다시 가보자.";
}

function delay(ms: number) {
  return new Promise((resolve) => window.setTimeout(resolve, ms));
}

function clampInt(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}
