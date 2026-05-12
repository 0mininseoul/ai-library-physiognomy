import { describe, expect, it } from "vitest";
import type { GachonRawBook } from "../../scripts/library/types";
import {
  extractIsbn13,
  normalizeBookTitle,
  normalizePublisher,
  pickBestCandidate,
  scoreMetadataCandidate,
  yearMatchScore,
  type MetadataCandidate,
} from "../../scripts/library/metadata-match";

function rawBook(overrides: Partial<GachonRawBook> = {}): GachonRawBook {
  return {
    sourceLabel: "bookcuration",
    registrationNo: "UEM000000001",
    title: "정보통신개론",
    author: "홍길동",
    publisher: "더퀘스트",
    publishedYear: 2025,
    callNumber: "004 홍18ㅈ",
    locationLabel: "중앙도서관",
    locationRoom: "북큐레이션코너(1층)",
    status: "이용가능",
    availability: "available",
    ...overrides,
  };
}

function candidate(overrides: Partial<MetadataCandidate> = {}): MetadataCandidate {
  return {
    provider: "naver",
    isbn13: "9788996991342",
    title: "정보통신개론",
    authors: ["홍길동"],
    publisher: "더퀘스트",
    publishedYear: "2025-01-15",
    description: "정보통신 입문서",
    coverUrl: "https://example.com/cover.jpg",
    detailUrl: "https://example.com/book",
    query: "정보통신개론 홍길동",
    fetchedAt: "2026-05-13T00:00:00.000Z",
    ...overrides,
  };
}

