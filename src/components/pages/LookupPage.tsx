"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import { Search } from "lucide-react";
import { Mascot } from "@/components/mascot/Mascot";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";

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
    <main className="min-h-screen bg-paper text-ink">
      <section className="mx-auto grid min-h-screen w-full max-w-4xl items-center gap-8 px-5 py-8 md:grid-cols-[minmax(0,1fr)_18rem] md:px-8">
        <form onSubmit={submit} className="rounded-lg border border-ink/10 bg-white p-5 shadow-sm md:p-7">
          <p className="text-sm font-black text-prescription">AI 관상가 고양이</p>
          <h1 className="mt-3 text-3xl font-black leading-tight md:text-5xl">내 책 처방전 다시 찾기</h1>

          <div className="mt-7 grid gap-5">
            <Input
              label="학번"
              name="studentId"
              value={studentId}
              placeholder="20260000"
              inputMode="numeric"
              autoComplete="off"
              onChange={(event) => setStudentId(event.target.value)}
            />
            <Input
              label="생년월일"
              name="birthDate"
              type="date"
              value={birthDate}
              max={new Date().toISOString().slice(0, 10)}
              onChange={(event) => setBirthDate(event.target.value)}
            />
          </div>

          {status === "error" ? (
            <p role="alert" className="mt-5 rounded-lg bg-prescription/10 px-4 py-3 text-sm font-bold text-prescription">
              최근 30일 안에 완료된 처방전을 찾지 못했어.
            </p>
          ) : null}

          <Button type="submit" className="mt-6 w-full" disabled={status === "loading"}>
            <Search className="h-5 w-5" aria-hidden="true" />
            {status === "loading" ? "찾는 중" : "처방전 찾기"}
          </Button>
        </form>

        <aside className="rounded-lg border border-library/10 bg-[#f4f7f1] p-5 shadow-sm">
          <Mascot variant={status === "error" ? "retry" : "reading"} size="lg" message="학번이랑 생일이면 최근 처방전 추적 가능" />
        </aside>
      </section>
    </main>
  );
}
