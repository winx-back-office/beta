import { NextResponse, type NextRequest } from "next/server";
import fs from "fs";
import path from "path";
import type { Order } from "@/lib/types";

const DB_PATH = path.join(process.cwd(), "src/data/orders.json");
const CUTTING_JOBS_PATH = path.join(process.cwd(), "src/data/cutting-jobs.json");

function readOrders(): Order[] {
  try { return JSON.parse(fs.readFileSync(DB_PATH, "utf-8")); } catch { return []; }
}
function writeOrders(orders: Order[]) {
  fs.writeFileSync(DB_PATH, JSON.stringify(orders, null, 2), "utf-8");
}

// GET /api/orders/[id]
export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const order = readOrders().find((o) => o.id === id);
  if (!order) return NextResponse.json({ error: "not found" }, { status: 404 });
  return NextResponse.json(order);
}

// DELETE /api/orders/[id]
export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const orders = readOrders();
  const idx = orders.findIndex((o) => o.id === id);
  if (idx === -1) return NextResponse.json({ error: "not found" }, { status: 404 });
  orders.splice(idx, 1);
  writeOrders(orders);
  return NextResponse.json({ ok: true });
}

// PUT /api/orders/[id]
export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const body = await req.json();
  const orders = readOrders();
  const idx = orders.findIndex((o) => o.id === id);
  if (idx === -1) return NextResponse.json({ error: "not found" }, { status: 404 });
  orders[idx] = { ...orders[idx], ...body, id }; // ไม่ให้เปลี่ยน id
  writeOrders(orders);

  // sync teamName เข้าใบงานตัด (ถ้ามีการเปลี่ยนชื่อทีม)
  if (body.teamName) {
    try {
      const jobs = JSON.parse(fs.readFileSync(CUTTING_JOBS_PATH, "utf-8")) as { orderId: string; teamName: string }[];
      const updated = jobs.map((j) => j.orderId === id ? { ...j, teamName: body.teamName } : j);
      fs.writeFileSync(CUTTING_JOBS_PATH, JSON.stringify(updated, null, 2), "utf-8");
    } catch { /* ไม่หยุดถ้า sync ไม่ได้ */ }
  }

  return NextResponse.json({ ok: true, order: orders[idx] });
}
