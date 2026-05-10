import { z } from "zod";
import { softenFormalPolite } from "@/lib/korean/name";
import { isReadingTypeCode } from "@/lib/reading-types/types";
import { stripHanja } from "@/lib/saju/display";

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
    impression: detailCommentSchema,
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
  romantic_match: z.object({
    best_types: z.array(z.string().min(1)).min(1).max(2),
    why: z.string().min(1),
    date_style: z.string().min(1),
    caution: z.string().min(1),
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
      displayName: clean(raw.reading_type.display_name),
      headline: clean(raw.reading_type.headline),
      description: clean(raw.reading_type.description),
    },
    mainCopy: clean(raw.main_copy),
    geometry: {
      symmetry: clean(raw.geometry.symmetry),
      goldenRatio: clean(raw.geometry.golden_ratio),
      thirds: clean(raw.geometry.thirds),
      fifths: clean(raw.geometry.fifths),
      faceShape: clean(raw.geometry.face_shape),
    },
    parts: {
      forehead: toDetailComment(raw.parts.forehead),
      eyes: toDetailComment(raw.parts.eyes),
      nose: toDetailComment(raw.parts.nose),
      mouth: toDetailComment(raw.parts.mouth),
      jaw: toDetailComment(raw.parts.jaw),
      impression: toDetailComment(raw.parts.impression),
    },
    scores: {
      ...raw.scores,
      comments: raw.scores.comments.map(clean),
    },
    physiognomy: {
      keywords: raw.physiognomy.keywords.map(clean),
      summary: clean(raw.physiognomy.summary),
      strengths: raw.physiognomy.strengths.map(clean),
      cautions: raw.physiognomy.cautions.map(clean),
    },
    saju: {
      keywords: raw.saju.keywords.map(clean),
      elementBalance: clean(raw.saju.element_balance),
      currentFlow: clean(raw.saju.current_flow),
      strength: clean(raw.saju.strength),
      advice: clean(raw.saju.advice),
    },
    romanticMatch: {
      bestTypes: raw.romantic_match.best_types.map(clean),
      why: clean(raw.romantic_match.why),
      dateStyle: clean(raw.romantic_match.date_style),
      caution: clean(raw.romantic_match.caution),
    },
    physiognomySummary: clean(physiognomySummary),
    sajuSummary: clean(sajuSummary),
    readingNeeds: raw.reading_needs.map(clean),
    recommendations: raw.recommendations.map((item) => ({
      bookId: item.book_id,
      reason: clean(item.reason),
      actionCopy: clean(item.action_copy),
    })),
  };
}

function toDetailComment(input: z.infer<typeof detailCommentSchema>) {
  return {
    metricsText: clean(input.metrics_text),
    comment: clean(input.comment),
  };
}

function clean(input: string) {
  const sanitized = stripHanja(input)
    .replace(/피부/g, "전체 인상")
    .replace(/처방전?/g, "추천")
    .replace(/학생/g, "님")
    .replace(/연애/g, "관계 궁합")
    .replace(/연인/g, "상대")
    .replace(/데이트/g, "함께하는 시간")
    .replace(/생년월일(?:에서|로|을|를|의| 기반| 신호| 리듬)?/g, "내면")
    .replace(/[갑을병정무기경신임계]?\s*나무\s*일간답게/g, "차분한 탐색 성향답게")
    .replace(/불꽃/g, "에너지")
    .replace(/잔잔한\s*물결/g, "차분한 조율")
    .replace(/물결/g, "조율")
    .replace(/(?:목|나무)의?\s*(?:기운|리듬|흐름)/g, "탐색 성향")
    .replace(/(?:화|불)의?\s*(?:기운|리듬|흐름)/g, "추진 성향")
    .replace(/(?:토|흙)의?\s*(?:기운|리듬|흐름)/g, "정리 성향")
    .replace(/(?:금)의?\s*(?:기운|리듬|흐름)/g, "판단 성향")
    .replace(/(?:수|물)의?\s*(?:기운|리듬|흐름)/g, "깊게 몰입하는 성향")
    .replace(/우세한?\s*기운/g, "가장 또렷한 성향")
    .replace(/우세\s*오행/g, "주요 성향")
    .replace(/오행/g, "성향 패턴")
    .replace(/사주/g, "내면 성향")
    .replace(/일간|월주|년주|일주|시주/g, "내면 신호")
    .replace(/기운/g, "성향")
    .replace(/강한\s+깊게 몰입하는 성향/g, "깊게 몰입하는 성향")
    .replace(/강한\s+(탐색|추진|정리|판단)\s*성향/g, "또렷한 $1 성향")
    .replace(/근거 더 보기/g, "더보기")
    .replace(/근거/g, "설명")
    .replace(/해줘/g, "해 주세요")
    .replace(/했어/g, "했어요")
    .replace(/이건/g, "이 책은");

  return softenFormalPolite(sanitized).trim();
}
