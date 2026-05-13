import { describe, expect, it } from "vitest";
import { chooseReadingTypeForPersona, recommendedReadingTypeCandidates } from "@/lib/reading-types/personaMapping";
import type { AxisScores, FaceKey, SajuKey } from "@/lib/persona/types";
import type { ReadingTypeCode } from "@/lib/reading-types/types";

function persona(faceKey: FaceKey, sajuKey: SajuKey, axisScores: AxisScores) {
  return { faceKey, sajuKey, axisScores };
}

describe("recommendedReadingTypeCandidates", () => {
  it("does not route balanced deep-diver users to thought_overload by default", () => {
    const candidates = recommendedReadingTypeCandidates(
      persona("balance_anchor", "deep_diver", {
        balance: 82,
        expressive: 35,
        focus: 50,
        vitality: 45,
      }),
    );

    expect(candidates).toEqual(["reality_tuning", "deep_dive_scholar", "self_trust"]);
    expect(candidates).not.toContain("thought_overload");
  });

  it("only includes thought_overload when the axis scores show actual overthinking risk", () => {
    const candidates = recommendedReadingTypeCandidates(
      persona("focused_thinker", "anchor_organizer", {
        balance: 72,
        expressive: 30,
        focus: 84,
        vitality: 32,
      }),
    );

    expect(candidates).toContain("thought_overload");
  });

  it("keeps energetic expressive users in creativity or action families", () => {
    const candidates = recommendedReadingTypeCandidates(
      persona("expressive_vital", "mover_igniter", {
        balance: 45,
        expressive: 74,
        focus: 42,
        vitality: 78,
      }),
    );

    expect(candidates).toEqual(["creativity_walk", "action_button", "career_compass"]);
  });

  it("uses vitality to avoid over-routing balanced energetic users to reality_tuning", () => {
    const candidates = recommendedReadingTypeCandidates(
      persona("balance_anchor", "mover_igniter", {
        balance: 80,
        expressive: 28,
        focus: 27,
        vitality: 70,
      }),
    );

    expect(candidates).toEqual(["action_button", "career_compass", "ambition_strategy"]);
  });

  it("keeps exploratory high-vitality users in discovery/action families", () => {
    const candidates = recommendedReadingTypeCandidates(
      persona("balance_anchor", "seeker_explorer", {
        balance: 78,
        expressive: 35,
        focus: 31,
        vitality: 70,
      }),
    );

    expect(candidates).toEqual(["curiosity_explorer", "action_button", "career_compass"]);
  });
});

describe("chooseReadingTypeForPersona", () => {
  it("keeps the model code when it is one of the persona candidates", () => {
    const decision = chooseReadingTypeForPersona({
      modelCode: "action_button",
      persona: persona("expressive_vital", "mover_igniter", {
        balance: 45,
        expressive: 74,
        focus: 42,
        vitality: 78,
      }),
    });

    expect(decision.code).toBe("action_button");
    expect(decision.corrected).toBe(false);
  });

  it("coerces thought_overload to the first candidate when the persona does not support it", () => {
    const decision = chooseReadingTypeForPersona({
      modelCode: "thought_overload",
      persona: persona("balance_anchor", "deep_diver", {
        balance: 82,
        expressive: 35,
        focus: 50,
        vitality: 45,
      }),
    });

    expect(decision.code).toBe("reality_tuning");
    expect(decision.modelCode).toBe("thought_overload");
    expect(decision.corrected).toBe(true);
  });

  it("falls back to a valid curiosity type if a non-enum code reaches the guard", () => {
    const decision = chooseReadingTypeForPersona({
      modelCode: "bad_code" as ReadingTypeCode,
      persona: persona("soft_baseline", "seeker_explorer", {
        balance: 45,
        expressive: 48,
        focus: 42,
        vitality: 39,
      }),
    });

    expect(decision.code).toBe("confidence_softener");
    expect(decision.corrected).toBe(true);
  });
});
