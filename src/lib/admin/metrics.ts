import type { BookRecommendation } from "@/types/session";

export const BOOTH_TIME_ZONE = "Asia/Seoul";
export const BOOTH_OPERATION_START_ISO = "2026-05-13T12:25:00+09:00";
export const BOOTH_OPERATION_END_ISO = "2026-05-13T20:00:00+09:00";
export const START_LOG_CORRECTION_MINUTES = 1.5;

const BOOTH_OPERATION_START_MS = new Date(BOOTH_OPERATION_START_ISO).getTime();
const BOOTH_OPERATION_END_MS = new Date(BOOTH_OPERATION_END_ISO).getTime();

const BOOTH_TIME_BUCKETS = [
  { label: "12", startMinute: 12 * 60 + 25, endMinute: 13 * 60 },
  { label: "13", startMinute: 13 * 60, endMinute: 14 * 60 },
  { label: "14", startMinute: 14 * 60, endMinute: 15 * 60 },
  { label: "15", startMinute: 15 * 60, endMinute: 16 * 60 },
  { label: "16", startMinute: 16 * 60, endMinute: 17 * 60 },
  { label: "17", startMinute: 17 * 60, endMinute: 18 * 60 },
  { label: "18", startMinute: 18 * 60, endMinute: 19 * 60 },
  { label: "19", startMinute: 19 * 60, endMinute: 20 * 60 },
] as const;

export type AdminSessionRow = {
  id: string;
  created_at: string;
  favorite_category: string | null;
  need_focus: string | null;
  reading_type_code: string | null;
  result_json: {
    readingType?: {
      displayName?: string | null;
    };
    reading_type?: {
      display_name?: string | null;
    };
    recommendations?: Array<BookRecommendation & { category?: string | null; tags?: string[] | null }>;
  } | null;
  recommended_book_ids?: string[] | null;
  name: string | null;
  display_name: string | null;
  student_id: string | null;
  birth_date: string | null;
  gender: string | null;
};

export type AdminEventRow = {
  created_at: string;
  event_name: string;
  session_id: string | null;
  payload: {
    isMobile?: boolean;
    deviceType?: string;
    clientSessionId?: string;
  } | null;
};

export type AdminBookRow = {
  id: string;
  source: string | null;
  source_id: string | null;
};

type AdminRecommendedBook = BookRecommendation & {
  category?: string | null;
  tags?: string[] | null;
  source?: string | null;
  shelfLocation: string;
};

export type AdminMetrics = {
  todayParticipants: number;
  todayRecommendedBookCount: number;
  recommendationCompleteSessionCount: number;
  recommendationIncompleteSessionCount: number;
  recommendationCompletionRate: number;
  todayBookQrOpens: number;
  todayBookQrMobileOpens: number;
  todayBookQrMobileSessionCount: number;
  qrConversionRate: number;
  averageSessionDurationMinutes: number | null;
  sessionDurationMeasurement: {
    measuredCount: number;
    exactCount: number;
    correctedCount: number;
    pendingCount: number;
    correctionMinutes: number;
    note: string;
  };
  hourlyParticipants: Array<{ label: string; count: number }>;
  categoryDistribution: Record<string, number>;
  needFocusDistribution: Record<string, number>;
  genderDistribution: Record<string, number>;
  birthYearDistribution: Record<string, number>;
  recommendedBooks: AdminRecommendedBook[];
  recommendationCategoryDistribution: Record<string, number>;
  recommendationTagDistribution: Record<string, number>;
  readingTypeDistribution: Record<string, number>;
  sessions: Array<{
    id: string;
    createdAt: string;
    startedAt: string | null;
    endedAt: string | null;
    sessionDurationMinutes: number | null;
    durationSource: "tracked" | "corrected_start" | "missing_end";
    displayName: string;
    studentId: string;
    birthDate: string;
    gender: string;
    favoriteCategory: string;
    needFocus: string;
    recommendedBookTitles: string[];
    mobileQrConvertedAt: string | null;
    readingTypeCode: string;
    readingTypeDisplayName: string;
    resultUrl: string;
  }>;
};

