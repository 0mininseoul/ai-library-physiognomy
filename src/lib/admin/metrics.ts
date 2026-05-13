import type { BookRecommendation } from "@/types/session";

export type AdminSessionRow = {
  created_at: string;
  favorite_category: string | null;
  reading_type_code: string | null;
  result_json: {
    recommendations?: Array<BookRecommendation & { category?: string | null; tags?: string[] | null }>;
  } | null;
  display_name: string | null;
  student_id: string | null;
};

export type AdminEventRow = {
  created_at: string;
  event_name: string;
  payload: {
    isMobile?: boolean;
    deviceType?: string;
  } | null;
};

export type AdminMetrics = {
  todayParticipants: number;
  todayRecommendedBookCount: number;
  todayBookQrOpens: number;
  todayBookQrMobileOpens: number;
  hourlyParticipants: Array<{ hour: number; count: number }>;
  categoryDistribution: Record<string, number>;
  recommendedBooks: Array<BookRecommendation & { category?: string | null; tags?: string[] | null }>;
  recommendationCategoryDistribution: Record<string, number>;
  recommendationTagDistribution: Record<string, number>;
  readingTypeDistribution: Record<string, number>;
  sessions: Array<{
    createdAt: string;
    displayName: string;
    maskedStudentId: string;
    readingTypeCode: string;
  }>;
};

export function buildAdminMetrics(rows: AdminSessionRow[], events: AdminEventRow[] = []): AdminMetrics {
  const recommendedBooks = rows.flatMap((row) => row.result_json?.recommendations ?? []);
  const bookQrEvents = events.filter((event) => event.event_name === "book_qr_result_open");

  return {
    todayParticipants: rows.length,
    todayRecommendedBookCount: recommendedBooks.length,
    todayBookQrOpens: bookQrEvents.length,
    todayBookQrMobileOpens: bookQrEvents.filter(isMobileQrEvent).length,
    hourlyParticipants: buildHourlyParticipants(rows.map((row) => row.created_at)),
    categoryDistribution: countBy(rows.map((row) => row.favorite_category).filter(isPresent)),
    recommendedBooks,
    recommendationCategoryDistribution: countBy(recommendedBooks.map((book) => book.category).filter(isPresent)),
    recommendationTagDistribution: countBy(recommendedBooks.flatMap((book) => book.tags ?? []).filter(isPresent)),
    readingTypeDistribution: countBy(rows.map((row) => row.reading_type_code).filter(isPresent)),
    sessions: rows.map((row) => ({
      createdAt: row.created_at,
      displayName: row.display_name ?? "-",
      maskedStudentId: maskStudentId(row.student_id ?? ""),
      readingTypeCode: row.reading_type_code ?? "-",
    })),
  };
}

export function buildHourlyParticipants(values: string[]) {
  const counts = Array.from({ length: 24 }, (_, hour) => ({ hour, count: 0 }));
  for (const value of values) {
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) continue;
    counts[date.getHours()]!.count += 1;
  }
  return counts;
}

export function countBy(values: string[]) {
  return values.reduce<Record<string, number>>((acc, value) => {
    acc[value] = (acc[value] ?? 0) + 1;
    return acc;
  }, {});
}

export function maskStudentId(value: string) {
  return value.length <= 4 ? "****" : `${value.slice(0, -4)}****`;
}

function isPresent(value: string | null | undefined): value is string {
  return Boolean(value);
}

function isMobileQrEvent(event: AdminEventRow) {
  return event.payload?.isMobile === true || event.payload?.deviceType === "mobile";
}
