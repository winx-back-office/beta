import { NextResponse } from "next/server";
import fs from "fs";
import path from "path";

const DB_PATH = path.join(process.cwd(), "src/data/production.json");

// GET /api/production/summary
// Returns { [orderId]: updatedAt } for all orders that have production data
export async function GET() {
  try {
    const db = JSON.parse(fs.readFileSync(DB_PATH, "utf-8")) as Record<string, { updatedAt?: string }>;
    const summary: Record<string, string> = {};
    for (const [id, entry] of Object.entries(db)) {
      if (entry.updatedAt) summary[id] = entry.updatedAt;
    }
    return NextResponse.json(summary);
  } catch {
    return NextResponse.json({});
  }
}
