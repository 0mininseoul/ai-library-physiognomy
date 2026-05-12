# 와우 개인화 설계 — 5/13 가천대 부스 대응

작성일: 2026-05-12
작성자: 박영민 (어센텀)
관련 운영: 2026-05-13 가천대학교 중앙도서관 앞 학교 축제 부스 (12:00–19:00, 목표 참여 200명)

## 2026-05-13 운영 결정 업데이트

이 문서는 5/12 밤 개인화 설계에서 출발했지만, Claude Code 세션에서 이어받은 작업과 이후 Codex 세션의 제품 판단을 반영해 아래 결정을 최신 기준으로 둔다.

- 5/13 부스는 가천대학교 중앙도서관 PoC 성격이 강하므로, `/`와 `/result`에는 가천대학교 중앙도서관 로고를 공동 브랜딩으로 노출한다. 학생에게는 낯선 `AI 관상가 고양이`보다 학교 도서관의 권위가 먼저 신뢰 장치가 된다.
- UI에서 분석 주체를 설명할 때는 `야옹이` 또는 `AI 관상가 고양이`만 쓴다. `Gemini`, 모델명, API명은 내부 구현 용어로만 남기고 사용자 화면에는 노출하지 않는다.
- 사용자는 `/result`의 5번째 `BOOK CURATION` 섹션에 도착하기 전까지 책 추천 서비스라는 사실을 알면 안 된다. 분석 HUD, 완료 카드, 최종 평가 카드, 대기 문구에서 책/도서/서가/청구기호/추천 책을 언급하지 않는다.
- 입력 화면의 4지선다 `지금 나에게 가장 필요한 것은?`은 책 큐레이션을 위한 니즈 신호다. 얼굴 분석, 내면 해석, 케미 해석의 핵심 근거로 사용하지 않는다.
- 1차 Gemini 호출은 얼굴/내면/케미/결과 카피에 집중한다. 책 큐레이션은 `/result` 진입 후 별도 API에서 비동기로 생성하고, 사용자가 5번째 섹션에 도착하기 전까지 준비되면 된다.
- 호출을 더 세분화하지 않는 것이 현재 기준의 품질/속도 균형이다. 얼굴 분석, 내면 해석, 케미는 첫 와우에 필요하므로 1차 결과에서 빠지면 안 된다.
- 분석 직후 화면의 카드 순차 등장과 텍스트 스트리밍은 유지한다. 다만 해당 카피는 `/result` 상세 리포트와 같은 문장을 반복하지 않는 티저/확정 신호여야 한다.
- `/result`의 섹션 헤드라인 아래 문구는 최소 2문장, 가능하면 2~3문장으로 보인다. 모델 응답이 한 문장뿐이면 deterministic fallback으로 화면 밀도를 보강한다.
- `/result` 첫 섹션 TYPE 카드와 모바일 공유 카드의 유형명/헤드라인/설명/chip은 `src/lib/reading-types/resultFirstSectionCopy.ts`에서 운영자가 직접 편집한다. DB에 저장된 Gemini 카피가 있어도 `readingType.code`를 기준으로 이 파일의 최신 문구를 우선 렌더링하므로, 기존 결과도 재생성 없이 배포 후 새 워딩으로 보인다.
- Impression score는 평균적으로 80점대 중반~90점대 초반이 자연스럽다. 정말 예외적으로 좋은 신호는 90점대 후반과 100점도 가능해야 한다.
- 추천 도서는 런타임에서 Supabase의 active books를 읽되, 가천대 도서관 데이터에서 온 책만 필터링해야 한다. `data/library`는 운영 책 DB의 원천 파일이고, 실제 추천은 import된 DB 후보 안에서만 이뤄진다.

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
- 신규 결과 섹션 추가(현행 5섹션 구조 유지).
- 인증/로그인, 알림, 푸시 등 부스 운영에 직접 필요 없는 기능.

## 시스템 개요

