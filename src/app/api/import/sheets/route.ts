import { NextResponse, type NextRequest } from "next/server";
import type { CustomerType, Order } from "@/lib/types";

// ดึงข้อมูลจาก Google Sheets (public) แล้วแปลงเป็น Order[]
// GET /api/import/sheets?url=<sheets-url>

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

// Thai column name → Order field mapping
const COL_MAP: Record<string, keyof Order | "_skip"> = {
  "ชื่อทีม": "teamName",
  "ประเภท": "type",
  "ประเภทเสื้อ": "shirtType",
  "เนื้อผ้า": "fabricType",
  "ผ้า": "fabricType",
  "ประเภทคอ": "collarType",
  "คอ": "collarType",
  "จำนวน": "quantity",
  "ราคาผลิต": "productionPrice",
  "ราคาผลิต/ตัว": "productionPrice",
  "ค่าจัดส่ง": "shipping",
  "มัดจำ": "deposit",
  "วันที่เริ่ม": "startDate",
  "วันที่": "startDate",
};

const TYPE_MAP: Record<string, CustomerType> = {
  "ผลิต": "produce",
  "produce": "produce",
  "ออกแบบ + ผลิต": "design_produce",
  "ออกแบบ+ผลิต": "design_produce",
  "design_produce": "design_produce",
  "ออกแบบ": "design",
  "design": "design",
};

function parseDate(v: string): string {
  // รองรับ d/m/yyyy, dd/mm/yyyy, yyyy-mm-dd
  const parts = v.split(/[\/\-]/);
  if (parts.length === 3) {
    const [a, b, c] = parts;
    if (a.length === 4) return `${a}-${b.padStart(2,"0")}-${c.padStart(2,"0")}`;
    return `${c}-${b.padStart(2,"0")}-${a.padStart(2,"0")}`;
  }
  return new Date().toISOString().slice(0, 10);
}

export async function GET(req: NextRequest) {
  const url = req.nextUrl.searchParams.get("url") ?? "";
  const sheetId = extractSheetId(url);
  if (!sheetId) return NextResponse.json({ error: "URL ไม่ถูกต้อง" }, { status: 400 });

  // fetch CSV ผ่าน gviz endpoint (ไม่ต้อง API key)
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
  if (lines.length < 2) return NextResponse.json({ error: "Sheet ว่างเปล่า" }, { status: 400 });

  const headers = parseCsvLine(lines[0]);
  const fieldMap = headers.map((h) => COL_MAP[h.trim()] ?? "_skip");

  const today = new Date().toISOString().slice(0, 10);
  const rows: Partial<Order>[] = [];

  for (let i = 1; i < lines.length; i++) {
    const vals = parseCsvLine(lines[i]);
    if (vals.every((v) => !v)) continue; // skip empty rows

    const row: Record<string, unknown> = {
      type: "produce" as CustomerType,
      deposit: 0,
      startDate: today,
      cost: { fabric: 0, paper: 0, ink: 0, cut: 0, sew: 0, other: 0 },
    };

    fieldMap.forEach((field, idx) => {
      if (field === "_skip") return;
      const v = vals[idx] ?? "";
      if (!v) return;

      if (field === "type") {
        row.type = TYPE_MAP[v.trim()] ?? "produce";
      } else if (field === "quantity" || field === "productionPrice" || field === "shipping" || field === "deposit") {
        const n = parseFloat(v.replace(/,/g, ""));
        if (!isNaN(n)) row[field] = n;
      } else if (field === "startDate") {
        row.startDate = parseDate(v);
      } else {
        row[field] = v.trim();
      }
    });

    if (!row.teamName) continue; // ต้องมีชื่อทีมอย่างน้อย
    rows.push(row as Partial<Order>);
  }

  return NextResponse.json({ rows, headers });
}
