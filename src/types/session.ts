import type { ReadingTypeCode } from "@/lib/reading-types/types";
import type { CalibratedFaceScores } from "@/lib/facemesh/scoreCalibration";
import type { SajuCalculation } from "@/lib/saju/calculator";

export type Gender = "male" | "female";

export type NeedFocus = "stimulation" | "comfort" | "utility" | "depth";

export type StudentInput = {
  name: string;
  studentId: string;
  gender: Gender;
  birthDate: string;
  favoriteCategory: string;
  needFocus: NeedFocus;
  consentAccepted: boolean;
};

export type BookRecommendation = {
  bookId: string;
  title: string;
  author: string;
  callNumber: string;
  locationLabel: string;
  isbn13?: string | null;
  coverUrl?: string | null;
  libraryDetailUrl?: string | null;
  naverBookUrl?: string;
  category?: string;
  tags?: string[];
  reason: string;
  actionCopy: string;
  fitReason?: string;
  readingMoment?: string;
};

export type DetailComment = {
  metricsText: string;
  comment: string;
};

export type LibraryAnalysisResult = {
  readingType: {
    code: ReadingTypeCode;
    displayName: string;
    headline: string;
    description: string;
  };
  mainCopy: string;
  geometry: {
    symmetry: string;
    goldenRatio: string;
    thirds: string;
    fifths: string;
    faceShape: string;
  };
  parts: {
    forehead: DetailComment;
    eyes: DetailComment;
    nose: DetailComment;
    mouth: DetailComment;
    jaw: DetailComment;
    impression: DetailComment;
  };
  scores: {
    likability: number;
    trust: number;
    symmetry: number;
    balance: number;
    attractiveness: number;
    comments: string[];
  };
  physiognomy: {
    keywords: string[];
    summary: string;
    strengths: string[];
    cautions: string[];
  };
  saju: {
    keywords: string[];
    elementBalance: string;
    currentFlow: string;
    strength: string;
    advice: string;
    calculation?: SajuCalculation;
  };
  romanticMatch: {
    bestTypes: string[];
    why: string;
    dateStyle: string;
    caution: string;
  };
  physiognomySummary: string;
  sajuSummary: string;
  readingNeeds: string[];
  recommendations: BookRecommendation[];
  calibratedScores?: CalibratedFaceScores;
  persona?: {
    candidates: { primary: string; alternates: string[] };
    confirmed: string;
    sajuKey: string;
    axisScores: { balance: number; expressive: number; focus: number; vitality: number };
    readingTypeCandidates?: ReadingTypeCode[];
    readingTypeModelCode?: ReadingTypeCode;
    readingTypeCorrected?: boolean;
    readingTypeReason?: "model_candidate" | "unsupported_by_persona" | "invalid_model_code";
  };
  sectionCopy?: {
    faceReveal: string[];
    faceSignal: string[];
    innerStyle: string[];
    chemiMatch: string[];
    bookCuration: string[];
  };
  innerStyleInsight?: {
    dominantLabel: string;
    dominantEmoji: string;
    dominantHeadline: string;
    dominantDetail: string;
    growthLabel: string;
    growthEmoji: string;
    growthHeadline: string;
    growthDetail: string;
    growthAction: string;
  };
  chemiInsight?: {
    typeLabel: string;
    headline: string;
    why: string;
    friction: string;
    goodScene: string;
  };
};
