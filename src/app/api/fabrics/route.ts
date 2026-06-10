import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@supabase/supabase-js";

function db() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false } }
  );
}

export async function GET() {
  const { data, error } = await db().from("fabrics").select("data").eq("id", "singleton").single();
  if (error) return NextResponse.json([], { status: 200 });
  return NextResponse.json(data?.data ?? []);
}

export async function PUT(req: NextRequest) {
  const body = await req.json();
  const { error } = await db().from("fabrics").upsert({
    id: "singleton",
    data: body,
    updated_at: new Date().toISOString(),
  });
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
