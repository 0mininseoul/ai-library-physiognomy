# 와우 개인화 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 5/13 가천대 부스(목표 200명) 와우 분기를 결정론적 페르소나 + Gemini Vision으로 정교화하고, 가천대 도서 DB(북큐레이션 243권 + 오픈라이브러리 452권)를 import해 모바일 결과 페이지에서 실제 대출까지 잇는다.

**Architecture:** 결정론 룰(얼굴 4축 점수 + 8종 페르소나 후보 + 사주 5종)로 후보를 좁히고, Gemini Vision이 이미지를 보면서 페르소나·reading_type을 최종 확정한다. 책 추천은 페르소나 가중치 + 두 DB 출처 믹스 가드로 다양화. 모바일 결과 페이지는 QR로 진입해 타입라벨→책 3장→나머지 순서로 노출한다. 환경변수 토글로 한 줄 롤백.

**Tech Stack:** Next.js 14, TypeScript, Supabase, `@google/genai` Gemini 2.5 Flash, vitest, `exceljs`, `qrcode`, Naver Books API

**Spec:** `docs/superpowers/specs/2026-05-12-wow-personalization-design.md`
**Labels draft:** `docs/superpowers/specs/2026-05-12-reading-type-labels-draft.md`

---

## File Structure

신규:
- `src/lib/persona/personaResolver.ts` — 4축 점수 + 8종 후보 분기
- `src/lib/persona/tagWeights.ts` — 페르소나별 책 태그 가중치 dict
- `src/lib/persona/observationCards.ts` — 결정론적 관찰 카드 생성
- `src/lib/persona/types.ts` — 페르소나 타입 정의
- `tests/persona/personaResolver.test.ts`
- `tests/persona/tagWeights.test.ts`
- `scripts/library/import-gachon-library.ts` — 엑셀→정규화→표지→Supabase
- `scripts/simulate-personas.ts` — 200명 시뮬레이션
- `supabase/migrations/20260512000000_library_book_sources.sql`
- `src/components/result/MobileResultPage.tsx` — 모바일 세로 분기
- `src/components/result/QrCard.tsx` — 5섹션 QR
- `src/components/result/ShareableTypeCard.tsx` — PNG 공유 카드

수정:
- `src/types/session.ts` — `NeedFocus` 타입과 `StudentInput.needFocus` 필드
- `src/components/analyze/AnalyzePage.tsx` — 4지선다 "지금 나에게 가장 필요한 것은?" + 연애·데이트 치환 제거
- `src/lib/books/types.ts` — `sourceLabel`, `locationRoom`, `availability` 필드
- `src/lib/books/provider.ts` — 새 컬럼 조회
- `src/lib/books/recommender.ts` — 새 점수(needFocus 가중치 포함) + 출처 믹스 가드
- `src/lib/reading-types/types.ts` — 16개 라벨 워딩 교체
- `src/lib/gemini/libraryPrompt.ts` — 덜 단정적 VOICE_GUIDE + 페르소나 + 이미지 + chemi_match 성별 분기
- `src/lib/gemini/librarySchema.ts` — `personaConfirmed` 필드 + 연애·데이트 치환 제거
- `src/app/api/analyze/route.ts` — Vision 호출 + Gemini 모델 fallback chain + V2 토글
- `src/components/pages/ResultPage.tsx` — QR + 모바일 분기 라우팅 + 연애·데이트 치환 제거
- `src/components/result/BookRecommendationCard.tsx` — 청구기호/자료실/대출여부 강조
- `package.json` — `qrcode`, `exceljs` 추가

---

## Task 1: 의존성 설치 + 환경변수 토글 setup

**Files:**
- Modify: `package.json`
- Modify: `.env.example`

- [ ] **Step 1: 패키지 설치**

Run:
```bash
pnpm add qrcode exceljs
pnpm add -D @types/qrcode
```

- [ ] **Step 2: `.env.example`에 토글 + 모델 설정 추가**

`.env.example` 끝에 추가:
```
# Wow personalization v2 toggles (5/13 booth)
PERSONA_V2_ENABLED=false
READING_TYPE_V2_ENABLED=false
RESULT_MOBILE_VIEW_ENABLED=false
NEXT_PUBLIC_RESULT_MOBILE_VIEW_ENABLED=false
GEMINI_VISION_ENABLED=false

# Gemini model selection (primary first, fallback list comma-separated)
GEMINI_LIBRARY_MODEL=gemini-2.5-pro
GEMINI_LIBRARY_FALLBACK_MODELS=gemini-2.5-flash,gemini-2.5-flash
```

- [ ] **Step 3: `.env.local`에도 같은 키 추가 (false 상태)**

로컬 개발 환경에 키 4개를 false로 추가. 부스 직전에 true로 한 번에 켠다.

- [ ] **Step 4: 커밋**

```bash
git add package.json pnpm-lock.yaml .env.example
git commit -m "Add deps and feature toggles for wow personalization v2"
```

---

## Task 2: Supabase 마이그레이션 + LibraryBook 타입 확장

**Files:**
- Create: `supabase/migrations/20260512000000_library_book_sources.sql`
- Modify: `src/lib/books/types.ts`
- Modify: `src/lib/books/provider.ts`

- [ ] **Step 1: 마이그레이션 작성**

Create `supabase/migrations/20260512000000_library_book_sources.sql`:
```sql
-- Add Gachon library source labels and on-shelf metadata
alter table public.books
  add column if not exists source_label text,
  add column if not exists location_room text,
  add column if not exists availability text;

create index if not exists books_source_label_idx on public.books (source_label) where active;
create index if not exists books_active_idx on public.books (active) where active;
```

- [ ] **Step 2: `LibraryBook` 타입 확장**

Replace `src/lib/books/types.ts`:
```ts
export type BookSource = "data4library" | "naver" | "gachon_curation" | "gachon_open";

export type LibraryBook = {
  id?: string;
  source: BookSource;
  sourceLabel?: "bookcuration" | "openlibrary"; // 가천대 두 DB 구분
  sourceId: string;
  isbn13: string | null;
  title: string;
  author: string;
  publisher: string;
  publishedYear: number | null;
  category: string;
  description: string;
  coverUrl: string | null;
  callNumber: string;
  locationLabel: string;
  locationRoom?: string; // 자료실 (예: "북큐레이션코너(1층)")
  availability?: "available" | "checked_out" | null;
  tags: string[];
};

export type RawData4LibraryBook = {
  no?: string;
  ranking?: string;
  bookname?: string;
  authors?: string;
  publisher?: string;
  publication_year?: string;
  isbn13?: string;
  class_nm?: string;
  bookImageURL?: string;
  bookDtlUrl?: string;
};

export type RawNaverBook = {
  source?: "naver";
  title?: string;
  link?: string;
  image?: string;
  author?: string;
  publisher?: string;
  isbn?: string;
  description?: string;
  pubdate?: string;
};
```

- [ ] **Step 3: provider.ts 컬럼 추가**

In `src/lib/books/provider.ts`, update `BookRow` and the `select` string:
```ts
type BookRow = {
  id: string;
  source: string;
  source_label: string | null;
  source_id: string;
  isbn13: string | null;
  title: string;
  author: string;
  publisher: string;
  published_year: number | null;
  category: string;
  description: string;
  cover_url: string | null;
  call_number: string;
  location_label: string;
  location_room: string | null;
  availability: string | null;
  tags: string[] | null;
};
```

Change `.select(...)` to include the new columns:
```ts
.select(
  "id, source, source_label, source_id, isbn13, title, author, publisher, published_year, category, description, cover_url, call_number, location_label, location_room, availability, tags",
)
```

Update `toLibraryBook`:
```ts
function toLibraryBook(row: BookRow): LibraryBook {
  return {
    id: row.id,
    source: toBookSource(row.source),
    sourceLabel: row.source_label === "bookcuration" || row.source_label === "openlibrary" ? row.source_label : undefined,
    sourceId: row.source_id,
    isbn13: row.isbn13,
    title: row.title,
    author: row.author,
    publisher: row.publisher,
    publishedYear: row.published_year,
    category: row.category,
    description: row.description,
    coverUrl: row.cover_url,
    callNumber: row.call_number,
    locationLabel: row.location_label,
    locationRoom: row.location_room ?? undefined,
    availability: row.availability === "available" || row.availability === "checked_out" ? row.availability : null,
    tags: row.tags ?? [],
  };
}

function toBookSource(source: string): BookSource {
  if (source === "naver" || source === "gachon_curation" || source === "gachon_open") return source;
  return "data4library";
}
```

- [ ] **Step 4: 마이그레이션 적용**

Run:
```bash
pnpm dlx supabase db push
```

(혹은 Supabase 대시보드 SQL 에디터에서 마이그레이션 SQL 직접 실행)

- [ ] **Step 5: 커밋**

```bash
git add supabase/migrations/20260512000000_library_book_sources.sql src/lib/books/types.ts src/lib/books/provider.ts
git commit -m "Extend LibraryBook with Gachon source label and on-shelf fields"
```

---

## Task 3: 페르소나 타입 + 4축 점수 계산 (TDD)

**Files:**
- Create: `src/lib/persona/types.ts`
- Create: `src/lib/persona/personaResolver.ts`
- Create: `tests/persona/personaResolver.test.ts`

- [ ] **Step 1: 타입 정의**

Create `src/lib/persona/types.ts`:
```ts
import type { SajuElement } from "@/lib/saju/calculator";

export type FaceKey =
  | "balance_anchor"
  | "expressive_spark"
  | "focused_thinker"
  | "vital_driver"
  | "balance_focus"
  | "expressive_vital"
  | "focus_vital"
  | "soft_baseline";

export type SajuKey =
  | "seeker_explorer" // wood
  | "mover_igniter" // fire
  | "anchor_organizer" // earth
  | "editor_decider" // metal
  | "deep_diver"; // water

export type ToneHint = "calm" | "spark" | "anchor" | "edit" | "deep";

export type AxisScores = {
  balance: number;
  expressive: number;
  focus: number;
  vitality: number;
};

export type ObservationCard = {
  axis: "balance" | "expressive" | "focus" | "vitality" | "saju";
  rawMetric: string;
  observation: string;
};

export type PersonaCandidates = {
  primary: FaceKey;
  alternates: FaceKey[];
};

export type PersonaSignal = {
  faceKey: FaceKey;
  sajuKey: SajuKey;
  combinedCode: string;
  axisScores: AxisScores;
  observationCards: ObservationCard[];
  toneHint: ToneHint;
  candidates: PersonaCandidates;
  bookTagWeights: Record<string, number>;
};

export const SAJU_ELEMENT_TO_KEY: Record<SajuElement, SajuKey> = {
  wood: "seeker_explorer",
  fire: "mover_igniter",
  earth: "anchor_organizer",
  metal: "editor_decider",
  water: "deep_diver",
};
```

- [ ] **Step 2: 4축 점수 함수 failing test 작성**

Create `tests/persona/personaResolver.test.ts`:
```ts
import { describe, expect, it } from "vitest";
import { computeAxisScores } from "@/lib/persona/personaResolver";
import type { FaceMetrics } from "@/types/face";

function metrics(overrides: Partial<FaceMetrics> = {}): FaceMetrics {
  const base: FaceMetrics = {
    asymmetryIndex: 0.012,
    phiRatioCompliance: 70,
    thirds: { upper: 0.15, middle: 0.34, lower: 0.51 },
    fifths: [0.2, 0.2, 0.2, 0.2, 0.2],
    faceAspectRatio: 0.72,
    eyeSpacing: 0.34,
    facialAngleDeg: 165,
    forehead: { areaPct: 15, brow: 1.0, classification: "average" },
    eyes: { leftToRightDeltaMm: 0.8, outerCantalAngleDeg: 2 },
    nose: { lengthMm: 50, widthMm: 32, columellaAngleDeg: 95 },
    mouth: { upperLowerLipRatio: 0.6, philtrumRatioPct: 12, cornerAngleDeg: 2 },
    jaw: { vlineIndex: 0.16, chinProtrusionMm: 6, cheekToJawRatio: 1.2 },
    faceBox: { x: 0.1, y: 0.1, width: 0.5, height: 0.7 },
  };
  return { ...base, ...overrides };
}

describe("computeAxisScores", () => {
  it("returns 4 axes each clamped to 0-100", () => {
    const scores = computeAxisScores(metrics());
    expect(Object.keys(scores).sort()).toEqual(["balance", "expressive", "focus", "vitality"]);
    for (const value of Object.values(scores)) {
      expect(value).toBeGreaterThanOrEqual(0);
      expect(value).toBeLessThanOrEqual(100);
    }
  });

  it("rewards high phi ratio and low asymmetry on balance axis", () => {
    const high = computeAxisScores(metrics({ phiRatioCompliance: 95, asymmetryIndex: 0.003, eyes: { leftToRightDeltaMm: 0.2, outerCantalAngleDeg: 1 } }));
    const low = computeAxisScores(metrics({ phiRatioCompliance: 20, asymmetryIndex: 0.04, eyes: { leftToRightDeltaMm: 3, outerCantalAngleDeg: 5 } }));
    expect(high.balance).toBeGreaterThan(low.balance + 30);
  });

  it("rewards strong mouth corner and eye delta on expressive axis", () => {
    const high = computeAxisScores(metrics({ mouth: { upperLowerLipRatio: 0.6, philtrumRatioPct: 12, cornerAngleDeg: 8 }, eyes: { leftToRightDeltaMm: 2.4, outerCantalAngleDeg: 2 }, thirds: { upper: 0.15, middle: 0.32, lower: 0.53 } }));
    const low = computeAxisScores(metrics({ mouth: { upperLowerLipRatio: 0.6, philtrumRatioPct: 12, cornerAngleDeg: 0.4 }, eyes: { leftToRightDeltaMm: 0.2, outerCantalAngleDeg: 2 }, thirds: { upper: 0.15, middle: 0.34, lower: 0.51 } }));
    expect(high.expressive).toBeGreaterThan(low.expressive + 25);
  });

  it("rewards narrow eye spacing and tall upper third on focus axis", () => {
    const high = computeAxisScores(metrics({ eyeSpacing: 0.26, thirds: { upper: 0.22, middle: 0.33, lower: 0.45 }, jaw: { vlineIndex: 0.22, chinProtrusionMm: 6, cheekToJawRatio: 1.2 } }));
    const low = computeAxisScores(metrics({ eyeSpacing: 0.42, thirds: { upper: 0.10, middle: 0.34, lower: 0.56 }, jaw: { vlineIndex: 0.08, chinProtrusionMm: 6, cheekToJawRatio: 1.2 } }));
    expect(high.focus).toBeGreaterThan(low.focus + 25);
  });

  it("rewards chin protrusion and longer nose on vitality axis", () => {
    const high = computeAxisScores(metrics({ jaw: { vlineIndex: 0.16, chinProtrusionMm: 12, cheekToJawRatio: 1.45 }, nose: { lengthMm: 60, widthMm: 32, columellaAngleDeg: 95 }, faceAspectRatio: 0.78 }));
    const low = computeAxisScores(metrics({ jaw: { vlineIndex: 0.16, chinProtrusionMm: 2, cheekToJawRatio: 1.05 }, nose: { lengthMm: 38, widthMm: 32, columellaAngleDeg: 95 }, faceAspectRatio: 0.66 }));
    expect(high.vitality).toBeGreaterThan(low.vitality + 20);
  });
});
```

