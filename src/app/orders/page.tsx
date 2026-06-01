"use client";

import { useEffect, useState } from "react";
import { PageHeader, Badge, Button, Card } from "@/components/ui";
import { AddOrderModal } from "@/components/add-order-modal";
import { orderTotal, orderBalance, CUSTOMER_TYPE_LABEL, type Order } from "@/lib/types";
import { formatBaht, formatDate } from "@/lib/utils";
import { Plus, Loader2 } from "lucide-react";
import Link from "next/link";

export default function OrdersPage() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);

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

  return (
    <div>
      <PageHeader
        title="รายการออเดอร์"
        subtitle="จัดการออเดอร์และการเงินของลูกค้าทุกกลุ่ม"
        action={
          <Button onClick={() => setModalOpen(true)}>
            <Plus className="h-4 w-4" />
            เพิ่มออเดอร์
          </Button>
        }
      />

      <div className="p-8">
        {loading ? (
          <div className="flex items-center justify-center py-24 text-muted">
            <Loader2 className="mr-2 h-5 w-5 animate-spin" />
            กำลังโหลด…
          </div>
        ) : (
          <Card className="overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border text-left text-xs uppercase tracking-wide text-muted-2">
                  <th className="px-5 py-3 font-medium">รหัส</th>
                  <th className="px-5 py-3 font-medium">ชื่อทีม</th>
                  <th className="px-5 py-3 font-medium">ประเภทลูกค้า</th>
                  <th className="px-5 py-3 font-medium">วันที่เริ่ม</th>
                  <th className="px-5 py-3 text-right font-medium">ยอดรวม</th>
                  <th className="px-5 py-3 text-right font-medium">มัดจำ</th>
                  <th className="px-5 py-3 text-right font-medium">คงเหลือ</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {orders.map((o) => (
                  <tr key={o.id} className="group transition-colors hover:bg-surface-2">
                    <td className="px-5 py-3.5">
                      <Link href={`/orders/${o.id}`} className="font-mono text-xs text-accent hover:underline">
                        {o.id}
                      </Link>
                    </td>
                    <td className="px-5 py-3.5">
                      <Link href={`/orders/${o.id}`} className="font-medium hover:text-accent">
                        {o.teamName}
                      </Link>
                    </td>
                    <td className="px-5 py-3.5">
                      <Badge tone={o.type === "design" ? "info" : o.type === "produce" ? "purple" : "accent"}>
                        {CUSTOMER_TYPE_LABEL[o.type]}
                      </Badge>
                    </td>
                    <td className="px-5 py-3.5 text-muted">{formatDate(o.startDate)}</td>
                    <td className="px-5 py-3.5 text-right font-semibold">{formatBaht(orderTotal(o))}</td>
                    <td className="px-5 py-3.5 text-right text-muted">{formatBaht(o.deposit)}</td>
                    <td className="px-5 py-3.5 text-right">
                      {orderBalance(o) > 0 ? (
                        <span className="font-medium text-warn">{formatBaht(orderBalance(o))}</span>
                      ) : (
                        <span className="text-success">ชำระครบ</span>
                      )}
                    </td>
                  </tr>
                ))}
                {orders.length === 0 && (
                  <tr>
                    <td colSpan={7} className="px-5 py-12 text-center text-muted">
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
    </div>
  );
}
