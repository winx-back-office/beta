import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@supabase/supabase-js";

function getSupabase() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false } }
  );
}

export interface CuttingJob {
  id: string;
  orderId: string;
  teamName: string;
  shirtType: string;
  collarType: string;
  quantity: number;
  patternPieces: number;
  token: string;
  status: "pending" | "cutting" | "done";
  cutterId: string | null;
  cutterName: string | null;
  startedAt: string | null;
  completedAt: string | null;
  createdAt: string;
  note: string;
  cutterNote: string;
}

function toJob(row: Record<string, unknown>): CuttingJob {
  return {
    id: row.id as string,
    orderId: row.order_id as string,
    teamName: row.team_name as string,
    shirtType: row.shirt_type as string,
    collarType: row.collar_type as string,
    quantity: row.quantity as number,
    patternPieces: (row.pattern_pieces as number) || getPatternPieces(row.shirt_type as string, row.collar_type as string) * (row.quantity as number),
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

function getPatternPieces(shirtType: string, collarType: string): number {
  const map: Record<string, number> = {
    "BASIC JERSEY|คอกลม": 6,
    "BASIC JERSEY|ปกกระดุม": 7,
    "PRO JACKET ผ้าไมโครพีช|PRO JACKET ผ้าไมโครพีช": 17,
    "PRO JACKET ผ้าวอร์ม|PRO JACKET ผ้าวอร์ม": 20,
  };
  const key = `${shirtType.toUpperCase()}|${collarType}`;
  return map[key] ?? 0;
}

export async function GET() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!supabaseUrl || !supabaseKey) {
    return NextResponse.json({ error: "missing env" }, { status: 500 });
  }
  try {
    const { data, error } = await getSupabase()
      .from("cutting_jobs")
      .select("*")
      .order("created_at", { ascending: false });
    if (error) return NextResponse.json({ error: error.message, code: error.code, details: error.details }, { status: 500 });
    return NextResponse.json((data ?? []).map(toJob));
  } catch (e: unknown) {
    const err = e as Error & { cause?: unknown };
    return NextResponse.json({
      error: err.message,
      cause: String(err.cause),
      url: supabaseUrl,
    }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  const body = await req.json();
  const { orderId, teamName, shirtType, collarType, quantity, note } = body;

  const { data: existing } = await getSupabase()
    .from("cutting_jobs")
    .select("id")
    .order("created_at", { ascending: false });

  const nums = (existing ?? [])
    .map((j: { id: string }) => parseInt(j.id.replace("CUT-", "")))
    .filter((n: number) => !isNaN(n));
  const next = nums.length > 0 ? Math.max(...nums) + 1 : 1;
  const id = `CUT-${String(next).padStart(3, "0")}`;

  const patternPieces = (quantity ?? 1) * getPatternPieces(shirtType, collarType);

  const newRow = {
    id,
    order_id: orderId,
    team_name: teamName,
    shirt_type: shirtType,
    collar_type: collarType,
    quantity: quantity ?? 1,
    pattern_pieces: patternPieces,
    token: crypto.randomUUID(),
    status: "pending",
    cutter_id: null,
    cutter_name: null,
    started_at: null,
    completed_at: null,
    note: note ?? "",
  };

  const { data, error } = await getSupabase()
    .from("cutting_jobs")
    .insert(newRow)
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true, job: toJob(data) });
}
