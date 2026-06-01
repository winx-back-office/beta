"use client";

import { useEffect, useState } from "react";
import { PageHeader, Button } from "@/components/ui";
import { ProductionTable } from "@/components/production-table";
import { ArrowLeft, Loader2 } from "lucide-react";
import Link from "next/link";
import { useParams } from "next/navigation";
import type { Order } from "@/lib/types";

export default function ProductionTablePage() {
  const { id } = useParams<{ id: string }>();
  const [order, setOrder] = useState<Order | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch(`/api/orders/${id}`)
      .then((r) => r.json())
      .then((data) => { setOrder(data); setLoading(false); });
  }, [id]);

  const markTableCreated = async () => {
    if (order?.hasProductionTable) return;
    const res = await fetch(`/api/orders/${id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ hasProductionTable: true }),
    });
    const data = await res.json();
    if (data.order) setOrder(data.order);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-32 text-muted">
        <Loader2 className="mr-2 h-5 w-5 animate-spin" /> กำลังโหลด…
      </div>
    );
  }

  if (!order || order.type === "design") {
    return <div className="p-8 text-muted">ไม่พบออเดอร์นี้</div>;
  }

  return (
    <div>
      <PageHeader
        title="ตารางสั่งผลิต"
        subtitle={`${order.id} · ${order.teamName}`}
        action={
          <div className="flex gap-2">
            <Link href={`/orders/${order.id}`}>
              <Button variant="outline">
                <ArrowLeft className="h-4 w-4" />
                ไปออเดอร์
              </Button>
            </Link>
            <Link href="/production-tables">
              <Button variant="outline">
                <ArrowLeft className="h-4 w-4" />
                กลับรายการตาราง
              </Button>
            </Link>
          </div>
        }
      />
      <div className="p-8">
        <ProductionTable
          orderId={order.id}
          teamName={order.teamName}
          shirtType={order.shirtType ?? "-"}
          fabricType={order.fabricType ?? "-"}
          onFirstSave={markTableCreated}
        />
      </div>
    </div>
  );
}
