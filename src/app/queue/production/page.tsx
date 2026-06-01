"use client";

import { useEffect, useState } from "react";
import { PageHeader, Button } from "@/components/ui";
import { KanbanBoard } from "@/components/kanban";
import type { QueueColumn } from "@/lib/types";
import { Plus, Loader2, X } from "lucide-react";
import type { QueueCard, Order, QueueColumn } from "@/lib/types";
import { formatDate } from "@/lib/utils";

export default function ProductionQueuePage() {
  const [cards, setCards] = useState<QueueCard[]>([]);
  const [allOrders, setAllOrders] = useState<Order[]>([]);
  const [columns, setColumns] = useState<QueueColumn[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [addTarget, setAddTarget] = useState<string>("summary"); // columnId ที่จะเพิ่มเข้า

  const loadCards = async () => {
    const [colRes, res] = await Promise.all([
      fetch("/api/production-columns", { cache: "no-store" }),
      fetch("/api/orders", { cache: "no-store" }),
    ]);
    const cols: QueueColumn[] = await colRes.json();
    setColumns(cols);
    const orders: Order[] = await res.json();
    setAllOrders(orders);

    const produceOrders = orders.filter(
      (o) => o.type !== "design" && (o.hasProductionTable || o.productionStatus)
    );

    const cards = await Promise.all(
      produceOrders.map(async (o) => {
        let image: string | undefined;
        try {
          const pRes = await fetch(`/api/production/${o.id}`, { cache: "no-store" });
          const pData = await pRes.json();
          const images: { url: string; isMain: boolean }[] = pData.meta?.images ?? [];
          const main = images.find((img) => img.isMain) ?? images[0];
          image = main?.url ?? pData.meta?.imageUrl ?? undefined;
        } catch {}
        return {
          id: o.id,
          orderId: o.id,
          teamName: o.teamName,
          shirtType: o.shirtType ?? "-",
          dueDate: o.startDate,
          image,
          columnId: o.productionStatus ?? "summary",
        } satisfies QueueCard;
      })
    );

    setCards(cards);
    setLoading(false);
  };

  useEffect(() => { loadCards(); }, []);

  const onColumnsChange = async (cols: QueueColumn[]) => {
    await fetch("/api/production-columns", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(cols),
    });
  };

  const onCardMove = async (cardId: string, newColumnId: string) => {
    await fetch(`/api/orders/${cardId}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ productionStatus: newColumnId }),
    });
  };

  // ออเดอร์ผลิตทั้งหมดที่ยังไม่อยู่ใน column เป้าหมาย
  const inTargetColIds = new Set(cards.filter(c => c.columnId === addTarget).map(c => c.orderId));
  const availableOrders = allOrders.filter(
    (o) => o.type !== "design" && !inTargetColIds.has(o.id)
  );

  const addToQueue = async (order: Order) => {
    await fetch(`/api/orders/${order.id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ productionStatus: addTarget }),
    });
    setCards((prev) => [
      ...prev,
      {
        id: order.id,
        orderId: order.id,
        teamName: order.teamName,
        shirtType: order.shirtType ?? "-",
        dueDate: order.startDate,
        columnId: addTarget,
      },
    ]);
    setModalOpen(false);
  };

  return (
    <div>
      <PageHeader
        title="คิวผลิต"
        subtitle="ลากการ์ดเพื่อย้ายสถานะงานผลิต"
        action={
          <Button onClick={() => { setAddTarget("summary"); setModalOpen(true); }}>
            <Plus className="h-4 w-4" />
            เพิ่มงาน
          </Button>
        }
      />
      {loading ? (
        <div className="flex items-center justify-center py-32 text-muted">
          <Loader2 className="mr-2 h-5 w-5 animate-spin" /> กำลังโหลด…
        </div>
      ) : (
        <div className="pt-6">
          <KanbanBoard
            columns={columns}
            cards={cards}
            onCardMove={onCardMove}
            onColumnsChange={onColumnsChange}
            onAddCard={(columnId) => { setAddTarget(columnId); setModalOpen(true); }}
          />
        </div>
      )}

      {/* Modal เพิ่มงาน */}
      {modalOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm"
          onClick={() => setModalOpen(false)}
        >
          <div
            className="w-[480px] max-h-[80vh] flex flex-col rounded-[var(--radius-lg)] border border-border bg-surface shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="flex items-center justify-between border-b border-border px-5 py-4">
              <div>
                <h2 className="font-semibold">เพิ่มงานเข้าคิว</h2>
                <p className="text-xs text-muted mt-0.5">
                  เพิ่มเข้า: <span className="font-medium text-foreground">{productionColumns.find(c => c.id === addTarget)?.title}</span>
                </p>
              </div>
              <button onClick={() => setModalOpen(false)} className="rounded p-1 hover:bg-surface-2">
                <X className="h-4 w-4 text-muted" />
              </button>
            </div>

            {/* Column picker */}
            <div className="flex gap-2 overflow-x-auto border-b border-border px-5 py-3">
              {columns.map((col) => (
                <button
                  key={col.id}
                  onClick={() => setAddTarget(col.id)}
                  className={`flex shrink-0 items-center gap-1.5 rounded-full px-3 py-1 text-xs font-medium transition-colors ${
                    addTarget === col.id
                      ? "bg-accent text-accent-foreground"
                      : "bg-surface-2 text-muted hover:bg-surface-3"
                  }`}
                >
                  <span className="h-1.5 w-1.5 rounded-full" style={{ background: col.accent }} />
                  {col.title}
                </button>
              ))}
            </div>

            {/* Order list */}
            <div className="flex-1 overflow-y-auto divide-y divide-border">
              {availableOrders.length === 0 ? (
                <div className="py-16 text-center text-sm text-muted">ออเดอร์ทุกรายการอยู่ในคิวแล้ว</div>
              ) : (
                availableOrders.map((o) => (
                  <button
                    key={o.id}
                    onClick={() => addToQueue(o)}
                    className="flex w-full items-center justify-between px-5 py-3.5 text-left hover:bg-surface-2 transition-colors"
                  >
                    <div>
                      <div className="font-medium">{o.teamName}</div>
                      <div className="flex items-center gap-2 mt-0.5 text-xs text-muted">
                        <span className="font-mono">{o.id}</span>
                        {o.shirtType && <span>· {o.shirtType}</span>}
                      </div>
                    </div>
                    <span className="text-xs text-muted">{formatDate(o.startDate)}</span>
                  </button>
                ))
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
