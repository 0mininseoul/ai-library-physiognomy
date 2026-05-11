# 결과/분석 화면 UX 복구 계획

> **Youngmin님께:** 이 계획을 구현할 때는 `superpowers:executing-plans` 스킬로 체크리스트를 하나씩 실행하세요.

## 목표

`/result` 페이지와 분석 완료 화면에서 발견된 UI 깨짐, 카피 중복, 과한 생략, 대칭성 점수 과대평가, 사주 직접 노출, 책 추천 섹션 불신 문제를 한 번에 정리합니다.

현재 `main` 브랜치는 `origin/main`과 동기화되어 있고, 작업 전 상태는 clean입니다.

## 핵심 방향

- 분석 완료 화면은 라이트 테마로 시작했으면 라이트 계열 분석 스테이지를 유지합니다. 지금처럼 분석 중 갑자기 다크 테마로 바뀌지 않게 합니다.
- 분석 완료 카드 수는 10개에서 8개 안팎으로 줄이고, 좌우 컬럼은 화면 높이를 넘으면 자동으로 위로 밀리며 스크롤되게 합니다.
- 대칭성 점수는 Gemini가 임의로 높게 주지 못하게 deterministic calibration을 먼저 계산하고, 저장 직전에 해당 점수로 덮어씁니다.
- `FACE REVEAL`과 `FACE SIGNAL`은 서로 다른 역할을 갖게 합니다. 같은 문장을 반복하지 않습니다.
- `INNER STYLE`은 사주/오행/물/불/기운 같은 직접 표현 없이 성향 언어로 바꿉니다. 퍼센트와 게이지도 제거합니다.
- `CHEMI MATCH`는 잘 맞는 유형을 여러 개 보여주지 않고, 가장 설득력 있는 1개만 보여줍니다.
- `BOOK CURATION`은 카드가 깨지지 않게 레이아웃을 재구성하고, “왜 이 책인지”를 더 신뢰감 있게 설명합니다.
- 대표 추천 책은 유명한 베스트셀러를 자동으로 고르지 않게 보정합니다. 대표 추천은 인기도보다 개인 적합도를 우선합니다.
- 공유 링크는 `public/og-image.png` 1200x630 이미지를 Open Graph/Twitter card에 연결해서 카카오톡, 인스타그램 DM, Threads, LinkedIn 등에서 같은 대표 이미지가 보이게 합니다.
- 24시간 전인데 얼굴 이미지가 사라지는 문제는 5분짜리 Supabase signed URL이 뒤로가기/캐시 상황에서 만료되는 문제로 보고, 내부 이미지 프록시 endpoint로 해결합니다.

## 외부 자료 참고

- MediaPipe Face Landmarker/Face Mesh는 얼굴 landmark와 geometry를 제공하지만, 사람에게 보여줄 대칭성/호감도 점수를 대신 정해주지는 않습니다. 따라서 제품 쪽에서 점수 보정 레이어가 필요합니다.
  - https://ai.google.dev/edge/mediapipe/solutions/vision/face_landmarker
  - https://github.com/google/mediapipe/wiki/MediaPipe-Face-Mesh
- 얼굴 비대칭 측정은 landmark 기반 정규화가 핵심입니다. 현재처럼 작은 raw delta를 그대로 Gemini에 주면 “거의 완벽한 대칭”처럼 과장될 수 있습니다.
  - https://arxiv.org/abs/2103.11059

## 작업 1. 대칭성 점수 보정

### 문제

현재 `src/lib/facemesh/metricsCalculator.ts`의 `asymmetryIndex`는 landmark 좌우 거리 차이를 평균낸 값입니다. 이 값은 normalized coordinate라서 보통 `0.001` 같은 아주 작은 값이 나옵니다.

Gemini는 이 작은 값을 보면 “거의 완벽한 대칭”으로 해석하기 쉽습니다. 그래서 실제 화면에서 대칭성만 다른 점수보다 10점 정도 높게 나오는 현상이 생깁니다.

### 보정 방식

대칭성은 다음 순서로 계산합니다.

1. raw `asymmetryIndex`를 얼굴 폭으로 나눠 정규화합니다.
2. 눈 높이 차이, 입꼬리 기울기 같은 보조 페널티를 더합니다.
3. 대칭성 점수 상한을 낮춥니다. 일반 실사용 사진에서 `95`가 쉽게 나오지 않게 합니다.
4. Gemini가 낸 `scores.symmetry`는 저장 직전에 deterministic score로 덮어씁니다.

### 예정 코드

```ts
// src/lib/facemesh/scoreCalibration.ts
import type { FaceMetrics } from "@/types/face";

export type CalibratedFaceScores = {
  symmetry: number;
  balance: number;
  trust: number;
  likability: number;
  attractiveness: number;
  diagnostics: {
    normalizedAsymmetryPct: number;
    eyeDeltaMm: number;
    mouthCornerAngleDeg: number;
    phiRatioCompliance: number;
  };
};

const clamp = (value: number, min: number, max: number) => Math.min(max, Math.max(min, value));

export function calibrateFaceScores(metrics: FaceMetrics): CalibratedFaceScores {
  const faceWidth = Math.max(metrics.faceBox.width, 0.001);
  const normalizedAsymmetryPct = Number(((metrics.asymmetryIndex / faceWidth) * 100).toFixed(2));

  const eyePenalty = clamp(metrics.eyes.leftToRightDeltaMm / 0.8, 0, 10);
  const mouthPenalty = clamp(Math.abs(metrics.mouth.cornerAngleDeg) * 1.4, 0, 10);

  const symmetry = clamp(
    Math.round(84 - normalizedAsymmetryPct * 9 - eyePenalty - mouthPenalty),
    54,
    90,
  );

  const phi = clamp(metrics.phiRatioCompliance / 100, 0, 1);
  const balance = clamp(Math.round(63 + phi * 22 - normalizedAsymmetryPct * 4), 54, 90);
  const trust = clamp(Math.round((symmetry + balance) / 2 + 2), 55, 90);
  const likability = clamp(Math.round(trust - 1 + Math.min(5, metrics.faceAspectRatio * 1.8)), 55, 90);
  const attractiveness = clamp(Math.round((symmetry + balance + likability) / 3), 55, 89);

  return {
    symmetry,
    balance,
    trust,
    likability,
    attractiveness,
    diagnostics: {
      normalizedAsymmetryPct,
      eyeDeltaMm: metrics.eyes.leftToRightDeltaMm,
      mouthCornerAngleDeg: metrics.mouth.cornerAngleDeg,
      phiRatioCompliance: metrics.phiRatioCompliance,
    },
  };
}
```

