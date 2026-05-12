import type { SajuCalculation } from "@/lib/saju/calculator";
import type { FaceMetrics } from "@/types/face";
import type { AxisScores, FaceKey, PersonaCandidates, PersonaSignal, SajuKey, ToneHint } from "./types";
import { SAJU_ELEMENT_TO_KEY } from "./types";
import { buildObservationCards } from "./observationCards";
import { mergePersonaWeights } from "./tagWeights";

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

const SINGLE_THRESHOLD = 70;
const DUAL_THRESHOLD = 60;

type AxisName = keyof AxisScores;
const AXIS_TO_SINGLE: Record<AxisName, FaceKey> = {
  balance: "balance_anchor",
  expressive: "expressive_spark",
  focus: "focused_thinker",
  vitality: "vital_driver",
};
const DUAL_LOOKUP: Record<string, FaceKey> = {
  "balance|focus": "balance_focus",
  "expressive|vitality": "expressive_vital",
  "focus|vitality": "focus_vital",
};

function dominantAxis(scores: AxisScores): AxisName | null {
  const entries = (Object.entries(scores) as Array<[AxisName, number]>).sort((a, b) => b[1] - a[1]);
  const [top, second] = entries;
  if (!top) return null;
  if (top[1] >= SINGLE_THRESHOLD && (!second || top[1] - second[1] >= 5)) return top[0];
  return null;
}

function dualAxes(scores: AxisScores): [AxisName, AxisName] | null {
  const qualifying = (Object.entries(scores) as Array<[AxisName, number]>).filter(([, value]) => value >= DUAL_THRESHOLD).sort((a, b) => b[1] - a[1]);
  if (qualifying.length < 2) return null;
  const a = qualifying[0]![0];
  const b = qualifying[1]![0];
  const key = [a, b].sort().join("|");
  if (DUAL_LOOKUP[key]) return [a, b];
  return null;
}

export function resolveFaceCandidates(scores: AxisScores): PersonaCandidates {
  const single = dominantAxis(scores);
  if (single) {
    const primary = AXIS_TO_SINGLE[single];
    const dual = dualAxes(scores);
    const alternates: FaceKey[] = [];
    if (dual) {
      const dualKey = [dual[0], dual[1]].sort().join("|");
      const dualLabel = DUAL_LOOKUP[dualKey];
      if (dualLabel) alternates.push(dualLabel);
    }
    if (alternates.length === 0) {
      const fallbackAxis = (Object.entries(scores) as Array<[AxisName, number]>).filter(([axis]) => axis !== single).sort((a, b) => b[1] - a[1])[0];
      if (fallbackAxis && fallbackAxis[1] >= 45) alternates.push(AXIS_TO_SINGLE[fallbackAxis[0]]);
    }
    return { primary, alternates: alternates.slice(0, 2) };
  }

  const dual = dualAxes(scores);
  if (dual) {
    const dualKey = [dual[0], dual[1]].sort().join("|");
    const primary = DUAL_LOOKUP[dualKey]!;
    const alternates = [AXIS_TO_SINGLE[dual[0]], AXIS_TO_SINGLE[dual[1]]].filter((key, index, all) => all.indexOf(key) === index);
    return { primary, alternates: alternates.slice(0, 2) };
  }

  const topAxis = (Object.entries(scores) as Array<[AxisName, number]>).sort((a, b) => b[1] - a[1])[0];
  const fallback = topAxis && topAxis[1] >= 50 ? AXIS_TO_SINGLE[topAxis[0]] : null;
  return {
    primary: "soft_baseline",
    alternates: fallback ? [fallback] : [],
  };
}

export function resolveSajuKey(saju: SajuCalculation): SajuKey {
  const dominant = saju.dominantElements[0];
  if (!dominant) return "deep_diver";
  return SAJU_ELEMENT_TO_KEY[dominant];
}

const TONE_HINT: Record<SajuKey, ToneHint> = {
  seeker_explorer: "spark",
  mover_igniter: "spark",
  anchor_organizer: "anchor",
  editor_decider: "edit",
  deep_diver: "deep",
};

export function resolvePersonaSignal(metrics: FaceMetrics, saju: SajuCalculation): PersonaSignal {
  const axisScores = computeAxisScores(metrics);
  const candidates = resolveFaceCandidates(axisScores);
  const sajuKey = resolveSajuKey(saju);
  const faceKey = candidates.primary;
  return {
    faceKey,
    sajuKey,
    combinedCode: `${faceKey}__${sajuKey}`,
    axisScores,
    observationCards: buildObservationCards(metrics, axisScores, saju),
    toneHint: TONE_HINT[sajuKey],
    candidates,
    bookTagWeights: mergePersonaWeights(faceKey, sajuKey),
  };
}
