"use client";

import { useEffect, useMemo, useState } from "react";
import { Loader2, RefreshCw } from "lucide-react";
import { Mascot } from "@/components/mascot/Mascot";
import { Button } from "@/components/ui/Button";
import { StatCard } from "@/components/ui/StatCard";
import type { AdminMetrics } from "@/lib/admin/metrics";

export function AdminDashboard() {
  const [metrics, setMetrics] = useState<AdminMetrics | null>(null);
  const [status, setStatus] = useState<"loading" | "ready" | "error">("loading");

  function load() {
    setStatus("loading");
    fetch("/api/admin/metrics")
      .then(async (res) => {
        if (!res.ok) throw new Error("admin_metrics_failed");
        return (await res.json()) as AdminMetrics;
      })
      .then((data) => {
        setMetrics(data);
        setStatus("ready");
      })
      .catch(() => setStatus("error"));
  }

  useEffect(() => {
    load();
  }, []);

  if (status === "loading") {
    return (
      <main className="flex min-h-screen items-center justify-center bg-paper px-5 text-ink">
        <div className="text-center">
          <Loader2 className="mx-auto h-9 w-9 animate-spin text-library" aria-hidden="true" />
          <p className="mt-4 text-lg font-black">관리자 데이터 불러오는 중</p>
        </div>
      </main>
    );
  }

  if (status === "error" || !metrics) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-paper px-5 text-ink">
        <section className="max-w-md rounded-lg border border-ink/10 bg-white p-6 text-center shadow-sm">
          <Mascot variant="retry" size="md" />
          <h1 className="mt-4 text-2xl font-black">관리자 인증이 필요해</h1>
          <p className="mt-3 text-sm font-bold leading-6 text-ink/60">관리자 계정으로 접속한 뒤 다시 불러와줘.</p>
          <Button className="mt-5 w-full" onClick={load}>
            <RefreshCw className="h-5 w-5" aria-hidden="true" />
            다시 불러오기
          </Button>
        </section>
      </main>
    );
  }

  return <AdminDashboardContent metrics={metrics} />;
}

