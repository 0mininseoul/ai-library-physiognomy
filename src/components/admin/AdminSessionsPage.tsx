"use client";

import { useEffect, useState } from "react";
import type { ReactNode } from "react";
import Link from "next/link";
import { ArrowLeft, Loader2, RefreshCw, ShieldAlert } from "lucide-react";
import { ADMIN_AUTH_STORAGE_KEY, AdminLogin } from "@/components/admin/AdminDashboard";
import { ThemeToggle } from "@/components/theme/ThemeToggle";
import type { AdminMetrics } from "@/lib/admin/metrics";

export function AdminSessionsPage() {
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
          <p className="mt-4 text-lg font-semibold">참여 세션 불러오는 중</p>
        </div>
      </main>
    );
  }

  if (status === "error" || !metrics) {
    return (
      <main className="grid min-h-screen place-items-center bg-bg-primary px-5 text-text-primary">
        <section className="glass-panel max-w-md rounded-2xl p-6 text-center">
          <ShieldAlert className="mx-auto h-10 w-10 text-accent-info" aria-hidden="true" />
          <h1 className="mt-4 text-2xl font-black">참여 세션을 불러오지 못했어요</h1>
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

  return <AdminSessionsContent metrics={metrics} onRefresh={() => load()} />;
}

function AdminSessionsContent({ metrics, onRefresh }: { metrics: AdminMetrics; onRefresh?: () => void }) {
  return (
    <main className="admin-dashboard-shell min-h-screen bg-bg-primary text-text-primary">
      <div className="mx-auto grid w-full max-w-7xl gap-5 px-5 py-6 md:px-8 md:py-8">
        <header className="admin-panel flex flex-col justify-between gap-5 rounded-xl p-5 md:flex-row md:items-end md:p-6">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.16em] text-accent-info">SESSIONS</p>
            <h1 className="mt-2 text-3xl font-bold leading-tight md:text-4xl">전체 참여 세션</h1>
            <p className="mt-3 text-sm font-medium leading-6 text-text-muted">5/13(수) 부스 운영 중 생성된 참여 세션을 입력 정보와 모바일 QR 전환 시각까지 함께 확인합니다.</p>
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

        <section className="admin-panel overflow-hidden rounded-xl p-5 md:p-6">
          <div className="mb-5 flex items-end justify-between gap-3">
            <div>
              <p className="text-xs font-bold uppercase tracking-[0.16em] text-accent-info">SESSION LOG</p>
              <h2 className="mt-2 text-2xl font-semibold leading-tight">참여 세션 {metrics.sessions.length}건</h2>
            </div>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[1080px] table-fixed border-separate border-spacing-0 text-left text-xs">
              <colgroup>
                <col className="w-[5.5rem]" />
                <col className="w-[5.2rem]" />
                <col className="w-[6rem]" />
                <col className="w-[6rem]" />
                <col className="w-[4rem]" />
                <col className="w-[8rem]" />
                <col className="w-[10.5rem]" />
                <col className="w-[7rem]" />
                <col className="w-[15rem]" />
              </colgroup>
              <thead className="text-xs font-semibold uppercase tracking-[0.1em] text-text-faint">
                <tr>
                  <TableHead>세션 시간</TableHead>
                  <TableHead>이름</TableHead>
                  <TableHead>학번/사번</TableHead>
                  <TableHead>생년월일</TableHead>
                  <TableHead>성별</TableHead>
                  <TableHead>선호하는 책 카테고리</TableHead>
                  <TableHead className="whitespace-nowrap">지금 나에게 가장 필요한 것</TableHead>
                  <TableHead>모바일 QR 전환</TableHead>
                  <TableHead>결과 페이지 URL</TableHead>
                </tr>
              </thead>
              <tbody>
                {metrics.sessions.length ? (
                  metrics.sessions.map((session) => (
                    <tr key={session.id}>
                      <TableCell strong>{formatSessionStart(session)}</TableCell>
                      <TableCell strong>{session.displayName}</TableCell>
                      <TableCell>{session.studentId}</TableCell>
                      <TableCell>{formatDate(session.birthDate)}</TableCell>
                      <TableCell>{formatGender(session.gender)}</TableCell>
                      <TableCell>{session.favoriteCategory}</TableCell>
                      <TableCell>{formatNeedFocus(session.needFocus)}</TableCell>
                      <TableCell>{session.mobileQrConvertedAt ? formatTime(session.mobileQrConvertedAt) : "-"}</TableCell>
                      <TableCell>
                        <Link href={session.resultUrl} className="break-all font-semibold text-accent-info underline underline-offset-4">
                          {session.resultUrl}
                        </Link>
                      </TableCell>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <TableCell colSpan={9}>아직 참여 세션이 없습니다.</TableCell>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </section>
      </div>
    </main>
  );
}

function TableHead({ children, className = "" }: { children: ReactNode; className?: string }) {
  return <th className={`whitespace-nowrap border-b border-border py-3 pr-4 align-bottom font-semibold leading-5 ${className}`.trim()}>{children}</th>;
}

function TableCell({ children, strong = false, colSpan }: { children: ReactNode; strong?: boolean; colSpan?: number }) {
  return <td colSpan={colSpan} className={["border-b border-border py-3 pr-4 align-top leading-5", strong ? "font-semibold text-text-primary" : "font-medium text-text-muted"].join(" ")}>{children}</td>;
}

function formatTime(value: string) {
  return new Intl.DateTimeFormat("ko-KR", {
    timeZone: "Asia/Seoul",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(value));
}

function formatSessionStart(session: AdminMetrics["sessions"][number]) {
  return formatTime(session.startedAt ?? session.createdAt);
}

function formatDate(value: string) {
  if (!value || value === "-") return "-";
  return value;
}

function formatGender(value: string) {
  if (value === "male") return "남성";
  if (value === "female") return "여성";
  return value || "-";
}

function formatNeedFocus(value: string) {
  const labels: Record<string, string> = {
    stimulation: "새로운 자극",
    comfort: "마음 위로",
    utility: "실용적인 도움",
    depth: "깊은 사색",
  };
  return labels[value] ?? value ?? "-";
}