```
사용자 입력(이름/학번/성별/생년월일/카테고리) + 얼굴 메트릭 + 얼굴 이미지
        │
        ├── calculateSaju(birthDate)                       ──┐
        ├── calibrateFaceScores(metrics)                   ──┤
        ├── resolvePersonaCandidates(metrics, saju) [신규]  ──┤   (얼굴 페르소나 후보 2~3개)
        └── selectBookCandidates(books, persona)           ──┤
                                                             ▼
                       buildLibraryPrompt({signals, image, candidates})  [이미지 첨부]
                                                             │
                                                             ▼
                                  Gemini gemini-2.5-flash (Vision)
                                  - 후보 중 페르소나 1개 최종 확정
                                  - reading_type 라벨 확정
                                  - 카피 전부 작성
                                                             │
                                                             ▼
                              normalizeLibraryAnalysis()
                                                             │
                                                             ▼
                          저장 → /result/[id] (PC 5섹션) 또는 /result/[id]?m=1 (모바일 세로)
```

### 최신 런타임 구조

5/13 부스 기준 실제 UX는 아래처럼 나눈다.

```
분석 화면
  └─ /api/analyze
       ├─ 얼굴 메트릭 + 이미지 + 생년월일 계산값
       ├─ Gemini 1차 호출: 얼굴/내면/케미/결과 리포트 카피
       ├─ recommendations: [] 로 저장
       └─ /result/[id]로 이동 가능한 결과를 먼저 반환

/result/[id]
  ├─ FACE REVEAL / FACE SIGNAL / INNER STYLE / CHEMI MATCH 즉시 표시
  └─ 클라이언트가 /api/result/[id]/recommendations POST
       ├─ 가천대 도서 DB 후보만 로드
       ├─ 얼굴/내면/케미 결과 + 관심 분야 + 4지선다 니즈로 책 3권 선정
       └─ BOOK CURATION 섹션에 도착하기 전까지 result_json.recommendations 채움
```

DB 상태값은 기존 마이그레이션 제약조건(`queued`, `analyzing`, `complete`, `failed`)을 유지한다. 중간 상태 `analysis_ready`를 추가하지 않는다. 1차 분석 완료 시에도 `status = complete`, `recommendations = []`로 저장하고, 비동기 책 큐레이션이 성공하면 같은 row의 `result_json.recommendations`와 `recommended_book_ids`만 채운다.

`resolvePersonaCandidates`는 결정론적 룰로 얼굴 페르소나 **후보 2~3개**만 좁힌다. 최종 1개는 Gemini가 얼굴 이미지를 직접 보면서 확정한다. 결정론 안전망(룰)으로 큰 분기를 잡고, Gemini가 이미지 신호로 후보 중 최적을 골라 와우의 정확도를 한 단계 더 올린다.

---

## §1. 결정론적 신호 추출 + Gemini Vision 페르소나 확정

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

#### 후보 2~3개로 좁히기

`resolvePersonaCandidates`는 분기 결과 1개 + 4축 점수상 인접한 페르소나 1~2개를 후보로 반환한다. 예: 단독 우세 `focused_thinker`(Focus 78)지만 Vitality 65로 두 번째 축이 강하면 `focus_vital`도 후보에 포함. Gemini가 이미지를 보면서 결정한다.

```ts
type PersonaCandidates = {
  primary: FaceKey;           // 룰의 1차 추천
  alternates: FaceKey[];      // 1~2개 (4축 점수 인접 라벨)
  axisScores: { balance, expressive, focus, vitality };
};
```

#### Gemini의 페르소나 확정

`buildLibraryPrompt`가 이미지(`inlineData` base64) + 후보 페르소나 + 4축 점수 + 관찰 카드를 함께 보낸다. 프롬프트:

```
이 사용자의 얼굴 페르소나 후보는 다음 중에서 골라라:
  primary(우선): {primary}
  alternates: {alternates}
4축 점수: Balance {b}, Expressive {e}, Focus {f}, Vitality {v}
이미지를 직접 보면서 표정 안정감, 시선의 열림 정도, 전체 인상 리듬을 함께 고려해
후보 중 가장 잘 맞는 1개를 personaConfirmed에 채워라.
3개 후보 중 어느 것에도 매칭되지 않을 때만 (4축 점수와 이미지 신호가 정면 충돌할 때만)
8종 얼굴 페르소나 코드 중 다른 것을 골라도 된다.
```

응답 schema에 `personaConfirmed: string` 필드 추가. 저장된 결과 JSON에서 `personaConfirmed`로 카피 분기를 추적한다.

