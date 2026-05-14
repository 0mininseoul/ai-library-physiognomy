"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { ArrowLeft, Loader2, RefreshCw, ShieldAlert } from "lucide-react";
import { AdminLogin, ADMIN_AUTH_STORAGE_KEY } from "@/components/admin/AdminDashboard";
import { ThemeToggle } from "@/components/theme/ThemeToggle";
import { aggregateRecommendedBooks } from "@/lib/admin/bookRanking";
import type { AdminMetrics } from "@/lib/admin/metrics";

export function AdminBookRankingPage() {
  const [metrics, setMetrics] = useState<AdminMetrics | null>(null);
  const [authToken, setAuthToken] = useState<string | null>(null);
  const [status, setStatus] = useState<"auth" | "loading" | "ready" | "error">("loading");

  function load(nextAuthToken = authToken) {
    if (!nextAuthToken) {
      setStatus("auth");
      return;
    }
    setStatus("loading");
    fetch("/api/admin/metrics", {
      headers: { Authorization: `Basic ${nextAuthToken}` },
    })
      .then(async (res) => {
        if (res.status === 401) throw new Error("unauthorized");
        if (!res.ok) throw new Error("admin_metrics_failed");
        return (await res.json()) as AdminMetrics;
      })
      .then((data) => {
        setMetrics(data);
        setStatus("ready");
      })
      .catch((error: unknown) => {
        if (error instanceof Error && error.message === "unauthorized") {
          window.sessionStorage.removeItem(ADMIN_AUTH_STORAGE_KEY);
          setAuthToken(null);
          setStatus("auth");
          return;
        }
        setStatus("error");
      });
  }

  useEffect(() => {
    const stored = window.sessionStorage.getItem(ADMIN_AUTH_STORAGE_KEY);
    setAuthToken(stored);
    load(stored);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (status === "auth") {
    return (
      <AdminLogin
        onSubmit={(token) => {
          window.sessionStorage.setItem(ADMIN_AUTH_STORAGE_KEY, token);
          setAuthToken(token);
          load(token);
        }}
      />
    );
  }

  if (status === "loading") {
    return (
      <main className="grid min-h-screen place-items-center bg-bg-primary px-5 text-text-primary">
        <div className="text-center">
          <Loader2 className="mx-auto h-9 w-9 animate-spin text-accent-info" aria-hidden="true" />
          <p className="mt-4 text-lg font-semibold">책 랭킹 불러오는 중</p>
        </div>
      </main>
    );
  }

  if (status === "error" || !metrics) {
    return (
      <main className="grid min-h-screen place-items-center bg-bg-primary px-5 text-text-primary">
        <section className="glass-panel max-w-md rounded-2xl p-6 text-center">
          <ShieldAlert className="mx-auto h-10 w-10 text-accent-info" aria-hidden="true" />
          <h1 className="mt-4 text-2xl font-black">책 랭킹을 불러오지 못했어요</h1>
          <button
            type="button"
            className="mt-5 inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-lg border border-accent-info/35 bg-accent-info/15 px-5 text-sm font-bold text-text-primary transition hover:bg-accent-info/25"
            onClick={() => load()}
          >
            <RefreshCw className="h-5 w-5" aria-hidden="true" />
            다시 불러오기
          </button>
        </section>
      </main>
    );
  }

  return <AdminBookRankingContent metrics={metrics} onRefresh={() => load()} />;
}

function AdminBookRankingContent({ metrics, onRefresh }: { metrics: AdminMetrics; onRefresh?: () => void }) {
  const rows = useMemo(() => aggregateRecommendedBooks(metrics.recommendedBooks), [metrics.recommendedBooks]);
  const max = Math.max(1, ...rows.map((row) => row.count));

  return (
    <main className="admin-dashboard-shell min-h-screen bg-bg-primary text-text-primary">
      <div className="mx-auto grid w-full max-w-7xl gap-5 px-5 py-6 md:px-8 md:py-8">
        <header className="admin-panel flex flex-col justify-between gap-5 rounded-xl p-5 md:flex-row md:items-end md:p-6">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.16em] text-accent-info">BOOK RANKING</p>
            <h1 className="mt-2 text-3xl font-bold leading-tight md:text-4xl">전체 추천 책 목록</h1>
            <p className="mt-3 text-sm font-medium leading-6 text-text-muted">5/13(수) 부스 운영 중 참여자에게 추천된 도서를 추천 횟수와 서가 위치 기준으로 집계합니다.</p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <ThemeToggle />
            <button
              type="button"
              className="inline-flex h-11 items-center justify-center gap-2 rounded-lg border border-border bg-bg-card/80 px-4 text-sm font-semibold text-text-primary transition hover:border-border-bright hover:bg-bg-card-hover"
              onClick={onRefresh}
            >
              <RefreshCw className="h-4 w-4" aria-hidden="true" />
              새로고침
            </button>
            <Link href="/admindata" className="inline-flex h-11 items-center justify-center gap-2 rounded-lg border border-border bg-bg-card/80 px-4 text-sm font-semibold text-text-primary transition hover:border-border-bright hover:bg-bg-card-hover">
              <ArrowLeft className="h-4 w-4" aria-hidden="true" />
              대시보드
            </Link>
          </div>
        </header>

        <section className="admin-panel rounded-xl p-5 md:p-6">
          {rows.length ? (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[920px] border-separate border-spacing-0 table-fixed text-left text-sm">
                <colgroup>
                  <col className="w-[4rem]" />
                  <col className="w-[22rem]" />
                  <col className="w-[14rem]" />
                  <col className="w-[9rem]" />
                  <col className="w-[12rem]" />
                  <col className="w-[12rem]" />
                </colgroup>
                <thead className="text-xs font-semibold uppercase tracking-[0.1em] text-text-faint">
                  <tr>
                    <th className="border-b border-border py-3 pr-4">순위</th>
                    <th className="border-b border-border py-3 pr-4">책</th>
                    <th className="border-b border-border py-3 pr-4">저자</th>
                    <th className="border-b border-border py-3 pr-4">추천</th>
                    <th className="border-b border-border py-3 pr-4">서가 위치</th>
                    <th className="border-b border-border py-3 pr-4">분야</th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map((row, index) => (
                    <tr key={row.key} className="align-top">
                      <td className="border-b border-border py-3 pr-4 font-semibold tabular-nums text-accent-info">#{index + 1}</td>
                      <td className="border-b border-border py-3 pr-4 font-semibold text-text-primary">{row.title}</td>
                      <td className="border-b border-border py-3 pr-4 font-medium text-text-muted">{row.author || "-"}</td>
                      <td className="border-b border-border py-3 pr-4">
                        <div className="flex min-w-28 items-center gap-3">
                          <span className="w-8 font-semibold tabular-nums text-text-primary">{row.count}</span>
                          <div className="h-2 flex-1 rounded-full bg-bg-raised">
                            <div className="h-full rounded-full bg-accent-info" style={{ width: `${(row.count / max) * 100}%` }} />
                          </div>
                        </div>
                      </td>
                      <td className="border-b border-border py-3 pr-4 font-medium text-text-muted">{row.shelfLocations.join(", ") || "-"}</td>
                      <td className="border-b border-border py-3 pr-4 font-medium text-text-muted">{row.category || "-"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <p className="rounded-lg border border-dashed border-border bg-bg-card/50 px-4 py-4 text-center text-sm font-medium text-text-faint">아직 추천된 책이 없습니다.</p>
          )}
        </section>
      </div>
    </main>
  );
}
