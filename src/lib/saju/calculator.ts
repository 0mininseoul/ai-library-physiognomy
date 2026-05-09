export type SajuElement = "wood" | "fire" | "earth" | "metal" | "water";
export type SajuPrecision = "date_only";

type Stem = {
  hanja: string;
  korean: string;
  element: SajuElement;
  elementLabel: string;
  yinYang: "yang" | "yin";
};

type Branch = {
  hanja: string;
  korean: string;
  element: SajuElement;
  elementLabel: string;
  hiddenStemIndexes: number[];
};

export type SajuPillar = {
  label: string;
  stem: Stem;
  branch: Branch;
};

export type SajuCalculation = {
  birthDate: string;
  precision: SajuPrecision;
  precisionLabel: string;
  yearPillar: SajuPillar;
  monthPillar: SajuPillar;
  dayPillar: SajuPillar;
  hourPillar: null;
  dayMaster: {
    hanja: string;
    korean: string;
    label: string;
    element: SajuElement;
    elementLabel: string;
    yinYang: "yang" | "yin";
  };
  elementCounts: Record<SajuElement, number>;
  dominantElements: SajuElement[];
  dominantElementLabels: string[];
  facts: string[];
};

const STEMS: Stem[] = [
  { hanja: "甲", korean: "갑", element: "wood", elementLabel: "나무", yinYang: "yang" },
  { hanja: "乙", korean: "을", element: "wood", elementLabel: "나무", yinYang: "yin" },
  { hanja: "丙", korean: "병", element: "fire", elementLabel: "불", yinYang: "yang" },
  { hanja: "丁", korean: "정", element: "fire", elementLabel: "불", yinYang: "yin" },
  { hanja: "戊", korean: "무", element: "earth", elementLabel: "흙", yinYang: "yang" },
  { hanja: "己", korean: "기", element: "earth", elementLabel: "흙", yinYang: "yin" },
  { hanja: "庚", korean: "경", element: "metal", elementLabel: "금", yinYang: "yang" },
  { hanja: "辛", korean: "신", element: "metal", elementLabel: "금", yinYang: "yin" },
  { hanja: "壬", korean: "임", element: "water", elementLabel: "물", yinYang: "yang" },
  { hanja: "癸", korean: "계", element: "water", elementLabel: "물", yinYang: "yin" },
];

const BRANCHES: Branch[] = [
  { hanja: "子", korean: "자", element: "water", elementLabel: "물", hiddenStemIndexes: [9] },
  { hanja: "丑", korean: "축", element: "earth", elementLabel: "흙", hiddenStemIndexes: [5, 9, 7] },
  { hanja: "寅", korean: "인", element: "wood", elementLabel: "나무", hiddenStemIndexes: [0, 2, 4] },
  { hanja: "卯", korean: "묘", element: "wood", elementLabel: "나무", hiddenStemIndexes: [1] },
  { hanja: "辰", korean: "진", element: "earth", elementLabel: "흙", hiddenStemIndexes: [4, 1, 9] },
  { hanja: "巳", korean: "사", element: "fire", elementLabel: "불", hiddenStemIndexes: [2, 4, 6] },
  { hanja: "午", korean: "오", element: "fire", elementLabel: "불", hiddenStemIndexes: [3, 5] },
  { hanja: "未", korean: "미", element: "earth", elementLabel: "흙", hiddenStemIndexes: [5, 3, 1] },
  { hanja: "申", korean: "신", element: "metal", elementLabel: "금", hiddenStemIndexes: [6, 8, 4] },
  { hanja: "酉", korean: "유", element: "metal", elementLabel: "금", hiddenStemIndexes: [7] },
  { hanja: "戌", korean: "술", element: "earth", elementLabel: "흙", hiddenStemIndexes: [4, 7, 3] },
  { hanja: "亥", korean: "해", element: "water", elementLabel: "물", hiddenStemIndexes: [8, 0] },
];

const MS_PER_DAY = 24 * 60 * 60 * 1000;
const DAY_ANCHOR_UTC_DAY = Date.UTC(2000, 10, 13) / MS_PER_DAY;
const DAY_ANCHOR_INDEX = 11; // 2000-11-13 is 乙亥 when 甲子 is index 0.

const ELEMENT_ORDER: SajuElement[] = ["wood", "fire", "earth", "metal", "water"];

