import { createHash } from "node:crypto";
import { Type } from "@google/genai";
import { NextRequest } from "next/server";
import { SupabaseBookProvider } from "@/lib/books/provider";
import { selectBookCandidates } from "@/lib/books/recommender";
import { isGachonLibraryBook } from "@/lib/books/types";
import { buildLibraryPrompt } from "@/lib/gemini/libraryPrompt";
import { normalizeLibraryAnalysis } from "@/lib/gemini/librarySchema";
import { getGeminiClient } from "@/lib/gemini/client";
import { calibrateFaceScores } from "@/lib/facemesh/scoreCalibration";
import { displayGivenName } from "@/lib/korean/name";
import { resolvePersonaSignal } from "@/lib/persona/personaResolver";
import { calculateSaju } from "@/lib/saju/calculator";
import { getServerSupabase } from "@/lib/supabase/server";
import type { FaceMetrics, Landmark } from "@/types/face";
import type { StudentInput } from "@/types/session";

export const runtime = "nodejs";
export const maxDuration = 300;

const PRIMARY_MODEL = process.env.GEMINI_LIBRARY_MODEL ?? "gemini-2.5-pro";
const FALLBACK_MODELS = (process.env.GEMINI_LIBRARY_FALLBACK_MODELS ?? "gemini-2.5-flash,gemini-2.5-flash")
  .split(",")
  .map((m) => m.trim())
  .filter(Boolean);
const MODEL_CHAIN = [PRIMARY_MODEL, ...FALLBACK_MODELS];

