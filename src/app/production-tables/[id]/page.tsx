"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { PageHeader, Button } from "@/components/ui";
import { ProductionTable } from "@/components/production-table";
import { ArrowLeft, Loader2 } from "lucide-react";
import { useParams, useRouter } from "next/navigation";
import type { Order } from "@/lib/types";
import { useShirtStyles, useFabricsData, calcProductionPrice } from "@/lib/use-catalog";

export default function ProductionTablePage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const [order, setOrder] = useState<Order | null>(null);
  const [loading, setLoading] = useState(true);
  const [isDirty, setIsDirty] = useState(false);
  const shirtStyles = useShirtStyles();
  const fabricsData = useFabricsData();
  const isDirtyRef = useRef(false);

  // keep ref in sync for beforeunload
  useEffect(() => { isDirtyRef.current = isDirty; }, [isDirty]);

  // warn on browser close/refresh
  useEffect(() => {
    const handler = (e: BeforeUnloadEvent) => {
      if (!isDirtyRef.current) return;
      e.preventDefault();
    };
    window.addEventListener("beforeunload", handler);
    return () => window.removeEventListener("beforeunload", handler);
  }, []);

  const navigate = useCallback((href: string) => {
    if (isDirtyRef.current) {
      if (!confirm("มีข้อมูลที่ยังไม่ได้บันทึก ต้องการออกจากหน้านี้โดยไม่บันทึกใช่ไหม?")) return;
    }
    router.push(href);
  }, [router]);

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
            <Button variant="outline" onClick={() => navigate(`/orders/${order.id}`)}>
              <ArrowLeft className="h-4 w-4" />
              ไปออเดอร์
            </Button>
            <Button variant="outline" onClick={() => navigate("/production-tables")}>
              <ArrowLeft className="h-4 w-4" />
              กลับรายการตาราง
            </Button>
          </div>
        }
      />
      <div className="p-8">
        <ProductionTable
          orderId={order.id}
          teamName={order.teamName}
          shirtType={order.shirtType ?? "เสื้อแขนสั้น"}
          fabricType={order.fabricType ?? "-"}
          collarType={order.collarType ?? ""}
          productionStatus={order.productionStatus}
          onDirtyChange={setIsDirty}
          onFirstSave={markTableCreated}
          onUpdateOrder={async (patch) => {
            const mergedShirt = patch.shirtType ?? order.shirtType ?? "";
            const mergedFabric = patch.fabricType ?? order.fabricType ?? "";
            const mergedCollar = patch.collarType ?? order.collarType ?? "";
            const qty = order.quantity ?? 1;
            const result = calcProductionPrice(shirtStyles, fabricsData, mergedShirt, mergedFabric, mergedCollar, qty);
            const fullPatch = result ? { ...patch, productionPrice: result.price } : patch;
            await fetch(`/api/orders/${order.id}`, {
              method: "PUT",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify(fullPatch),
            });
            setOrder((prev) => prev ? { ...prev, ...fullPatch } : prev);
          }}
        />
      </div>
    </div>
  );
}
