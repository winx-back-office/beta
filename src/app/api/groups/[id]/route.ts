import { NextResponse, type NextRequest } from "next/server";
import fs from "fs";
import path from "path";
import type { OrderGroup } from "@/lib/types";

const DB_PATH = path.join(process.cwd(), "src/data/groups.json");

function readGroups(): OrderGroup[] {
  try {
    return JSON.parse(fs.readFileSync(DB_PATH, "utf-8"));
  } catch {
    return [];
  }
}

function writeGroups(groups: OrderGroup[]) {
  fs.writeFileSync(DB_PATH, JSON.stringify(groups, null, 2), "utf-8");
}

// PUT /api/groups/[id] — { name?, orderIds? }
export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const body = await req.json();
  const groups = readGroups();
  const idx = groups.findIndex((g) => g.id === id);
  if (idx === -1) return NextResponse.json({ error: "not found" }, { status: 404 });
  groups[idx] = { ...groups[idx], ...body };
  writeGroups(groups);
  return NextResponse.json({ ok: true, group: groups[idx] });
}

// DELETE /api/groups/[id]
export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const groups = readGroups();
  const filtered = groups.filter((g) => g.id !== id);
  writeGroups(filtered);
  return NextResponse.json({ ok: true });
}
