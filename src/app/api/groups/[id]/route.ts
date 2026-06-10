import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@supabase/supabase-js";
import type { OrderGroup } from "@/lib/types";

function db() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false } }
  );
}

function toGroup(row: Record<string, unknown>): OrderGroup {
  return {
    id: row.id as string,
    name: row.name as string,
    orderIds: (row.order_ids as string[]) ?? [],
    color: (row.color as string) ?? undefined,
    createdAt: row.created_at as string,
  };
}

export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const body = await req.json();
  const row: Record<string, unknown> = {};
  if (body.name !== undefined) row.name = body.name;
  if (body.orderIds !== undefined) row.order_ids = body.orderIds;
  if (body.color !== undefined) row.color = body.color;
  const { data, error } = await db()
    .from("groups")
    .update(row)
    .eq("id", id)
    .select()
    .single();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true, group: toGroup(data) });
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const { error } = await db().from("groups").delete().eq("id", id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