export async function POST(req: NextRequest) {
  const body = (await req.json()) as {
    input?: StudentInput;
    metrics?: FaceMetrics;
    landmarks?: Landmark[];
    imageBase64?: string;
  };

  if (!body.input?.consentAccepted || !body.imageBase64 || !body.metrics) {
    return Response.json({ error: "invalid_request" }, { status: 400 });
  }

  const supabase = getServerSupabase();
  const displayName = displayGivenName(body.input.name);
  const saju = calculateSaju(body.input.birthDate);
  const calibratedScores = calibrateFaceScores(body.metrics);
  const personaV2Enabled = process.env.PERSONA_V2_ENABLED === "true";
  const personaSignal = personaV2Enabled ? resolvePersonaSignal(body.metrics, saju) : null;
  const provider = new SupabaseBookProvider(supabase);
  const books = (await provider.listActiveBooks()).filter(isGachonLibraryBook);
  const candidates = selectBookCandidates({
    books,
    favoriteCategory: body.input.favoriteCategory,
    desiredTags: personaSignal ? Object.keys(personaSignal.bookTagWeights) : [body.input.favoriteCategory],
    limit: 20,
  });

  if (candidates.length < 3) {
    return Response.json({ error: "not_enough_books" }, { status: 503 });
  }

  const { data: session, error: insertError } = await supabase
    .from("library_sessions")
    .insert({
      name: body.input.name,
      display_name: displayName,
      student_id: body.input.studentId,
      student_id_lookup_hash: sha256(body.input.studentId),
      gender: body.input.gender,
      birth_date: body.input.birthDate,
      favorite_category: body.input.favoriteCategory,
      need_focus: body.input.needFocus,
      metrics_json: body.metrics,
      landmarks_json: body.landmarks ?? null,
      status: "analyzing",
    })
    .select("id")
    .single();

  if (insertError || !session?.id) {
    return Response.json({ error: "session_create_failed" }, { status: 500 });
  }

  const facePath = `${session.id}/capture.jpg`;
  try {
    const imageBuffer = Buffer.from(stripDataUrl(body.imageBase64), "base64");
    const { error: uploadError } = await supabase.storage.from("face-images").upload(facePath, imageBuffer, {
      contentType: "image/jpeg",
      upsert: true,
    });
    if (uploadError) throw uploadError;

    const ai = getGeminiClient();
    const visionEnabled = process.env.GEMINI_VISION_ENABLED === "true";
    const promptText = buildLibraryPrompt({ input: body.input, displayName, metrics: body.metrics, calibratedScores, saju, candidates, persona: personaSignal ?? undefined });
    const inlineImage = visionEnabled
      ? [{ inlineData: { data: stripDataUrl(body.imageBase64), mimeType: "image/jpeg" } }]
      : [];
    const contents = [{ role: "user", parts: [{ text: promptText }, ...inlineImage] }];
    const genConfig = {
      responseMimeType: "application/json",
      responseSchema: {
          type: Type.OBJECT,
          properties: {
            personaConfirmed: { type: Type.STRING },
            reading_type: {
              type: Type.OBJECT,
              properties: {
                code: { type: Type.STRING },
                display_name: { type: Type.STRING },
                headline: { type: Type.STRING },
                description: { type: Type.STRING },
              },
              required: ["code", "display_name", "headline", "description"],
            },
            main_copy: { type: Type.STRING },
            geometry: {
              type: Type.OBJECT,
              properties: {
                symmetry: { type: Type.STRING },
                golden_ratio: { type: Type.STRING },
                thirds: { type: Type.STRING },
                fifths: { type: Type.STRING },
                face_shape: { type: Type.STRING },
              },
              required: ["symmetry", "golden_ratio", "thirds", "fifths", "face_shape"],
            },
            parts: {
              type: Type.OBJECT,
              properties: {
                forehead: detailCommentSchema(),
                eyes: detailCommentSchema(),
                nose: detailCommentSchema(),
                mouth: detailCommentSchema(),
                jaw: detailCommentSchema(),
                impression: detailCommentSchema(),
              },
              required: ["forehead", "eyes", "nose", "mouth", "jaw", "impression"],
            },
            scores: {
              type: Type.OBJECT,
              properties: {
                likability: { type: Type.NUMBER },
                trust: { type: Type.NUMBER },
                symmetry: { type: Type.NUMBER },
                balance: { type: Type.NUMBER },
                attractiveness: { type: Type.NUMBER },
                comments: { type: Type.ARRAY, items: { type: Type.STRING }, minItems: 5, maxItems: 5 },
              },
              required: ["likability", "trust", "symmetry", "balance", "attractiveness", "comments"],
            },
            physiognomy: {
              type: Type.OBJECT,
              properties: {
                keywords: { type: Type.ARRAY, items: { type: Type.STRING }, minItems: 3, maxItems: 6 },
                summary: { type: Type.STRING },
                strengths: { type: Type.ARRAY, items: { type: Type.STRING }, minItems: 2, maxItems: 4 },
                cautions: { type: Type.ARRAY, items: { type: Type.STRING }, minItems: 2, maxItems: 4 },
              },
              required: ["keywords", "summary", "strengths", "cautions"],
            },
            saju: {
              type: Type.OBJECT,
              properties: {
                keywords: { type: Type.ARRAY, items: { type: Type.STRING }, minItems: 3, maxItems: 6 },
                element_balance: { type: Type.STRING },
                current_flow: { type: Type.STRING },
                strength: { type: Type.STRING },
                advice: { type: Type.STRING },
              },
              required: ["keywords", "element_balance", "current_flow", "strength", "advice"],
            },
            romantic_match: {
              type: Type.OBJECT,
              properties: {
                best_types: { type: Type.ARRAY, items: { type: Type.STRING }, minItems: 1, maxItems: 1 },
                why: { type: Type.STRING },
                date_style: { type: Type.STRING },
                caution: { type: Type.STRING },
              },
              required: ["best_types", "why", "date_style", "caution"],
            },
            section_copy: {
              type: Type.OBJECT,
              properties: {
                face_reveal: textArraySchema(2),
                face_signal: textArraySchema(2),
                inner_style: textArraySchema(2),
                chemi_match: textArraySchema(2),
                book_curation: textArraySchema(2),
              },
              required: ["face_reveal", "face_signal", "inner_style", "chemi_match", "book_curation"],
            },
            inner_style: {
              type: Type.OBJECT,
              properties: {
                dominant_label: { type: Type.STRING },
                dominant_emoji: { type: Type.STRING },
                dominant_headline: { type: Type.STRING },
                dominant_detail: { type: Type.STRING },
                growth_label: { type: Type.STRING },
                growth_emoji: { type: Type.STRING },
                growth_headline: { type: Type.STRING },
                growth_detail: { type: Type.STRING },
                growth_action: { type: Type.STRING },
              },
              required: ["dominant_label", "dominant_emoji", "dominant_headline", "dominant_detail", "growth_label", "growth_emoji", "growth_headline", "growth_detail", "growth_action"],
            },
            chemi_match: {
              type: Type.OBJECT,
              properties: {
                type_label: { type: Type.STRING },
                headline: { type: Type.STRING },
                why: { type: Type.STRING },
                friction: { type: Type.STRING },
                good_scene: { type: Type.STRING },
              },
              required: ["type_label", "headline", "why", "friction", "good_scene"],
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
          required: ["reading_type", "main_copy", "geometry", "parts", "scores", "physiognomy", "saju", "romantic_match", "section_copy", "inner_style", "chemi_match", "reading_needs", "recommendations"],
      },
    };

    let response: Awaited<ReturnType<typeof ai.models.generateContent>> | null = null;
    let lastError: unknown = null;
    let usedModel = MODEL_CHAIN[0]!;
    for (const model of MODEL_CHAIN) {
      try {
        response = await ai.models.generateContent({
          model,
          contents,
          config: genConfig,
        });
        usedModel = model;
        break;
      } catch (error) {
        lastError = error;
        console.warn(`[api/analyze] model ${model} failed`, error);
      }
    }
    if (!response) throw lastError ?? new Error("all_models_failed");
    console.log(`[api/analyze] used model ${usedModel}`);

    const normalized = normalizeLibraryAnalysis(JSON.parse(response.text ?? "{}"));
    const resultScores = {
      ...normalized.scores,
      likability: calibratedScores.likability,
      trust: calibratedScores.trust,
      symmetry: calibratedScores.symmetry,
      balance: calibratedScores.balance,
      attractiveness: calibratedScores.attractiveness,
    };
    const candidateById = new Map(candidates.map((book) => [book.sourceId, book]));
    const recommendedDatabaseIds: string[] = [];
    const finalRecommendations = normalized.recommendations.map((item) => {
      const book = candidateById.get(item.bookId);
      if (!book) throw new Error(`Gemini returned unknown book_id: ${item.bookId}`);
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

    const resultJson = {
      ...normalized,
      scores: resultScores,
      calibratedScores,
      persona: personaSignal
        ? {
            candidates: personaSignal.candidates,
            confirmed: normalized.personaConfirmed ?? personaSignal.candidates.primary,
            sajuKey: personaSignal.sajuKey,
            axisScores: personaSignal.axisScores,
          }
        : undefined,
      saju: { ...normalized.saju, calculation: saju },
      recommendations: finalRecommendations,
    };
    const { error: updateError } = await supabase
      .from("library_sessions")
      .update({
        status: "complete",
        face_image_path: facePath,
        reading_type_code: normalized.readingType.code,
        result_json: resultJson,
        recommended_book_ids: recommendedDatabaseIds,
      })
      .eq("id", session.id);

    if (updateError) throw updateError;

    return Response.json({ sessionId: session.id, result: resultJson }, { status: 200 });
  } catch (error) {
    const message = errorToMessage(error);
    console.error("[api/analyze] analysis failed", { sessionId: session.id, message, error });
    await supabase.from("library_sessions").update({ status: "failed", last_error: message }).eq("id", session.id);
    return Response.json({ error: "analysis_failed", detail: process.env.NODE_ENV === "production" ? undefined : message }, { status: 500 });
  }
}

function detailCommentSchema() {
  return {
    type: Type.OBJECT,
    properties: {
      metrics_text: { type: Type.STRING },
      comment: { type: Type.STRING },
    },
    required: ["metrics_text", "comment"],
  };
}

function textArraySchema(maxItems: number) {
  return { type: Type.ARRAY, items: { type: Type.STRING }, minItems: 1, maxItems };
}

function naverBookUrl(title: string, author: string) {
  const query = encodeURIComponent(`${title} ${author}`.trim());
  return `https://search.shopping.naver.com/book/search?query=${query}`;
}

function stripDataUrl(input: string): string {
  return input.replace(/^data:image\/[a-zA-Z0-9.+-]+;base64,/, "");
}

function sha256(input: string): string {
  return createHash("sha256").update(input.trim()).digest("hex");
}

function errorToMessage(error: unknown) {
  if (error instanceof Error) return error.message;
  if (typeof error === "string") return error;
  if (error && typeof error === "object") {
    const maybeMessage = "message" in error ? error.message : null;
    if (typeof maybeMessage === "string" && maybeMessage.length > 0) return maybeMessage;

    try {
      return JSON.stringify(error);
    } catch {
      return "analysis_failed";
    }
  }
  return "analysis_failed";
}
