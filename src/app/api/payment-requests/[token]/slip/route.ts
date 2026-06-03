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

// POST /api/payment-requests/[token]/slip
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ token: string }> }
) {
  const { token } = await params;
  const all = readAll();
  const idx = all.findIndex((r) => r.token === token);
  if (idx === -1) return NextResponse.json({ error: "not found" }, { status: 404 });

  const formData = await req.formData();
  const file = formData.get("slip") as File | null;
  if (!file) return NextResponse.json({ error: "no file" }, { status: 400 });

  const ext = file.name.split(".").pop() ?? "jpg";
  const fileName = `${token}.${ext}`;
  const slipsDir = path.join(process.cwd(), "public/slips");

  if (!fs.existsSync(slipsDir)) fs.mkdirSync(slipsDir, { recursive: true });

  const buffer = Buffer.from(await file.arrayBuffer());
  fs.writeFileSync(path.join(slipsDir, fileName), buffer);

  const slipUrl = `/slips/${fileName}`;
  all[idx] = {
    ...all[idx],
    slipUrl,
    slipUploadedAt: new Date().toISOString(),
    status: "slip_uploaded",
  };
  writeAll(all);

  return NextResponse.json({ ok: true, paymentRequest: all[idx] });
}
