import "./load-env";

import { Type, type GoogleGenAI } from "@google/genai";
import fs from "node:fs/promises";
import path from "node:path";
import { BOOK_CATEGORIES, inferBookCategory, isBookCategory } from "../../src/lib/books/categories";
import type { LibraryBook } from "../../src/lib/books/types";
import { createVertexGeminiClient } from "../../src/lib/gemini/vertexClient";

const IN_PATH = path.join(process.cwd(), "data/books/books.normalized.json");
const OUT_PATH = path.join(process.cwd(), "data/books/books.tagged.json");
const MODEL = process.env.GEMINI_BOOK_TAG_MODEL ?? process.env.VERTEX_AI_MODEL ?? "gemini-2.5-flash";
const BATCH_SIZE = Number.parseInt(process.env.GEMINI_BOOK_TAG_BATCH_SIZE ?? "50", 10);

const CATEGORY_COPY: Record<string, string> = {
  "소설": "이야기의 힘으로 감정과 상상력을 넓혀 줄 책입니다.",
  "시/에세이": "마음 배터리가 3% 남은 날에도 다시 충전할 실마리를 주는 책입니다.",
  "자기계발": "계획은 많은데 실행 버튼이 안 눌릴 때 손가락 힘을 보태 줄 책입니다.",
  "인문/철학": "세상을 보는 렌즈를 한 단계 업그레이드해 줄 교양 처방전입니다.",
  "경제/경영": "돈, 일, 시장을 감이 아니라 구조로 보게 해 줄 책입니다.",
  "과학/기술": "새로운 기술과 세상의 작동 원리를 선명하게 보여 줄 책입니다.",
  "사회/정치": "내가 사는 사회를 더 입체적으로 읽게 해 줄 책입니다.",
  "예술/취미": "취향과 감각의 근육을 조용히 키워 줄 책입니다.",
  "진로/학습": "진로 고민이 머릿속에서 탭 47개처럼 떠 있을 때 방향을 잡아 줄 책입니다.",
};

const LEGACY_CATEGORIES = new Set(["진로/커리어", "관계/대화", "감정/회복", "집중/실행", "문학/취향", "교양/세계관"]);

type TagResponse = {
  books: Array<{
    sourceId: string;
    category?: string;
    description?: string;
    tags?: string[];
  }>;
};

function mergeTags(category: string, existing: string[], generated: string[] | undefined): string[] {
  const cleanedExisting = existing.filter((tag) => !LEGACY_CATEGORIES.has(tag) && tag !== "네이버 책");
  return Array.from(new Set([category, ...cleanedExisting, ...(generated ?? [])].map((tag) => tag.trim()).filter(Boolean))).slice(0, 8);
}

function locationLabel(category: string): string {
  return `${category} 추천 서가`;
}

function resolvedCategory(book: LibraryBook, generatedCategory?: string): string {
  if (isBookCategory(generatedCategory)) return generatedCategory;
  return inferBookCategory({ title: book.title, description: book.description, categoryHint: book.category });
}

function fallbackBookTag(book: LibraryBook): LibraryBook {
  const category = resolvedCategory(book);
  const titleTags = [
    book.title.includes("진로") || book.title.includes("직업") ? "진로탐색" : "",
    book.title.includes("습관") || book.title.includes("집중") ? "실행력" : "",
    book.title.includes("마음") || book.title.includes("감정") ? "마음회복" : "",
    book.title.includes("대화") || book.title.includes("관계") ? "관계센스" : "",
    book.title.includes("과학") || book.title.includes("철학") ? "세계관확장" : "",
    book.title.includes("소설") || book.title.includes("문학") ? "문학취향" : "",
  ];

  return {
    ...book,
    category,
    description: book.description || CATEGORY_COPY[category] || "지금 고민과 취향 사이를 이어 줄 추천 책입니다.",
    locationLabel: locationLabel(category),
    tags: mergeTags(category, book.tags, titleTags),
  };
}

