import type { FaceMetrics } from "@/types/face";

export type CalibratedFaceScores = {
  symmetry: number;
  balance: number;
  trust: number;
  likability: number;
  attractiveness: number;
  diagnostics: {
    normalizedAsymmetryPct: number;
    eyeDeltaMm: number;
    mouthCornerAngleDeg: number;
    phiRatioCompliance: number;
  };
};

const clamp = (value: number, min: number, max: number) => Math.min(max, Math.max(min, value));

export function calibrateFaceScores(metrics: FaceMetrics): CalibratedFaceScores {
  const faceWidth = Math.max(metrics.faceBox.width, 0.001);
  const normalizedAsymmetryPct = Number(((metrics.asymmetryIndex / faceWidth) * 100).toFixed(2));
  const eyePenalty = clamp(metrics.eyes.leftToRightDeltaMm / 1.2, 0, 8);
  const mouthPenalty = clamp(Math.abs(metrics.mouth.cornerAngleDeg) * 0.8, 0, 8);
  const severeSignal = normalizedAsymmetryPct >= 5.5 || metrics.eyes.leftToRightDeltaMm >= 4.2 || Math.abs(metrics.mouth.cornerAngleDeg) >= 8.5;
  const scoreFloor = severeSignal ? 76 : 82;

  const symmetry = clamp(Math.round(92 - normalizedAsymmetryPct * 2.2 - eyePenalty * 0.7 - mouthPenalty * 0.6), scoreFloor, 94);
  const phi = clamp(metrics.phiRatioCompliance / 100, 0, 1);
  const balance = clamp(Math.round(84 + phi * 9 - normalizedAsymmetryPct * 1.1), scoreFloor, 94);
  const trust = clamp(Math.round((symmetry + balance) / 2 + 1), scoreFloor, 94);
  const likability = clamp(Math.round(trust + Math.min(3, metrics.faceAspectRatio * 1.4)), scoreFloor, 94);
  const attractiveness = clamp(Math.round((symmetry + balance + likability) / 3 + 1), scoreFloor, 93);

  return {
    symmetry,
    balance,
    trust,
    likability,
    attractiveness,
    diagnostics: {
      normalizedAsymmetryPct,
      eyeDeltaMm: metrics.eyes.leftToRightDeltaMm,
      mouthCornerAngleDeg: metrics.mouth.cornerAngleDeg,
      phiRatioCompliance: metrics.phiRatioCompliance,
    },
  };
}
