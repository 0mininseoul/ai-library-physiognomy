import "./books/load-env";

import { createClient } from "@supabase/supabase-js";
import { BOOK_CATEGORIES } from "../src/lib/books/categories";
import { SupabaseBookProvider } from "../src/lib/books/provider";
import { selectBookCandidates } from "../src/lib/books/recommender";
import { isGachonLibraryBook } from "../src/lib/books/types";
import { resolvePersonaSignal } from "../src/lib/persona/personaResolver";
import { calculateSaju } from "../src/lib/saju/calculator";
import type { FaceMetrics } from "../src/types/face";

const SAMPLE_COUNT = 200;

function randomMetrics(seed: number): FaceMetrics {
  const r = (n: number) => ((Math.sin(seed * 9301 + n * 49297) * 0.5 + 0.5) % 1);
  return {
    asymmetryIndex: 0.005 + r(1) * 0.035,
    phiRatioCompliance: 10 + r(2) * 90,
    thirds: { upper: 0.1 + r(3) * 0.15, middle: 0.32 + r(4) * 0.04, lower: 0.4 + r(5) * 0.2 },
    fifths: [0.2, 0.2, 0.2, 0.2, 0.2],
    faceAspectRatio: 0.62 + r(6) * 0.22,
    eyeSpacing: 0.26 + r(7) * 0.18,
    facialAngleDeg: 160,
    forehead: { areaPct: 15, brow: 1, classification: "average" },
    eyes: { leftToRightDeltaMm: r(8) * 3, outerCantalAngleDeg: 2 },
    nose: { lengthMm: 36 + r(9) * 28, widthMm: 32, columellaAngleDeg: 95 },
    mouth: { upperLowerLipRatio: 0.6, philtrumRatioPct: 12, cornerAngleDeg: r(10) * 9 },
    jaw: { vlineIndex: 0.05 + r(11) * 0.2, chinProtrusionMm: r(12) * 14, cheekToJawRatio: 1 + r(13) * 0.5 },
    faceBox: { x: 0.1, y: 0.1, width: 0.5, height: 0.7 },
  };
}

function randomBirthDate(seed: number): string {
  const year = 1995 + (seed % 14);
  const month = String(1 + (seed % 12)).padStart(2, "0");
  const day = String(1 + (seed % 27)).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

async function main() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!supabaseUrl || !serviceRoleKey) throw new Error("Missing NEXT_PUBLIC_SUPABASE_URL/SUPABASE_SERVICE_ROLE_KEY");

  const supabase = createClient(supabaseUrl, serviceRoleKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const provider = new SupabaseBookProvider(supabase);
  const books = (await provider.listActiveBooks()).filter(isGachonLibraryBook);
  console.log(`Loaded ${books.length} books`);

  const personaCounts = new Map<string, number>();
  const topBookCounts = new Map<string, number>();

  for (let i = 0; i < SAMPLE_COUNT; i += 1) {
    const metrics = randomMetrics(i);
    const saju = calculateSaju(randomBirthDate(i));
    const persona = resolvePersonaSignal(metrics, saju);
    personaCounts.set(persona.combinedCode, (personaCounts.get(persona.combinedCode) ?? 0) + 1);

    const category = BOOK_CATEGORIES[i % BOOK_CATEGORIES.length]!;
    const candidates = selectBookCandidates({
      books,
      favoriteCategory: category,
      desiredTags: Object.keys(persona.bookTagWeights),
      limit: 3,
    });
    if (candidates[0]) {
      const key = candidates[0].title;
      topBookCounts.set(key, (topBookCounts.get(key) ?? 0) + 1);
    }
  }

  console.log("\n=== Persona distribution (top 10) ===");
  Array.from(personaCounts.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, 10)
    .forEach(([code, count]) => console.log(`${count.toString().padStart(3)} | ${code}`));
  console.log("\n=== Top 10 books by frequency as #1 pick ===");
  Array.from(topBookCounts.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, 10)
    .forEach(([title, count]) => console.log(`${count.toString().padStart(3)} | ${title}`));
  console.log(`\nUnique #1 books: ${topBookCounts.size}/${SAMPLE_COUNT}`);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
