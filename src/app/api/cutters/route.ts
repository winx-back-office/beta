import { NextResponse, type NextRequest } from "next/server";
import fs from "fs";
import path from "path";

const CUTTERS_PATH = path.join(process.cwd(), "src/data/cutters.json");

interface Cutter {
  id: string;
  name: string;
  pin: string;
  active: boolean;
}

function readCutters(): Cutter[] {
  try { return JSON.parse(fs.readFileSync(CUTTERS_PATH, "utf-8")); } catch { return []; }
}

function writeCutters(cutters: Cutter[]) {
  fs.writeFileSync(CUTTERS_PATH, JSON.stringify(cutters, null, 2), "utf-8");
}

export async function GET() {
  return NextResponse.json(readCutters());
}

export async function PUT(req: NextRequest) {
  const body = await req.json();
  writeCutters(body);
  return NextResponse.json({ ok: true });
}
