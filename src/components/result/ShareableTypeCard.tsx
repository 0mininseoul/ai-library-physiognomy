"use client";

import { honorific } from "@/lib/korean/name";

export function ShareableTypeCard({ displayName, typeName, headline }: { displayName: string; typeName: string; headline: string }) {
  const name = honorific(displayName);

  return (
    <div className="grid gap-3">
      <article className="rounded-3xl border border-accent-info/35 bg-gradient-to-br from-bg-card to-bg-card/70 p-6 shadow-glass">
        <p className="text-xs font-black uppercase tracking-[0.16em] text-accent-info">TYPE</p>
        <h1 className="mt-3 text-3xl font-bold leading-tight text-text-primary">{typeName}</h1>
        <p className="mt-4 text-lg font-semibold leading-7 text-text-muted">{headline.split("{nameHonorific}").join(name)}</p>
        <p className="mt-6 text-xs font-bold uppercase tracking-[0.16em] text-text-faint">AI 관상가 고양이 · 가천대 도서관</p>
      </article>
    </div>
  );
}
