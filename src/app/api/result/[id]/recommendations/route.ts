import { Type } from "@google/genai";
import { NextRequest } from "next/server";
import { SupabaseBookProvider } from "@/lib/books/provider";
import { selectBookCandidates } from "@/lib/books/recommender";
import { isGachonLibraryBook } from "@/lib/books/types";
import { buildBookRecommendationPrompt } from "@/lib/gemini/libraryPrompt";
import { normalizeLibraryRecommendations } from "@/lib/gemini/librarySchema";
import { getGeminiClient } from "@/lib/gemini/client";
import { resolvePersonaSignal } from "@/lib/persona/personaResolver";
import { calculateSaju } from "@/lib/saju/calculator";
import { getServerSupabase } from "@/lib/supabase/server";
import type { FaceMetrics } from "@/types/face";
import type { LibraryAnalysisResult, NeedFocus } from "@/types/session";

export const runtime = "nodejs";
export const maxDuration = 300;

const PRIMARY_MODEL = process.env.GEMINI_RECOMMENDATION_MODEL ?? process.env.GEMINI_LIVE_MODEL ?? process.env.GEMINI_LIBRARY_MODEL ?? "gemini-2.5-flash";
const FALLBACK_MODELS = (process.env.GEMINI_RECOMMENDATION_FALLBACK_MODELS ?? process.env.GEMINI_LIBRARY_FALLBACK_MODELS ?? "gemini-2.5-flash,gemini-2.5-flash")
  .split(",")
  .map((m) => m.trim())
  .filter(Boolean);
const MODEL_CHAIN = [PRIMARY_MODEL, ...FALLBACK_MODELS];

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
    const config = {
      temperature: 0.72,
      maxOutputTokens: 1_900,
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

    let response: Awaited<ReturnType<typeof ai.models.generateContent>> | null = null;
    let lastError: unknown = null;
    let usedModel = MODEL_CHAIN[0]!;
    for (const model of MODEL_CHAIN) {
      try {
        response = await ai.models.generateContent({
          model,
          contents: [{ role: "user", parts: [{ text: promptText }] }],
          config,
        });
        usedModel = model;
        break;
      } catch (caught) {
        lastError = caught;
        console.warn(`[api/result/recommendations] model ${model} failed`, caught);
      }
    }
    if (!response) throw lastError ?? new Error("all_models_failed");
    console.log(`[api/result/recommendations] used model ${usedModel}`);

    const normalized = normalizeLibraryRecommendations(JSON.parse(response.text ?? "{}"));
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
        coverUrl: book.coverUrl,
        naverBookUrl: naverBookUrl(book.title, book.author),
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

function naverBookUrl(title: string, author: string) {
  const query = encodeURIComponent(`${title} ${author}`.trim());
  return `https://search.shopping.naver.com/book/search?query=${query}`;
}
