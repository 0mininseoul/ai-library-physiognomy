"use client";

import { useRef, useState } from "react";
import { Share2 } from "lucide-react";
import { honorific } from "@/lib/korean/name";

export function ShareableTypeCard({ displayName, typeName, headline }: { displayName: string; typeName: string; headline: string }) {
  const ref = useRef<HTMLDivElement>(null);
  const [busy, setBusy] = useState(false);
  const name = honorific(displayName);

  async function share() {
    if (!ref.current) return;
    setBusy(true);
    try {
      const { toPng } = await import("html-to-image");
      const dataUrl = await toPng(ref.current, { pixelRatio: 2, cacheBust: true });
      const blob = await (await fetch(dataUrl)).blob();
      const file = new File([blob], `result-${typeName}.png`, { type: "image/png" });
      const navAny = navigator as Navigator & { canShare?: (data: ShareData) => boolean };

      if (navAny.canShare?.({ files: [file] })) {
        await navigator.share({ files: [file], title: typeName });
      } else {
        const link = document.createElement("a");
        link.href = dataUrl;
        link.download = `result-${typeName}.png`;
        link.click();
      }
    } catch (error) {
      console.error("share failed", error);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="grid gap-3">
      <article ref={ref} className="rounded-3xl border border-accent-info/35 bg-gradient-to-br from-bg-card to-bg-card/70 p-6 shadow-glass">
        <p className="text-xs font-black uppercase tracking-[0.16em] text-accent-info">TYPE</p>
        <h1 className="mt-3 text-3xl font-bold leading-tight text-text-primary">{typeName}</h1>
        <p className="mt-4 text-lg font-semibold leading-7 text-text-muted">{headline.split("{nameHonorific}").join(name)}</p>
        <p className="mt-6 text-xs font-bold uppercase tracking-[0.16em] text-text-faint">AI 관상가 고양이 · 가천대 도서관</p>
      </article>
      <button
        type="button"
        onClick={share}
        disabled={busy}
        className="inline-flex h-11 items-center justify-center gap-2 rounded-xl border border-accent-info/45 bg-accent-info/[0.18] px-4 text-sm font-black text-text-primary transition disabled:opacity-50"
      >
        <Share2 className="h-4 w-4" aria-hidden="true" />
        결과 공유하기
      </button>
    </div>
  );
}
