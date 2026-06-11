"use client";

import { useEffect, useState } from "react";
import { PageHeader, Button } from "@/components/ui";
import { KanbanBoard } from "@/components/kanban";
import { Plus, Loader2, X } from "lucide-react";
import type { QueueCard, Order, QueueColumn } from "@/lib/types";
import { designColumns } from "@/lib/mock-data";
import { notifyOrdersUpdated } from "@/lib/broadcast";

export default function DesignQueuePage() {
  const [cards, setCards] = useState<QueueCard[]>([]);
  const [allOrders, setAllOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [addTarget, setAddTarget] = useState<string>("wait_design");

  const loadCards = async () => {
    const res = await fetch("/api/orders", { cache: "no-store" });
    const orders: Order[] = await res.json();
    setAllOrders(orders);

    const designOrders = orders.filter(
      (o) => o.type === "design" || o.type === "design_produce" || (o.type === "produce" && !!o.designPackage)
    );

    setCards(
      designOrders.map((o) => ({
        id: o.id,
        orderId: o.id,
        teamName: o.teamName,
        shirtType: o.designPackage ?? "-",
        dueDate: o.startDate,
        columnId: o.designStatus ?? "wait_design",
      }))
    );
    setLoading(false);
  };

  useEffect(() => { loadCards(); }, []);

  const onCardMove = async (cardId: string, newColumnId: string) => {
    await fetch(`/api/orders/${cardId}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ designStatus: newColumnId }),
    });
    notifyOrdersUpdated();
  };

  const inTargetColIds = new Set(cards.filter(c => c.columnId === addTarget).map(c => c.orderId));
  const availableOrders = allOrders.filter(
    (o) => (o.type === "design" || o.type === "design_produce" || (o.type === "produce" && !!o.designPackage)) && !inTargetColIds.has(o.id)
  );

  const addToQueue = async (order: Order) => {
    await fetch(`/api/orders/${order.id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ designStatus: addTarget }),
    });
    setCards((prev) => [
      ...prev,
      {
        id: order.id,
        orderId: order.id,
        teamName: order.teamName,
        shirtType: order.designPackage ?? "-",
        dueDate: order.startDate,
        columnId: addTarget,
      },
    ]);
    setModalOpen(false);
  };

  return (
    <div>
      <PageHeader
        title="คิวออกแบบ"
        subtitle="ลากการ์ดเพื่อย้ายสถานะงานออกแบบ"
        action={
          <Button onClick={() => { setAddTarget("wait_design"); setModalOpen(true); }}>
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
        <div style={{ paddingTop: 26 }}>
          <KanbanBoard
            columns={designColumns}
            cards={cards}
            onCardMove={onCardMove}
            onAddCard={(columnId) => { setAddTarget(columnId); setModalOpen(true); }}
          />
        </div>
      )}

      {/* Modal เพิ่มงานเข้าคิว */}
      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
          <div className="w-full max-w-md rounded-[var(--radius-lg)] bg-surface p-6 shadow-xl">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-base font-semibold">เพิ่มงานเข้าคิวออกแบบ</h2>
              <button onClick={() => setModalOpen(false)} className="text-muted hover:text-foreground">
                <X className="h-5 w-5" />
              </button>
            </div>
            {availableOrders.length === 0 ? (
              <p className="text-sm text-muted">ไม่มีออเดอร์ออกแบบที่ยังไม่ได้เพิ่มเข้าคิว</p>
            ) : (
              <ul className="space-y-2 max-h-80 overflow-y-auto">
                {availableOrders.map((o) => (
                  <li key={o.id}>
                    <button
                      className="w-full rounded-[var(--radius-md)] border border-border bg-surface-2 px-4 py-3 text-left hover:border-accent/50 transition-colors"
                      onClick={() => addToQueue(o)}
                    >
                      <div className="text-sm font-medium">{o.teamName}</div>
                      <div className="text-xs text-muted">{o.id} · {o.designPackage ?? "ออกแบบ"}</div>
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
