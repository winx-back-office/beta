import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@supabase/supabase-js";

function db() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false } }
  );
}

// GET /api/production/[id]
export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  const [metaRes, playersRes] = await Promise.all([
    db().from("production_meta").select("*").eq("order_id", id).maybeSingle(),
    db().from("production_players").select("*").eq("order_id", id).order("position", { ascending: true }),
  ]);

  return NextResponse.json({
    meta: metaRes.data ? {
      fabric: metaRes.data.fabric ?? "",
      collar: metaRes.data.collar ?? "",
      imageUrl: metaRes.data.image_url ?? null,
      images: metaRes.data.images ?? undefined,
      columnLabels: metaRes.data.column_labels ?? undefined,
      sheetsUrl: metaRes.data.sheets_url ?? undefined,
    } : { fabric: "", collar: "คอกลม", imageUrl: null },
    players: (playersRes.data ?? []).map((p: Record<string, unknown>) => ({
      id: String(p.id),
      position: p.position,
      name: p.name,
      size: p.size,
      number: p.number,
      checked: p.checked,
      status: p.status ?? "",
      note: p.note ?? "",
    })),
  });
}

// POST /api/production/[id]
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const body = await req.json();

  const { error: metaErr } = await db().from("production_meta").upsert({
    order_id: id,
    fabric: body.meta?.fabric ?? "",
    collar: body.meta?.collar ?? "",
    image_url: body.meta?.imageUrl ?? null,
    images: body.meta?.images ?? null,
    column_labels: body.meta?.columnLabels ?? null,
    sheets_url: body.meta?.sheetsUrl ?? null,
    updated_at: new Date().toISOString(),
  });
  if (metaErr) return NextResponse.json({ ok: false, error: metaErr.message }, { status: 500 });

  await db().from("production_players").delete().eq("order_id", id);

  if (body.players?.length > 0) {
    const rows = body.players.map((p: Record<string, unknown>, i: number) => ({
      order_id: id,
      position: i,
      name: p.name ?? "",
      size: p.size ?? "",
      number: p.number ?? "",
      checked: p.checked ?? false,
      status: p.status ?? "",
      note: p.note ?? "",
    }));
    const { error: insErr } = await db().from("production_players").insert(rows);
    if (insErr) return NextResponse.json({ ok: false, error: insErr.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
