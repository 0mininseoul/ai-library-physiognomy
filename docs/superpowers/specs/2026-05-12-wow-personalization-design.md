# 와우 개인화 설계 — 5/13 가천대 부스 대응

작성일: 2026-05-12
작성자: 박영민 (어센텀)
관련 운영: 2026-05-13 가천대학교 중앙도서관 앞 학교 축제 부스 (12:00–19:00, 목표 참여 200명)

## 배경

5/13 가천대 부스에서 200명을 대상으로 운영한다. 현재 결과 화면은 5섹션 가로 슬라이드 + Gemini가 자유 해석한 관상/사주 카피 + 카테고리 1개 기준 책 추천이다. 동일 부스에서 200명이 짧은 시간(평균 2분)에 결과를 받으므로, 결과가 서로 비슷해 보이면 와우가 빠르게 깎인다. 이번 작업의 목표는 **결과 분기를 결정론적으로 더 갈라놓고**, **카피 톤을 친구 모드 존댓말로 한 단계 올리며**, **부스 PC에서 본 결과를 학생 폰으로 옮겨 실제 책 대출까지 잇는 동선**을 만드는 것이다.

작업 시간 박스: 5/12 밤 5~6시간. 모든 변경은 backward-compatible로 두고 환경변수 토글로 롤백 가능해야 한다.

## 목표

1. 같은 카테고리를 고른 학생끼리도 결과(타입 라벨, 책 1순위, 카피 톤)가 자연스럽게 갈라진다.
2. 학생이 결과를 보고 "이거 완전 내 얘기네"라고 느낄 만큼 카피가 구체적이고 친근하다.
3. 부스 PC에서 5섹션을 본 학생이 마지막 섹션의 QR을 폰으로 스캔해, 모바일에서 동일 결과를 다시 보고 추천 책의 서가 위치까지 확인한다.
4. 위 변경이 부스 운영 중 문제를 일으키면 환경변수 한 줄 토글로 현행 동작으로 복구된다.

## 비목표

- 입력 폼에 새 질문 추가(시간 부족, 검증 부담).
- Gemini Vision으로 얼굴 이미지 직접 분석(외모 비하 리스크, 응답 지연 우려).
- 신규 결과 섹션 추가(현행 5섹션 구조 유지).
- 인증/로그인, 알림, 푸시 등 부스 운영에 직접 필요 없는 기능.

## 시스템 개요

```
사용자 입력(이름/학번/성별/생년월일/카테고리) + 얼굴 메트릭
        │
        ├── calculateSaju(birthDate)            ──┐
        ├── calibrateFaceScores(metrics)        ──┤
        ├── resolvePersona(metrics, saju)  [신규] ──┤
        └── selectBookCandidates(books, persona)──┤
                                                  ▼
                              buildLibraryPrompt({...all signals})
                                                  │
                                                  ▼
                              Gemini gemini-2.5-flash
                                                  │
                                                  ▼
                              normalizeLibraryAnalysis()
                                                  │
                                                  ▼
                          저장 → /result/[id] (PC 5섹션) 또는 /result/[id]?m=1 (모바일 세로)
```

`resolvePersona`가 신호 추출의 단일 진입점이 되고, Gemini는 결정된 페르소나 + 결정론적 관찰 카드 5~7개를 "사실"로 받아 카피만 새로 짠다.

---

## §1. 결정론적 신호 추출

신규 파일: `src/lib/persona/personaResolver.ts`

### 얼굴 4축 점수 (0–100)

각 축은 `FaceMetrics`의 raw 메트릭을 가중 합성한 후 0–100으로 정규화한다. 임계값은 §6 시뮬레이션 단계에서 미세 조정한다.

| 축 | 입력 메트릭 | 의미 |
|---|---|---|
| **Balance** | `phiRatioCompliance` + (1 − normalized `asymmetryIndex`) + (1 − normalized `eyes.leftToRightDeltaMm`) | 좌우/비율 균형. 첫인상 안정감. |
| **Expressive** | `mouth.cornerAngleDeg` 절대값 + `eyes.leftToRightDeltaMm` + `thirds.lower` | 표정 변동·생기. |
| **Focus** | (1 − `eyeSpacing`) + `thirds.upper` + `jaw.vlineIndex` | 사색·집중 신호. 좁은 눈 간격과 또렷한 상안. |
| **Vitality** | `jaw.chinProtrusionMm` + `nose.lengthMm` + `cheekToJawRatio` + `faceAspectRatio` | 추진·실행 인상. |

