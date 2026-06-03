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

function generateId(groups: OrderGroup[]): string {
  const nums = groups
    .map((g) => parseInt(g.id.replace("GRP-", "")))
    .filter((n) => !isNaN(n));
  const next = nums.length > 0 ? Math.max(...nums) + 1 : 1;
  return `GRP-${String(next).padStart(3, "0")}`;
}

// GET /api/groups
export async function GET() {
  return NextResponse.json(readGroups());
}

// POST /api/groups — { name, orderIds }
export async function POST(req: NextRequest) {
  const body = await req.json();
  const groups = readGroups();
  const newGroup: OrderGroup = {
    id: generateId(groups),
    name: body.name,
    orderIds: body.orderIds ?? [],
    createdAt: new Date().toISOString(),
  };
  groups.push(newGroup);
  writeGroups(groups);
  return NextResponse.json({ ok: true, group: newGroup });
}
