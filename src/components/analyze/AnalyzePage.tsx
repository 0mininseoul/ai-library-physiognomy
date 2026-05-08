"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Camera, Loader2, RefreshCw, ScanFace, Sparkles } from "lucide-react";
import { FaceMeshOverlay } from "@/components/analyze/FaceMeshOverlay";
import { EntryPage } from "@/components/analyze/EntryPage";
import { Mascot } from "@/components/mascot/Mascot";
import { Button } from "@/components/ui/Button";
import { captureVideoFrame } from "@/lib/capture/screenshot";
import { averageLandmarks, computeFaceMetrics } from "@/lib/facemesh/metricsCalculator";
import { displayGivenName, particle } from "@/lib/korean/name";
import { useCamera } from "@/hooks/useCamera";
import { useFaceLandmarker } from "@/hooks/useFaceLandmarker";
import type { StudentInput } from "@/types/session";

type Step = "entry" | "camera" | "submitting" | "error";

type AnalyzeResponse = {
  sessionId: string;
};

export function AnalyzePage() {
  const router = useRouter();
  const [step, setStep] = useState<Step>("entry");
  const [studentInput, setStudentInput] = useState<StudentInput | null>(null);
  const [error, setError] = useState<string | null>(null);
  const { videoRef, status: cameraStatus, error: cameraError, start: startCamera, stop: stopCamera } = useCamera();
  const face = useFaceLandmarker(videoRef, step === "camera" && cameraStatus === "ready", {
    imageFallback: true,
    imageFallbackAfterMs: 2_500,
  });

  const displayName = useMemo(() => displayGivenName(studentInput?.name ?? ""), [studentInput?.name]);
  const isSubmitting = step === "submitting";
  const canCapture = step === "camera" && cameraStatus === "ready" && Boolean(face.landmarks);

  useEffect(() => {
    if (step === "camera" && cameraStatus === "idle") {
      void startCamera();
    }
  }, [cameraStatus, startCamera, step]);

  useEffect(() => {
    return () => stopCamera();
  }, [stopCamera]);

  function start(input: StudentInput) {
    setStudentInput(input);
    setError(null);
    setStep("camera");
  }

  async function submitCapture() {
    if (!studentInput || !videoRef.current || !face.landmarks) {
      setError("얼굴 좌표가 아직 덜 잡혔어. 정면으로 한 번만 더 부탁.");
      setStep("error");
      return;
    }

    try {
      setError(null);
      setStep("submitting");
      const landmarks = averageLandmarks([face.landmarks]);
      const metrics = computeFaceMetrics(landmarks);
      const imageBase64 = captureVideoFrame(videoRef.current);

      const res = await fetch("/api/analyze", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ input: studentInput, landmarks, metrics, imageBase64 }),
      });
      const payload = await res.json();
      if (!res.ok) throw new Error(apiErrorCopy(payload?.error));

      stopCamera();
      router.push(`/result/${(payload as AnalyzeResponse).sessionId}`);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "고양이 분석실이 잠깐 삐끗했어. 다시 가보자.");
      setStep("error");
    }
  }

  function retryCamera() {
    setError(null);
    setStep("camera");
    void startCamera();
  }

  if (step === "entry") {
    return <EntryPage onStart={start} />;
  }

  return (
    <main className="min-h-screen bg-paper text-ink">
      <section className="mx-auto grid min-h-screen w-full max-w-6xl items-center gap-8 px-5 py-8 md:grid-cols-[minmax(0,1fr)_21rem] md:px-8">
        <div className="rounded-lg border border-ink/10 bg-white p-5 shadow-sm md:p-7">
          <header className="mb-6 flex items-start justify-between gap-4">
            <div>
              <p className="text-sm font-black text-prescription">AI 관상가 고양이</p>
              <h1 className="mt-3 text-3xl font-black leading-tight md:text-5xl">
                {displayName ? `${particle(displayName, "vocative")} 얼굴 처방 들어간다` : "얼굴 처방 들어간다"}
              </h1>
            </div>
            <ScanFace className="mt-1 h-8 w-8 shrink-0 text-library" aria-hidden="true" />
          </header>

          <div className="relative aspect-[4/3] overflow-hidden rounded-lg bg-ink">
            {cameraStatus === "ready" ? (
              <>
                <video ref={videoRef} className="h-full w-full scale-x-[-1] object-cover" autoPlay muted playsInline />
                <FaceMeshOverlay result={face.result} />
                <div className="absolute left-4 top-4 rounded-full bg-white/88 px-4 py-2 text-sm font-black text-library backdrop-blur">
                  {face.landmarks ? "얼굴 인식 완료" : face.isLoading ? "관상 좌표 로딩 중" : "정면 스캔 대기"}
                </div>
              </>
            ) : (
              <div className="flex h-full items-center justify-center bg-[#152522] px-6 text-center text-white">
                <div>
                  {cameraStatus === "requesting" ? (
                    <Loader2 className="mx-auto mb-4 h-10 w-10 animate-spin" aria-hidden="true" />
                  ) : (
                    <Camera className="mx-auto mb-4 h-10 w-10" aria-hidden="true" />
                  )}
                  <p className="text-lg font-black">{cameraStatusCopy(cameraStatus)}</p>
                  {cameraError ? <p className="mt-2 text-sm font-semibold text-white/70">{cameraError}</p> : null}
                </div>
              </div>
            )}
          </div>

          {step === "error" && error ? (
            <p role="alert" className="mt-5 rounded-lg bg-prescription/10 px-4 py-3 text-sm font-bold text-prescription">
              {error}
            </p>
          ) : null}

          <div className="mt-6 flex flex-col gap-3 sm:flex-row">
            {cameraStatus === "denied" || cameraStatus === "error" || step === "error" ? (
              <Button variant="secondary" className="sm:w-44" onClick={retryCamera}>
                <RefreshCw className="h-5 w-5" aria-hidden="true" />
                다시 열기
              </Button>
            ) : null}
            <Button className="flex-1" disabled={!canCapture || isSubmitting} onClick={submitCapture}>
              {isSubmitting ? <Loader2 className="h-5 w-5 animate-spin" aria-hidden="true" /> : <Sparkles className="h-5 w-5" aria-hidden="true" />}
              {isSubmitting ? "책 처방전 쓰는 중" : "이 얼굴로 책 처방받기"}
            </Button>
          </div>
        </div>

        <aside className="rounded-lg border border-library/10 bg-[#f4f7f1] p-5 shadow-sm md:p-6">
          <Mascot
            variant={step === "submitting" ? "reading" : step === "error" ? "retry" : "diagnose"}
            size="lg"
            message={mascotMessage(step, displayName)}
          />
        </aside>
      </section>
    </main>
  );
}

function cameraStatusCopy(status: ReturnType<typeof useCamera>["status"]) {
  if (status === "requesting") return "카메라 여는 중";
  if (status === "denied") return "카메라 권한이 막혔어";
  if (status === "error") return "카메라가 삐끗했어";
  return "카메라 준비 중";
}

function mascotMessage(step: Step, displayName: string) {
  if (step === "submitting") return `${displayName || "회원"} 데이터에 책장 운세 섞는 중`;
  if (step === "error") return "살짝 삐끗했지만 고양이 멘탈은 멀쩡함";
  return "정면만 딱 잡히면 관상 좌표 바로 들어갑니다";
}

function apiErrorCopy(code: string | undefined) {
  if (code === "not_enough_books") return "책 후보가 부족해. 관리자 책장을 먼저 채워야 해.";
  if (code === "invalid_request") return "입력값이 빠졌어. 처음부터 한 번만 다시 가자.";
  if (code === "session_create_failed") return "세션 저장이 실패했어. 잠깐 뒤 다시 시도해줘.";
  return "고양이 분석실이 잠깐 삐끗했어. 다시 가보자.";
}
