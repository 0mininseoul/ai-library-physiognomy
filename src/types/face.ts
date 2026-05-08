export type Landmark = {
  x: number;
  y: number;
  z: number;
};

export type FaceBox = {
  x: number;
  y: number;
  width: number;
  height: number;
};

export type ForeheadClassification = "narrow" | "average" | "wide";

export type FaceMetrics = {
  asymmetryIndex: number;
  phiRatioCompliance: number;
  thirds: { upper: number; middle: number; lower: number };
  fifths: number[];
  faceAspectRatio: number;
  eyeSpacing: number;
  facialAngleDeg: number;
  forehead: { areaPct: number; brow: number; classification: ForeheadClassification };
  eyes: { leftToRightDeltaMm: number; outerCantalAngleDeg: number };
  nose: { lengthMm: number; widthMm: number; columellaAngleDeg: number };
  mouth: { upperLowerLipRatio: number; philtrumRatioPct: number; cornerAngleDeg: number };
  jaw: { vlineIndex: number; chinProtrusionMm: number; cheekToJawRatio: number };
  faceBox: FaceBox;
};
