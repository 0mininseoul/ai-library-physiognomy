import { RESULT_FIRST_SECTION_COPY } from "@/lib/reading-types/resultFirstSectionCopy";

export const READING_TYPE_TAGS = {
  focus_reboot: {
    tags: ["집중", "습관", "몰입"],
  },
  thought_overload: {
    tags: ["사고 정리", "글쓰기", "철학 입문"],
  },
  career_compass: {
    tags: ["진로", "커리어", "자기이해"],
  },
  action_button: {
    tags: ["실행력", "생산성", "행동"],
  },
  emotion_reset: {
    tags: ["감정 회복", "에세이", "심리 교양"],
  },
  relationship_translator: {
    tags: ["관계", "대화", "사회심리"],
  },
  self_trust: {
    tags: ["자기확신", "삶의 기준", "에세이"],
  },
  ambition_strategy: {
    tags: ["전략", "경영", "커리어"],
  },
  rest_prescription: {
    tags: ["휴식", "번아웃 예방", "회복"],
  },
  curiosity_explorer: {
    tags: ["교양", "입문서", "인문"],
  },
  reality_tuning: {
    tags: ["경제", "사회", "실용"],
  },
  creativity_walk: {
    tags: ["창의성", "예술", "문학"],
  },
  language_muscle: {
    tags: ["문해력", "고전", "글쓰기"],
  },
  worldview_expand: {
    tags: ["과학", "역사", "사회", "철학"],
  },
  confidence_softener: {
    tags: ["위로", "문학", "자기돌봄"],
  },
  deep_dive_scholar: {
    tags: ["전문 교양", "연구", "심화 독서"],
  },
} as const;

export type ReadingTypeCode = keyof typeof READING_TYPE_TAGS;

export const READING_TYPE_CODES = Object.keys(READING_TYPE_TAGS) as ReadingTypeCode[];

export const READING_TYPES = Object.fromEntries(
  READING_TYPE_CODES.map((code) => [
    code,
    {
      ...RESULT_FIRST_SECTION_COPY[code],
      tags: READING_TYPE_TAGS[code].tags,
    },
  ]),
) as {
  [Code in ReadingTypeCode]: (typeof RESULT_FIRST_SECTION_COPY)[Code] & { tags: (typeof READING_TYPE_TAGS)[Code]["tags"] };
};

export function isReadingTypeCode(value: unknown): value is ReadingTypeCode {
  return typeof value === "string" && Object.prototype.hasOwnProperty.call(READING_TYPE_TAGS, value);
}

export function getReadingType(code: ReadingTypeCode) {
  return READING_TYPES[code];
}
