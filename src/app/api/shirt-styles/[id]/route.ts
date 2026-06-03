import { NextResponse, type NextRequest } from "next/server";
import fs from "fs";
import path from "path";

const DB_PATH = path.join(process.cwd(), "src/data/shirt-styles.json");

function readDB() {
  return JSON.parse(fs.readFileSync(DB_PATH, "utf-8"));
}

export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const body = await req.json();
  const data = readDB();
  const idx = data.findIndex((s: { id: string }) => s.id === id);
  if (idx === -1) return NextResponse.json({ error: "not found" }, { status: 404 });
  data[idx] = { id, ...body };
  fs.writeFileSync(DB_PATH, JSON.stringify(data, null, 2), "utf-8");
  return NextResponse.json(data[idx]);
}
