const CODE_FENCE_RE = /^```(?:json)?\s*\n?([\s\S]*?)\n?```$/;

export function stripJsonCodeFence(text: string): string {
  const trimmed = text.trim();
  const match = trimmed.match(CODE_FENCE_RE);
  return match?.[1]?.trim() ?? trimmed;
}

export function repairUnescapedControlChars(text: string): string {
  let inString = false;
  let escaped = false;
  let out = "";
  for (let i = 0; i < text.length; i += 1) {
    const ch = text[i]!;
    if (escaped) {
      out += ch;
      escaped = false;
      continue;
    }
    if (ch === "\\") {
      out += ch;
      escaped = true;
      continue;
    }
    if (ch === '"') {
      out += ch;
      inString = !inString;
      continue;
    }
    if (inString) {
      if (ch === "\n") {
        out += "\\n";
        continue;
      }
      if (ch === "\r") {
        out += "\\r";
        continue;
      }
      if (ch === "\t") {
        out += "\\t";
        continue;
      }
    }
    out += ch;
  }
  return out;
}

export function truncateToLastValidObject(text: string): string | null {
  const lastBrace = text.lastIndexOf("}");
  if (lastBrace === -1) return null;
  return text.slice(0, lastBrace + 1);
}

export function parseLooseJson(rawText: string): unknown {
  const stripped = stripJsonCodeFence(rawText);
  try {
    return JSON.parse(stripped);
  } catch (initialError) {
    const repaired = repairUnescapedControlChars(stripped);
    if (repaired !== stripped) {
      try {
        return JSON.parse(repaired);
      } catch {
        // fall through to truncation attempt
      }
    }
    const truncated = truncateToLastValidObject(repaired);
    if (truncated && truncated !== repaired) {
      try {
        return JSON.parse(truncated);
      } catch {
        // fall through
      }
    }
    throw initialError;
  }
}
