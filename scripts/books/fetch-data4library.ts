import "./load-env";

import fs from "node:fs/promises";
import path from "node:path";

type CategorySeed = { category: string; queries: string[] };

const API_BASE = "https://data4library.kr/api/srchBooks";
const OUT_PATH = path.join(process.cwd(), "data/books/books.raw.json");

type Data4LibraryResponse = {
  response?: {
    docs?: Array<{ doc?: Record<string, unknown> }>;
    error?: string;
  };
};

async function main() {
  const authKey = process.env.DATA4LIBRARY_AUTH_KEY;
  if (!authKey) {
    throw new Error("DATA4LIBRARY_AUTH_KEY is required to fetch book data");
  }

  const categories = JSON.parse(await fs.readFile("data/books/categories.json", "utf8")) as CategorySeed[];
  const rows: Array<Record<string, unknown> & { mvp_category: string; mvp_query: string }> = [];

  for (const category of categories) {
    for (const query of category.queries) {
      const url = new URL(API_BASE);
      url.searchParams.set("authKey", authKey);
      url.searchParams.set("keyword", query);
      url.searchParams.set("pageNo", "1");
      url.searchParams.set("pageSize", "30");
      url.searchParams.set("format", "json");

      const response = await fetch(url);
      if (!response.ok) {
        throw new Error(`Data4Library request failed ${response.status} for ${query}`);
      }
      const json = (await response.json()) as Data4LibraryResponse;
      if (json.response?.error) {
        throw new Error(`Data4Library API error for ${query}: ${json.response.error}`);
      }
      const docs = json.response?.docs ?? [];
      for (const item of docs) {
        if (item.doc) rows.push({ ...item.doc, mvp_category: category.category, mvp_query: query });
      }
    }
  }

  if (rows.length === 0) {
    throw new Error("Data4Library returned zero books for all configured queries");
  }

  await fs.mkdir(path.dirname(OUT_PATH), { recursive: true });
  await fs.writeFile(OUT_PATH, JSON.stringify(rows, null, 2));
  console.log(`Wrote ${rows.length} raw books to ${OUT_PATH}`);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
