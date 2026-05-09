"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import type { InputHTMLAttributes, ReactNode } from "react";
import { BarChart3, Loader2, LockKeyhole, RefreshCw, ShieldAlert } from "lucide-react";
import type { AdminMetrics } from "@/lib/admin/metrics";

const ADMIN_AUTH_STORAGE_KEY = "ai-library-admin-auth";

export function AdminDashboard() {
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
          <p className="mt-4 text-lg font-black">관리자 데이터 불러오는 중</p>
        </div>
      </main>
    );
  }

  if (status === "error" || !metrics) {
    return (
      <main className="grid min-h-screen place-items-center bg-bg-primary px-5 text-text-primary">
        <section className="glass-panel max-w-md rounded-2xl p-6 text-center">
          <ShieldAlert className="mx-auto h-10 w-10 text-accent-warn" aria-hidden="true" />
          <h1 className="mt-4 text-2xl font-black">관리자 인증이 필요해</h1>
          <p className="mt-3 text-sm font-bold leading-6 text-text-muted">관리자 계정으로 접속한 뒤 다시 불러와줘.</p>
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

  return <AdminDashboardContent metrics={metrics} onRefresh={() => load()} />;
}

function AdminLogin({ onSubmit }: { onSubmit: (token: string) => void }) {
  const [user, setUser] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!user.trim() || !password) {
      setError("관리자 아이디와 비밀번호를 입력해줘.");
      return;
    }
    setError(null);
    onSubmit(window.btoa(`${user.trim()}:${password}`));
  }

  return (
    <main className="grid min-h-screen place-items-center bg-bg-primary px-5 text-text-primary">
      <form onSubmit={submit} className="glass-panel w-full max-w-md rounded-2xl p-6">
        <LockKeyhole className="h-10 w-10 text-accent-info" aria-hidden="true" />
        <p className="mt-5 text-xs font-black uppercase tracking-[0.18em] text-accent-warn">AI 관상가 고양이</p>
        <h1 className="mt-2 text-3xl font-black">관리자 로그인</h1>
        <p className="mt-3 text-sm font-semibold leading-6 text-text-muted">운영 데이터는 관리자 인증 후 확인할 수 있습니다.</p>

        <div className="mt-6 grid gap-4">
          <AdminInput label="아이디" name="adminUser" value={user} autoComplete="username" onChange={(event) => setUser(event.target.value)} />
          <AdminInput label="비밀번호" name="adminPassword" type="password" value={password} autoComplete="current-password" onChange={(event) => setPassword(event.target.value)} />
        </div>

        {error ? <p className="mt-4 rounded-lg border border-accent-bad/35 bg-accent-bad/10 px-4 py-3 text-sm font-bold text-accent-bad">{error}</p> : null}

        <button
          type="submit"
          className="mt-5 inline-flex h-12 w-full items-center justify-center gap-2 rounded-lg border border-accent-info/40 bg-accent-info/[0.18] px-5 text-sm font-black text-text-primary transition hover:bg-accent-info/25"
        >
          <LockKeyhole className="h-5 w-5" aria-hidden="true" />
          데이터 보기
        </button>
      </form>
    </main>
  );
}

