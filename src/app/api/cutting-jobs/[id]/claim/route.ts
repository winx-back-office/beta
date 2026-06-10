import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { persistSession: false } }
);

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const { pin } = await req.json();

  const { data: cutter, error: cutterError } = await supabase
    .from("cutters")
    .select("*")
    .eq("pin", pin)
    .eq("active", true)
    .single();

  if (cutterError || !cutter) {
    return NextResponse.json({ error: "PIN ไม่ถูกต้อง" }, { status: 400 });
  }

  const { error } = await supabase
    .from("cutting_jobs")
    .update({
      status: "cutting",
      cutter_id: cutter.id,
      cutter_name: cutter.name,
      started_at: new Date().toISOString(),
    })
    .eq("id", id);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ success: true, cutterName: cutter.name });
}
