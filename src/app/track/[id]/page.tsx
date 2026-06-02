"use client";

import { useEffect, useState } from "react";
import { PageHeader, Button, Badge } from "@/components/ui";
import { ProductionTable } from "@/components/production-table";
import { CUSTOMER_TYPE_LABEL, type Order } from "@/lib/types";
import { ArrowLeft, Loader2 } from "lucide-react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { useProductionColumns } from "@/lib/use-production-columns";

// column ที่ lock และหลังจากนี้ลูกค้าแก้ไขไม่ได้
const LOCK_FROM_COLUMN = "size"; // วางไซส์

export default function CustomerProductionTablePage() {
  const { id } = useParams<{ id: string }>();
  const [order, setOrder] = useState<Order | null>(null);
  const [loading, setLoading] = useState(true);
  const productionColumns = useProductionColumns();

  useEffect(() => {
    fetch(`/api/orders/${id}`)
      .then((r) => r.json())
      .then((data) => { setOrder(data); setLoading(false); });
  }, [id]);

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
        title="ตารางผลิตของทีม"
        subtitle={`${order.id} · ${order.teamName}`}
        action={
          <Link href="/track">
            <Button variant="outline">
              <ArrowLeft className="h-4 w-4" />
              กลับ
            </Button>
          </Link>
        }
      />
      <div className="space-y-4 p-8">
        <div className="flex items-center gap-2 rounded-[var(--radius-md)] border border-info/30 bg-info/10 px-4 py-3 text-sm text-info">
          <Badge tone="info">{CUSTOMER_TYPE_LABEL[order.type]}</Badge>
          กรอกรายชื่อผู้เล่น เลือกไซส์ และอัปโหลดรูปแบบเสื้อของทีมได้เลย —
          เมื่อบันทึกแล้วทางทีมงานจะเห็นข้อมูลทันที
        </div>
        <ProductionTable
          orderId={order.id}
          teamName={order.teamName}
          shirtType={order.shirtType ?? "-"}
          fabricType={order.fabricType ?? "-"}
          collarType={order.collarType ?? ""}
          productionStatus={order.productionStatus}
          hideSync
          readOnly={(() => {
            const lockIdx = productionColumns.findIndex(c => c.id === LOCK_FROM_COLUMN);
            const curIdx  = productionColumns.findIndex(c => c.id === order.productionStatus);
            return lockIdx !== -1 && curIdx >= lockIdx;
          })()}
        />
      </div>
    </div>
  );
}
