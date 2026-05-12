import "../books/load-env";

import ExcelJS from "exceljs";
import fs from "node:fs/promises";
import path from "node:path";
import type { GachonRawBook } from "./types";

const OUT_PATH = path.join(process.cwd(), "data/library/gachon-raw.json");
const CURATION_PATH = path.join(process.cwd(), "data/library/bookcuration.xlsx");
const OPEN_PATH = path.join(process.cwd(), "data/library/openlibrary.xlsx");

async function parseFile(filePath: string, sourceLabel: GachonRawBook["sourceLabel"]): Promise<GachonRawBook[]> {
  const workbook = new ExcelJS.Workbook();
  await workbook.xlsx.readFile(filePath);
  const sheet = workbook.worksheets[0]!;

  const headerRow = sheet.getRow(4);
  const headers = (headerRow.values as (string | undefined)[]).map((v) => (v ?? "").toString().trim());

  const col = (name: string) => {
    const idx = headers.findIndex((h) => h === name);
    if (idx < 0) throw new Error(`Missing column "${name}" in ${filePath}`);
    return idx;
  };

  const colNo = col("No.");
  const colReg = col("등록번호");
  const colTitle = col("서명");
  const colAuthor = col("저자");
  const colPub = col("출판사");
  const colYear = col("출판년");
  const colCall = col("청구기호");
  const colSourceLoc = col("소장처");
  const colRoom = col("자료실");
  const colStatus = col("자료상태");
  const colShelf = headers.indexOf("서가");
  const colLoan = headers.indexOf("대출여부");

  const results: GachonRawBook[] = [];
  sheet.eachRow((row, rowNumber) => {
    if (rowNumber < 5) return;
    const values = row.values as (string | number | null | undefined)[];
    const no = values[colNo];
    if (no === null || no === undefined || String(no).trim() === "") return;

    const yearRaw = values[colYear];
    const yearParsed = typeof yearRaw === "number" ? yearRaw : Number.parseInt(String(yearRaw ?? "").trim(), 10);

    const loanRaw = colLoan >= 0 ? String(values[colLoan] ?? "").trim() : "";
    let availability: GachonRawBook["availability"] = null;
    if (loanRaw === "대출가능") availability = "available";
    else if (loanRaw === "대출중") availability = "checked_out";

    results.push({
      sourceLabel,
      registrationNo: String(values[colReg] ?? "").trim(),
      title: String(values[colTitle] ?? "").trim(),
      author: String(values[colAuthor] ?? "").trim(),
      publisher: String(values[colPub] ?? "").trim(),
      publishedYear: Number.isFinite(yearParsed) ? yearParsed : null,
      callNumber: String(values[colCall] ?? "").trim(),
      locationLabel: String(values[colSourceLoc] ?? "").trim(),
      locationRoom: String(values[colRoom] ?? "").trim(),
      shelf: colShelf >= 0 ? String(values[colShelf] ?? "").trim() : undefined,
      status: String(values[colStatus] ?? "").trim(),
      availability,
    });
  });

  return results;
}

async function main() {
  const curation = await parseFile(CURATION_PATH, "bookcuration");
  const open = await parseFile(OPEN_PATH, "openlibrary");
  const all = [...curation, ...open];

  await fs.mkdir(path.dirname(OUT_PATH), { recursive: true });
  await fs.writeFile(OUT_PATH, JSON.stringify(all, null, 2), "utf8");
  console.log(`Parsed ${curation.length} bookcuration + ${open.length} openlibrary = ${all.length} → ${OUT_PATH}`);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
