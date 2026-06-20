import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@supabase/supabase-js";
import crypto from "crypto";
import { verifyToken, haversineMeters } from "@/lib/timeclock";

export const runtime = "nodejs";

function db() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false } }
  );
}

function hashPin(pin: string) {
  return crypto.createHash("sha256").update(pin).digest("hex");
}

export async function POST(req: NextRequest) {
  const { token, pin, lat, lng } = await req.json();

  if (!token || !pin) {
    return NextResponse.json({ error: "ข้อมูลไม่ครบ" }, { status: 400 });
  }

  // 1. ตรวจสอบ token ว่ายังใช้ได้อยู่ไหม (รองรับ window ปัจจุบัน + ก่อนหน้า)
  const window = verifyToken(token);
  if (window === null) {
    return NextResponse.json({ error: "QR หมดอายุ กรุณาสแกนใหม่" }, { status: 400 });
  }

  // 2. ตรวจสอบ PIN หาพนักงาน
  const supabase = db();
  const pinHash = hashPin(pin);
  const { data: employees } = await supabase
    .from("employees")
    .select("id, name")
    .eq("pin_hash", pinHash)
    .eq("is_active", true)
    .limit(1);

  if (!employees || employees.length === 0) {
    return NextResponse.json({ error: "PIN ไม่ถูกต้อง" }, { status: 401 });
  }
  const emp = employees[0];

  // 3. ตรวจสอบ GPS (ถ้ามีการตั้งค่า origin)
  const { data: settings } = await supabase
    .from("timeclock_settings")
    .select("lat, lng, radius_m")
    .eq("id", 1)
    .single();

  let distanceM: number | null = null;
  if (settings && settings.lat !== 0 && settings.lng !== 0 && lat != null && lng != null) {
    distanceM = Math.round(haversineMeters(settings.lat, settings.lng, lat, lng));
    if (distanceM > settings.radius_m) {
      return NextResponse.json(
        { error: `อยู่นอกพื้นที่ทำงาน (${distanceM} เมตร)` },
        { status: 403 }
      );
    }
  }

  // 4. หาว่าเป็น check-in หรือ check-out (สลับกัน)
  const today = new Date().toISOString().slice(0, 10);
  const { data: todayLogs } = await supabase
    .from("time_logs")
    .select("type")
    .eq("employee_id", emp.id)
    .gte("timestamp", `${today}T00:00:00+07:00`)
    .order("timestamp", { ascending: false })
    .limit(1);

  const lastType = todayLogs?.[0]?.type ?? null;
  const type: "in" | "out" = lastType === "in" ? "out" : "in";

  // 5. บันทึก
  const { data: log, error } = await supabase
    .from("time_logs")
    .insert({
      employee_id: emp.id,
      type,
      lat: lat ?? null,
      lng: lng ?? null,
      gps_distance_m: distanceM,
      token_window: window,
    })
    .select()
    .single();

  if (error) {
    return NextResponse.json({ error: "บันทึกไม่สำเร็จ" }, { status: 500 });
  }

  return NextResponse.json({ success: true, type, employee: emp.name, log });
}
