import { GoogleGenAI, type GoogleGenAIOptions } from "@google/genai";

type Env = NodeJS.ProcessEnv;
type ServiceAccountCredentials = {
  client_email?: string;
  private_key?: string;
  project_id?: string;
  [key: string]: unknown;
};

export function createVertexGeminiClient(env: Env = process.env) {
  return new GoogleGenAI(buildVertexGeminiClientOptions(env));
}

export function buildVertexGeminiClientOptions(env: Env = process.env): GoogleGenAIOptions {
  const project = readRequiredEnv(env, "GOOGLE_CLOUD_PROJECT");
  const location = env.GOOGLE_CLOUD_LOCATION?.trim() || "global";
  const credentials = readServiceAccountCredentials(env);
  const options: GoogleGenAIOptions = {
    enterprise: true,
    vertexai: true,
    project,
    location,
    apiVersion: "v1",
  };

  if (credentials) {
    options.googleAuthOptions = { credentials };
  }

  return options;
}

function readRequiredEnv(env: Env, key: string): string {
  const value = env[key]?.trim();
  if (!value) {
    throw new Error(`Missing ${key} for Vertex AI Gemini`);
  }
  return value;
}

function readServiceAccountCredentials(env: Env): ServiceAccountCredentials | undefined {
  const encoded = env.GOOGLE_SERVICE_ACCOUNT_KEY_BASE64?.trim();
  if (!encoded) return undefined;

  try {
    const parsed = JSON.parse(Buffer.from(encoded, "base64").toString("utf8")) as unknown;
    if (!isServiceAccountCredentials(parsed)) {
      throw new Error("decoded value is not a service account JSON object");
    }
    return parsed;
  } catch (error) {
    const message = error instanceof Error ? error.message : "unknown parse error";
    throw new Error(`Invalid GOOGLE_SERVICE_ACCOUNT_KEY_BASE64: ${message}`);
  }
}

function isServiceAccountCredentials(value: unknown): value is ServiceAccountCredentials {
  return Boolean(
    value &&
      typeof value === "object" &&
      "client_email" in value &&
      typeof (value as ServiceAccountCredentials).client_email === "string" &&
      "private_key" in value &&
      typeof (value as ServiceAccountCredentials).private_key === "string",
  );
}
