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
    <main className="scanline relative grid min-h-screen overflow-hidden bg-bg-primary px-5 py-8 text-text-primary">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_20%_10%,rgb(var(--accent-info-rgb)_/_0.18),transparent_22rem),radial-gradient(circle_at_86%_88%,rgb(255_255_255_/_0.45),transparent_26rem)]" />
      <section className="relative z-10 mx-auto flex w-full max-w-md flex-col justify-center">
        <div className="mb-5 inline-flex w-fit items-center gap-3 rounded-2xl border border-border bg-bg-card/72 p-2 pr-4 shadow-glass backdrop-blur-2xl">
          <span className="grid h-11 w-11 place-items-center rounded-xl border border-border bg-bg-card/80">
            <BrandLogo className="h-10 w-10 object-contain" />
          </span>
          <span className="text-sm font-black uppercase tracking-[0.08em] text-text-muted">AI 관상가 고양이</span>
        </div>

        <div className="glass-panel rounded-[2rem] p-6 shadow-2xl shadow-black/10">
          <div className="flex items-center gap-3">
            <span className="grid h-12 w-12 place-items-center rounded-2xl border border-accent-info/25 bg-accent-info/10 text-accent-info">
              <MonitorUp className="h-6 w-6" aria-hidden="true" />
            </span>
            <div>
              <p className="text-xs font-black uppercase tracking-[0.16em] text-accent-info">PC ONLY</p>
              <h1 className="mt-1 text-2xl font-bold leading-tight text-text-primary">PC에서 접속해 주세요</h1>
            </div>
          </div>

          <p className="mt-5 text-base font-semibold leading-7 text-text-muted">
            AI 관상가 고양이는 실시간 카메라와 가로형 결과 리포트에 맞춰져 있어요. 모바일에서는 얼굴 분석실이 좁아서 야옹이가 확대경을 제대로 못 듭니다.
          </p>

          <div className="mt-6 grid gap-3">
            <div className="rounded-2xl border border-border/70 bg-bg-card/55 p-4">
              <div className="flex items-start gap-3">
                <Laptop className="mt-0.5 h-5 w-5 shrink-0 text-accent-info" aria-hidden="true" />
                <div>
                  <p className="text-sm font-black text-text-primary">권장 환경</p>
                  <p className="mt-1 text-sm font-semibold leading-6 text-text-muted">노트북 또는 데스크톱 브라우저에서 열면 카메라, 분석 카드, 결과 섹션이 안정적으로 보여요.</p>
                </div>
              </div>
            </div>
            <div className="rounded-2xl border border-border/70 bg-bg-card/55 p-4">
              <div className="flex items-start gap-3">
                <Smartphone className="mt-0.5 h-5 w-5 shrink-0 text-accent-info" aria-hidden="true" />
                <div>
                  <p className="text-sm font-black text-text-primary">모바일 안내</p>
                  <p className="mt-1 text-sm font-semibold leading-6 text-text-muted">아래 주소를 PC 브라우저에서 다시 열어 주세요.</p>
                </div>
              </div>
            </div>
          </div>

          <div className="mt-6 rounded-2xl border border-border bg-bg-card/65 p-2">
            <p className="min-h-11 break-all rounded-xl bg-bg-raised/45 px-3 py-3 text-sm font-bold leading-5 text-text-primary">{pcUrl}</p>
            <button
              type="button"
              onClick={copyUrl}
              className="mt-2 inline-flex h-11 w-full items-center justify-center gap-2 rounded-xl border border-accent-info/35 bg-accent-info/[0.12] px-4 text-sm font-black text-text-primary shadow-glass transition hover:bg-accent-info/[0.18]"
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