### 점수 정책

- 일반적인 좋은 대칭: `82~88`
- 매우 안정적인 대칭: `89~90`
- 약간 비대칭이 보이는 경우: `72~81`
- 카메라 각도/표정 영향까지 감안해 불안정한 경우: `54~71`

기존처럼 대칭성만 `95`가 되는 구조는 막습니다. 다만 얼굴이 정말 정면이고 눈/입/윤곽이 안정적이면 다른 점수보다 3~5점 정도 높게 나오는 것은 허용합니다.

Youngmin님이 말한 “대칭성이 다른 점수보다 10점 정도 높게 나온다”는 피드백을 반영해서, 대칭성 기본 기준점을 `86`이 아니라 `84`로 낮추고 상한도 `90`으로 제한하는 쪽이 좋습니다.

## 작업 2. Gemini 프롬프트/스키마 개선

- `section_copy`를 추가해서 섹션별 헤드라인 아래 문구를 Gemini가 따로 생성하게 합니다.
- `FACE REVEAL` 문구와 `FACE SIGNAL` 문구가 겹치면 안 된다는 규칙을 프롬프트에 명시합니다.
- “정확해서 웃긴” 고양이 캐릭터 톤을 강화합니다.
- 단, 비속어/반말/조롱은 사용하지 않습니다. 재미는 정중한 생활감 비유와 고양이식 관찰에서 만듭니다.
- 금지어를 유지합니다: `학생`, `처방`, `피부`, `근거`, `연애`, `데이트`, `사주`, `오행`, `물`, `불`, `목`, `토`, `금`, `기운`, `생년월일`, `월주`, `일주`.

## 작업 3. 결과 페이지 섹션 재구성

- `FACE REVEAL`: 얼굴 공개, 타입 카드, 관상 총평.
- `FACE SIGNAL`: 얼굴 측정 기반 신호만 보여줍니다.
- `INNER STYLE`: 퍼센트/게이지 제거. 강한 성향과 보완 성향을 이모지 카드로 보여줍니다.
- `CHEMI MATCH`: 잘 맞는 사람 유형 1개만 보여줍니다.
- `BOOK CURATION`: 대표 추천 1권 + 함께 읽을 책 2권 구조를 유지하되 카드 깨짐을 수정합니다.

## 작업 4. 분석 완료 화면 복구

- 분석 중/완료 화면에서 강제로 `data-theme="dark"`를 넣는 코드를 제거합니다.
- 카드 수를 8개 안팎으로 줄입니다.
- 좌우 컬럼은 `max-height`와 `overflow-y: auto`를 적용합니다.
- 카드 텍스트는 무조건 잘라내지 않고, 처음부터 2~3줄로 생성되도록 합니다.
- Final Assessment는 좌우 카드와 겹치지 않게 별도 하단 영역으로 배치합니다.

## 작업 5. 책 추천 섹션 개선

- 책 카드에 `fitReason`, `readingMoment`를 추가합니다.
- “왜 이 책인지”, “읽기 좋은 순간”, “도서관 위치”를 분리해 보여줍니다.
- 표지 이미지와 텍스트가 겹치지 않도록 고정 grid와 line clamp를 적용합니다.
- 후보 책 선정에서 명백한 베스트셀러/상위 랭킹 책에는 작은 페널티를 줍니다.
- Gemini 프롬프트에는 `recommendations[0]`이 유명한 책이 아니라 가장 개인 적합도가 높은 책이어야 한다고 명시합니다.

## 작업 6. 얼굴 이미지 24시간 표시 버그 수정

- `/api/result/[id]`는 5분짜리 Supabase signed URL을 직접 넘기지 않습니다.
- 대신 `/api/result/[id]/face-image` 내부 endpoint를 넘깁니다.
- 이 endpoint가 매번 fresh signed URL을 만들어 redirect합니다.
- result API와 image endpoint 모두 `Cache-Control: no-store`를 설정합니다.

## 작업 7. 검증

```bash
pnpm test -- tests/geminiLibrarySchema.test.ts tests/components/resultPage.test.tsx tests/metricsCalculator.test.ts tests/scoreCalibration.test.ts
pnpm lint
pnpm test
pnpm build
```

브라우저 QA:

- `/result/3eefc733-3964-46d2-85b0-04bf6851ba7a`
- 분석 완료 화면
- 라이트/다크 토글
- 뒤로가기 후 얼굴 이미지 유지
- `1440x900` 기준 card clipping/overflow/ellipsis 확인

## 완료 후

```bash
git status --short
git add src tests docs
git commit -m "Fix result and analysis UX regressions"
git push
```