export function buildAdminMetrics(rows: AdminSessionRow[], events: AdminEventRow[] = [], books: AdminBookRow[] = []): AdminMetrics {
  const boothRows = rows
    .filter((row) => isInsideBoothWindow(row.created_at))
    .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
  const boothEvents = events.filter((event) => isAfterBoothStart(event.created_at));
  const boothSessionIds = new Set(boothRows.map((row) => row.id));
  const recommendedBooks = buildRecommendedBooks(boothRows, books);
  const recommendationCounts = boothRows.map((row) => row.result_json?.recommendations?.length ?? 0);
  const recommendationCompleteSessionCount = recommendationCounts.filter((count) => count >= 3).length;
  const bookQrEvents = boothEvents.filter((event) => event.event_name === "book_qr_result_open" && (!event.session_id || boothSessionIds.has(event.session_id)));
  const mobileQrSessionIds = new Set(bookQrEvents.filter(isMobileQrEvent).map((event) => event.session_id).filter(isPresent));
  const sessions = buildAdminSessions(boothRows, boothEvents);
  const measuredDurations = sessions.map((session) => session.sessionDurationMinutes).filter(isNumber);
  const exactCount = sessions.filter((session) => session.durationSource === "tracked" && session.sessionDurationMinutes !== null).length;
  const correctedCount = sessions.filter((session) => session.durationSource === "corrected_start" && session.sessionDurationMinutes !== null).length;

  return {
    todayParticipants: boothRows.length,
    todayRecommendedBookCount: recommendedBooks.length,
    recommendationCompleteSessionCount,
    recommendationIncompleteSessionCount: boothRows.length - recommendationCompleteSessionCount,
    recommendationCompletionRate: boothRows.length > 0 ? (recommendationCompleteSessionCount / boothRows.length) * 100 : 0,
    todayBookQrOpens: bookQrEvents.length,
    todayBookQrMobileOpens: bookQrEvents.filter(isMobileQrEvent).length,
    todayBookQrMobileSessionCount: mobileQrSessionIds.size,
    qrConversionRate: boothRows.length > 0 ? (mobileQrSessionIds.size / boothRows.length) * 100 : 0,
    averageSessionDurationMinutes: measuredDurations.length ? average(measuredDurations) : null,
    sessionDurationMeasurement: {
      measuredCount: measuredDurations.length,
      exactCount,
      correctedCount,
      pendingCount: sessions.length - measuredDurations.length,
      correctionMinutes: START_LOG_CORRECTION_MINUTES,
      note: `name_input_started 로그가 없는 세션은 library_sessions.created_at에서 ${START_LOG_CORRECTION_MINUTES}분을 빼서 시작 시간을 보정합니다.`,
    },
    hourlyParticipants: buildHourlyParticipants(boothRows.map((row) => row.created_at)),
    categoryDistribution: countBy(boothRows.map((row) => row.favorite_category).filter(isPresent)),
    needFocusDistribution: countBy(boothRows.map((row) => row.need_focus).filter(isPresent)),
    genderDistribution: countBy(boothRows.map((row) => row.gender).filter(isPresent)),
    birthYearDistribution: countBy(boothRows.map((row) => birthYearFromDate(row.birth_date)).filter(isPresent)),
    recommendedBooks,
    recommendationCategoryDistribution: countBy(recommendedBooks.map((book) => book.category).filter(isPresent)),
    recommendationTagDistribution: countBy(recommendedBooks.flatMap((book) => book.tags ?? []).filter(isPresent)),
    readingTypeDistribution: countBy(boothRows.map((row) => row.reading_type_code).filter(isPresent)),
    sessions,
  };
}

export function buildHourlyParticipants(values: string[]) {
  const counts = BOOTH_TIME_BUCKETS.map((bucket) => ({ label: bucket.label, count: 0 }));
  for (const value of values) {
    const minute = minutesSinceKstMidnight(value);
    if (minute === null) continue;
    const index = BOOTH_TIME_BUCKETS.findIndex((bucket) => minute >= bucket.startMinute && minute < bucket.endMinute);
    if (index >= 0) counts[index]!.count += 1;
  }
  return counts;
}

export function countBy(values: string[]) {
  return values.reduce<Record<string, number>>((acc, value) => {
    acc[value] = (acc[value] ?? 0) + 1;
    return acc;
  }, {});
}

export function getBoothMetricWindow() {
  return {
    startIso: new Date(BOOTH_OPERATION_START_ISO).toISOString(),
    endIso: new Date(BOOTH_OPERATION_END_ISO).toISOString(),
    label: "2026.05.13 12:25-20:00 KST",
  };
}