각 raw 메트릭은 production 18명 분포(현행 코드 `metricsCalculator.ts` 주석에 기록된 범위)와 일반적인 MediaPipe 분포를 기준으로 0–1 정규화한 뒤, 위 가중합을 `* 100`해서 round한다.

### 얼굴 페르소나 라벨 (8종)

4축 점수로 단순 룰 분기:

| 라벨 | 분기 조건 | 의미 |
|---|---|---|
| `balance_anchor` | Balance ≥ 70 이면서 단독 1위 | 균형·안정 우세 |
| `expressive_spark` | Expressive ≥ 70 이면서 단독 1위 | 생기·표정 우세 |
| `focused_thinker` | Focus ≥ 70 이면서 단독 1위 | 사색·집중 우세 |
| `vital_driver` | Vitality ≥ 70 이면서 단독 1위 | 추진·실행 우세 |
| `balance_focus` | Balance, Focus 모두 ≥ 60 (2축 dual) | 차분한 분석가 |
| `expressive_vital` | Expressive, Vitality 모두 ≥ 60 | 행동파 표현형 |
| `focus_vital` | Focus, Vitality 모두 ≥ 60 | 목표 몰입형 |
| `soft_baseline` | 4축 모두 60 미만 | 부드러운 잔잔형 |

단독 우세(첫 4개)와 dual 우세(다음 3개)가 동시 충족이면 단독 우세를 우선. 모든 분기를 빠진 케이스가 `soft_baseline`로 떨어진다. 분기 룰은 결정론적이라 단위 테스트로 모든 경계 케이스를 고정한다.

### 사주 페르소나 (5종)

`saju.dominantElements[0]`로 1:1 매핑. `dominantElements`가 동률 다수면 ELEMENT_ORDER 순서(wood, fire, earth, metal, water)로 결정.

| 사주 키 | dominantElement | 의미 |
|---|---|---|
| `seeker_explorer` | wood | 새 분야 탐색 |
| `mover_igniter` | fire | 추진·점화 |
| `anchor_organizer` | earth | 정리·기반 |
| `editor_decider` | metal | 판단·기준 |
| `deep_diver` | water | 깊은 몰입 |

### 결합 페르소나 코드

`combinedCode = ${faceKey}__${sajuKey}` — 8 × 5 = 40 조합. 책 추천 가중치 dict와 톤 hint 분기의 키로 사용.

### 관찰 카드 (5~7개)

`resolvePersona`가 다음 형태의 결정론적 관찰 카드 배열을 반환한다. Gemini는 이 카드를 사실로 받아 톤만 입힌다.

```ts
type ObservationCard = {
  axis: "balance" | "expressive" | "focus" | "vitality" | "saju";
  rawMetric: string;          // 예: "asymmetryIndex 0.014"
  observation: string;         // 예: "좌우 비대칭 1.4% — 표정이 살짝 한쪽으로 기우는 편"
};
```

생성 규칙: 각 얼굴 4축마다 점수가 60 이상이면 강도 높은 카드를, 40 이하면 부재 카드를, 중간이면 미세 카드를 생성. 사주 카드 1장은 dominantElement 1개에서 만든다. 사주 카드는 사용자 노출 문구에서 한자/오행 단어를 절대 쓰지 않도록 사전에 한국어 일반 성향 언어로 작성한다. (현행 `cleanCopy` 정규식 사전과 일관성 유지)

### 산출물 타입

```ts
type PersonaSignal = {
  faceKey: FaceKey;            // 8종
  sajuKey: SajuKey;            // 5종
  combinedCode: string;        // 40조합
  axisScores: { balance: number; expressive: number; focus: number; vitality: number };
  observationCards: ObservationCard[]; // 5~7장
  toneHint: "calm" | "spark" | "anchor" | "edit" | "deep";
  bookTagWeights: Record<string, number>;
};
```

---

## §2. 페르소나 기반 책 추천 다양성

수정 파일: `src/lib/books/recommender.ts`, `src/app/api/analyze/route.ts`

### 현행 점수 함수