export function AdminDashboardContent({ metrics }: { metrics: AdminMetrics }) {
  const recommendedBookRows = useMemo(() => aggregateBooks(metrics.recommendedBooks), [metrics.recommendedBooks]);

  return (
    <main className="min-h-screen bg-paper text-ink">
      <div className="mx-auto grid w-full max-w-7xl gap-6 px-5 py-8 md:px-8">
        <header className="flex flex-col justify-between gap-4 rounded-lg border border-ink/10 bg-white p-5 shadow-sm md:flex-row md:items-center md:p-6">
          <div>
            <p className="text-sm font-black text-prescription">AI 관상가 고양이</p>
            <h1 className="mt-2 text-3xl font-black leading-tight md:text-5xl">관리자 데이터</h1>
          </div>
          <Mascot variant="reading" size="sm" message="오늘 책장 흐름 체크 중" />
        </header>

        <section className="grid gap-4 md:grid-cols-2">
          <StatCard label="오늘 참여자 수" value={metrics.todayParticipants} />
          <StatCard label="오늘 추천된 책 수" value={metrics.todayRecommendedBookCount} />
        </section>

        <section className="rounded-lg border border-ink/10 bg-white p-5 shadow-sm md:p-6">
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="text-sm font-black text-prescription">참여자 수 차트</p>
              <h2 className="mt-1 text-2xl font-black">오늘 시간대별 참여자 수</h2>
            </div>
            <p className="text-sm font-black text-library">{metrics.todayParticipants}명</p>
          </div>
          <HourlyChart values={metrics.hourlyParticipants} />
        </section>

        <section className="grid gap-4 lg:grid-cols-3">
          <DistributionPanel title="선호 독서 카테고리 분포" values={metrics.categoryDistribution} />
          <DistributionPanel title="추천 분야 분포" values={metrics.recommendationCategoryDistribution} />
          <DistributionPanel title="추천 태그 분포" values={metrics.recommendationTagDistribution} />
        </section>

        <section className="rounded-lg border border-ink/10 bg-white p-5 shadow-sm md:p-6">
          <p className="text-sm font-black text-prescription">추천된 책 리스트</p>
          <h2 className="mt-1 text-2xl font-black">오늘 처방된 책</h2>
          <div className="mt-5 overflow-x-auto">
            <table className="w-full min-w-[760px] border-separate border-spacing-0 text-left text-sm">
              <thead className="text-xs font-black text-ink/60">
                <tr>
                  <th className="border-b border-ink/10 py-3 pr-4">책</th>
                  <th className="border-b border-ink/10 py-3 pr-4">저자</th>
                  <th className="border-b border-ink/10 py-3 pr-4">분야</th>
                  <th className="border-b border-ink/10 py-3 pr-4">추천 수</th>
                  <th className="border-b border-ink/10 py-3">태그</th>
                </tr>
              </thead>
              <tbody>
                {recommendedBookRows.map((book) => (
                  <tr key={book.key} className="align-top">
                    <td className="border-b border-ink/10 py-3 pr-4 font-black">{book.title}</td>
                    <td className="border-b border-ink/10 py-3 pr-4 font-bold text-ink/70">{book.author}</td>
                    <td className="border-b border-ink/10 py-3 pr-4 font-bold text-library">{book.category || "-"}</td>
                    <td className="border-b border-ink/10 py-3 pr-4 font-black">{book.count}</td>
                    <td className="border-b border-ink/10 py-3 font-bold text-ink/70">{book.tags.join(", ") || "-"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        <section className="rounded-lg border border-ink/10 bg-white p-5 shadow-sm md:p-6">
          <p className="text-sm font-black text-prescription">세션 목록</p>
          <h2 className="mt-1 text-2xl font-black">오늘 참여 세션</h2>
          <div className="mt-5 overflow-x-auto">
            <table className="w-full min-w-[640px] border-separate border-spacing-0 text-left text-sm">
              <thead className="text-xs font-black text-ink/60">
                <tr>
                  <th className="border-b border-ink/10 py-3 pr-4">시간</th>
                  <th className="border-b border-ink/10 py-3 pr-4">이름</th>
                  <th className="border-b border-ink/10 py-3 pr-4">학번</th>
                  <th className="border-b border-ink/10 py-3">타입</th>
                </tr>
              </thead>
              <tbody>
                {metrics.sessions.map((session) => (
                  <tr key={`${session.createdAt}-${session.maskedStudentId}`}>
                    <td className="border-b border-ink/10 py-3 pr-4 font-bold">{formatTime(session.createdAt)}</td>
                    <td className="border-b border-ink/10 py-3 pr-4 font-black">{session.displayName}</td>
                    <td className="border-b border-ink/10 py-3 pr-4 font-bold text-ink/70">{session.maskedStudentId}</td>
                    <td className="border-b border-ink/10 py-3 font-bold text-library">{session.readingTypeCode}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      </div>
    </main>
  );
}

function HourlyChart({ values }: { values: Array<{ hour: number; count: number }> }) {
  const max = Math.max(1, ...values.map((value) => value.count));

  return (
    <div className="mt-5 grid grid-cols-12 gap-2 md:grid-cols-[repeat(24,minmax(0,1fr))]">
      {values.map((value) => (
        <div key={value.hour} className="grid gap-2">
          <div className="flex h-32 items-end rounded-lg bg-[#f4f7f1] px-1">
            <div
              className="w-full rounded-md bg-library"
              style={{ height: `${Math.max(value.count ? 10 : 0, (value.count / max) * 100)}%` }}
              title={`${value.hour}시 ${value.count}명`}
            />
          </div>
          <p className="text-center text-[11px] font-black text-ink/60">{value.hour}</p>
        </div>
      ))}
    </div>
  );
}

function DistributionPanel({ title, values }: { title: string; values: Record<string, number> }) {
  const entries = Object.entries(values).sort((a, b) => b[1] - a[1]);
  const max = Math.max(1, ...entries.map((entry) => entry[1]));

  return (
    <section className="rounded-lg border border-ink/10 bg-white p-5 shadow-sm">
      <h2 className="text-lg font-black">{title}</h2>
      <div className="mt-4 grid gap-3">
        {entries.length ? (
          entries.map(([label, count]) => (
            <div key={label}>
              <div className="flex justify-between gap-3 text-sm font-bold">
                <span>{label}</span>
                <span className="text-library">{count}</span>
              </div>
              <div className="mt-2 h-2 rounded-full bg-ink/10">
                <div className="h-full rounded-full bg-prescription" style={{ width: `${(count / max) * 100}%` }} />
              </div>
            </div>
          ))
        ) : (
          <p className="text-sm font-bold text-ink/60">아직 데이터 없음</p>
        )}
      </div>
    </section>
  );
}

function aggregateBooks(books: AdminMetrics["recommendedBooks"]) {
  const byKey = new Map<
    string,
    {
      key: string;
      title: string;
      author: string;
      category: string;
      tags: string[];
      count: number;
    }
  >();

  for (const book of books) {
    const key = book.bookId || `${book.title}-${book.author}`;
    const current = byKey.get(key);
    if (current) {
      current.count += 1;
      current.tags = Array.from(new Set([...current.tags, ...(book.tags ?? [])]));
    } else {
      byKey.set(key, {
        key,
        title: book.title,
        author: book.author,
        category: book.category ?? "",
        tags: book.tags ?? [],
        count: 1,
      });
    }
  }

  return [...byKey.values()].sort((a, b) => b.count - a.count || a.title.localeCompare(b.title, "ko"));
}

function formatTime(value: string) {
  return new Intl.DateTimeFormat("ko-KR", {
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(value));
}
