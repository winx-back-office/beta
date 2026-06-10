"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { RefreshCw, ClipboardList, Palette, Factory, Scissors, TableProperties } from "lucide-react";
import { cn, formatDate } from "@/lib/utils";
import type { Order } from "@/lib/types";

interface CuttingJob {
  id: string;
  orderId: string;
  teamName: string;
  status: "pending" | "cutting" | "done";
}

// ===== สถานะออกแบบ =====
const DESIGN_COLS = [
  { id: "wait_design", label: "รอออกแบบ",     color: "bg-blue-500" },
  { id: "designing",  label: "กำลังออกแบบ",   color: "bg-[var(--accent)]" },
  { id: "revise",     label: "รอแก้ไข",        color: "bg-yellow-500" },
  { id: "approve",    label: "รออนุมัติ",      color: "bg-purple-500" },
  { id: "done",       label: "เสร็จสิ้น",      color: "bg-green-500" },
];

// ===== สถานะผลิต =====
const PROD_COLS = [
  { id: "summary", label: "รอสรุปงาน", color: "bg-orange-400" },
  { id: "pattern_in", label: "เข้าแพทเทิร์น", color: "bg-cyan-500" },
  { id: "size", label: "วางไซส์", color: "bg-purple-500" },
  { id: "print", label: "พิมพ์", color: "bg-yellow-500" },
  { id: "pattern_cut", label: "ตัดแพทเทิร์น", color: "bg-pink-500" },
  { id: "sew", label: "รอส่ง-เย็บ", color: "bg-indigo-400" },
  { id: "done", label: "แพ็ค/จัดส่ง", color: "bg-green-500" },
];

function StatCard({ label, value, sub, tone = "text-foreground", href }: {
  label: string; value: number | string; sub?: string; tone?: string; href?: string;
}) {
  const inner = (
    <div className={cn("rounded-xl border border-border bg-surface p-5 shadow-sm", href && "hover:bg-surface-2 transition-colors cursor-pointer")}>
      <div className="text-xs text-muted-2 mb-1">{label}</div>
      <div className={cn("text-3xl font-bold tracking-tight", tone)}>{value}</div>
      {sub && <div className="mt-1 text-xs text-muted-2">{sub}</div>}
    </div>
  );
  return href ? <Link href={href}>{inner}</Link> : inner;
}

function SectionHeader({ icon: Icon, title, href }: { icon: React.ElementType; title: string; href?: string }) {
  return (
    <div className="flex items-center justify-between mb-3">
      <div className="flex items-center gap-2">
        <Icon className="h-4 w-4 text-accent" />
        <h2 className="font-semibold text-sm">{title}</h2>
      </div>
      {href && <Link href={href} className="text-xs text-accent hover:underline">ดูทั้งหมด →</Link>}
    </div>
  );
}

