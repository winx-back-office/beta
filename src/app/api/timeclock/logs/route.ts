import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export const runtime = "nodejs";
export const revalidate = 0;

function db() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false } }
  );
}

export async function GET() {
  const today = new Date().toISOString().slice(0, 10);
  const { data, error } = await db()
    .from("time_logs")
    .select("id, type, timestamp, employees(name)")
    .gte("timestamp", `${today}T00:00:00+07:00`)
    .order("timestamp", { ascending: false })
    .limit(20);

  if (error) return NextResponse.json({ logs: [] });
  return NextResponse.json({ logs: data ?? [] });
}
