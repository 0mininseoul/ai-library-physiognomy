import { describe, expect, it } from "vitest";
import { calibrateFaceScores } from "@/lib/facemesh/scoreCalibration";
import type { FaceMetrics } from "@/types/face";

function metrics(overrides: Partial<FaceMetrics> = {}): FaceMetrics {
  return {
    asymmetryIndex: 0.002,
    phiRatioCompliance: 84,
    thirds: { upper: 0.31, middle: 0.34, lower: 0.35 },
    fifths: [0.19, 0.2, 0.2, 0.2, 0.21],
    faceAspectRatio: 1.38,
    eyeSpacing: 0.22,
    facialAngleDeg: 178,
    forehead: { areaPct: 16, brow: 0.6, classification: "average" },
    eyes: { leftToRightDeltaMm: 0.2, outerCantalAngleDeg: -2 },
    nose: { lengthMm: 58, widthMm: 27, columellaAngleDeg: 91 },
    mouth: { upperLowerLipRatio: 0.98, philtrumRatioPct: 12, cornerAngleDeg: -1 },
    jaw: { vlineIndex: 0.18, chinProtrusionMm: 22, cheekToJawRatio: 1.2 },
    faceBox: { x: 0.2, y: 0.08, width: 0.52, height: 0.72 },
    ...overrides,
  };
}

describe("calibrateFaceScores", () => {
  it("keeps very good symmetry below the old inflated 95-point range", () => {
    expect(calibrateFaceScores(metrics()).symmetry).toBeLessThanOrEqual(90);
  });

  it("penalizes normalized asymmetry, eye delta, and mouth tilt", () => {
    const stable = calibrateFaceScores(metrics());
    const unstable = calibrateFaceScores(
      metrics({
        asymmetryIndex: 0.018,
        eyes: { leftToRightDeltaMm: 3.2, outerCantalAngleDeg: -2 },
        mouth: { upperLowerLipRatio: 0.98, philtrumRatioPct: 12, cornerAngleDeg: -7 },
      }),
    );

    expect(unstable.symmetry).toBeLessThan(stable.symmetry);
    expect(unstable.balance).toBeLessThanOrEqual(stable.balance);
  });

  it("keeps normal visible scores at 70 or higher", () => {
    const score = calibrateFaceScores(
      metrics({
        asymmetryIndex: 0.01,
        eyes: { leftToRightDeltaMm: 1.2, outerCantalAngleDeg: -2 },
        mouth: { upperLowerLipRatio: 0.98, philtrumRatioPct: 12, cornerAngleDeg: -3 },
      }),
    );

    expect(Math.min(score.likability, score.trust, score.symmetry, score.balance, score.attractiveness)).toBeGreaterThanOrEqual(70);
  });

  it("allows clearly severe signals to fall below 70", () => {
    const score = calibrateFaceScores(
      metrics({
        asymmetryIndex: 0.03,
        eyes: { leftToRightDeltaMm: 3.6, outerCantalAngleDeg: -2 },
        mouth: { upperLowerLipRatio: 0.98, philtrumRatioPct: 12, cornerAngleDeg: -8 },
      }),
    );

    expect(score.symmetry).toBeLessThan(70);
  });
});
