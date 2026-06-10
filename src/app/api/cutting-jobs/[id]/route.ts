import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@supabase/supabase-js";
import type { CuttingJob } from "../route";

function getSupabase() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false } }
  );
}

function toJob(row: Record<string, unknown>): CuttingJob {
  return {
    id: row.id as string,
    orderId: row.order_id as string,
    teamName: row.team_name as string,
    shirtType: row.shirt_type as string,
    collarType: row.collar_type as string,
    quantity: row.quantity as number,
    patternPieces: row.pattern_pieces as number,
    token: row.token as string,
    status: row.status as CuttingJob["status"],
    cutterId: row.cutter_id as string | null,
    cutterName: row.cutter_name as string | null,
    startedAt: row.started_at as string | null,
    completedAt: row.completed_at as string | null,
    createdAt: row.created_at as string,
    note: row.note as string,
    cutterNote: (row.cutter_note as string) ?? "",
  };
}

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const { data, error } = await getSupabase()
    .from("cutting_jobs")
    .select("*")
    .eq("id", id)
    .single();
  if (error) return NextResponse.json({ error: "not found" }, { status: 404 });
  return NextResponse.json(toJob(data));
}

export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const body = await req.json();

  const updateData: Record<string, unknown> = {};
  if (body.status !== undefined) updateData.status = body.status;
  if (body.cutterId !== undefined) updateData.cutter_id = body.cutterId;
  if (body.cutterName !== undefined) updateData.cutter_name = body.cutterName;
  if (body.startedAt !== undefined) updateData.started_at = body.startedAt;
  if (body.completedAt !== undefined) updateData.completed_at = body.completedAt;
  if (body.note !== undefined) updateData.note = body.note;
  if (body.cutterNote !== undefined) updateData.cutter_note = body.cutterNote;
  if (body.teamName !== undefined) updateData.team_name = body.teamName;
  if (body.shirtType !== undefined) updateData.shirt_type = body.shirtType;
  if (body.collarType !== undefined) updateData.collar_type = body.collarType;
  if (body.quantity !== undefined) updateData.quantity = body.quantity;
  if (body.patternPieces !== undefined) updateData.pattern_pieces = body.patternPieces;

  const { data, error } = await getSupabase()
    .from("cutting_jobs")
    .update(updateData)
    .eq("id", id)
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true, job: toJob(data) });
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const { error } = await getSupabase().from("cutting_jobs").delete().eq("id", id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
