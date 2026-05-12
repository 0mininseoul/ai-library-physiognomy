import type { GachonRawBook } from "./types";

export type MetadataProvider =
  | "naver"
  | "naver_adv"
  | "kakao"
  | "google_books"
  | "data4library"
  | "gachon_library"
  | "nlk_isbn"
  | "aladin"
  | "manual";

export type MetadataCandidate = {
  provider: MetadataProvider;
  isbn13: string | null;
  title: string;
  authors: string[];
  publisher: string;
  publishedYear: number | string | null;
  description: string;
  coverUrl: string | null;
  detailUrl: string | null;
  query: string;
  fetchedAt: string;
};

export type MatchDecision = "accept" | "review_needed" | "reject";

export type MetadataMatchResult = {
  decision: MatchDecision;
  score: number;
  signals: Record<string, number | string | boolean>;
};

export type ScoredMetadataCandidate = MetadataMatchResult & {
  candidate: MetadataCandidate;
};

const TITLE_WEIGHT = 0.45;
const AUTHOR_WEIGHT = 0.2;
const PUBLISHER_WEIGHT = 0.2;
const YEAR_WEIGHT = 0.1;
const ISBN_WEIGHT = 0.05;

export function normalizeBookTitle(input: string): string {
  return cleanText(input)
    .replace(/^\([^)]*\)\s*/g, "")
    .replace(/^[\[【〈「『][^\]】〉」』]*[\]】〉」』]\s*/g, "")
    .replace(/\s*[=:：]\s*.*$/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

export function normalizePublisher(input: string): string {
  return cleanText(input)
    .split(/\s*[:：/]\s*/)[0]!
    .replace(/\s+/g, " ")
    .trim();
}

export function yearMatchScore(expectedYear: number | null, candidateYear: number | string | null | undefined): number {
  if (!expectedYear || candidateYear == null) return 0;
  const year = parseYear(candidateYear);
  if (!Number.isFinite(year)) return 0;
  const diff = Math.abs(expectedYear - year!);
  if (diff === 0) return 1;
  if (diff === 1) return 0.65;
  if (diff === 2) return 0.35;
  if (diff === 3) return 0.15;
  return 0;
}

export function extractIsbn13(input: string | null | undefined): string | null {
  const matches = input?.match(/(?:97[89][\d -]{10,20})/g) ?? [];
  for (const match of matches) {
    const digits = match.replace(/\D/g, "");
    if (digits.length === 13) return digits;
  }
  return null;
}

export function scoreMetadataCandidate(book: GachonRawBook, candidate: MetadataCandidate): MetadataMatchResult {
  const title = titleSimilarity(normalizeBookTitle(book.title), normalizeBookTitle(candidate.title));
  const author = authorMatchScore(book.author, candidate.authors);
  const publisher = publisherMatchScore(book.publisher, candidate.publisher);
  const year = yearMatchScore(book.publishedYear, candidate.publishedYear);
  const isbn = candidate.isbn13 && extractIsbn13(candidate.isbn13) ? 1 : 0;
  const candidateYear = parseYear(candidate.publishedYear);
  const yearContradiction = Boolean(book.publishedYear && candidateYear && Math.abs(book.publishedYear - candidateYear) > 3);
  const hardContradiction = title < 0.35 || yearContradiction;
  const bibliographicOverride = isStrongBibliographicMatch({ book, candidate, title, author, publisher, year, isbn, hardContradiction });
  const score = round2(
    title * TITLE_WEIGHT + author * AUTHOR_WEIGHT + publisher * PUBLISHER_WEIGHT + year * YEAR_WEIGHT + isbn * ISBN_WEIGHT,
  );
  const decision = decide(score, title, hardContradiction, bibliographicOverride);

  return {
    decision,
    score,
    signals: {
      title,
      author,
      publisher,
      year,
      isbn,
      isbnPresent: Boolean(isbn),
      bookYear: book.publishedYear ?? "",
      candidateYear: candidateYear ?? "",
      yearContradiction,
      hardContradiction,
      bibliographicOverride,
    },
  };
}

export function pickBestCandidate(book: GachonRawBook, candidates: MetadataCandidate[]): ScoredMetadataCandidate | null {
  const scored = candidates
    .map((candidate) => ({
      candidate,
      ...scoreMetadataCandidate(book, candidate),
    }))
    .filter((result) => result.decision !== "reject")
    .sort((left, right) => decisionPriority(right.decision) - decisionPriority(left.decision) || right.score - left.score);

  return scored[0] ?? null;
}

function decisionPriority(decision: MatchDecision): number {
  if (decision === "accept") return 2;
  if (decision === "review_needed") return 1;
  return 0;
}

function cleanText(input: string): string {
  return input
    .replace(/<[^>]+>/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

function normalizeComparable(input: string): string {
  return cleanText(input).toLowerCase().replace(/[^\p{Letter}\p{Number}]+/gu, "");
}

export function titleSimilarity(left: string, right: string): number {
  const a = normalizeComparable(left);
  const b = normalizeComparable(right);
  if (!a || !b) return 0;
  if (a === b) return 1;
  if (a.includes(b) || b.includes(a)) return 0.86;
  const longer = a.length >= b.length ? a : b;
  const shorter = a.length >= b.length ? b : a;
  const matched = Array.from(shorter).filter((ch) => longer.includes(ch)).length;
  return round2(matched / longer.length);
}

export function authorMatchScore(expected: string, candidates: string[]): number {
  const expectedName = normalizeComparable(expected.replace(/지음|저자|엮음|옮김/g, ""));
  if (!expectedName) return 0;
  return candidates.some((candidate) => normalizeComparable(candidate.replace(/지음|저자|엮음|옮김/g, "")).includes(expectedName)) ? 1 : 0;
}

export function publisherMatchScore(expected: string, candidate: string): number {
  const left = normalizeComparable(normalizePublisher(expected));
  const right = normalizeComparable(normalizePublisher(candidate));
  if (!left || !right) return 0;
  if (left === right) return 1;
  if (left.includes(right) || right.includes(left)) return 0.72;
  return 0;
}

function isStrongBibliographicMatch({
  book,
  candidate,
  title,
  author,
  publisher,
  year,
  isbn,
  hardContradiction,
}: {
  book: GachonRawBook;
  candidate: MetadataCandidate;
  title: number;
  author: number;
  publisher: number;
  year: number;
  isbn: number;
  hardContradiction: boolean;
}): boolean {
  return (
    !hardContradiction &&
    (title >= 0.86 || (title >= 0.55 && author === 1 && publisher >= 0.72)) &&
    isbn === 1 &&
    year >= 0.65 &&
    Boolean(candidate.coverUrl) &&
    Boolean(candidate.description) &&
    (publisher >= 0.72 || author === 1) &&
    hasSafeTitleAlignment(book.title, candidate.title)
  );
}

function hasSafeTitleAlignment(bookTitle: string, candidateTitle: string): boolean {
  const bookComparable = normalizeComparable(normalizeBookTitle(bookTitle));
  const candidateComparable = normalizeComparable(normalizeBookTitle(candidateTitle));
  if (bookComparable && candidateComparable && (bookComparable === candidateComparable || candidateComparable.startsWith(bookComparable))) {
    return true;
  }
  const bookWithoutParenthetical = comparableWithoutParenthetical(bookTitle);
  const candidateWithoutParenthetical = comparableWithoutParenthetical(candidateTitle);
  if (
    bookWithoutParenthetical &&
    candidateWithoutParenthetical &&
    (bookWithoutParenthetical === candidateWithoutParenthetical || candidateWithoutParenthetical.startsWith(bookWithoutParenthetical))
  ) {
    return true;
  }

  if (hasOriginalTitleCoverage(bookTitle, candidateTitle)) return true;

  const bookTokens = meaningfulTitleTokens(bookTitle);
  const candidate = normalizeComparable(candidateTitle);
  if (bookTokens.length < 3) return false;
  const covered = bookTokens.filter((token) => candidate.includes(token)).length;
  return covered / bookTokens.length >= 0.8;
}

function comparableWithoutParenthetical(input: string): string {
  return normalizeComparable(
    input
      .replace(/[({\[\u3010\u3008\u300c\u300e][^)\]}\u3011\u3009\u300d\u300f]*[)\]}\u3011\u3009\u300d\u300f]/g, " ")
      .replace(/\s*[=:：]\s*.*$/g, ""),
  );
}