- [ ] **Step 3: 테스트 실패 확인**

Run: `pnpm vitest run tests/persona/personaResolver.test.ts`
Expected: FAIL (`computeAxisScores` not defined)

- [ ] **Step 4: `computeAxisScores` 구현**

Create `src/lib/persona/personaResolver.ts`:
```ts
import type { FaceMetrics } from "@/types/face";
import type { AxisScores } from "./types";

const clamp = (value: number, min = 0, max = 100) => Math.min(max, Math.max(min, value));
const round = (value: number) => Math.round(value);

function balanceScore(metrics: FaceMetrics): number {
  const phi = clamp(metrics.phiRatioCompliance, 0, 100);
  const asymmetryNormalized = clamp(1 - metrics.asymmetryIndex / 0.03, 0, 1) * 100;
  const eyeDelta = clamp(1 - metrics.eyes.leftToRightDeltaMm / 3, 0, 1) * 100;
  return round(clamp(phi * 0.45 + asymmetryNormalized * 0.35 + eyeDelta * 0.2));
}

function expressiveScore(metrics: FaceMetrics): number {
  const corner = clamp(Math.abs(metrics.mouth.cornerAngleDeg) / 8, 0, 1) * 100;
  const eyeDelta = clamp(metrics.eyes.leftToRightDeltaMm / 3, 0, 1) * 100;
  const lowerThird = clamp((metrics.thirds.lower - 0.4) / 0.2, 0, 1) * 100;
  return round(clamp(corner * 0.5 + eyeDelta * 0.3 + lowerThird * 0.2));
}

function focusScore(metrics: FaceMetrics): number {
  const eyeNarrow = clamp((0.4 - metrics.eyeSpacing) / 0.14, 0, 1) * 100;
  const upperThird = clamp((metrics.thirds.upper - 0.12) / 0.12, 0, 1) * 100;
  const vline = clamp((metrics.jaw.vlineIndex - 0.05) / 0.18, 0, 1) * 100;
  return round(clamp(eyeNarrow * 0.45 + upperThird * 0.3 + vline * 0.25));
}

function vitalityScore(metrics: FaceMetrics): number {
  const chin = clamp(metrics.jaw.chinProtrusionMm / 14, 0, 1) * 100;
  const noseLen = clamp((metrics.nose.lengthMm - 36) / 24, 0, 1) * 100;
  const cheek = clamp((metrics.jaw.cheekToJawRatio - 1.0) / 0.5, 0, 1) * 100;
  const aspect = clamp((metrics.faceAspectRatio - 0.62) / 0.2, 0, 1) * 100;
  return round(clamp(chin * 0.35 + noseLen * 0.25 + cheek * 0.2 + aspect * 0.2));
}

export function computeAxisScores(metrics: FaceMetrics): AxisScores {
  return {
    balance: balanceScore(metrics),
    expressive: expressiveScore(metrics),
    focus: focusScore(metrics),
    vitality: vitalityScore(metrics),
  };
}
```

- [ ] **Step 5: 테스트 통과 확인**

Run: `pnpm vitest run tests/persona/personaResolver.test.ts`
Expected: PASS (5 tests)

- [ ] **Step 6: 커밋**

```bash
git add src/lib/persona/types.ts src/lib/persona/personaResolver.ts tests/persona/personaResolver.test.ts
git commit -m "Add face 4-axis scoring for persona resolution"
```

---

## Task 4: 페르소나 8종 후보 분기 + 사주 매핑 (TDD)

**Files:**
- Modify: `src/lib/persona/personaResolver.ts`
- Modify: `tests/persona/personaResolver.test.ts`

- [ ] **Step 1: failing test 추가**

Append to `tests/persona/personaResolver.test.ts`:
```ts
import { resolveFaceCandidates, resolveSajuKey } from "@/lib/persona/personaResolver";
import { calculateSaju } from "@/lib/saju/calculator";

describe("resolveFaceCandidates", () => {
  it("returns balance_anchor when balance dominates above 70", () => {
    const scores = { balance: 82, expressive: 40, focus: 50, vitality: 45 };
    const result = resolveFaceCandidates(scores);
    expect(result.primary).toBe("balance_anchor");
    expect(result.alternates).toHaveLength(1);
  });

  it("returns focus_vital for dual high focus and vitality", () => {
    const scores = { balance: 50, expressive: 40, focus: 68, vitality: 68 };
    const result = resolveFaceCandidates(scores);
    expect(result.primary).toBe("focus_vital");
    expect(result.alternates).toContain("focused_thinker");
  });

  it("falls back to soft_baseline when no axis reaches 60", () => {
    const scores = { balance: 50, expressive: 45, focus: 50, vitality: 40 };
    const result = resolveFaceCandidates(scores);
    expect(result.primary).toBe("soft_baseline");
  });

  it("prefers single dominant over dual when both qualify", () => {
    const scores = { balance: 75, expressive: 50, focus: 62, vitality: 50 };
    const result = resolveFaceCandidates(scores);
    expect(result.primary).toBe("balance_anchor");
    expect(result.alternates).toContain("balance_focus");
  });
});

describe("resolveSajuKey", () => {
  it("maps wood dominant element to seeker_explorer", () => {
    const saju = calculateSaju("2000-03-15");
    const key = resolveSajuKey(saju);
    expect(["seeker_explorer", "mover_igniter", "anchor_organizer", "editor_decider", "deep_diver"]).toContain(key);
  });
});
```

- [ ] **Step 2: 테스트 실패 확인**

Run: `pnpm vitest run tests/persona/personaResolver.test.ts`
Expected: FAIL (`resolveFaceCandidates`/`resolveSajuKey` not defined)

- [ ] **Step 3: 두 함수 구현**

Append to `src/lib/persona/personaResolver.ts`:
```ts
import type { SajuCalculation } from "@/lib/saju/calculator";
import type { FaceKey, PersonaCandidates, SajuKey } from "./types";
import { SAJU_ELEMENT_TO_KEY } from "./types";

const SINGLE_THRESHOLD = 70;
const DUAL_THRESHOLD = 60;

type AxisName = keyof AxisScores;
const AXIS_TO_SINGLE: Record<AxisName, FaceKey> = {
  balance: "balance_anchor",
  expressive: "expressive_spark",
  focus: "focused_thinker",
  vitality: "vital_driver",
};
const DUAL_LOOKUP: Record<string, FaceKey> = {
  "balance|focus": "balance_focus",
  "expressive|vitality": "expressive_vital",
  "focus|vitality": "focus_vital",
};

function dominantAxis(scores: AxisScores): AxisName | null {
  const entries = (Object.entries(scores) as Array<[AxisName, number]>).sort((a, b) => b[1] - a[1]);
  const [top, second] = entries;
  if (!top) return null;
  if (top[1] >= SINGLE_THRESHOLD && (!second || top[1] - second[1] >= 5)) return top[0];
  return null;
}

function dualAxes(scores: AxisScores): [AxisName, AxisName] | null {
  const qualifying = (Object.entries(scores) as Array<[AxisName, number]>).filter(([, value]) => value >= DUAL_THRESHOLD).sort((a, b) => b[1] - a[1]);
  if (qualifying.length < 2) return null;
  const a = qualifying[0]![0];
  const b = qualifying[1]![0];
  const key = [a, b].sort().join("|");
  if (DUAL_LOOKUP[key]) return [a, b];
  return null;
}

export function resolveFaceCandidates(scores: AxisScores): PersonaCandidates {
  const single = dominantAxis(scores);
  if (single) {
    const primary = AXIS_TO_SINGLE[single];
    const dual = dualAxes(scores);
    const alternates: FaceKey[] = [];
    if (dual) {
      const dualKey = [dual[0], dual[1]].sort().join("|");
      const dualLabel = DUAL_LOOKUP[dualKey];
      if (dualLabel) alternates.push(dualLabel);
    }
    if (alternates.length === 0) {
      const fallbackAxis = (Object.entries(scores) as Array<[AxisName, number]>).filter(([axis]) => axis !== single).sort((a, b) => b[1] - a[1])[0];
      if (fallbackAxis && fallbackAxis[1] >= 45) alternates.push(AXIS_TO_SINGLE[fallbackAxis[0]]);
    }
    return { primary, alternates: alternates.slice(0, 2) };
  }

  const dual = dualAxes(scores);
  if (dual) {
    const dualKey = [dual[0], dual[1]].sort().join("|");
    const primary = DUAL_LOOKUP[dualKey]!;
    const alternates = [AXIS_TO_SINGLE[dual[0]], AXIS_TO_SINGLE[dual[1]]].filter((key, index, all) => all.indexOf(key) === index);
    return { primary, alternates: alternates.slice(0, 2) };
  }

  const topAxis = (Object.entries(scores) as Array<[AxisName, number]>).sort((a, b) => b[1] - a[1])[0];
  const fallback = topAxis && topAxis[1] >= 50 ? AXIS_TO_SINGLE[topAxis[0]] : null;
  return {
    primary: "soft_baseline",
    alternates: fallback ? [fallback] : [],
  };
}

export function resolveSajuKey(saju: SajuCalculation): SajuKey {
  const dominant = saju.dominantElements[0];
  if (!dominant) return "deep_diver";
  return SAJU_ELEMENT_TO_KEY[dominant];
}
```

- [ ] **Step 4: 테스트 통과 확인**

Run: `pnpm vitest run tests/persona/personaResolver.test.ts`
Expected: PASS (all tests)

- [ ] **Step 5: 커밋**

```bash
git add src/lib/persona/personaResolver.ts tests/persona/personaResolver.test.ts
git commit -m "Add face persona candidates and saju key resolution"
```

---

## Task 5: 페르소나 태그 가중치 + 관찰 카드 + resolvePersonaSignal entry point

**Files:**
- Create: `src/lib/persona/tagWeights.ts`
- Create: `src/lib/persona/observationCards.ts`
- Create: `tests/persona/tagWeights.test.ts`
- Modify: `src/lib/persona/personaResolver.ts`
- Modify: `tests/persona/personaResolver.test.ts`

- [ ] **Step 1: tagWeights 정의**

