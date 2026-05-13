import type { ReadingTypeCode } from "@/lib/reading-types/types";

export type ResultFirstSectionCopy = {
  // Editor-only meaning guardrail. Keep this as:
  // "관찰 성향: ... 필요한 방향: ..."
  definition: string;
  // User-visible type name. It should read as a current signal plus a useful direction,
  // not a fixed identity label.
  displayName: string;
  headlineTemplate: string;
  // Exactly two sentences: current observed signal first, needed direction second.
  description: string;
  chips: [string, string, string, string];
};

// /result 첫 섹션 TYPE 카드와 모바일 공유 카드 문구는 이 파일을 우선 사용합니다.
// 모델이 DB에 저장한 타입 문구가 있어도, 같은 reading_type.code면 여기 문구로 덮어씁니다.
// definition은 화면에 직접 노출하지 않고, 각 유형의 의미를 유지하기 위한 편집 기준입니다.
export const RESULT_FIRST_SECTION_COPY = {
  focus_reboot: {
    definition: "관찰 성향: 관심사가 많고 주의가 여러 방향으로 분산되기 쉬운 신호가 보임. 필요한 방향: 핵심 하나와 반복 루틴으로 몰입 진입 속도를 높이기.",
    displayName: "집중력 리셋형",
    headlineTemplate: "{nameHonorific}, 머릿속 탭 이제 정리할 시간!",
    description: "관심사가 많고 반응 속도가 빨라서 에너지가 여러 방향으로 퍼지기 쉬워요. 지금은 핵심 하나만 남기고 루틴을 고정하면 몰입 스위치가 훨씬 빨리 켜질 거예요.",
    chips: ["분산주의", "핵심집중", "루틴고정", "몰입전환"],
  },
  thought_overload: {
    definition: "관찰 성향: 생각과 경우의 수가 많아 시작 전에 머릿속이 복잡해지기 쉬움. 필요한 방향: 생각을 밖으로 꺼내 구조화하고 선택지를 줄이기.",
    displayName: "아이디어 폭주 정리형",
    headlineTemplate: "{nameHonorific}, 머릿속 회의가 너무 오래 열렸어요",
    description: "가능성을 많이 보는 만큼 머릿속 회의가 길어져서 시작 버튼이 늦게 눌릴 수 있어요. 지금은 생각을 밖으로 꺼내 줄 세우면 쓸 만한 아이디어가 바로 앞으로 나올 거예요.",
    chips: ["생각과다", "구조정리", "선택줄이기", "현실화"],
  },
  career_compass: {
    definition: "관찰 성향: 잘하고 싶은 마음과 에너지는 크지만 방향이 흐려지면 힘이 분산되기 쉬움. 필요한 방향: 방향과 우선순위를 다시 잡아 에너지를 한쪽으로 모으기.",
    displayName: "방향 재탐색형",
    headlineTemplate: "{nameHonorific}, 열정은 켜졌고 방향만 잡으면 돼요",
    description: "잘하고 싶은 마음은 이미 충분해서 가만히 있기보다 뭔가 해내고 싶은 신호가 강해요. 지금은 어디에 힘을 실을지 먼저 정하면 에너지가 훨씬 선명하게 모일 거예요.",
    chips: ["열정대기", "방향설정", "우선정리", "힘모으기"],
  },
  action_button: {
    definition: "관찰 성향: 계획과 준비는 충분하지만 완벽한 타이밍을 기다리느라 첫 행동이 늦어지기 쉬움. 필요한 방향: 작은 실행부터 눌러 흐름을 만들기.",
    displayName: "계획만렙 실행대기형",
    headlineTemplate: "{nameHonorific}, 완벽한 타이밍 기다리다 해 뜨겠어요",
    description: "머릿속 시뮬레이션은 이미 여러 번 끝났고 준비물도 거의 다 챙긴 상태예요. 지금은 완벽한 순간을 더 찾기보다 작게 시작하면 흐름이 알아서 붙을 거예요.",
    chips: ["계획완료", "시작대기", "완벽주의", "일단시작"],
  },
  emotion_reset: {
    definition: "관찰 성향: 겉으로는 차분해 보여도 안쪽 에너지를 많이 소모하고 있을 가능성이 큼. 필요한 방향: 더 버티기보다 감정 충전과 자기 돌봄을 먼저 확보하기.",
    displayName: "겉멀쩡 충전필요형",
    headlineTemplate: "{nameHonorific}, 겉은 평온한데 속 배터리는 빨간불일지도요",
    description: "겉으로는 아무렇지 않아 보여도 안쪽에서는 에너지를 꽤 많이 쓰고 있는 신호가 보여요. 지금은 더 버티는 쪽보다 자신을 먼저 충전하는 쪽이 훨씬 효율적이에요.",
    chips: ["겉평온", "속방전", "감정충전", "나돌봄"],
  },
  relationship_translator: {
    definition: "관찰 성향: 사람들의 말투와 분위기 변화를 민감하게 읽고 혼자 오래 해석하기 쉬움. 필요한 방향: 추측을 길게 굴리기보다 직접 확인해 오해를 줄이기.",
    displayName: "단서 과해석 정리형",
    headlineTemplate: "{nameHonorific}, 말투 하나로 추리물 한 편 쓰는 중?",
    description: "작은 말투나 표정 변화도 놓치지 않는 섬세한 감지력이 강하게 보여요. 지금은 혼자 해석을 길게 굴리기보다 가볍게 확인하면 마음이 훨씬 빨리 정리될 거예요.",
    chips: ["눈치센서", "과해석", "직접확인", "오해정리"],
  },
  self_trust: {
    definition: "관찰 성향: 주변 기준과 반응을 빠르게 살피느라 자기 기준이 뒤로 밀리기 쉬움. 필요한 방향: 선택 전에 자신의 기준을 먼저 세우고 확인하기.",
    displayName: "내 기준 회수형",
    headlineTemplate: "{nameHonorific}, 남의 눈치 보다가 내 기준 잃어버리면 안 돼요",
    description: "분위기를 읽고 맞춰주는 능력은 좋은데, 그만큼 자기 목소리가 뒤로 밀릴 수 있어요. 지금은 주변 반응보다 내 기준을 먼저 세워야 선택이 덜 흔들릴 거예요.",
    chips: ["눈치센스", "내기준", "자기확신", "선택주도"],
  },
  ambition_strategy: {
    definition: "관찰 성향: 목표와 욕심은 선명하지만 실행 순서와 우선순위가 흐려지면 에너지가 흩어지기 쉬움. 필요한 방향: 큰 목표를 실행 순서로 쪼개고 전략을 보강하기.",
    displayName: "야망 지도 보강형",
    headlineTemplate: "{nameHonorific}, 목표는 보이는데 길 안내가 아직 흐릿해요",
    description: "하고 싶은 것과 욕심은 꽤 선명해서 큰 그림을 향한 추진 신호가 보여요. 지금은 그 에너지를 실행 순서와 우선순위로 쪼개면 야망이 훨씬 현실적으로 움직일 거예요.",
    chips: ["목표선명", "전략보강", "우선순위", "실행지도"],
  },
  rest_prescription: {
    definition: "관찰 성향: 몸은 쉬어도 머릿속은 계속 돌아가 제대로 회복되지 못하기 쉬움. 필요한 방향: 자극을 줄이고 진짜 쉬는 방식을 다시 설계하기.",
    displayName: "뇌 휴식 재설정형",
    headlineTemplate: "{nameHonorific}, 몸은 쉬는데 머릿속은 아직 야근 중이에요",
    description: "겉으로는 쉬는 중이어도 머릿속 알림이 계속 울리는 듯한 신호가 보여요. 지금은 더 버티는 휴식 말고 진짜로 꺼지는 시간을 만들어야 다음 에너지가 살아날 거예요.",
    chips: ["뇌과열", "진짜휴식", "자극차단", "재충전"],
  },
  curiosity_explorer: {
    definition: "관찰 성향: 새로운 분야를 만나면 흥미가 빨리 켜지고 취향 탐색에서 에너지를 얻음. 필요한 방향: 넓게 둘러본 뒤 하나를 골라 깊게 붙잡기.",
    displayName: "취향 탐험 정착형",
    headlineTemplate: "{nameHonorific}, 새 취향 스위치가 너무 잘 켜져요",
    description: "새로운 걸 만나면 눈이 빨리 반짝이고 흥미 스위치가 쉽게 켜지는 신호가 보여요. 지금은 많이 둘러본 뒤 하나를 골라 깊게 붙잡으면 가능성이 더 또렷해질 거예요.",
    chips: ["호기심", "취향탐색", "새자극", "하나선택"],
  },
  reality_tuning: {
    definition: "관찰 성향: 이상을 크게 그리면서도 현실적인 조건을 함께 계산하려는 신호가 보임. 필요한 방향: 실용적인 판단 기준을 세워 선택의 흔들림을 줄이기.",
    displayName: "낭만현실 튜닝형",
    headlineTemplate: "{nameHonorific}, 꿈도 큰데 계산기도 같이 켜져 있네요",
    description: "마음은 멀리 가고 싶은데 현실 감각도 놓치지 않으려는 균형 신호가 보여요. 지금은 명확한 판단 기준을 세우면 선택 앞에서 덜 흔들리고 더 단단해질 거예요.",
    chips: ["이상추구", "현실감각", "기준세움", "균형잡기"],
  },
  creativity_walk: {
    definition: "관찰 성향: 평범한 장면에서도 연결점과 아이디어를 잘 발견하고 표현 욕구가 살아 있음. 필요한 방향: 떠오른 영감을 바로 붙잡아 결과물로 옮기기.",
    displayName: "영감 수집 실행형",
    headlineTemplate: "{nameHonorific}, 일상에서 아이디어 줍는 속도가 빠르네요",
    description: "남들이 그냥 지나치는 장면에서도 연결점과 아이디어를 잘 건져내는 신호가 보여요. 지금은 떠오른 영감을 바로 붙잡아 작은 결과물로 옮기면 감각이 더 선명해질 거예요.",
    chips: ["영감수집", "연결감각", "바로기록", "표현전환"],
  },
  language_muscle: {
    definition: "관찰 성향: 느낀 것과 생각이 많아 머릿속에 말이 쌓이기 쉬움. 필요한 방향: 문장으로 꺼내며 생각의 윤곽을 선명하게 만들기.",
    displayName: "문장 정리 강화형",
    headlineTemplate: "{nameHonorific}, 머릿속 말풍선이 꽤 많이 떠 있어요",
    description: "느낀 것과 생각이 많아서 머릿속에 말풍선이 여러 개 떠 있는 신호가 보여요. 지금은 문장으로 꺼내 정리하면 흐릿하던 생각의 윤곽이 훨씬 선명해질 거예요.",
    chips: ["말풍선", "문장정리", "생각윤곽", "표현강화"],
  },
  worldview_expand: {
    definition: "관찰 성향: 익숙한 답보다 큰 관점과 새로운 시야를 만날 때 사고가 확장되는 신호가 보임. 필요한 방향: 현재 고민을 더 넓은 흐름 속에서 다시 바라보기.",
    displayName: "관점 확장 스위치형",
    headlineTemplate: "{nameHonorific}, 지금 답답한 건 시야가 좁아서일지도요",
    description: "익숙한 답 안에 오래 있으면 금방 답답해지고 더 큰 관점을 찾는 신호가 보여요. 지금은 고민을 넓은 흐름 속에 다시 올려놓으면 해결 실마리가 다른 각도에서 보일 거예요.",
    chips: ["시야확장", "관점전환", "큰흐름", "다시보기"],
  },
  confidence_softener: {
    definition: "관찰 성향: 괜찮은 척을 잘하지만 안쪽에서는 위로와 자기 돌봄이 필요할 가능성이 큼. 필요한 방향: 애써 단단한 척하기보다 자신을 부드럽게 돌보기.",
    displayName: "괜찮아 해제형",
    headlineTemplate: "{nameHonorific}, 괜찮다는 말 잠깐 내려놔도 돼요",
    description: "겉으로는 괜찮은 척을 꽤 잘하지만 안쪽에는 삼켜둔 감정이 남아 있는 신호가 보여요. 지금은 더 단단한 척하기보다 자신을 부드럽게 돌보는 시간이 필요해요.",
    chips: ["괜찮아끝", "속마음", "자기돌봄", "부드럽게"],
  },
  deep_dive_scholar: {
    definition: "관찰 성향: 여러 주제를 얕게 훑기보다 한 주제에 깊게 들어갈 때 강점이 살아남. 필요한 방향: 하나의 주제를 정해 오래 몰입하며 자기만의 깊이를 만들기.",
    displayName: "한 우물 점화형",
    headlineTemplate: "{nameHonorific}, 얕게 많이보다 하나를 깊게 팔 때예요",
    description: "여러 가지를 가볍게 훑을 때보다 한 가지에 깊이 들어갈 때 힘이 살아나는 신호가 보여요. 지금은 하나를 정해 오래 붙잡으면 자기만의 깊이와 전문성이 더 또렷해질 거예요.",
    chips: ["깊이몰입", "한우물", "전문성", "오래파기"],
  },
} satisfies Record<ReadingTypeCode, ResultFirstSectionCopy>;

export function getResultFirstSectionCopy(code: ReadingTypeCode) {
  return RESULT_FIRST_SECTION_COPY[code];
}
