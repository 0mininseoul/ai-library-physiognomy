"use client";

import { useCallback, useEffect, useRef, useState } from "react";

type CameraStatus = "idle" | "requesting" | "ready" | "denied" | "error";

function stopStream(stream: MediaStream) {
  stream.getTracks().forEach((track) => track.stop());
}

export function useCamera(options?: { persistGlobal?: boolean }) {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const startIdRef = useRef(0);
  const [status, setStatus] = useState<CameraStatus>("idle");
  const [error, setError] = useState<string | null>(null);

  const stop = useCallback(() => {
    startIdRef.current += 1;
    const stream = streamRef.current;
    if (stream) {
      stopStream(stream);
      streamRef.current = null;
      if (typeof window !== "undefined" && window.__aiFaceReportStream === stream) {
        window.__aiFaceReportStream = null;
      }
    }
    if (videoRef.current?.srcObject === stream) {
      videoRef.current.srcObject = null;
    }
  }, []);

  const start = useCallback(async () => {
    stop();
    const startId = startIdRef.current + 1;
    startIdRef.current = startId;
    setStatus("requesting");
    setError(null);
    let stream: MediaStream | null = null;
    try {
      stream = await navigator.mediaDevices.getUserMedia({
        video: {
          width: { ideal: 1920 },
          height: { ideal: 1080 },
          frameRate: { ideal: 30 },
          facingMode: "user",
        },
        audio: false,
      });
      if (startIdRef.current !== startId) {
        stopStream(stream);
        return;
      }
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
      }
      if (startIdRef.current !== startId) {
        stopStream(stream);
        if (streamRef.current === stream) streamRef.current = null;
        if (videoRef.current?.srcObject === stream) videoRef.current.srcObject = null;
        return;
      }
      if (options?.persistGlobal) window.__aiFaceReportStream = stream;
      setStatus("ready");
    } catch (err) {
      if (stream) {
        stopStream(stream);
        if (streamRef.current === stream) streamRef.current = null;
        if (videoRef.current?.srcObject === stream) videoRef.current.srcObject = null;
        if (typeof window !== "undefined" && window.__aiFaceReportStream === stream) {
          window.__aiFaceReportStream = null;
        }
      }
      if (startIdRef.current !== startId) return;
      const message = err instanceof Error ? err.message : "카메라를 열 수 없어요";
      setError(message);
      setStatus(message.toLowerCase().includes("permission") ? "denied" : "error");
    }
  }, [options?.persistGlobal, stop]);

  useEffect(() => {
    return () => {
      if (!options?.persistGlobal) stop();
    };
  }, [options?.persistGlobal, stop]);

  return { videoRef, streamRef, status, error, start, stop };
}
