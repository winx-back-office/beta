import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@supabase/supabase-js";
import type { Order } from "@/lib/types";

function db() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false } }
  );
}

function toOrder(row: Record<string, unknown>): Order {
  return {
    id: row.id as string,
    type: row.type as Order["type"],
    teamName: row.team_name as string,
    startDate: row.start_date as string,
    shirtType: row.shirt_type as string,
    fabricType: row.fabric_type as string,
    collarType: row.collar_type as string,
    quantity: row.quantity as number,
    productionPrice: Number(row.production_price ?? 0),
    shipping: Number(row.shipping ?? 0),
    deposit: Number(row.deposit ?? 0),
    cost: (row.cost as Order["cost"]) ?? { fabric: 0, paper: 0, ink: 0, cut: 0, sew: 0, other: 0 },
    costOverride: row.cost_override != null ? Number(row.cost_override) : undefined,
    designPackage: row.design_package as string,
    designPackagePrice: Number(row.design_package_price ?? 0),
    designStatus: row.design_status as string,
    productionStatus: row.production_status as string,
    hasProductionTable: Boolean(row.has_production_table),
    productionTableNew: Boolean(row.production_table_new),
    color: row.color as string,
    note: row.note as string,
  };
}

function toRow(body: Partial<Order>) {
  const row: Record<string, unknown> = {};
  if (body.type !== undefined) row.type = body.type;
  if (body.teamName !== undefined) row.team_name = body.teamName;
  if (body.startDate !== undefined) row.start_date = body.startDate;
  if (body.shirtType !== undefined) row.shirt_type = body.shirtType;
  if (body.fabricType !== undefined) row.fabric_type = body.fabricType;
  if (body.collarType !== undefined) row.collar_type = body.collarType;
  if (body.quantity !== undefined) row.quantity = body.quantity;
  if (body.productionPrice !== undefined) row.production_price = body.productionPrice;
  if (body.shipping !== undefined) row.shipping = body.shipping;
  if (body.deposit !== undefined) row.deposit = body.deposit;
  if (body.cost !== undefined) row.cost = body.cost;
  if (body.costOverride !== undefined) row.cost_override = body.costOverride;
  if (body.designPackage !== undefined) row.design_package = body.designPackage;
  if (body.designPackagePrice !== undefined) row.design_package_price = body.designPackagePrice;
  if (body.designStatus !== undefined) row.design_status = body.designStatus;
  if (body.productionStatus !== undefined) row.production_status = body.productionStatus;
  if (body.hasProductionTable !== undefined) row.has_production_table = body.hasProductionTable;
  if (body.productionTableNew !== undefined) row.production_table_new = body.productionTableNew;
  if (body.color !== undefined) row.color = body.color;
  if (body.note !== undefined) row.note = body.note;
  return row;
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
  const { data, error } = await db()
    .from("orders")
    .select("*")
    .order("created_at", { ascending: false });
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json((data ?? []).map(toOrder));
}

// POST /api/orders
export async function POST(req: NextRequest) {
  const body = await req.json();

  // หา id ใหม่
  const { data: existing } = await db().from("orders").select("id");
  const id = generateId((existing ?? []).map(toOrder));

  const row = {
    id,
    has_production_table: false,
    ...toRow(body),
  };

  const { data, error } = await db()
    .from("orders")
    .insert(row)
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true, order: toOrder(data) });
}
