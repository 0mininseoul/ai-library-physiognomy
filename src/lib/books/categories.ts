export const BOOK_CATEGORIES = [
  "소설",
  "시/에세이",
  "자기계발",
  "인문/철학",
  "경제/경영",
  "과학/기술",
  "사회/정치",
  "예술/취미",
  "진로/학습",
] as const;

export type BookCategory = (typeof BOOK_CATEGORIES)[number];

const BOOK_CATEGORY_SET = new Set<string>(BOOK_CATEGORIES);

const CATEGORY_RULES: Array<{ category: BookCategory; pattern: RegExp }> = [
  { category: "경제/경영", pattern: /부동산|경매|투자|경제|경영|금융|주식|창업|마케팅|회계|세금|재테크|비즈니스/ },
  { category: "진로/학습", pattern: /진로|직업|커리어|공부|학습|입시|수험|자격증|시험|합격|면접|감정평가사/ },
  { category: "과학/기술", pattern: /과학|기술|인공지능|\bAI\b|데이터|코딩|컴퓨터|수학|물리|화학|생명|우주|공학/ },
  { category: "자기계발", pattern: /자기계발|습관|시간관리|성공|집중|실행|생산성|멘탈|동기부여|리더십/ },
  { category: "시/에세이", pattern: /시집|에세이|산문|수필|시인|마음|위로|회복/ },
  { category: "소설", pattern: /소설|장편|단편|문학|미스터리|판타지|로맨스|SF|청소년문학/ },
  { category: "인문/철학", pattern: /인문|철학|심리|역사|고전|문화|종교|윤리|사상/ },
  { category: "사회/정치", pattern: /사회|정치|법|교육|환경|미디어|커뮤니케이션|관계|대화|젠더|인권/ },
  { category: "예술/취미", pattern: /예술|미술|음악|영화|디자인|사진|요리|여행|스포츠|취미|만화/ },
];

export function isBookCategory(value: string | null | undefined): value is BookCategory {
  return BOOK_CATEGORY_SET.has(value ?? "");
}

export function inferBookCategory(input: {
  title: string;
  description?: string | null;
  categoryHint?: string | null;
}): BookCategory {
  if (isBookCategory(input.categoryHint)) return input.categoryHint;

  const text = `${input.title} ${input.description ?? ""}`;
  return CATEGORY_RULES.find(({ pattern }) => pattern.test(text))?.category ?? "인문/철학";
}
