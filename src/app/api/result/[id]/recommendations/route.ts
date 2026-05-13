import { Type } from "@google/genai";
import { NextRequest } from "next/server";
import { bookLibraryHref } from "@/lib/books/gachonLinks";
import { SupabaseBookProvider } from "@/lib/books/provider";
import { selectBookCandidates } from "@/lib/books/recommender";
import { isGachonLibraryBook, type LibraryBook } from "@/lib/books/types";
import {
  DEFAULT_FLASH_THINKING_BUDGET,
  DEFAULT_PRO_THINKING_BUDGET,
  DEFAULT_RECOMMENDATION_MAX_OUTPUT_TOKENS,
  readNonNegativeInteger,
  readPositiveInteger,
  thinkingConfigForGemini25,
  uniqueModelChain,
} from "@/lib/gemini/generationConfig";
import { buildBookRecommendationPrompt } from "@/lib/gemini/libraryPrompt";
import { parseLibraryRecommendationsResponse } from "@/lib/gemini/librarySchema";
import { getGeminiClient } from "@/lib/gemini/client";
import { resolvePersonaSignal } from "@/lib/persona/personaResolver";
import { calculateSaju } from "@/lib/saju/calculator";
import { getServerSupabase } from "@/lib/supabase/server";
import type { FaceMetrics } from "@/types/face";
import type { LibraryAnalysisResult, NeedFocus } from "@/types/session";

export const runtime = "nodejs";
export const maxDuration = 300;
export const dynamic = "force-dynamic";

const PRIMARY_MODEL = process.env.GEMINI_RECOMMENDATION_MODEL ?? process.env.GEMINI_LIVE_MODEL ?? process.env.GEMINI_LIBRARY_MODEL ?? "gemini-2.5-flash";
const FALLBACK_MODELS = (process.env.GEMINI_RECOMMENDATION_FALLBACK_MODELS ?? process.env.GEMINI_LIBRARY_FALLBACK_MODELS ?? "gemini-2.5-flash,gemini-2.5-flash")
  .split(",")
  .map((m) => m.trim())
  .filter(Boolean);
const MODEL_CHAIN = uniqueModelChain(PRIMARY_MODEL, FALLBACK_MODELS);
const RECOMMENDATION_MAX_OUTPUT_TOKENS = readPositiveInteger(process.env.GEMINI_RECOMMENDATION_MAX_OUTPUT_TOKENS, DEFAULT_RECOMMENDATION_MAX_OUTPUT_TOKENS);
const THINKING_BUDGETS = {
  flashThinkingBudget: readNonNegativeInteger(process.env.GEMINI_RECOMMENDATION_FLASH_THINKING_BUDGET, DEFAULT_FLASH_THINKING_BUDGET),
  proThinkingBudget: readPositiveInteger(process.env.GEMINI_RECOMMENDATION_PRO_THINKING_BUDGET, DEFAULT_PRO_THINKING_BUDGET),
};

type SessionRow = {
  id: string;
  display_name: string;
  birth_date: string;
  favorite_category: string;
  need_focus: NeedFocus;
  student_id_lookup_hash: string;
  metrics_json: FaceMetrics;
  result_json: LibraryAnalysisResult;
  status: string;
};

