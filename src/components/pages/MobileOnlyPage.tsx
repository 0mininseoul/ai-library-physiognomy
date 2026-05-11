"use client";

import { useEffect, useMemo, useState } from "react";
import { Check, Copy, Laptop, MonitorUp, Smartphone } from "lucide-react";
import { BrandLogo } from "@/components/brand/BrandLogo";

const PRODUCTION_ORIGIN = "https://ai-library-physiognomy.vercel.app";

export function MobileOnlyPage({ nextPath }: { nextPath: string }) {
  const [origin, setOrigin] = useState(PRODUCTION_ORIGIN);
  const [copied, setCopied] = useState(false);
  const pcUrl = useMemo(() => `${origin}${nextPath === "/" ? "" : nextPath}`, [nextPath, origin]);

  useEffect(() => {
    setOrigin(window.location.origin);
  }, []);

  async function copyUrl() {
    try {
      await navigator.clipboard.writeText(pcUrl);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1800);
    } catch {
      setCopied(false);
    }
  }

  return (
    <main className="scanline relative grid min-h-[100svh] overflow-hidden bg-bg-primary px-4 py-4 text-text-primary">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_20%_10%,rgb(var(--accent-info-rgb)_/_0.18),transparent_22rem),radial-gradient(circle_at_86%_88%,rgb(255_255_255_/_0.45),transparent_26rem)]" />
      <section className="relative z-10 mx-auto flex w-full max-w-[22rem] flex-col justify-start pt-3">
        <div className="mb-2 inline-flex w-fit items-center gap-2 rounded-2xl border border-border bg-bg-card/72 p-1.5 pr-3 shadow-glass backdrop-blur-2xl">
          <span className="grid h-9 w-9 place-items-center rounded-xl border border-border bg-bg-card/80">
            <BrandLogo className="h-8 w-8 object-contain" />
          </span>
          <span className="text-xs font-black uppercase tracking-[0.03em] text-text-muted">AI 관상가 고양이</span>
        </div>

        <div className="glass-panel rounded-[1.45rem] p-3.5 shadow-2xl shadow-black/10">
          <div className="flex items-center gap-3">
            <span className="grid h-10 w-10 place-items-center rounded-2xl border border-accent-info/25 bg-accent-info/10 text-accent-info">
              <MonitorUp className="h-5 w-5" aria-hidden="true" />
            </span>
            <div>
              <p className="text-[0.68rem] font-black uppercase tracking-[0.16em] text-accent-info">PC ONLY</p>
              <h1 className="mt-0.5 text-[1.45rem] font-bold leading-tight text-text-primary">PC에서 접속해 주세요</h1>
            </div>
          </div>

          <p className="mt-3 text-sm font-semibold leading-5 text-text-muted">
            실시간 카메라와 가로형 결과 리포트가 필요해요. 노트북이나 데스크톱에서 열어 주세요.
          </p>

          <div className="mt-3 rounded-2xl border border-border/70 bg-bg-card/55 p-3">
            <div className="flex items-center gap-2.5">
              <Laptop className="h-4 w-4 shrink-0 text-accent-info" aria-hidden="true" />
              <p className="text-xs font-bold leading-5 text-text-muted">
                <span className="font-black text-text-primary">권장:</span> PC 브라우저에서 가장 안정적이에요.
              </p>
            </div>
            <div className="mt-2 flex items-center gap-2.5">
              <Smartphone className="h-4 w-4 shrink-0 text-accent-info" aria-hidden="true" />
              <p className="text-xs font-bold leading-5 text-text-muted">
                <span className="font-black text-text-primary">안내:</span> 아래 주소를 PC에서 다시 열어 주세요.
              </p>
            </div>
          </div>

          <div className="mt-3 rounded-2xl border border-border bg-bg-card/65 p-1.5">
            <p className="truncate rounded-xl bg-bg-raised/45 px-3 py-2 text-xs font-bold leading-5 text-text-primary">{pcUrl}</p>
            <button
              type="button"
              onClick={copyUrl}
              className="mt-1.5 inline-flex h-10 w-full items-center justify-center gap-2 rounded-xl border border-accent-info/35 bg-accent-info/[0.12] px-4 text-sm font-black text-text-primary shadow-glass transition hover:bg-accent-info/[0.18]"
            >
              {copied ? <Check className="h-4 w-4 text-accent-info" aria-hidden="true" /> : <Copy className="h-4 w-4 text-accent-info" aria-hidden="true" />}
              {copied ? "주소를 복사했어요" : "PC 접속 주소 복사"}
            </button>
          </div>
        </div>
      </section>
    </main>
  );
}
