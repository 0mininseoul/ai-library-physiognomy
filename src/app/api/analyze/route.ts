import { createHash } from "node:crypto";
import { Type } from "@google/genai";
import { NextRequest } from "next/server";
import { buildServerErrorEventPayload } from "@/lib/events/serverErrorEvents";
import { buildLibraryPrompt } from "@/lib/gemini/libraryPrompt";
import {
  DEFAULT_ANALYSIS_MAX_OUTPUT_TOKENS,
  DEFAULT_FLASH_THINKING_BUDGET,
  DEFAULT_PRO_THINKING_BUDGET,
  readNonNegativeInteger,
  readPositiveInteger,
  thinkingConfigForGemini25,
  uniqueModelChain,
} from "@/lib/gemini/generationConfig";
import { parseLooseJson } from "@/lib/gemini/jsonResilience";
import { normalizeLibraryAnalysis } from "@/lib/gemini/librarySchema";
import { getGeminiClient } from "@/lib/gemini/client";
import { calibrateFaceScores } from "@/lib/facemesh/scoreCalibration";
import { displayGivenName, honorific } from "@/lib/korean/name";
import { resolvePersonaSignal } from "@/lib/persona/personaResolver";
import { imageVisibleUntil, sessionExpiresAt } from "@/lib/privacy/retention";
import { chooseReadingTypeForPersona } from "@/lib/reading-types/personaMapping";
import { getResultFirstSectionCopy } from "@/lib/reading-types/resultFirstSectionCopy";
import { calculateSaju } from "@/lib/saju/calculator";
import { getServerSupabase } from "@/lib/supabase/server";
import type { FaceMetrics, Landmark } from "@/types/face";
import type { StudentInput } from "@/types/session";

export const runtime = "nodejs";
export const maxDuration = 300;

const PRIMARY_MODEL = process.env.GEMINI_ANALYSIS_MODEL ?? process.env.GEMINI_LIBRARY_MODEL ?? "gemini-2.5-flash";
const FALLBACK_MODELS = (process.env.GEMINI_ANALYSIS_FALLBACK_MODELS ?? "gemini-2.5-pro,gemini-2.5-flash")
  .split(",")
  .map((m) => m.trim())
  .filter(Boolean);
const MODEL_CHAIN = uniqueModelChain(PRIMARY_MODEL, FALLBACK_MODELS);
const ANALYSIS_MAX_OUTPUT_TOKENS = readPositiveInteger(process.env.GEMINI_ANALYSIS_MAX_OUTPUT_TOKENS, DEFAULT_ANALYSIS_MAX_OUTPUT_TOKENS);
const THINKING_BUDGETS = {
  flashThinkingBudget: readNonNegativeInteger(process.env.GEMINI_ANALYSIS_FLASH_THINKING_BUDGET, DEFAULT_FLASH_THINKING_BUDGET),
  proThinkingBudget: readPositiveInteger(process.env.GEMINI_ANALYSIS_PRO_THINKING_BUDGET, DEFAULT_PRO_THINKING_BUDGET),
};

