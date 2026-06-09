import { NextResponse, type NextRequest } from "next/server";
import fs from "fs";
import path from "path";
import { supabase, supabaseEnabled } from "@/lib/supabase";

const DB_PATH = path.join(process.cwd(), "src/data/production.json");

function readDB(): Record<string, unknown> {
  try {
    return JSON.parse(fs.readFileSync(DB_PATH, "utf-8"));
  } catch {
    return {};
  }
}

function writeDB(data: Record<string, unknown>) {
  fs.writeFileSync(DB_PATH, JSON.stringify(data, null, 2), "utf-8");
}

// GET /api/production/[id]
export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  if (supabaseEnabled) {
    const [metaRes, playersRes] = await Promise.all([
      supabase!.from("production_meta").select("*").eq("order_id", id).maybeSingle(),
      supabase!.from("production_players").select("*").eq("order_id", id).order("position", { ascending: true }),
    ]);
    if (metaRes.data) {
      return NextResponse.json({
        meta: {
          fabric: metaRes.data.fabric ?? "",
          collar: metaRes.data.collar ?? "",
          imageUrl: metaRes.data.image_url ?? null,
          images: metaRes.data.images ?? undefined,
          columnLabels: metaRes.data.column_labels ?? undefined,
          sheetsUrl: metaRes.data.sheets_url ?? undefined,
        },
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
    // ถ้าไม่มีใน Supabase fallback ไป local
  }

  const db = readDB();
  const entry = db[id] ?? { meta: { fabric: "", collar: "คอกลม", imageUrl: null }, players: [] };
  return NextResponse.json(entry);
}

// POST /api/production/[id]
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const body = await req.json();

  // บันทึกลง local เสมอ (fallback)
  const db = readDB();
  db[id] = { meta: body.meta, players: body.players, updatedAt: new Date().toISOString() };
  writeDB(db);

  // บันทึกลง Supabase ด้วยถ้า enabled
  if (supabaseEnabled) {
    const metaErr = await supabase!.from("production_meta").upsert({
      order_id: id,
      fabric: body.meta.fabric,
      collar: body.meta.collar,
      image_url: body.meta.imageUrl ?? null,
      images: body.meta.images ?? null,
      column_labels: body.meta.columnLabels ?? null,
      sheets_url: body.meta.sheetsUrl ?? null,
      updated_at: new Date().toISOString(),
    });
    if (metaErr.error) {
      return NextResponse.json({ ok: false, error: metaErr.error.message }, { status: 500 });
    }

    await supabase!.from("production_players").delete().eq("order_id", id);
    if (body.players?.length > 0) {
      const rows = body.players.map((p: Record<string, unknown>, i: number) => ({
        order_id: id,
        position: i,
        name: p.name,
        size: p.size,
        number: p.number,
        checked: p.checked ?? false,
        status: p.status ?? "",
        note: p.note ?? "",
      }));
      const insErr = await supabase!.from("production_players").insert(rows);
      if (insErr.error) {
        return NextResponse.json({ ok: false, error: insErr.error.message }, { status: 500 });
      }
    }
  }

  return NextResponse.json({ ok: true });
}
