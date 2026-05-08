export type ParticleKind = "subject" | "topic" | "object" | "vocative" | "to" | "with" | "direction";

const HANGUL_BASE = 0xac00;
const HANGUL_END = 0xd7a3;
const FINAL_CONSONANT_COUNT = 28;

export function displayGivenName(fullName: string): string {
  const trimmed = fullName.trim();
  if (!trimmed) return "";
  if (/^[가-힣]{2,4}$/.test(trimmed) && trimmed.length >= 2) {
    return trimmed.slice(1);
  }
  return trimmed;
}

export function hasFinalConsonant(value: string): boolean {
  const char = [...value.trim()].at(-1);
  if (!char) return false;
  const code = char.charCodeAt(0);
  if (code < HANGUL_BASE || code > HANGUL_END) return false;
  return (code - HANGUL_BASE) % FINAL_CONSONANT_COUNT !== 0;
}

export function particle(name: string, kind: ParticleKind): string {
  const final = hasFinalConsonant(name);
  if (kind === "subject") return `${name}${final ? "이" : "가"}`;
  if (kind === "topic") return `${name}${final ? "은" : "는"}`;
  if (kind === "object") return `${name}${final ? "을" : "를"}`;
  if (kind === "vocative") return vocative(name);
  if (kind === "to") return `${name}${final ? "이에게" : "에게"}`;
  if (kind === "with") return `${name}${final ? "과" : "와"}`;
  if (kind === "direction") return `${name}${final ? "으로" : "로"}`;
  return name;
}

export function vocative(name: string): string {
  return `${name}${hasFinalConsonant(name) ? "아" : "야"}`;
}
