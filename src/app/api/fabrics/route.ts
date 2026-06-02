import { NextResponse, type NextRequest } from "next/server";
import fs from "fs";
import path from "path";

const DB_PATH = path.join(process.cwd(), "src/data/fabrics.json");

function read() {
  return JSON.parse(fs.readFileSync(DB_PATH, "utf-8"));
}
function write(data: unknown) {
  fs.writeFileSync(DB_PATH, JSON.stringify(data, null, 2), "utf-8");
}

export async function GET() {
  return NextResponse.json(read());
}

export async function PUT(req: NextRequest) {
  const body = await req.json();
  write(body);
  return NextResponse.json({ ok: true });
}
