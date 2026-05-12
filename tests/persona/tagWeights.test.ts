import { describe, expect, it } from "vitest";
import { mergePersonaWeights } from "@/lib/persona/tagWeights";

describe("mergePersonaWeights", () => {
  it("sums face and saju weights when same tag exists", () => {
    const merged = mergePersonaWeights("focused_thinker", "deep_diver");
    expect(merged["심화 독서"]).toBe(4 + 3);
  });

  it("preserves unique tags from each side", () => {
    const merged = mergePersonaWeights("vital_driver", "mover_igniter");
    expect(merged["실행력"]).toBe(4 + 3);
    expect(merged["전략"]).toBe(2);
    expect(merged["동기부여"]).toBe(2);
  });
});
