"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import type { InputHTMLAttributes, MouseEvent as ReactMouseEvent, ReactNode } from "react";
import Image from "next/image";
import Link from "next/link";
import { BookOpen, CheckCircle2, Clock3, Download, ExternalLink, Loader2, LockKeyhole, Percent, RefreshCw, ShieldAlert, Users, X } from "lucide-react";
import { ThemeToggle } from "@/components/theme/ThemeToggle";
import { aggregateRecommendedBooks } from "@/lib/admin/bookRanking";
import type { AdminMetrics } from "@/lib/admin/metrics";

export const ADMIN_AUTH_STORAGE_KEY = "ai-library-admin-auth";

const EVENT_GALLERY_IMAGES = Array.from({ length: 30 }, (_, index) => `/event-gallery/2026-05-13/${String(index + 1).padStart(2, "0")}.jpeg`);

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

export function AdminLogin({ onSubmit }: { onSubmit: (token: string) => void }) {
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
  const recommendedBookRows = useMemo(() => aggregateRecommendedBooks(metrics.recommendedBooks), [metrics.recommendedBooks]);
  const topBookRows = recommendedBookRows.slice(0, 6);
  const peakHour = useMemo(() => findPeakHour(metrics.hourlyParticipants), [metrics.hourlyParticipants]);
  const maxBookCount = Math.max(1, ...recommendedBookRows.map((book) => book.count));
  const formattedNeedFocusDistribution = useMemo(() => formatNeedFocusDistribution(metrics.needFocusDistribution), [metrics.needFocusDistribution]);
  const formattedGenderDistribution = useMemo(() => formatGenderDistribution(metrics.genderDistribution), [metrics.genderDistribution]);
  const formattedBirthYearDistribution = useMemo(() => formatBirthYearDistribution(metrics.birthYearDistribution), [metrics.birthYearDistribution]);
  const visibleSessions = metrics.sessions.filter((session) => !isHiddenDashboardSession(session)).slice(0, 5);

  return (
    <main className="admin-dashboard-shell min-h-screen overflow-x-hidden bg-bg-primary text-text-primary">
      <div className="mx-auto grid min-w-0 w-full max-w-7xl gap-5 px-5 py-6 md:px-8 md:py-8">
        <header className="admin-panel flex flex-col justify-between gap-5 rounded-xl p-5 md:flex-row md:items-end md:p-6">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.16em] text-accent-info">AI 관상가 고양이</p>
            <h1 className="mt-2 text-3xl font-bold leading-tight md:text-4xl">5/13(수) 부스 결과 보고 대시보드</h1>
            <p className="mt-3 text-sm font-medium leading-6 text-text-muted">가천대학교 중앙도서관 5/13(수) 부스 운영 시간(12:20~19:20)의 참여 규모, 관심사, 추천 반응 데이터를 요약합니다.</p>
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

        <section className="grid min-w-0 gap-3 sm:grid-cols-2 xl:grid-cols-5">
          <MetricCard label="참여자" value={metrics.todayParticipants} unit="명" icon={<Users className="h-4 w-4" aria-hidden="true" />} />
          <MetricCard label="추천 도서" value={metrics.todayRecommendedBookCount} unit="권" icon={<BookOpen className="h-4 w-4" aria-hidden="true" />} />
          <MetricCard label="피크 시간대" value={peakHour ? `${peakHour.label}시` : "-"} helper={peakHour ? `${peakHour.count}명 참여` : "데이터 없음"} icon={<Clock3 className="h-4 w-4" aria-hidden="true" />} />
          <MetricCard label="추천 완료율" value={formatDecimal(metrics.recommendationCompletionRate)} unit="%" helper={`${metrics.todayParticipants}명 중 ${metrics.recommendationCompleteSessionCount}명에게 3권 추천`} icon={<CheckCircle2 className="h-4 w-4" aria-hidden="true" />} />
          <MetricCard label="모바일 QR 접속 전환율" value={formatDecimal(metrics.qrConversionRate)} unit="%" helper={`${metrics.todayBookQrMobileSessionCount}명 전환 · ${metrics.todayBookQrMobileOpens}회 접속`} icon={<Percent className="h-4 w-4" aria-hidden="true" />} />
        </section>

        <Panel className="p-5 md:p-6">
          <SectionHeader eyebrow="PARTICIPANTS" title="운영 시간대별 참여자 수" aside="KST · 12-19" />
          <HourlyChart values={metrics.hourlyParticipants} />
        </Panel>

        <section className="grid min-w-0 gap-4 lg:grid-cols-2">
          <HorizontalBarChart eyebrow="PREFERENCE" title="선호 독서 카테고리" values={metrics.categoryDistribution} limit={6} />
          <HorizontalBarChart eyebrow="NEEDS" title="지금 나에게 가장 필요한 것은?" values={formattedNeedFocusDistribution} limit={4} />
          <HorizontalBarChart eyebrow="GENDER" title="성별 비율" values={formattedGenderDistribution} limit={4} />
          <PieDistributionCard eyebrow="BIRTH YEAR" title="출생연도 비율" values={formattedBirthYearDistribution} limit={8} />
          <Panel className="flex h-full flex-col p-5 md:p-6">
            <SectionHeader
              eyebrow="TAGS"
              title="추천 태그 TOP"
              description="도서별 주제 키워드를 집계한 값입니다. 참여자들이 어떤 독서 맥락과 문제의식에 반응했는지 보는 보조 지표입니다."
            />
            <HorizontalBarList values={metrics.recommendationTagDistribution} limit={10} />
          </Panel>

          <Panel className="flex h-full flex-col p-5 md:p-6">
            <SectionHeader eyebrow="BOOK RANKING" title="추천된 책" aside={recommendedBookRows.length ? `${recommendedBookRows.length}종` : undefined} />
            {topBookRows.length ? (
              <div className="mt-5 flex flex-1 flex-col">
                <ol className="grid gap-3">
                  {topBookRows.map((book, index) => (
                    <li key={book.key} className="rounded-lg border border-border bg-bg-card/60 px-3 py-3">
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <p className="text-xs font-semibold tabular-nums text-accent-info">#{index + 1}</p>
                          <p className="mt-1 truncate text-sm font-semibold text-text-primary">{book.title}</p>
                          <p className="mt-1 truncate text-xs font-medium text-text-faint">{book.author || "-"}</p>
                        </div>
                        <span className="shrink-0 rounded-full border border-accent-info/25 bg-accent-info/10 px-2.5 py-1 text-xs font-black tabular-nums text-accent-info">{book.count}회</span>
                      </div>
                      <div className="mt-2 h-2 rounded-full bg-bg-raised">
                        <div className="h-full rounded-full bg-accent-info" style={{ width: `${(book.count / maxBookCount) * 100}%` }} />
                      </div>
                    </li>
                  ))}
                </ol>
                <Link href="/admindata/books" className="mt-4 inline-flex h-10 items-center justify-center gap-2 rounded-lg border border-border bg-bg-card/80 px-4 text-sm font-semibold text-text-primary transition hover:border-border-bright hover:bg-bg-card-hover">
                  <ExternalLink className="h-4 w-4" aria-hidden="true" />
                  전체 책 목록 보기
                </Link>
              </div>
            ) : (
              <EmptyState label="아직 추천된 책이 없습니다." />
            )}
          </Panel>
        </section>

        <EventGallery images={EVENT_GALLERY_IMAGES} />

        <Panel className="overflow-hidden p-5 md:p-6">
          <SectionHeader
            eyebrow="SESSIONS"
            title="참여 세션"
          />
          <div className="mt-5 overflow-x-auto">
            <table className="w-full min-w-[980px] table-fixed border-separate border-spacing-0 text-left text-xs">
              <colgroup>
                <col className="w-[5.5rem]" />
                <col className="w-[5.2rem]" />
                <col className="w-[6rem]" />
                <col className="w-[6rem]" />
                <col className="w-[4rem]" />
                <col className="w-[7rem]" />
                <col className="w-[9rem]" />
                <col className="w-[6rem]" />
                <col className="w-[14rem]" />
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
                {visibleSessions.length ? (
                  visibleSessions.map((session) => (
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
          <Link href="/admindata/sessions" className="mt-4 inline-flex h-12 w-full items-center justify-center gap-2 rounded-lg border border-border bg-bg-card/80 px-4 text-sm font-semibold text-text-primary transition hover:border-border-bright hover:bg-bg-card-hover">
            <ExternalLink className="h-4 w-4" aria-hidden="true" />
            전체 세션 {metrics.sessions.length}건 보기
          </Link>
        </Panel>
      </div>
    </main>
  );
}

function Panel({ children, className = "" }: { children: ReactNode; className?: string }) {
  return <section className={`admin-panel min-w-0 rounded-xl ${className}`.trim()}>{children}</section>;
}

function SectionHeader({ eyebrow, title, aside, description }: { eyebrow: string; title: string; aside?: ReactNode; description?: string }) {
  const asideNode =
    typeof aside === "string" || typeof aside === "number" ? <div className="rounded-full border border-border bg-bg-card px-3 py-1 text-sm font-semibold text-accent-info">{aside}</div> : aside;

  return (
    <div className="flex items-start justify-between gap-4">
      <div>
        <p className="text-xs font-bold uppercase tracking-[0.16em] text-accent-info">{eyebrow}</p>
        <h2 className="mt-2 text-xl font-semibold leading-tight md:text-2xl">{title}</h2>
        {description ? <p className="mt-2 max-w-2xl text-sm font-medium leading-6 text-text-muted">{description}</p> : null}
      </div>
      {asideNode ? <div className="shrink-0">{asideNode}</div> : null}
    </div>
  );
}

function MetricCard({ label, value, unit, helper, icon }: { label: string; value: number | string; unit?: string; helper?: string; icon: ReactNode }) {
  return (
    <section className="admin-panel grid min-h-[138px] grid-rows-[auto_1fr] rounded-xl p-4">
      <div className="flex items-center justify-between gap-3">
        <p className="min-w-0 text-[13px] font-semibold leading-5 text-text-muted">{label}</p>
        <span className="grid h-8 w-8 place-items-center rounded-lg border border-border bg-bg-raised/60 text-accent-info">{icon}</span>
      </div>
      <div className="mt-4 flex min-h-[72px] flex-col justify-end">
        <p className="flex items-baseline gap-1 text-3xl font-semibold tabular-nums leading-none text-text-primary">
          <span>{value}</span>
          {unit ? <span className="text-base font-semibold text-text-muted">{unit}</span> : null}
        </p>
        <p className="mt-2 min-h-4 text-xs font-medium leading-4 text-text-faint">{helper ?? "\u00A0"}</p>
      </div>
    </section>
  );
}

function HourlyChart({ values }: { values: Array<{ label: string; count: number }> }) {
  const max = Math.max(1, ...values.map((value) => value.count));

  return (
    <div className="admin-chart-grid mt-6 grid grid-cols-8 gap-2 rounded-xl border border-border bg-bg-card/60 p-3">
      {values.map((value) => (
        <div key={value.label} className="group relative grid gap-2">
          <span className="pointer-events-none absolute left-1/2 top-1 z-20 -translate-x-1/2 rounded-md border border-border bg-bg-card px-2.5 py-1 text-xs font-bold tabular-nums text-text-primary opacity-0 shadow-glass transition group-hover:-translate-y-1 group-hover:opacity-100">
            {value.count}명
          </span>
          <div className="flex h-36 items-end rounded-md bg-bg-raised/60 px-1.5">
            <div
              className="w-full rounded-t-md bg-accent-info"
              style={{ height: `${Math.max(value.count ? 12 : 0, (value.count / max) * 100)}%` }}
              title={`${value.label} ${value.count}명`}
            />
          </div>
          <p className="text-center text-[11px] font-semibold text-text-faint">{value.label}</p>
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

const PIE_COLORS = ["#c96442", "#8f7be8", "#2f7f79", "#d8a13c", "#6b7280", "#b4552d", "#64748b", "#7c3aed"];

function PieDistributionCard({ eyebrow, title, values, limit = 8 }: { eyebrow: string; title: string; values: Record<string, number>; limit?: number }) {
  const [hoveredSegment, setHoveredSegment] = useState<DonutSegment | null>(null);
  const [tooltipPosition, setTooltipPosition] = useState({ x: 50, y: 50 });
  const entries = Object.entries(values).sort((a, b) => b[1] - a[1]);
  const visibleEntries = groupDistributionEntries(entries, limit);
  const total = entries.reduce((sum, entry) => sum + entry[1], 0);
  const segments = buildDonutSegments(visibleEntries, total);

  function updateTooltipPosition(event: ReactMouseEvent<SVGPathElement>) {
    const svg = event.currentTarget.ownerSVGElement;
    if (!svg) return;

    const rect = svg.getBoundingClientRect();
    const x = ((event.clientX - rect.left) / rect.width) * 100;
    const y = ((event.clientY - rect.top) / rect.height) * 100;
    setTooltipPosition({
      x: Math.max(8, Math.min(92, x)),
      y: Math.max(10, Math.min(92, y)),
    });
  }

  return (
    <Panel className="p-5 md:p-7">
      <SectionHeader eyebrow={eyebrow} title={title} />
      {visibleEntries.length ? (
        <div className="mx-auto mt-7 grid w-full max-w-[42rem] items-center gap-6 md:grid-cols-[14.5rem_minmax(0,1fr)]">
          <div className="relative mx-auto h-56 w-56 md:mx-0">
            <svg viewBox="0 0 120 120" role="img" aria-label={`${title} 도넛 차트`} className="h-full w-full overflow-visible">
              <circle cx="60" cy="60" r="53" fill="none" stroke="rgb(var(--border-rgb) / 0.36)" strokeWidth="2" />
              {segments.map((segment) => (
                <path
                  key={segment.label}
                  d={segment.path}
                  fill={segment.color}
                  tabIndex={0}
                  role="listitem"
                  aria-label={`${segment.label} ${segment.count}명`}
                  className="cursor-pointer outline-none transition duration-150 hover:opacity-85 focus:opacity-85"
                  onMouseEnter={(event) => {
                    setHoveredSegment(segment);
                    updateTooltipPosition(event);
                  }}
                  onMouseMove={updateTooltipPosition}
                  onFocus={() => {
                    setHoveredSegment(segment);
                    setTooltipPosition({
                      x: Math.max(8, Math.min(92, (segment.tooltipX / 120) * 100)),
                      y: Math.max(10, Math.min(92, (segment.tooltipY / 120) * 100)),
                    });
                  }}
                  onMouseLeave={() => setHoveredSegment(null)}
                  onBlur={() => setHoveredSegment(null)}
                />
              ))}
              <circle cx="60" cy="60" r="27" fill="var(--bg-card)" stroke="rgb(var(--border-rgb) / 0.72)" strokeWidth="1" />
              <text x="60" y="65" textAnchor="middle" fill="var(--text-primary)" className="text-[13px] font-semibold tabular-nums">
                총 {total}명
              </text>
            </svg>
            {hoveredSegment ? (
              <div
                className="pointer-events-none absolute z-20 whitespace-nowrap rounded-lg border border-text-primary/10 bg-text-primary px-3 py-2 text-xs font-bold tabular-nums text-bg-primary shadow-glass"
                style={{
                  left: `${tooltipPosition.x}%`,
                  top: `${tooltipPosition.y}%`,
                  transform: "translate(-50%, calc(-100% - 10px))",
                }}
              >
                {hoveredSegment.label} {hoveredSegment.count}명
                <span className="absolute left-1/2 top-full h-2 w-2 -translate-x-1/2 -translate-y-1/2 rotate-45 bg-text-primary" />
              </div>
            ) : null}
          </div>
          <div className="grid w-full min-w-0 gap-4">
            {segments.map((segment) => (
              <div key={segment.label} className="grid min-w-0 grid-cols-[minmax(0,1fr)_auto] items-center gap-4 text-sm md:text-[15px]">
                <div className="flex min-w-0 items-center gap-3">
                  <span className="h-3 w-3 shrink-0 rounded-full" style={{ backgroundColor: segment.color }} />
                  <span className="min-w-0 truncate font-medium text-text-muted">{segment.label}</span>
                </div>
                <span className="shrink-0 font-semibold tabular-nums text-text-primary">
                  {segment.count}
                  <span className="ml-1 text-xs font-medium text-text-faint">({Math.round(segment.percent)}%)</span>
                </span>
              </div>
            ))}
          </div>
        </div>
      ) : (
        <EmptyState label="아직 데이터 없음" />
      )}
    </Panel>
  );
}

function EventGallery({ images }: { images: string[] }) {
  const [selectedIndex, setSelectedIndex] = useState<number | null>(null);

  useEffect(() => {
    if (selectedIndex === null) return;

    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") setSelectedIndex(null);
    }

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [selectedIndex]);

  const selectedImage = selectedIndex === null ? null : images[selectedIndex];
  const selectedPhotoNumber = selectedIndex === null ? null : selectedIndex + 1;

  return (
    <Panel className="p-5 md:p-6">
      <SectionHeader
        eyebrow="GALLERY"
        title="부스 사진 갤러리"
        aside={`${images.length}장`}
      />
      <div className="mt-5 grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-5 xl:grid-cols-6">
        {images.map((src, index) => (
          <button
            key={src}
            type="button"
            className="group relative aspect-[4/3] min-h-0 overflow-hidden rounded-lg border border-border bg-bg-raised text-left outline-none transition duration-200 hover:-translate-y-0.5 hover:border-border-bright focus-visible:ring-2 focus-visible:ring-accent-info/35"
            onClick={() => setSelectedIndex(index)}
            aria-label={`부스 사진 ${index + 1} 크게 보기`}
          >
            <Image
              src={src}
              alt={`부스 사진 ${index + 1}`}
              fill
              sizes="(min-width: 1280px) 16vw, (min-width: 1024px) 20vw, (min-width: 640px) 33vw, 50vw"
              className="object-cover transition duration-300 group-hover:scale-[1.035]"
              priority={index === 0}
            />
          </button>
        ))}
      </div>

      {selectedImage && selectedPhotoNumber ? (
        <div className="fixed inset-0 z-50 grid place-items-center bg-black/72 px-4 py-6 backdrop-blur-sm" role="dialog" aria-modal="true" aria-label={`부스 사진 ${selectedPhotoNumber}`}>
          <figure className="relative w-[min(92vw,72rem)]">
            <div className="absolute right-3 top-3 z-10 flex items-center gap-2">
              <a
                href={selectedImage}
                download={`booth-gallery-${String(selectedPhotoNumber).padStart(2, "0")}.jpeg`}
                className="grid h-11 w-11 place-items-center rounded-full border border-white/80 bg-black/80 text-white shadow-2xl backdrop-blur transition hover:bg-black/95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/80"
                aria-label="사진 다운로드"
              >
                <Download className="h-5 w-5" aria-hidden="true" />
              </a>
              <button
                type="button"
                className="grid h-11 w-11 place-items-center rounded-full border border-white/80 bg-black/80 text-white shadow-2xl backdrop-blur transition hover:bg-black/95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/80"
                onClick={() => setSelectedIndex(null)}
                aria-label="닫기"
              >
                <X className="h-6 w-6" aria-hidden="true" />
              </button>
            </div>
            <div className="relative aspect-[16/9] w-full">
              <Image src={selectedImage} alt={`부스 사진 ${selectedPhotoNumber}`} fill sizes="90vw" className="rounded-xl object-contain shadow-2xl" />
            </div>
          </figure>
        </div>
      ) : null}
    </Panel>
  );
}

type DonutSegment = {
  label: string;
  count: number;
  percent: number;
  color: string;
  path: string;
  tooltipX: number;
  tooltipY: number;
};

function groupDistributionEntries(entries: Array<[string, number]>, limit: number): Array<[string, number]> {
  if (entries.length <= limit) return entries;

  const visibleLimit = Math.max(1, limit - 1);
  const visibleEntries = entries.slice(0, visibleLimit);
  const otherCount = entries.slice(visibleLimit).reduce((sum, entry) => sum + entry[1], 0);
  return otherCount > 0 ? [...visibleEntries, ["그 외", otherCount]] : visibleEntries;
}

function buildDonutSegments(entries: Array<[string, number]>, total: number): DonutSegment[] {
  if (!entries.length || !total) return [];
  let start = 0;
  return entries.map(([label, count], index) => {
    const end = start + (count / total) * 100;
    const color = PIE_COLORS[index % PIE_COLORS.length];
    const midpoint = (start + end) / 2;
    const point = polarPoint(60, 60, 55, (midpoint / 100) * 360 - 90);
    const segment = {
      label,
      count,
      percent: (count / total) * 100,
      color,
      path: donutSegmentPath(start, end),
      tooltipX: point.x,
      tooltipY: point.y,
    };
    start = end;
    return segment;
  });
}

function donutSegmentPath(startPercent: number, endPercent: number) {
  const outerRadius = 52;
  const innerRadius = 29;
  if (endPercent - startPercent >= 99.999) {
    return [
      `M 60 ${60 - outerRadius}`,
      `A ${outerRadius} ${outerRadius} 0 1 1 60 ${60 + outerRadius}`,
      `A ${outerRadius} ${outerRadius} 0 1 1 60 ${60 - outerRadius}`,
      `M 60 ${60 - innerRadius}`,
      `A ${innerRadius} ${innerRadius} 0 1 0 60 ${60 + innerRadius}`,
      `A ${innerRadius} ${innerRadius} 0 1 0 60 ${60 - innerRadius}`,
      "Z",
    ].join(" ");
  }

  const startAngle = (startPercent / 100) * 360 - 90;
  const endAngle = (endPercent / 100) * 360 - 90;
  const largeArcFlag = endPercent - startPercent > 50 ? 1 : 0;
  const outerStart = polarPoint(60, 60, outerRadius, startAngle);
  const outerEnd = polarPoint(60, 60, outerRadius, endAngle);
  const innerEnd = polarPoint(60, 60, innerRadius, endAngle);
  const innerStart = polarPoint(60, 60, innerRadius, startAngle);

  return [
    `M ${outerStart.x} ${outerStart.y}`,
    `A ${outerRadius} ${outerRadius} 0 ${largeArcFlag} 1 ${outerEnd.x} ${outerEnd.y}`,
    `L ${innerEnd.x} ${innerEnd.y}`,
    `A ${innerRadius} ${innerRadius} 0 ${largeArcFlag} 0 ${innerStart.x} ${innerStart.y}`,
    "Z",
  ].join(" ");
}

function polarPoint(centerX: number, centerY: number, radius: number, angleInDegrees: number) {
  const angleInRadians = (angleInDegrees * Math.PI) / 180;
  return {
    x: centerX + radius * Math.cos(angleInRadians),
    y: centerY + radius * Math.sin(angleInRadians),
  };
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

function TableHead({ children, className = "" }: { children: ReactNode; className?: string }) {
  return <th className={`border-b border-border py-3 pr-4 align-bottom font-semibold leading-5 ${className}`.trim()}>{children}</th>;
}

function TableCell({ children, strong = false, accent = false, colSpan }: { children: ReactNode; strong?: boolean; accent?: boolean; colSpan?: number }) {
  return (
    <td colSpan={colSpan} className={["border-b border-border py-3 pr-4 align-top leading-5", strong ? "font-semibold text-text-primary" : "font-medium text-text-muted", accent ? "text-accent-info" : ""].join(" ")}>
      {children}
    </td>
  );
}

function formatTime(value: string) {
  return new Intl.DateTimeFormat("ko-KR", {
    timeZone: "Asia/Seoul",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(value));
}

function findPeakHour(values: Array<{ label: string; count: number }>) {
  const peak = values.reduce<{ label: string; count: number } | null>((current, value) => {
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

function formatSessionStart(session: AdminMetrics["sessions"][number]) {
  return formatTime(session.startedAt ?? session.createdAt);
}

function isHiddenDashboardSession(session: AdminMetrics["sessions"][number]) {
  if (session.displayName !== "강용림") return false;
  return ["오후 07:15", "오후 07:16"].includes(formatSessionStart(session));
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

function formatGenderDistribution(values: Record<string, number>) {
  return Object.fromEntries(Object.entries(values).map(([key, count]) => [formatGender(key), count]));
}

function formatBirthYearDistribution(values: Record<string, number>) {
  return Object.fromEntries(Object.entries(values).map(([year, count]) => [`${year}년`, count]));
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

function formatNeedFocusDistribution(values: Record<string, number>) {
  return Object.fromEntries(Object.entries(values).map(([key, count]) => [formatNeedFocus(key), count]));
}
