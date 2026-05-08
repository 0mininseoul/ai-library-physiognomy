"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { FormEvent, InputHTMLAttributes } from "react";
import { useRouter } from "next/navigation";
import { BookOpenCheck, Camera, CheckCircle2, Loader2, RefreshCcw, ScanFace } from "lucide-react";
import { BOOK_CATEGORIES } from "@/lib/books/categories";
import { FaceMeshOverlay } from "@/components/analyze/FaceMeshOverlay";
import { Mascot } from "@/components/mascot/Mascot";
import { captureVideoFrame } from "@/lib/capture/screenshot";
import { averageLandmarks, computeFaceMetrics } from "@/lib/facemesh/metricsCalculator";
import { displayGivenName, particle } from "@/lib/korean/name";
import { useCamera } from "@/hooks/useCamera";
import { useFaceLandmarker } from "@/hooks/useFaceLandmarker";
import type { Landmark } from "@/types/face";
import type { Gender, StudentInput } from "@/types/session";

type Flow = "entry" | "scanning" | "submitting" | "error";

type AnalyzeResponse = {
  sessionId: string;
};

const TARGET_SAMPLE_COUNT = 12;
const CAPTURE_SETTLE_MS = 650;

export function AnalyzePage() {
  const router = useRouter();
  const [flow, setFlow] = useState<Flow>("entry");
  const [input, setInput] = useState<StudentInput | null>(null);
  const [formError, setFormError] = useState<string | null>(null);
  const [analysisError, setAnalysisError] = useState<string | null>(null);
  const [sampleCount, setSampleCount] = useState(0);
  const startedRef = useRef(false);
  const sampleRef = useRef<Landmark[][]>([]);
  const { videoRef, status: cameraStatus, error: cameraError, start: startCamera, stop: stopCamera } = useCamera({ persistGlobal: true });
  const face = useFaceLandmarker(videoRef, cameraStatus === "ready", {
    imageFallback: true,
    imageFallbackAfterMs: 2_500,
  });

  const displayName = useMemo(() => displayGivenName(input?.name ?? ""), [input?.name]);
  const progress = Math.min(100, Math.round((sampleCount / TARGET_SAMPLE_COUNT) * 100));

  useEffect(() => {
    void startCamera();
  }, [startCamera]);

  useEffect(() => {
    return () => stopCamera();
  }, [stopCamera]);

  const resetCapture = useCallback(() => {
    startedRef.current = false;
    sampleRef.current = [];
    setSampleCount(0);
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

        const res = await fetch("/api/analyze", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ input, landmarks, metrics, imageBase64 }),
        });
        const payload = await res.json();
        if (!res.ok) throw new Error(apiErrorCopy(payload?.error));

        stopCamera();
        router.push(`/result/${(payload as AnalyzeResponse).sessionId}`);
      } catch (caught) {
        startedRef.current = false;
        setAnalysisError(caught instanceof Error ? caught.message : "분석실이 잠깐 삐끗했어. 다시 가보자.");
        setFlow("error");
      }
    },
    [input, router, stopCamera, videoRef],
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

  function handleStart(nextInput: StudentInput) {
    setInput(nextInput);
    setFormError(null);
    setAnalysisError(null);
    resetCapture();
    setFlow("scanning");
    if (cameraStatus === "idle" || cameraStatus === "denied" || cameraStatus === "error") void startCamera();
  }

  function retry() {
    setAnalysisError(null);
    resetCapture();
    setFlow("scanning");
    void startCamera();
  }

  const statusLabel = getStatusLabel({ flow, cameraStatus, isModelLoading: face.isLoading, hasFace: Boolean(face.landmarks) });

  return (
    <main className="relative h-screen overflow-hidden bg-black text-text-primary">
      <video ref={videoRef} className="absolute inset-0 h-full w-full scale-x-[-1] object-cover opacity-90" muted playsInline autoPlay />
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_44%,transparent_0,transparent_30%,rgb(0_0_0_/_0.34)_68%,rgb(0_0_0_/_0.78)_100%)]" />
      <div className="absolute inset-x-0 top-0 z-20 h-px bg-gradient-to-r from-transparent via-white/20 to-transparent" />
      <FaceMeshOverlay result={face.result} />

      <header className="fixed left-7 top-6 z-30 flex items-center gap-3 rounded-lg border border-border bg-black/[0.45] px-3 py-2.5 text-xs font-bold uppercase tracking-[0.14em] text-text-muted backdrop-blur">
        <span className="grid h-8 w-8 place-items-center rounded-md border border-white/10 bg-white/[0.08] text-lg">猫</span>
        <span>AI 관상가 고양이 / Live Library Scan</span>
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
          <AnalysisHud flow={flow} displayName={displayName} progress={progress} statusLabel={statusLabel} />
          <FloatingCards flow={flow} progress={progress} favoriteCategory={input?.favoriteCategory ?? "-"} />

          {analysisError ? (
            <div className="fixed inset-0 z-50 grid place-items-center bg-black/[0.78] px-6">
              <div className="glass-panel max-w-lg rounded-2xl p-8 text-center">
                <Mascot variant="retry" size="sm" />
                <h1 className="mt-4 text-2xl font-extrabold text-text-primary">고양이 분석실이 잠깐 멈췄어</h1>
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
      onError("빈칸 있으면 처방전이 삐끗해요. 전부 채워줘.");
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
            입력 완료 후 정면 얼굴이 잡히면 자동 분석됩니다. 얼굴 이미지는 결과 화면에서 24시간까지만 표시됩니다.
          </p>
        </div>

        <div className="mb-4 flex items-start justify-between gap-4">
          <div>
            <p className="text-sm font-black text-accent-bad">AI 관상가 고양이</p>
            <h1 className="mt-1.5 text-2xl font-black leading-tight text-text-primary md:text-3xl">
              관상 찍고, 오늘 대출할 책 처방받기
            </h1>
          </div>
          <Mascot variant="diagnose" size="sm" className="-mt-3 hidden shrink-0 sm:flex" />
        </div>

        <div className="grid gap-3">
          <DarkInput label="이름" name="name" value={name} placeholder="박영민" autoComplete="name" onChange={(event) => setName(event.target.value)} />
          <DarkInput label="학번" name="studentId" value={studentId} placeholder="20260000" inputMode="numeric" autoComplete="off" onChange={(event) => setStudentId(event.target.value)} />

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
                      ? "border-accent-info bg-accent-info/[0.12] text-text-primary shadow-[0_0_0_1px_rgb(125_216_255_/_0.20)]"
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
            <span>선호 독서 카테고리</span>
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
          <BookOpenCheck className="h-5 w-5" aria-hidden="true" />
          입력 완료, 스캔 시작
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
  const name = displayName || "회원";

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
            <span>{flow === "submitting" ? `${particle(name, "to")} 맞는 책 처방전 작성 중` : `${particle(name, "to")} 필요한 책장 신호 수집 중`}</span>
          </div>
          <span className="text-2xl font-black tabular-nums text-text-primary">{flow === "submitting" ? 92 : Math.max(8, progress)}%</span>
        </div>
        <div className="h-2 overflow-hidden rounded-full bg-white/10">
          <div className="h-full rounded-full bg-accent-info transition-[width] duration-500 ease-out" style={{ width: `${flow === "submitting" ? 92 : Math.max(8, progress)}%` }} />
        </div>
        <p className="mt-3 text-xs font-medium leading-5 text-text-faint">관상 좌표가 안정화되면 책 처방전으로 바로 넘어갑니다.</p>
      </section>
    </>
  );
}

