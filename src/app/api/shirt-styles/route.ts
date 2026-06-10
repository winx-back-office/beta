import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@supabase/supabase-js";

function db() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false } }
  );
}

function toStyle(row: Record<string, unknown>) {
  return { id: row.id, name: row.name, ...(row.data as object) };
}

export async function GET() {
  const { data, error } = await db().from("shirt_styles").select("*").order("created_at", { ascending: true });
  if (error) return NextResponse.json([], { status: 200 });
  return NextResponse.json((data ?? []).map(toStyle));
}

export async function POST(req: NextRequest) {
  const body = await req.json();
  const { name, ...rest } = body;
  const id =
    String(name)
      .toLowerCase()
      .replace(/[^a-z0-9ก-๙]+/g, "-")
      .replace(/^-+|-+$/g, "") +
    "-" +
    Date.now();
  const { data, error } = await db()
    .from("shirt_styles")
    .insert({ id, name, data: rest })
    .select()
    .single();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(toStyle(data), { status: 201 });
}