export async function POST(_req: NextRequest, { params }: { params: { id: string } }) {
  const supabase = getServerSupabase();
  const { data, error } = await supabase
    .from("library_sessions")
    .select("id, display_name, birth_date, favorite_category, need_focus, student_id_lookup_hash, metrics_json, result_json, status")
    .eq("id", params.id)
    .maybeSingle();

  if (error) return Response.json({ error: "result_fetch_failed" }, { status: 500 });
  if (!data || data.status !== "complete" || !data.result_json) return Response.json({ error: "not_found" }, { status: 404 });

  const session = data as SessionRow;
  const baseResult = session.result_json;
  if (baseResult.recommendations?.length >= 3) {
    return Response.json({ result: baseResult }, { headers: { "Cache-Control": "no-store, max-age=0" } });
  }

  try {
    const saju = calculateSaju(session.birth_date);
    const personaV2Enabled = process.env.PERSONA_V2_ENABLED === "true";
    const personaSignal = personaV2Enabled ? resolvePersonaSignal(session.metrics_json, saju) : null;
    const provider = new SupabaseBookProvider(supabase);
    const books = (await provider.listActiveBooks()).filter(isGachonLibraryBook);
    const candidates = selectBookCandidates({
      books,
      favoriteCategory: session.favorite_category,
      desiredTags: personaSignal ? Object.keys(personaSignal.bookTagWeights) : [session.favorite_category],
      personaWeights: personaSignal?.bookTagWeights,
      needFocus: session.need_focus,
      saltSeed: `${session.student_id_lookup_hash}|${session.birth_date}|${session.favorite_category}|${session.need_focus}`,
      limit: 12,
    });

    if (candidates.length < 3) return Response.json({ error: "not_enough_books" }, { status: 503 });

    const ai = getGeminiClient();
    const promptText = buildBookRecommendationPrompt({
      input: { favoriteCategory: session.favorite_category, needFocus: session.need_focus },
      displayName: session.display_name,
      analysis: baseResult,
      candidates,
    });
    const baseConfig = {
      temperature: 0.72,
      maxOutputTokens: RECOMMENDATION_MAX_OUTPUT_TOKENS,
      responseMimeType: "application/json",
      responseSchema: {
        type: Type.OBJECT,
        properties: {
          section_copy: {
            type: Type.OBJECT,
            properties: {
              book_curation: textArraySchema(2),
            },
            required: ["book_curation"],
          },
          reading_needs: { type: Type.ARRAY, items: { type: Type.STRING }, minItems: 3, maxItems: 6 },
          recommendations: {
            type: Type.ARRAY,
            items: {
              type: Type.OBJECT,
              properties: {
                book_id: { type: Type.STRING },
                reason: { type: Type.STRING },
                action_copy: { type: Type.STRING },
                fit_reason: { type: Type.STRING },
                reading_moment: { type: Type.STRING },
              },
              required: ["book_id", "reason", "action_copy", "fit_reason", "reading_moment"],
            },
            minItems: 3,
            maxItems: 3,
          },
        },
        required: ["section_copy", "reading_needs", "recommendations"],
      },
    };

    let normalized: ReturnType<typeof parseLibraryRecommendationsResponse> | null = null;
    let lastError: unknown = null;
    let usedModel: string | null = null;
    for (const model of MODEL_CHAIN) {
      try {
        const thinkingConfig = thinkingConfigForGemini25(model, THINKING_BUDGETS);
        const response = await ai.models.generateContent({
          model,
          contents: [{ role: "user", parts: [{ text: promptText }] }],
          config: thinkingConfig ? { ...baseConfig, thinkingConfig } : baseConfig,
        });
        normalized = parseLibraryRecommendationsResponse(response.text ?? "{}");
        usedModel = model;
        break;
      } catch (caught) {
        lastError = caught;
        console.warn(`[api/result/recommendations] model ${model} failed`, caught);
      }
    }
    if (normalized) {
      console.log(`[api/result/recommendations] used model ${usedModel}`);
    } else {
      console.warn("[api/result/recommendations] using deterministic fallback", {
        sessionId: session.id,
        message: lastError instanceof Error ? lastError.message : String(lastError ?? "all_models_failed"),
      });
      normalized = buildFallbackRecommendationPayload({
        baseResult,
        candidates,
        favoriteCategory: session.favorite_category,
        needFocus: session.need_focus,
      });
    }
    const candidateById = new Map(candidates.map((book) => [book.sourceId, book]));
    const recommendedDatabaseIds: string[] = [];
    const recommendations = normalized.recommendations.map((item) => {
      const book = candidateById.get(item.bookId);
      if (!book) throw new Error(`model returned unknown book_id: ${item.bookId}`);
      if (book.id) recommendedDatabaseIds.push(book.id);
      return {
        bookId: book.sourceId,
        title: book.title,
        author: book.author,
        category: book.category,
        tags: book.tags,
        isbn13: book.isbn13,
        coverUrl: book.coverUrl,
        libraryDetailUrl: bookLibraryHref(book),
        callNumber: book.callNumber,
        locationLabel: book.locationLabel,
        reason: item.reason,
        actionCopy: item.actionCopy,
        fitReason: item.fitReason,
        readingMoment: item.readingMoment,
      };
    });

    const baseSectionCopy = baseResult.sectionCopy ?? {
      faceReveal: [],
      faceSignal: [],
      innerStyle: [],
      chemiMatch: [],
      bookCuration: [],
    };
    const resultJson: LibraryAnalysisResult = {
      ...baseResult,
      readingNeeds: normalized.readingNeeds,
      sectionCopy: {
        faceReveal: baseSectionCopy.faceReveal ?? [],
        faceSignal: baseSectionCopy.faceSignal ?? [],
        innerStyle: baseSectionCopy.innerStyle ?? [],
        chemiMatch: baseSectionCopy.chemiMatch ?? [],
        bookCuration: normalized.sectionCopy.bookCuration,
      },
      recommendations,
    };

    const { error: updateError } = await supabase
      .from("library_sessions")
      .update({
        status: "complete",
        result_json: resultJson,
        recommended_book_ids: recommendedDatabaseIds,
        last_error: null,
      })
      .eq("id", session.id);

    if (updateError) throw updateError;

    return Response.json({ result: resultJson }, { headers: { "Cache-Control": "no-store, max-age=0" } });
  } catch (caught) {
    const message = caught instanceof Error ? caught.message : typeof caught === "string" ? caught : "recommendation_failed";
    console.error("[api/result/recommendations] recommendation failed", { sessionId: session.id, message, error: caught });
    await supabase.from("library_sessions").update({ last_error: message }).eq("id", session.id);
    return Response.json({ error: "recommendation_failed", detail: process.env.NODE_ENV === "production" ? undefined : message }, { status: 500 });
  }
}