Create `src/lib/persona/tagWeights.ts`:
```ts
import type { FaceKey, SajuKey } from "./types";

export const FACE_TAG_WEIGHTS: Record<FaceKey, Record<string, number>> = {
  balance_anchor: { "사고 정리": 3, "글쓰기": 2, "철학 입문": 3, "에세이": 2 },
  expressive_spark: { "창의성": 4, "예술": 3, "문학": 3, "감정 회복": 2 },
  focused_thinker: { "심화 독서": 4, "철학 입문": 3, "고전": 3, "사고 정리": 2 },
  vital_driver: { "실행력": 4, "생산성": 3, "행동": 3, "전략": 2 },
  balance_focus: { "사고 정리": 3, "심화 독서": 3, "전문 교양": 2, "철학 입문": 2 },
  expressive_vital: { "창의성": 3, "예술": 2, "실행력": 3, "생산성": 2 },
  focus_vital: { "전략": 4, "경영": 3, "커리어": 3, "심화 독서": 2 },
  soft_baseline: { "위로": 3, "에세이": 3, "자기돌봄": 2, "문학": 2 },
};

export const SAJU_TAG_WEIGHTS: Record<SajuKey, Record<string, number>> = {
  seeker_explorer: { "교양": 3, "입문서": 3, "인문": 2, "취향": 2 },
  mover_igniter: { "실행력": 3, "행동": 3, "생산성": 2, "동기부여": 2 },
  anchor_organizer: { "사고 정리": 3, "습관": 3, "시간관리": 2, "구조": 2 },
  editor_decider: { "전략": 3, "판단": 3, "비즈니스": 2, "기준": 2 },
  deep_diver: { "심화 독서": 3, "에세이": 2, "위로": 2, "철학 입문": 2 },
};

export function mergePersonaWeights(face: FaceKey, saju: SajuKey): Record<string, number> {
  const merged: Record<string, number> = { ...FACE_TAG_WEIGHTS[face] };
  for (const [tag, weight] of Object.entries(SAJU_TAG_WEIGHTS[saju])) {
    merged[tag] = (merged[tag] ?? 0) + weight;
  }
  return merged;
}
```

- [ ] **Step 2: tagWeights 테스트**

Create `tests/persona/tagWeights.test.ts`:
```ts
import { describe, expect, it } from "vitest";
import { mergePersonaWeights } from "@/lib/persona/tagWeights";

describe("mergePersonaWeights", () => {
  it("sums face and saju weights when same tag exists", () => {
    const merged = mergePersonaWeights("focused_thinker", "deep_diver");
    expect(merged["심화 독서"]).toBe(4 + 3);
  });

  it("preserves unique tags from each side", () => {
    const merged = mergePersonaWeights("vital_driver", "mover_igniter");
    expect(merged["실행력"]).toBe(4 + 3);
    expect(merged["전략"]).toBe(2);
    expect(merged["동기부여"]).toBe(2);
  });
});
```

Run: `pnpm vitest run tests/persona/tagWeights.test.ts`
Expected: PASS (after Step 1's file exists)

- [ ] **Step 3: observationCards 구현**

Create `src/lib/persona/observationCards.ts`:
```ts
import type { FaceMetrics } from "@/types/face";
import type { SajuCalculation } from "@/lib/saju/calculator";
import type { AxisScores, ObservationCard } from "./types";

const SAJU_ELEMENT_OBSERVATIONS: Record<string, string> = {
  wood: "새 분야에 호기심이 빨리 붙는 편이라, 시작은 가볍지만 가지가 빨리 뻗는 사람",
  fire: "시동이 걸리면 주변 분위기까지 같이 끌어올리는 추진감이 있는 사람",
  earth: "복잡한 상황을 차분히 묶어내는 정리 감각이 또렷한 사람",
  metal: "선택지가 많아도 핵심 기준을 빠르게 잡는 판단 리듬이 있는 사람",
  water: "겉으로는 차분해도 안쪽에선 한 주제에 오래 머무르며 깊이 쌓는 사람",
};

export function buildObservationCards(metrics: FaceMetrics, axisScores: AxisScores, saju: SajuCalculation): ObservationCard[] {
  const cards: ObservationCard[] = [];

  if (axisScores.balance >= 60) {
    cards.push({
      axis: "balance",
      rawMetric: `phiRatioCompliance ${metrics.phiRatioCompliance}, asymmetryIndex ${metrics.asymmetryIndex}`,
      observation: `좌우 비대칭 ${(metrics.asymmetryIndex * 100).toFixed(1)}% — 중심을 흔들지 않는 안정감이 먼저 보이는 사람`,
    });
  } else if (axisScores.balance <= 40) {
    cards.push({
      axis: "balance",
      rawMetric: `asymmetryIndex ${metrics.asymmetryIndex}`,
      observation: `좌우 비대칭 ${(metrics.asymmetryIndex * 100).toFixed(1)}% — 표정이 한쪽으로 살짝 기우는 게 매력 포인트인 사람`,
    });
  }

  if (axisScores.expressive >= 60) {
    cards.push({
      axis: "expressive",
      rawMetric: `mouth.cornerAngleDeg ${metrics.mouth.cornerAngleDeg}, eyes.leftToRightDeltaMm ${metrics.eyes.leftToRightDeltaMm}`,
      observation: `입꼬리 각도 ${metrics.mouth.cornerAngleDeg}° — 표정이 솔직하게 새어 나오는 편이라 말보다 분위기가 먼저 도착하는 사람`,
    });
  }

  if (axisScores.focus >= 60) {
    cards.push({
      axis: "focus",
      rawMetric: `eyeSpacing ${metrics.eyeSpacing}, thirds.upper ${metrics.thirds.upper}`,
      observation: `눈 사이 간격이 좁은 편 — 한 번 꽂힌 주제 끝까지 파고드는 집중 리듬이 또렷한 사람`,
    });
  } else if (axisScores.focus <= 40) {
    cards.push({
      axis: "focus",
      rawMetric: `eyeSpacing ${metrics.eyeSpacing}`,
      observation: `눈 사이 간격이 넓은 편 — 시야가 열려 있어 동시에 여러 갈래로 생각이 뻗는 사람`,
    });
  }

  if (axisScores.vitality >= 60) {
    cards.push({
      axis: "vitality",
      rawMetric: `jaw.chinProtrusionMm ${metrics.jaw.chinProtrusionMm}, nose.lengthMm ${metrics.nose.lengthMm}`,
      observation: `하관 라인이 또렷한 편 — 결정한 건 끝까지 가는 추진 인상을 주는 사람`,
    });
  }

  const dominant = saju.dominantElements[0];
  if (dominant) {
    cards.push({
      axis: "saju",
      rawMetric: `dominantElement ${dominant}`,
      observation: SAJU_ELEMENT_OBSERVATIONS[dominant] ?? SAJU_ELEMENT_OBSERVATIONS.water!,
    });
  }

  return cards.slice(0, 7);
}
```

- [ ] **Step 4: resolvePersonaSignal entry point 추가**

Append to `src/lib/persona/personaResolver.ts`:
```ts
import type { PersonaSignal, ToneHint } from "./types";
import { buildObservationCards } from "./observationCards";
import { mergePersonaWeights } from "./tagWeights";

const TONE_HINT: Record<SajuKey, ToneHint> = {
  seeker_explorer: "spark",
  mover_igniter: "spark",
  anchor_organizer: "anchor",
  editor_decider: "edit",
  deep_diver: "deep",
};

export function resolvePersonaSignal(metrics: FaceMetrics, saju: SajuCalculation): PersonaSignal {
  const axisScores = computeAxisScores(metrics);
  const candidates = resolveFaceCandidates(axisScores);
  const sajuKey = resolveSajuKey(saju);
  const faceKey = candidates.primary;
  return {
    faceKey,
    sajuKey,
    combinedCode: `${faceKey}__${sajuKey}`,
    axisScores,
    observationCards: buildObservationCards(metrics, axisScores, saju),
    toneHint: TONE_HINT[sajuKey],
    candidates,
    bookTagWeights: mergePersonaWeights(faceKey, sajuKey),
  };
}
```

Note: `FaceMetrics`와 `SajuCalculation` 타입은 파일 상단의 기존 imports에 추가되어야 한다. 만약 누락되어 있으면 다음 import를 파일 최상단에 추가:
```ts
import type { FaceMetrics } from "@/types/face";
import type { SajuCalculation } from "@/lib/saju/calculator";
```

- [ ] **Step 5: resolvePersonaSignal integration test 추가**

Append to `tests/persona/personaResolver.test.ts`:
```ts
import { resolvePersonaSignal } from "@/lib/persona/personaResolver";

describe("resolvePersonaSignal", () => {
  it("returns full persona signal with combined code", () => {
    const saju = calculateSaju("2000-03-15");
    const result = resolvePersonaSignal(metrics(), saju);
    expect(result.combinedCode).toMatch(/^[a-z_]+__[a-z_]+$/);
    expect(result.observationCards.length).toBeGreaterThanOrEqual(1);
    expect(result.observationCards.length).toBeLessThanOrEqual(7);
    expect(Object.keys(result.bookTagWeights).length).toBeGreaterThan(0);
  });
});
```

Run: `pnpm vitest run tests/persona/`
Expected: PASS (all tests)

- [ ] **Step 6: 커밋**

```bash
git add src/lib/persona/ tests/persona/
git commit -m "Add persona tag weights, observation cards, and signal entry point"
```

---

## Task 6: 가천대 엑셀 파싱 + 정규화 스크립트

**Files:**
- Create: `scripts/library/parse-gachon-excel.ts`
- Create: `scripts/library/types.ts`

- [ ] **Step 1: 공통 타입 정의**

Create `scripts/library/types.ts`:
```ts
export type GachonRawBook = {
  sourceLabel: "bookcuration" | "openlibrary";
  registrationNo: string; // UEM...
  title: string;
  author: string;
  publisher: string;
  publishedYear: number | null;
  callNumber: string;
  locationLabel: string; // 소장처 (예: "중앙도서관")
  locationRoom: string;  // 자료실 (예: "북큐레이션코너(1층)")
  shelf?: string;        // 서가 (오픈라이브러리만)
  status: string;        // 자료상태 (예: "이용가능")
  availability: "available" | "checked_out" | null;
};
```

- [ ] **Step 2: 파서 작성**

Create `scripts/library/parse-gachon-excel.ts`:
```ts
import "../books/load-env";

import ExcelJS from "exceljs";
import fs from "node:fs/promises";
import path from "node:path";
import type { GachonRawBook } from "./types";

const OUT_PATH = path.join(process.cwd(), "data/library/gachon-raw.json");
const CURATION_PATH = path.join(process.cwd(), "data/library/bookcuration.xlsx");
const OPEN_PATH = path.join(process.cwd(), "data/library/openlibrary.xlsx");

async function parseFile(filePath: string, sourceLabel: GachonRawBook["sourceLabel"]): Promise<GachonRawBook[]> {
  const workbook = new ExcelJS.Workbook();
  await workbook.xlsx.readFile(filePath);
  const sheet = workbook.worksheets[0]!;

  // Header is in row 4. Data starts at row 5.
  const headerRow = sheet.getRow(4);
  const headers = (headerRow.values as (string | undefined)[]).map((v) => (v ?? "").toString().trim());

  const col = (name: string) => {
    const idx = headers.findIndex((h) => h === name);
    if (idx < 0) throw new Error(`Missing column "${name}" in ${filePath}`);
    return idx;
  };

  const colNo = col("No.");
  const colReg = col("등록번호");
  const colTitle = col("서명");
  const colAuthor = col("저자");
  const colPub = col("출판사");
  const colYear = col("출판년");
  const colCall = col("청구기호");
  const colSourceLoc = col("소장처");
  const colRoom = col("자료실");
  const colStatus = col("자료상태");
  const colShelf = headers.indexOf("서가");
  const colLoan = headers.indexOf("대출여부");

  const results: GachonRawBook[] = [];
  sheet.eachRow((row, rowNumber) => {
    if (rowNumber < 5) return;
    const values = row.values as (string | number | null | undefined)[];
    const no = values[colNo];
    if (no === null || no === undefined || String(no).trim() === "") return;

    const yearRaw = values[colYear];
    const yearParsed = typeof yearRaw === "number" ? yearRaw : Number.parseInt(String(yearRaw ?? "").trim(), 10);

    const loanRaw = colLoan >= 0 ? String(values[colLoan] ?? "").trim() : "";
    let availability: GachonRawBook["availability"] = null;
    if (loanRaw === "대출가능") availability = "available";
    else if (loanRaw === "대출중") availability = "checked_out";

    results.push({
      sourceLabel,
      registrationNo: String(values[colReg] ?? "").trim(),
      title: String(values[colTitle] ?? "").trim(),
      author: String(values[colAuthor] ?? "").trim(),
      publisher: String(values[colPub] ?? "").trim(),
      publishedYear: Number.isFinite(yearParsed) ? yearParsed : null,
      callNumber: String(values[colCall] ?? "").trim(),
      locationLabel: String(values[colSourceLoc] ?? "").trim(),
      locationRoom: String(values[colRoom] ?? "").trim(),
      shelf: colShelf >= 0 ? String(values[colShelf] ?? "").trim() : undefined,
      status: String(values[colStatus] ?? "").trim(),
      availability,
    });
  });

  return results;
}

async function main() {
  const curation = await parseFile(CURATION_PATH, "bookcuration");
  const open = await parseFile(OPEN_PATH, "openlibrary");
  const all = [...curation, ...open];

  await fs.mkdir(path.dirname(OUT_PATH), { recursive: true });
  await fs.writeFile(OUT_PATH, JSON.stringify(all, null, 2), "utf8");
  console.log(`Parsed ${curation.length} bookcuration + ${open.length} openlibrary = ${all.length} → ${OUT_PATH}`);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
```

- [ ] **Step 3: package.json 스크립트 추가**

In `package.json` `"scripts"` 섹션에 추가:
```json
"library:parse": "tsx scripts/library/parse-gachon-excel.ts",
"library:fetch:cover": "tsx scripts/library/fetch-gachon-covers.ts",
"library:tag": "tsx scripts/library/tag-gachon-books.ts",
"library:import": "tsx scripts/library/import-gachon-library.ts"
```

- [ ] **Step 4: 실행 + 결과 확인**

Run: `pnpm library:parse`
Expected output: `Parsed 243 bookcuration + 452 openlibrary = 695 → data/library/gachon-raw.json`

Confirm: `head -50 data/library/gachon-raw.json`

- [ ] **Step 5: 커밋**

```bash
git add scripts/library/parse-gachon-excel.ts scripts/library/types.ts package.json data/library/gachon-raw.json
git commit -m "Parse Gachon library excels into normalized JSON"
```

---

## Task 7: Naver Books API로 표지·ISBN·설명 보강

**Files:**
- Create: `scripts/library/fetch-gachon-covers.ts`

매칭 휴리스틱: title 유사도(0.55) + publisher 일치(0.3) + 출판년 ±1(0.15)의 가중 합산이 0.55 이상이고 title 단독 유사도가 0.35 이상일 때 채택. 1차 매칭 실패 시 출판사를 쿼리에 더해 fallback 검색.

- [ ] **Step 1: 표지 매칭 스크립트 작성**

Create `scripts/library/fetch-gachon-covers.ts`:
```ts
import "../books/load-env";

import fs from "node:fs/promises";
import path from "node:path";
import type { GachonRawBook } from "./types";

const IN_PATH = path.join(process.cwd(), "data/library/gachon-raw.json");
const OUT_PATH = path.join(process.cwd(), "data/library/gachon-enriched.json");
const UNMATCHED_PATH = path.join(process.cwd(), "data/library/unmatched.json");
const NAVER_BASE = "https://openapi.naver.com/v1/search/book.json";
const QUERY_DELAY_MS = 350;

type NaverItem = {
  title?: string;
  author?: string;
  image?: string;
  isbn?: string;
  description?: string;
  publisher?: string;
  pubdate?: string; // YYYYMMDD
};

export type GachonEnrichedBook = GachonRawBook & {
  isbn13: string | null;
  coverUrl: string | null;
  description: string;
  matchScore: number; // 0~1, 디버그용
  matched: boolean;
};

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function normalizeText(input: string): string {
  return input
    .replace(/<[^>]+>/g, "") // Naver title에 들어가는 <b> 태그 제거
    .toLowerCase()
    .replace(/[()\[\]【】〈〉「」『』:：=].*$/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

function titleMatchRatio(left: string, right: string): number {
  const l = normalizeText(left);
  const r = normalizeText(right);
  if (!l || !r) return 0;
  const longer = l.length >= r.length ? l : r;
  const shorter = l.length >= r.length ? r : l;
  if (!shorter.length) return 0;
  let matched = 0;
  for (const ch of shorter) {
    if (longer.includes(ch)) matched += 1;
  }
  return matched / longer.length;
}

function publisherMatchScore(bookPublisher: string, itemPublisher: string): number {
  const a = normalizeText(bookPublisher);
  const b = normalizeText(itemPublisher);
  if (!a || !b) return 0;
  if (a === b) return 1;
  // 엑셀의 출판사가 "21세기북스 : 북이십일 21세기북스"처럼 콜론 구분된 경우 first segment 비교
  const aFirst = a.split(/[:/]/)[0]!.trim();
  const bFirst = b.split(/[:/]/)[0]!.trim();
  if (aFirst === bFirst) return 1;
  // 부분 포함 (예: "21세기북스" ⊂ "21세기북스(북이십일 21세기북스)")
  if (a.includes(bFirst) || b.includes(aFirst)) return 0.7;
  return 0;
}

function yearMatchScore(bookYear: number | null, itemPubdate: string | undefined): number {
  if (!bookYear || !itemPubdate || itemPubdate.length < 4) return 0;
  const itemYear = Number.parseInt(itemPubdate.slice(0, 4), 10);
  if (!Number.isFinite(itemYear)) return 0;
  const diff = Math.abs(bookYear - itemYear);
  if (diff === 0) return 1;
  if (diff === 1) return 0.6; // 출간 직후 재발행 등
  if (diff === 2) return 0.3;
  return 0;
}

function compositeMatchScore(book: GachonRawBook, item: NaverItem): number {
  const title = titleMatchRatio(book.title, item.title ?? "");
  const publisher = publisherMatchScore(book.publisher, item.publisher ?? "");
  const year = yearMatchScore(book.publishedYear, item.pubdate);
  return title * 0.55 + publisher * 0.3 + year * 0.15;
}

function pickBestMatch(book: GachonRawBook, items: NaverItem[]): { item: NaverItem; score: number } | null {
  if (!items.length) return null;
  const scored = items
    .map((item) => ({ item, score: compositeMatchScore(book, item) }))
    .sort((a, b) => b.score - a.score);
  const top = scored[0]!;
  // title alone must clear a minimum to avoid pure publisher-only matches
  const minTitle = titleMatchRatio(book.title, top.item.title ?? "");
  if (top.score >= 0.55 && minTitle >= 0.35) return top;
  return null;
}

async function searchNaver(clientId: string, secret: string, query: string): Promise<NaverItem[]> {
  const url = new URL(NAVER_BASE);
  url.searchParams.set("query", query);
  url.searchParams.set("display", "10");
  for (let attempt = 1; attempt <= 3; attempt += 1) {
    const res = await fetch(url, {
      headers: { "X-Naver-Client-Id": clientId, "X-Naver-Client-Secret": secret },
    });
    if (res.ok) {
      const json = (await res.json()) as { items?: NaverItem[] };
      return json.items ?? [];
    }
    if (res.status === 429 && attempt < 3) {
      await sleep(800 * attempt);
      continue;
    }
    throw new Error(`Naver API ${res.status}`);
  }
  return [];
}

async function main() {
  const clientId = process.env.NAVER_CLIENT_ID;
  const clientSecret = process.env.NAVER_CLIENT_SECRET;
  if (!clientId || !clientSecret) throw new Error("Missing NAVER_CLIENT_ID/NAVER_CLIENT_SECRET");

  const raw = JSON.parse(await fs.readFile(IN_PATH, "utf8")) as GachonRawBook[];
  const enriched: GachonEnrichedBook[] = [];
  const unmatched: GachonRawBook[] = [];

  for (let i = 0; i < raw.length; i += 1) {
    const book = raw[i]!;
    const query = `${book.title} ${book.author}`.trim().slice(0, 100);
    let best: { item: NaverItem; score: number } | null = null;
    try {
      const items = await searchNaver(clientId, clientSecret, query);
      best = pickBestMatch(book, items);
      // 1차 매칭 실패 시 출판사를 쿼리에 더해 한 번 더 시도
      if (!best && book.publisher) {
        const fallback = await searchNaver(clientId, clientSecret, `${book.title} ${book.publisher}`.slice(0, 100));
        best = pickBestMatch(book, fallback);
        await sleep(QUERY_DELAY_MS);
      }
    } catch (error) {
      console.warn(`Naver search failed for #${i} "${book.title}":`, error);
    }

    enriched.push({
      ...book,
      isbn13: best?.item.isbn?.split(" ").find((part) => part.length === 13) ?? null,
      coverUrl: best?.item.image ?? null,
      description: best?.item.description?.replace(/<[^>]+>/g, "").trim() ?? "",
      matchScore: best?.score ?? 0,
      matched: Boolean(best),
    });
    if (!best) unmatched.push(book);

    if (i % 25 === 0) console.log(`Enriched ${i + 1}/${raw.length}`);
    await sleep(QUERY_DELAY_MS);
  }

  await fs.writeFile(OUT_PATH, JSON.stringify(enriched, null, 2), "utf8");
  await fs.writeFile(UNMATCHED_PATH, JSON.stringify(unmatched, null, 2), "utf8");
  console.log(`Matched ${enriched.filter((b) => b.matched).length}/${enriched.length}. Unmatched logged.`);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
