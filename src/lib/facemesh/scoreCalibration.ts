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
  const eyePenalty = clamp(metrics.eyes.leftToRightDeltaMm / 0.8, 0, 10);
  const mouthPenalty = clamp(Math.abs(metrics.mouth.cornerAngleDeg) * 1.4, 0, 10);
  const severeSignal = normalizedAsymmetryPct >= 3.8 || metrics.eyes.leftToRightDeltaMm >= 3 || Math.abs(metrics.mouth.cornerAngleDeg) >= 6.5;
  const scoreFloor = severeSignal ? 62 : 70;

  const symmetry = clamp(Math.round(84 - normalizedAsymmetryPct * 9 - eyePenalty - mouthPenalty), scoreFloor, 90);
  const phi = clamp(metrics.phiRatioCompliance / 100, 0, 1);
  const balance = clamp(Math.round(63 + phi * 22 - normalizedAsymmetryPct * 4), scoreFloor, 90);
  const trust = clamp(Math.round((symmetry + balance) / 2 + 2), scoreFloor, 90);
  const likability = clamp(Math.round(trust - 1 + Math.min(5, metrics.faceAspectRatio * 1.8)), scoreFloor, 90);
  const attractiveness = clamp(Math.round((symmetry + balance + likability) / 3), scoreFloor, 89);

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
