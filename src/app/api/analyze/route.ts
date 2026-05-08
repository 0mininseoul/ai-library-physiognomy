import { createHash } from "node:crypto";
import { Type } from "@google/genai";
import { NextRequest } from "next/server";
import { SupabaseBookProvider } from "@/lib/books/provider";
import { selectBookCandidates } from "@/lib/books/recommender";
import { buildLibraryPrompt } from "@/lib/gemini/libraryPrompt";
import { normalizeLibraryAnalysis } from "@/lib/gemini/librarySchema";
import { getGeminiClient } from "@/lib/gemini/client";
import { displayGivenName } from "@/lib/korean/name";
import { getServerSupabase } from "@/lib/supabase/server";
import type { FaceMetrics, Landmark } from "@/types/face";
import type { StudentInput } from "@/types/session";

export const runtime = "nodejs";
export const maxDuration = 300;

const LIBRARY_ANALYSIS_MODEL = process.env.GEMINI_LIBRARY_MODEL ?? process.env.GEMINI_LIVE_MODEL ?? "gemini-2.5-flash";

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
  const provider = new SupabaseBookProvider(supabase);
  const books = await provider.listActiveBooks();
  const candidates = selectBookCandidates({
    books,
    favoriteCategory: body.input.favoriteCategory,
    desiredTags: [body.input.favoriteCategory],
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
    const response = await ai.models.generateContent({
      model: LIBRARY_ANALYSIS_MODEL,
      contents: buildLibraryPrompt({ input: body.input, displayName, metrics: body.metrics, candidates }),
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
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
            physiognomy_summary: { type: Type.STRING },
            saju_summary: { type: Type.STRING },
            reading_needs: { type: Type.ARRAY, items: { type: Type.STRING }, minItems: 3, maxItems: 6 },
            recommendations: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  book_id: { type: Type.STRING },
                  reason: { type: Type.STRING },
                  action_copy: { type: Type.STRING },
                },
                required: ["book_id", "reason", "action_copy"],
              },
              minItems: 3,
              maxItems: 3,
            },
          },
          required: ["reading_type", "physiognomy_summary", "saju_summary", "reading_needs", "recommendations"],
        },
      },
    });

    const normalized = normalizeLibraryAnalysis(JSON.parse(response.text ?? "{}"));
    const candidateById = new Map(candidates.map((book) => [book.sourceId, book]));
    const finalRecommendations = normalized.recommendations.map((item) => {
      const book = candidateById.get(item.bookId);
      if (!book) throw new Error(`Gemini returned unknown book_id: ${item.bookId}`);
      return {
        bookId: book.sourceId,
        title: book.title,
        author: book.author,
        category: book.category,
        tags: book.tags,
        callNumber: book.callNumber,
        locationLabel: book.locationLabel,
        reason: item.reason,
        actionCopy: item.actionCopy,
      };
    });

    const resultJson = { ...normalized, recommendations: finalRecommendations };
    const { error: updateError } = await supabase
      .from("library_sessions")
      .update({
        status: "complete",
        face_image_path: facePath,
        reading_type_code: normalized.readingType.code,
        result_json: resultJson,
        recommended_book_ids: [],
      })
      .eq("id", session.id);

    if (updateError) throw updateError;

    return Response.json({ sessionId: session.id, result: resultJson }, { status: 200 });
  } catch (error) {
    const message = error instanceof Error ? error.message : "analysis_failed";
    await supabase.from("library_sessions").update({ status: "failed", last_error: message }).eq("id", session.id);
    return Response.json({ error: "analysis_failed" }, { status: 500 });
  }
}

function stripDataUrl(input: string): string {
  return input.replace(/^data:image\/[a-zA-Z0-9.+-]+;base64,/, "");
}

function sha256(input: string): string {
  return createHash("sha256").update(input.trim()).digest("hex");
}
