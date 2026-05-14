import { describe, expect, it } from "vitest";
import { buildAdminMetrics, countBy, type AdminBookRow, type AdminSessionRow } from "@/lib/admin/metrics";

describe("admin metrics helpers", () => {
  it("counts KST booth metrics, QR conversion, session duration, and full session rows", () => {
    const rows: AdminSessionRow[] = [
      {
        id: "session-1",
        created_at: "2026-05-13T03:27:00.000Z",
        name: "박영민",
        favorite_category: "소설",
        need_focus: "depth",
        reading_type_code: "focus_reboot",
        result_json: {
          readingType: { displayName: "집중력 리부트형" },
          recommendations: [
            {
              bookId: "book-1",
              title: "몰입의 기술",
              author: "김도서",
              category: "자기계발",
              tags: ["몰입", "루틴"],
              callNumber: "181.3 김25ㅁ",
              locationLabel: "중앙도서관",
              reason: "목표 재정렬",
              actionCopy: "지금 빌리기",
            },
            {
              bookId: "OPEN-1",
              title: "열린 서가의 발견",
              author: "이오픈",
              category: "소설",
              tags: ["탐색"],
              callNumber: "813 이65ㅇ",
              locationLabel: "중앙도서관",
              reason: "관심 확장",
              actionCopy: "같이 읽기",
            },
          ],
        },
        recommended_book_ids: ["db-book-1", "db-book-2"],
        display_name: "영민",
        student_id: "20261234",
        birth_date: "2000-03-15",
        gender: "male",
      },
      {
        id: "session-2",
        created_at: "2026-05-13T05:10:00.000Z",
        name: "김건우",
        favorite_category: "소설",
        need_focus: "comfort",
        reading_type_code: "balance_anchor",
        result_json: {
          readingType: { displayName: "균형 앵커형" },
          recommendations: [],
        },
        recommended_book_ids: [],
        display_name: "건우",
        student_id: "1234",
        birth_date: "2001-07-20",
        gender: "female",
      },
      {
        id: "session-before-cutoff",
        created_at: "2026-05-13T03:20:00.000Z",
        name: "제외",
        favorite_category: "소설",
        need_focus: "utility",
        reading_type_code: "focus_reboot",
        result_json: { recommendations: [] },
        recommended_book_ids: [],
        display_name: "제외",
        student_id: "9999",
        birth_date: "2002-01-01",
        gender: "male",
      },
    ];
    const books: AdminBookRow[] = [
      { id: "db-book-1", source: "gachon_curation", source_id: "book-1" },
      { id: "db-book-2", source: "gachon_open", source_id: "OPEN-1" },
    ];

    const metrics = buildAdminMetrics(rows, [
      {
        created_at: "2026-05-13T03:25:10.000Z",
        event_name: "name_input_started",
        session_id: null,
        payload: { clientSessionId: "client-1" },
      },
      {
        created_at: "2026-05-13T03:27:00.000Z",
        event_name: "analysis_session_created",
        session_id: "session-1",
        payload: { clientSessionId: "client-1" },
      },
      {
        created_at: "2026-05-13T03:31:50.000Z",
        event_name: "result_reanalysis_requested",
        session_id: "session-1",
        payload: {},
      },
      {
        created_at: "2026-05-13T05:15:00.000Z",
        event_name: "result_reanalysis_requested",
        session_id: "session-2",
        payload: {},
      },
      {
        created_at: "2026-05-13T03:28:00.000Z",
        event_name: "book_qr_result_open",
        session_id: "session-1",
        payload: { isMobile: true, deviceType: "mobile" },
      },
      {
        created_at: "2026-05-13T03:29:00.000Z",
        event_name: "book_qr_result_open",
        session_id: "session-1",
        payload: { isMobile: false, deviceType: "desktop" },
      },
      {
        created_at: "2026-05-13T03:30:00.000Z",
        event_name: "other_event",
        session_id: "session-1",
        payload: { isMobile: true, deviceType: "mobile" },
      },
    ], books);

    expect(metrics.todayParticipants).toBe(2);
    expect(metrics.todayRecommendedBookCount).toBe(2);
    expect(metrics.recommendationCompleteSessionCount).toBe(0);
    expect(metrics.recommendationIncompleteSessionCount).toBe(2);
    expect(metrics.recommendationCompletionRate).toBe(0);
    expect(metrics.todayBookQrOpens).toBe(2);
    expect(metrics.todayBookQrMobileOpens).toBe(1);
    expect(metrics.todayBookQrMobileSessionCount).toBe(1);
    expect(metrics.qrConversionRate).toBe(50);
    expect(metrics.hourlyParticipants).toHaveLength(8);
    expect(metrics.hourlyParticipants.map((bucket) => bucket.label)).toEqual(["12", "13", "14", "15", "16", "17", "18", "19"]);
    expect(metrics.hourlyParticipants[0]?.count).toBe(1);
    expect(metrics.hourlyParticipants[2]?.count).toBe(1);
    expect(metrics.categoryDistribution).toEqual({ 소설: 2 });
    expect(metrics.needFocusDistribution).toEqual({ depth: 1, comfort: 1 });
    expect(metrics.recommendationCategoryDistribution).toEqual({ 자기계발: 1, 소설: 1 });
    expect(metrics.recommendationTagDistribution).toEqual({ 몰입: 1, 루틴: 1, 탐색: 1 });
    expect(metrics.genderDistribution).toEqual({ male: 1, female: 1 });
    expect(metrics.birthYearDistribution).toEqual({ "2000": 1, "2001": 1 });
    expect(metrics.recommendedBooks.map((book) => [book.title, book.shelfLocation])).toEqual([
      ["몰입의 기술", "북큐레이션코너"],
      ["열린 서가의 발견", "오픈라이브러리"],
    ]);
    expect(metrics.averageSessionDurationMinutes).toBeCloseTo(6.6, 1);
    expect(metrics.sessionDurationMeasurement.exactCount).toBe(1);
    expect(metrics.sessionDurationMeasurement.correctedCount).toBe(1);
    expect(metrics.sessions[0]).toMatchObject({
      displayName: "김건우",
      studentId: "1234",
      birthDate: "2001-07-20",
      gender: "female",
      favoriteCategory: "소설",
      needFocus: "comfort",
      readingTypeCode: "balance_anchor",
      readingTypeDisplayName: "균형 앵커형",
      resultUrl: "/result/session-2",
      durationSource: "corrected_start",
      recommendedBookTitles: [],
      mobileQrConvertedAt: null,
    });
    expect(metrics.sessions[1]).toMatchObject({
      displayName: "박영민",
      studentId: "20261234",
      durationSource: "tracked",
      recommendedBookTitles: ["몰입의 기술", "열린 서가의 발견"],
      mobileQrConvertedAt: "2026-05-13T03:28:00.000Z",
    });
  });

  it("counts arbitrary labels", () => {
    expect(countBy(["소설", "소설", "시/에세이"])).toEqual({ 소설: 2, "시/에세이": 1 });
  });

  it("uses reanalysis events after 20:00 for sessions that started during booth hours", () => {
    const metrics = buildAdminMetrics(
      [
        {
          id: "late-session",
          created_at: "2026-05-13T10:58:00.000Z",
          name: "박마감",
          display_name: "마감",
          student_id: "20260001",
          birth_date: "2000-01-01",
          gender: "male",
          favorite_category: "소설",
          need_focus: "depth",
          reading_type_code: "focus_reboot",
          result_json: { recommendations: [] },
          recommended_book_ids: [],
        },
      ],
      [
        {
          created_at: "2026-05-13T10:59:00.000Z",
          event_name: "analysis_session_created",
          session_id: "late-session",
          payload: { clientSessionId: "late-client" },
        },
        {
          created_at: "2026-05-13T11:02:00.000Z",
          event_name: "result_reanalysis_requested",
          session_id: "late-session",
          payload: {},
        },
      ],
    );

    expect(metrics.todayParticipants).toBe(1);
    expect(metrics.sessions[0]?.sessionDurationMinutes).toBeCloseTo(5.5, 1);
  });
});