function buildAdminSessions(rows: AdminSessionRow[], events: AdminEventRow[]): AdminMetrics["sessions"] {
  const startedByClientSessionId = new Map<string, AdminEventRow>();
  const clientSessionIdBySessionId = new Map<string, string>();
  const endedBySessionId = new Map<string, AdminEventRow>();
  const mobileQrBySessionId = new Map<string, AdminEventRow>();

  for (const event of events) {
    const clientSessionId = event.payload?.clientSessionId;
    if (event.event_name === "name_input_started" && clientSessionId) {
      const current = startedByClientSessionId.get(clientSessionId);
      if (!current || new Date(event.created_at).getTime() < new Date(current.created_at).getTime()) {
        startedByClientSessionId.set(clientSessionId, event);
      }
    }

    if (event.event_name === "analysis_session_created" && event.session_id && clientSessionId) {
      clientSessionIdBySessionId.set(event.session_id, clientSessionId);
    }

    if (event.event_name === "result_reanalysis_requested" && event.session_id) {
      const current = endedBySessionId.get(event.session_id);
      if (!current || new Date(event.created_at).getTime() < new Date(current.created_at).getTime()) {
        endedBySessionId.set(event.session_id, event);
      }
    }

    if (event.event_name === "book_qr_result_open" && event.session_id && isMobileQrEvent(event)) {
      const current = mobileQrBySessionId.get(event.session_id);
      if (!current || new Date(event.created_at).getTime() < new Date(current.created_at).getTime()) {
        mobileQrBySessionId.set(event.session_id, event);
      }
    }
  }

  return rows.map((row) => {
    const clientSessionId = clientSessionIdBySessionId.get(row.id);
    const trackedStart = clientSessionId ? startedByClientSessionId.get(clientSessionId) : null;
    const correctedStartMs = new Date(row.created_at).getTime() - START_LOG_CORRECTION_MINUTES * 60_000;
    const startMs = trackedStart ? new Date(trackedStart.created_at).getTime() : correctedStartMs;
    const ended = endedBySessionId.get(row.id);
    const endMs = ended ? new Date(ended.created_at).getTime() : null;
    const hasDuration = endMs !== null && Number.isFinite(startMs) && endMs >= startMs;
    const readingTypeDisplayName = row.result_json?.readingType?.displayName ?? row.result_json?.reading_type?.display_name ?? row.reading_type_code ?? "-";
    const recommendedBookTitles = (row.result_json?.recommendations ?? []).map((book) => book.title).filter(isPresent);
    const mobileQrConvertedAt = mobileQrBySessionId.get(row.id)?.created_at ?? null;

    return {
      id: row.id,
      createdAt: row.created_at,
      startedAt: trackedStart ? trackedStart.created_at : Number.isFinite(correctedStartMs) ? new Date(correctedStartMs).toISOString() : null,
      endedAt: ended?.created_at ?? null,
      sessionDurationMinutes: hasDuration ? (endMs - startMs) / 60_000 : null,
      durationSource: hasDuration ? (trackedStart ? "tracked" : "corrected_start") : "missing_end",
      displayName: row.name ?? row.display_name ?? "-",
      studentId: row.student_id ?? "-",
      birthDate: row.birth_date ?? "-",
      gender: row.gender ?? "-",
      favoriteCategory: row.favorite_category ?? "-",
      needFocus: row.need_focus ?? "-",
      recommendedBookTitles,
      mobileQrConvertedAt,
      readingTypeCode: row.reading_type_code ?? "-",
      readingTypeDisplayName,
      resultUrl: `/result/${row.id}`,
    };
  });
}

function buildRecommendedBooks(rows: AdminSessionRow[], books: AdminBookRow[]): AdminRecommendedBook[] {
  const sourceById = new Map(books.map((book) => [book.id, book.source]));
  const sourceBySourceId = new Map<string, string | null>();
  for (const book of books) {
    if (book.source_id && !sourceBySourceId.has(book.source_id)) {
      sourceBySourceId.set(book.source_id, book.source);
    }
  }

  return rows.flatMap((row) =>
    (row.result_json?.recommendations ?? []).map((book, index) => {
      const databaseId = row.recommended_book_ids?.[index];
      const source = (databaseId ? sourceById.get(databaseId) : undefined) ?? sourceBySourceId.get(book.bookId) ?? null;

      return {
        ...book,
        source,
        shelfLocation: shelfLocationFromBookSource(source),
      };
    }),
  );
}

export function shelfLocationFromBookSource(source: string | null | undefined) {
  if (source === "gachon_curation") return "북큐레이션코너";
  if (source === "gachon_open") return "오픈라이브러리";
  return "-";
}

function isInsideBoothWindow(value: string) {
  const time = new Date(value).getTime();
  return Number.isFinite(time) && time >= BOOTH_OPERATION_START_MS && time < BOOTH_OPERATION_END_MS;
}

function isAfterBoothStart(value: string) {
  const time = new Date(value).getTime();
  return Number.isFinite(time) && time >= BOOTH_OPERATION_START_MS;
}

function isPresent(value: string | null | undefined): value is string {
  return Boolean(value);
}

function isNumber(value: number | null | undefined): value is number {
  return typeof value === "number" && Number.isFinite(value);
}

function isMobileQrEvent(event: AdminEventRow) {
  return event.payload?.isMobile === true || event.payload?.deviceType === "mobile";
}

function average(values: number[]) {
  return values.reduce((sum, value) => sum + value, 0) / values.length;
}

function birthYearFromDate(value: string | null | undefined) {
  if (!value) return null;
  const match = value.match(/^(\d{4})/);
  return match?.[1] ?? null;
}

function minutesSinceKstMidnight(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return null;

  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: BOOTH_TIME_ZONE,
    hour12: false,
    hour: "2-digit",
    minute: "2-digit",
  }).formatToParts(date);
  const hour = Number(parts.find((part) => part.type === "hour")?.value);
  const minute = Number(parts.find((part) => part.type === "minute")?.value);
  if (!Number.isFinite(hour) || !Number.isFinite(minute)) return null;
  return hour * 60 + minute;
}
