export interface PlayerRow {
  id: string;
  position: number;
  name: string;
  size: string;
  number: string;
  checked: boolean;
  status: string;
  note: string;
}

export interface ProductionImage {
  url: string;
  isMain: boolean;
}

export interface ProductionMeta {
  fabric: string;
  collar: string;
  imageUrl: string | null;
  images?: ProductionImage[];
  columnLabels?: string[];
  sheetsUrl?: string;
}

export interface ProductionData {
  meta: ProductionMeta;
  players: PlayerRow[];
}

// ===== โหลดตารางผลิต =====
export async function loadProduction(
  orderId: string,
  fallbackFabric: string,
  fallbackCollar = ""
): Promise<ProductionData> {
  try {
    const res = await fetch(`/api/production/${orderId}`, { cache: "no-store" });
    const json = await res.json();
    return {
      meta: {
        fabric: json.meta?.fabric || fallbackFabric,
        collar: json.meta?.collar || fallbackCollar,
        imageUrl: json.meta?.imageUrl || null,
        images: json.meta?.images ?? undefined,
        columnLabels: json.meta?.columnLabels ?? undefined,
        sheetsUrl: json.meta?.sheetsUrl ?? undefined,
      },
      players: (json.players || []).map(
        (p: PlayerRow, i: number): PlayerRow => ({
          id: p.id || String(i),
          position: i,
          name: p.name || "",
          size: p.size || "",
          number: p.number || "",
          checked: !!p.checked,
          status: p.status || "",
          note: p.note || "",
        })
      ),
    };
  } catch {
    return { meta: { fabric: fallbackFabric, collar: fallbackCollar, imageUrl: null }, players: [] };
  }
}

// ===== บันทึกตารางผลิต =====
export async function saveProduction(
  orderId: string,
  meta: ProductionMeta,
  players: Omit<PlayerRow, "id">[]
): Promise<{ ok: boolean; error?: string }> {
  try {
    const res = await fetch(`/api/production/${orderId}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ meta, players }),
    });
    const json = await res.json();
    return json.ok ? { ok: true } : { ok: false, error: json.error ?? "บันทึกล้มเหลว" };
  } catch (e) {
    return { ok: false, error: String(e) };
  }
}

// ===== Realtime: ใช้ polling ผ่าน API route =====
export function subscribeProduction(orderId: string, onChange: () => void) {
  const interval = setInterval(onChange, 10000);
  return () => clearInterval(interval);
}
