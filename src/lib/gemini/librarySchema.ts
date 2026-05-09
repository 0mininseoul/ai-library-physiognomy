import { z } from "zod";
import { isReadingTypeCode } from "@/lib/reading-types/types";

const detailCommentSchema = z.object({
  metrics_text: z.string().min(1),
  comment: z.string().min(1),
});

const scoreSchema = z.number().min(0).max(100);

const rawSchema = z.object({
  reading_type: z.object({
    code: z.string().refine(isReadingTypeCode),
    display_name: z.string().min(1),
    headline: z.string().min(1),
    description: z.string().min(1),
  }),
  main_copy: z.string().min(1),
  geometry: z.object({
    symmetry: z.string().min(1),
    golden_ratio: z.string().min(1),
    thirds: z.string().min(1),
    fifths: z.string().min(1),
    face_shape: z.string().min(1),
  }),
  parts: z.object({
    forehead: detailCommentSchema,
    eyes: detailCommentSchema,
    nose: detailCommentSchema,
    mouth: detailCommentSchema,
    jaw: detailCommentSchema,
    skin: detailCommentSchema,
  }),
  scores: z.object({
    likability: scoreSchema,
    trust: scoreSchema,
    symmetry: scoreSchema,
    balance: scoreSchema,
    attractiveness: scoreSchema,
    comments: z.array(z.string().min(1)).min(5).max(5),
  }),
  physiognomy: z.object({
    keywords: z.array(z.string().min(1)).min(3).max(6),
    summary: z.string().min(1),
    strengths: z.array(z.string().min(1)).min(2).max(4),
    cautions: z.array(z.string().min(1)).min(2).max(4),
  }),
  saju: z.object({
    keywords: z.array(z.string().min(1)).min(3).max(6),
    element_balance: z.string().min(1),
    current_flow: z.string().min(1),
    strength: z.string().min(1),
    advice: z.string().min(1),
  }),
  physiognomy_summary: z.string().min(1).optional(),
  saju_summary: z.string().min(1).optional(),
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
  const physiognomySummary = raw.physiognomy_summary ?? raw.physiognomy.summary;
  const sajuSummary = raw.saju_summary ?? `${raw.saju.element_balance} ${raw.saju.current_flow}`;

  return {
    readingType: {
      code: raw.reading_type.code,
      displayName: raw.reading_type.display_name,
      headline: raw.reading_type.headline,
      description: raw.reading_type.description,
    },
    mainCopy: raw.main_copy,
    geometry: {
      symmetry: raw.geometry.symmetry,
      goldenRatio: raw.geometry.golden_ratio,
      thirds: raw.geometry.thirds,
      fifths: raw.geometry.fifths,
      faceShape: raw.geometry.face_shape,
    },
    parts: {
      forehead: toDetailComment(raw.parts.forehead),
      eyes: toDetailComment(raw.parts.eyes),
      nose: toDetailComment(raw.parts.nose),
      mouth: toDetailComment(raw.parts.mouth),
      jaw: toDetailComment(raw.parts.jaw),
      skin: toDetailComment(raw.parts.skin),
    },
    scores: raw.scores,
    physiognomy: raw.physiognomy,
    saju: {
      keywords: raw.saju.keywords,
      elementBalance: raw.saju.element_balance,
      currentFlow: raw.saju.current_flow,
      strength: raw.saju.strength,
      advice: raw.saju.advice,
    },
    physiognomySummary,
    sajuSummary,
    readingNeeds: raw.reading_needs,
    recommendations: raw.recommendations.map((item) => ({
      bookId: item.book_id,
      reason: item.reason,
      actionCopy: item.action_copy,
    })),
  };
}

function toDetailComment(input: z.infer<typeof detailCommentSchema>) {
  return {
    metricsText: input.metrics_text,
    comment: input.comment,
  };
}
