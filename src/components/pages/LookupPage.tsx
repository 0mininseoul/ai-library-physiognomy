"use client";

import { FormEvent, useState } from "react";
import type { InputHTMLAttributes } from "react";
import { useRouter } from "next/navigation";
import { Search, SearchCheck } from "lucide-react";

export function LookupPage() {
  const router = useRouter();
  const [studentId, setStudentId] = useState("");
  const [birthDate, setBirthDate] = useState("");
  const [status, setStatus] = useState<"idle" | "loading" | "error">("idle");

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!studentId.trim() || !birthDate.trim()) {
      setStatus("error");
      return;
    }

    setStatus("loading");
    const res = await fetch("/api/lookup", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ studentId, birthDate }),
    });
    const payload = await res.json();

    if (!res.ok || !payload?.sessionId) {
      setStatus("error");
      return;
    }

    router.push(`/result/${payload.sessionId}`);
  }

  return (
    <main className="min-h-screen bg-bg-primary text-text-primary">
      <section className="mx-auto grid min-h-screen w-full max-w-4xl items-center gap-8 px-5 py-8 md:grid-cols-[minmax(0,1fr)_18rem] md:px-8">
        <form onSubmit={submit} className="glass-panel rounded-2xl p-5 md:p-7">
          <p className="text-sm font-black text-accent-warn">AI 관상가 고양이</p>
          <h1 className="mt-3 text-3xl font-black leading-tight md:text-5xl">내 분석 결과 다시 찾기</h1>
          <p className="mt-4 text-sm font-semibold leading-6 text-text-muted">학번(또는 사번)과 생년월일로 최근 30일 안의 결과를 불러옵니다.</p>

          <div className="mt-7 grid gap-5">
            <DarkLookupInput label="학번(또는 사번)" name="studentId" value={studentId} placeholder="20260000" inputMode="numeric" autoComplete="off" onChange={(event) => setStudentId(event.target.value)} />
            <DarkLookupInput label="생년월일" name="birthDate" type="date" value={birthDate} max={new Date().toISOString().slice(0, 10)} onChange={(event) => setBirthDate(event.target.value)} />
          </div>

          {status === "error" ? (
            <p role="alert" className="mt-5 rounded-lg border border-accent-bad/35 bg-accent-bad/10 px-4 py-3 text-sm font-bold text-accent-bad">
              최근 30일 안에 완료된 결과를 찾지 못했어.
            </p>
          ) : null}

          <button
            type="submit"
            className="mt-6 inline-flex h-12 w-full items-center justify-center gap-2 rounded-lg border border-accent-info/40 bg-accent-info/[0.18] px-5 text-sm font-black text-text-primary transition hover:bg-accent-info/25 disabled:cursor-not-allowed disabled:opacity-[0.45]"
            disabled={status === "loading"}
          >
            <Search className="h-5 w-5" aria-hidden="true" />
            {status === "loading" ? "찾는 중" : "결과 찾기"}
          </button>
        </form>

        <aside className="glass-panel rounded-2xl p-5 text-center">
          <SearchCheck className="mx-auto h-9 w-9 text-accent-info" aria-hidden="true" />
          <p className="mt-4 text-lg font-black leading-7">최근 결과를 조용히 추적 중</p>
          <p className="mt-3 text-sm font-semibold leading-6 text-text-muted">얼굴 이미지는 생성 후 24시간까지만 결과 화면에 표시됩니다.</p>
        </aside>
      </section>
    </main>
  );
}

function DarkLookupInput(props: InputHTMLAttributes<HTMLInputElement> & { label: string }) {
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
