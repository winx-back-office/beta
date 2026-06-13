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
  const { pin, phase } = await req.json(); // phase: "cutting" | "sewing"

  if (phase === "sewing") {
    // Claim sewing phase — lookup from sewers table
    const { data: sewer, error: sewerError } = await supabase
      .from("sewers")
      .select("*")
      .eq("pin", pin)
      .eq("active", true)
      .single();

    if (sewerError || !sewer) {
      return NextResponse.json({ error: "PIN ไม่ถูกต้อง" }, { status: 400 });
    }

    const { error } = await supabase
      .from("cutting_jobs")
      .update({
        status: "sewing",
        sewing_status: "sewing",
        sewer_id: sewer.id,
        sewer_name: sewer.name,
        sewing_started_at: new Date().toISOString(),
      })
      .eq("id", id);

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });

    // Sync production queue → "กำลังเย็บ" column (id: "sewing")
    const { data: sewJob } = await supabase.from("cutting_jobs").select("order_id").eq("id", id).single();
    if (sewJob?.order_id) {
      await supabase.from("orders").update({ production_status: "sewing" }).eq("id", sewJob.order_id);
    }

    return NextResponse.json({ success: true, sewerName: sewer.name });
  }

  // Default: cutting phase — lookup from cutters table
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

  // Sync production queue → pattern_cut
  const { data: job } = await supabase.from("cutting_jobs").select("order_id").eq("id", id).single();
  if (job?.order_id) {
    await supabase.from("orders").update({ production_status: "pattern_cut" }).eq("id", job.order_id);
  }

  return NextResponse.json({ success: true, cutterName: cutter.name });
}
