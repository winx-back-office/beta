import { supabase, supabaseEnabled } from "./supabase";

export interface PlayerRow {
  id: string;
  position: number;
  name: string;
  size: string;
  number: string;
  checked: boolean;
  note: string;
}

export interface ProductionMeta {
  fabric: string;
  collar: string;
  imageUrl: string | null;
}

export interface ProductionData {
  meta: ProductionMeta;
  players: PlayerRow[];
}

export { supabaseEnabled };

// ===== โหลดตารางผลิต =====
export async function loadProduction(
  orderId: string,
  fallbackFabric: string
): Promise<ProductionData> {
  // Local API (ไม่มี Supabase)
  if (!supabaseEnabled) {
    try {
      const res = await fetch(`/api/production/${orderId}`, { cache: "no-store" });
      const json = await res.json();
      return {
        meta: {
          fabric: json.meta?.fabric || fallbackFabric,
          collar: json.meta?.collar || "คอกลม",
          imageUrl: json.meta?.imageUrl || null,
        },
        players: (json.players || []).map(
          (p: PlayerRow, i: number): PlayerRow => ({
            id: p.id || String(i),
            position: i,
            name: p.name || "",
            size: p.size || "",
            number: p.number || "",
            checked: !!p.checked,
            note: p.note || "",
          })
        ),
      };
    } catch {
      return { meta: { fabric: fallbackFabric, collar: "คอกลม", imageUrl: null }, players: [] };
    }
  }

  // Supabase
  const [metaRes, playersRes] = await Promise.all([
    supabase!.from("production_meta").select("*").eq("order_id", orderId).maybeSingle(),
    supabase!
      .from("production_players")
      .select("*")
      .eq("order_id", orderId)
      .order("position", { ascending: true }),
  ]);

  const meta: ProductionMeta = metaRes.data
    ? {
        fabric: metaRes.data.fabric ?? fallbackFabric,
        collar: metaRes.data.collar ?? "คอกลม",
        imageUrl: metaRes.data.image_url ?? null,
      }
    : { fabric: fallbackFabric, collar: "คอกลม", imageUrl: null };

  const players: PlayerRow[] = (playersRes.data ?? []).map((p) => ({
    id: p.id,
    position: p.position,
    name: p.name ?? "",
    size: p.size ?? "",
    number: p.number ?? "",
    checked: p.checked ?? false,
    note: p.note ?? "",
  }));

  return { meta, players };
}

// ===== บันทึกตารางผลิต =====
export async function saveProduction(
  orderId: string,
  meta: ProductionMeta,
  players: Omit<PlayerRow, "id">[]
): Promise<{ ok: boolean; error?: string }> {
  // Local API
  if (!supabaseEnabled) {
    try {
      const res = await fetch(`/api/production/${orderId}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ meta, players }),
      });
      const json = await res.json();
      return json.ok ? { ok: true } : { ok: false, error: "บันทึกล้มเหลว" };
    } catch (e) {
      return { ok: false, error: String(e) };
    }
  }

  // Supabase
  const metaErr = await supabase!.from("production_meta").upsert({
    order_id: orderId,
    fabric: meta.fabric,
    collar: meta.collar,
    image_url: meta.imageUrl,
    updated_at: new Date().toISOString(),
  });
  if (metaErr.error) return { ok: false, error: metaErr.error.message };

  await supabase!.from("production_players").delete().eq("order_id", orderId);

  if (players.length > 0) {
    const rows = players.map((p, i) => ({
      order_id: orderId,
      position: i,
      name: p.name,
      size: p.size,
      number: p.number,
      checked: p.checked,
      note: p.note,
    }));
    const insErr = await supabase!.from("production_players").insert(rows);
    if (insErr.error) return { ok: false, error: insErr.error.message };
  }

  await supabase!.from("orders").update({ has_production_table: true }).eq("id", orderId);

  return { ok: true };
}

// ===== Realtime (Supabase เท่านั้น — local ใช้ polling แทน) =====
export function subscribeProduction(orderId: string, onChange: () => void) {
  if (!supabaseEnabled) return () => {};

  const client = supabase!;
  const channel = client
    .channel(`production-${orderId}`)
    .on(
      "postgres_changes",
      { event: "*", schema: "public", table: "production_players", filter: `order_id=eq.${orderId}` },
      onChange
    )
    .on(
      "postgres_changes",
      { event: "*", schema: "public", table: "production_meta", filter: `order_id=eq.${orderId}` },
      onChange
    )
    .subscribe();

  return () => {
    client.removeChannel(channel);
  };
}
