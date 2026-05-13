import { describe, expect, it } from "vitest";
import {
  DEFAULT_PRO_THINKING_BUDGET,
  readNonNegativeInteger,
  readPositiveInteger,
  thinkingConfigForGemini25,
  uniqueModelChain,
} from "@/lib/gemini/generationConfig";

describe("uniqueModelChain", () => {
  it("keeps first occurrence and removes duplicate fallback models", () => {
    expect(uniqueModelChain("gemini-2.5-pro", ["gemini-2.5-pro", " gemini-2.5-flash ", "gemini-2.5-flash"])).toEqual([
      "gemini-2.5-pro",
      "gemini-2.5-flash",
    ]);
  });
});

describe("integer env parsing", () => {
  it("falls back for invalid positive integers", () => {
    expect(readPositiveInteger("0", 12000)).toBe(12000);
    expect(readPositiveInteger("abc", 12000)).toBe(12000);
    expect(readPositiveInteger("4096", 12000)).toBe(4096);
  });

  it("allows zero for non-negative integers", () => {
    expect(readNonNegativeInteger("0", 128)).toBe(0);
    expect(readNonNegativeInteger("-1", 128)).toBe(128);
  });
});

describe("thinkingConfigForGemini25", () => {
  const budgets = { flashThinkingBudget: 0, proThinkingBudget: 64 };

  it("disables thinking for Gemini 2.5 Flash", () => {
    expect(thinkingConfigForGemini25("gemini-2.5-flash", budgets)).toEqual({
      includeThoughts: false,
      thinkingBudget: 0,
    });
  });

  it("keeps Gemini 2.5 Pro at the minimum supported budget", () => {
    expect(thinkingConfigForGemini25("gemini-2.5-pro", budgets)).toEqual({
      includeThoughts: false,
      thinkingBudget: DEFAULT_PRO_THINKING_BUDGET,
    });
  });

  it("does not configure older non-thinking models", () => {
    expect(thinkingConfigForGemini25("gemini-2.0-flash", budgets)).toBeUndefined();
  });
});
