import "./load-env";

import { GoogleGenAI, Type } from "@google/genai";
import fs from "node:fs/promises";
import path from "node:path";
import type { LibraryBook } from "../../src/lib/books/types";

const IN_PATH = path.join(process.cwd(), "data/books/books.normalized.json");
const OUT_PATH = path.join(process.cwd(), "data/books/books.tagged.json");
const MODEL = "gemini-2.5-flash-lite";
const BATCH_SIZE = 20;

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
  if (!apiKey) {
    throw new Error("GEMINI_API_KEY is required to tag book data");
  }

  const ai = new GoogleGenAI({ apiKey });
  const books = JSON.parse(await fs.readFile(IN_PATH, "utf8")) as LibraryBook[];
  const tagged: LibraryBook[] = [];

  for (let index = 0; index < books.length; index += BATCH_SIZE) {
    const batch = books.slice(index, index + BATCH_SIZE);
    tagged.push(...(await tagBatch(ai, batch)));
    console.log(`Tagged ${Math.min(index + BATCH_SIZE, books.length)} / ${books.length} books`);
  }

  await fs.mkdir(path.dirname(OUT_PATH), { recursive: true });
  await fs.writeFile(OUT_PATH, JSON.stringify(tagged, null, 2));
  console.log(`Wrote ${tagged.length} tagged books to ${OUT_PATH}`);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
