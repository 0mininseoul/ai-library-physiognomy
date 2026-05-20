type GeminiUsageSummary = {
  promptTokenCount?: number;
  candidatesTokenCount?: number;
  thoughtsTokenCount?: number;
  totalTokenCount?: number;
};

type BuildServerErrorEventPayloadInput = {
  route: string;
  stage: string;
  message: string;
  error?: unknown;
  model?: string;
  finishReason?: string;
  responseText?: string;
  responseLength?: number;
  maxOutputTokens?: number;
  thinkingBudget?: number;
  usage?: GeminiUsageSummary;
};

type JsonValue = string | number | boolean | null | JsonValue[] | { [key: string]: JsonValue };

export function buildServerErrorEventPayload(input: BuildServerErrorEventPayloadInput): Record<string, JsonValue> {
  const errorFields = errorToFields(input.error);
  const responseText = input.responseText;
  const responseLength = typeof responseText === "string" ? responseText.length : input.responseLength;

  return compactJsonObject({
    route: limitString(input.route, 120),
    stage: limitString(input.stage, 120),
    message: limitString(input.message, 1_000),
    errorName: errorFields.errorName,
    errorMessage: errorFields.errorMessage,
    model: input.model ? limitString(input.model, 120) : undefined,
    finishReason: input.finishReason ? limitString(input.finishReason, 120) : undefined,
    responseLength,
    responseEmpty: typeof responseText === "string" ? responseText.trim().length === 0 : undefined,
    responseLooksJson: typeof responseText === "string" ? looksLikeJson(responseText) : undefined,
    responseEndsWithJsonClose: typeof responseText === "string" ? endsWithJsonClose(responseText) : undefined,
    maxOutputTokens: input.maxOutputTokens,
    thinkingBudget: input.thinkingBudget,
    usage: sanitizeUsage(input.usage),
  });
}

function errorToFields(error: unknown) {
  if (error instanceof Error) {
    return {
      errorName: limitString(error.name || "Error", 120),
      errorMessage: limitString(error.message, 1_000),
    };
  }

  if (typeof error === "string") {
    return {
      errorName: "Error",
      errorMessage: limitString(error, 1_000),
    };
  }

  if (error && typeof error === "object") {
    const candidate = error as { name?: unknown; message?: unknown };
    return {
      errorName: typeof candidate.name === "string" ? limitString(candidate.name, 120) : "Error",
      errorMessage: typeof candidate.message === "string" ? limitString(candidate.message, 1_000) : undefined,
    };
  }

  return {
    errorName: undefined,
    errorMessage: undefined,
  };
}

function looksLikeJson(text: string) {
  const first = text.trimStart()[0];
  return first === "{" || first === "[";
}

function endsWithJsonClose(text: string) {
  const last = text.trimEnd().at(-1);
  return last === "}" || last === "]";
}

function sanitizeUsage(usage: GeminiUsageSummary | undefined) {
  if (!usage) return undefined;
  return compactJsonObject({
    promptTokenCount: usage.promptTokenCount,
    candidatesTokenCount: usage.candidatesTokenCount,
    thoughtsTokenCount: usage.thoughtsTokenCount,
    totalTokenCount: usage.totalTokenCount,
  });
}

function compactJsonObject(input: Record<string, JsonValue | undefined>): Record<string, JsonValue> {
  return Object.fromEntries(Object.entries(input).filter(([, value]) => value !== undefined)) as Record<string, JsonValue>;
}

function limitString(input: string, maxLength: number) {
  return input.length > maxLength ? `${input.slice(0, maxLength - 1)}...` : input;
}
