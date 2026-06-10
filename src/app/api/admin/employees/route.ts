import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@supabase/supabase-js";
import crypto from "crypto";

function hashPin(pin: string) {
  return crypto.createHash("sha256").update(pin).digest("hex");
}

function db() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false } }
  );
}

function toEmp(row: Record<string, unknown>) {
  return {
    id: row.id,
    name: row.name,
    allowedMenus: row.allowed_menus ?? [],
    isActive: row.is_active,
    createdAt: row.created_at,
  };
}

export async function GET() {
  const { data, error } = await db()
    .from("employees")
    .select("id, name, allowed_menus, is_active, created_at")
    .order("created_at", { ascending: true });
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json((data ?? []).map(toEmp));
}

export async function POST(req: NextRequest) {
  const body = await req.json();
  if (!body.name || !body.pin) return NextResponse.json({ error: "ต้องการ name และ pin" }, { status: 400 });
  const { data, error } = await db()
    .from("employees")
    .insert({
      name: body.name,
      pin_hash: hashPin(String(body.pin)),
      allowed_menus: body.allowedMenus ?? [],
      is_active: true,
    })
    .select("id, name, allowed_menus, is_active, created_at")
    .single();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true, employee: toEmp(data) });
}
