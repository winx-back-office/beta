import { NextResponse, type NextRequest } from "next/server";
import fs from "fs";
import path from "path";
import type { PaymentRequest } from "@/lib/payment-config";

const DB_PATH = path.join(process.cwd(), "src/data/payment-requests.json");

function readAll(): PaymentRequest[] {
  try {
    return JSON.parse(fs.readFileSync(DB_PATH, "utf-8"));
  } catch {
    return [];
  }
}

function writeAll(data: PaymentRequest[]) {
  fs.writeFileSync(DB_PATH, JSON.stringify(data, null, 2), "utf-8");
}

// GET /api/payment-requests/[token]
export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ token: string }> }
) {
  const { token } = await params;
  const all = readAll();
  const found = all.find((r) => r.token === token);
  if (!found) return NextResponse.json({ error: "not found" }, { status: 404 });
  return NextResponse.json(found);
}

// PUT /api/payment-requests/[token]
export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ token: string }> }
) {
  const { token } = await params;
  const body = await req.json();
  const all = readAll();
  const idx = all.findIndex((r) => r.token === token);
  if (idx === -1) return NextResponse.json({ error: "not found" }, { status: 404 });

  all[idx] = { ...all[idx], ...body };
  writeAll(all);
  return NextResponse.json({ ok: true, paymentRequest: all[idx] });
}
