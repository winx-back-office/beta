"use client";

import { useEffect, useState } from "react";
import { notifyOrdersUpdated } from "@/lib/broadcast";
import { PageHeader, Card, Badge } from "@/components/ui";
import { CUSTOMER_TYPE_LABEL, type Order } from "@/lib/types";
import { useProductionColumns } from "@/lib/use-production-columns";
import { formatDate } from "@/lib/utils";
import { Loader2, FileSpreadsheet, ChevronRight } from "lucide-react";
import Link from "next/link";

const EMPTY = "ยังไม่มีข้อมูล";

interface OrderWithCount extends Order {
  tableCount: number | null;
  tableFabric: string | null;
  tableCollar: string | null;
}

export default function ProductionTablesPage() {
  const productionColumns = useProductionColumns();
  const [orders, setOrders] = useState<OrderWithCount[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/orders")
      .then((r) => r.json())
      .then(async (data: Order[]) => {
        // ล้าง badge แจ้งเตือนของทุก order ที่ยังมี productionTableNew
        const newOnes = data.filter((o) => o.productionTableNew);
        if (newOnes.length > 0) {
          await Promise.all(newOnes.map((o) =>
            fetch(`/api/orders/${o.id}`, {
              method: "PUT",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ productionTableNew: false }),
            })
          ));
          notifyOrdersUpdated();
        }

        const withTable = data.filter((o) => o.hasProductionTable);
        const prodData = await Promise.all(
          withTable.map((o) =>
            fetch(`/api/production/${o.id}`, { cache: "no-store" })
              .then((r) => r.json())
              .catch(() => null)
          )
        );
        setOrders(
          withTable.map((o, i) => ({
            ...o,
            tableCount: prodData[i]
              ? (prodData[i].players as { size: string }[] ?? []).filter((p) => p.size).length
              : null,
            tableFabric: prodData[i]?.meta?.fabric ?? null,
            tableCollar: prodData[i]?.meta?.collar ?? null,
          }))
        );
        setLoading(false);
      });
  }, []);

  return (
    <div>
      <PageHeader
        title="ตารางผลิต"
        subtitle="รวมตารางผลิตทุกทีมที่สร้างแล้ว"
      />

      <div className="px-4 py-4 min-[720px]:px-8 min-[720px]:py-8">
        {loading ? (
          <div className="flex items-center justify-center py-32 text-muted">
            <Loader2 className="mr-2 h-5 w-5 animate-spin" /> กำลังโหลด…
          </div>
        ) : orders.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-32 text-muted gap-3">
            <FileSpreadsheet className="h-10 w-10 opacity-30" />
            <p>ยังไม่มีตารางผลิต</p>
          </div>
        ) : (
          <Card className="overflow-hidden">
            <div className="divide-y divide-border">
              {orders.map((o) => {
                const col = productionColumns.find((c) => c.id === o.productionStatus);
                return (
                  <Link
                    key={o.id}
                    href={`/production-tables/${o.id}`}
                    className="flex items-center gap-3 px-4 py-3.5 hover:bg-surface-2 transition-colors min-[720px]:px-5 min-[720px]:py-4"
                  >
                    {/* icon */}
                    <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-[var(--radius-md)] bg-accent-soft text-accent min-[720px]:h-10 min-[720px]:w-10">
                      <FileSpreadsheet className="h-4 w-4 min-[720px]:h-5 min-[720px]:w-5" />
                    </div>

                    {/* main info */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-semibold text-sm leading-snug truncate">{o.teamName}</span>
                        <Badge
                          tone={o.type === "design" ? "info" : o.type === "produce" ? "purple" : "accent"}
                        >
                          {CUSTOMER_TYPE_LABEL[o.type]}
                        </Badge>
                      </div>
                      <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                        <span className="font-mono text-[11px] text-muted-2">{o.id}</span>
                        {o.shirtType && o.shirtType !== EMPTY && (
                          <span className="text-[11px] text-muted-2">{o.shirtType}</span>
                        )}
                        {o.tableFabric && o.tableFabric !== EMPTY && (
                          <span className="text-[11px] text-muted-2">{o.tableFabric}</span>
                        )}
                        {o.tableCollar && o.tableCollar !== EMPTY && (
                          <span className="text-[11px] text-muted-2">{o.tableCollar}</span>
                        )}
                      </div>
                      {/* status + count row — shown on mobile below */}
                      <div className="flex items-center gap-2 mt-1.5 min-[720px]:hidden">
                        {col && (
                          <span className="flex items-center gap-1 rounded-full border border-border px-2 py-0.5 text-[10px] font-medium text-foreground">
                            <span className="h-1.5 w-1.5 rounded-full shrink-0" style={{ background: col.accent }} />
                            {col.title}
                          </span>
                        )}
                        {o.tableCount !== null && (
                          <span className="text-[11px] text-muted-2">{o.tableCount} ตัว</span>
                        )}
                        <span className="text-[11px] text-muted-2">{formatDate(o.startDate)}</span>
                      </div>
                    </div>

                    {/* right side — desktop only */}
                    <div className="hidden min-[720px]:flex items-center gap-4 text-sm text-muted shrink-0">
                      {col && (
                        <span className="flex items-center gap-1.5 rounded-full border border-border px-2.5 py-0.5 text-xs font-medium text-foreground">
                          <span className="h-1.5 w-1.5 rounded-full" style={{ background: col.accent }} />
                          {col.title}
                        </span>
                      )}
                      <span className="text-xs">{formatDate(o.startDate)}</span>
                      <span className="text-xs">{o.tableCount !== null ? `${o.tableCount} ตัว` : "—"}</span>
                    </div>

                    <ChevronRight className="h-4 w-4 text-muted-2 shrink-0" />
                  </Link>
                );
              })}
            </div>
          </Card>
        )}
      </div>
    </div>
  );
}
