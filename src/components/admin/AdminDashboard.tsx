"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import type { InputHTMLAttributes, ReactNode } from "react";
import { BarChart3, BookOpen, Clock3, Loader2, LockKeyhole, QrCode, RefreshCw, ShieldAlert, Smartphone, Users } from "lucide-react";
import { ThemeToggle } from "@/components/theme/ThemeToggle";
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
          <p className="mt-4 text-lg font-semibold">관리자 대시보드 불러오는 중</p>
        </div>
      </main>
    );
  }

  if (status === "error" || !metrics) {
    return (
      <main className="grid min-h-screen place-items-center bg-bg-primary px-5 text-text-primary">
        <section className="glass-panel max-w-md rounded-2xl p-6 text-center">
          <ShieldAlert className="mx-auto h-10 w-10 text-accent-info" aria-hidden="true" />
          <h1 className="mt-4 text-2xl font-black">관리자 인증이 필요해요</h1>
          <p className="mt-3 text-sm font-bold leading-6 text-text-muted">관리자 계정으로 접속한 뒤 다시 불러와 주세요.</p>
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
      setError("관리자 아이디와 비밀번호를 입력해 주세요.");
      return;
    }
    setError(null);
    onSubmit(window.btoa(`${user.trim()}:${password}`));
  }

  return (
    <main className="grid min-h-screen place-items-center bg-bg-primary px-5 text-text-primary">
      <div className="fixed right-8 top-6 z-30">
        <ThemeToggle />
      </div>
      <form onSubmit={submit} className="glass-panel w-full max-w-md rounded-2xl p-6">
        <LockKeyhole className="h-10 w-10 text-accent-info" aria-hidden="true" />
        <p className="mt-5 text-xs font-black uppercase tracking-[0.18em] text-accent-info">AI 관상가 고양이</p>
        <h1 className="mt-2 text-3xl font-black">관리자 로그인</h1>
        <p className="mt-3 text-sm font-semibold leading-6 text-text-muted">운영 데이터는 관리자 인증 후 확인할 수 있어요.</p>

        <div className="mt-6 grid gap-4">
          <AdminInput label="아이디" name="adminUser" value={user} autoComplete="username" onChange={(event) => setUser(event.target.value)} />
          <AdminInput label="비밀번호" name="adminPassword" type="password" value={password} autoComplete="current-password" onChange={(event) => setPassword(event.target.value)} />
        </div>

        {error ? <p className="mt-4 rounded-xl border border-accent-info/35 bg-accent-info/10 px-4 py-3 text-sm font-bold text-text-primary">{error}</p> : null}

        <button
          type="submit"
          className="mt-5 inline-flex h-12 w-full items-center justify-center gap-2 rounded-xl border border-accent-info/40 bg-accent-info/[0.18] px-5 text-sm font-black text-text-primary shadow-glass transition hover:bg-accent-info/25"
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
    <label className="grid gap-2.5 text-sm font-black text-text-primary" htmlFor={inputId}>
      <span>{label}</span>
      <input
        id={inputId}
        name={name}
        className={`h-12 rounded-xl border border-border bg-bg-card/80 px-4 text-sm font-bold text-text-primary outline-none transition placeholder:text-text-faint focus:border-accent-info focus:ring-2 focus:ring-accent-info/25 ${className}`.trim()}
        {...inputProps}
      />
    </label>
  );
}

