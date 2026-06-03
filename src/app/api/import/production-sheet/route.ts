import { NextResponse, type NextRequest } from "next/server";

const SIZES = ["SS", "S", "M", "L", "XL", "2XL", "3XL", "4XL", "5XL", "6XL", "7XL", "พิเศษ"];

function extractSheetId(url: string): string | null {
  const m = url.match(/\/spreadsheets\/d\/([a-zA-Z0-9_-]+)/);
  return m ? m[1] : null;
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

export async function GET(req: NextRequest) {
  const url = req.nextUrl.searchParams.get("url") ?? "";
  const sheetId = extractSheetId(url);
  if (!sheetId) return NextResponse.json({ error: "URL ไม่ถูกต้อง" }, { status: 400 });

  let sheetTitle = "";

  // วิธีที่ 1: Worksheets feed — ได้ชื่อ tab ทั้งหมด
  try {
    const feedRes = await fetch(
      `https://spreadsheets.google.com/feeds/worksheets/${sheetId}/public/full?alt=json`,
      { cache: "no-store" }
    );
    if (feedRes.ok) {
      const feedData = await feedRes.json() as { feed: { entry?: { title: { $t: string } }[] } };
      const entries = feedData?.feed?.entry ?? [];
      if (entries.length > 0) sheetTitle = entries[0].title.$t;
    }
  } catch { /* ลอง fallback */ }

  // วิธีที่ 2: fallback — ดึงชื่อจาก HTML title
  if (!sheetTitle) {
    try {
      const htmlRes = await fetch(`https://docs.google.com/spreadsheets/d/${sheetId}/`, { cache: "no-store" });
      const html = await htmlRes.text();
      const m = html.match(/<title>([^<]+)<\/title>/i);
      if (m) {
        sheetTitle = m[1].replace(/\s*-\s*Google\s*(Sheets|Spreadsheets)\s*$/i, "").trim();
      }
    } catch { /* ไม่สำคัญ */ }
  }

  const csvUrl = `https://docs.google.com/spreadsheets/d/${sheetId}/gviz/tq?tqx=out:csv`;
  let csv: string;
  try {
    const res = await fetch(csvUrl, { cache: "no-store" });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    csv = await res.text();
  } catch (e) {
    return NextResponse.json({ error: `ดึงข้อมูลไม่ได้: ${e}` }, { status: 502 });
  }

  const lines = csv.split("\n").filter((l) => l.trim());

  // ตรวจหา fabric และ shirt style จาก 10 rows แรก
  let detectedFabric = "";
  let detectedShirt = "";
  for (let i = 0; i < Math.min(10, lines.length); i++) {
    const cells = parseCsvLine(lines[i]);
    for (const cell of cells) {
      const v = cell.trim();
      if (!v) continue;
      if (!detectedFabric && (v.includes("แกรม") || (v.includes("ผ้า") && v.length < 30))) {
        detectedFabric = v;
      }
      if (!detectedShirt && /^[A-Z][A-Z\s]+$/.test(v) && v.length > 3 &&
        (v.includes("JERSEY") || v.includes("JACKET") || v.includes("BASIC") ||
         v.includes("HOOD") || v.includes("PRO") || v.includes("OVSIZE"))) {
        detectedShirt = v;
      }
    }
  }

  // หา header row ที่มี ชื่อผู้เล่น/ชื่อ + ไซส์
  let headerRowIdx = -1;
  let nameColIdx = -1;
  let sizeColIdx = -1;
  let numColIdx = -1;

  for (let i = 0; i < lines.length; i++) {
    const cells = parseCsvLine(lines[i]);
    const trimmed = cells.map((c) => c.trim());
    const nameIdx = trimmed.findIndex((c) => c === "ชื่อผู้เล่น" || c === "ชื่อ");
    const sizeIdx = trimmed.findIndex((c) => c === "ไซส์" || c === "ไซ");
    if (nameIdx !== -1 && sizeIdx !== -1) {
      headerRowIdx = i;
      nameColIdx = nameIdx;
      sizeColIdx = sizeIdx;
      numColIdx = trimmed.findIndex((c) => c.includes("ลำดับ") || c.includes("เลข") || c === "no");
      break;
    }
  }

  const players: { name: string; size: string; number: string }[] = [];

  if (headerRowIdx !== -1) {
    for (let i = headerRowIdx + 1; i < lines.length; i++) {
      const cells = parseCsvLine(lines[i]);
      const name = (cells[nameColIdx] ?? "").trim();
      const size = (cells[sizeColIdx] ?? "").trim().toUpperCase();
      const num = numColIdx >= 0 ? (cells[numColIdx] ?? "").trim() : "";
      if (!name || !SIZES.includes(size)) continue;
      players.push({ name, size, number: num });
    }
  } else {
    // fallback: scan หา name + size คู่กัน
    for (let i = 0; i < lines.length; i++) {
      const cells = parseCsvLine(lines[i]);
      for (let j = 0; j < cells.length - 1; j++) {
        const name = cells[j]?.trim();
        const size = cells[j + 1]?.trim().toUpperCase();
        if (name && size && SIZES.includes(size) && name.length > 1 && !/^\d+$/.test(name)) {
          players.push({ name, size, number: "" });
          break;
        }
      }
    }
  }

  return NextResponse.json({ players, detectedFabric, detectedShirt, total: players.length, sheetTitle });
}
