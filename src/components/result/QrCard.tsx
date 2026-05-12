"use client";

import { useEffect, useState } from "react";
import QRCode from "qrcode";
import { Smartphone } from "lucide-react";

export function QrCard({ sessionId }: { sessionId: string }) {
  const [dataUrl, setDataUrl] = useState<string | null>(null);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const target = new URL(`/result/${sessionId}`, window.location.origin);
    target.searchParams.set("m", "1");
    QRCode.toDataURL(target.toString(), { width: 220, margin: 1, errorCorrectionLevel: "M" })
      .then(setDataUrl)
      .catch((error) => console.error("QR encode failed", error));
  }, [sessionId]);

  return (
    <div className="glass-card flex flex-col items-center gap-2 rounded-2xl border border-border/60 bg-bg-card/70 p-4 shadow-glass">
      {dataUrl ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={dataUrl} alt="" className="h-32 w-32 rounded-lg bg-white p-2" />
      ) : (
        <div className="h-32 w-32 rounded-lg bg-bg-raised" />
      )}
      <Smartphone className="h-4 w-4 text-text-faint" aria-hidden="true" />
    </div>
  );
}
