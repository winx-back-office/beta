import { NextResponse, type NextRequest } from "next/server";
import fs from "fs";
import path from "path";

const DB_PATH = path.join(process.cwd(), "src/data/production-columns.json");

function read() {
  try { return JSON.parse(fs.readFileSync(DB_PATH, "utf-8")); } catch { return []; }
}

export async function GET() {
  return NextResponse.json(read());
}

export async function POST(req: NextRequest) {
  const body = await req.json();
  fs.writeFileSync(DB_PATH, JSON.stringify(body, null, 2), "utf-8");
  return NextResponse.json({ ok: true });
}
