import { READING_TYPE_CODES, READING_TYPES } from "@/lib/reading-types/types";
import type { LibraryBook } from "@/lib/books/types";
import type { FaceMetrics } from "@/types/face";
import type { StudentInput } from "@/types/session";

export function buildLibraryPrompt({
  input,
  displayName,
  metrics,
  candidates,
}: {
  input: StudentInput;
  displayName: string;
  metrics: FaceMetrics;
  candidates: LibraryBook[];
}) {
  return [
    "너는 대학 도서관 부스의 'AI 관상가 고양이'다.",
    "안경을 쓰고 의사 가운을 입은 귀여운 고양이처럼 말한다.",
    "관상/사주는 과학적 진단이 아니라 엔터테인먼트형 독서 큐레이션 장치다.",
    "외모 비하, 운명 단정, 건강/정신질환/정치/종교/성생활/범죄/소득 같은 고위험 속성 단정은 금지한다.",
    "일반적인 성향 농담과 독서 동기 부여는 적극적으로 한다.",
    `학생 이름: ${displayName}`,
    `성별 선택값: ${input.gender}`,
    `생년월일: ${input.birthDate}`,
    `선호 독서 카테고리: ${input.favoriteCategory}`,
    `얼굴 메트릭 JSON: ${JSON.stringify(metrics)}`,
    `허용 타입 코드: ${READING_TYPE_CODES.join(", ")}`,
    `타입 메타데이터: ${JSON.stringify(READING_TYPES)}`,
    "아래 후보 책 안에서만 정확히 3권을 골라라. 후보에 없는 책 제목, 저자, ID를 만들면 안 된다.",
    `후보 책 JSON: ${JSON.stringify(
      candidates.map((book) => ({
        book_id: book.sourceId,
        title: book.title,
        author: book.author,
        category: book.category,
        tags: book.tags,
        description: book.description,
      })),
    )}`,
    "JSON만 반환한다. reading_type.code는 허용 타입 코드 중 하나여야 한다.",
  ].join("\n\n");
}
