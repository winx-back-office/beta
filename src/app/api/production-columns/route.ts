import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@supabase/supabase-js";

function db() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false } }
  );
}

const DEFAULT_COLUMNS = [
  { id: "summary",     title: "รอสรุปงาน",       accent: "#f97316" },
  { id: "pattern_in", title: "เข้าแพทเทิร์น",    accent: "#06b6d4" },
  { id: "size",        title: "วางไซส์",           accent: "#a855f7" },
  { id: "print",       title: "พิมพ์",             accent: "#eab308" },
  { id: "pattern_cut", title: "ตัดแพทเทิร์น",    accent: "#ec4899" },
  { id: "sew",         title: "รอส่ง-เย็บ",       accent: "#818cf8" },
  { id: "done",        title: "แพ็ค/จัดส่ง",      accent: "#22c55e" },
  { id: "delivered",   title: "จัดส่งเรียบร้อย",  accent: "#059669" },
];

export async function GET() {
  const { data, error } = await db().from("production_columns").select("data").eq("id", "singleton").single();
  if (error) return NextResponse.json(DEFAULT_COLUMNS, { status: 200 });
  let cols: { id: string; title: string; accent: string }[] = data?.data ?? [];
  if (cols.length === 0) return NextResponse.json(DEFAULT_COLUMNS);
  // deduplicate by id (keep first occurrence)
  const seen = new Set<string>();
  cols = cols.filter(c => { if (seen.has(c.id)) return false; seen.add(c.id); return true; });
  // append "delivered" if not present yet
  if (!cols.find(c => c.id === "delivered")) {
    cols.push({ id: "delivered", title: "จัดส่งเรียบร้อย", accent: "#059669" });
    await db().from("production_columns").upsert({ id: "singleton", data: cols, updated_at: new Date().toISOString() });
  } else {
    // save deduplicated list back if changed
    const orig = data?.data ?? [];
    if (orig.length !== cols.length) {
      await db().from("production_columns").upsert({ id: "singleton", data: cols, updated_at: new Date().toISOString() });
    }
  }
  return NextResponse.json(cols);
}

export async function POST(req: NextRequest) {
  const body = await req.json();
  const { error } = await db().from("production_columns").upsert({
    id: "singleton",
    data: body,
    updated_at: new Date().toISOString(),
  });
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