export function calculateSaju(birthDate: string): SajuCalculation {
  const date = parseBirthDate(birthDate);
  const solarYear = isBeforeLichun(date) ? date.year - 1 : date.year;
  const yearIndex = mod(solarYear - 1984, 60);
  const yearPillar = pillarFromIndex(yearIndex);
  const monthBranchIndex = monthBranchIndexFor(date);
  const monthStemIndex = monthStemIndexFor(yearPillar.stem, monthBranchIndex);
  const monthPillar = pillar(monthStemIndex, monthBranchIndex);
  const dayIndex = mod(DAY_ANCHOR_INDEX + (toUtcDay(date) - DAY_ANCHOR_UTC_DAY), 60);
  const dayPillar = pillarFromIndex(dayIndex);
  const elementCounts = countElements([yearPillar, monthPillar, dayPillar]);
  const dominantElements = [...ELEMENT_ORDER].sort((left, right) => elementCounts[right] - elementCounts[left]);
  const topCount = elementCounts[dominantElements[0]];
  const dominantTop = dominantElements.filter((element) => elementCounts[element] === topCount);

  return {
    birthDate,
    precision: "date_only",
    precisionLabel: "생년월일 기준, 태어난 시간 미포함",
    yearPillar,
    monthPillar,
    dayPillar,
    hourPillar: null,
    dayMaster: {
      hanja: dayPillar.stem.hanja,
      korean: dayPillar.stem.korean,
      label: `${dayPillar.stem.hanja}${elementHanja(dayPillar.stem.element)}`,
      element: dayPillar.stem.element,
      elementLabel: dayPillar.stem.elementLabel,
      yinYang: dayPillar.stem.yinYang,
    },
    elementCounts,
    dominantElements: dominantTop,
    dominantElementLabels: dominantTop.map((element) => elementLabel(element)),
    facts: [
      `년주 ${yearPillar.label}, 월주 ${monthPillar.label}, 일주 ${dayPillar.label}`,
      `일간은 ${dayPillar.stem.hanja}${elementHanja(dayPillar.stem.element)}(${dayPillar.stem.korean}, ${dayPillar.stem.elementLabel})`,
      `오행 분포는 ${formatElementCounts(elementCounts)}`,
      "태어난 시간을 받지 않아 시주는 계산하지 않음",
    ],
  };
}

function parseBirthDate(value: string) {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
  if (!match) throw new Error("birth_date_must_be_yyyy_mm_dd");

  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  const utc = new Date(Date.UTC(year, month - 1, day));
  if (utc.getUTCFullYear() !== year || utc.getUTCMonth() !== month - 1 || utc.getUTCDate() !== day) {
    throw new Error("invalid_birth_date");
  }

  return { year, month, day };
}

function isBeforeLichun(date: { month: number; day: number }) {
  return date.month < 2 || (date.month === 2 && date.day < 4);
}

function monthBranchIndexFor(date: { month: number; day: number }) {
  const key = date.month * 100 + date.day;
  if (key >= 1207) return 0; // 子
  if (key >= 1107) return 11; // 亥
  if (key >= 1008) return 10; // 戌
  if (key >= 908) return 9; // 酉
  if (key >= 808) return 8; // 申
  if (key >= 707) return 7; // 未
  if (key >= 606) return 6; // 午
  if (key >= 506) return 5; // 巳
  if (key >= 405) return 4; // 辰
  if (key >= 306) return 3; // 卯
  if (key >= 204) return 2; // 寅
  if (key >= 106) return 1; // 丑
  return 0; // 子
}

function monthStemIndexFor(yearStem: Stem, monthBranchIndex: number) {
  const yearStemIndex = STEMS.indexOf(yearStem);
  const tigerStemStart =
    yearStemIndex === 0 || yearStemIndex === 5
      ? 2
      : yearStemIndex === 1 || yearStemIndex === 6
        ? 4
        : yearStemIndex === 2 || yearStemIndex === 7
          ? 6
          : yearStemIndex === 3 || yearStemIndex === 8
            ? 8
            : 0;
  const offsetFromTiger = mod(monthBranchIndex - 2, 12);
  return mod(tigerStemStart + offsetFromTiger, 10);
}

function pillarFromIndex(index: number): SajuPillar {
  return pillar(mod(index, 10), mod(index, 12));
}

function pillar(stemIndex: number, branchIndex: number): SajuPillar {
  const stem = STEMS[stemIndex];
  const branch = BRANCHES[branchIndex];
  if (!stem || !branch) throw new Error("invalid_pillar_index");
  return {
    label: `${stem.hanja}${branch.hanja}`,
    stem,
    branch,
  };
}

function countElements(pillars: SajuPillar[]): Record<SajuElement, number> {
  const counts: Record<SajuElement, number> = {
    wood: 0,
    fire: 0,
    earth: 0,
    metal: 0,
    water: 0,
  };

  for (const current of pillars) {
    counts[current.stem.element] += 1;
    counts[current.branch.element] += 1;
    for (const hiddenStemIndex of current.branch.hiddenStemIndexes) {
      const stem = STEMS[hiddenStemIndex];
      if (stem) counts[stem.element] += 1;
    }
  }

  return counts;
}

function formatElementCounts(counts: Record<SajuElement, number>) {
  return ELEMENT_ORDER.map((element) => `${elementLabel(element)} ${counts[element]}`).join(", ");
}

function elementLabel(element: SajuElement) {
  if (element === "wood") return "나무";
  if (element === "fire") return "불";
  if (element === "earth") return "흙";
  if (element === "metal") return "금";
  return "물";
}

function elementHanja(element: SajuElement) {
  if (element === "wood") return "木";
  if (element === "fire") return "火";
  if (element === "earth") return "土";
  if (element === "metal") return "金";
  return "水";
}

function toUtcDay(date: { year: number; month: number; day: number }) {
  return Date.UTC(date.year, date.month - 1, date.day) / MS_PER_DAY;
}

function mod(value: number, divisor: number) {
  return ((value % divisor) + divisor) % divisor;
}
