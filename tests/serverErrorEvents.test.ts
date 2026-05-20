import { describe, expect, it } from "vitest";
import { buildServerErrorEventPayload } from "@/lib/events/serverErrorEvents";

describe("buildServerErrorEventPayload", () => {
  it("summarizes failed Gemini JSON responses without storing raw response text", () => {
    const payload = buildServerErrorEventPayload({
      route: "/api/analyze",
      stage: "gemini_parse",
      message: "Empty or invalid json",
      error: new SyntaxError("Unexpected end of JSON input"),
      model: "gemini-2.5-flash",
      finishReason: "MAX_TOKENS",
      responseText: '{"main_copy":"민감한 개인화 문장',
      maxOutputTokens: 12000,
      thinkingBudget: 0,
      usage: {
        promptTokenCount: 4200,
        candidatesTokenCount: 12000,
        thoughtsTokenCount: 0,
        totalTokenCount: 16200,
      },
    });

    expect(payload).toMatchObject({
      route: "/api/analyze",
      stage: "gemini_parse",
      message: "Empty or invalid json",
      errorName: "SyntaxError",
      errorMessage: "Unexpected end of JSON input",
      model: "gemini-2.5-flash",
      finishReason: "MAX_TOKENS",
      responseLength: 24,
      responseEmpty: false,
      responseLooksJson: true,
      responseEndsWithJsonClose: false,
      maxOutputTokens: 12000,
      thinkingBudget: 0,
      usage: {
        promptTokenCount: 4200,
        candidatesTokenCount: 12000,
        thoughtsTokenCount: 0,
        totalTokenCount: 16200,
      },
    });
    expect(JSON.stringify(payload)).not.toContain("민감한 개인화 문장");
  });
});
