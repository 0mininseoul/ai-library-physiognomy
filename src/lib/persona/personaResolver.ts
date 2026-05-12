import type { FaceMetrics } from "@/types/face";
import type { AxisScores } from "./types";

const clamp = (value: number, min = 0, max = 100) => Math.min(max, Math.max(min, value));
const round = (value: number) => Math.round(value);

function balanceScore(metrics: FaceMetrics): number {
  const phi = clamp(metrics.phiRatioCompliance, 0, 100);
  const asymmetryNormalized = clamp(1 - metrics.asymmetryIndex / 0.03, 0, 1) * 100;
  const eyeDelta = clamp(1 - metrics.eyes.leftToRightDeltaMm / 3, 0, 1) * 100;
  return round(clamp(phi * 0.45 + asymmetryNormalized * 0.35 + eyeDelta * 0.2));
}

function expressiveScore(metrics: FaceMetrics): number {
  const corner = clamp(Math.abs(metrics.mouth.cornerAngleDeg) / 8, 0, 1) * 100;
  const eyeDelta = clamp(metrics.eyes.leftToRightDeltaMm / 3, 0, 1) * 100;
  const lowerThird = clamp((metrics.thirds.lower - 0.4) / 0.2, 0, 1) * 100;
  return round(clamp(corner * 0.5 + eyeDelta * 0.3 + lowerThird * 0.2));
}

function focusScore(metrics: FaceMetrics): number {
  const eyeNarrow = clamp((0.4 - metrics.eyeSpacing) / 0.14, 0, 1) * 100;
  const upperThird = clamp((metrics.thirds.upper - 0.12) / 0.12, 0, 1) * 100;
  const vline = clamp((metrics.jaw.vlineIndex - 0.05) / 0.18, 0, 1) * 100;
  return round(clamp(eyeNarrow * 0.45 + upperThird * 0.3 + vline * 0.25));
}

function vitalityScore(metrics: FaceMetrics): number {
  const chin = clamp(metrics.jaw.chinProtrusionMm / 14, 0, 1) * 100;
  const noseLen = clamp((metrics.nose.lengthMm - 36) / 24, 0, 1) * 100;
  const cheek = clamp((metrics.jaw.cheekToJawRatio - 1.0) / 0.5, 0, 1) * 100;
  const aspect = clamp((metrics.faceAspectRatio - 0.62) / 0.2, 0, 1) * 100;
  return round(clamp(chin * 0.35 + noseLen * 0.25 + cheek * 0.2 + aspect * 0.2));
}

export function computeAxisScores(metrics: FaceMetrics): AxisScores {
  return {
    balance: balanceScore(metrics),
    expressive: expressiveScore(metrics),
    focus: focusScore(metrics),
    vitality: vitalityScore(metrics),
  };
}