```
score = (book.category === favoriteCategory ? 10 : 0)
      + (book.tags ∩ [favoriteCategory]).length * 4
      + (book.description.length > 0 ? 1 : 0)
      + (isDiscoveryFriendly ? 2 : 0)
      - bestsellerPenalty
```

문제: `desiredTags = [favoriteCategory]`라서 사실상 카테고리 점수만 작동. 같은 카테고리 학생 30명에게 같은 책이 1순위로 나올 위험.

### 새 점수 함수

```
score = categoryScore        // 8 (현행 10에서 살짝 낮춤)
      + personaTagScore      // Σ(book.tags ∩ persona.bookTagWeights), cap 12
      + descriptionScore     // 2 (조금 상향)
      + discoveryBonus       // 2 (그대로)
      + diversitySalt        // ±2, 안정된 seed(sessionId 또는 학번 해시) 기반
      - bestsellerPenalty    // 0–9 (그대로)
```

`personaTagScore`는 `persona.bookTagWeights`(라벨별 사전 정의 dict)에서 책 태그가 일치할 때마다 가중치를 더한다. 12점 캡. 페르소나가 분기 신호로 직접 작용한다.

### 페르소나별 책 태그 가중치 (8 × 5 = 40 dict)

구현 단순화를 위해 dict는 두 단계로 합성:
1. `FACE_TAG_WEIGHTS[faceKey]` — 8개 dict
2. `SAJU_TAG_WEIGHTS[sajuKey]` — 5개 dict
3. `bookTagWeights = mergeAdd(FACE_TAG_WEIGHTS[faceKey], SAJU_TAG_WEIGHTS[sajuKey])`

예 (deep_diver × focused_thinker):
```
FACE_TAG_WEIGHTS.focused_thinker = { "심화 독서": 4, "철학 입문": 3, "고전": 3, "사고 정리": 2 }
SAJU_TAG_WEIGHTS.deep_diver      = { "심화 독서": 3, "에세이": 2, "위로": 2 }
merged                           = { "심화 독서": 7, "철학 입문": 3, "고전": 3, "사고 정리": 2, "에세이": 2, "위로": 2 }
```

태그 어휘는 현행 `READING_TYPES.tags`와 `BOOK_CATEGORIES`, 그리고 책 import 단계에서 사용 중인 태그 풀에 정합되도록 정렬. 신규 태그 도입은 하지 않는다.

### diversitySalt 구현

```
hash = sha256(sessionId).slice(0,4) as number
salt = (hash % 5) - 2   // -2 ~ +2
score += salt * book.sourceIdHash(book.id) % 1.0  // 책 단위로 결정론적
```

같은 학생이 새로고침해도 동일 결과(sessionId 동일). 같은 페르소나 학생 두 명이 다른 sessionId로 들어오면 1~3순위가 미세 셔플되어 옆사람과 100% 동일 추천을 피한다.

---

## §3. Reading Type 라벨/헤드라인 재설계

수정 파일: `src/lib/reading-types/types.ts`

### 톤 원칙

- 친구 모드 존댓말 유지: "~인 편이에요" 대신 "~인 거 보이거든요", "~잖아요" 같은 어말
- 외모 비하, 조롱, 디시밈, 비속어 절대 금지
- 각 헤드라인에 캐치 요소 1개 이상: 숫자, 장면, 실생활 비유, 작은 자기 인식 모먼트

### 16개 라벨 전면 재작성

