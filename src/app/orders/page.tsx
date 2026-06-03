"use client";

import { useEffect, useState } from "react";
import { PageHeader, Badge, Button, Card } from "@/components/ui";
import { AddOrderModal } from "@/components/add-order-modal";
import { orderTotal, orderBalance, CUSTOMER_TYPE_LABEL, type Order } from "@/lib/types";
import { formatBaht, formatDate } from "@/lib/utils";
import { Plus, Loader2, Trash2, Sheet, X, FileSpreadsheet, Upload, AlertCircle, CheckCircle2 } from "lucide-react";
import { useRef, useCallback } from "react";
import Link from "next/link";

export default function OrdersPage() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [sheetsModalOpen, setSheetsModalOpen] = useState(false);
  const [tooltip, setTooltip] = useState<{ order: Order; x: number; y: number } | null>(null);
  const [tableUpdates, setTableUpdates] = useState<Record<string, string>>({});

  const fetchOrders = async () => {
    const [ordersRes, summaryRes] = await Promise.all([
      fetch("/api/orders", { cache: "no-store" }),
      fetch("/api/production/summary", { cache: "no-store" }),
    ]);
    setOrders(await ordersRes.json());
    setTableUpdates(await summaryRes.json());
    setLoading(false);
  };

  const hasTableUpdate = (orderId: string) => {
    const updatedAt = tableUpdates[orderId];
    if (!updatedAt) return false;
    const viewedAt = localStorage.getItem(`table-viewed-${orderId}`);
    if (!viewedAt) return true;
    return updatedAt > viewedAt;
  };

  useEffect(() => { fetchOrders(); }, []);

  const onCreated = (order: Order) => {
    setOrders((prev) => [order, ...prev]);
  };

  const onDelete = async (id: string) => {
    if (!confirm(`ลบออเดอร์ ${id} ใช่ไหม?`)) return;
    await fetch(`/api/orders/${id}`, { method: "DELETE" });
    setOrders((prev) => prev.filter((o) => o.id !== id));
  };

  const onUpdateDate = async (id: string, startDate: string) => {
    await fetch(`/api/orders/${id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ startDate }),
    });
    setOrders((prev) => prev.map((o) => (o.id === id ? { ...o, startDate } : o)));
  };

  return (
    <div>
      <PageHeader
        title="รายการออเดอร์"
        subtitle="จัดการออเดอร์และการเงินของลูกค้าทุกกลุ่ม"
        action={
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => setSheetsModalOpen(true)}>
              <Sheet className="h-4 w-4" />
              สร้างออเดอร์จาก Sheets
            </Button>
            <Button onClick={() => setModalOpen(true)}>
              <Plus className="h-4 w-4" />
              เพิ่มออเดอร์
            </Button>
          </div>
        }
      />

      <div className="p-8">
        {loading ? (
          <div className="flex items-center justify-center py-24 text-muted">
            <Loader2 className="mr-2 h-5 w-5 animate-spin" />
            กำลังโหลด…
          </div>
        ) : (
          <Card className="overflow-visible">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border text-center text-xs uppercase tracking-wide text-muted-2">
                  <th className="px-5 py-3 font-medium text-left">รหัส</th>
                  <th className="px-5 py-3 font-medium">วันที่เริ่ม</th>
                  <th className="px-5 py-3 font-medium text-left">ชื่อทีม</th>
                  <th className="px-5 py-3 font-medium">ประเภทลูกค้า</th>
                  <th className="px-5 py-3 font-medium">ประเภทเสื้อ</th>
                  <th className="px-5 py-3 font-medium">จำนวน</th>
                  <th className="px-5 py-3 font-medium text-right">ยอดรวม</th>
                  <th className="px-5 py-3 font-medium text-right">มัดจำ</th>
                  <th className="px-5 py-3 font-medium text-right">คงเหลือ</th>
                  <th className="px-5 py-3" />
                </tr>
              </thead>
              <tbody>
                {orders.map((o, idx) => (
                  <tr
                    key={o.id}
                    className={`group transition-colors hover:bg-surface-3 ${idx % 2 === 1 ? "bg-surface-2" : ""}`}
                    onMouseMove={e => (o.shirtType || o.fabricType || o.collarType) && setTooltip({ order: o, x: e.clientX, y: e.clientY })}
                    onMouseLeave={() => setTooltip(null)}
                  >
                    <td className="px-5 py-3.5">
                      <Link href={`/orders/${o.id}`} className="font-mono text-xs text-accent hover:underline">
                        {o.id}
                      </Link>
                    </td>
                    <td className="px-5 py-3.5 text-center text-muted">
                      <DateCell date={o.startDate} onSave={d => onUpdateDate(o.id, d)} />
                    </td>
                    <td className="px-5 py-3.5">
                      <div className="flex items-center gap-2">
                        <Link href={`/orders/${o.id}`} className="font-medium hover:text-accent">
                          {o.teamName}
                        </Link>
                        {hasTableUpdate(o.id) && (
                          <span className="h-2.5 w-2.5 rounded-full bg-warn flex-shrink-0" title="มีข้อมูลอัพเดทในตารางสั่งผลิต" />
                        )}
                      </div>
                    </td>
                    <td className="px-5 py-3.5 text-center">
                      <Badge tone={o.type === "design" ? "info" : o.type === "produce" ? "purple" : "accent"}>
                        {CUSTOMER_TYPE_LABEL[o.type]}
                      </Badge>
                    </td>
                    <td className="px-5 py-3.5 text-center text-muted">{o.shirtType ?? "—"}</td>
                    <td className="px-5 py-3.5 text-center text-muted">{o.quantity != null ? `${o.quantity} ตัว` : "—"}</td>
                    <td className="px-5 py-3.5 text-right font-semibold">{formatBaht(orderTotal(o))}</td>
                    <td className="px-5 py-3.5 text-right text-muted">{formatBaht(o.deposit)}</td>
                    <td className="px-5 py-3.5 text-right">
                      {orderBalance(o) > 0 ? (
                        <span className="font-medium text-warn">{formatBaht(orderBalance(o))}</span>
                      ) : (
                        <span className="text-success">ชำระครบ</span>
                      )}
                    </td>
                    <td className="px-3 py-3.5 text-right">
                      <button
                        onClick={() => onDelete(o.id)}
                        className="invisible group-hover:visible rounded p-1 text-muted hover:bg-red-50 hover:text-red-500 transition-colors"
                        title="ลบออเดอร์"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </td>
                  </tr>
                ))}
                {orders.length === 0 && (
                  <tr>
                    <td colSpan={12} className="px-5 py-12 text-center text-muted">
                      ยังไม่มีออเดอร์ — กดปุ่ม &ldquo;เพิ่มออเดอร์&rdquo; เพื่อเริ่มต้น
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </Card>
        )}
      </div>

      <AddOrderModal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        onCreated={onCreated}
      />

      {sheetsModalOpen && (
        <ImportSheetsModal
          onClose={() => setSheetsModalOpen(false)}
          onImported={(newOrders) => {
            setOrders((prev) => [...newOrders, ...prev]);
            setSheetsModalOpen(false);
          }}
        />
      )}

      {tooltip && (
        <div
          className="pointer-events-none fixed z-50 rounded-[var(--radius-md)] border border-border bg-surface px-4 py-3 shadow-xl"
          style={{ left: tooltip.x + 16, top: tooltip.y + 16 }}
        >
          <div className="flex flex-col gap-2 text-sm">
            {tooltip.order.shirtType && (
              <div className="flex items-center gap-3">
                <span className="w-8 shrink-0 text-xs text-muted-2">เสื้อ</span>
                <span className="font-medium text-foreground">{tooltip.order.shirtType}</span>
              </div>
            )}
            {tooltip.order.fabricType && (
              <div className="flex items-center gap-3">
                <span className="w-8 shrink-0 text-xs text-muted-2">ผ้า</span>
                <span className="font-medium text-foreground">{tooltip.order.fabricType}</span>
              </div>
            )}
            {tooltip.order.collarType && (
              <div className="flex items-center gap-3">
                <span className="w-8 shrink-0 text-xs text-muted-2">คอ</span>
                <span className="font-medium text-foreground">{tooltip.order.collarType}</span>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

function DateCell({ date, onSave }: { date: string; onSave: (d: string) => void }) {
  const [editing, setEditing] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const start = () => {
    setEditing(true);
    setTimeout(() => inputRef.current?.showPicker?.(), 50);
  };

  const commit = (val: string) => {
    if (val) onSave(val);
    setEditing(false);
  };

  if (editing) {
    return (
      <input
        ref={inputRef}
        type="date"
        autoFocus
        defaultValue={date?.slice(0, 10)}
        onChange={e => { if (e.target.value) commit(e.target.value); }}
        onBlur={e => commit(e.target.value)}
        className="w-28 rounded bg-surface-3 px-1 py-0.5 text-center text-sm text-foreground outline-none [color-scheme:dark] [&::-webkit-calendar-picker-indicator]:hidden"
      />
    );
  }

  return (
    <span
      onDoubleClick={start}
      title="ดับเบิ้ลคลิกเพื่อแก้ไข"
      className="cursor-pointer select-none rounded px-2 py-0.5 hover:bg-surface-3"
    >
      {formatDate(date)}
    </span>
  );
}

// ── Import from Sheets Modal ────────────────────────────────
type ImportRow = Partial<Order>;
type PlayerRow = { name: string; size: string; number: string };

function ImportSheetsModal({
  onClose,
  onImported,
}: {
  onClose: () => void;
  onImported: (orders: Order[]) => void;
}) {
  const [mode, setMode] = useState<"orders" | "production">("production");
  const [url, setUrl] = useState("");
  const [fetching, setFetching] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [importing, setImporting] = useState(false);

  // mode: orders
  const [rows, setRows] = useState<ImportRow[] | null>(null);

  // mode: production
  const [players, setPlayers] = useState<PlayerRow[] | null>(null);
  const [detectedFabric, setDetectedFabric] = useState("");
  const [detectedShirt, setDetectedShirt] = useState("");
  const [teamName, setTeamName] = useState("");
  const [shirtType, setShirtType] = useState("");
  const [fabricType, setFabricType] = useState("");

  const resetData = () => { setRows(null); setPlayers(null); setError(null); };

  async function handleFetch(e: React.FormEvent) {
    e.preventDefault();
    setFetching(true);
    resetData();

    const endpoint = mode === "production"
      ? `/api/import/production-sheet?url=${encodeURIComponent(url)}`
      : `/api/import/sheets?url=${encodeURIComponent(url)}`;

    const res = await fetch(endpoint);
    const data = await res.json();

    if (!res.ok || data.error) {
      setError(data.error ?? "เกิดข้อผิดพลาด");
    } else if (mode === "production") {
      setPlayers(data.players);
      setDetectedFabric(data.detectedFabric ?? "");
      setDetectedShirt(data.detectedShirt ?? "");
      setShirtType(data.detectedShirt ?? "");
      setFabricType(data.detectedFabric ?? "");
      if (data.sheetTitle) setTeamName(data.sheetTitle);
    } else {
      setRows(data.rows);
    }
    setFetching(false);
  }

  // นำเข้า orders จาก flat table
  async function handleImportOrders() {
    if (!rows?.length) return;
    setImporting(true);
    const created: Order[] = [];
    for (const row of rows) {
      const res = await fetch("/api/orders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(row),
      });
      const data = await res.json();
      if (res.ok && data.order) created.push(data.order);
    }
    setImporting(false);
    onImported(created);
  }

  // นำเข้าจาก production table — สร้าง 1 order + production entry
  async function handleImportProduction() {
    if (!players) return;
    setImporting(true);
    const orderPayload = {
      type: "produce",
      teamName,
      shirtType,
      fabricType,
      productionPrice: 0,
      deposit: 0,
      quantity: players.length,
      cost: { fabric: 0, paper: 0, ink: 0, cut: 0, sew: 0, other: 0 },
      startDate: new Date().toISOString().slice(0, 10),
    };
    const orderRes = await fetch("/api/orders", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(orderPayload),
    });
    const orderData = await orderRes.json();
    if (!orderRes.ok || !orderData.order) {
      setError("สร้างออเดอร์ไม่ได้");
      setImporting(false);
      return;
    }
    const newOrder: Order = orderData.order;
    // บันทึก production table
    await fetch(`/api/production/${newOrder.id}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        meta: { fabric: fabricType, collar: "", imageUrl: null },
        players: players.map((p, i) => ({
          id: i + 1,
          position: i + 1,
          name: p.name,
          size: p.size,
          number: p.number,
          checked: false,
          note: "",
          status: "",
        })),
      }),
    });
    setImporting(false);
    onImported([newOrder]);
  }

  const fieldCls = "w-full rounded-[var(--radius-md)] border border-border bg-surface-2 px-3 py-2 text-sm text-foreground placeholder:text-muted-2 focus:border-accent focus:outline-none";

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
      <div className="w-full max-w-3xl rounded-[var(--radius-lg)] border border-border bg-surface shadow-2xl flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-border px-6 py-4 shrink-0">
          <div className="flex items-center gap-2">
            <FileSpreadsheet className="h-5 w-5 text-accent" />
            <span className="font-semibold">สร้างออเดอร์จาก Google Sheets</span>
          </div>
          <button onClick={onClose} className="text-muted hover:text-foreground"><X className="h-4 w-4" /></button>
        </div>

        <div className="overflow-y-auto p-6 space-y-5">
          {/* Mode toggle */}
          <div className="flex gap-1 rounded-[var(--radius-md)] border border-border bg-surface-2 p-1">
            {(["production", "orders"] as const).map((m) => (
              <button key={m} type="button"
                onClick={() => { setMode(m); resetData(); setUrl(""); }}
                className={`flex-1 rounded-[var(--radius-sm)] px-3 py-1.5 text-xs font-medium transition-colors ${mode === m ? "bg-surface text-foreground shadow-sm" : "text-muted hover:text-foreground"}`}>
                {m === "production" ? "ตารางสั่งผลิต (ชื่อ + ไซส์)" : "รายการออเดอร์หลายรายการ"}
              </button>
            ))}
          </div>

          {/* URL input */}
          <div>
            <p className="text-xs text-muted mb-2">
              {mode === "production"
                ? "วาง URL ตารางสั่งผลิต WINX (Google Sheets สาธารณะ)"
                : "วาง URL Google Sheets ที่มีหัวคอลัมน์ ชื่อทีม / ประเภท / ทรงเสื้อ …"}
            </p>
            <form onSubmit={handleFetch} className="flex gap-2">
              <input value={url} onChange={(e) => setUrl(e.target.value)}
                placeholder="https://docs.google.com/spreadsheets/d/..."
                className="flex-1 rounded-[var(--radius-md)] border border-border bg-surface-2 px-3 py-2 text-sm text-foreground placeholder:text-muted-2 focus:border-accent focus:outline-none"
                required />
              <Button type="submit" disabled={fetching || !url.trim()}>
                {fetching ? <Loader2 className="h-4 w-4 animate-spin" /> : <FileSpreadsheet className="h-4 w-4" />}
                {fetching ? "กำลังดึง…" : "ดึงข้อมูล"}
              </Button>
            </form>
          </div>

          {/* Error */}
          {error && (
            <div className="flex items-center gap-2 rounded-[var(--radius-md)] border border-danger/30 bg-danger/10 px-4 py-3 text-sm text-danger">
              <AlertCircle className="h-4 w-4 shrink-0" />{error}
            </div>
          )}

          {/* === Production table preview === */}
          {mode === "production" && players !== null && (
            <div className="space-y-4">
              <p className="text-sm font-medium">
                พบผู้เล่น <span className="text-accent">{players.length} คน</span> — กรอกข้อมูลออเดอร์แล้วนำเข้า
              </p>

              {/* Order fields */}
              <div className="grid grid-cols-2 gap-3 text-sm">
                <div className="col-span-2">
                  <label className="text-xs text-muted-2 mb-1 block">ชื่อทีม *</label>
                  <input className={fieldCls} value={teamName} onChange={e => setTeamName(e.target.value)} placeholder="ชื่อทีม" />
                </div>
                <div>
                  <label className="text-xs text-muted-2 mb-1 block">ทรงเสื้อ {detectedShirt && <span className="text-accent">(ตรวจพบ: {detectedShirt})</span>}</label>
                  <input className={fieldCls} value={shirtType} onChange={e => setShirtType(e.target.value)} placeholder="เช่น Basic Jersey" />
                </div>
                <div>
                  <label className="text-xs text-muted-2 mb-1 block">เนื้อผ้า {detectedFabric && <span className="text-accent">(ตรวจพบ: {detectedFabric})</span>}</label>
                  <input className={fieldCls} value={fabricType} onChange={e => setFabricType(e.target.value)} placeholder="เช่น เม็ดข้าวสาร 150 แกรม" />
                </div>
              </div>

              {/* Player preview */}
              {players.length > 0 && (
                <div className="overflow-x-auto rounded-[var(--radius-md)] border border-border max-h-52">
                  <table className="w-full text-sm border-collapse">
                    <thead className="sticky top-0">
                      <tr className="border-b border-border bg-surface-2 text-left text-xs text-muted">
                        <th className="px-4 py-2 font-medium w-10">#</th>
                        <th className="px-4 py-2 font-medium">ชื่อ</th>
                        <th className="px-4 py-2 font-medium">ไซส์</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border">
                      {players.map((p, i) => (
                        <tr key={i} className={i % 2 === 1 ? "bg-surface-2" : ""}>
                          <td className="px-4 py-2 text-muted">{p.number || i + 1}</td>
                          <td className="px-4 py-2">{p.name}</td>
                          <td className="px-4 py-2"><span className="rounded bg-surface-2 px-2 py-0.5 text-xs font-medium">{p.size}</span></td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}

              <div className="flex justify-end">
                <Button onClick={handleImportProduction} disabled={importing || !teamName.trim() || players.length === 0}>
                  {importing ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />}
                  {importing ? "กำลังสร้าง…" : `สร้างออเดอร์ + นำเข้า ${players.length} คน`}
                </Button>
              </div>
            </div>
          )}

          {/* === Orders list preview === */}
          {mode === "orders" && rows !== null && (
            <div>
              <div className="flex items-center justify-between mb-3">
                <p className="text-sm font-medium">พบ <span className="text-accent">{rows.length} รายการ</span></p>
                <Button onClick={handleImportOrders} disabled={importing || rows.length === 0}>
                  {importing ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />}
                  {importing ? "กำลังนำเข้า…" : `นำเข้า ${rows.length} ออเดอร์`}
                </Button>
              </div>
              <div className="overflow-x-auto rounded-[var(--radius-md)] border border-border">
                <table className="w-full text-sm border-collapse">
                  <thead>
                    <tr className="border-b border-border bg-surface-2 text-left text-xs text-muted">
                      <th className="px-4 py-2.5 font-medium">ชื่อทีม</th>
                      <th className="px-4 py-2.5 font-medium">ประเภท</th>
                      <th className="px-4 py-2.5 font-medium">ทรงเสื้อ</th>
                      <th className="px-4 py-2.5 font-medium">จำนวน</th>
                      <th className="px-4 py-2.5 font-medium">ราคาผลิต</th>
                      <th className="px-4 py-2.5 font-medium">มัดจำ</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {rows.map((r, i) => (
                      <tr key={i} className={i % 2 === 1 ? "bg-surface-2" : ""}>
                        <td className="px-4 py-2.5 font-medium">{r.teamName ?? "—"}</td>
                        <td className="px-4 py-2.5">{r.type ? <Badge tone={r.type === "design" ? "info" : r.type === "produce" ? "purple" : "accent"}>{CUSTOMER_TYPE_LABEL[r.type]}</Badge> : "—"}</td>
                        <td className="px-4 py-2.5 text-muted">{r.shirtType ?? "—"}</td>
                        <td className="px-4 py-2.5">{r.quantity ?? "—"}</td>
                        <td className="px-4 py-2.5">{r.productionPrice != null ? `฿${r.productionPrice.toLocaleString()}` : "—"}</td>
                        <td className="px-4 py-2.5">{r.deposit != null ? `฿${r.deposit.toLocaleString()}` : "฿0"}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="border-t border-border px-6 py-3 shrink-0 flex justify-end">
          <button onClick={onClose} className="rounded-md border border-border px-4 py-2 text-sm text-muted hover:bg-surface-2">
            ปิด
          </button>
        </div>
      </div>
    </div>
  );
}