function isQuotaError(error: unknown): boolean {
  const message = error instanceof Error ? error.message : String(error);
  return message.includes("RESOURCE_EXHAUSTED") || message.includes("Quota exceeded") || message.includes("429");
}

function parseTagResponse(text: string | undefined): TagResponse {
  if (!text) return { books: [] };
  const parsed = JSON.parse(text) as Partial<TagResponse>;
  return {
    books: Array.isArray(parsed.books) ? parsed.books : [],
  };
}

async function tagBatch(ai: GoogleGenAI, books: LibraryBook[]): Promise<LibraryBook[]> {
  const response = await ai.models.generateContent({
    model: MODEL,
    contents: [
      "AI 관상가 고양이의 학교도서관 추천 DB를 만들고 있습니다.",
      `각 책에 대해 분야 category를 다음 허용 카테고리 중 하나로 재분류하고, 고등학생에게 어울리는 짧은 추천 설명과 한국어 태그 3-5개를 JSON으로 작성하세요. 허용 카테고리: ${BOOK_CATEGORIES.join(", ")}`,
      "기존 category는 검색어 기반 힌트일 뿐입니다. 제목과 설명을 우선하세요. 부동산, 경매, 투자, 금융, 시장, 창업 책은 경제/경영으로 분류하세요.",
      JSON.stringify(
        books.map((book) => ({
          sourceId: book.sourceId,
          title: book.title,
          author: book.author,
          publisher: book.publisher,
          category: book.category,
          existingTags: book.tags,
        })),
      ),
    ].join("\n\n"),
    config: {
      responseMimeType: "application/json",
      responseSchema: {
        type: Type.OBJECT,
        properties: {
          books: {
            type: Type.ARRAY,
            items: {
              type: Type.OBJECT,
              properties: {
                sourceId: { type: Type.STRING },
                category: { type: Type.STRING, enum: BOOK_CATEGORIES },
                description: { type: Type.STRING },
                tags: {
                  type: Type.ARRAY,
                  items: { type: Type.STRING },
                },
              },
              required: ["sourceId", "category", "description", "tags"],
            },
          },
        },
        required: ["books"],
      },
    },
  });

  const generatedById = new Map(parseTagResponse(response.text).books.map((book) => [book.sourceId, book]));

  return books.map((book) => {
    const generated = generatedById.get(book.sourceId);
    const category = resolvedCategory(book, generated?.category);
    return {
      ...book,
      category,
      description: generated?.description?.trim() || book.description,
      locationLabel: locationLabel(category),
      tags: mergeTags(category, book.tags, generated?.tags),
    };
  });
}

async function main() {
  const books = JSON.parse(await fs.readFile(IN_PATH, "utf8")) as LibraryBook[];
  const tagged: LibraryBook[] = [];
  const ai = createTaggingClient();

  if (!ai) {
    tagged.push(...books.map(fallbackBookTag));
  } else {
    for (let index = 0; index < books.length; index += BATCH_SIZE) {
      const batch = books.slice(index, index + BATCH_SIZE);
      try {
        tagged.push(...(await tagBatch(ai, batch)));
      } catch (error) {
        if (!isQuotaError(error)) throw error;
        console.warn("Gemini quota exhausted; falling back to local book tags for remaining books.");
        tagged.push(...books.slice(index).map(fallbackBookTag));
        break;
      }
      console.log(`Tagged ${Math.min(index + BATCH_SIZE, books.length)} / ${books.length} books`);
    }
  }

  await fs.mkdir(path.dirname(OUT_PATH), { recursive: true });
  await fs.writeFile(OUT_PATH, JSON.stringify(tagged, null, 2));
  console.log(`Wrote ${tagged.length} tagged books to ${OUT_PATH}`);
}

function createTaggingClient(): GoogleGenAI | null {
  try {
    return createVertexGeminiClient();
  } catch (error) {
    console.warn(
      `Vertex AI Gemini is not configured; falling back to local book tags. ${
        error instanceof Error ? error.message : String(error)
      }`,
    );
    return null;
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
