import "server-only";

import type { GoogleGenAI } from "@google/genai";
import { createVertexGeminiClient } from "@/lib/gemini/vertexClient";

let cached: GoogleGenAI | null = null;

export function getGeminiClient() {
  cached ??= createVertexGeminiClient();
  return cached;
}