| 코드 | 새 displayName | 새 headlineTemplate |
|---|---|---|
| `focus_reboot` | 집중력 재부팅 대기자 | `{nameHonorific} 뇌 알림 87개 떠 있는 거 보이거든요` |
| `thought_overload` | 머릿속 탭 매니저 부재 | `{nameHonorific} 머릿속에 탭 47개, 닫을 시간이에요` |
| `career_compass` | 진로 GPS 재설정 중 | `{nameHonorific} 스펙 말고 방향이 빠진 상태` |
| `action_button` | 실행 버튼 고장형 | `{nameHonorific} 계획은 9단계인데 시작은 0단계` |
| `emotion_reset` | 마음 배터리 7% | `{nameHonorific} 충전기 어디 뒀는지 까먹은 사람` |
| `relationship_translator` | 사람 마음 자막 부재 | `{nameHonorific} 대화에 자막이 필요한 순간이 잦은 편` |
| `self_trust` | 내 기준 미설정 | `{nameHonorific} 남 기준 먼저 보고 내 기준은 나중에 보는 사람` |
| `ambition_strategy` | 야망 지도 업데이트 필요 | `{nameHonorific} 야망은 켜 있는데 지도는 작년 버전` |
| `rest_prescription` | 쉬는 법 분실 | `{nameHonorific} 쉴 줄 모르는 게 새로운 일이 된 사람` |
| `curiosity_explorer` | 취향 레이더 워밍업 중 | `{nameHonorific} 취향 레이더, 아직 숨은 보물 찾는 중` |
| `reality_tuning` | 낭만↔현실 튜닝 | `{nameHonorific} 낭만과 현실 사이에서 핸들 잡는 사람` |
| `creativity_walk` | 아이디어 산책가 | `{nameHonorific} 아이디어 레이더 늘 켜 있는 사람` |
| `language_muscle` | 문해력 근력 운동 중 | `{nameHonorific} 생각 근육은 문장으로 키우는 사람` |
| `worldview_expand` | 뇌 지도 확장팩 필요 | `{nameHonorific} 머릿속 지도에 빈 칸이 보이는 사람` |
| `confidence_softener` | 괜찮은 척 7회차 | `{nameHonorific} 표정에 괜찮은 척이 살짝 보이거든요` |
| `deep_dive_scholar` | 얕고 넓게 말고 깊고 좁게 | `{nameHonorific} 얕게 많이 말고 하나를 깊게 팔 타이밍` |

`tags` 배열은 페르소나 가중치 dict와 정합되도록 후반에 일괄 검토한다.

### Gemini의 reading_type 선택 가이드 강화

현재 프롬프트는 16개 코드를 던지고 자유 선택이다. 새로 도입:

- 페르소나 코드 → reading_type 후보 3개로 좁히는 사전 매핑 dict (16개를 페르소나별 우선순위로 정렬)
- 프롬프트에서 "이 사용자의 페르소나 코드는 X이고, 권장 reading_type 후보는 [A, B, C]다. 셋 중 가장 잘 맞는 하나를 골라라. 셋 다 안 맞을 때만 다른 코드로 가도 된다."로 가이드

이 두 단계로 16개 reading_type이 페르소나 분포에 따라 고르게 분산된다.

---

## §4. Gemini 프롬프트 & VOICE_GUIDE 재구성

수정 파일: `src/lib/gemini/libraryPrompt.ts`, `src/lib/gemini/librarySchema.ts`

### (1) 프롬프트 구조 변경

기존: raw 메트릭 + saju JSON + 후보책을 그대로 던지고 Gemini가 해석.

신규: 페르소나 코드 + 4축 점수 + 결정론적 관찰 카드 5~7장을 "이미 확정된 사실"로 주입.

```
이 사용자의 페르소나는 {combinedCode} 이며 변경 불가다.
4축 점수: Balance {b}, Expressive {e}, Focus {f}, Vitality {v}
다음 관찰 카드는 이미 사실로 확정되었다. 새로 계산하거나 바꾸지 마라:
- {axis} | {rawMetric} | {observation}
- ...
권장 reading_type 후보: [A, B, C]
너의 임무는 이 사실을 친구 모드 존댓말 카피로 옮기는 것이다.
```

기존 raw 메트릭 JSON 주입은 유지하되, Gemini가 "내가 계산해서 결정"한다는 여지가 없도록 "검증 참고용일 뿐, 위 카드와 어긋나면 카드를 따른다"는 문장을 추가한다.

### (2) VOICE_GUIDE 친구 모드로 교체

