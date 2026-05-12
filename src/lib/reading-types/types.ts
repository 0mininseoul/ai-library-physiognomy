export const READING_TYPES = {
  focus_reboot: {
    displayName: "집중력 재부팅 대기자",
    headlineTemplate: "{nameHonorific} 뇌 알림 87개 떠 있는 거 보이거든요",
    tags: ["집중", "습관", "몰입"],
  },
  thought_overload: {
    displayName: "머릿속 탭 매니저 부재",
    headlineTemplate: "{nameHonorific} 머릿속에 탭 47개, 닫을 시간이에요",
    tags: ["사고 정리", "글쓰기", "철학 입문"],
  },
  career_compass: {
    displayName: "진로 GPS 재설정 중",
    headlineTemplate: "{nameHonorific} 스펙 말고 방향이 빠진 상태",
    tags: ["진로", "커리어", "자기이해"],
  },
  action_button: {
    displayName: "실행 버튼 고장형",
    headlineTemplate: "{nameHonorific} 계획은 9단계인데 시작은 0단계",
    tags: ["실행력", "생산성", "행동"],
  },
  emotion_reset: {
    displayName: "마음 배터리 7%",
    headlineTemplate: "{nameHonorific} 충전기 어디 뒀는지 까먹은 사람",
    tags: ["감정 회복", "에세이", "심리 교양"],
  },
  relationship_translator: {
    displayName: "사람 마음 자막 부재",
    headlineTemplate: "{nameHonorific} 대화에 자막이 필요한 순간이 잦은 편",
    tags: ["관계", "대화", "사회심리"],
  },
  self_trust: {
    displayName: "내 기준 미설정",
    headlineTemplate: "{nameHonorific} 남 기준 먼저 보고 내 기준은 나중에 보는 사람",
    tags: ["자기확신", "삶의 기준", "에세이"],
  },
  ambition_strategy: {
    displayName: "야망 지도 업데이트 필요",
    headlineTemplate: "{nameHonorific} 야망은 켜 있는데 지도는 작년 버전",
    tags: ["전략", "경영", "커리어"],
  },
  rest_prescription: {
    displayName: "쉬는 법 분실",
    headlineTemplate: "{nameHonorific} 쉴 줄 모르는 게 새로운 일이 된 사람",
    tags: ["휴식", "번아웃 예방", "회복"],
  },
  curiosity_explorer: {
    displayName: "취향 레이더 워밍업 중",
    headlineTemplate: "{nameHonorific} 취향 레이더, 아직 숨은 보물 찾는 중",
    tags: ["교양", "입문서", "인문"],
  },
  reality_tuning: {
    displayName: "낭만↔현실 튜닝",
    headlineTemplate: "{nameHonorific} 낭만과 현실 사이에서 핸들 잡는 사람",
    tags: ["경제", "사회", "실용"],
  },
  creativity_walk: {
    displayName: "아이디어 산책가",
    headlineTemplate: "{nameHonorific} 아이디어 레이더 늘 켜 있는 사람",
    tags: ["창의성", "예술", "문학"],
  },
  language_muscle: {
    displayName: "문해력 근력 운동 중",
    headlineTemplate: "{nameHonorific} 생각 근육은 문장으로 키우는 사람",
    tags: ["문해력", "고전", "글쓰기"],
  },
  worldview_expand: {
    displayName: "뇌 지도 확장팩 필요",
    headlineTemplate: "{nameHonorific} 머릿속 지도에 빈 칸이 보이는 사람",
    tags: ["과학", "역사", "사회", "철학"],
  },
  confidence_softener: {
    displayName: "괜찮은 척 7회차",
    headlineTemplate: "{nameHonorific} 표정에 괜찮은 척이 살짝 보이거든요",
    tags: ["위로", "문학", "자기돌봄"],
  },
  deep_dive_scholar: {
    displayName: "얕고 넓게 말고 깊고 좁게",
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
