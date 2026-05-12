import type { SajuElement } from "@/lib/saju/calculator";

export type FaceKey =
  | "balance_anchor"
  | "expressive_spark"
  | "focused_thinker"
  | "vital_driver"
  | "balance_focus"
  | "expressive_vital"
  | "focus_vital"
  | "soft_baseline";

export type SajuKey =
  | "seeker_explorer" // wood
  | "mover_igniter" // fire
  | "anchor_organizer" // earth
  | "editor_decider" // metal
  | "deep_diver"; // water

export type ToneHint = "calm" | "spark" | "anchor" | "edit" | "deep";

export type AxisScores = {
  balance: number;
  expressive: number;
  focus: number;
  vitality: number;
};

export type ObservationCard = {
  axis: "balance" | "expressive" | "focus" | "vitality" | "saju";
  rawMetric: string;
  observation: string;
};

export type PersonaCandidates = {
  primary: FaceKey;
  alternates: FaceKey[];
};

export type PersonaSignal = {
  faceKey: FaceKey;
  sajuKey: SajuKey;
  combinedCode: string;
  axisScores: AxisScores;
  observationCards: ObservationCard[];
  toneHint: ToneHint;
  candidates: PersonaCandidates;
  bookTagWeights: Record<string, number>;
};

export const SAJU_ELEMENT_TO_KEY: Record<SajuElement, SajuKey> = {
  wood: "seeker_explorer",
  fire: "mover_igniter",
  earth: "anchor_organizer",
  metal: "editor_decider",
  water: "deep_diver",
};