export async function POST(req: NextRequest) {
  const startedAt = Date.now();
  const body = (await req.json()) as {
    input?: StudentInput;
    metrics?: FaceMetrics;
    landmarks?: Landmark[];
    imageBase64?: string;
    clientSessionId?: string;
  };

  if (!body.input?.consentAccepted || !body.imageBase64 || !body.metrics) {
    return Response.json({ error: "invalid_request" }, { status: 400 });
  }

  const supabase = getServerSupabase();
  const createdAt = new Date();
  const displayName = displayGivenName(body.input.name);
  const saju = calculateSaju(body.input.birthDate);
  const calibratedScores = calibrateFaceScores(body.metrics);
  const personaV2Enabled = process.env.PERSONA_V2_ENABLED === "true";
  const readingTypeGuardEnabled = process.env.READING_TYPE_PERSONA_GUARD_ENABLED !== "false";
  const personaSignal = personaV2Enabled || readingTypeGuardEnabled ? resolvePersonaSignal(body.metrics, saju) : null;

  const { data: session, error: insertError } = await supabase
    .from("library_sessions")
    .insert({
      created_at: createdAt.toISOString(),
      image_visible_until: imageVisibleUntil(createdAt).toISOString(),
      expires_at: sessionExpiresAt(createdAt).toISOString(),
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

  if (body.clientSessionId) {
    await supabase
      .from("service_events")
      .insert({
        session_id: session.id,
        event_name: "analysis_session_created",
        payload: { clientSessionId: body.clientSessionId },
      })
      .then(({ error }) => {
        if (error) console.warn("[api/analyze] session event tracking failed", error);
      });
  }

  const facePath = `${session.id}/capture.jpg`;
  try {
    const imageData = stripDataUrl(body.imageBase64);
    const imageBuffer = Buffer.from(imageData, "base64");
    const uploadStartedAt = Date.now();
    let uploadMs = 0;
    const uploadPromise = supabase.storage
      .from("face-images")
      .upload(facePath, imageBuffer, {
        contentType: "image/jpeg",
        upsert: true,
      })
      .then(({ error }) => {
        uploadMs = Date.now() - uploadStartedAt;
        return error ?? null;
      });

    const ai = getGeminiClient();
    const visionEnabled = process.env.GEMINI_VISION_ENABLED === "true";
    const promptText = buildLibraryPrompt({ input: body.input, displayName, metrics: body.metrics, calibratedScores, saju, persona: personaV2Enabled ? personaSignal ?? undefined : undefined });
    const inlineImage = visionEnabled ? [{ inlineData: { data: imageData, mimeType: "image/jpeg" } }] : [];
    const contents = [{ role: "user", parts: [{ text: promptText }, ...inlineImage] }];
    const baseGenConfig = {
      temperature: 0.72,
      maxOutputTokens: ANALYSIS_MAX_OUTPUT_TOKENS,
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
              },
              required: ["face_reveal", "face_signal", "inner_style", "chemi_match"],
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
          },
          required: ["reading_type", "main_copy", "geometry", "parts", "scores", "physiognomy", "saju", "romantic_match", "section_copy", "inner_style", "chemi_match"],
      },
    };

    let normalized: ReturnType<typeof normalizeLibraryAnalysis> | null = null;
    let lastError: unknown = null;
    let usedModel = MODEL_CHAIN[0]!;
    const modelStartedAt = Date.now();
    for (const model of MODEL_CHAIN) {
      try {
        const thinkingConfig = thinkingConfigForGemini25(model, THINKING_BUDGETS);
        const candidate = await ai.models.generateContent({
          model,
          contents,
          config: thinkingConfig ? { ...baseGenConfig, thinkingConfig } : baseGenConfig,
        });
        const finishReason = candidate.candidates?.[0]?.finishReason;
        const rawText = candidate.text ?? "";
        if (finishReason && finishReason !== "STOP") {
          const finishError = new Error(`model_finish_${finishReason}`);
          console.warn(`[api/analyze] model ${model} finish reason ${finishReason}`, {
            length: rawText.length,
            maxOutputTokens: ANALYSIS_MAX_OUTPUT_TOKENS,
            thinkingBudget: thinkingConfig?.thinkingBudget,
            usage: summarizeGeminiUsage(candidate.usageMetadata),
          });
          await persistServiceEvent(supabase, {
            sessionId: session.id,
            eventName: "gemini_analysis_non_stop_finish",
            level: finishReason === "MAX_TOKENS" ? "error" : "warn",
            payload: buildServerErrorEventPayload({
              route: "/api/analyze",
              stage: "gemini_finish_reason",
              message: finishError.message,
              error: finishError,
              model,
              finishReason,
              responseText: rawText,
              maxOutputTokens: ANALYSIS_MAX_OUTPUT_TOKENS,
              thinkingBudget: thinkingConfig?.thinkingBudget,
              usage: summarizeGeminiUsage(candidate.usageMetadata),
            }),
          });
          lastError = finishError;
          if (finishReason !== "MAX_TOKENS") continue;
        }
        try {
          normalized = normalizeLibraryAnalysis(parseLooseJson(rawText));
        } catch (parseError) {
          const parseMessage = parseError instanceof Error ? parseError.message : String(parseError);
          console.warn(`[api/analyze] model ${model} returned invalid JSON`, {
            message: parseMessage,
            length: rawText.length,
            finishReason,
            head: rawText.slice(0, 600),
            tail: rawText.slice(-200),
            usage: summarizeGeminiUsage(candidate.usageMetadata),
          });
          await persistServiceEvent(supabase, {
            sessionId: session.id,
            eventName: "gemini_analysis_invalid_json",
            level: "error",
            payload: buildServerErrorEventPayload({
              route: "/api/analyze",
              stage: "gemini_parse",
              message: parseMessage,
              error: parseError,
              model,
              finishReason,
              responseText: rawText,
              maxOutputTokens: ANALYSIS_MAX_OUTPUT_TOKENS,
              thinkingBudget: thinkingConfig?.thinkingBudget,
              usage: summarizeGeminiUsage(candidate.usageMetadata),
            }),
          });
          lastError = finishReason === "MAX_TOKENS" ? lastError : parseError;
          continue;
        }
        if (finishReason === "MAX_TOKENS") {
          console.warn(`[api/analyze] model ${model} returned valid JSON despite MAX_TOKENS`, {
            length: rawText.length,
            usage: summarizeGeminiUsage(candidate.usageMetadata),
          });
        }
        usedModel = model;
        break;
      } catch (error) {
        lastError = error;
        console.warn(`[api/analyze] model ${model} failed`, error);
        await persistServiceEvent(supabase, {
          sessionId: session.id,
          eventName: "gemini_analysis_model_error",
          level: "error",
          payload: buildServerErrorEventPayload({
            route: "/api/analyze",
            stage: "gemini_generate",
            message: errorToMessage(error),
            error,
            model,
            maxOutputTokens: ANALYSIS_MAX_OUTPUT_TOKENS,
          }),
        });
      }
    }
    if (!normalized) throw lastError ?? new Error("all_models_failed");
    const readingTypeDecision = readingTypeGuardEnabled && personaSignal
      ? chooseReadingTypeForPersona({
          modelCode: normalized.readingType.code,
          persona: personaSignal,
          confirmedFaceKey: normalized.personaConfirmed,
        })
      : null;
    if (readingTypeDecision) {
      if (readingTypeDecision.corrected) {
        console.warn("[api/analyze] corrected reading_type from unsupported persona candidate", {
          sessionId: session.id,
          modelCode: readingTypeDecision.modelCode,
          correctedCode: readingTypeDecision.code,
          candidates: readingTypeDecision.candidates,
          reason: readingTypeDecision.reason,
        });
      }
      const copy = getResultFirstSectionCopy(readingTypeDecision.code);
      normalized = {
        ...normalized,
        readingType: {
          code: readingTypeDecision.code,
          displayName: copy.displayName,
          headline: copy.headlineTemplate.split("{nameHonorific}").join(honorific(displayName)),
          description: copy.description,
        },
      };
    }
    const modelMs = Date.now() - modelStartedAt;
    const uploadError = await uploadPromise;
    if (uploadError) throw uploadError;
    console.log("[api/analyze] complete", { sessionId: session.id, model: usedModel, modelMs, uploadMs, totalMs: Date.now() - startedAt });

    const resultScores = {
      ...normalized.scores,
      likability: calibratedScores.likability,
      trust: calibratedScores.trust,
      symmetry: calibratedScores.symmetry,
      balance: calibratedScores.balance,
      attractiveness: calibratedScores.attractiveness,
    };
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
            readingTypeCandidates: readingTypeDecision?.candidates ?? [],
            readingTypeModelCode: readingTypeDecision?.modelCode ?? normalized.readingType.code,
            readingTypeCorrected: readingTypeDecision?.corrected ?? false,
            readingTypeReason: readingTypeDecision?.reason ?? "model_candidate",
          }
        : undefined,
      saju: { ...normalized.saju, calculation: saju },
      readingNeeds: [],
      recommendations: [],
    };
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
    const message = errorToMessage(error);
    console.error("[api/analyze] analysis failed", { sessionId: session.id, message, error });
    await Promise.all([
      supabase.from("library_sessions").update({ status: "failed", last_error: message }).eq("id", session.id),
      persistServiceEvent(supabase, {
        sessionId: session.id,
        eventName: "api_analyze_failed",
        level: "error",
        payload: buildServerErrorEventPayload({
          route: "/api/analyze",
          stage: "analysis_failed",
          message,
          error,
        }),
      }),
    ]);
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

