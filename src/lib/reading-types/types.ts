export const READING_TYPES = {
  focus_reboot: {
    displayName: "집중력 리부트형",
    headlineTemplate: "{nameHonorific} 집중력 재부팅 타이밍",
    tags: ["집중", "습관", "몰입"],
  },
  thought_overload: {
    displayName: "생각 과부하 정리형",
    headlineTemplate: "{nameHonorific} 머릿속 탭 47개, 이제 정리할 시간",
    tags: ["사고 정리", "글쓰기", "철학 입문"],
  },
  career_compass: {
    displayName: "진로 나침반형",
    headlineTemplate: "{nameHonorific} 필요한 건 스펙보다 방향 감각",
    tags: ["진로", "커리어", "자기이해"],
  },
  action_button: {
    displayName: "실행 버튼 수리형",
    headlineTemplate: "{nameHonorific} 계획 말고 실행 버튼부터 고치자",
    tags: ["실행력", "생산성", "행동"],
  },
  emotion_reset: {
    displayName: "감정 리셋형",
    headlineTemplate: "{nameHonorific} 마음 배터리, 지금 충전 필요",
    tags: ["감정 회복", "에세이", "심리 교양"],
  },
  relationship_translator: {
    displayName: "인간관계 번역기형",
    headlineTemplate: "{nameHonorific} 필요한 건 사람 마음 자막",
    tags: ["관계", "대화", "사회심리"],
  },
  self_trust: {
    displayName: "자기확신 보강형",
    headlineTemplate: "{nameHonorific} 남 눈치 말고 내 기준부터 세우자",
    tags: ["자기확신", "삶의 기준", "에세이"],
  },
  ambition_strategy: {
    displayName: "야망 전략가형",
    headlineTemplate: "{nameHonorific} 야망은 있는데 지도 업데이트가 필요함",
    tags: ["전략", "경영", "커리어"],
  },
  rest_prescription: {
    displayName: "휴식 리셋형",
    headlineTemplate: "{nameHonorific} 쉬는 감각 업데이트 필요",
    tags: ["휴식", "번아웃 예방", "회복"],
  },
  curiosity_explorer: {
    displayName: "취향 발굴 탐험형",
    headlineTemplate: "{nameHonorific} 취향 레이더, 아직 숨은 보물 찾는 중",
    tags: ["교양", "입문서", "인문"],
  },
  reality_tuning: {
    displayName: "현실 감각 튜닝형",
    headlineTemplate: "{nameHonorific} 필요한 건 낭만과 현실의 밸런스",
    tags: ["경제", "사회", "실용"],
  },
  creativity_walk: {
    displayName: "창의력 산책형",
    headlineTemplate: "{nameHonorific} 아이디어 레이더 켜짐",
    tags: ["창의성", "예술", "문학"],
  },
  language_muscle: {
    displayName: "문해력 근육형",
    headlineTemplate: "{nameHonorific} 생각 근육, 오늘은 문장으로 키우자",
    tags: ["문해력", "고전", "글쓰기"],
  },
  worldview_expand: {
    displayName: "세계관 확장형",
    headlineTemplate: "{nameHonorific} 지금 필요한 건 뇌 속 지도 확장팩",
    tags: ["과학", "역사", "사회", "철학"],
  },
  confidence_softener: {
    displayName: "마음 말랑 회복형",
    headlineTemplate: "{nameHonorific} 표정엔 괜찮은 척이 살짝 보임",
    tags: ["위로", "문학", "자기돌봄"],
  },
  deep_dive_scholar: {
    displayName: "딥다이브 학자형",
    headlineTemplate: "{nameHonorific} 얕게 많이 말고 하나를 깊게 팔 타이밍",
    tags: ["전문 교양", "연구", "심화 독서"],
  },
} as const;

export type ReadingTypeCode = keyof typeof READING_TYPES;

export const READING_TYPE_CODES = Object.keys(READING_TYPES) as ReadingTypeCode[];

export function isReadingTypeCode(value: unknown): value is ReadingTypeCode {
  return typeof value === "string" && Object.prototype.hasOwnProperty.call(READING_TYPES, value);
}

export function getReadingType(code: ReadingTypeCode) {
  return READING_TYPES[code];
}
