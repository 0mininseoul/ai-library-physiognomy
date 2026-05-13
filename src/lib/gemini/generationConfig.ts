export const DEFAULT_ANALYSIS_MAX_OUTPUT_TOKENS = 12_000;
export const DEFAULT_RECOMMENDATION_MAX_OUTPUT_TOKENS = 4_000;
export const DEFAULT_FLASH_THINKING_BUDGET = 0;
export const DEFAULT_PRO_THINKING_BUDGET = 128;

export type GeminiThinkingBudgets = {
  flashThinkingBudget: number;
  proThinkingBudget: number;
};

export function readPositiveInteger(value: string | undefined, fallback: number) {
  const parsed = Number(value);
  if (!Number.isInteger(parsed) || parsed <= 0) return fallback;
  return parsed;
}

export function readNonNegativeInteger(value: string | undefined, fallback: number) {
  const parsed = Number(value);
  if (!Number.isInteger(parsed) || parsed < 0) return fallback;
  return parsed;
}

export function uniqueModelChain(primary: string, fallbacks: string[]) {
  const seen = new Set<string>();
  const chain: string[] = [];
  for (const model of [primary, ...fallbacks]) {
    const normalized = model.trim();
    if (!normalized || seen.has(normalized)) continue;
    seen.add(normalized);
    chain.push(normalized);
  }
  return chain;
}

export function thinkingConfigForGemini25(model: string, budgets: GeminiThinkingBudgets) {
  const normalized = model.toLowerCase();
  if (!normalized.includes("gemini-2.5")) return undefined;

  if (normalized.includes("flash")) {
    return {
      includeThoughts: false,
      thinkingBudget: budgets.flashThinkingBudget,
    };
  }

  if (normalized.includes("pro")) {
    return {
      includeThoughts: false,
      thinkingBudget: Math.max(DEFAULT_PRO_THINKING_BUDGET, budgets.proThinkingBudget),
    };
  }

  return undefined;
}