function FloatingCards({ flow, progress, favoriteCategory }: { flow: Flow; progress: number; favoriteCategory: string }) {
  const cards = [
    { side: "left", top: "top-[118px]", title: "§1 FACE SIGNAL", body: progress >= 25 ? "얼굴 비율 좌표 수집 완료. 관상 엔진 예열 중." : "이마, 눈매, 턱선 좌표를 잡는 중." },
    { side: "right", top: "top-[150px]", title: "§2 SAJU RHYTHM", body: progress >= 45 ? "생년월일 리듬과 현재 독서 운세를 대조 중." : "사주 리듬 계산 대기 중." },
    { side: "left", top: "bottom-[170px]", title: "§3 LIBRARY MATCH", body: `${favoriteCategory} 취향을 기준으로 책 후보를 압축 중.` },
    { side: "right", top: "bottom-[126px]", title: "§4 PRESCRIPTION", body: flow === "submitting" ? "Gemini가 대출 욕구를 자극하는 문장으로 처방 중." : "얼굴이 고정되면 자동으로 처방전 작성." },
  ] as const;

  return (
    <>
      {cards.map((card) => (
        <article
          key={card.title}
          className={[
            "glass-panel fixed z-20 w-[min(420px,30vw)] rounded-xl p-4 transition",
            card.side === "left" ? "left-7" : "right-7",
            card.top,
          ].join(" ")}
        >
          <div className="mb-2 flex items-center justify-between gap-4">
            <h2 className="text-xs font-black uppercase tracking-[0.16em] text-text-faint">{card.title}</h2>
            {flow === "submitting" ? <Loader2 className="h-4 w-4 animate-spin text-accent-info" aria-hidden="true" /> : <CheckCircle2 className="h-4 w-4 text-accent-info" aria-hidden="true" />}
          </div>
          <p className="text-sm font-semibold leading-6 text-text-muted">{card.body}</p>
        </article>
      ))}
    </>
  );
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
  if (flow === "submitting") return "책 처방전 작성 중";
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
  if (code === "not_enough_books") return "책 후보가 부족해. 관리자 책장을 먼저 채워야 해.";
  if (code === "invalid_request") return "입력값이 빠졌어. 처음부터 한 번만 다시 가자.";
  if (code === "session_create_failed") return "세션 저장이 실패했어. 잠깐 뒤 다시 시도해줘.";
  return "분석실이 잠깐 삐끗했어. 다시 가보자.";
}

function delay(ms: number) {
  return new Promise((resolve) => window.setTimeout(resolve, ms));
}
