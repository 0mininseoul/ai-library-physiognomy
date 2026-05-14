import fs from "node:fs/promises";
import path from "node:path";
import ExcelJS from "exceljs";

const ROOT = process.cwd();
const OUTPUT_DIR = path.join(ROOT, "reports");
const OUTPUT_PATH = path.join(OUTPUT_DIR, "gachon-session-log-2026-05-13.xlsx");
const ADMIN_AUTH_STORAGE_KEY = "ai-library-admin-auth";

const env = await readEnv(path.join(ROOT, ".env.local"));
const adminUser = env.ADMIN_USER;
const adminPassword = env.ADMIN_PASSWORD;
if (!adminUser || !adminPassword) throw new Error("Missing ADMIN_USER or ADMIN_PASSWORD in .env.local");

const metrics = await fetchMetrics(adminUser, adminPassword);
const workbook = new ExcelJS.Workbook();
workbook.creator = "AI Library Admin Dashboard";
workbook.created = new Date();
workbook.modified = new Date();

const sheet = workbook.addWorksheet("SESSION LOG", {
  views: [{ state: "frozen", ySplit: 4 }],
  properties: { defaultRowHeight: 22 },
});

sheet.getCell("A1").value = "가천대학교 중앙도서관 5/13(수) 부스 SESSION LOG";
sheet.getCell("A1").font = { bold: true, size: 16, color: { argb: "FF3D3929" } };
sheet.mergeCells("A1:L1");
sheet.getCell("A2").value = "부스 운영 시간 12:20~19:20 기준 참여 세션 상세 기록";
sheet.getCell("A2").font = { size: 11, color: { argb: "FF535146" } };
sheet.mergeCells("A2:L2");

const rows = metrics.sessions.map((session) => {
  const titles = session.recommendedBookTitles ?? [];
  return [
    formatKstDateTime(session.startedAt ?? session.createdAt),
    session.displayName,
    session.studentId,
    session.birthDate,
    formatGender(session.gender),
    session.favoriteCategory,
    formatNeedFocus(session.needFocus),
    titles[0] ?? "",
    titles[1] ?? "",
    titles[2] ?? "",
    session.mobileQrConvertedAt ? formatKstDateTime(session.mobileQrConvertedAt) : "",
    session.resultUrl,
  ];
});

sheet.addTable({
  name: "SESSION_LOG",
  ref: "A4",
  headerRow: true,
  totalsRow: false,
  style: {
    theme: "TableStyleMedium2",
    showRowStripes: true,
  },
  columns: [
    { name: "세션 시간", filterButton: true },
    { name: "이름", filterButton: true },
    { name: "학번/사번", filterButton: true },
    { name: "생년월일", filterButton: true },
    { name: "성별", filterButton: true },
    { name: "선호하는 책 카테고리", filterButton: true },
    { name: "지금 나에게 가장 필요한 것", filterButton: true },
    { name: "추천 도서 1", filterButton: true },
    { name: "추천 도서 2", filterButton: true },
    { name: "추천 도서 3", filterButton: true },
    { name: "모바일 QR 전환", filterButton: true },
    { name: "결과 페이지 URL", filterButton: true },
  ],
  rows,
});

const widths = [19, 12, 14, 13, 9, 18, 24, 28, 28, 28, 19, 34];
widths.forEach((width, index) => {
  sheet.getColumn(index + 1).width = width;
});

for (const row of sheet.getRows(4, rows.length + 1) ?? []) {
  row.alignment = { vertical: "middle", wrapText: true };
}

sheet.getRow(4).height = 24;
sheet.getRow(4).font = { bold: true, color: { argb: "FFFFFFFF" } };
sheet.getRow(4).alignment = { vertical: "middle", horizontal: "center", wrapText: true };
sheet.autoFilter = {
  from: "A4",
  to: `L${Math.max(4, rows.length + 4)}`,
};

for (let rowNumber = 5; rowNumber <= rows.length + 4; rowNumber += 1) {
  sheet.getCell(`L${rowNumber}`).value = {
    text: rows[rowNumber - 5]?.[11] || "",
    hyperlink: rows[rowNumber - 5]?.[11] || "",
  };
  sheet.getCell(`L${rowNumber}`).font = { color: { argb: "FFC96442" }, underline: true };
}

await fs.mkdir(OUTPUT_DIR, { recursive: true });
await workbook.xlsx.writeFile(OUTPUT_PATH);
console.log(JSON.stringify({ outputPath: OUTPUT_PATH, rowCount: rows.length, authStorageKey: ADMIN_AUTH_STORAGE_KEY }));

async function fetchMetrics(user, password) {
  const auth = Buffer.from(`${user}:${password}`).toString("base64");
  const res = await fetch("http://127.0.0.1:3000/api/admin/metrics", {
    headers: { Authorization: `Basic ${auth}` },
  });
  if (!res.ok) throw new Error(`Failed to fetch admin metrics: ${res.status}`);
  return res.json();
}

async function readEnv(filePath) {
  const text = await fs.readFile(filePath, "utf8");
  const values = {};
  for (const line of text.split(/\r?\n/)) {
    const match = line.match(/^([A-Z0-9_]+)=(.*)$/);
    if (match) values[match[1]] = match[2];
  }
  return values;
}

function formatKstDateTime(value) {
  return new Intl.DateTimeFormat("ko-KR", {
    timeZone: "Asia/Seoul",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).format(new Date(value)).replace(/\. /g, "-").replace(".", "");
}

function formatGender(value) {
  if (value === "male") return "남성";
  if (value === "female") return "여성";
  return value || "-";
}

function formatNeedFocus(value) {
  const labels = {
    stimulation: "새로운 자극",
    comfort: "마음 위로",
    utility: "실용적인 도움",
    depth: "깊은 사색",
  };
  return labels[value] ?? value ?? "-";
}
