import "./load-env";

import fs from "node:fs/promises";
import path from "node:path";
import type { RawNaverBook } from "../../src/lib/books/types";

type CategorySeed = { category: string; queries: string[] };

type NaverBookResponse = {
  items?: RawNaverBook[];
  errorCode?: string;
  errorMessage?: string;
};

const API_BASE = "https://openapi.naver.com/v1/search/book.json";
const OUT_PATH = path.join(process.cwd(), "data/books/books.raw.json");
const DISPLAY = 30;
const QUERY_DELAY_MS = 700;

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function fetchQuery(clientId: string, clientSecret: string, category: string, query: string) {
  const url = new URL(API_BASE);
  url.searchParams.set("query", query);
  url.searchParams.set("display", String(DISPLAY));
  url.searchParams.set("start", "1");
  url.searchParams.set("sort", "sim");

  for (let attempt = 1; attempt <= 4; attempt += 1) {
    const response = await fetch(url, {
      headers: {
        "X-Naver-Client-Id": clientId,
        "X-Naver-Client-Secret": clientSecret,
      },
    });

    const json = (await response.json()) as NaverBookResponse;
    if (response.ok && !json.errorCode) {
      return (json.items ?? []).map((item) => ({
        ...item,
        source: "naver" as const,
        mvp_category: category,
        mvp_query: query,
      }));
    }

    if (json.errorCode === "012" && attempt < 4) {
      await sleep(1_500 * attempt);
      continue;
    }

    throw new Error(`Naver Book API error for ${query}: ${json.errorCode ?? response.status} ${json.errorMessage ?? ""}`.trim());
  }

  return [];
}

async function main() {
  const clientId = process.env.NAVER_CLIENT_ID;
  const clientSecret = process.env.NAVER_CLIENT_SECRET;

  if (!clientId) {
    throw new Error("NAVER_CLIENT_ID is required to fetch Naver book data");
  }
  if (!clientSecret) {
    throw new Error("NAVER_CLIENT_SECRET is required to fetch Naver book data");
  }

  const categories = JSON.parse(await fs.readFile("data/books/categories.json", "utf8")) as CategorySeed[];
  const rows = [];

  for (const category of categories) {
    for (const query of category.queries) {
      rows.push(...(await fetchQuery(clientId, clientSecret, category.category, query)));
      console.log(`Fetched ${rows.length} Naver books after query "${query}"`);
      await sleep(QUERY_DELAY_MS);
    }
  }

  if (rows.length === 0) {
    throw new Error("Naver Book API returned zero books for all configured queries");
  }

  await fs.mkdir(path.dirname(OUT_PATH), { recursive: true });
  await fs.writeFile(OUT_PATH, JSON.stringify(rows, null, 2));
  console.log(`Wrote ${rows.length} raw Naver books to ${OUT_PATH}`);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