function AdminInput(props: InputHTMLAttributes<HTMLInputElement> & { label: string }) {
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

export function AdminDashboardContent({ metrics, onRefresh }: { metrics: AdminMetrics; onRefresh?: () => void }) {
  const recommendedBookRows = useMemo(() => aggregateBooks(metrics.recommendedBooks), [metrics.recommendedBooks]);

  return (
    <main className="min-h-screen bg-bg-primary text-text-primary">
      <div className="mx-auto grid w-full max-w-7xl gap-5 px-5 py-6 md:px-8 md:py-8">
        <header className="glass-panel flex flex-col justify-between gap-5 rounded-2xl p-5 md:flex-row md:items-end md:p-7">
          <div>
            <p className="text-xs font-black uppercase tracking-[0.18em] text-accent-warn">AI 관상가 고양이</p>
            <h1 className="mt-3 text-[clamp(2rem,4vw,4.75rem)] font-black leading-none">관리자 데이터</h1>
            <p className="mt-4 text-sm font-semibold leading-6 text-text-muted">부스 운영 흐름, 추천 집계, 참여 세션을 한 화면에서 확인합니다.</p>
          </div>
          <button
            type="button"
            className="inline-flex h-11 items-center justify-center gap-2 rounded-lg border border-border bg-bg-card/70 px-4 text-sm font-black text-text-primary transition hover:border-border-bright hover:bg-bg-card-hover"
            onClick={onRefresh}
          >
            <RefreshCw className="h-4 w-4" aria-hidden="true" />
            새로고침
          </button>
        </header>

        <section className="grid gap-4 md:grid-cols-2">
          <AdminStatCard label="오늘 참여자 수" value={metrics.todayParticipants} />
          <AdminStatCard label="오늘 추천된 책 수" value={metrics.todayRecommendedBookCount} />
        </section>

        <section className="glass-panel rounded-2xl p-5 md:p-6">
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="text-xs font-black uppercase tracking-[0.16em] text-accent-warn">PARTICIPANTS</p>
              <h2 className="mt-2 text-2xl font-black">오늘 시간대별 참여자 수</h2>
            </div>
            <p className="rounded-full border border-accent-info/25 bg-accent-info/10 px-3 py-1 text-sm font-black text-accent-info">{metrics.todayParticipants}명</p>
          </div>
          <HourlyChart values={metrics.hourlyParticipants} />
        </section>

        <section className="grid gap-4 lg:grid-cols-3">
          <DistributionPanel title="선호 독서 카테고리 분포" values={metrics.categoryDistribution} />
          <DistributionPanel title="추천 분야 분포" values={metrics.recommendationCategoryDistribution} />
          <DistributionPanel title="추천 태그 분포" values={metrics.recommendationTagDistribution} />
        </section>

        <section className="glass-panel rounded-2xl p-5 md:p-6">
          <p className="text-xs font-black uppercase tracking-[0.16em] text-accent-warn">BOOK LIST</p>
          <h2 className="mt-2 text-2xl font-black">오늘 추천된 책</h2>
          <div className="mt-5 overflow-x-auto">
            <table className="w-full min-w-[760px] border-separate border-spacing-0 text-left text-sm">
              <thead className="text-xs font-black uppercase tracking-[0.1em] text-text-faint">
                <tr>
                  <TableHead>책</TableHead>
                  <TableHead>저자</TableHead>
                  <TableHead>분야</TableHead>
                  <TableHead>추천 수</TableHead>
                  <TableHead>태그</TableHead>
                </tr>
              </thead>
              <tbody>
                {recommendedBookRows.map((book) => (
                  <tr key={book.key} className="align-top">
                    <TableCell strong>{book.title}</TableCell>
                    <TableCell>{book.author}</TableCell>
                    <TableCell accent>{book.category || "-"}</TableCell>
                    <TableCell strong>{book.count}</TableCell>
                    <TableCell>{book.tags.join(", ") || "-"}</TableCell>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        <section className="glass-panel rounded-2xl p-5 md:p-6">
          <p className="text-xs font-black uppercase tracking-[0.16em] text-accent-warn">SESSIONS</p>
          <h2 className="mt-2 text-2xl font-black">오늘 참여 세션</h2>
          <div className="mt-5 overflow-x-auto">
            <table className="w-full min-w-[640px] border-separate border-spacing-0 text-left text-sm">
              <thead className="text-xs font-black uppercase tracking-[0.1em] text-text-faint">
                <tr>
                  <TableHead>시간</TableHead>
                  <TableHead>이름</TableHead>
                  <TableHead>학번/사번</TableHead>
                  <TableHead>타입</TableHead>
                </tr>
              </thead>
              <tbody>
                {metrics.sessions.map((session) => (
                  <tr key={`${session.createdAt}-${session.maskedStudentId}`}>
                    <TableCell strong>{formatTime(session.createdAt)}</TableCell>
                    <TableCell strong>{session.displayName}</TableCell>
                    <TableCell>{session.maskedStudentId}</TableCell>
                    <TableCell accent>{session.readingTypeCode}</TableCell>
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

function AdminStatCard({ label, value }: { label: string; value: number | string }) {
  return (
    <section className="glass-panel rounded-2xl p-5">
      <div className="flex items-center justify-between gap-3">
        <p className="text-sm font-bold text-text-muted">{label}</p>
        <BarChart3 className="h-5 w-5 text-accent-info" aria-hidden="true" />
      </div>
      <p className="mt-3 text-4xl font-black tabular-nums text-text-primary">{value}</p>
    </section>
  );
}

function HourlyChart({ values }: { values: Array<{ hour: number; count: number }> }) {
  const max = Math.max(1, ...values.map((value) => value.count));

  return (
    <div className="mt-5 grid grid-cols-12 gap-2 md:grid-cols-[repeat(24,minmax(0,1fr))]">
      {values.map((value) => (
        <div key={value.hour} className="grid gap-2">
          <div className="flex h-32 items-end rounded-lg border border-border bg-bg-card/70 px-1">
            <div
              className="w-full rounded-md bg-accent-info"
              style={{ height: `${Math.max(value.count ? 10 : 0, (value.count / max) * 100)}%` }}
              title={`${value.hour}시 ${value.count}명`}
            />
          </div>
          <p className="text-center text-[11px] font-black text-text-faint">{value.hour}</p>
        </div>
      ))}
    </div>
  );
}

function DistributionPanel({ title, values }: { title: string; values: Record<string, number> }) {
  const entries = Object.entries(values).sort((a, b) => b[1] - a[1]);
  const max = Math.max(1, ...entries.map((entry) => entry[1]));

  return (
    <section className="glass-panel rounded-2xl p-5">
      <h2 className="text-lg font-black">{title}</h2>
      <div className="mt-4 grid gap-3">
        {entries.length ? (
          entries.map(([label, count]) => (
            <div key={label}>
              <div className="flex justify-between gap-3 text-sm font-bold">
                <span className="text-text-muted">{label}</span>
                <span className="text-accent-info">{count}</span>
              </div>
              <div className="mt-2 h-2 rounded-full bg-white/10">
                <div className="h-full rounded-full bg-accent-info" style={{ width: `${(count / max) * 100}%` }} />
              </div>
            </div>
          ))
        ) : (
          <p className="text-sm font-bold text-text-faint">아직 데이터 없음</p>
        )}
      </div>
    </section>
  );
}

function TableHead({ children }: { children: ReactNode }) {
  return <th className="border-b border-border py-3 pr-4">{children}</th>;
}

function TableCell({ children, strong = false, accent = false }: { children: ReactNode; strong?: boolean; accent?: boolean }) {
  return (
    <td className={["border-b border-border py-3 pr-4", strong ? "font-black text-text-primary" : "font-bold text-text-muted", accent ? "text-accent-info" : ""].join(" ")}>
      {children}
    </td>
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
