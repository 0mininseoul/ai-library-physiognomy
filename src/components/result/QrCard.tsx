"use client";

import { useEffect, useState } from "react";
import QRCode from "qrcode";
import { Smartphone } from "lucide-react";

export function QrCard({ sessionId, variant = "default" }: { sessionId: string; variant?: "default" | "headline" }) {
  const [dataUrl, setDataUrl] = useState<string | null>(null);
  const isHeadline = variant === "headline";

  useEffect(() => {
    if (typeof window === "undefined") return;
    const target = new URL(`/result/${sessionId}`, window.location.origin);
    target.searchParams.set("m", "1");
    target.searchParams.set("src", "book_qr");
    QRCode.toDataURL(target.toString(), { width: 220, margin: 1, errorCorrectionLevel: "M" })
      .then(setDataUrl)
      .catch((error) => console.error("QR encode failed", error));
  }, [sessionId]);

  return (
    <div
      className={[
        "glass-card flex flex-col items-center border border-border/60 bg-bg-card/70 shadow-glass",
        isHeadline ? "gap-1.5 rounded-xl p-2.5" : "gap-2 rounded-2xl p-4",
      ].join(" ")}
    >
      {dataUrl ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={dataUrl} alt="" className={[isHeadline ? "h-24 w-24 p-1.5" : "h-32 w-32 p-2", "rounded-lg bg-white"].join(" ")} />
      ) : (
        <div className={[isHeadline ? "h-24 w-24" : "h-32 w-32", "rounded-lg bg-bg-raised"].join(" ")} />
      )}
      <Smartphone className={[isHeadline ? "h-3.5 w-3.5" : "h-4 w-4", "text-text-faint"].join(" ")} aria-hidden="true" />
    </div>
  );
}
