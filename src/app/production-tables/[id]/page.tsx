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
    localStorage.setItem(`table-viewed-${id}`, new Date().toISOString());

    fetch(`/api/orders/${id}`)
      .then((r) => r.json())
      .then((data) => {
        setOrder(data);
        setLoading(false);
        // ล้าง badge แจ้งเตือนเมื่อเปิดดู
        if (data?.productionTableNew) {
          fetch(`/api/orders/${id}`, {
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ productionTableNew: false }),
          });
        }
      });
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
      {/* Header — custom layout for mobile */}
      <div className="border-b border-border px-4 py-3.5 min-[720px]:px-8 min-[720px]:py-5">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <h1 className="text-lg font-bold tracking-tight min-[720px]:text-2xl">ตารางผลิต</h1>
            <p className="mt-0.5 text-xs text-muted truncate max-w-[220px] min-[720px]:max-w-none min-[720px]:text-sm">
              {order.id} · {order.teamName}
            </p>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <Button variant="outline" onClick={() => navigate(`/orders/${order.id}`)}>
              <ArrowLeft className="h-4 w-4" />
              <span className="hidden min-[720px]:inline">ไปออเดอร์</span>
            </Button>
            <Button variant="outline" onClick={() => navigate("/production-tables")}>
              <ArrowLeft className="h-4 w-4" />
              <span className="hidden min-[720px]:inline">รายการตาราง</span>
            </Button>
          </div>
        </div>
      </div>
      <div className="px-4 py-4 min-[720px]:p-8">
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
