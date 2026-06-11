"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { PackageCheck, RefreshCw, ChevronRight } from "lucide-react";
import { cn, formatDate } from "@/lib/utils";
import type { Order } from "@/lib/types";
import prodCols from "@/data/production-columns.json";

const DELIVERY_STATUS_ID = (prodCols as { id: string; title: string }[])
  .find(c => c.title === "เตรียมจัดส่ง")?.id ?? "col_1780341606538";

export default function DeliveryNotesPage() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);

  const load = async () => {
    setLoading(true);
    const res = await fetch("/api/orders", { cache: "no-store" });
    const data: Order[] = await res.json();
    setOrders((data ?? []).filter((o) => o.productionStatus === DELIVERY_STATUS_ID));
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  return (
    <div className="min-h-screen">
      <div className="border-b border-border bg-surface px-4 py-4 min-[720px]:px-8">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-xl font-bold">ใบส่งสินค้า</h1>
            <p className="text-xs text-muted-2 mt-0.5">ออเดอร์ที่พร้อมจัดส่ง</p>
          </div>
          <button
            onClick={load}
            disabled={loading}
            className="flex items-center gap-1.5 rounded-lg border border-border px-3 py-1.5 text-xs hover:bg-surface-2 disabled:opacity-50"
          >
            <RefreshCw className={cn("h-3.5 w-3.5", loading && "animate-spin")} />
            รีเฟรช
          </button>
        </div>
      </div>

      <div className="px-4 py-6 min-[720px]:px-8">
        {loading ? (
          <div className="py-20 text-center text-sm text-muted-2">กำลังโหลด…</div>
        ) : orders.length === 0 ? (
          <div className="py-20 text-center">
            <PackageCheck className="h-10 w-10 text-muted-2 mx-auto mb-3" />
            <p className="text-sm text-muted-2">ไม่มีออเดอร์ที่พร้อมจัดส่ง</p>
          </div>
        ) : (
          <div className="rounded-xl border border-border bg-surface shadow-sm overflow-hidden w-fit min-w-[480px] max-w-full">
            {/* Desktop header */}
            <div className="hidden min-[720px]:grid grid-cols-[160px_280px_130px_90px_32px] gap-4 px-5 py-2.5 border-b border-border bg-surface-2">
              <span className="text-[11px] font-medium text-muted-2 uppercase tracking-wider">รหัส</span>
              <span className="text-[11px] font-medium text-muted-2 uppercase tracking-wider">ชื่อทีม</span>
              <span className="text-[11px] font-medium text-muted-2 uppercase tracking-wider">วันจัดส่ง</span>
              <span className="text-[11px] font-medium text-muted-2 uppercase tracking-wider">จำนวน</span>
              <span />
            </div>
            <div className="divide-y divide-border">
              {orders.map((o) => (
                <Link
                  key={o.id}
                  href={`/delivery-notes/${o.id}`}
                  className="grid grid-cols-[1fr_auto] min-[720px]:grid-cols-[160px_280px_130px_90px_32px] gap-4 items-center px-5 py-3.5 hover:bg-surface-2 transition-colors"
                >
                  <span className="font-mono text-xs text-muted-2">{o.id}</span>
                  <span className="font-medium truncate">{o.teamName}</span>
                  <span className="text-xs text-muted-2 hidden min-[720px]:block">
                    {o.deliveryDate ? formatDate(o.deliveryDate) : <span className="italic text-muted-2">—</span>}
                  </span>
                  <span className="text-xs text-muted-2 hidden min-[720px]:block">
                    {o.quantity != null ? `${o.quantity} ตัว` : "—"}
                  </span>
                  <ChevronRight className="h-4 w-4 text-muted-2 hidden min-[720px]:block" />
                </Link>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
