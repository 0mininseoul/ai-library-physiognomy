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
  const excellenceBonus = clamp(
    (1 - normalizedAsymmetryPct / 0.8) * 2 +
      (1 - metrics.eyes.leftToRightDeltaMm / 0.6) +
      (1 - Math.abs(metrics.mouth.cornerAngleDeg) / 1.2) * 0.5 +
      ((metrics.phiRatioCompliance - 90) / 10) * 1.5,
    0,
    6,
  );

  const symmetry = clamp(Math.round(94 - normalizedAsymmetryPct * 2.2 - eyePenalty * 0.7 - mouthPenalty * 0.6 + excellenceBonus), scoreFloor, 100);
  const phi = clamp(metrics.phiRatioCompliance / 100, 0, 1);
  const balance = clamp(Math.round(84 + phi * 9 - normalizedAsymmetryPct * 1.1 + excellenceBonus * 0.8), scoreFloor, 100);
  const trust = clamp(Math.round((symmetry + balance) / 2 + 1), scoreFloor, 100);
  const likability = clamp(Math.round(trust + Math.min(3, metrics.faceAspectRatio * 1.4)), scoreFloor, 100);
  const attractiveness = clamp(Math.round((symmetry + balance + likability) / 3 + 1), scoreFloor, 100);

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
