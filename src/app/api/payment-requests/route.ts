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

// GET /api/payment-requests
export async function GET() {
  return NextResponse.json(readAll());
}

// POST /api/payment-requests
export async function POST(req: NextRequest) {
  const body = await req.json();
  const all = readAll();

  const token = crypto.randomUUID();
  const newReq: PaymentRequest = {
    token,
    orderId: body.orderId,
    teamName: body.teamName,
    amount: Number(body.amount),
    accountIndex: Number(body.accountIndex ?? 0),
    note: body.note ?? "",
    status: "pending",
    createdAt: new Date().toISOString(),
    slipUrl: null,
    slipUploadedAt: null,
    approvedAt: null,
    approvedAmount: null,
  };

  all.unshift(newReq);
  writeAll(all);

  return NextResponse.json({ ok: true, paymentRequest: newReq });
}
