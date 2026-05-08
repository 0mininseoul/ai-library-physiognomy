import "./load-env";

import { GoogleGenAI, Type } from "@google/genai";
import fs from "node:fs/promises";
import path from "node:path";
import type { LibraryBook } from "../../src/lib/books/types";

const IN_PATH = path.join(process.cwd(), "data/books/books.normalized.json");
const OUT_PATH = path.join(process.cwd(), "data/books/books.tagged.json");
const MODEL = process.env.GEMINI_BOOK_TAG_MODEL ?? process.env.GEMINI_ANALYSIS_MODEL ?? "gemini-2.5-pro";
const BATCH_SIZE = Number.parseInt(process.env.GEMINI_BOOK_TAG_BATCH_SIZE ?? "50", 10);

const CATEGORY_COPY: Record<string, string> = {
  "진로/커리어": "진로 고민이 머릿속에서 탭 47개처럼 떠 있을 때 방향을 잡아 줄 책입니다.",
  "관계/대화": "말 한마디가 자꾸 마음속에서 리플레이될 때 관계의 해상도를 올려 줄 책입니다.",
  "감정/회복": "마음 배터리가 3% 남은 날에도 다시 충전할 실마리를 주는 책입니다.",
  "집중/실행": "계획은 많은데 실행 버튼이 안 눌릴 때 손가락 힘을 보태 줄 책입니다.",
  "문학/취향": "취향과 감수성의 근육을 조용히 키워 줄 이야기 처방전입니다.",
  "교양/세계관": "세상을 보는 렌즈를 한 단계 업그레이드해 줄 교양 처방전입니다.",
};

type TagResponse = {
  books: Array<{
    sourceId: string;
    description?: string;
    tags?: string[];
  }>;
};

function mergeTags(existing: string[], generated: string[] | undefined): string[] {
  return Array.from(new Set([...existing, ...(generated ?? [])].map((tag) => tag.trim()).filter(Boolean))).slice(0, 8);
}

function fallbackBookTag(book: LibraryBook): LibraryBook {
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
    description: book.description || CATEGORY_COPY[book.category] || "지금 고민과 취향 사이를 이어 줄 추천 책입니다.",
    tags: mergeTags(book.tags, [book.category, ...titleTags]),
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
      "각 책에 대해 고등학생에게 어울리는 짧은 추천 설명과 한국어 태그 3-5개를 JSON으로 작성하세요.",
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
                description: { type: Type.STRING },
                tags: {
                  type: Type.ARRAY,
                  items: { type: Type.STRING },
                },
              },
              required: ["sourceId", "description", "tags"],
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
    return {
      ...book,
      description: generated?.description?.trim() || book.description,
      tags: mergeTags(book.tags, generated?.tags),
    };
  });
}

async function main() {
  const apiKey = process.env.GEMINI_API_KEY;
  const books = JSON.parse(await fs.readFile(IN_PATH, "utf8")) as LibraryBook[];
  const tagged: LibraryBook[] = [];

  if (!apiKey) {
    tagged.push(...books.map(fallbackBookTag));
  } else {
    const ai = new GoogleGenAI({ apiKey });

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

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