이미지 보안·안전: 이미지는 Gemini 호출 1회에만 inline으로 전달, 별도 저장은 기존대로 Supabase Storage(24h 표시 후 삭제). 외모 평가는 §4 VOICE_GUIDE의 새 룰을 따른다(긍정 평가 허용, 부정 평가 금지).

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
- 외모 평가 룰: 긍정적 평가는 허용, 부정적 평가/지적은 절대 금지 (자세히는 §4 VOICE_GUIDE)
- 조롱, 디시밈, 비속어, 반말 절대 금지
- 각 헤드라인에 캐치 요소 1개 이상: 숫자, 장면, 실생활 비유, 작은 자기 인식 모먼트

### 16개 라벨 워딩

워딩은 별도 draft 파일에서 관리한다: `docs/superpowers/specs/2026-05-12-reading-type-labels-draft.md`

사용자(박영민)가 draft를 직접 다듬고, 확정된 워딩을 `src/lib/reading-types/types.ts`에 옮긴다. `tags` 배열은 페르소나 가중치 dict와 정합되도록 워딩 확정 직후 한 번에 정렬.

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
재미는 정확한 관찰에서 나오고, 조롱·비속어·반말·디시밈은 절대 금지한다.
사용자가 "헐 이거 완전 내 얘긴데?"라고 느끼게 구체적으로 쓴다. 좋은 말만 늘어놓지 말고
삐끗하는 순간도 부드럽게 짚는다. 추상적 칭찬·일반론·MBTI 같은 보편 문구는 피한다.

외모 평가 룰:
- 긍정적인 외모 관찰은 허용한다. 예: "눈매가 또렷해서 첫인상에 시선이 빨리 잡혀요",
  "입꼬리가 자연스럽게 올라가서 분위기가 부드럽게 열리는 편이에요".
- 부정적인 외모 평가/지적은 절대 금지. 어떤 형태로도 외모를 깎는 말은 쓰지 않는다.
- 모든 사람에게 외모를 칭찬해야 할 의무는 없다. 이미지에서 자연스럽게 좋은 점이 보일 때만 언급한다.
- 인상·표정 신호(시선의 열림, 표정 안정감, 분위기 인상)는 외모 평가가 아니라 관찰 카드로 다룬다.

좋은 예시:
- "{name}님 머릿속 탭 47개 열어두고 메인 작업창 못 찾는 사람이에요"
- "{name}님 답장 늦으면 의미부여 시작하는 거 보이거든요"
- "{name}님 결정은 빠른데 그 결정의 7번째 백업 플랜까지 짜놓는 타입"
- "{name}님 새벽 2시에 갑자기 책 꺼내드는 사람"
- "{name}님 카페에서 한 자리 정해두고 거기만 가는 사람"
- "{name}님 눈매가 또렷해서 첫인상에 시선이 빨리 잡히는 편이에요"