export function AdminDashboardContent({ metrics, onRefresh }: { metrics: AdminMetrics; onRefresh?: () => void }) {
  const recommendedBookRows = useMemo(() => aggregateBooks(metrics.recommendedBooks), [metrics.recommendedBooks]);
  const peakHour = useMemo(() => findPeakHour(metrics.hourlyParticipants), [metrics.hourlyParticipants]);
  const averageRecommendations = metrics.todayParticipants > 0 ? metrics.todayRecommendedBookCount / metrics.todayParticipants : 0;
  const qrMobileRate = metrics.todayBookQrOpens > 0 ? (metrics.todayBookQrMobileOpens / metrics.todayBookQrOpens) * 100 : 0;
  const maxBookCount = Math.max(1, ...recommendedBookRows.map((book) => book.count));

  return (
    <main className="admin-dashboard-shell min-h-screen bg-bg-primary text-text-primary">
      <div className="mx-auto grid w-full max-w-7xl gap-5 px-5 py-6 md:px-8 md:py-8">
        <header className="admin-panel flex flex-col justify-between gap-5 rounded-xl p-5 md:flex-row md:items-end md:p-6">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.16em] text-accent-info">AI 관상가 고양이</p>
            <h1 className="mt-2 text-3xl font-bold leading-tight md:text-4xl">관리자 대시보드</h1>
            <p className="mt-3 text-sm font-medium leading-6 text-text-muted">오늘의 참여 흐름, 추천 분포, 세션 기록을 확인합니다.</p>
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
          </div>
        </header>

        <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-6">
          <MetricCard label="오늘 참여자" value={metrics.todayParticipants} unit="명" icon={<Users className="h-4 w-4" aria-hidden="true" />} />
          <MetricCard label="추천 도서" value={metrics.todayRecommendedBookCount} unit="권" icon={<BookOpen className="h-4 w-4" aria-hidden="true" />} />
          <MetricCard label="피크 시간대" value={peakHour ? `${peakHour.hour}시` : "-"} helper={peakHour ? `${peakHour.count}명 참여` : "데이터 없음"} icon={<Clock3 className="h-4 w-4" aria-hidden="true" />} />
          <MetricCard label="세션당 추천" value={formatDecimal(averageRecommendations)} unit="권" icon={<BarChart3 className="h-4 w-4" aria-hidden="true" />} />
          <MetricCard label="QR 접속" value={metrics.todayBookQrOpens} unit="회" icon={<QrCode className="h-4 w-4" aria-hidden="true" />} />
          <MetricCard label="모바일 QR" value={metrics.todayBookQrMobileOpens} unit="회" helper={metrics.todayBookQrOpens ? `${formatDecimal(qrMobileRate)}%` : "데이터 없음"} icon={<Smartphone className="h-4 w-4" aria-hidden="true" />} />
        </section>

        <Panel className="p-5 md:p-6">
          <SectionHeader eyebrow="PARTICIPANTS" title="오늘 시간대별 참여자 수" aside={`${metrics.todayParticipants}명`} />
          <HourlyChart values={metrics.hourlyParticipants} />
        </Panel>

        <section className="grid gap-4 lg:grid-cols-2">
          <HorizontalBarChart eyebrow="PREFERENCE" title="선호 독서 카테고리" values={metrics.categoryDistribution} limit={6} />
          <HorizontalBarChart eyebrow="RECOMMEND" title="추천 분야 분포" values={metrics.recommendationCategoryDistribution} limit={6} />
          <Panel className="p-5 md:p-6">
            <SectionHeader eyebrow="TAGS" title="추천 태그 TOP" />
            <HorizontalBarList values={metrics.recommendationTagDistribution} limit={10} />
          </Panel>

          <Panel className="p-5 md:p-6">
            <SectionHeader eyebrow="BOOK RANKING" title="오늘 추천된 책" aside={recommendedBookRows.length ? `${recommendedBookRows.length}종` : undefined} />
            {recommendedBookRows.length ? (
              <div className="mt-5 overflow-x-auto">
                <table className="w-full min-w-[640px] border-separate border-spacing-0 text-left text-sm">
                  <thead className="text-xs font-semibold uppercase tracking-[0.1em] text-text-faint">
                    <tr>
                      <TableHead>책</TableHead>
                      <TableHead>저자</TableHead>
                      <TableHead>추천</TableHead>
                      <TableHead>태그</TableHead>
                    </tr>
                  </thead>
                  <tbody>
                    {recommendedBookRows.map((book) => (
                      <tr key={book.key} className="align-top">
                        <TableCell strong>{book.title}</TableCell>
                        <TableCell>{book.author}</TableCell>
                        <TableCell>
                          <div className="flex min-w-24 items-center gap-3">
                            <span className="w-5 font-semibold tabular-nums text-text-primary">{book.count}</span>
                            <div className="h-2 flex-1 rounded-full bg-bg-raised">
                              <div className="h-full rounded-full bg-accent-info" style={{ width: `${(book.count / maxBookCount) * 100}%` }} />
                            </div>
                          </div>
                        </TableCell>
                        <TableCell>{book.tags.join(", ") || book.category || "-"}</TableCell>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <EmptyState label="아직 추천된 책이 없습니다." />
            )}
          </Panel>
        </section>

        <Panel className="p-5 md:p-6">
          <SectionHeader eyebrow="SESSIONS" title="최근 참여 세션" />
          <div className="mt-5 overflow-x-auto">
            <table className="w-full min-w-[640px] border-separate border-spacing-0 text-left text-sm">
              <thead className="text-xs font-semibold uppercase tracking-[0.1em] text-text-faint">
                <tr>
                  <TableHead>시간</TableHead>
                  <TableHead>이름</TableHead>
                  <TableHead>학번/사번</TableHead>
                  <TableHead>타입</TableHead>
                </tr>
              </thead>
              <tbody>
                {metrics.sessions.length ? (
                  metrics.sessions.map((session) => (
                    <tr key={`${session.createdAt}-${session.maskedStudentId}`}>
                      <TableCell strong>{formatTime(session.createdAt)}</TableCell>
                      <TableCell strong>{session.displayName}</TableCell>
                      <TableCell>{session.maskedStudentId}</TableCell>
                      <TableCell accent>{session.readingTypeCode}</TableCell>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <TableCell colSpan={4}>아직 참여 세션이 없습니다.</TableCell>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </Panel>
      </div>
    </main>
  );
}

function Panel({ children, className = "" }: { children: ReactNode; className?: string }) {
  return <section className={`admin-panel rounded-xl ${className}`.trim()}>{children}</section>;
}

function SectionHeader({ eyebrow, title, aside }: { eyebrow: string; title: string; aside?: ReactNode }) {
  return (
    <div className="flex items-start justify-between gap-4">
      <div>
        <p className="text-xs font-bold uppercase tracking-[0.16em] text-accent-info">{eyebrow}</p>
        <h2 className="mt-2 text-xl font-semibold leading-tight md:text-2xl">{title}</h2>
      </div>
      {aside ? <div className="rounded-full border border-border bg-bg-card px-3 py-1 text-sm font-semibold text-accent-info">{aside}</div> : null}
    </div>
  );
}

function MetricCard({ label, value, unit, helper, icon }: { label: string; value: number | string; unit?: string; helper?: string; icon: ReactNode }) {
  return (
    <section className="admin-panel rounded-xl p-4">
      <div className="flex items-center justify-between gap-3">
        <p className="text-sm font-semibold text-text-muted">{label}</p>
        <span className="grid h-8 w-8 place-items-center rounded-lg border border-border bg-bg-raised/60 text-accent-info">{icon}</span>
      </div>
      <p className="mt-4 text-3xl font-semibold tabular-nums text-text-primary">
        {value}
        {unit ? <span className="ml-1 text-base font-semibold text-text-muted">{unit}</span> : null}
      </p>
      {helper ? <p className="mt-1 text-xs font-medium text-text-faint">{helper}</p> : null}
    </section>
  );
}

function HourlyChart({ values }: { values: Array<{ hour: number; count: number }> }) {
  const max = Math.max(1, ...values.map((value) => value.count));

  return (
    <div className="admin-chart-grid mt-6 grid grid-cols-12 gap-2 rounded-xl border border-border bg-bg-card/60 p-3 md:grid-cols-[repeat(24,minmax(0,1fr))]">
      {values.map((value) => (
        <div key={value.hour} className="grid gap-2">
          <div className="flex h-36 items-end rounded-md bg-bg-raised/60 px-1.5">
            <div
              className="w-full rounded-t-md bg-accent-info"
              style={{ height: `${Math.max(value.count ? 12 : 0, (value.count / max) * 100)}%` }}
              title={`${value.hour}시 ${value.count}명`}
            />
          </div>
          <p className="text-center text-[11px] font-semibold text-text-faint">{value.hour}</p>
        </div>
      ))}
    </div>
  );
}

function HorizontalBarChart({ eyebrow, title, values, limit = 6 }: { eyebrow: string; title: string; values: Record<string, number>; limit?: number }) {
  return (
    <Panel className="p-5">
      <SectionHeader eyebrow={eyebrow} title={title} />
      <HorizontalBarList values={values} limit={limit} />
    </Panel>
  );
}

function HorizontalBarList({ values, limit = 6 }: { values: Record<string, number>; limit?: number }) {
  const entries = Object.entries(values).sort((a, b) => b[1] - a[1]);
  const visibleEntries = entries.slice(0, limit);
  const max = Math.max(1, ...entries.map((entry) => entry[1]));
  const total = entries.reduce((sum, entry) => sum + entry[1], 0);

  return (
      <div className="mt-5 grid gap-4">
        {entries.length ? (
          visibleEntries.map(([label, count]) => (
            <div key={label}>
              <div className="flex justify-between gap-3 text-sm font-medium">
                <span className="min-w-0 truncate text-text-muted">{label}</span>
                <span className="shrink-0 font-semibold tabular-nums text-text-primary">
                  {count}
                  {total ? <span className="ml-1 text-xs font-medium text-text-faint">({Math.round((count / total) * 100)}%)</span> : null}
                </span>
              </div>
              <div className="mt-2 h-2.5 rounded-full bg-bg-raised">
                <div className="h-full rounded-full bg-accent-info" style={{ width: `${(count / max) * 100}%` }} />
              </div>
            </div>
          ))
        ) : (
          <EmptyState label="아직 데이터 없음" />
        )}
      </div>
  );
}

function EmptyState({ label }: { label: string }) {
  return <p className="mt-5 rounded-lg border border-dashed border-border bg-bg-card/50 px-4 py-4 text-center text-sm font-medium text-text-faint">{label}</p>;
}

function TableHead({ children }: { children: ReactNode }) {
  return <th className="border-b border-border py-3 pr-4 font-semibold">{children}</th>;
}

function TableCell({ children, strong = false, accent = false, colSpan }: { children: ReactNode; strong?: boolean; accent?: boolean; colSpan?: number }) {
  return (
    <td colSpan={colSpan} className={["border-b border-border py-3 pr-4", strong ? "font-semibold text-text-primary" : "font-medium text-text-muted", accent ? "text-accent-info" : ""].join(" ")}>
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

function findPeakHour(values: Array<{ hour: number; count: number }>) {
  const peak = values.reduce<{ hour: number; count: number } | null>((current, value) => {
    if (!current || value.count > current.count) return value;
    return current;
  }, null);

  return peak && peak.count > 0 ? peak : null;
}

function formatDecimal(value: number) {
  return new Intl.NumberFormat("ko-KR", {
    maximumFractionDigits: 1,
    minimumFractionDigits: value > 0 && value < 10 ? 1 : 0,
  }).format(value);
}
