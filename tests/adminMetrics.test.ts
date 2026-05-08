import { describe, expect, it } from "vitest";
import { buildAdminMetrics, countBy, maskStudentId, type AdminSessionRow } from "@/lib/admin/metrics";

describe("admin metrics helpers", () => {
  it("counts distributions, hourly participants, and masks student IDs", () => {
    const rows: AdminSessionRow[] = [
      {
        created_at: "2026-05-09T01:15:00",
        favorite_category: "소설",
        reading_type_code: "focus_reboot",
        display_name: "영민",
        student_id: "20261234",
        result_json: {
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
          ],
        },
      },
      {
        created_at: "2026-05-09T01:45:00",
        favorite_category: "소설",
        reading_type_code: "focus_reboot",
        display_name: "건우",
        student_id: "1234",
        result_json: { recommendations: [] },
      },
    ];

    const metrics = buildAdminMetrics(rows);

    expect(metrics.todayParticipants).toBe(2);
    expect(metrics.todayRecommendedBookCount).toBe(1);
    expect(metrics.hourlyParticipants[1]?.count).toBe(2);
    expect(metrics.categoryDistribution).toEqual({ 소설: 2 });
    expect(metrics.recommendationCategoryDistribution).toEqual({ 자기계발: 1 });
    expect(metrics.recommendationTagDistribution).toEqual({ 몰입: 1, 루틴: 1 });
    expect(metrics.sessions[0]?.maskedStudentId).toBe("2026****");
    expect(metrics.sessions[1]?.maskedStudentId).toBe("****");
  });

  it("counts arbitrary labels", () => {
    expect(countBy(["소설", "소설", "시/에세이"])).toEqual({ 소설: 2, "시/에세이": 1 });
    expect(maskStudentId("20265555")).toBe("2026****");
  });
});
