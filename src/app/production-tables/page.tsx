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
        title="ตารางสั่งผลิต"
        subtitle="รวมตารางผลิตทุกทีมที่สร้างแล้ว"
      />

      <div className="p-8">
        {loading ? (
          <div className="flex items-center justify-center py-32 text-muted">
            <Loader2 className="mr-2 h-5 w-5 animate-spin" /> กำลังโหลด…
          </div>
        ) : orders.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-32 text-muted gap-3">
            <FileSpreadsheet className="h-10 w-10 opacity-30" />
            <p>ยังไม่มีตารางสั่งผลิต</p>
          </div>
        ) : (
          <Card className="overflow-hidden">
            <div className="divide-y divide-border">
              {orders.map((o) => (
                <Link
                  key={o.id}
                  href={`/production-tables/${o.id}`}
                  className="flex items-center justify-between px-5 py-4 hover:bg-surface-2 transition-colors"
                >
                  <div className="flex items-center gap-4">
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-[var(--radius-md)] bg-accent-soft text-accent">
                      <FileSpreadsheet className="h-5 w-5" />
                    </div>
                    <div>
                      <div className="font-semibold">{o.teamName}</div>
                      <div className="flex items-center gap-2 mt-0.5">
                        <span className="font-mono text-xs text-muted-2">{o.id}</span>
                        <Badge
                          tone={
                            o.type === "design"
                              ? "info"
                              : o.type === "produce"
                              ? "purple"
                              : "accent"
                          }
                        >
                          {CUSTOMER_TYPE_LABEL[o.type]}
                        </Badge>
                      </div>
                      <div className="flex items-center gap-3 mt-1.5 text-xs text-muted">
                        {o.shirtType && o.shirtType !== EMPTY && <span>{o.shirtType}</span>}
                        {o.tableFabric && o.tableFabric !== EMPTY && (
                          <>
                            {o.shirtType && o.shirtType !== EMPTY && <span className="text-border">·</span>}
                            <span>{o.tableFabric}</span>
                          </>
                        )}
                        {o.tableCollar && o.tableCollar !== EMPTY && (
                          <>
                            <span className="text-border">·</span>
                            <span>{o.tableCollar}</span>
                          </>
                        )}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-4 text-sm text-muted">
                    {(() => {
                      const col = productionColumns.find((c) => c.id === o.productionStatus);
                      return col ? (
                        <span className="flex items-center gap-1.5 rounded-full border border-border px-2.5 py-0.5 text-xs font-medium text-foreground">
                          <span className="h-1.5 w-1.5 rounded-full" style={{ background: col.accent }} />
                          {col.title}
                        </span>
                      ) : null;
                    })()}
                    <span>{formatDate(o.startDate)}</span>
                    <span>{o.tableCount !== null ? `${o.tableCount} ตัว` : "—"}</span>
                    <ChevronRight className="h-4 w-4" />
                  </div>
                </Link>
              ))}
            </div>
          </Card>
        )}
      </div>
    </div>
  );
}
