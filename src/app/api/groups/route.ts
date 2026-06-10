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

function generateId(existing: string[]): string {
  const nums = existing
    .map((id) => parseInt(id.replace("GRP-", "")))
    .filter((n) => !isNaN(n));
  const next = nums.length > 0 ? Math.max(...nums) + 1 : 1;
  return `GRP-${String(next).padStart(3, "0")}`;
}

export async function GET() {
  const { data, error } = await db().from("groups").select("*").order("created_at", { ascending: true });
  if (error) return NextResponse.json([], { status: 200 });
  return NextResponse.json((data ?? []).map(toGroup));
}

export async function POST(req: NextRequest) {
  const body = await req.json();
  const { data: existing } = await db().from("groups").select("id");
  const id = generateId((existing ?? []).map((r: { id: string }) => r.id));
  const { data, error } = await db()
    .from("groups")
    .insert({
      id,
      name: body.name,
      order_ids: body.orderIds ?? [],
      color: body.color ?? null,
      created_at: new Date().toISOString(),
    })
    .select()
    .single();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true, group: toGroup(data) });
}