나쁜 예시 (이렇게 쓰지 마라):
- "차분하고 안정적인 인상이에요" (일반론)
- "당신은 멋진 사람이에요" (빈 칭찬)
- "감성적이면서 이성적인 균형감이 있어요" (양다리 표현)
- "INFJ 같은 느낌이네요" (MBTI/외부 시스템 차용)
- "넌 이런 사람이야" (반말)
- "피부가 거칠어 보여요" (부정적 외모 평가 — 절대 금지)
- "눈이 너무 작아요" (부정적 외모 평가 — 절대 금지)
```

few-shot 예시를 6개 좋은 + 7개 나쁜으로 명시해 모델이 톤과 외모 평가 룰을 함께 학습한다.

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

세로 스크롤로 분기. 우선순위 (위 → 아래):

1. **타입 라벨 + 한 줄 헤드라인** (공유용 PNG 카드도 같이 노출) — 학생의 와우 무게중심을 가장 먼저 보여준다. `html-to-image`가 이미 dep에 있어 PNG 생성 가능. Web Share API 가능하면 "공유" 버튼.
2. **책 추천 카드 3장** — 책 표지, 제목/저자, 청구기호, 자료실/서가, 대출여부, "도서관에서 보기" 또는 외부 OPAC 링크 버튼. 청구기호와 자료실은 큰 활자. 대출 전환의 실질 진입점.
3. 그 아래 inner_style, chemi_match, face_signal을 카드 형태로 압축.

### 대출 전환 측정 후크

`library_sessions` 테이블에 컬럼 추가 또는 신규 `library_session_events` 테이블 1개 신설. 모바일에서 책 카드 클릭 시 비식별 이벤트 기록:
- event_type: `book_card_view`, `book_location_click`, `opac_link_click`
- session_id, book_id, occurred_at

이건 시간 우선순위 마지막. 부스 안정성에 문제가 없으면 추가, 아니면 다음 파일럿으로 미룬다.

---

## §6. 가천대 도서 DB 준비 (엑셀 → Supabase)

5/13 부스에서 실제 추천에 쓸 도서 데이터. 가천대 중앙도서관에서 두 엑셀로 받았다.

### 원본

`data/library/` 디렉토리에 저장(이미 커밋 예정):

| 파일 | 자료실 | 권수 | 주제 | 추천 우선순위 |
|---|---|---:|---|---|
| `bookcuration.xlsx` | 북큐레이션코너 (중앙도서관 1층) | 243 | AI/기술 | **대출 전환 우선순위 (높음)** |
| `openlibrary.xlsx` | 프리덤광장 (오픈라이브러리) | 452 | 인문·철학·교양 | 페르소나 매칭 시 사용 |

헤더는 4행에 위치(1~3행은 출력 메타). 등록번호(`UEM……`)는 도서관 내부 식별자고 **ISBN은 포함되지 않는다.** 표지·세부 메타는 외부 검색으로 보강.

### 변환·크롤링 파이프라인 (신규 스크립트)

신규 파일: `scripts/library/import-gachon-library.ts` (또는 기존 `scripts/books/`에 추가)

단계:
1. **엑셀 파싱**: `xlsx` 또는 `exceljs` 패키지로 4행을 헤더로 읽고 5행부터 데이터. 두 파일을 각각 파싱.
2. **정규화**: 공통 컬럼(서명, 저자, 출판사, 출판년, 청구기호, 자료실, 자료상태, 등록번호) + 출처 라벨(`bookcuration` / `openlibrary`)로 통합.
3. **표지·ISBN 보강 (Naver Books API)**:
   - 기존 `scripts/books/fetch-naver-books.ts` 패턴을 재사용. 서명+저자를 쿼리로 던지고 결과 10개를 받아 가중치로 best match를 고른다.
   - 매칭 점수 = title 유사도 × 0.55 + publisher 일치도 × 0.3 + 출판년 ±1 일치도 × 0.15. 합산 0.55 이상이면서 title 단독 유사도가 0.35 이상일 때만 채택.
   - 동명 책·시리즈·재발행본 오매칭을 출판사·출판년으로 한 번 더 걸러낸다.
   - 1차 매칭 실패 시 "{title} {publisher}" 쿼리로 fallback 검색 1회 추가 시도.
   - 매칭 실패 책은 별도 리포트(`data/library/unmatched.json`)로 모아 운영 전에 확인.
4. **카테고리·태그 자동 분류**: 현행 `inferBookCategory()`와 `tag-books.ts`(Gemini 태깅) 재사용. 출처별 보조 태그 강제:
   - `bookcuration` → 보조 태그 `AI`, `과학/기술`, `진로/학습` 중 적합한 것 자동 부여
   - `openlibrary` → 보조 태그 자동 부여 안 함(서명·설명으로만)
5. **Supabase import**: 기존 `import-books.ts` 패턴 재사용. 책 row에 다음 컬럼 추가:
   - `source_label` (`bookcuration` / `openlibrary`)
   - `call_number` (예: `006.3 ㄱ253ㅇ`)
   - `location_room` (자료실, 예: `북큐레이션코너(1층)`)
   - `availability` (`available` / `checked_out`) — 오픈라이브러리만 `대출여부` 컬럼 있음
   - 기존 `LibraryBook` 타입에 필요한 필드 확장

### 두 DB 혼합 추천 가드

§2의 페르소나 책 가중치에 더해, **출처 믹스 후처리**를 추가:

```ts
// selectBookCandidates 이후 또는 Gemini가 3권을 고른 직후
function enforceSourceMix(picks: LibraryBook[]) {
  // 3권 모두 같은 출처면 마지막 1권을 다른 출처의 인접 점수 책으로 swap
}
```

페르소나에 따라 비중을 다르게:

| 페르소나 그룹 | 북큐레이션 : 오픈라이브러리 |
|---|---|
| `vital_driver`, `editor_decider`, `focus_vital` × `mover_igniter`/`editor_decider` | 2 : 1 |
| `focused_thinker`, `deep_diver`, `balance_focus` × `deep_diver`/`anchor_organizer` | 1 : 2 |
| 그 외 | 1 : 2 (인문이 많은 만큼 기본 가중) |

사용자가 선택한 `favoriteCategory`가 `과학/기술`·`경제/경영`·`진로/학습`이면 북큐레이션 비중을 강제 상향한다(2:1). 가천대 도서관의 대출 전환 KPI에 직접 기여.

### 운영 메모

- 표지 매칭이 실패한 책은 결과 화면에서 표지 없이 제목/저자 카드로 표시 (`coverUrl` 빈 케이스 폴백). 추천 자체에서 제외하지는 않는다.
- 부스 운영일 전체 데이터 동기화는 1회만(밤). 부스 중 변경 없음.
- 입실 카운트·대출 전환은 §5의 측정 후크를 통해 비식별 집계로 기록.

---

## §7. 검증 & 롤백 전략

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
- `src/lib/persona/personaResolver.ts` — 4축 점수 + 8종 페르소나 후보 분기
- `src/lib/persona/tagWeights.ts` — 페르소나별 책 태그 가중치 dict
- `tests/persona/personaResolver.test.ts`
- `scripts/library/import-gachon-library.ts` — 엑셀 → 정규화 → Naver 표지 보강 → Supabase import
- `scripts/simulate-personas.ts` — 200명 가상 입력 다양성 시뮬레이션
- `data/library/bookcuration.xlsx`, `data/library/openlibrary.xlsx`, `data/library/README.md` (이미 저장됨)
- `docs/superpowers/specs/2026-05-12-reading-type-labels-draft.md` — 16개 라벨 워딩 draft (사용자가 직접 편집)

수정:
- `src/lib/reading-types/types.ts` — draft 확정 후 워딩 반영
- `src/lib/books/recommender.ts` — 새 점수 함수 + 출처 믹스 가드
- `src/lib/books/types.ts` — `sourceLabel`, `callNumber`, `locationRoom`, `availability` 필드 확장
- `src/lib/gemini/libraryPrompt.ts` — 페르소나 후보 + 새 VOICE_GUIDE + 이미지 inlineData
- `src/lib/gemini/librarySchema.ts` — `personaConfirmed` 필드, 후처리 사전 정리
- `src/app/api/analyze/route.ts` — `resolvePersonaCandidates` 호출 후 prompt에 이미지+후보 전달
- `src/components/pages/ResultPage.tsx` — 5섹션 QR 카드, 모바일 분기 (타입라벨→책3장→나머지)
- `src/components/result/BookRecommendationCard.tsx` — 모바일에서 청구기호/자료실/대출여부 강조
- `package.json` — `qrcode`, `exceljs`(또는 `xlsx`) 추가

신규 supabase 마이그레이션:
- `library_books`에 `source_label`, `location_room`, `availability` 컬럼 추가
- (시간 남으면) `library_session_events` 테이블 1개 신설

---

## 오픈 이슈

- `axisScores` 정규화 기준 분포: production 18명 표본은 작은 편. 시뮬레이션 단계에서 임계값(70/60/40)이 한쪽으로 몰리면 학생 분포가 깨질 수 있어, 시뮬레이션 결과를 보고 임계값 미세 조정 필요.
- 책 태그 어휘: 가천대 두 DB의 자동 태깅(`tag-books.ts`, Gemini 기반)을 거친 후 어떤 태그 분포가 나오는지 표본 100권 확인 필요. 페르소나 가중치 dict의 태그가 책 DB에 실제 존재해야 personaTagScore가 작동한다.
- 모바일 결과 페이지: 현행 ResultPage가 가로 슬라이드 전용 구조라, viewport 분기 분량이 예상보다 크면 5섹션 중 일부(face signal)를 모바일에서 생략하는 변형도 고려.
- 표지 매칭 정확도: Naver Books API 서명+저자 검색이 동명서·시리즈에서 오매칭될 수 있음. 시뮬레이션이 아니라 실제 두 DB에 대해 한 번 돌려서 매칭률을 본 후, 정확도 휴리스틱 튜닝 또는 매칭 실패 책 수동 보정.
- Gemini Vision 호출 시 응답 지연이 현행 대비 얼마나 늘어나는지 측정 필요. 부스 환경에서 90초~3분 사용자 체류 시간을 넘기지 않아야 한다.
