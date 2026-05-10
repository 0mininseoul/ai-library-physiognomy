import type { SajuCalculation, SajuElement } from "@/lib/saju/calculator";

export const SAJU_ELEMENT_ORDER: SajuElement[] = ["wood", "fire", "earth", "metal", "water"];

const ELEMENT_META: Record<SajuElement, { icon: string; label: string; short: string }> = {
  wood: { icon: "🌿", label: "나무", short: "나무" },
  fire: { icon: "🔥", label: "불", short: "불" },
  earth: { icon: "🪨", label: "흙", short: "흙" },
  metal: { icon: "⚙️", label: "금", short: "금" },
  water: { icon: "💧", label: "물", short: "물" },
};

const STEM_ELEMENT_SUFFIX: Record<SajuElement, string> = {
  wood: "목",
  fire: "화",
  earth: "토",
  metal: "금",
  water: "수",
};

export function sajuElementMeta(element: SajuElement) {
  return ELEMENT_META[element];
}

export function koreanDayMaster(calculation?: SajuCalculation | null) {
  if (!calculation) return "생년월일 기준";

  return `${calculation.dayMaster.korean}${STEM_ELEMENT_SUFFIX[calculation.dayMaster.element]}(${calculation.dayMaster.elementLabel} 타입)`;
}

export function koreanPillarSummary(calculation?: SajuCalculation | null) {
  if (!calculation) return "생년월일 기준으로만 분석했어요. 태어난 시간은 반영하지 않았어요.";

  return [
    `태어난 해 ${calculation.yearPillar.stem.korean}${calculation.yearPillar.branch.korean}`,
    `태어난 달 ${calculation.monthPillar.stem.korean}${calculation.monthPillar.branch.korean}`,
    `태어난 날 ${calculation.dayPillar.stem.korean}${calculation.dayPillar.branch.korean}`,
    `일간 ${koreanDayMaster(calculation)}`,
    "태어난 시간은 미반영",
  ].join(" / ");
}

export function elementCountItems(calculation?: SajuCalculation | null) {
  if (!calculation) return [];

  return SAJU_ELEMENT_ORDER.map((element) => ({
    element,
    ...ELEMENT_META[element],
    count: calculation.elementCounts[element],
  }));
}

export function dominantElementText(calculation?: SajuCalculation | null) {
  if (!calculation) return "생년월일 리듬";

  return calculation.dominantElements.map((element) => `${ELEMENT_META[element].icon} ${ELEMENT_META[element].label}`).join(", ");
}

export function stripHanja(input: string) {
  return input
    .replace(/[\u3400-\u9fff]/g, "")
    .replace(/\s{2,}/g, " ")
    .replace(/\(\s*,\s*/g, "(")
    .replace(/\s+\)/g, ")")
    .trim();
}
