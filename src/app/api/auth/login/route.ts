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

export async function POST(req: NextRequest) {
  const { pin } = await req.json();
  if (!pin) return NextResponse.json({ error: "กรุณาใส่ PIN" }, { status: 400 });

  // ตรวจ admin PIN — เช็ค DB ก่อน fallback env
  const { data: storedPin } = await db()
    .from("app_settings")
    .select("value")
    .eq("key", "admin_pin_hash")
    .maybeSingle();

  const isAdmin = storedPin
    ? storedPin.value === hashPin(pin)
    : pin === process.env.ADMIN_PIN;

  if (isAdmin) {
    return NextResponse.json({
      user: {
        id: "admin",
        name: "Admin",
        role: "admin",
        allowedMenus: ["orders", "queue", "production-tables", "cutting-jobs"],
      },
    });
  }

  const { data: employees } = await db()
    .from("employees")
    .select("*")
    .eq("is_active", true);

  const pinHash = hashPin(pin);
  const emp = (employees ?? []).find((e) => e.pin_hash === pinHash);
  if (!emp) return NextResponse.json({ error: "PIN ไม่ถูกต้อง" }, { status: 401 });

  return NextResponse.json({
    user: {
      id: emp.id,
      name: emp.name,
      role: "employee",
      allowedMenus: emp.allowed_menus ?? [],
    },
  });
}
