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

export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const body = await req.json();
  const row: Record<string, unknown> = {};
  if (body.name !== undefined) row.name = body.name;
  if (body.pin) row.pin_hash = hashPin(String(body.pin));
  if (body.allowedMenus !== undefined) row.allowed_menus = body.allowedMenus;
  if (body.isActive !== undefined) row.is_active = body.isActive;

  const { data, error } = await db()
    .from("employees")
    .update(row)
    .eq("id", id)
    .select("id, name, allowed_menus, is_active, created_at")
    .single();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true, employee: { id: data.id, name: data.name, allowedMenus: data.allowed_menus, isActive: data.is_active } });
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const { error } = await db().from("employees").delete().eq("id", id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
