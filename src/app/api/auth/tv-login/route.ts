import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

function db() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false } }
  );
}

export async function POST() {
  const { data: employees } = await db()
    .from("employees")
    .select("id, name, allowed_menus")
    .eq("is_active", true);

  const emp = (employees ?? []).find((e: { name: string }) => e.name === "TV");
  if (!emp) {
    return NextResponse.json({ error: "ไม่พบ User TV" }, { status: 404 });
  }

  return NextResponse.json({
    user: {
      id: emp.id,
      name: emp.name,
      role: "employee",
      allowedMenus: emp.allowed_menus ?? [],
    },
  });
}
