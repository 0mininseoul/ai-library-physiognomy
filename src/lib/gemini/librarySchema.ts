import { z } from "zod";
import { isReadingTypeCode } from "@/lib/reading-types/types";

const rawSchema = z.object({
  reading_type: z.object({
    code: z.string().refine(isReadingTypeCode),
    display_name: z.string().min(1),
    headline: z.string().min(1),
    description: z.string().min(1),
  }),
  physiognomy_summary: z.string().min(1),
  saju_summary: z.string().min(1),
  reading_needs: z.array(z.string().min(1)).min(3).max(6),
  recommendations: z
    .array(
      z.object({
        book_id: z.string().min(1),
        reason: z.string().min(1),
        action_copy: z.string().min(1),
      }),
    )
    .length(3),
});

export function normalizeLibraryAnalysis(input: unknown) {
  const raw = rawSchema.parse(input);
  return {
    readingType: {
      code: raw.reading_type.code,
      displayName: raw.reading_type.display_name,
      headline: raw.reading_type.headline,
      description: raw.reading_type.description,
    },
    physiognomySummary: raw.physiognomy_summary,
    sajuSummary: raw.saju_summary,
    readingNeeds: raw.reading_needs,
    recommendations: raw.recommendations.map((item) => ({
      bookId: item.book_id,
      reason: item.reason,
      actionCopy: item.action_copy,
    })),
  };
}