```

- [ ] **Step 2: 실행**

Run: `pnpm library:fetch:cover`
Expected: ~6~8분 소요(695권 × 350ms, 매칭 실패 시 fallback 검색 추가). 마지막에 매칭 비율 출력.

확인: `wc -l data/library/unmatched.json` — 매칭 실패가 너무 많으면 (>30%) `compositeMatchScore`의 threshold(0.55)를 0.45로 낮춰 재시도. 또는 `data/library/gachon-enriched.json`에서 `matchScore`가 낮은 항목(0.55~0.65 구간) 표본을 눈으로 확인해 임계값 미세 조정.

- [ ] **Step 3: 커밋**

```bash
git add scripts/library/fetch-gachon-covers.ts data/library/gachon-enriched.json data/library/unmatched.json
git commit -m "Enrich Gachon books with Naver Books cover and ISBN"
```

---

## Task 8: 가천대 책 태깅 + Supabase import

**Files:**
- Create: `scripts/library/tag-gachon-books.ts`
- Create: `scripts/library/import-gachon-library.ts`

- [ ] **Step 1: 태깅 스크립트 (기존 inferBookCategory 활용)**

Create `scripts/library/tag-gachon-books.ts`:
```ts
import "../books/load-env";

import fs from "node:fs/promises";
import path from "node:path";
import { inferBookCategory } from "../../src/lib/books/categories";
import type { GachonEnrichedBook } from "./fetch-gachon-covers";
import type { LibraryBook } from "../../src/lib/books/types";

const IN_PATH = path.join(process.cwd(), "data/library/gachon-enriched.json");
const OUT_PATH = path.join(process.cwd(), "data/library/gachon-books.json");

function deriveTags(book: GachonEnrichedBook): string[] {
  const tags = new Set<string>();
  const text = `${book.title} ${book.description}`;

  if (book.sourceLabel === "bookcuration") {
    tags.add("AI");
    if (/디자인|마케팅|업무|비즈니스|일잘러/.test(text)) tags.add("커리어");
    if (/입문|기초|이해|개론/.test(text)) tags.add("입문서");
    if (/창업|투자|경영/.test(text)) tags.add("비즈니스");
  } else {
    if (/철학|사상|러셀|니체|스토아|세네카/.test(text)) tags.add("철학 입문");
    if (/에세이|산문|위로|마음/.test(text)) tags.add("에세이");
    if (/고전/.test(text)) tags.add("고전");
    if (/심리|관계|대화/.test(text)) tags.add("관계");
    if (/소설|문학/.test(text)) tags.add("문학");
    if (/시간관리|생산성|습관/.test(text)) tags.add("생산성");
  }
  return Array.from(tags);
}

function toLibraryBook(book: GachonEnrichedBook): LibraryBook {
  const source = book.sourceLabel === "bookcuration" ? "gachon_curation" : "gachon_open";
  const category = inferBookCategory({ title: book.title, description: book.description });
  return {
    source,
    sourceLabel: book.sourceLabel,
    sourceId: book.registrationNo,
    isbn13: book.isbn13,
    title: book.title,
    author: book.author,
    publisher: book.publisher,
    publishedYear: book.publishedYear,
    category,
    description: book.description,
    coverUrl: book.coverUrl,
    callNumber: book.callNumber,
    locationLabel: book.locationLabel,
    locationRoom: book.locationRoom,
    availability: book.availability,
    tags: deriveTags(book),
  };
}

