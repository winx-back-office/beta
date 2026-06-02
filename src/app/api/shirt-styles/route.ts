import { NextResponse } from "next/server";
import fs from "fs";
import path from "path";

const DB_PATH = path.join(process.cwd(), "src/data/shirt-styles.json");

export async function GET() {
  const data = JSON.parse(fs.readFileSync(DB_PATH, "utf-8"));
  return NextResponse.json(data);
}