function ProgressBar({ cols, counts }: { cols: { id: string; label: string; color: string }[]; counts: Record<string, number> }) {
  const total = cols.reduce((s, c) => s + (counts[c.id] ?? 0), 0);
  if (total === 0) return <div className="text-sm text-muted-2 py-2">ไม่มีข้อมูล</div>;

  return (
    <div className="space-y-2">
      {/* Bar */}
      <div className="flex h-2.5 w-full overflow-hidden rounded-full bg-surface-2">
        {cols.map((c) => {
          const count = counts[c.id] ?? 0;
          const pct = (count / total) * 100;
          if (pct === 0) return null;
          return <div key={c.id} className={cn("h-full transition-all", c.color)} style={{ width: `${pct}%` }} title={`${c.label}: ${count}`} />;
        })}
      </div>
      {/* Legend */}
      <div className="flex flex-wrap gap-x-4 gap-y-1.5">
        {cols.map((c) => {
          const count = counts[c.id] ?? 0;
          return (
            <div key={c.id} className="flex items-center gap-1.5">
              <span className={cn("h-2 w-2 rounded-full shrink-0", c.color)} />
              <span className="text-xs text-muted-2">{c.label}</span>
              <span className={cn("text-xs font-semibold", count > 0 ? "text-foreground" : "text-muted-2")}>{count}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

export default function SummaryPage() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [cuts, setCuts] = useState<CuttingJob[]>([]);
  const [loading, setLoading] = useState(true);
  const [lastUpdate, setLastUpdate] = useState("");

  const load = async () => {
    setLoading(true);
    const [oRes, cRes] = await Promise.all([
      fetch("/api/orders", { cache: "no-store" }),
      fetch("/api/cutting-jobs", { cache: "no-store" }),
    ]);
    const [oData, cData] = await Promise.all([oRes.json(), cRes.json()]);
    setOrders(oData ?? []);
    setCuts(cData ?? []);
    setLastUpdate(new Date().toLocaleTimeString("th-TH", { hour: "2-digit", minute: "2-digit" }));
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  // ===== Orders =====
  const activeOrders = orders;
  const designOrders = orders.filter((o) => o.type === "design" || o.type === "design_produce");
  const produceOrders = orders.filter((o) => o.type === "produce" || o.type === "design_produce");

  // design status counts
  const designCounts: Record<string, number> = {};
  DESIGN_COLS.forEach((c) => { designCounts[c.id] = 0; });
  designOrders.forEach((o) => {
    const k = o.designStatus ?? "wait_design";
    designCounts[k] = (designCounts[k] ?? 0) + 1;
  });

  // production status counts
  const prodCounts: Record<string, number> = {};
  PROD_COLS.forEach((c) => { prodCounts[c.id] = 0; });
  produceOrders.forEach((o) => {
    const k = o.productionStatus ?? "summary";
    prodCounts[k] = (prodCounts[k] ?? 0) + 1;
  });

  // cutting jobs
  const cutPending = cuts.filter((c) => c.status === "pending").length;
  const cutCutting = cuts.filter((c) => c.status === "cutting").length;
  const cutDone = cuts.filter((c) => c.status === "done").length;
  const CUT_COLS = [
    { id: "pending", label: "รอรับงาน", color: "bg-orange-400" },
    { id: "cutting", label: "กำลังตัด", color: "bg-accent" },
    { id: "done", label: "เสร็จสิ้น", color: "bg-green-500" },
  ];
  const cutCounts = { pending: cutPending, cutting: cutCutting, done: cutDone };

  // production tables
  const hasProdTable = orders.filter((o) => o.hasProductionTable).length;

  // Recent active orders (no financial data)
  const recentActive = [...activeOrders]
    .sort((a, b) => (b.startDate ?? "").localeCompare(a.startDate ?? ""))
    .slice(0, 8);

  const TYPE_LABEL: Record<string, string> = {
    design: "ออกแบบ", produce: "ผลิต", design_produce: "ออกแบบ+ผลิต",
  };

  return (
    <div className="min-h-screen">
      {/* Header */}
      <div className="border-b border-border bg-surface px-4 py-4 min-[720px]:px-8">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-xl font-bold">สรุปภาพรวมงาน</h1>
            <p className="text-xs text-muted-2 mt-0.5">
              {formatDate(new Date().toISOString())}
              {lastUpdate && <> · อัพเดทล่าสุด {lastUpdate}</>}
            </p>
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

      <div className="space-y-6 px-4 py-6 min-[720px]:px-8">

        {/* Top stats */}
        <div className="grid grid-cols-2 gap-3 min-[720px]:grid-cols-4">
          <StatCard label="ออเดอร์ทั้งหมด" value={orders.length} href="/orders" tone="text-foreground" sub="รายการ" />
          <StatCard label="กำลังดำเนินการ" value={activeOrders.length} tone="text-accent" sub="รายการ" />
          <StatCard label="งานออกแบบ" value={designOrders.length} tone="text-blue-500" href="/queue/design" sub="รายการ" />
          <StatCard label="งานผลิต" value={produceOrders.length} tone="text-purple-500" href="/queue/production" sub="รายการ" />
        </div>

        {/* Design queue */}
        {designOrders.length > 0 && (
          <div className="rounded-xl border border-border bg-surface p-5 shadow-sm">
            <SectionHeader icon={Palette} title="คิวออกแบบ" href="/queue/design" />
            <ProgressBar cols={DESIGN_COLS} counts={designCounts} />
          </div>
        )}

        {/* Production queue */}
        {produceOrders.length > 0 && (
          <div className="rounded-xl border border-border bg-surface p-5 shadow-sm">
            <SectionHeader icon={Factory} title="คิวผลิต" href="/queue/production" />
            <ProgressBar cols={PROD_COLS} counts={prodCounts} />
          </div>
        )}

        {/* Cutting jobs + production tables */}
        <div className="grid grid-cols-1 gap-3 min-[720px]:grid-cols-2">
          <div className="rounded-xl border border-border bg-surface p-5 shadow-sm">
            <SectionHeader icon={Scissors} title="ใบงานตัด" href="/cutting-jobs" />
            {cuts.length === 0
              ? <div className="text-sm text-muted-2 py-2">ไม่มีข้อมูล</div>
              : <ProgressBar cols={CUT_COLS} counts={cutCounts} />
            }
          </div>
          <div className="rounded-xl border border-border bg-surface p-5 shadow-sm">
            <SectionHeader icon={TableProperties} title="ตารางสั่งผลิต" href="/production-tables" />
            <div className="flex items-end gap-3 mt-1">
              <div>
                <div className="text-3xl font-bold tracking-tight text-accent">{hasProdTable}</div>
                <div className="text-xs text-muted-2">มีตารางแล้ว</div>
              </div>
              <div className="mb-1 text-sm text-muted-2">จาก {produceOrders.length} งานผลิต</div>
            </div>
          </div>
        </div>

        {/* Active orders list */}
        <div className="rounded-xl border border-border bg-surface shadow-sm overflow-hidden">
          <div className="flex items-center justify-between border-b border-border px-5 py-3.5">
            <div className="flex items-center gap-2">
              <ClipboardList className="h-4 w-4 text-accent" />
              <h2 className="font-semibold text-sm">งานที่กำลังดำเนินการ</h2>
            </div>
            <Link href="/orders" className="text-xs text-accent hover:underline">ดูทั้งหมด →</Link>
          </div>
          {recentActive.length === 0 ? (
            <div className="py-10 text-center text-sm text-muted-2">ไม่มีงานที่กำลังดำเนินการ</div>
          ) : (
            <div className="divide-y divide-border">
              {recentActive.map((o) => (
                <Link key={o.id} href={`/orders/${o.id}`} className="flex items-center gap-3 px-5 py-3 hover:bg-surface-2 transition-colors">
                  <span className="font-mono text-xs text-muted-2 shrink-0 w-28">{o.id}</span>
                  <span className="font-medium flex-1 truncate">{o.teamName}</span>
                  <span className="shrink-0 rounded-full bg-surface-2 px-2 py-0.5 text-[11px] text-muted-2">
                    {TYPE_LABEL[o.type] ?? o.type}
                  </span>
                  {o.startDate && (
                    <span className="shrink-0 text-xs text-muted-2 hidden min-[720px]:block">
                      {formatDate(o.startDate)}
                    </span>
                  )}
                </Link>
              ))}
            </div>
          )}
        </div>

      </div>
    </div>
  );
}