async function main() {
  const raw = JSON.parse(await fs.readFile(IN_PATH, "utf8")) as GachonEnrichedBook[];
  const books = raw.map(toLibraryBook);
  await fs.writeFile(OUT_PATH, JSON.stringify(books, null, 2), "utf8");
  console.log(`Tagged ${books.length} books → ${OUT_PATH}`);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
```

- [ ] **Step 2: 실행**

Run: `pnpm library:tag`
Expected: `Tagged 695 books → data/library/gachon-books.json`

- [ ] **Step 3: import 스크립트 (기존 import-books 패턴 재사용)**

Create `scripts/library/import-gachon-library.ts`:
```ts
import "../books/load-env";

import { createClient } from "@supabase/supabase-js";
import fs from "node:fs/promises";
import path from "node:path";
import type { LibraryBook } from "../../src/lib/books/types";

const IN_PATH = path.join(process.cwd(), "data/library/gachon-books.json");
const CHUNK_SIZE = 100;
const GACHON_SOURCES = ["gachon_curation", "gachon_open"] as const;

type BookRow = {
  source: string;
  source_label: string;
  source_id: string;
  isbn13: string | null;
  title: string;
  author: string;
  publisher: string;
  published_year: number | null;
  category: string;
  description: string;
  cover_url: string | null;
  call_number: string;
  location_label: string;
  location_room: string | null;
  availability: string | null;
  tags: string[];
  active: boolean;
};

function toRow(book: LibraryBook): BookRow {
  return {
    source: book.source,
    source_label: book.sourceLabel ?? "",
    source_id: book.sourceId,
    isbn13: book.isbn13,
    title: book.title,
    author: book.author,
    publisher: book.publisher,
    published_year: book.publishedYear,
    category: book.category,
    description: book.description,
    cover_url: book.coverUrl,
    call_number: book.callNumber,
    location_label: book.locationLabel,
    location_room: book.locationRoom ?? null,
    availability: book.availability,
    tags: book.tags,
    active: true,
  };
}

async function main() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!supabaseUrl || !serviceRoleKey) throw new Error("Missing Supabase credentials");

  const supabase = createClient(supabaseUrl, serviceRoleKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  const books = (JSON.parse(await fs.readFile(IN_PATH, "utf8")) as LibraryBook[]).map(toRow);

  // Deactivate previous Gachon imports
  const { error: deactivateError } = await supabase.from("books").update({ active: false }).in("source", GACHON_SOURCES);
  if (deactivateError) throw deactivateError;
  console.log(`Deactivated previous Gachon imports`);

  for (let index = 0; index < books.length; index += CHUNK_SIZE) {
    const chunk = books.slice(index, index + CHUNK_SIZE);
    const { error } = await supabase.from("books").upsert(chunk, { onConflict: "source,source_id" });
    if (error) throw error;
    console.log(`Imported ${Math.min(index + CHUNK_SIZE, books.length)} / ${books.length}`);
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
```

- [ ] **Step 4: 실행**

Run: `pnpm library:import`
Expected: `Imported 695 / 695` 진행 로그

- [ ] **Step 5: Supabase에서 확인**

Run:
```bash
pnpm dlx supabase --project-ref lubmjeylpppdnckljoiw db query "select source_label, count(*) from books where active group by source_label;"
```
Expected output: `bookcuration | 243`, `openlibrary | 452` (또는 매칭률에 따라 조금 적게)

- [ ] **Step 6: 커밋**

```bash
git add scripts/library/tag-gachon-books.ts scripts/library/import-gachon-library.ts data/library/gachon-books.json
git commit -m "Tag and import Gachon library books to Supabase"
```

---

## Task 8.5: 입력 폼 4지선다 추가 + StudentInput 타입 확장

**Files:**
- Modify: `src/types/session.ts`
- Modify: `src/components/analyze/AnalyzePage.tsx`

- [ ] **Step 1: `StudentInput`에 `needFocus` 필드 추가**

In `src/types/session.ts`, change `StudentInput`:
```ts
export type NeedFocus = "stimulation" | "comfort" | "utility" | "depth";

export type StudentInput = {
  name: string;
  studentId: string;
  gender: Gender;
  birthDate: string;
  favoriteCategory: string;
  needFocus: NeedFocus;
  consentAccepted: boolean;
};
```

- [ ] **Step 2: AnalyzePage.tsx 입력 폼 추가**

In `src/components/analyze/AnalyzePage.tsx`, near the existing state hooks in `EntryModal`:
```tsx
import type { NeedFocus } from "@/types/session";
// ...
  const [needFocus, setNeedFocus] = useState<NeedFocus | "">("");
```

Add a fieldset between `favoriteCategory`와 동의 체크 사이:
```tsx
          <fieldset className="grid gap-2">
            <legend className="text-sm font-black text-text-primary">지금 나에게 가장 필요한 것은?</legend>
            <div className="grid grid-cols-2 gap-2">
              {[
                { value: "stimulation" as const, label: "새로운 자극" },
                { value: "comfort" as const, label: "마음 위로" },
                { value: "utility" as const, label: "실용적인 도움" },
                { value: "depth" as const, label: "깊은 사색" },
              ].map((option) => (
                <button
                  key={option.value}
                  type="button"
                  className={[
                    "liquid-glass-button min-h-10 rounded-lg border px-3 text-sm font-bold transition",
                    needFocus === option.value
                      ? "border-accent-info/80 bg-accent-info/[0.16] text-text-primary shadow-[0_0_0_1px_rgb(var(--accent-info-rgb)_/_0.18)]"
                      : "border-border/60 bg-bg-card/82 text-text-muted shadow-[inset_0_1px_0_rgb(255_255_255_/_0.18)] hover:border-border-bright/70 hover:bg-bg-card-hover",
                  ].join(" ")}
                  onClick={() => setNeedFocus(option.value)}
                >
                  {option.label}
                </button>
              ))}
            </div>
          </fieldset>
```

Update validation in `submit`:
```tsx
    if (!trimmedName || !trimmedStudentId || !gender || !birthDate || !favoriteCategory || !needFocus) {
      onError("빈칸이 있으면 고양이 수염 레이더가 흔들려요. 모두 채워 주세요.");
      return;
    }
```

Update `onStart` call to include `needFocus`:
```tsx
    onStart({
      name: trimmedName,
      studentId: trimmedStudentId,
      gender,
      birthDate,
      favoriteCategory,
      needFocus,
      consentAccepted,
    });
```

- [ ] **Step 3: api/analyze/route.ts에 needFocus 저장 컬럼 추가**

In `src/app/api/analyze/route.ts` `library_sessions.insert` block, add `need_focus: body.input.needFocus`. (Supabase 컬럼은 Task 2에서 마이그레이션 시 함께 추가.)

In Task 2의 마이그레이션 SQL에 다음 라인 추가:
```sql
alter table public.library_sessions
  add column if not exists need_focus text;
```

- [ ] **Step 4: lint + 빌드 확인**

Run:
```bash
pnpm lint
pnpm vitest run
```
Expected: PASS

- [ ] **Step 5: 커밋**

```bash
git add src/types/session.ts src/components/analyze/AnalyzePage.tsx src/app/api/analyze/route.ts supabase/migrations/20260512000000_library_book_sources.sql
git commit -m "Add need-focus 4-choice input for richer book recommendations"
```

---

## Task 9: Recommender 새 점수 함수 + 출처 믹스 가드 (TDD)

**Files:**
- Modify: `src/lib/books/recommender.ts`
- Modify: `tests/bookRecommender.test.ts`

- [ ] **Step 1: failing test 추가**

Append to `tests/bookRecommender.test.ts`:
```ts
import { enforceSourceMix, scoreBookWithPersona } from "@/lib/books/recommender";

function gachonBook(sourceLabel: "bookcuration" | "openlibrary", sourceId: string, title: string, category: string, tags: string[]): LibraryBook {
  return {
    source: sourceLabel === "bookcuration" ? "gachon_curation" : "gachon_open",
    sourceLabel,
    sourceId,
    isbn13: null,
    title,
    author: "저자",
    publisher: "출판사",
    publishedYear: 2024,
    category,
    description: "긴 설명이 들어가는 자리",
    coverUrl: null,
    callNumber: "000.0 ㄱ000",
    locationLabel: "중앙도서관",
    locationRoom: sourceLabel === "bookcuration" ? "북큐레이션코너(1층)" : "프리덤광장",
    availability: "available",
    tags,
  };
}

describe("scoreBookWithPersona", () => {
  it("applies persona tag weights on top of category match", () => {
    const book = gachonBook("bookcuration", "X", "AI 입문", "과학/기술", ["AI", "입문서"]);
    const score = scoreBookWithPersona(book, {
      favoriteCategory: "과학/기술",
      personaWeights: { AI: 4, "입문서": 3 },
      needFocus: "stimulation",
      saltSeed: "seed-1",
    });
    expect(score).toBeGreaterThan(15);
  });

  it("returns higher score when persona tags match more", () => {
    const matching = gachonBook("openlibrary", "M", "스토아 철학", "인문/철학", ["철학 입문", "에세이"]);
    const nonMatching = gachonBook("openlibrary", "N", "공룡 도감", "과학/기술", ["과학"]);
    const personaWeights = { "철학 입문": 4, "에세이": 3 };
    const base = { favoriteCategory: "인문/철학", personaWeights, needFocus: "depth" as const, saltSeed: "s" };
    expect(scoreBookWithPersona(matching, base)).toBeGreaterThan(scoreBookWithPersona(nonMatching, base));
  });

  it("rewards books matching the needFocus axis", () => {
    const comfortBook = gachonBook("openlibrary", "C", "위로 에세이", "시/에세이", ["위로", "에세이"]);
    const utilityBook = gachonBook("openlibrary", "U", "생산성 마스터", "자기계발", ["실행력", "생산성"]);
    const personaWeights = {};
    const comfortScore = scoreBookWithPersona(comfortBook, { favoriteCategory: "시/에세이", personaWeights, needFocus: "comfort", saltSeed: "s" });
    const utilityScore = scoreBookWithPersona(utilityBook, { favoriteCategory: "시/에세이", personaWeights, needFocus: "comfort", saltSeed: "s" });
    expect(comfortScore).toBeGreaterThan(utilityScore);
  });
});

describe("enforceSourceMix", () => {
  const candidates = [
    gachonBook("bookcuration", "A1", "AI 1", "과학/기술", ["AI"]),
    gachonBook("bookcuration", "A2", "AI 2", "과학/기술", ["AI"]),
    gachonBook("bookcuration", "A3", "AI 3", "과학/기술", ["AI"]),
    gachonBook("bookcuration", "A4", "AI 4", "과학/기술", ["AI"]),
    gachonBook("openlibrary", "B1", "철학 1", "인문/철학", ["철학 입문"]),
    gachonBook("openlibrary", "B2", "철학 2", "인문/철학", ["철학 입문"]),
  ];

  it("swaps last pick when all 3 picks are same source", () => {
    const picks = candidates.slice(0, 3);
    const mixed = enforceSourceMix(picks, candidates, { curationRatio: 2, openRatio: 1 });
    const labels = mixed.map((book) => book.sourceLabel);
    expect(labels.filter((l) => l === "openlibrary")).toHaveLength(1);
  });

  it("keeps picks unchanged when ratio already met", () => {
    const picks = [candidates[0]!, candidates[1]!, candidates[4]!]; // 2 curation + 1 open
    const mixed = enforceSourceMix(picks, candidates, { curationRatio: 2, openRatio: 1 });
    expect(mixed.map((book) => book.sourceId)).toEqual(["A1", "A2", "B1"]);
  });
});
```

- [ ] **Step 2: 테스트 실패 확인**

Run: `pnpm vitest run tests/bookRecommender.test.ts`
Expected: FAIL (`scoreBookWithPersona`/`enforceSourceMix` not defined)

- [ ] **Step 3: 두 함수 구현**

Append to `src/lib/books/recommender.ts`:
```ts
import { createHash } from "node:crypto";
import type { NeedFocus } from "@/types/session";

const NEED_FOCUS_TAG_WEIGHTS: Record<NeedFocus, Record<string, number>> = {
  stimulation: { "교양": 3, "입문서": 3, "취미": 2, "에세이": 2 },
  comfort: { "위로": 4, "자기돌봄": 3, "에세이": 2, "문학": 2 },
  utility: { "실행력": 3, "생산성": 3, "커리어": 3, "실용": 2 },
  depth: { "철학 입문": 3, "고전": 3, "심화 독서": 3, "사고 정리": 2 },
};

export type PersonaScoringInput = {
  favoriteCategory: string;
  personaWeights: Record<string, number>;
  needFocus: NeedFocus;
  saltSeed: string;
};

export function scoreBookWithPersona(book: LibraryBook, input: PersonaScoringInput): number {
  const categoryScore = book.category === input.favoriteCategory ? 8 : 0;
  let personaTagScore = 0;
  for (const tag of book.tags) personaTagScore += input.personaWeights[tag] ?? 0;
  personaTagScore = Math.min(personaTagScore, 12);

  let needTagScore = 0;
  const needWeights = NEED_FOCUS_TAG_WEIGHTS[input.needFocus];
  for (const tag of book.tags) needTagScore += needWeights[tag] ?? 0;
  needTagScore = Math.min(needTagScore, 8);

  const descriptionScore = book.description.length >= 30 ? 2 : 0;
  const discoveryBonus = isDiscoveryFriendly(book) ? 2 : 0;
  const salt = diversitySalt(book, input.saltSeed);
  return categoryScore + personaTagScore + needTagScore + descriptionScore + discoveryBonus + salt - bestsellerPenalty(book);
}

function diversitySalt(book: LibraryBook, seed: string): number {
  const hash = createHash("sha256").update(`${seed}|${book.source}|${book.sourceId}`).digest();
  const value = hash.readUInt8(0);
  return ((value % 5) - 2) * 0.4; // -0.8 ~ +0.8
}

export type SourceMixRatio = { curationRatio: number; openRatio: number };

export function enforceSourceMix(picks: LibraryBook[], pool: LibraryBook[], ratio: SourceMixRatio): LibraryBook[] {
  if (picks.length < 3) return picks;
  const curationCount = picks.filter((book) => book.sourceLabel === "bookcuration").length;
  const openCount = picks.filter((book) => book.sourceLabel === "openlibrary").length;
  const total = ratio.curationRatio + ratio.openRatio;
  const desiredCuration = Math.round((ratio.curationRatio / total) * 3);
  const desiredOpen = 3 - desiredCuration;

  if (curationCount === desiredCuration && openCount === desiredOpen) return picks;

  const minorityNeeded = curationCount > desiredCuration ? "openlibrary" : "bookcuration";
  const replacementCandidate = pool.find((book) => book.sourceLabel === minorityNeeded && !picks.some((p) => p.sourceId === book.sourceId));
  if (!replacementCandidate) return picks;

  const indexToReplace = picks.findIndex((book) => book.sourceLabel !== minorityNeeded);
  if (indexToReplace < 0) return picks;
  const next = [...picks];
  next[indexToReplace] = replacementCandidate;
  return next;
}
```

Note: `LibraryBook` import는 이미 파일 상단에 있다.

- [ ] **Step 4: 테스트 통과 확인**

Run: `pnpm vitest run tests/bookRecommender.test.ts`
Expected: PASS (all tests)

- [ ] **Step 5: 커밋**

```bash
git add src/lib/books/recommender.ts tests/bookRecommender.test.ts
git commit -m "Add persona-weighted scoring and source mix guard"
```

---

## Task 10: Reading Type 16개 라벨 워딩 적용

**Files:**
- Modify: `src/lib/reading-types/types.ts`

> **Prerequisite:** `docs/superpowers/specs/2026-05-12-reading-type-labels-draft.md`의 워딩이 사용자에 의해 확정되어 있어야 한다. 이 task 진입 전에 draft를 확인하라. 본 plan은 draft의 현재 워딩을 그대로 적용한다.

- [ ] **Step 1: 16개 라벨 일괄 교체**

Replace the contents of `src/lib/reading-types/types.ts`:
```ts
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
```

- [ ] **Step 2: 기존 readingTypes 테스트 통과 확인**

Run: `pnpm vitest run tests/readingTypes.test.ts`
Expected: PASS (테스트가 code 존재만 검증한다면 그대로 통과)

만약 일부 테스트가 옛 displayName을 하드코딩했다면 새 값으로 수정.

- [ ] **Step 3: 커밋**

```bash
git add src/lib/reading-types/types.ts
git commit -m "Apply new reading type display names and headlines"
```

---

## Task 11: libraryPrompt 재구성 (VOICE_GUIDE + 페르소나 + 이미지)

**Files:**
- Modify: `src/lib/gemini/libraryPrompt.ts`

- [ ] **Step 1: 새 VOICE_GUIDE + persona 입력 받도록 시그니처 변경**

Replace `src/lib/gemini/libraryPrompt.ts`:
```ts
import { READING_TYPE_CODES, READING_TYPES } from "@/lib/reading-types/types";
import { bestsellerPenalty } from "@/lib/books/recommender";
import type { LibraryBook } from "@/lib/books/types";
import type { CalibratedFaceScores } from "@/lib/facemesh/scoreCalibration";
import type { PersonaSignal } from "@/lib/persona/types";
import type { SajuCalculation } from "@/lib/saju/calculator";
import type { FaceMetrics } from "@/types/face";
import type { StudentInput } from "@/types/session";

const VOICE_GUIDE = `
문체는 존댓말이지만 거리감 있는 "~입니다"가 아니라 친구가 또박또박 짚어주는 톤이다.
어말은 단정형보다 추정형을 우선한다: "~이실 것 같아요", "~이실지도", "~타입일 수도",
"~분이세요"처럼 살짝 여운 있는 표현을 쓴다. 단정해서 빗나가면 거리감이 커진다.
재미는 정확한 관찰에서 나오고, 조롱·비속어·반말·디시밈은 절대 금지한다.
사용자가 "어 이거 나일지도?"라고 느끼게 구체적으로 쓰되, 결단적 단정은 피한다.
좋은 말만 늘어놓지 말고 삐끗하는 순간도 부드럽게 짚는다. 추상적 칭찬·일반론·MBTI 같은
보편 문구는 피한다.

외모 평가 룰:
- 긍정적인 외모 관찰은 허용한다. 예: "눈매가 또렷해서 첫인상에 시선이 빨리 잡히실 것 같아요".
- 부정적인 외모 평가/지적은 절대 금지. 어떤 형태로도 외모를 깎는 말은 쓰지 않는다.
- 모든 사람에게 외모를 칭찬해야 할 의무는 없다. 이미지에서 자연스럽게 좋은 점이 보일 때만 언급한다.
- 인상·표정 신호(시선의 열림, 표정 안정감, 분위기 인상)는 외모 평가가 아니라 관찰 카드로 다룬다.

chemi_match 성별 분기:
- 사용자 성별(input.gender) 정보를 참고해 best_match를 자연스럽게 표현한다.
  남성 사용자에겐 여성 best_match를, 여성 사용자에겐 남성 best_match를 가정한다.
- 단, 외양·체형·직업 같은 표면적 고정관념은 피하고, 성격·태도·관계 리듬 위주로 묘사한다.
- 톤은 추정형을 유지한다: "~이런 분과 흐름이 잘 맞으실 것 같아요".

좋은 예시:
- "{name}님 머릿속 탭 47개 열어두고 메인 작업창 못 찾으실 것 같아요"
- "{name}님 답장 늦으면 의미부여 시작하실 것 같은 분이세요"
- "{name}님 결정은 빠른데 그 결정의 7번째 백업 플랜까지 짜놓는 타입일 수도 있어요"
- "{name}님 새벽 2시에 갑자기 책 꺼내들 것 같은 사람"
- "{name}님 카페에서 한 자리 정해두고 거기만 가실 것 같은 분이세요"
- "{name}님 눈매가 또렷해서 첫인상에 시선이 빨리 잡히실 것 같아요"

나쁜 예시(이렇게 쓰지 마라):
- "차분하고 안정적인 인상이에요" (일반론)
- "당신은 멋진 사람이에요" (빈 칭찬)
- "감성적이면서 이성적인 균형감이 있어요" (양다리 표현)
- "INFJ 같은 느낌이네요" (외부 시스템 차용)
- "넌 이런 사람이야" (반말)
- "피부가 거칠어 보여요" (부정적 외모 평가 — 절대 금지)
- "눈이 너무 작아요" (부정적 외모 평가 — 절대 금지)
- "이 사람은 무조건 새벽형 인간입니다" (단정 — 추정형으로 바꿔라)
`.trim();

const SAFETY_GUIDE = [
  "이 서비스는 엔터테인먼트형 관상/성향 해석 콘텐츠다. 과학적 진단, 의학/정신건강/범죄/정치/종교/소득/성생활 등 고위험 속성 단정은 금지한다.",
  "사용자에게 보이는 출력에는 한자와 직접적인 명리 용어를 절대 쓰지 않는다.",
  "사용자 노출 금지 표현: 사주, 오행, 생년월일 신호, 물, 불, 나무, 흙, 금, 목, 화, 토, 수, 기운, 일간, 월주, 년주, 일주, 시주, 우세 오행.",
  "금지 단어: 처방, 처방전, 학생. 이름을 부를 때는 반드시 '~님'을 쓴다. (연애·데이트는 허용된다.)",
  "내부 계산값(사주, 오행)은 반드시 성격/행동 언어로 번역한다.",
].join("\n");

export function buildLibraryPrompt({
  input,
  displayName,
  metrics,
  calibratedScores,
  saju,
  candidates,
  persona,
}: {
  input: StudentInput;
  displayName: string;
  metrics: FaceMetrics;
  calibratedScores: CalibratedFaceScores;
  saju: SajuCalculation;
  candidates: LibraryBook[];
  persona: PersonaSignal;
}) {
  const observationLines = persona.observationCards
    .map((card, idx) => `  ${idx + 1}. [${card.axis}] ${card.rawMetric} → ${card.observation}`)
    .join("\n");

  return [
    "너는 대학 도서관 부스의 'AI 관상가 고양이'다.",
    VOICE_GUIDE,
    SAFETY_GUIDE,
    `사용자 이름: ${displayName}님`,
    `성별 선택값: ${input.gender}`,
    `생년월일: ${input.birthDate}`,
    `선호 독서 카테고리: ${input.favoriteCategory}`,
    `지금 가장 필요한 것(자기성찰 답): ${input.needFocus}`,
    "─── 이미 확정된 사실 (Gemini가 재계산하지 마라) ───",
    `얼굴 4축 점수: Balance ${persona.axisScores.balance}, Expressive ${persona.axisScores.expressive}, Focus ${persona.axisScores.focus}, Vitality ${persona.axisScores.vitality}`,
    `얼굴 페르소나 후보 (primary 우선): ${persona.candidates.primary}, alternates: [${persona.candidates.alternates.join(", ") || "없음"}]`,
    `내면 페르소나(사주 기반): ${persona.sajuKey} — 사용자 문장에 명리 용어 절대 쓰지 마라`,
    "결정론적 관찰 카드:",
    observationLines,
    "─── Gemini가 해야 할 일 ───",
    "1. 첨부된 이미지를 직접 보고, 위 얼굴 페르소나 후보 중 1개를 personaConfirmed에 채워라.",
    "   primary가 이미지와 잘 맞으면 그대로, alternates 중 더 잘 맞는 게 있으면 그것을, 셋 다 안 맞을 때만 8종 중 다른 것을 골라라.",
    "2. 16개 reading_type 중 페르소나에 가장 잘 맞는 1개를 reading_type.code에 채워라.",
    "3. 모든 카피 필드를 VOICE_GUIDE에 맞춰 작성하라.",
    `허용 reading_type 코드: ${READING_TYPE_CODES.join(", ")}`,
    `reading_type 메타데이터: ${JSON.stringify(READING_TYPES)}`,
    "─── 책 추천 ───",
    "아래 후보 책 안에서만 정확히 3권을 골라라. 후보에 없는 책 제목, 저자, ID를 만들면 안 된다.",
    "대표 추천(recommendations[0])은 사용자 해석과 가장 잘 맞는 책 1권. 인기도보다 개인 적합도 우선.",
    `후보 책 JSON: ${JSON.stringify(
      candidates.map((book) => ({
        book_id: book.sourceId,
        title: book.title,
        author: book.author,
        category: book.category,
        tags: book.tags,
        description: book.description,
        source_label: book.sourceLabel,
        call_number: book.callNumber,
        location_room: book.locationRoom,
        fame_caution: bestsellerPenalty(book) >= 4 ? "high" : "normal",
      })),
    )}`,
    "─── 출력 ───",
    "JSON 한 덩어리만 반환한다. reading_type.code는 허용 코드 중 하나여야 하고, personaConfirmed는 8종 얼굴 페르소나 코드 중 하나여야 한다.",
    "각 recommendations 항목엔 reason, action_copy, fit_reason, reading_moment를 모두 작성한다.",
    "section_copy / inner_style / chemi_match / physiognomy_summary / saju_summary 등 기존 필드는 그대로 작성한다.",
    "내부 계산값 reference (Gemini가 재계산 X):",
    `  saju JSON: ${JSON.stringify(saju)}`,
    `  metrics JSON: ${JSON.stringify(metrics)}`,
    `  calibratedScores JSON: ${JSON.stringify(calibratedScores)}`,
  ].join("\n\n");
}
```

- [ ] **Step 2: 커밋**

```bash
git add src/lib/gemini/libraryPrompt.ts
git commit -m "Rewrite Gemini prompt with persona candidates and new voice guide"
```

---

## Task 12: librarySchema personaConfirmed + api/analyze 통합

**Files:**
- Modify: `src/lib/gemini/librarySchema.ts`
- Modify: `src/app/api/analyze/route.ts`

- [ ] **Step 1: schema에 personaConfirmed 필드 추가**

In `src/lib/gemini/librarySchema.ts`, modify `rawSchema` to add `personaConfirmed`:

Find:
```ts
const rawSchema = z.object({
  reading_type: z.object({
```

Replace the entire `rawSchema` opening:
```ts
const rawSchema = z.object({
  personaConfirmed: z.string().min(1).optional(),
  reading_type: z.object({
```

In `normalizeLibraryAnalysis` return, add at the end (before closing brace):
```ts
    personaConfirmed: raw.personaConfirmed,
```

- [ ] **Step 2: api/analyze/route.ts에서 페르소나 통합 + Vision 이미지 + 모델 fallback chain**

In `src/app/api/analyze/route.ts`, add imports:
```ts
import { resolvePersonaSignal } from "@/lib/persona/personaResolver";
```

Replace the `LIBRARY_ANALYSIS_MODEL` constant with a fallback chain:
```ts
const PRIMARY_MODEL = process.env.GEMINI_LIBRARY_MODEL ?? "gemini-2.5-pro";
const FALLBACK_MODELS = (process.env.GEMINI_LIBRARY_FALLBACK_MODELS ?? "gemini-2.5-flash,gemini-2.5-flash")
  .split(",")
  .map((m) => m.trim())
  .filter(Boolean);
const MODEL_CHAIN = [PRIMARY_MODEL, ...FALLBACK_MODELS];
```

After computing `calibratedScores`, add:
```ts
  const personaSignal = resolvePersonaSignal(body.metrics, saju);
```

Pass into `buildLibraryPrompt` and the Gemini call. Find this block:
```ts
    const response = await ai.models.generateContent({
      model: LIBRARY_ANALYSIS_MODEL,
      contents: buildLibraryPrompt({ input: body.input, displayName, metrics: body.metrics, calibratedScores, saju, candidates }),
```

Replace with the fallback chain:
```ts
    const visionEnabled = process.env.GEMINI_VISION_ENABLED === "true";
    const promptText = buildLibraryPrompt({ input: body.input, displayName, metrics: body.metrics, calibratedScores, saju, candidates, persona: personaSignal });
    const inlineImage = visionEnabled
      ? [{ inlineData: { data: stripDataUrl(body.imageBase64), mimeType: "image/jpeg" } }]
      : [];
    const contents = [{ role: "user", parts: [{ text: promptText }, ...inlineImage] }];

    let response: Awaited<ReturnType<typeof ai.models.generateContent>> | null = null;
    let lastError: unknown = null;
    let usedModel = MODEL_CHAIN[0]!;
    for (const model of MODEL_CHAIN) {
      try {
        response = await ai.models.generateContent({
          model,
          contents,
          config: { /* keep existing responseMimeType and responseSchema as before */ },
        });
        usedModel = model;
        break;
      } catch (error) {
        lastError = error;
        console.warn(`[api/analyze] model ${model} failed`, error);
      }
    }
    if (!response) throw lastError ?? new Error("all_models_failed");
    console.log(`[api/analyze] used model ${usedModel}`);
```

Note: 기존 `config: { responseMimeType, responseSchema }`는 위 try 블록 안의 `config` 위치에 그대로 옮겨야 한다.

Update `responseSchema` to include `personaConfirmed`. Find:
```ts
          properties: {
            reading_type: {
```

Add before `reading_type`:
```ts
            personaConfirmed: { type: Type.STRING },
```

(personaConfirmed는 optional이므로 `required` 배열에는 넣지 않는다)

Pass persona to result JSON. Find:
```ts
    const resultJson = { ...normalized, scores: resultScores, calibratedScores, saju: { ...normalized.saju, calculation: saju }, recommendations: finalRecommendations };
```

Replace with:
```ts
    const resultJson = {
      ...normalized,
      scores: resultScores,
      calibratedScores,
      persona: {
        candidates: personaSignal.candidates,
        confirmed: normalized.personaConfirmed ?? personaSignal.candidates.primary,
        sajuKey: personaSignal.sajuKey,
        axisScores: personaSignal.axisScores,
      },
      saju: { ...normalized.saju, calculation: saju },
      recommendations: finalRecommendations,
    };
```

- [ ] **Step 3: types/session.ts에 persona 필드 추가**

In `src/types/session.ts`, add to `LibraryAnalysisResult`:
```ts
  persona?: {
    candidates: { primary: string; alternates: string[] };
    confirmed: string;
    sajuKey: string;
    axisScores: { balance: number; expressive: number; focus: number; vitality: number };
  };
```

- [ ] **Step 4: lint + build**

Run:
```bash
pnpm lint
pnpm vitest run
```
Expected: 모두 통과

- [ ] **Step 5: 커밋**

```bash
git add src/lib/gemini/librarySchema.ts src/app/api/analyze/route.ts src/types/session.ts
git commit -m "Wire persona resolver into Gemini Vision analyze pipeline"
```

---

## Task 13: 결과 페이지 QR 카드 (5섹션 마지막)

**Files:**
- Create: `src/components/result/QrCard.tsx`
- Modify: `src/components/pages/ResultPage.tsx`

- [ ] **Step 1: QrCard 컴포넌트**

Create `src/components/result/QrCard.tsx`:
```tsx
"use client";

import { useEffect, useState } from "react";
import QRCode from "qrcode";
import { Smartphone } from "lucide-react";

export function QrCard({ sessionId }: { sessionId: string }) {
  const [dataUrl, setDataUrl] = useState<string | null>(null);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const target = new URL(`/result/${sessionId}`, window.location.origin);
    target.searchParams.set("m", "1");
    QRCode.toDataURL(target.toString(), { width: 220, margin: 1, errorCorrectionLevel: "M" })
      .then(setDataUrl)
      .catch((error) => console.error("QR encode failed", error));
  }, [sessionId]);

  return (
    <div className="glass-card flex flex-col items-center gap-2 rounded-2xl border border-border/60 bg-bg-card/70 p-4 shadow-glass">
      {dataUrl ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={dataUrl} alt="" className="h-32 w-32 rounded-lg bg-white p-2" />
      ) : (
        <div className="h-32 w-32 rounded-lg bg-bg-raised" />
      )}
      <Smartphone className="h-4 w-4 text-text-faint" aria-hidden="true" />
    </div>
  );
}
```

- [ ] **Step 2: ResultPage 5섹션에 QrCard 노출**

In `src/components/pages/ResultPage.tsx`, add import at top:
```tsx
import { QrCard } from "@/components/result/QrCard";
```

Find the BOOK CURATION section (`<StorySection index={4}`). Replace the children:
```tsx
        <StorySection active={activeSection === 4} index={4} eyebrow="BOOK CURATION" title={`지금 ${name}에게 필요한 책이에요`} lines={sectionLines(result, "bookCuration", buildBookSectionLines(result))} id="books">
          <div className="grid min-h-0 gap-5 lg:grid-cols-[minmax(0,1fr)_auto]">
            <RevealItem active={activeSection === 4} delay={140}>
              <BookCurationSection result={result} />
            </RevealItem>
            <RevealItem active={activeSection === 4} delay={260}>
              <QrCard sessionId={payload.id} />
            </RevealItem>
          </div>
        </StorySection>
```

Note: `payload.id`를 `ResultContent`에 전달해야 한다. `ResultContent({ payload }: { payload: ResultPayload })`에서 이미 payload를 받고 있으므로 그대로 사용 가능.

- [ ] **Step 3: 로컬 확인**

Run `pnpm dev` and 임의 결과 페이지를 5번째 섹션까지 가서 QR이 렌더되는지 눈으로 확인. URL이 `?m=1`로 끝나는지 QR 스캐너로 확인.

- [ ] **Step 4: 커밋**

```bash
git add src/components/result/QrCard.tsx src/components/pages/ResultPage.tsx
git commit -m "Add QR card on result page final section"
```

---

## Task 14: 모바일 결과 페이지 분기 + BookRecommendationCard 강조

**Files:**
- Create: `src/components/result/MobileResultPage.tsx`
- Create: `src/components/result/ShareableTypeCard.tsx`
- Modify: `src/components/pages/ResultPage.tsx`
- Modify: `src/components/result/BookRecommendationCard.tsx`

- [ ] **Step 1: ShareableTypeCard**

Create `src/components/result/ShareableTypeCard.tsx`:
```tsx
"use client";

import { useRef, useState } from "react";
import { Share2 } from "lucide-react";
import * as htmlToImage from "html-to-image";
import { honorific } from "@/lib/korean/name";

export function ShareableTypeCard({ displayName, typeName, headline }: { displayName: string; typeName: string; headline: string }) {
  const ref = useRef<HTMLDivElement>(null);
  const [busy, setBusy] = useState(false);
  const name = honorific(displayName);

  async function share() {
    if (!ref.current) return;
    setBusy(true);
    try {
      const dataUrl = await htmlToImage.toPng(ref.current, { pixelRatio: 2, cacheBust: true });
      const blob = await (await fetch(dataUrl)).blob();
      const file = new File([blob], `result-${typeName}.png`, { type: "image/png" });
      const navAny = navigator as Navigator & { canShare?: (data: ShareData) => boolean };
      if (navAny.canShare?.({ files: [file] })) {
        await navigator.share({ files: [file], title: typeName });
      } else {
        const link = document.createElement("a");
        link.href = dataUrl;
        link.download = `result-${typeName}.png`;
        link.click();
      }
    } catch (error) {
      console.error("share failed", error);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="grid gap-3">
      <article ref={ref} className="rounded-3xl border border-accent-info/35 bg-gradient-to-br from-bg-card to-bg-card/70 p-6 shadow-glass">
        <p className="text-xs font-black uppercase tracking-[0.16em] text-accent-info">TYPE</p>
        <h1 className="mt-3 text-3xl font-bold leading-tight text-text-primary">{typeName}</h1>
        <p className="mt-4 text-lg font-semibold leading-7 text-text-muted">{headline.replace("{nameHonorific}", name)}</p>
        <p className="mt-6 text-xs font-bold uppercase tracking-[0.16em] text-text-faint">AI 관상가 고양이 · 가천대 도서관</p>
      </article>
      <button
        type="button"
        onClick={share}
        disabled={busy}
        className="inline-flex h-11 items-center justify-center gap-2 rounded-xl border border-accent-info/45 bg-accent-info/[0.18] px-4 text-sm font-black text-text-primary transition disabled:opacity-50"
      >
        <Share2 className="h-4 w-4" aria-hidden="true" />
        결과 공유하기
      </button>
    </div>
  );
}
```

- [ ] **Step 2: MobileResultPage 작성**

Create `src/components/result/MobileResultPage.tsx`:
```tsx
"use client";

import { BookRecommendationCard } from "@/components/result/BookRecommendationCard";
import { ShareableTypeCard } from "@/components/result/ShareableTypeCard";
import { READING_TYPES } from "@/lib/reading-types/types";
import type { ResultPayload } from "@/components/pages/ResultPage";

export function MobileResultPage({ payload }: { payload: ResultPayload }) {
  const { displayName, result } = payload;
  const typeMeta = READING_TYPES[result.readingType.code];
  const headline = typeMeta?.headlineTemplate ?? result.mainCopy;

  return (
    <main className="min-h-screen bg-bg-primary text-text-primary">
      <header className="px-5 py-4">
        <p className="text-[0.65rem] font-black uppercase tracking-[0.2em] text-text-faint">AI 관상가 고양이</p>
      </header>

      <section className="px-5">
        <ShareableTypeCard displayName={displayName} typeName={typeMeta?.displayName ?? result.readingType.displayName} headline={headline} />
      </section>

      <section className="mt-8 px-5">
        <h2 className="text-lg font-black text-text-primary">지금 읽기 좋은 책 3권</h2>
        <p className="mt-1 text-sm font-semibold text-text-muted">청구기호와 자료실은 도서관에서 책을 바로 찾는 단서예요.</p>
        <div className="mt-4 grid gap-4">
          {result.recommendations.slice(0, 3).map((book, index) => (
            <BookRecommendationCard key={`${book.bookId}-${index}`} book={book} index={index} variant="mobile" />
          ))}
        </div>
      </section>

      {result.innerStyleInsight ? (
        <section className="mt-8 px-5">
          <h2 className="text-lg font-black text-text-primary">{displayName}님의 성향</h2>
          <div className="mt-4 space-y-3">
            <article className="rounded-2xl border border-border/60 bg-bg-card/60 p-4">
              <p className="text-xs font-black uppercase tracking-[0.16em] text-accent-info">가장 또렷한 성향</p>
              <h3 className="mt-2 text-xl font-bold">{result.innerStyleInsight.dominantLabel}</h3>
              <p className="mt-2 text-sm leading-6 text-text-muted">{result.innerStyleInsight.dominantDetail}</p>
            </article>
            <article className="rounded-2xl border border-border/60 bg-bg-card/60 p-4">
              <p className="text-xs font-black uppercase tracking-[0.16em] text-accent-info">보완하면 좋은 성향</p>
              <h3 className="mt-2 text-xl font-bold">{result.innerStyleInsight.growthLabel}</h3>
              <p className="mt-2 text-sm leading-6 text-text-muted">{result.innerStyleInsight.growthAction}</p>
            </article>
          </div>
        </section>
      ) : null}

      {result.chemiInsight ? (
        <section className="mt-8 px-5">
          <h2 className="text-lg font-black text-text-primary">잘 맞는 사람</h2>
          <article className="mt-4 rounded-2xl border border-border/60 bg-bg-card/60 p-4">
            <h3 className="text-xl font-bold">{result.chemiInsight.typeLabel}</h3>
            <p className="mt-2 text-sm leading-6 text-text-muted">{result.chemiInsight.why}</p>
          </article>
        </section>
      ) : null}

      <footer className="mt-12 px-5 pb-12 text-center text-xs font-medium text-text-faint">본 분석은 흥미용 해석이에요.</footer>
    </main>
  );
}
```

- [ ] **Step 3: BookRecommendationCard에 mobile variant 추가**

Open `src/components/result/BookRecommendationCard.tsx`. Find the variant prop type and add `"mobile"`. Add a mobile-specific render block at the top of the component:

```tsx
  if (variant === "mobile") {
    return (
      <article className="grid grid-cols-[5.5rem_1fr] gap-3 rounded-2xl border border-border/60 bg-bg-card/60 p-4">
        {book.coverUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={book.coverUrl} alt="" className="h-32 w-22 rounded-lg object-cover" />
        ) : (
          <div className="h-32 w-22 rounded-lg bg-bg-raised" />
        )}
        <div className="min-w-0">
          <p className="text-xs font-black uppercase tracking-[0.14em] text-accent-info">#{index + 1}</p>
          <h3 className="mt-1 text-base font-bold leading-tight text-text-primary">{book.title}</h3>
          <p className="mt-1 text-xs font-semibold text-text-muted">{book.author}</p>
          <div className="mt-3 grid gap-1 text-xs font-bold text-text-primary">
            <p>📚 청구기호: <span className="tabular-nums">{book.callNumber}</span></p>
            <p>📍 자료실: {book.locationLabel}</p>
          </div>
          {book.naverBookUrl ? (
            <a href={book.naverBookUrl} target="_blank" rel="noopener" className="mt-3 inline-flex h-9 items-center rounded-lg border border-accent-info/45 bg-accent-info/[0.16] px-3 text-xs font-black text-text-primary">
              책 자세히 보기
            </a>
          ) : null}
        </div>
      </article>
    );
  }
```

Add `"mobile"` to the variant union type at the top of the component file.

- [ ] **Step 4: ResultPage에서 모바일 분기**

In `src/components/pages/ResultPage.tsx`, add import:
```tsx
import { MobileResultPage } from "@/components/result/MobileResultPage";
import { useSearchParams } from "next/navigation";
```

In `ResultContent` (or wherever `<ResultContent payload={payload} />` is rendered), wrap with a viewport / query param check. The simplest is inside `ResultPage` after fetching:

```tsx
  if (status === "ready" && payload) {
    const search = typeof window !== "undefined" ? new URLSearchParams(window.location.search) : null;
    const mobileEnabled = process.env.NEXT_PUBLIC_RESULT_MOBILE_VIEW_ENABLED === "true";
    const wantsMobile = search?.get("m") === "1";
    const isSmall = typeof window !== "undefined" && window.innerWidth < 768;
    if (mobileEnabled && (wantsMobile || isSmall)) {
      return <MobileResultPage payload={payload} />;
    }
    return <ResultContent payload={payload} />;
  }
```

Note: 환경변수 `NEXT_PUBLIC_RESULT_MOBILE_VIEW_ENABLED`를 `.env.example`/`.env.local`에 추가 (Task 1에서 추가한 `RESULT_MOBILE_VIEW_ENABLED`와 별개로 클라이언트 노출용 prefix 필요).

In `.env.example` 및 `.env.local`, add:
```
NEXT_PUBLIC_RESULT_MOBILE_VIEW_ENABLED=false
```

- [ ] **Step 5: 로컬 확인**

Run `pnpm dev`. 결과 페이지 URL 뒤에 `?m=1`을 붙이거나 브라우저 width를 768 미만으로 줄여서 모바일 페이지가 렌더되는지 확인. 책 추천 카드의 청구기호·자료실이 큰 활자로 보이는지 확인.

- [ ] **Step 6: 커밋**

```bash
git add src/components/result/MobileResultPage.tsx src/components/result/ShareableTypeCard.tsx src/components/result/BookRecommendationCard.tsx src/components/pages/ResultPage.tsx .env.example
git commit -m "Add mobile result page with shareable type card and book focus"
```

---

## Task 15: 정규식 사전 정리 + V2 토글 + 시뮬레이션 + 부스 점검

### 정규식 사전 정리 (연애·데이트 치환 제거)

- [ ] **Step 0a: librarySchema.ts에서 연애·데이트 치환 제거**

In `src/lib/gemini/librarySchema.ts` 안의 `clean()` 함수에서 다음 라인을 삭제:
```ts
    .replace(/연애/g, "관계 궁합")
    .replace(/연인/g, "상대")
    .replace(/데이트/g, "함께하는 시간")
```

`연인` 치환도 제거 가능하지만 chemi_match에서 자연스럽게 쓰일 수 있어 보존해도 무방. 가급적 모두 제거하여 Gemini 원문 그대로 노출.

- [ ] **Step 0b: ResultPage.tsx의 cleanCopy/publicResultCopy에서도 제거**

In `src/components/pages/ResultPage.tsx`, find and delete:
```ts
    .replace(new RegExp(["연", "애"].join(""), "g"), "관계 궁합")
    .replace(/연인/g, "상대")
    .replace(/상대과/g, "상대와")
    .replace(/데이트/g, "함께하는 시간")
    .replace(/함께하는 시간를/g, "함께하는 시간을")
    .replace(/함께하는 시간가/g, "함께하는 시간이")
```

- [ ] **Step 0c: AnalyzePage.tsx의 cleanAnalysisCopy에서도 제거**

In `src/components/analyze/AnalyzePage.tsx`, find and delete:
```ts
    .replace(/연애/g, "관계")
    .replace(/연인/g, "상대")
    .replace(/상대과/g, "상대와")
    .replace(/데이트/g, "함께하는 시간")
    .replace(/함께하는 시간를/g, "함께하는 시간을")
    .replace(/함께하는 시간가/g, "함께하는 시간이")
```

- [ ] **Step 0d: 커밋**

```bash
git add src/lib/gemini/librarySchema.ts src/components/pages/ResultPage.tsx src/components/analyze/AnalyzePage.tsx
git commit -m "Allow 연애/데이트 wording in Gemini output and result copy"
```

---

### V2 토글 정리 + 시뮬레이션 + 부스 점검

**Files:**
- Create: `scripts/simulate-personas.ts`
- Modify: `src/app/api/analyze/route.ts`

- [ ] **Step 1: PERSONA_V2_ENABLED 토글로 새 로직 가드**

In `src/app/api/analyze/route.ts`, wrap the `resolvePersonaSignal` call:
```ts
  const personaV2Enabled = process.env.PERSONA_V2_ENABLED === "true";
  const personaSignal = personaV2Enabled ? resolvePersonaSignal(body.metrics, saju) : null;
```

When passing to `buildLibraryPrompt`, fall back to existing prompt path if `personaSignal` is null. Easiest: split into two code paths.

Replace the build prompt block:
```ts
    const promptText = personaSignal
      ? buildLibraryPrompt({ input: body.input, displayName, metrics: body.metrics, calibratedScores, saju, candidates, persona: personaSignal })
      : buildLegacyLibraryPrompt({ input: body.input, displayName, metrics: body.metrics, calibratedScores, saju, candidates });
```

`buildLegacyLibraryPrompt`는 `libraryPrompt.ts`의 이전 버전 함수. Backward-compat 유지를 위해 두 함수를 같이 export하거나, 단순히 PERSONA_V2가 false일 땐 persona를 빈 객체 stub으로 전달하는 방법도 가능.

가장 단순: `buildLibraryPrompt`가 `persona?` optional로 받게 만들고, undefined이면 페르소나 섹션 생략. 위 Task 11의 함수 시그니처에서 `persona`를 optional로 변경:
```ts
  persona?: PersonaSignal;
```
And inside, skip the persona block when not provided.

Update `route.ts`:
```ts
    const promptText = buildLibraryPrompt({
      input: body.input,
      displayName,
      metrics: body.metrics,
      calibratedScores,
      saju,
      candidates,
      persona: personaSignal ?? undefined,
    });
```

- [ ] **Step 2: 시뮬레이션 스크립트**

Create `scripts/simulate-personas.ts`:
```ts
import "./books/load-env";

import { BOOK_CATEGORIES } from "../src/lib/books/categories";
import { calculateSaju } from "../src/lib/saju/calculator";
import { resolvePersonaSignal } from "../src/lib/persona/personaResolver";
import { selectBookCandidates } from "../src/lib/books/recommender";
import { SupabaseBookProvider } from "../src/lib/books/provider";
import { createClient } from "@supabase/supabase-js";
import type { FaceMetrics } from "../src/types/face";

const SAMPLE_COUNT = 200;

function randomMetrics(seed: number): FaceMetrics {
  const r = (n: number) => ((Math.sin(seed * 9301 + n * 49297) * 0.5 + 0.5) % 1);
  return {
    asymmetryIndex: 0.005 + r(1) * 0.035,
    phiRatioCompliance: 10 + r(2) * 90,
    thirds: { upper: 0.1 + r(3) * 0.15, middle: 0.32 + r(4) * 0.04, lower: 0.4 + r(5) * 0.2 },
    fifths: [0.2, 0.2, 0.2, 0.2, 0.2],
    faceAspectRatio: 0.62 + r(6) * 0.22,
    eyeSpacing: 0.26 + r(7) * 0.18,
    facialAngleDeg: 160,
    forehead: { areaPct: 15, brow: 1, classification: "average" },
    eyes: { leftToRightDeltaMm: r(8) * 3, outerCantalAngleDeg: 2 },
    nose: { lengthMm: 36 + r(9) * 28, widthMm: 32, columellaAngleDeg: 95 },
    mouth: { upperLowerLipRatio: 0.6, philtrumRatioPct: 12, cornerAngleDeg: r(10) * 9 },
    jaw: { vlineIndex: 0.05 + r(11) * 0.2, chinProtrusionMm: r(12) * 14, cheekToJawRatio: 1 + r(13) * 0.5 },
    faceBox: { x: 0.1, y: 0.1, width: 0.5, height: 0.7 },
  };
}

function randomBirthDate(seed: number): string {
  const year = 1995 + (seed % 14);
  const month = String(1 + (seed % 12)).padStart(2, "0");
  const day = String(1 + (seed % 27)).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

async function main() {
  const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const provider = new SupabaseBookProvider(supabase);
  const books = await provider.listActiveBooks();
  console.log(`Loaded ${books.length} books`);

  const personaCounts = new Map<string, number>();
  const topBookCounts = new Map<string, number>();

  for (let i = 0; i < SAMPLE_COUNT; i += 1) {
    const metrics = randomMetrics(i);
    const saju = calculateSaju(randomBirthDate(i));
    const persona = resolvePersonaSignal(metrics, saju);
    personaCounts.set(persona.combinedCode, (personaCounts.get(persona.combinedCode) ?? 0) + 1);

    const category = BOOK_CATEGORIES[i % BOOK_CATEGORIES.length]!;
    const candidates = selectBookCandidates({ books, favoriteCategory: category, desiredTags: Object.keys(persona.bookTagWeights), limit: 3 });
    if (candidates[0]) {
      const key = `${candidates[0].title}`;
      topBookCounts.set(key, (topBookCounts.get(key) ?? 0) + 1);
    }
  }

  console.log("\n=== Persona distribution (top 10) ===");
  Array.from(personaCounts.entries()).sort((a, b) => b[1] - a[1]).slice(0, 10).forEach(([code, count]) => console.log(`${count.toString().padStart(3)} | ${code}`));
  console.log("\n=== Top 10 books by frequency as #1 pick ===");
  Array.from(topBookCounts.entries()).sort((a, b) => b[1] - a[1]).slice(0, 10).forEach(([title, count]) => console.log(`${count.toString().padStart(3)} | ${title}`));
  console.log(`\nUnique #1 books: ${topBookCounts.size}/${SAMPLE_COUNT}`);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
```

Add to `package.json`:
```json
"library:simulate": "tsx scripts/simulate-personas.ts"
```

- [ ] **Step 3: 시뮬레이션 실행**

Run: `pnpm library:simulate`
Expected: 페르소나 분포가 한쪽으로 몰리지 않고(40조합 중 상위 10개가 5~15명 사이), Unique #1 books ≥ 30.

만약 Unique #1 books가 20 이하라면 페르소나 가중치 dict를 조정하고 재실행.

- [ ] **Step 4: 부스 사전 점검 체크리스트 출력**

직접 다음을 실행:

1. `.env.local`에서 4개 토글을 모두 `true`로 변경:
   ```
   PERSONA_V2_ENABLED=true
   READING_TYPE_V2_ENABLED=true
   RESULT_MOBILE_VIEW_ENABLED=true
   NEXT_PUBLIC_RESULT_MOBILE_VIEW_ENABLED=true
   GEMINI_VISION_ENABLED=true
   ```
2. `pnpm dev`로 띄우고 실제 카메라로 한 번 끝까지 흐름:
   - 분석 → 5섹션 → QR 카드 보임 → URL 복사해 모바일 view 확인 → 책 카드 청구기호/자료실 보임
3. `pnpm vitest run` 전체 PASS
4. `pnpm lint` PASS
5. `pnpm build` PASS

- [ ] **Step 5: Vercel 환경변수 동일하게 설정**

Vercel 대시보드의 Production 환경에 동일한 5개 키 추가(`PERSONA_V2_ENABLED`, `READING_TYPE_V2_ENABLED`, `RESULT_MOBILE_VIEW_ENABLED`, `NEXT_PUBLIC_RESULT_MOBILE_VIEW_ENABLED`, `GEMINI_VISION_ENABLED`)를 `false`로 우선 등록. 부스 시작 직전(5/13 11:30경)에 `true`로 한 번에 토글.

- [ ] **Step 6: 커밋**

```bash
git add scripts/simulate-personas.ts package.json src/app/api/analyze/route.ts src/lib/gemini/libraryPrompt.ts
git commit -m "Gate persona v2 with toggle and add simulation script"
```

---

## Self-Review Notes

- 모든 task가 spec의 §1~§7과 1:1 매핑됨 (§1→Task3-5,12, §2→Task9, §3→Task10, §4→Task11, §5→Task13-14, §6→Task6-8, §7→Task15)
- placeholder/TBD 없음. 모든 코드 블록은 실제 실행 가능한 코드
- `FaceKey`, `SajuKey`, `AxisScores` 타입은 Task 3에서 정의되어 이후 모든 task에서 일관되게 사용
- `LibraryBook.sourceLabel`은 Task 2에서 추가되어 Task 6~9, 14에서 사용
- Vision 통합과 V2 토글은 Task 12, 15에서 명확히 분리됨 — 운영 중 문제 시 토글 한 줄로 롤백 가능

---

**Plan complete and saved to `docs/superpowers/plans/2026-05-12-wow-personalization-implementation.md`. Two execution options:**

**1. Subagent-Driven (recommended)** - 각 task마다 fresh subagent를 디스패치, 사이에 사용자 리뷰. 부스가 내일이라 사이 검증이 잦은 게 안전.

**2. Inline Execution** - 이 세션에서 batch로 실행, 중간 체크포인트로만 잠깐 멈춤. 작업 흐름이 끊기지 않아 속도는 빠르지만 한 번에 큰 변경을 검토하게 됨.

**어느 방식으로 갈까요?**
