export type ParticleKind = "subject" | "topic" | "object" | "vocative" | "to" | "with" | "direction";

const HANGUL_BASE = 0xac00;
const HANGUL_END = 0xd7a3;
const FINAL_CONSONANT_COUNT = 28;
const RIEUL_FINAL_CONSONANT_INDEX = 8;

export function displayGivenName(fullName: string): string {
  const trimmed = fullName.trim();
  if (!trimmed) return "";
  if (/^[가-힣]{2,4}$/.test(trimmed) && trimmed.length >= 2) {
    return trimmed.slice(1);
  }
  return trimmed;
}

export function hasFinalConsonant(value: string): boolean {
  const finalConsonantIndex = getFinalConsonantIndex(value);
  return finalConsonantIndex !== null && finalConsonantIndex !== 0;
}

function hasRieulFinalConsonant(value: string): boolean {
  return getFinalConsonantIndex(value) === RIEUL_FINAL_CONSONANT_INDEX;
}

function getFinalConsonantIndex(value: string): number | null {
  const char = [...value.trim()].at(-1);
  if (!char) return null;
  const code = char.charCodeAt(0);
  if (code < HANGUL_BASE || code > HANGUL_END) return null;
  return (code - HANGUL_BASE) % FINAL_CONSONANT_COUNT;
}

export function particle(name: string, kind: ParticleKind): string {
  const final = hasFinalConsonant(name);
  if (kind === "subject") return `${name}${final ? "이" : "가"}`;
  if (kind === "topic") return `${name}${final ? "은" : "는"}`;
  if (kind === "object") return `${name}${final ? "을" : "를"}`;
  if (kind === "vocative") return vocative(name);
  if (kind === "to") return `${name}${final ? "이에게" : "에게"}`;
  if (kind === "with") return `${name}${final ? "과" : "와"}`;
  if (kind === "direction") return `${name}${final && !hasRieulFinalConsonant(name) ? "으로" : "로"}`;
  return name;
}

export function vocative(name: string): string {
  return `${name}${hasFinalConsonant(name) ? "아" : "야"}`;
}

export function honorific(name: string): string {
  const trimmed = name.trim();
  return trimmed ? `${trimmed}님` : "회원님";
}

export function softenFormalPolite(input: string): string {
  return input
    .replace(/아닙니다/g, "아니에요")
    .replace(/했습니다/g, "했어요")
    .replace(/있습니다/g, "있어요")
    .replace(/없습니다/g, "없어요")
    .replace(/좋습니다/g, "좋아요")
    .replace(/맞습니다/g, "맞아요")
    .replace(/보입니다/g, "보여요")
    .replace(/읽힙니다/g, "읽혀요")
    .replace(/드러납니다/g, "드러나요")
    .replace(/붙습니다/g, "붙어요")
    .replace(/합니다/g, "해요")
    .replace(/됩니다/g, "돼요")
    .replace(/되었습니다/g, "되었어요")
    .replace(/습니다/g, "어요")
    .replace(/([가-힣A-Za-z0-9)%]+)입니다/g, (match, word: string) => {
      const last = [...word].at(-1) ?? "";
      if (/^[가-힣]$/.test(last)) return `${word}${hasFinalConsonant(word) ? "이에요" : "예요"}`;
      return `${word}예요`;
    });
}