describe("Gachon metadata matching", () => {
  it("normalizes decorated Korean book titles to their searchable title", () => {
    expect(normalizeBookTitle("(4차 산업혁명 시대의) 정보통신개론 = Understanding of ICT")).toBe("정보통신개론");
  });

  it("normalizes publisher imprint suffixes", () => {
    expect(normalizePublisher("더퀘스트 : 길벗")).toBe("더퀘스트");
  });

  it("scores adjacent publication years from date-like values", () => {
    expect(yearMatchScore(2025, "2024-12-31")).toBeGreaterThan(0);
  });

  it("extracts the ISBN-13 when an ISBN-10 is also present", () => {
    expect(extractIsbn13("8996991341 9788996991342")).toBe("9788996991342");
  });

  it("rejects a wrong candidate for a Gachon book", () => {
    const result = scoreMetadataCandidate(
      rawBook(),
      candidate({
        title: "인공지능 수학",
        authors: ["김철수"],
        publisher: "한빛미디어",
        publishedYear: 2018,
      }),
    );

    expect(result.decision).toBe("reject");
    expect(result.signals.hardContradiction).toBe(true);
  });

  it("accepts a strong Naver or Kakao-style candidate", () => {
    const result = scoreMetadataCandidate(
      rawBook({ title: "(4차 산업혁명 시대의) 정보통신개론 = Understanding of ICT" }),
      candidate({
        provider: "kakao",
        title: "정보통신개론",
        authors: ["홍길동 지음"],
        publisher: "더퀘스트 : 길벗",
        publishedYear: "2024-12-31",
      }),
    );

    expect(result.decision).toBe("accept");
    expect(result.score).toBeGreaterThanOrEqual(0.82);
    expect(result.signals.hardContradiction).toBe(false);
  });

  it("accepts title matches when the library title has a leading qualifier and subtitle", () => {
    const result = scoreMetadataCandidate(
      rawBook({
        title: "(처음이야? 파이썬) 데이터 분석 : 동영상+핵심노트+오픈채팅+스터디로 함께 배우기",
        author: "윤영빈",
        publisher: "영진.com(영진닷컴)",
      }),
      candidate({
        title: "처음이야? 파이썬 데이터 분석 (동영상 강의로 배우는 259개 코드 따라하기)",
        authors: ["윤영빈^이용희^오환"],
        publisher: "영진닷컴",
        publishedYear: 2025,
        isbn13: "9788931478013",
      }),
    );

    expect(result.decision).toBe("accept");
    expect(result.signals.title).toBeGreaterThanOrEqual(0.55);
  });

  it("accepts translated-author matches when title, publisher, year, isbn, cover, and description align", () => {
    const result = scoreMetadataCandidate(
      rawBook({
        title: "AI 혁신 바이블 : 아날로그 기업은 인공지능 시대에 어떻게 살아남는가",
        author: "Davenport, Thomas H",
        publisher: "더퀘스트(길벗)",
        publishedYear: 2024,
      }),
      candidate({
        title: "AI 혁신 바이블",
        authors: ["토머스 H. 데븐포트", "니틴 미탈"],
        publisher: "더퀘스트",
        publishedYear: 2024,
        isbn13: "9791140712342",
        coverUrl: "https://example.com/cover.jpg",
        description: "AI 혁신을 다루는 비즈니스 전략서",
      }),
    );

    expect(result.decision).toBe("accept");
    expect(result.signals.bibliographicOverride).toBe(true);
  });

  it("keeps short generic title overlaps in review when only topic words align", () => {
    const result = scoreMetadataCandidate(
      rawBook({
        title: "(모두를 위한) 양자 컴퓨터 : 누구나 쉽게 이해하는 양자 컴퓨터 원리부터 활용까지",
        author: "홍길동",
        publisher: "한빛미디어",
        publishedYear: 2024,
      }),
      candidate({
        title: "정지훈의 양자 컴퓨터 강의",
        authors: ["정지훈"],
        publisher: "한빛미디어",
        publishedYear: 2024,
        isbn13: "9791140712342",
        coverUrl: "https://example.com/cover.jpg",
        description: "양자 컴퓨터 입문서",
      }),
    );

    expect(result.decision).toBe("review_needed");
    expect(result.signals.bibliographicOverride).toBe(false);
  });

  it("accepts short exact titles when bibliographic fields align", () => {
    const result = scoreMetadataCandidate(
      rawBook({
        title: "모데란",
        author: "Bunch, David R.",
        publisher: "현대문학",
        publishedYear: 2025,
      }),
      candidate({
        title: "모데란",
        authors: ["데이비드 R. 번치"],
        publisher: "현대문학",
        publishedYear: 2025,
        isbn13: "9791167903006",
        coverUrl: "https://example.com/cover.jpg",
        description: "단편집",
      }),
    );

    expect(result.decision).toBe("accept");
    expect(result.signals.bibliographicOverride).toBe(true);
  });

  it("accepts short titles when the candidate starts with the library title", () => {
    const result = scoreMetadataCandidate(
      rawBook({
        title: "쓰기의 미래 : AI라는 유혹적 글쓰기 도구의 등장, 그 이후",
        author: "Baron, Naomi S",
        publisher: "북트리거",
        publishedYear: 2024,
      }),
      candidate({
        title: "쓰기의 미래 (AI라는 유혹적 글쓰기 도구의 등장, 그 이후)",
        authors: ["나오미 배런"],
        publisher: "북트리거",
        publishedYear: 2024,
        isbn13: "9791193378120",
        coverUrl: "https://example.com/cover.jpg",
        description: "AI 시대 글쓰기의 미래",
      }),
    );

    expect(result.decision).toBe("accept");
    expect(result.signals.bibliographicOverride).toBe(true);
  });

  it("uses original title tokens when a leading parenthetical is part of the real title", () => {
    const result = scoreMetadataCandidate(
      rawBook({
        title: "(엔비디아 젠슨 황) 생각하는 기계 : 엔비디아 젠슨 황, 전 세계 최초 공식 자서전",
        author: "Witt, Stephen",
        publisher: "RHK(알에이치코리아)",
        publishedYear: 2025,
      }),
      candidate({
        title: "엔비디아 젠슨 황, 생각하는 기계 (전 세계 최초 공식 자서전)",
        authors: ["스티븐 위트"],
        publisher: "RHK",
        publishedYear: 2025,
        isbn13: "9791189320000",
        coverUrl: "https://example.com/cover.jpg",
        description: "젠슨 황 공식 자서전",
      }),
    );

    expect(result.decision).toBe("accept");
    expect(result.signals.bibliographicOverride).toBe(true);
  });

  it("accepts title variants with inserted parenthetical when author and publisher align", () => {
    const result = scoreMetadataCandidate(
      rawBook({
        title: "AI 경영론",
        author: "김용환",
        publisher: "박영사",
        publishedYear: 2024,
      }),
      candidate({
        title: "AI(인공지능) 경영론",
        authors: ["김용환", "임희정"],
        publisher: "박영사",
        publishedYear: 2024,
        isbn13: "9791130320000",
        coverUrl: "https://example.com/cover.jpg",
        description: "AI 경영론 교재",
      }),
    );

    expect(result.decision).toBe("accept");
    expect(result.signals.bibliographicOverride).toBe(true);
  });

  it("uses review_needed for borderline matches", () => {
    const result = scoreMetadataCandidate(
      rawBook(),
      candidate({
        authors: ["김철수"],
        publisher: "더퀘스트 : 길벗",
        publishedYear: 2025,
        isbn13: null,
      }),
    );

    expect(result.decision).toBe("review_needed");
    expect(result.score).toBeGreaterThanOrEqual(0.65);
  });

  it("picks the best accepted candidate before a higher scoring review candidate", () => {
    const best = pickBestCandidate(
      rawBook({
        title: "리커넥트 : 누구나 한 번은 혼자가 된다 = Reconnect",
        author: "장재열",
        publisher: "Juspeace : 갤럭시코퍼레이션",
        publishedYear: 2025,
      }),
      [
        candidate({
          provider: "google_books",
          title: "리커넥트",
          authors: ["장재열"],
          publisher: "갤럭시코퍼레이션",
          publishedYear: 2025,
          isbn13: "9791198774798",
          coverUrl: null,
          description: "",
        }),
        candidate({
          provider: "naver",
          title: "리커넥트 (누구나 한 번은 혼자가 된다)",
          authors: ["장재열"],
          publisher: "Juspeace",
          publishedYear: 2025,
          isbn13: "9791198774798",
          coverUrl: "https://example.com/reconnect.jpg",
          description: "외로움과 관계 회복을 다루는 책",
        }),
      ],
    );

    expect(best).not.toBeNull();
    expect(best?.candidate.provider).toBe("naver");
    expect(best?.decision).toBe("accept");
  });

  it("picks the highest scoring candidate within the same decision tier", () => {
    const best = pickBestCandidate(rawBook(), [
      candidate({
        title: "완전히 다른 책",
        authors: ["김철수"],
        publisher: "한빛미디어",
        publishedYear: 2010,
      }),
      candidate({
        provider: "aladin",
        title: "정보통신개론",
        authors: ["홍길동"],
        publisher: "더퀘스트",
        publishedYear: 2025,
        isbn13: "9788996991342",
      }),
      candidate({
        provider: "google_books",
        title: "정보통신개론",
        authors: ["다른저자"],
        publisher: "더퀘스트",
        publishedYear: 2025,
        isbn13: null,
      }),
    ]);

    expect(best).not.toBeNull();
    expect(best?.candidate.provider).toBe("aladin");
    expect(best?.decision).toBe("accept");
  });

  it("returns null when every candidate is rejected", () => {
    const best = pickBestCandidate(rawBook(), [
      candidate({
        title: "완전히 다른 책",
        authors: ["김철수"],
        publisher: "한빛미디어",
        publishedYear: 2010,
      }),
    ]);

    expect(best).toBeNull();
  });
});
