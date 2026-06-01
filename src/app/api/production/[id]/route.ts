import { NextResponse, type NextRequest } from "next/server";
import fs from "fs";
import path from "path";

const DB_PATH = path.join(process.cwd(), "src/data/production.json");

function readDB(): Record<string, unknown> {
  try {
    return JSON.parse(fs.readFileSync(DB_PATH, "utf-8"));
  } catch {
    return {};
  }
}

function writeDB(data: Record<string, unknown>) {
  fs.writeFileSync(DB_PATH, JSON.stringify(data, null, 2), "utf-8");
}

// GET /api/production/[id]
export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const db = readDB();
  const entry = db[id] ?? { meta: { fabric: "", collar: "คอกลม", imageUrl: null }, players: [] };
  return NextResponse.json(entry);
}

// POST /api/production/[id]
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const body = await req.json();
  const db = readDB();
  db[id] = { meta: body.meta, players: body.players };
  writeDB(db);
  return NextResponse.json({ ok: true });
}