```
문체는 존댓말이지만 거리감 있는 "~입니다"가 아니라 친구가 또박또박 짚어주는 톤이다.
"~인 편이에요" 대신 "~인 거 보이거든요", "~잖아요", "~인 사람"을 우선한다.
재미는 정확한 관찰에서 나오고, 조롱·비속어·반말·디시밈·외모 비하는 절대 금지한다.
사용자가 "헐 이거 완전 내 얘긴데?"라고 느끼게 구체적으로 쓴다. 좋은 말만 늘어놓지 말고
삐끗하는 순간도 부드럽게 짚는다. 추상적 칭찬·일반론·MBTI 같은 보편 문구는 피한다.

좋은 예시:
- "{name}님 머릿속 탭 47개 열어두고 메인 작업창 못 찾는 사람이에요"
- "{name}님 답장 늦으면 의미부여 시작하는 거 보이거든요"
- "{name}님 표정에 괜찮은 척이 살짝 보이는데, 그게 또 매력 포인트예요"
- "{name}님 결정은 빠른데 그 결정의 7번째 백업 플랜까지 짜놓는 타입"
- "{name}님 새벽 2시에 갑자기 책 꺼내드는 사람"
- "{name}님 카페에서 한 자리 정해두고 거기만 가는 사람"

나쁜 예시 (이렇게 쓰지 마라):
- "차분하고 안정적인 인상이에요" (일반론)
- "당신은 멋진 사람이에요" (빈 칭찬)
- "감성적이면서 이성적인 균형감이 있어요" (양다리 표현)
- "INFJ 같은 느낌이네요" (MBTI/외부 시스템 차용)
- "넌 이런 사람이야" (반말)
- "피부가 좋아 보여요" (외모 평가)
```

few-shot 예시를 6개 좋은 + 6개 나쁜으로 명시해 모델이 톤을 학습한다.

### (3) 후처리 정규식 사전 정리

`librarySchema.ts`의 `clean()`과 `pages/ResultPage.tsx`의 `publicResultCopy()`에 있는 정규식 사전은 일부는 그대로(사주/한자 차단), 일부는 새 톤에 맞춰 보강:
- "~인 편이에요" → "~인 거 보이거든요"로 통합 변환은 하지 않는다 (사람이 의도해서 쓴 것도 있음). 대신 Gemini 출력에서 발견되는 굳은 패턴 5~10개를 신규 치환 규칙으로 추가.

---

## §5. 결과 화면 QR + 모바일 대출 동선

수정 파일: `src/components/pages/ResultPage.tsx`, `src/components/result/BookRecommendationCard.tsx`, (필요시) `src/app/result/[id]/page.tsx`. 신규 dep: `qrcode` (브라우저 SVG 렌더링용 lightweight).

### PC 5섹션 — 마지막 섹션 변경

5번째 섹션(BOOK CURATION) 우측 하단 또는 책 카드 옆에 QR 카드 추가:

- QR 값: `https://<host>/result/<sessionId>?m=1`
- QR 카드에는 안내 카피를 넣지 않는다. QR 이미지 + 작은 아이콘(예: 휴대폰 모양) 1개만. 의미는 부스 안내자가 입으로 거든다.
- 학생이 5섹션을 다 본 후 자연스럽게 QR을 찍을 수 있도록, QR 카드는 5섹션 진입 후 페이드인. 이전 섹션엔 노출하지 않는다.

### 모바일 결과 페이지 (`?m=1` 또는 viewport mobile)

세로 스크롤로 분기. 우선순위:

1. **책 추천 카드 최상단 3장** — 책 표지, 제목/저자, 청구기호, 위치(층/서가), "도서관에서 보기" 또는 외부 OPAC 링크 버튼. 청구기호와 위치는 큰 활자.
2. 그 아래 타입 라벨 + 한 줄 헤드라인(공유용 PNG 카드 노출). `html-to-image` 이미 dep에 포함되어 있어 추가 의존성 없음. Web Share API 가능하면 "공유" 버튼.
3. 그 아래 inner_style, chemi_match, face_signal을 카드 형태로 압축.

### 대출 전환 측정 후크

`library_sessions` 테이블에 컬럼 추가 또는 신규 `library_session_events` 테이블 1개 신설. 모바일에서 책 카드 클릭 시 비식별 이벤트 기록:
- event_type: `book_card_view`, `book_location_click`, `opac_link_click`
- session_id, book_id, occurred_at

이건 시간 우선순위 마지막. 부스 안정성에 문제가 없으면 추가, 아니면 다음 파일럿으로 미룬다.

---

## §6. 검증 & 롤백 전략

### 단위 테스트

- `personaResolver` 4축 점수 경계값, 8개 페르소나 라벨 분기, 5종 사주 매핑, dual 우세 결합 케이스 — vitest로 20+ 케이스 추가
- `recommender` 새 점수 함수: 페르소나 가중치 합산, diversitySalt 결정론성, bestseller 패널티 유지 검증

