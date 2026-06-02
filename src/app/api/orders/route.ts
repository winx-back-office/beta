import { NextResponse, type NextRequest } from "next/server";
import fs from "fs";
import path from "path";
import type { Order } from "@/lib/types";

const DB_PATH = path.join(process.cwd(), "src/data/orders.json");

function readOrders(): Order[] {
  try {
    return JSON.parse(fs.readFileSync(DB_PATH, "utf-8"));
  } catch {
    return [];
  }
}

function writeOrders(orders: Order[]) {
  fs.writeFileSync(DB_PATH, JSON.stringify(orders, null, 2), "utf-8");
}

function generateId(orders: Order[]): string {
  const now = new Date();
  const yy = String(now.getFullYear()).slice(-2);
  const mm = String(now.getMonth() + 1).padStart(2, "0");
  const prefix = `WNX-${yy}${mm}-`;
  const existing = orders
    .filter((o) => o.id.startsWith(prefix))
    .map((o) => parseInt(o.id.slice(prefix.length)))
    .filter((n) => !isNaN(n));
  const next = existing.length > 0 ? Math.max(...existing) + 1 : 1;
  return `${prefix}${String(next).padStart(2, "0")}`;
}

// GET /api/orders
export async function GET() {
  return NextResponse.json(readOrders());
}

// POST /api/orders
export async function POST(req: NextRequest) {
  const body = await req.json();
  const orders = readOrders();
  const newOrder: Order = {
    ...body,
    id: generateId(orders),
    hasProductionTable: false,
  };
  orders.unshift(newOrder); // ใส่ไว้หัวสุด (ใหม่สุดก่อน)
  writeOrders(orders);

  // ถ้าเป็นกลุ่มผลิต — สร้าง production entry เปล่าไว้รอ
  if (newOrder.type !== "design") {
    const prodPath = path.join(process.cwd(), "src/data/production.json");
    let prod: Record<string, unknown> = {};
    try { prod = JSON.parse(fs.readFileSync(prodPath, "utf-8")); } catch { /* empty */ }
    prod[newOrder.id] = {
      meta: { fabric: newOrder.fabricType ?? "", collar: newOrder.collarType ?? "", imageUrl: null },
      players: [],
    };
    fs.writeFileSync(prodPath, JSON.stringify(prod, null, 2), "utf-8");
  }

  return NextResponse.json({ ok: true, order: newOrder });
}
