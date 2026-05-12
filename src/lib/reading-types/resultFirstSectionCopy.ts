import type { ReadingTypeCode } from "@/lib/reading-types/types";

export type ResultFirstSectionCopy = {
  definition: string;
  displayName: string;
  headlineTemplate: string;
  description: string;
  chips: [string, string, string, string];
};

// /result 첫 섹션 TYPE 카드와 모바일 공유 카드 문구는 이 파일을 우선 사용합니다.
// 모델이 DB에 저장한 타입 문구가 있어도, 같은 reading_type.code면 여기 문구로 덮어씁니다.
// definition은 화면에 직접 노출하지 않고, 각 유형의 의미를 유지하기 위한 편집 기준입니다.
export const RESULT_FIRST_SECTION_COPY = {
  focus_reboot: {
    definition: "관심사가 많고 주의가 흩어지기 쉬우나, 하나의 루틴을 잡으면 빠르게 몰입하는 타입",
    displayName: "머릿속 과부하 직전",
    headlineTemplate: "{nameHonorific}, 머릿속 탭 정리하고 다시 달릴까요?",
    description: "수많은 알림과 아이디어로 머릿속이 정신없을 때가 많죠. 중요한 핵심 하나만 딱 잡으면, 집중력은 바로 풀악셀을 밟을 거예요.",
    chips: ["정신없음", "핵심집중", "몰입모드", "알림차단"],
  },
  thought_overload: {
    definition: "생각과 경우의 수가 많아 시작이 늦어질 수 있고, 기록과 구조화가 필요한 타입",
    displayName: "아이디어 폭주형",
    headlineTemplate: "{nameHonorific}, 머릿속 웹툰 기획안이 너무 많아요",
    description: "수많은 가능성과 아이디어로 머릿속이 꽉 차서 정작 시작은 늦어질 수 있어요. 생각을 밖으로 꺼내 구조화하면, 빛나는 아이디어가 현실이 될 준비를 마칠 거예요.",
    chips: ["생각정리", "기획천재", "선택고민", "아이디어"],
  },
  career_compass: {
    definition: "잘하고 싶은 마음은 크지만 방향과 우선순위를 다시 잡아야 하는 타입",
    displayName: "방향 탐색형",
    headlineTemplate: "{nameHonorific}, 인생 지도를 다시 펼쳐봐야 할 때예요",
    description: "열심히 하려는 열정은 이미 충분히 뜨거워요. 이제 어디로 향할지 방향을 정하면, 그 에너지가 목표를 향해 더 선명하게 집중될 거예요.",
    chips: ["방향설정", "진로고민", "로드맵", "우선순위"],
  },
  action_button: {
    definition: "계획과 준비는 충분하지만 완벽주의 때문에 첫 행동이 늦어지는 타입",
    displayName: "계획 만렙 실행 초보상",
    headlineTemplate: "{nameHonorific}, 프로젝트 시작 버튼 누를 타이밍이에요!",
    description: "머릿속으로 모든 시뮬레이션을 끝냈고, 계획은 이미 완벽해요. 완벽한 순간을 기다리기보다, 일단 시작 버튼을 누르면 일이 착착 풀릴 거예요.",
    chips: ["계획완료", "실행력", "완벽주의", "첫발"],
  },
  emotion_reset: {
    definition: "겉으로는 괜찮아 보여도 안쪽 에너지를 많이 쓰고 있어 감정 충전이 필요한 타입",
    displayName: "겉멀쩡 속시끄럼상",
    headlineTemplate: "{nameHonorific}, 마음속 비상등이 깜빡이는 중일 수도 있어요",
    description: "겉으로는 아무렇지 않아 보여도, 사실은 속으로 꽤 많은 에너지를 소모하고 있을 거예요. 지금은 더 버티는 것보다, 자신을 위한 재충전이 가장 필요한 때예요.",
    chips: ["감정충전", "번아웃", "에너지", "나돌봄"],
  },
  relationship_translator: {
    definition: "상대 말투와 분위기를 오래 해석하고 혼자 의미 부여하기 쉬운 타입",
    displayName: "단톡방 해설가형",
    headlineTemplate: "{nameHonorific}, 단톡 메시지 속 숨은 의미를 찾고 있군요?",
    description: "상대방의 작은 말투나 표정 변화도 놓치지 않고 깊이 파고드는 재능이 있어요. 하지만 혼자 너무 오래 해석하기 전에, 가볍게 물어보면 오해를 줄일 수 있을 거예요.",
    chips: ["관계분석", "과대해석", "속마음", "직접확인"],
  },
  self_trust: {
    definition: "남의 기준과 반응을 먼저 살피느라 자기 기준이 뒤로 밀릴 수 있는 타입",
    displayName: "내 기준 재정립상",
    headlineTemplate: "{nameHonorific}, 다른 사람 눈치보다 내 마음이 먼저예요",
    description: "주변 분위기를 읽고 잘 맞춰주는 능력은 뛰어나지만, 정작 자기 목소리는 뒤로 밀릴 때가 많아요. 남의 기준에 끌려가기보다, 이제는 자신만의 확고한 기준을 세울 때예요.",
    chips: ["자율선택", "내주도", "기준정립", "눈치제로"],
  },
  ambition_strategy: {
    definition: "목표와 욕심은 분명하지만 전략과 우선순위 재정렬이 필요한 타입",
    displayName: "로드맵 설계형",
    headlineTemplate: "{nameHonorific}, 큰 그림을 위한 전략 지도가 필요하겠군요?",
    description: "하고자 하는 목표와 욕심은 이미 명확하게 빛나고 있어요. 이제 흩어진 에너지들을 한곳으로 모을 전략과 우선순위가 필요한 시점이에요.",
    chips: ["목표설정", "전략수립", "우선순위", "미래설계"],
  },
  rest_prescription: {
    definition: "쉬고 있어도 머릿속은 계속 일해서, 제대로 쉬는 방식부터 다시 잡아야 하는 타입",
    displayName: "뇌 활동 무휴형",
    headlineTemplate: "{nameHonorific}, 쉬는 시간에도 할 일 알림이 울리는 느낌인가요?",
    description: "분명 몸은 쉬고 있지만, 머릿속은 쉴 틈 없이 과부하 상태일 수 있어요. 진정으로 휴식하는 방법을 찾으면, 다음 집중력은 훨씬 더 강력해질 거예요.",
    chips: ["진짜휴식", "뇌정지", "번아웃", "리프레시"],
  },
  curiosity_explorer: {
    definition: "새로운 분야를 만나면 빠르게 흥미가 켜지고, 취향 탐색에서 에너지를 얻는 타입",
    displayName: "취향 버라이어티형",
    headlineTemplate: "{nameHonorific}, 리모컨 버튼처럼 취향 스위치가 많아요!",
    description: "새로운 분야를 마주하면 눈이 반짝이며 빠르게 흥미를 느끼는 스타일이군요. 다양한 취향을 탐색하다 보면, 나만의 빛나는 관심사를 발견하게 될 거예요.",
    chips: ["새로운경험", "호기심", "취향저격", "탐험정신"],
  },
  reality_tuning: {
    definition: "낭만과 현실 사이에서 균형을 잡으려 하고, 실용적인 기준이 힘이 되는 타입",
    displayName: "이상과 현실 오가는 상",
    headlineTemplate: "{nameHonorific}, 낭만적인 미래와 현실 문제 사이에서 고민 중이군요?",
    description: "이상적인 꿈을 꾸면서도 현실적인 기준을 놓치지 않으려는 균형 감각을 가지고 있어요. 명확한 판단 기준을 세우면, 선택이 더욱 단단해질 거예요.",
    chips: ["현실감각", "이상추구", "실용성", "균형잡기"],
  },
  creativity_walk: {
    definition: "평범한 장면에서도 연결점과 아이디어를 잘 찾고, 표현 욕구가 살아있는 타입",
    displayName: "영감 탐정형",
    headlineTemplate: "{nameHonorific}, 길 가다 번뜩이는 아이디어 건지는 타입이네요!",
    description: "평범한 일상 속에서도 남들이 보지 못하는 연결점과 기발한 아이디어를 발견하는 재능이 있어요. 떠오른 영감을 바로 기록하면, 놀라운 결과물로 탄생할 수 있을 거예요.",
    chips: ["창의력", "아이디어", "발상전환", "표현욕구"],
  },
  language_muscle: {
    definition: "느낀 것과 생각이 많고, 문장으로 정리할 때 자기 생각이 선명해지는 타입",
    displayName: "문장 조립가 상",
    headlineTemplate: "{nameHonorific}, 머릿속 회로도가 문장으로 그려질 때 빛나요",
    description: "수많은 감정과 생각이 머릿속을 맴돌지만, 글로 써 내려갈 때 비로소 진가가 드러나는 타입이에요. 문장으로 정리하는 과정을 통해, 나만의 통찰력이 더욱 선명해질 거예요.",
    chips: ["논리정연", "글쓰기", "개념화", "생각정돈"],
  },
  worldview_expand: {
    definition: "익숙한 답보다 큰 관점과 새로운 지도를 만날 때 사고가 확장되는 타입",
    displayName: "세상 통찰 분석형",
    headlineTemplate: "{nameHonorific}, 상상 속 여행에서 세상의 모든 관점을 탐구하는군요?",
    description: "익숙한 답에 머무르기보다, 더 넓은 시야와 새로운 관점을 만날 때 사고가 확장되는 유형이에요. 큰 흐름 속에서 현재의 고민을 바라보면, 해결 실마리가 다른 각도로 보일 거예요.",
    chips: ["관점전환", "통찰력", "넓은시야", "세상탐구"],
  },
  confidence_softener: {
    definition: "괜찮은 척을 잘하지만 안쪽에서는 위로와 자기돌봄이 필요한 타입",
    displayName: "괜찮아병 중증",
    headlineTemplate: "{nameHonorific}, 힘든 상황에서도 태연한 척은 이제 그만!",
    description: "겉으로는 능숙하게 괜찮은 척하지만, 사실 속으로는 많은 감정을 억누르고 있을 수 있어요. 이제는 애써 단단해지기보다, 자신을 부드럽게 돌보고 위로하는 시간이 필요해요.",
    chips: ["자기위로", "감정해소", "돌봄필요", "마음치유"],
  },
  deep_dive_scholar: {
    definition: "여러 개를 얕게 보기보다 한 주제를 깊게 파고들 때 강해지는 타입",
    displayName: "심층 탐구 대장상",
    headlineTemplate: "{nameHonorific}, 얕은 지식보다 깊은 탐구 덕후의 길을 걷는군요!",
    description: "여러 개를 훑기보다는, 한 가지 주제에 깊이 몰입하고 파고들 때 진정한 힘을 발휘하는 타입이에요. 깊게 파고들수록 나만의 독창적인 통찰력과 전문성이 빛날 거예요.",
    chips: ["심층탐구", "전문성", "몰입도", "진지학구"],
  },
} satisfies Record<ReadingTypeCode, ResultFirstSectionCopy>;

export function getResultFirstSectionCopy(code: ReadingTypeCode) {
  return RESULT_FIRST_SECTION_COPY[code];
}
