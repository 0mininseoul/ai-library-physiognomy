import type { ReadingTypeCode } from "@/lib/reading-types/types";

export type ResultFirstSectionCopy = {
  definition: string;
  displayName: string;
  headlineTemplate: string;
  description: string;
  chips: [string, string, string, string];
};

// /result 첫 섹션 TYPE 카드와 모바일 공유 카드 문구는 이 파일을 우선 사용합니다.
// Gemini가 DB에 저장한 타입 문구가 있어도, 같은 reading_type.code면 여기 문구로 덮어씁니다.
// definition은 화면에 직접 노출하지 않고, 각 유형의 의미를 유지하기 위한 편집 기준입니다.
export const RESULT_FIRST_SECTION_COPY = {
  focus_reboot: {
    definition: "관심사가 많고 주의가 흩어지기 쉬우나, 하나의 루틴을 잡으면 빠르게 몰입하는 타입",
    displayName: "집중 리셋형",
    headlineTemplate: "{nameHonorific}, 집중 버튼 다시 켤 타이밍이에요",
    description: "알림은 많은데 메인 화면이 살짝 흐트러진 상태일 수 있어요. 하나만 먼저 잡으면 생각보다 빨리 몰입 모드로 들어가요.",
    chips: ["집중", "정리", "루틴", "몰입"],
  },
  thought_overload: {
    definition: "생각과 경우의 수가 많아 시작이 늦어질 수 있고, 기록과 구조화가 필요한 타입",
    displayName: "생각 과부하형",
    headlineTemplate: "{nameHonorific}, 머릿속 탭이 너무 많이 열렸어요",
    description: "가능성을 많이 보는 만큼 결정 직전에 머리가 복잡해질 수 있어요. 생각을 밖으로 꺼내면 답이 훨씬 빨리 정리돼요.",
    chips: ["생각", "정리", "기록", "판단"],
  },
  career_compass: {
    definition: "잘하고 싶은 마음은 크지만 방향과 우선순위를 다시 잡아야 하는 타입",
    displayName: "방향 탐색형",
    headlineTemplate: "{nameHonorific}, 지금 필요한 건 스펙보다 방향이에요",
    description: "열심히 하고 싶은 마음은 이미 충분해 보여요. 어디에 힘을 실을지 정하면 지금 가진 에너지가 더 선명하게 모여요.",
    chips: ["방향", "진로", "기준", "선택"],
  },
  action_button: {
    definition: "계획과 준비는 충분하지만 완벽주의 때문에 첫 행동이 늦어지는 타입",
    displayName: "실행 버튼형",
    headlineTemplate: "{nameHonorific}, 계획보다 첫 클릭이 먼저예요",
    description: "머릿속 준비물은 거의 다 챙겨둔 타입이에요. 완벽한 타이밍을 기다리기보다 작게 눌러보는 순간 흐름이 붙어요.",
    chips: ["실행", "시작", "추진", "습관"],
  },
  emotion_reset: {
    definition: "겉으로는 괜찮아 보여도 안쪽 에너지를 많이 쓰고 있어 감정 충전이 필요한 타입",
    displayName: "마음 충전형",
    headlineTemplate: "{nameHonorific}, 마음 배터리부터 충전해야 해요",
    description: "겉으로는 멀쩡해 보여도 안쪽 에너지를 꽤 쓰고 있을 수 있어요. 지금은 더 버티기보다 마음을 먼저 채우는 쪽이 맞아요.",
    chips: ["회복", "감정", "충전", "위로"],
  },
  relationship_translator: {
    definition: "상대 말투와 분위기를 오래 해석하고 혼자 의미 부여하기 쉬운 타입",
    displayName: "관계 해석형",
    headlineTemplate: "{nameHonorific}, 말투 하나도 그냥 넘기기 어렵죠",
    description: "상대의 표정과 분위기를 빨리 읽는 편이에요. 다만 혼자 해석이 길어지기 전에 가볍게 확인하면 훨씬 편해져요.",
    chips: ["관계", "대화", "공감", "확인"],
  },
  self_trust: {
    definition: "남의 기준과 반응을 먼저 살피느라 자기 기준이 뒤로 밀릴 수 있는 타입",
    displayName: "내 기준 회복형",
    headlineTemplate: "{nameHonorific}, 남의 기준보다 내 기준이 먼저예요",
    description: "상황을 잘 맞추는 만큼 내 마음을 뒤로 미룰 때가 있어 보여요. 지금은 눈치보다 기준을 먼저 세우면 편해져요.",
    chips: ["기준", "확신", "선택", "회복"],
  },
  ambition_strategy: {
    definition: "목표와 욕심은 분명하지만 전략과 우선순위 재정렬이 필요한 타입",
    displayName: "전략 보강형",
    headlineTemplate: "{nameHonorific}, 야망은 켜졌고 지도만 업데이트하면 돼요",
    description: "하고 싶은 것과 욕심은 분명한 편이에요. 지금은 더 많이 벌리기보다 우선순위를 다시 세울수록 힘이 살아나요.",
    chips: ["목표", "전략", "우선순위", "커리어"],
  },
  rest_prescription: {
    definition: "쉬고 있어도 머릿속은 계속 일해서, 제대로 쉬는 방식부터 다시 잡아야 하는 타입",
    displayName: "휴식 재설정형",
    headlineTemplate: "{nameHonorific}, 쉬는 중에도 머릿속은 야근 중이에요",
    description: "몸은 멈춰 있어도 머릿속은 계속 돌아가는 타입일 수 있어요. 제대로 쉬는 방식을 찾으면 다음 집중도 훨씬 오래 가요.",
    chips: ["휴식", "회복", "번아웃", "리듬"],
  },
  curiosity_explorer: {
    definition: "새로운 분야를 만나면 빠르게 흥미가 켜지고, 취향 탐색에서 에너지를 얻는 타입",
    displayName: "취향 탐색형",
    headlineTemplate: "{nameHonorific}, 아직 안 켜본 취향 스위치가 많아요",
    description: "새로운 걸 만나면 생각보다 빨리 눈이 반짝이는 편이에요. 넓게 둘러보다 하나를 고르면 재미가 확 깊어져요.",
    chips: ["취향", "탐색", "호기심", "입문"],
  },
  reality_tuning: {
    definition: "낭만과 현실 사이에서 균형을 잡으려 하고, 실용적인 기준이 힘이 되는 타입",
    displayName: "현실 튜닝형",
    headlineTemplate: "{nameHonorific}, 낭만과 현실 사이 핸들을 잡고 있어요",
    description: "마음은 멀리 가고 싶지만 현실 감각도 놓치지 않는 타입이에요. 기준을 조금만 세우면 선택이 훨씬 가벼워져요.",
    chips: ["현실", "균형", "실용", "판단"],
  },
  creativity_walk: {
    definition: "평범한 장면에서도 연결점과 아이디어를 잘 찾고, 표현 욕구가 살아있는 타입",
    displayName: "아이디어 점화형",
    headlineTemplate: "{nameHonorific}, 평범한 장면에서도 아이디어가 켜져요",
    description: "남들이 지나치는 장면에서도 연결점을 찾는 편이에요. 떠오른 생각을 바로 붙잡으면 꽤 쓸 만한 결과로 이어져요.",
    chips: ["아이디어", "표현", "창의", "연결"],
  },
  language_muscle: {
    definition: "느낀 것과 생각이 많고, 문장으로 정리할 때 자기 생각이 선명해지는 타입",
    displayName: "문장 정리형",
    headlineTemplate: "{nameHonorific}, 생각은 문장으로 꺼낼 때 강해져요",
    description: "느낀 건 많은데 말로 꺼내야 비로소 선명해지는 타입이에요. 문장으로 정리할수록 내 생각의 윤곽이 살아나요.",
    chips: ["문장", "표현", "정리", "선명"],
  },
  worldview_expand: {
    definition: "익숙한 답보다 큰 관점과 새로운 지도를 만날 때 사고가 확장되는 타입",
    displayName: "세계관 확장형",
    headlineTemplate: "{nameHonorific}, 머릿속 지도를 넓힐 타이밍이에요",
    description: "익숙한 답보다 큰 관점을 만날 때 눈이 트이는 타입이에요. 넓은 흐름을 보면 지금 고민도 다른 각도로 보여요.",
    chips: ["관점", "확장", "사회", "탐구"],
  },
  confidence_softener: {
    definition: "괜찮은 척을 잘하지만 안쪽에서는 위로와 자기돌봄이 필요한 타입",
    displayName: "괜찮은 척 해제형",
    headlineTemplate: "{nameHonorific}, 괜찮은 척 잠깐 내려놔도 돼요",
    description: "담담해 보이지만 안쪽에서는 꽤 많은 걸 삼키고 있을 수 있어요. 지금은 더 단단해지기보다 부드럽게 풀어도 좋아요.",
    chips: ["위로", "돌봄", "회복", "감정"],
  },
  deep_dive_scholar: {
    definition: "여러 개를 얕게 보기보다 한 주제를 깊게 파고들 때 강해지는 타입",
    displayName: "딥다이브형",
    headlineTemplate: "{nameHonorific}, 하나를 깊게 팔 때 진짜 강해져요",
    description: "많이 훑는 것보다 한 가지를 오래 붙잡을 때 힘이 나는 타입이에요. 깊게 들어갈수록 자기만의 답이 선명해져요.",
    chips: ["심화", "몰입", "탐구", "전문성"],
  },
} satisfies Record<ReadingTypeCode, ResultFirstSectionCopy>;

export function getResultFirstSectionCopy(code: ReadingTypeCode) {
  return RESULT_FIRST_SECTION_COPY[code];
}
