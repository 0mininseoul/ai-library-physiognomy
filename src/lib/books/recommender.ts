import { createHash } from "node:crypto";
import type { NeedFocus } from "@/types/session";
import type { LibraryBook } from "./types";

export function selectBookCandidates({
  books,
  favoriteCategory,
  desiredTags,
  limit = 20,
}: {
  books: LibraryBook[];
  favoriteCategory: string;
  desiredTags: string[];
  limit?: number;
}): LibraryBook[] {
  return [...books]
    .map((book) => ({ book, score: scoreBook(book, favoriteCategory, desiredTags) }))
    .sort((a, b) => b.score - a.score || a.book.title.localeCompare(b.book.title, "ko"))
    .slice(0, limit)
    .map((item) => item.book);
}

function scoreBook(book: LibraryBook, favoriteCategory: string, desiredTags: string[]): number {
  const categoryScore = book.category === favoriteCategory ? 10 : 0;
  const tagScore = desiredTags.filter((tag) => book.tags.includes(tag)).length * 4;
  const descriptionScore = book.description ? 1 : 0;
  const discoveryBonus = isDiscoveryFriendly(book) ? 2 : 0;
  return categoryScore + tagScore + descriptionScore + discoveryBonus - bestsellerPenalty(book);
}

export function bestsellerPenalty(book: LibraryBook): number {
  const rank = Number.parseInt(book.sourceId, 10);
  const data4LibraryRankPenalty = book.source === "data4library" && Number.isFinite(rank) ? Math.max(0, 5 - Math.floor((rank - 1) / 20)) : 0;
  const titlePenalty = OBVIOUS_BESTSELLER_PATTERNS.some((pattern) => pattern.test(book.title)) ? 4 : 0;
  return data4LibraryRankPenalty + titlePenalty;
}

function isDiscoveryFriendly(book: LibraryBook) {
  return book.description.length >= 40 || book.tags.length >= 3;
}

const OBVIOUS_BESTSELLER_PATTERNS = [
  /불편한\s*편의점/,
  /아몬드/,
  /역행자/,
  /세이노의\s*가르침/,
  /원씽|the\s*one\s*thing/i,
  /데미안/,
  /어린\s*왕자/,
  /미움받을\s*용기/,
  /돈의\s*속성/,
  /달러구트/,
] as const;

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
  return ((value % 5) - 2) * 0.4;
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
