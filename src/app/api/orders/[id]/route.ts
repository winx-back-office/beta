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
    deliveryDate: row.delivery_date as string | undefined,
    deliveryAddress: row.delivery_address ? (() => { try { return JSON.parse(row.delivery_address as string); } catch { return undefined; } })() : undefined,
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
  if (body.deliveryDate !== undefined) row.delivery_date = body.deliveryDate || null;
  if (body.deliveryAddress !== undefined) row.delivery_address = body.deliveryAddress ? JSON.stringify(body.deliveryAddress) : null;
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
  return row;
}

// GET /api/orders/[id]
export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const { data, error } = await db().from("orders").select("*").eq("id", id).single();
  if (error) return NextResponse.json({ error: "not found" }, { status: 404 });
  return NextResponse.json(toOrder(data));
}

// DELETE /api/orders/[id]
export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const { error } = await db().from("orders").delete().eq("id", id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}

// PUT /api/orders/[id]
export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const body = await req.json();
  const row = toRow(body);

  const { data, error } = await db()
    .from("orders")
    .update(row)
    .eq("id", id)
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  // sync teamName เข้าใบงานตัดบน Supabase
  if (body.teamName) {
    await db()
      .from("cutting_jobs")
      .update({ team_name: body.teamName })
      .eq("order_id", id);
  }

  return NextResponse.json({ ok: true, order: toOrder(data) });
}
