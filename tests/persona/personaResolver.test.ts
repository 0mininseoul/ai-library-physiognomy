import { describe, expect, it } from "vitest";
import { computeAxisScores } from "@/lib/persona/personaResolver";
import type { FaceMetrics } from "@/types/face";

function metrics(overrides: Partial<FaceMetrics> = {}): FaceMetrics {
  const base: FaceMetrics = {
    asymmetryIndex: 0.012,
    phiRatioCompliance: 70,
    thirds: { upper: 0.15, middle: 0.34, lower: 0.51 },
    fifths: [0.2, 0.2, 0.2, 0.2, 0.2],
    faceAspectRatio: 0.72,
    eyeSpacing: 0.34,
    facialAngleDeg: 165,
    forehead: { areaPct: 15, brow: 1.0, classification: "average" },
    eyes: { leftToRightDeltaMm: 0.8, outerCantalAngleDeg: 2 },
    nose: { lengthMm: 50, widthMm: 32, columellaAngleDeg: 95 },
    mouth: { upperLowerLipRatio: 0.6, philtrumRatioPct: 12, cornerAngleDeg: 2 },
    jaw: { vlineIndex: 0.16, chinProtrusionMm: 6, cheekToJawRatio: 1.2 },
    faceBox: { x: 0.1, y: 0.1, width: 0.5, height: 0.7 },
  };
  return { ...base, ...overrides };
}

describe("computeAxisScores", () => {
  it("returns 4 axes each clamped to 0-100", () => {
    const scores = computeAxisScores(metrics());
    expect(Object.keys(scores).sort()).toEqual(["balance", "expressive", "focus", "vitality"]);
    for (const value of Object.values(scores)) {
      expect(value).toBeGreaterThanOrEqual(0);
      expect(value).toBeLessThanOrEqual(100);
    }
  });

  it("rewards high phi ratio and low asymmetry on balance axis", () => {
    const high = computeAxisScores(metrics({ phiRatioCompliance: 95, asymmetryIndex: 0.003, eyes: { leftToRightDeltaMm: 0.2, outerCantalAngleDeg: 1 } }));
    const low = computeAxisScores(metrics({ phiRatioCompliance: 20, asymmetryIndex: 0.04, eyes: { leftToRightDeltaMm: 3, outerCantalAngleDeg: 5 } }));
    expect(high.balance).toBeGreaterThan(low.balance + 30);
  });

  it("rewards strong mouth corner and eye delta on expressive axis", () => {
    const high = computeAxisScores(metrics({ mouth: { upperLowerLipRatio: 0.6, philtrumRatioPct: 12, cornerAngleDeg: 8 }, eyes: { leftToRightDeltaMm: 2.4, outerCantalAngleDeg: 2 }, thirds: { upper: 0.15, middle: 0.32, lower: 0.53 } }));
    const low = computeAxisScores(metrics({ mouth: { upperLowerLipRatio: 0.6, philtrumRatioPct: 12, cornerAngleDeg: 0.4 }, eyes: { leftToRightDeltaMm: 0.2, outerCantalAngleDeg: 2 }, thirds: { upper: 0.15, middle: 0.34, lower: 0.51 } }));
    expect(high.expressive).toBeGreaterThan(low.expressive + 25);
  });

  it("rewards narrow eye spacing and tall upper third on focus axis", () => {
    const high = computeAxisScores(metrics({ eyeSpacing: 0.26, thirds: { upper: 0.22, middle: 0.33, lower: 0.45 }, jaw: { vlineIndex: 0.22, chinProtrusionMm: 6, cheekToJawRatio: 1.2 } }));
    const low = computeAxisScores(metrics({ eyeSpacing: 0.42, thirds: { upper: 0.10, middle: 0.34, lower: 0.56 }, jaw: { vlineIndex: 0.08, chinProtrusionMm: 6, cheekToJawRatio: 1.2 } }));
    expect(high.focus).toBeGreaterThan(low.focus + 25);
  });

  it("rewards chin protrusion and longer nose on vitality axis", () => {
    const high = computeAxisScores(metrics({ jaw: { vlineIndex: 0.16, chinProtrusionMm: 12, cheekToJawRatio: 1.45 }, nose: { lengthMm: 60, widthMm: 32, columellaAngleDeg: 95 }, faceAspectRatio: 0.78 }));
    const low = computeAxisScores(metrics({ jaw: { vlineIndex: 0.16, chinProtrusionMm: 2, cheekToJawRatio: 1.05 }, nose: { lengthMm: 38, widthMm: 32, columellaAngleDeg: 95 }, faceAspectRatio: 0.66 }));
    expect(high.vitality).toBeGreaterThan(low.vitality + 20);
  });
});
