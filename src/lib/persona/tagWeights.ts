import type { FaceKey, SajuKey } from "./types";

export const FACE_TAG_WEIGHTS: Record<FaceKey, Record<string, number>> = {
  balance_anchor: { "사고 정리": 3, "글쓰기": 2, "철학 입문": 3, "에세이": 2 },
  expressive_spark: { "창의성": 4, "예술": 3, "문학": 3, "감정 회복": 2 },
  focused_thinker: { "심화 독서": 4, "철학 입문": 3, "고전": 3, "사고 정리": 2 },
  vital_driver: { "실행력": 4, "생산성": 3, "행동": 3, "전략": 2 },
  balance_focus: { "사고 정리": 3, "심화 독서": 3, "전문 교양": 2, "철학 입문": 2 },
  expressive_vital: { "창의성": 3, "예술": 2, "실행력": 3, "생산성": 2 },
  focus_vital: { "전략": 4, "경영": 3, "커리어": 3, "심화 독서": 2 },
  soft_baseline: { "위로": 3, "에세이": 3, "자기돌봄": 2, "문학": 2 },
};

export const SAJU_TAG_WEIGHTS: Record<SajuKey, Record<string, number>> = {
  seeker_explorer: { "교양": 3, "입문서": 3, "인문": 2, "취향": 2 },
  mover_igniter: { "실행력": 3, "행동": 3, "생산성": 2, "동기부여": 2 },
  anchor_organizer: { "사고 정리": 3, "습관": 3, "시간관리": 2, "구조": 2 },
  editor_decider: { "전략": 3, "판단": 3, "비즈니스": 2, "기준": 2 },
  deep_diver: { "심화 독서": 3, "에세이": 2, "위로": 2, "철학 입문": 2 },
};

export function mergePersonaWeights(face: FaceKey, saju: SajuKey): Record<string, number> {
  const merged: Record<string, number> = { ...FACE_TAG_WEIGHTS[face] };
  for (const [tag, weight] of Object.entries(SAJU_TAG_WEIGHTS[saju])) {
    merged[tag] = (merged[tag] ?? 0) + weight;
  }
  return merged;
}
