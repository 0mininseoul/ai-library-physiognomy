import type { ReadingTypeCode } from "@/lib/reading-types/types";

export type Gender = "male" | "female";

export type StudentInput = {
  name: string;
  studentId: string;
  gender: Gender;
  birthDate: string;
  favoriteCategory: string;
  consentAccepted: boolean;
};

export type BookRecommendation = {
  bookId: string;
  title: string;
  author: string;
  callNumber: string;
  locationLabel: string;
  category?: string;
  tags?: string[];
  reason: string;
  actionCopy: string;
};

export type LibraryAnalysisResult = {
  readingType: {
    code: ReadingTypeCode;
    displayName: string;
    headline: string;
    description: string;
  };
  physiognomySummary: string;
  sajuSummary: string;
  readingNeeds: string[];
  recommendations: BookRecommendation[];
};