function textArraySchema(maxItems: number) {
  return { type: Type.ARRAY, items: { type: Type.STRING }, minItems: 1, maxItems };
}

function buildFallbackRecommendationPayload({
  baseResult,
  candidates,
  favoriteCategory,
  needFocus,
}: {
  baseResult: LibraryAnalysisResult;
  candidates: LibraryBook[];
  favoriteCategory: string;
  needFocus: NeedFocus;
}): ReturnType<typeof parseLibraryRecommendationsResponse> {
  const readingNeeds = uniqueNonEmpty([...baseResult.readingNeeds, baseResult.readingType.displayName, favoriteCategory, needFocusLabel(needFocus)]).slice(0, 6);
  while (readingNeeds.length < 3) readingNeeds.push("지금 바로 읽기 좋은 방향");

  const bookCuration =
    baseResult.sectionCopy?.bookCuration?.length ? baseResult.sectionCopy.bookCuration.slice(0, 2) : ["지금 필요한 독서 방향에 맞춰 바로 집어 들기 좋은 책을 골랐어요.", "대표 책 1권과 함께 읽기 좋은 책 2권만 간단히 추렸어요."];

  return {
    readingNeeds,
    sectionCopy: { bookCuration },
    recommendations: candidates.slice(0, 3).map((book, index) => {
      const need = readingNeeds[index % readingNeeds.length] ?? favoriteCategory;
      return {
        bookId: book.sourceId,
        reason: `${baseResult.readingType.displayName} 흐름과 ${book.category} 주제가 맞아 지금 읽기 좋은 책이에요.`,
        actionCopy: index === 0 ? "가장 먼저 집어 들기 좋은 한 권이에요." : "함께 읽으면 방향이 더 선명해져요.",
        fitReason: `${need}에 맞춰 ${book.tags.slice(0, 2).join(", ") || book.category} 키워드를 우선으로 골랐어요.`,
        readingMoment: needFocusMoment(needFocus),
      };
    }),
  };
}

function uniqueNonEmpty(values: string[]) {
  return Array.from(new Set(values.map((value) => value.trim()).filter(Boolean)));
}

function needFocusLabel(needFocus: NeedFocus) {
  const labels: Record<NeedFocus, string> = {
    stimulation: "새로운 자극",
    comfort: "차분한 회복",
    utility: "실용적 힌트",
    depth: "깊은 몰입",
  };
  return labels[needFocus];
}

function needFocusMoment(needFocus: NeedFocus) {
  const moments: Record<NeedFocus, string> = {
    stimulation: "새로운 자극이 필요할 때",
    comfort: "생각을 차분히 정리하고 싶을 때",
    utility: "바로 써먹을 힌트가 필요할 때",
    depth: "한 주제를 깊게 붙잡고 싶을 때",
  };
  return moments[needFocus];
}
