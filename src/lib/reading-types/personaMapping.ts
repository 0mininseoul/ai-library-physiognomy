import type { AxisScores, FaceKey, SajuKey } from "@/lib/persona/types";
import { isReadingTypeCode, type ReadingTypeCode } from "@/lib/reading-types/types";

type CandidateSet = readonly [ReadingTypeCode, ReadingTypeCode, ReadingTypeCode];

type PersonaForReadingType = {
  faceKey: FaceKey;
  sajuKey: SajuKey;
  axisScores: AxisScores;
};

const FACE_PRIORITY: Record<FaceKey, CandidateSet> = {
  balance_anchor: ["reality_tuning", "self_trust", "emotion_reset"],
  expressive_spark: ["creativity_walk", "relationship_translator", "emotion_reset"],
  focused_thinker: ["deep_dive_scholar", "language_muscle", "thought_overload"],
  vital_driver: ["action_button", "career_compass", "ambition_strategy"],
  balance_focus: ["deep_dive_scholar", "reality_tuning", "language_muscle"],
  expressive_vital: ["creativity_walk", "action_button", "career_compass"],
  focus_vital: ["ambition_strategy", "deep_dive_scholar", "career_compass"],
  soft_baseline: ["confidence_softener", "emotion_reset", "rest_prescription"],
};

const SAJU_PRIORITY: Record<SajuKey, CandidateSet> = {
  seeker_explorer: ["curiosity_explorer", "worldview_expand", "creativity_walk"],
  mover_igniter: ["action_button", "career_compass", "ambition_strategy"],
  anchor_organizer: ["focus_reboot", "reality_tuning", "self_trust"],
  editor_decider: ["ambition_strategy", "reality_tuning", "self_trust"],
  deep_diver: ["deep_dive_scholar", "worldview_expand", "language_muscle"],
};

const FACE_KEYS = new Set<FaceKey>(Object.keys(FACE_PRIORITY) as FaceKey[]);

export type ReadingTypeDecision = {
  code: ReadingTypeCode;
  modelCode?: ReadingTypeCode;
  candidates: CandidateSet;
  corrected: boolean;
  reason: "model_candidate" | "unsupported_by_persona" | "invalid_model_code";
};

export function recommendedReadingTypeCandidates(persona: PersonaForReadingType, confirmedFaceKey?: string): CandidateSet {
  const faceKey = isFaceKey(confirmedFaceKey) ? confirmedFaceKey : persona.faceKey;
  const merged = axisOverrideCandidates(persona) ?? uniqueInterleave(FACE_PRIORITY[faceKey], SAJU_PRIORITY[persona.sajuKey]);
  const allowThoughtOverload = hasThoughtOverloadSignal(persona.axisScores);
  const prioritized = allowThoughtOverload ? insertAfterFirst(merged, "thought_overload") : merged.filter((code) => code !== "thought_overload");
  return toCandidateSet(prioritized);
}

export function chooseReadingTypeForPersona({
  modelCode,
  persona,
  confirmedFaceKey,
}: {
  modelCode: unknown;
  persona: PersonaForReadingType;
  confirmedFaceKey?: string;
}): ReadingTypeDecision {
  const candidates = recommendedReadingTypeCandidates(persona, confirmedFaceKey);
  const validModelCode = isReadingTypeCode(modelCode) ? modelCode : undefined;

  if (validModelCode && candidates.includes(validModelCode)) {
    return { code: validModelCode, modelCode: validModelCode, candidates, corrected: false, reason: "model_candidate" };
  }

  return {
    code: candidates[0],
    modelCode: validModelCode,
    candidates,
    corrected: true,
    reason: validModelCode ? "unsupported_by_persona" : "invalid_model_code",
  };
}

function hasThoughtOverloadSignal(scores: AxisScores) {
  return scores.focus >= 65 && scores.vitality <= 45 && scores.balance >= 55;
}

function axisOverrideCandidates(persona: PersonaForReadingType): ReadingTypeCode[] | null {
  const { axisScores, sajuKey } = persona;

  if (axisScores.expressive >= 65 && axisScores.vitality >= 60) {
    return ["creativity_walk", "action_button", "career_compass"];
  }

  if (axisScores.vitality >= 65 && axisScores.focus < 60) {
    if (sajuKey === "mover_igniter") return ["action_button", "career_compass", "ambition_strategy"];
    if (sajuKey === "editor_decider") return ["ambition_strategy", "action_button", "career_compass"];
    if (sajuKey === "seeker_explorer") return ["curiosity_explorer", "action_button", "career_compass"];
    if (sajuKey === "deep_diver") return ["deep_dive_scholar", "action_button", "worldview_expand"];
    return ["action_button", "reality_tuning", "focus_reboot"];
  }

  if (axisScores.expressive >= 65) {
    return ["creativity_walk", "relationship_translator", "curiosity_explorer"];
  }

  return null;
}

function uniqueInterleave(face: CandidateSet, saju: CandidateSet): ReadingTypeCode[] {
  const result: ReadingTypeCode[] = [];
  for (let index = 0; index < 3; index += 1) {
    pushUnique(result, face[index]);
    pushUnique(result, saju[index]);
  }
  return result;
}

function insertAfterFirst(values: ReadingTypeCode[], code: ReadingTypeCode) {
  const withoutCode = values.filter((value) => value !== code);
  return [withoutCode[0], code, ...withoutCode.slice(1)].filter(Boolean) as ReadingTypeCode[];
}

function toCandidateSet(values: ReadingTypeCode[]): CandidateSet {
  const result = [...values];
  for (const code of ["curiosity_explorer", "reality_tuning", "confidence_softener"] as const) {
    pushUnique(result, code);
  }
  return result.slice(0, 3) as unknown as CandidateSet;
}

function pushUnique(values: ReadingTypeCode[], code: ReadingTypeCode) {
  if (!values.includes(code)) values.push(code);
}

function isFaceKey(value: unknown): value is FaceKey {
  return typeof value === "string" && FACE_KEYS.has(value as FaceKey);
}
