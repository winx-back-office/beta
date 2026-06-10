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

// PUT /api/admin/settings — { currentPin, newPin }
export async function PUT(req: NextRequest) {
  const { currentPin, newPin } = await req.json();
  if (!currentPin || !newPin) return NextResponse.json({ error: "ต้องระบุ PIN ปัจจุบันและ PIN ใหม่" }, { status: 400 });
  if (String(newPin).length !== 6) return NextResponse.json({ error: "PIN ใหม่ต้องมี 6 หลัก" }, { status: 400 });

  // ตรวจสอบ PIN ปัจจุบัน — เช็ค DB ก่อน แล้ว fallback env
  const { data: stored } = await db().from("app_settings").select("value").eq("key", "admin_pin_hash").maybeSingle();
  const currentHash = hashPin(String(currentPin));
  const envHash = hashPin(process.env.ADMIN_PIN ?? "");

  const valid = stored ? stored.value === currentHash : currentPin === process.env.ADMIN_PIN;
  if (!valid) return NextResponse.json({ error: "PIN ปัจจุบันไม่ถูกต้อง" }, { status: 401 });

  // บันทึก PIN ใหม่
  const { error } = await db().from("app_settings").upsert({ key: "admin_pin_hash", value: hashPin(String(newPin)) });
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ ok: true });
}
