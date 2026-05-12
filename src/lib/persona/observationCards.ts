import type { FaceMetrics } from "@/types/face";
import type { SajuCalculation } from "@/lib/saju/calculator";
import type { AxisScores, ObservationCard } from "./types";

const SAJU_ELEMENT_OBSERVATIONS: Record<string, string> = {
  wood: "새 분야에 호기심이 빨리 붙는 편이라, 시작은 가볍지만 가지가 빨리 뻗는 사람",
  fire: "시동이 걸리면 주변 분위기까지 같이 끌어올리는 추진감이 있는 사람",
  earth: "복잡한 상황을 차분히 묶어내는 정리 감각이 또렷한 사람",
  metal: "선택지가 많아도 핵심 기준을 빠르게 잡는 판단 리듬이 있는 사람",
  water: "겉으로는 차분해도 안쪽에선 한 주제에 오래 머무르며 깊이 쌓는 사람",
};

export function buildObservationCards(metrics: FaceMetrics, axisScores: AxisScores, saju: SajuCalculation): ObservationCard[] {
  const cards: ObservationCard[] = [];

  if (axisScores.balance >= 60) {
    cards.push({
      axis: "balance",
      rawMetric: `phiRatioCompliance ${metrics.phiRatioCompliance}, asymmetryIndex ${metrics.asymmetryIndex}`,
      observation: `좌우 비대칭 ${(metrics.asymmetryIndex * 100).toFixed(1)}% — 중심을 흔들지 않는 안정감이 먼저 보이는 사람`,
    });
  } else if (axisScores.balance <= 40) {
    cards.push({
      axis: "balance",
      rawMetric: `asymmetryIndex ${metrics.asymmetryIndex}`,
      observation: `좌우 비대칭 ${(metrics.asymmetryIndex * 100).toFixed(1)}% — 표정이 한쪽으로 살짝 기우는 게 매력 포인트인 사람`,
    });
  }

  if (axisScores.expressive >= 60) {
    cards.push({
      axis: "expressive",
      rawMetric: `mouth.cornerAngleDeg ${metrics.mouth.cornerAngleDeg}, eyes.leftToRightDeltaMm ${metrics.eyes.leftToRightDeltaMm}`,
      observation: `입꼬리 각도 ${metrics.mouth.cornerAngleDeg}° — 표정이 솔직하게 새어 나오는 편이라 말보다 분위기가 먼저 도착하는 사람`,
    });
  }

  if (axisScores.focus >= 60) {
    cards.push({
      axis: "focus",
      rawMetric: `eyeSpacing ${metrics.eyeSpacing}, thirds.upper ${metrics.thirds.upper}`,
      observation: `눈 사이 간격이 좁은 편 — 한 번 꽂힌 주제 끝까지 파고드는 집중 리듬이 또렷한 사람`,
    });
  } else if (axisScores.focus <= 40) {
    cards.push({
      axis: "focus",
      rawMetric: `eyeSpacing ${metrics.eyeSpacing}`,
      observation: `눈 사이 간격이 넓은 편 — 시야가 열려 있어 동시에 여러 갈래로 생각이 뻗는 사람`,
    });
  }

  if (axisScores.vitality >= 60) {
    cards.push({
      axis: "vitality",
      rawMetric: `jaw.chinProtrusionMm ${metrics.jaw.chinProtrusionMm}, nose.lengthMm ${metrics.nose.lengthMm}`,
      observation: `하관 라인이 또렷한 편 — 결정한 건 끝까지 가는 추진 인상을 주는 사람`,
    });
  }

  const dominant = saju.dominantElements[0];
  if (dominant) {
    cards.push({
      axis: "saju",
      rawMetric: `dominantElement ${dominant}`,
      observation: SAJU_ELEMENT_OBSERVATIONS[dominant] ?? SAJU_ELEMENT_OBSERVATIONS.water!,
    });
  }

  return cards.slice(0, 7);
}