function stripDataUrl(input: string): string {
  return input.replace(/^data:image\/[a-zA-Z0-9.+-]+;base64,/, "");
}

function sha256(input: string): string {
  return createHash("sha256").update(input.trim()).digest("hex");
}

function summarizeGeminiUsage(usage?: {
  promptTokenCount?: number;
  candidatesTokenCount?: number;
  thoughtsTokenCount?: number;
  totalTokenCount?: number;
}) {
  if (!usage) return undefined;
  return {
    promptTokenCount: usage.promptTokenCount,
    candidatesTokenCount: usage.candidatesTokenCount,
    thoughtsTokenCount: usage.thoughtsTokenCount,
    totalTokenCount: usage.totalTokenCount,
  };
}

async function persistServiceEvent(
  supabase: ReturnType<typeof getServerSupabase>,
  input: {
    sessionId: string;
    eventName: string;
    level: "info" | "warn" | "error";
    payload: Record<string, unknown>;
  },
) {
  try {
    const { error } = await supabase.from("service_events").insert({
      session_id: input.sessionId,
      event_name: input.eventName,
      level: input.level,
      payload: input.payload,
    });
    if (error) console.warn("[api/analyze] service event logging failed", error);
  } catch (error) {
    console.warn("[api/analyze] service event logging threw", error);
  }
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
