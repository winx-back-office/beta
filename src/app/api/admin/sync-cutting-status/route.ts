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
  const supabase = db();

  // Find all cutting jobs that are "cutting"
  const { data: cuttingJobs } = await supabase
    .from("cutting_jobs")
    .select("order_id")
    .eq("status", "cutting");

  if (!cuttingJobs || cuttingJobs.length === 0) {
    return NextResponse.json({ updated: 0 });
  }

  const orderIds = [...new Set(cuttingJobs.map((j) => j.order_id))];

  const { error } = await supabase
    .from("orders")
    .update({ production_status: "pattern_cut" })
    .in("id", orderIds);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ updated: orderIds.length, orderIds });
}