### 시뮬레이션 스크립트

`scripts/simulate-personas.ts` 신규. 가상 입력 200개를 다음 분포로 생성:
- favoriteCategory: 9종 균등
- 생년월일: 1995–2008 균등 (사주 5종 분포 자연 발생)
- 얼굴 메트릭: 18명 production 실측 분포에서 sampling + 노이즈

각 입력에 대해 `resolvePersona`와 `selectBookCandidates`만 실행(Gemini 호출 없음). 출력:
- 페르소나 코드 분포 (40조합 어디에 몰렸는지)
- 책 1순위 분포 (동일 책이 몇 명에게 1순위로 나왔는지, 상위 10권 빈도)
- 같은 카테고리·같은 페르소나 학생끼리 책 1순위 일치율

목표 지표: 동일 책이 1순위로 잡히는 최대 빈도 20명 이하 (200명 중 10% 이하).

### E2E

로컬에서 실제 카메라로 1회 흐름 끝까지. Playwright까지는 시간 부담이라 스킵.

### 카피 톤 샘플 검수

시뮬레이션 결과 중 페르소나 다른 5케이스를 골라 실제 Gemini를 호출하고 main_copy, headline, inner_style을 사람 눈으로 확인. 어색한 패턴이 보이면 VOICE_GUIDE 예시 1라운드 보강.

### 환경변수 토글

```
PERSONA_V2_ENABLED=true|false        # default false → 부스 시작 직전 true로
READING_TYPE_V2_ENABLED=true|false   # 라벨/헤드라인 새 버전
RESULT_MOBILE_VIEW_ENABLED=true|false # QR + 모바일 분기
```

전부 off로 두면 현행 동작. 부스 운영 중 한 줄 토글로 복구 가능. PERSONA_V2가 off일 때 새 reading_type 라벨도 함께 비활성화되도록 보조 가드 추가.

### 부스 운영 사전 점검 (5/13 11:00–11:50)

- 결과 페이지 1회 흐름 확인 (분석 → 5섹션 → QR → 모바일에서 같은 결과 열림)
- 모바일에서 책 위치 카드와 외부 링크 클릭 동작
- 카메라 권한, 네트워크, 전원 — 현행 README의 사전 점검 체크와 동일

---

## 변경 파일 요약

신규:
- `src/lib/persona/personaResolver.ts`
- `src/lib/persona/tagWeights.ts`
- `tests/persona/personaResolver.test.ts`
- `scripts/simulate-personas.ts`

수정:
- `src/lib/reading-types/types.ts` — 16개 라벨/헤드라인 재작성
- `src/lib/books/recommender.ts` — 새 점수 함수
- `src/lib/gemini/libraryPrompt.ts` — 페르소나 입력 + 새 VOICE_GUIDE
- `src/lib/gemini/librarySchema.ts` — 후처리 사전 정리
- `src/app/api/analyze/route.ts` — `resolvePersona` 호출 후 prompt에 전달, 추천 후보 가중치 적용
- `src/components/pages/ResultPage.tsx` — 5섹션 QR 카드, 모바일 분기
- `src/components/result/BookRecommendationCard.tsx` — 모바일에서 청구기호/위치 강조
- `package.json` — `qrcode` 추가

신규 supabase 마이그레이션(시간 남으면): `library_session_events` 테이블 1개

---

## 오픈 이슈

- `axisScores` 정규화 기준 분포: production 18명 표본은 작은 편. 시뮬레이션 단계에서 임계값(70/60/40)이 한쪽으로 몰리면 학생 분포가 깨질 수 있어, 시뮬레이션 결과를 보고 임계값 미세 조정 필요.
- 책 태그 어휘: 현행 import 단계에서 어떤 태그가 실제로 붙어 있는지 표본 100권 확인 필요. 페르소나 가중치 dict의 태그가 책 DB에 실제 존재해야 personaTagScore가 작동한다.
- 모바일 결과 페이지: 현행 ResultPage가 가로 슬라이드 전용 구조라, viewport 분기 분량이 예상보다 크면 5섹션 중 일부(face signal)를 모바일에서 생략하는 변형도 고려.
