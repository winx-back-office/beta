import { NextResponse, type NextRequest } from "next/server";

// GET /api/import/production-sheet?url=<sheets-url>
// ดึงข้อมูลผู้เล่นจาก Google Sheets ที่มีฟอร์แมต WINX production table
// Auto-detect แถวหัวคอลัมน์ที่มี "ชื่อผู้เล่น"

function extractSheetId(url: string): string | null {
  const m = url.match(/\/spreadsheets\/d\/([a-zA-Z0-9_-]+)/);
  return m ? m[1] : null;
}

// ดึงชื่อ spreadsheet จาก HTML title (ส่วนแรกก่อน " - Google")
async function fetchSheetTitle(sheetId: string): Promise<string> {
  try {
    const res = await fetch(`https://docs.google.com/spreadsheets/d/${sheetId}/edit`, { cache: "no-store" });
    const html = await res.text();
    const m = html.match(/<title>([^<]+)<\/title>/);
    if (!m) return "";
    // ตัด " - Google ชีต" หรือ " - Google Sheets" ออก แล้วเอาส่วนแรก
    const full = m[1].replace(/ - Google.*$/, "").trim();
    return full; // เช่น "FRG - 11 MAY 26 - รายชื่อเสื้อทีม"
  } catch {
    return "";
  }
}

function parseCsvLine(line: string): string[] {
  const result: string[] = [];
  let cur = "";
  let inQuote = false;
  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (ch === '"') {
      if (inQuote && line[i + 1] === '"') { cur += '"'; i++; }
      else { inQuote = !inQuote; }
    } else if (ch === "," && !inQuote) {
      result.push(cur.trim());
      cur = "";
    } else {
      cur += ch;
    }
  }
  result.push(cur.trim());
  return result;
}

const SIZE_VALID = new Set([
  "SS","S","M","L","XL","2XL","3XL","4XL","5XL","6XL","7XL","พิเศษ",
]);

export async function GET(req: NextRequest) {
  const url = req.nextUrl.searchParams.get("url") ?? "";
  const sheetId = extractSheetId(url);
  if (!sheetId) return NextResponse.json({ error: "URL ไม่ถูกต้อง" }, { status: 400 });

  const csvUrl = `https://docs.google.com/spreadsheets/d/${sheetId}/gviz/tq?tqx=out:csv`;
  let csv: string;
  let sheetTitle = "";
  try {
    const [csvRes, title] = await Promise.all([
      fetch(csvUrl, { cache: "no-store" }),
      fetchSheetTitle(sheetId),
    ]);
    if (!csvRes.ok) throw new Error(`HTTP ${csvRes.status}`);
    csv = await csvRes.text();
    sheetTitle = title;
  } catch (e) {
    return NextResponse.json({ error: `ดึงข้อมูลไม่ได้: ${e}` }, { status: 502 });
  }

  const lines = csv.split("\n").map((l) => l.trimEnd());

  // ── หา fabric / collar จาก dropdown rows (ก่อนแถวผู้เล่น) ──────────
  let fabric = "";
  let collar = "";
  for (let i = 0; i < Math.min(lines.length, 10); i++) {
    const cols = parseCsvLine(lines[i]);
    for (const c of cols) {
      const v = c.trim();
      if (!v) continue;
      if (v.startsWith("ผ้า") || v.includes("แกรม") || v.includes("ไมโคร") || v.includes("จูติ") || v.includes("เบริด์") || v.includes("เกล็ด")) {
        fabric = v;
      }
      if (v.startsWith("คอ")) {
        collar = v;
      }
    }
  }

  // ── หาแถวหัวคอลัมน์ (ที่มี "ชื่อผู้เล่น") ────────────────────────
  let headerRowIdx = -1;
  let nameCol = -1;
  let sizeCol = -1;
  let numCol  = -1;

  for (let i = 0; i < lines.length; i++) {
    const cols = parseCsvLine(lines[i]);
    const nameIdx = cols.findIndex((c) => c.trim() === "ชื่อผู้เล่น");
    if (nameIdx !== -1) {
      headerRowIdx = i;
      nameCol = nameIdx;
      sizeCol = cols.findIndex((c) => c.trim() === "ไซส์");
      // หา column เลข/เบอร์ — ใช้ partial match แล้ว fallback ไปคอลัมน์ถัดจาก ไซส์
      numCol = cols.findIndex((c) => {
        const v = c.trim();
        return v === "เลข" || v === "เบอร์" || v === "หมายเลข"
          || v.startsWith("เลข") || v.startsWith("เบอร์");
      });
      if (numCol === -1 && sizeCol !== -1) numCol = sizeCol + 1; // fallback
      break;
    }
  }

  if (headerRowIdx === -1) {
    return NextResponse.json(
      { error: 'ไม่พบแถวหัวคอลัมน์ "ชื่อผู้เล่น" ใน Sheet' },
      { status: 400 }
    );
  }

  // ── เก็บหัว column จริงๆ ของฝั่งผู้เล่น (ตัดคอลัมน์ว่างและลำดับ) ──
  const rawHeaders = parseCsvLine(lines[headerRowIdx]);
  // ถ้า column เลข ไม่มีหัว ให้ใส่ "เลข" แทน
  if (numCol !== -1 && !rawHeaders[numCol]?.trim()) {
    rawHeaders[numCol] = "เลข";
  }
  const playerHeaders = rawHeaders
    .slice(nameCol) // เริ่มจาก ชื่อผู้เล่น
    .map((h) => h.trim())
    .filter((h) => h && !["ลำดับ", "#"].includes(h));

  // ── หา column เช็คสินค้า/สถานะ (ถัดจาก เลข) ──────────────────────
  const statusCol = numCol !== -1 ? numCol + 1 : -1;

  // ── parse แถวผู้เล่น ─────────────────────────────────────────────
  const players: { name: string; size: string; number: string; status: string }[] = [];

  for (let i = headerRowIdx + 1; i < lines.length; i++) {
    const cols = parseCsvLine(lines[i]);
    const name   = nameCol   !== -1 ? (cols[nameCol]   ?? "").trim() : "";
    const size   = sizeCol   !== -1 ? (cols[sizeCol]   ?? "").trim().toUpperCase() : "";
    const num    = numCol    !== -1 ? (cols[numCol]    ?? "").trim() : "";
    const status = statusCol !== -1 ? (cols[statusCol] ?? "").trim() : "";

    if (!name) continue; // ข้ามแถวว่าง

    players.push({
      name,
      size: SIZE_VALID.has(size) ? size : "",
      number: num,
      status,
    });
  }

  return NextResponse.json({ players, playerHeaders, fabric, collar, total: players.length, sheetTitle });
}
