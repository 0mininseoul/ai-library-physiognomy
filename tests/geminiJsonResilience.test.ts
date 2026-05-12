import { describe, expect, it } from "vitest";
import {
  parseLooseJson,
  repairUnescapedControlChars,
  stripJsonCodeFence,
  truncateToLastValidObject,
} from "@/lib/gemini/jsonResilience";

describe("stripJsonCodeFence", () => {
  it("returns trimmed input when there is no fence", () => {
    expect(stripJsonCodeFence('  {"a":1}  ')).toBe('{"a":1}');
  });

  it("strips ```json ... ``` fences", () => {
    expect(stripJsonCodeFence('```json\n{"a":1}\n```')).toBe('{"a":1}');
  });

  it("strips plain ``` fences", () => {
    expect(stripJsonCodeFence('```\n{"a":1}\n```')).toBe('{"a":1}');
  });
});

describe("repairUnescapedControlChars", () => {
  it("escapes literal newlines inside strings", () => {
    const input = '{"desc":"line1\nline2"}';
    const repaired = repairUnescapedControlChars(input);
    expect(repaired).toBe('{"desc":"line1\\nline2"}');
    expect(JSON.parse(repaired)).toEqual({ desc: "line1\nline2" });
  });

  it("escapes literal tabs and carriage returns inside strings", () => {
    const input = '{"a":"x\ty\r"}';
    const repaired = repairUnescapedControlChars(input);
    expect(JSON.parse(repaired)).toEqual({ a: "x\ty\r" });
  });

  it("leaves whitespace between tokens untouched", () => {
    const input = '{\n  "a": 1,\n  "b": 2\n}';
    expect(repairUnescapedControlChars(input)).toBe(input);
  });

  it("respects already-escaped quotes when tracking string state", () => {
    const input = '{"a":"he said \\"hi\\" then\nfin"}';
    const repaired = repairUnescapedControlChars(input);
    expect(JSON.parse(repaired)).toEqual({ a: 'he said "hi" then\nfin' });
  });
});

describe("truncateToLastValidObject", () => {
  it("trims trailing garbage after the last closing brace", () => {
    expect(truncateToLastValidObject('{"a":1}abc')).toBe('{"a":1}');
  });

  it("returns null when no closing brace exists", () => {
    expect(truncateToLastValidObject('{"a":1')).toBeNull();
  });
});

describe("parseLooseJson", () => {
  it("parses clean JSON", () => {
    expect(parseLooseJson('{"a":1}')).toEqual({ a: 1 });
  });

  it("parses JSON wrapped in a markdown code fence", () => {
    expect(parseLooseJson('```json\n{"a":1}\n```')).toEqual({ a: 1 });
  });

  it("parses JSON with unescaped newlines inside string values", () => {
    const input = '{"description":"첫 문장.\n두 번째 문장."}';
    expect(parseLooseJson(input)).toEqual({ description: "첫 문장.\n두 번째 문장." });
  });

  it("throws the original error when repair cannot recover", () => {
    expect(() => parseLooseJson('this is not json at all')).toThrow(SyntaxError);
  });
});