function hasOriginalTitleCoverage(bookTitle: string, candidateTitle: string): boolean {
  const originalTokens = titleTokens(bookTitle);
  if (originalTokens.length < 3) return false;
  const candidate = normalizeComparable(candidateTitle);
  const covered = originalTokens.filter((token) => candidate.includes(token)).length;
  return covered / originalTokens.length >= 0.8;
}

function meaningfulTitleTokens(input: string): string[] {
  const normalized = normalizeBookTitle(input)
    .replace(/[(){}\[\]【】〈〉「」『』]/g, " ")
    .replace(/[=:：]/g, " ");
  return titleTokens(normalized);
}

function titleTokens(input: string): string[] {
  return input
    .replace(/[(){}\[\]【】〈〉「」『』:：=]/g, " ")
    .split(/\s+/)
    .map(normalizeComparable)
    .filter((token) => token.length >= 2 && !/^\d+$/.test(token));
}

function decide(score: number, title: number, hardContradiction: boolean, bibliographicOverride: boolean): MatchDecision {
  if (bibliographicOverride) return "accept";
  if (score >= 0.82 && title >= 0.55 && !hardContradiction) return "accept";
  if (score >= 0.65) return "review_needed";
  return "reject";
}

function parseYear(input: number | string | null | undefined): number | null {
  if (typeof input === "number") return Number.isFinite(input) ? input : null;
  if (!input) return null;
  const match = input.match(/\d{4}/);
  if (!match) return null;
  const year = Number.parseInt(match[0], 10);
  return Number.isFinite(year) ? year : null;
}

function round2(value: number) {
  return Math.round(value * 100) / 100;
}
