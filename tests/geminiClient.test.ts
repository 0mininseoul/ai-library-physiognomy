import { afterEach, describe, expect, it, vi } from "vitest";

const genAiMock = vi.hoisted(() => ({
  GoogleGenAI: vi.fn().mockImplementation(function MockGoogleGenAI(this: { options: unknown }, options: unknown) {
    this.options = options;
  }),
}));

vi.mock("server-only", () => ({}));
vi.mock("@google/genai", () => ({
  GoogleGenAI: genAiMock.GoogleGenAI,
}));

const managedEnvKeys = [
  "GEMINI_API_KEY",
  "GOOGLE_API_KEY",
  "GOOGLE_CLOUD_PROJECT",
  "GOOGLE_CLOUD_LOCATION",
  "GOOGLE_GENAI_USE_ENTERPRISE",
  "GOOGLE_GENAI_USE_VERTEXAI",
  "GOOGLE_SERVICE_ACCOUNT_KEY_BASE64",
] as const;

describe("getGeminiClient", () => {
  afterEach(() => {
    vi.resetModules();
    genAiMock.GoogleGenAI.mockClear();
    for (const key of managedEnvKeys) {
      delete process.env[key];
    }
  });

  it("initializes Vertex AI without a Gemini API key", async () => {
    setManagedEnv({
      GOOGLE_CLOUD_PROJECT: "ascentum-test",
      GOOGLE_CLOUD_LOCATION: "global",
      GOOGLE_GENAI_USE_VERTEXAI: "true",
    });

    const { getGeminiClient } = await import("@/lib/gemini/client");
    getGeminiClient();

    expect(genAiMock.GoogleGenAI).toHaveBeenCalledWith({
      enterprise: true,
      vertexai: true,
      project: "ascentum-test",
      location: "global",
      apiVersion: "v1",
    });
  });

  it("passes Vercel base64 service account credentials to Google auth", async () => {
    const credentials = {
      type: "service_account",
      project_id: "ascentum-test",
      private_key_id: "key-id",
      private_key: "-----BEGIN PRIVATE KEY-----\\nredacted\\n-----END PRIVATE KEY-----\\n",
      client_email: "svc@ascentum-test.iam.gserviceaccount.com",
      client_id: "1234567890",
    };
    setManagedEnv({
      GOOGLE_CLOUD_PROJECT: "ascentum-test",
      GOOGLE_CLOUD_LOCATION: "global",
      GOOGLE_GENAI_USE_VERTEXAI: "true",
      GOOGLE_SERVICE_ACCOUNT_KEY_BASE64: Buffer.from(JSON.stringify(credentials), "utf8").toString("base64"),
    });

    const { getGeminiClient } = await import("@/lib/gemini/client");
    getGeminiClient();

    expect(genAiMock.GoogleGenAI).toHaveBeenCalledWith({
      enterprise: true,
      vertexai: true,
      project: "ascentum-test",
      location: "global",
      apiVersion: "v1",
      googleAuthOptions: { credentials },
    });
  });
});

function setManagedEnv(values: Partial<Record<(typeof managedEnvKeys)[number], string>>) {
  for (const key of managedEnvKeys) {
    delete process.env[key];
  }
  Object.assign(process.env, values);
}
