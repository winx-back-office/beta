"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Search, CheckCircle2, Circle, Loader2, Table2 } from "lucide-react";
import { Button, Card, Badge } from "@/components/ui";
import { designColumns, designCards } from "@/lib/mock-data";
import { useProductionColumns } from "@/lib/use-production-columns";
import { CUSTOMER_TYPE_LABEL, type Order, type QueueColumn } from "@/lib/types";
import { formatDate } from "@/lib/utils";

type SearchState =
  | { status: "idle" }
  | { status: "searching" }
  | { status: "notfound" }
  | { status: "found"; order: Order };

export function Tracker() {
  const [code, setCode] = useState("");
  const [state, setState] = useState<SearchState>({ status: "idle" });

  const search = async () => {
    const q = code.trim().toUpperCase();
    if (!q) return;
    setState({ status: "searching" });

    try {
      // โหลดออเดอร์ทั้งหมดจาก API แล้วค้นหาฝั่ง client
      const res = await fetch("/api/orders", { cache: "no-store" });
      const orders: Order[] = await res.json();
      const found = orders.find(
        (o) => o.id.toUpperCase() === q || o.teamName.toUpperCase() === q
      );
      setState(found ? { status: "found", order: found } : { status: "notfound" });
    } catch {
      setState({ status: "notfound" });
    }
  };

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <Card className="p-6">
        <label className="mb-2 block text-sm font-medium">
          กรอกรหัสออเดอร์ หรือ ชื่อทีม
        </label>
        <div className="flex gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-2" />
            <input
              value={code}
              onChange={(e) => setCode(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && search()}
              placeholder="เช่น WNX-2501 หรือ ชื่อทีม"
              className="w-full rounded-[var(--radius-md)] border border-border bg-surface-2 py-2.5 pl-10 pr-3 outline-none placeholder:text-muted-2 focus:border-accent"
            />
          </div>
          <Button onClick={search} disabled={state.status === "searching"}>
            {state.status === "searching"
              ? <Loader2 className="h-4 w-4 animate-spin" />
              : "ค้นหา"}
          </Button>
        </div>
      </Card>

      {state.status === "notfound" && (
        <Card className="p-6 text-center text-muted">
          ไม่พบออเดอร์ที่ตรงกับ &ldquo;{code}&rdquo; — กรุณาตรวจสอบรหัสหรือชื่อทีมอีกครั้ง
        </Card>
      )}

      {state.status === "found" && <TrackResult order={state.order} />}
    </div>
  );
}

function TrackResult({ order }: { order: Order }) {
  const productionColumns = useProductionColumns();
  const designCard = designCards.find((c) => c.orderId === order.id);
  const [hasProductionTable, setHasProductionTable] = useState(false);

  useEffect(() => {
    if (order.type === "design") return;
    fetch(`/api/production/${order.id}`, { cache: "no-store" })
      .then((r) => r.json())
      .then((data) => {
        setHasProductionTable(Array.isArray(data.players) && data.players.length > 0);
      })
      .catch(() => {});
  }, [order.id, order.type]);

  return (
    <Card className="overflow-hidden">
      <div className="border-b border-border bg-surface-2 px-6 py-5">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-xl font-bold">{order.teamName}</h2>
            <p className="mt-0.5 font-mono text-xs text-muted-2">{order.id}</p>
          </div>
          <Badge tone={order.type === "design" ? "info" : order.type === "produce" ? "purple" : "accent"}>
            {CUSTOMER_TYPE_LABEL[order.type]}
          </Badge>
        </div>
      </div>

      <div className="space-y-8 p-6">
        {order.type !== "produce" && (
          <Stepper
            title="ขั้นตอนออกแบบ"
            columns={designColumns}
            currentColumnId={designCard?.columnId}
          />
        )}
        {order.type !== "design" && hasProductionTable && (
          <Stepper
            title="ขั้นตอนผลิต"
            columns={productionColumns}
            currentColumnId={order.productionStatus}
          />
        )}

        {designCard && (
          <div className="rounded-[var(--radius-md)] bg-surface-2 px-4 py-3 text-sm text-muted">
            กำหนดส่ง:{" "}
            <strong className="text-foreground">{formatDate(designCard.dueDate)}</strong>
          </div>
        )}

        {order.type !== "design" && (
          hasProductionTable ? (
            <Link href={`/track/${order.id}`} className="block">
              <Button className="w-full">
                <Table2 className="h-4 w-4" />
                เปิด/แก้ไขตารางผลิตของทีม
              </Button>
            </Link>
          ) : (
            <Link href={`/track/${order.id}`} className="block">
              <Button className="w-full" variant="outline">
                <Table2 className="h-4 w-4" />
                สร้างตารางสั่งผลิต
              </Button>
            </Link>
          )
        )}
      </div>
    </Card>
  );
}

function Stepper({ title, columns, currentColumnId }: {
  title: string;
  columns: QueueColumn[];
  currentColumnId?: string;
}) {
  const currentIdx = columns.findIndex((c) => c.id === currentColumnId);

  return (
    <div>
      <h3 className="mb-4 text-sm font-semibold uppercase tracking-wide text-muted-2">{title}</h3>
      <ol className="space-y-1">
        {columns.map((col, i) => {
          const done = currentIdx > i;
          const active = currentIdx === i;
          return (
            <li key={col.id} className="flex items-center gap-3">
              <div className="flex flex-col items-center">
                {done ? (
                  <CheckCircle2 className="h-5 w-5 text-success" />
                ) : active ? (
                  <Loader2 className="h-5 w-5 animate-spin text-accent" />
                ) : (
                  <Circle className="h-5 w-5 text-muted-2" />
                )}
                {i < columns.length - 1 && (
                  <span className={`my-0.5 h-5 w-0.5 ${done ? "bg-success" : "bg-border"}`} />
                )}
              </div>
              <span className={`pb-3 text-sm ${active ? "font-semibold text-accent" : done ? "text-foreground" : "text-muted-2"}`}>
                {col.title}
              </span>
            </li>
          );
        })}
      </ol>
    </div>
  );
}
