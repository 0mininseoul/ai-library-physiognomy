import { describe, expect, it } from "vitest";
import { buildLibraryPrompt } from "@/lib/gemini/libraryPrompt";
import type { CalibratedFaceScores } from "@/lib/facemesh/scoreCalibration";
import type { PersonaSignal } from "@/lib/persona/types";
import { calculateSaju } from "@/lib/saju/calculator";
import type { FaceMetrics } from "@/types/face";
import type { StudentInput } from "@/types/session";

describe("buildLibraryPrompt", () => {
  it("constrains reading_type selection to persona candidates", () => {
    const prompt = buildLibraryPrompt({
      input,
      displayName: "영민",
      metrics,
      calibratedScores,
      saju,
      persona: {
        faceKey: "balance_anchor",
        sajuKey: "deep_diver",
        combinedCode: "balance_anchor__deep_diver",
        axisScores: { balance: 82, expressive: 35, focus: 50, vitality: 45 },
        observationCards: [],
        toneHint: "deep",
        candidates: { primary: "balance_anchor", alternates: [] },
        bookTagWeights: {},
      } satisfies PersonaSignal,
    });

    expect(prompt).toContain("권장 reading_type 후보: reality_tuning, deep_dive_scholar, self_trust");
    expect(prompt).toContain("reading_type.code는 권장 후보 3개 중 하나만 골라라");
    expect(prompt).not.toContain("머릿속 탭 47개");
    expect(prompt).not.toContain("뇌내 회의 무한연장상");
  });
});

const input: StudentInput = {
  name: "박영민",
  studentId: "20260000",
  gender: "male",
  birthDate: "2000-03-15",
  favoriteCategory: "인문/철학",
  needFocus: "depth",
  consentAccepted: true,
};

const metrics: FaceMetrics = {
  asymmetryIndex: 0.012,
  phiRatioCompliance: 82,
  thirds: { upper: 0.16, middle: 0.34, lower: 0.5 },
  fifths: [0.2, 0.2, 0.2, 0.2, 0.2],
  faceAspectRatio: 0.72,
  eyeSpacing: 0.35,
  facialAngleDeg: 165,
  forehead: { areaPct: 16, brow: 1.0, classification: "average" },
  eyes: { leftToRightDeltaMm: 0.8, outerCantalAngleDeg: 2 },
  nose: { lengthMm: 50, widthMm: 32, columellaAngleDeg: 95 },
  mouth: { upperLowerLipRatio: 0.6, philtrumRatioPct: 12, cornerAngleDeg: 2 },
  jaw: { vlineIndex: 0.16, chinProtrusionMm: 6, cheekToJawRatio: 1.2 },
  faceBox: { x: 0.1, y: 0.1, width: 0.5, height: 0.7 },
};

const calibratedScores: CalibratedFaceScores = {
  symmetry: 90,
  balance: 91,
  trust: 91,
  likability: 92,
  attractiveness: 91,
  diagnostics: {
    normalizedAsymmetryPct: 2.4,
    eyeDeltaMm: 0.8,
    mouthCornerAngleDeg: 2,
    phiRatioCompliance: 82,
  },
};

const saju = calculateSaju("2000-03-15");
