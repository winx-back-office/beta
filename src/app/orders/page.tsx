"use client";

import { useEffect, useState } from "react";
import { PageHeader, Badge, Button, Card } from "@/components/ui";
import { AddOrderModal } from "@/components/add-order-modal";
import { orderTotal, orderBalance, CUSTOMER_TYPE_LABEL, type Order } from "@/lib/types";
import { formatBaht, formatDate } from "@/lib/utils";
import { Plus, Loader2, Trash2, Sheet } from "lucide-react";
import { useRef, useCallback } from "react";
import Link from "next/link";

export default function OrdersPage() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [tooltip, setTooltip] = useState<{ order: Order; x: number; y: number } | null>(null);

  const fetchOrders = async () => {
    const res = await fetch("/api/orders", { cache: "no-store" });
    const data = await res.json();
    setOrders(data);
    setLoading(false);
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
            <Link href="/orders/import">
              <Button variant="outline">
                <Sheet className="h-4 w-4" />
                นำเข้าจาก Sheets
              </Button>
            </Link>
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
                  <th className="px-5 py-3 font-medium">ผ้า</th>
                  <th className="px-5 py-3 font-medium">คอ</th>
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
                      <Link href={`/orders/${o.id}`} className="font-medium hover:text-accent">
                        {o.teamName}
                      </Link>
                    </td>
                    <td className="px-5 py-3.5 text-center">
                      <Badge tone={o.type === "design" ? "info" : o.type === "produce" ? "purple" : "accent"}>
                        {CUSTOMER_TYPE_LABEL[o.type]}
                      </Badge>
                    </td>
                    <td className="px-5 py-3.5 text-center text-muted">{o.shirtType ?? "—"}</td>
                    <td className="px-5 py-3.5 text-center text-muted">{o.fabricType ?? "—"}</td>
                    <td className="px-5 py-3.5 text-center text-muted">{o.collarType ?? "—"}</td>
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
