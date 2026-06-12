"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { RefreshCw, ClipboardList, Palette, Factory, Scissors, TableProperties, ChevronLeft, ChevronRight, CalendarDays } from "lucide-react";
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

  // งานใกล้วันส่ง 14 วัน
  const today = new Date(); today.setHours(0, 0, 0, 0);
  const in14 = new Date(today); in14.setDate(today.getDate() + 14);
  const upcomingDeliveries = orders
    .filter((o) => {
      if (!o.deliveryDate) return false;
      const d = new Date(o.deliveryDate); d.setHours(0, 0, 0, 0);
      return d >= today && d <= in14;
    })
    .sort((a, b) => (a.deliveryDate ?? "").localeCompare(b.deliveryDate ?? ""));

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

        {/* Upcoming deliveries */}
        {upcomingDeliveries.length > 0 && (
          <div className="rounded-xl border border-orange-500/30 bg-orange-500/5 p-5 shadow-sm">
            <div className="flex items-center gap-2 mb-3">
              <CalendarDays className="h-4 w-4 text-orange-400" />
              <h2 className="font-semibold text-sm text-orange-400">ใกล้วันส่ง — 14 วันข้างหน้า</h2>
              <span className="ml-auto rounded-full bg-orange-500/20 px-2 py-0.5 text-[11px] font-semibold text-orange-400">{upcomingDeliveries.length} งาน</span>
            </div>
            <div className="grid grid-cols-1 gap-2 min-[720px]:grid-cols-2">
              {upcomingDeliveries.map((o) => {
                const d = new Date(o.deliveryDate!); d.setHours(0, 0, 0, 0);
                const daysLeft = Math.round((d.getTime() - today.getTime()) / 86400000);
                const urgent = daysLeft <= 3;
                const warn = daysLeft <= 7;
                return (
                  <Link key={o.id} href={`/orders/${o.id}`}
                    className="flex items-center gap-3 rounded-lg border border-border bg-surface px-4 py-3 hover:bg-surface-2 transition-colors">
                    <div className={cn("shrink-0 rounded-lg px-2.5 py-1.5 text-center min-w-[48px]",
                      urgent ? "bg-red-500/15 text-red-400" : warn ? "bg-yellow-500/15 text-yellow-400" : "bg-green-500/15 text-green-400"
                    )}>
                      <div className="text-xl font-bold leading-none">{daysLeft}</div>
                      <div className="text-[10px] mt-0.5">วัน</div>
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="font-medium truncate">{o.teamName}</div>
                      <div className="text-xs text-muted-2 mt-0.5 flex items-center gap-1.5">
                        <span className="font-mono">{o.id}</span>
                        {o.shirtType && <><span>·</span><span>{o.shirtType}</span></>}
                        {o.quantity && <><span>·</span><span>{o.quantity} ตัว</span></>}
                      </div>
                    </div>
                    <div className="shrink-0 text-right">
                      <div className={cn("text-xs font-semibold", urgent ? "text-red-400" : warn ? "text-yellow-400" : "text-green-400")}>
                        {formatDate(o.deliveryDate!)}
                      </div>
                      <div className="text-[10px] text-muted-2 mt-0.5">{TYPE_LABEL[o.type]}</div>
                    </div>
                  </Link>
                );
              })}
            </div>
          </div>
        )}

        {/* Top stats */}
        <div className="grid grid-cols-2 gap-3 min-[720px]:grid-cols-4">
          <StatCard label="ออเดอร์ทั้งหมด" value={orders.length} href="/orders" tone="text-foreground" sub="รายการ" />
          <StatCard label="กำลังดำเนินการ" value={activeOrders.length} tone="text-accent" sub="รายการ" />
          <StatCard label="งานออกแบบ" value={designOrders.length} tone="text-blue-500" href="/queue/design" sub="รายการ" />
          <StatCard label="งานผลิต" value={produceOrders.length} tone="text-purple-500" href="/queue/production" sub="รายการ" />
        </div>

        {/* Design + Production queue */}
        {(designOrders.length > 0 || produceOrders.length > 0) && (
          <div className="grid grid-cols-1 gap-3 min-[720px]:grid-cols-2">
            {designOrders.length > 0 && (
              <div className="rounded-xl border border-border bg-surface p-5 shadow-sm">
                <SectionHeader icon={Palette} title="คิวออกแบบ" href="/queue/design" />
                <ProgressBar cols={DESIGN_COLS} counts={designCounts} />
              </div>
            )}
            {produceOrders.length > 0 && (
              <div className="rounded-xl border border-border bg-surface p-5 shadow-sm">
                <SectionHeader icon={Factory} title="คิวผลิต" href="/queue/production" />
                <ProgressBar cols={PROD_COLS} counts={prodCounts} />
              </div>
            )}
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

        {/* Delivery Calendar */}
        <DeliveryCalendar orders={orders} />

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
                  {o.deliveryDate && (
                    <span className="shrink-0 text-xs text-muted-2 hidden min-[720px]:flex items-center gap-1">
                      <span className="text-muted-2">→</span>
                      <span className="text-foreground font-medium">{formatDate(o.deliveryDate)}</span>
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

// ── Delivery Calendar ─────────────────────────────────────────
const TH_MONTHS = ["มกราคม","กุมภาพันธ์","มีนาคม","เมษายน","พฤษภาคม","มิถุนายน","กรกฎาคม","สิงหาคม","กันยายน","ตุลาคม","พฤศจิกายน","ธันวาคม"];
const DOW = ["อา","จ","อ","พ","พฤ","ศ","ส"];

function DeliveryCalendar({ orders }: { orders: Order[] }) {
  const today = new Date();
  const [cur, setCur] = useState(new Date(today.getFullYear(), today.getMonth(), 1));
  const [selectedKey, setSelectedKey] = useState<string | null>(null);

  // group orders by deliveryDate key (YYYY-MM-DD)
  const byDate = useMemo(() => {
    const map: Record<string, Order[]> = {};
    orders.forEach((o) => {
      if (!o.deliveryDate) return;
      const k = o.deliveryDate.slice(0, 10);
      if (!map[k]) map[k] = [];
      map[k].push(o);
    });
    return map;
  }, [orders]);

  const noDateCount = useMemo(() => orders.filter((o) => !o.deliveryDate).length, [orders]);

  const year = cur.getFullYear();
  const month = cur.getMonth();
  const firstDow = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();

  const selectedOrders = selectedKey ? (byDate[selectedKey] ?? []) : [];

  const changeMonth = (d: number) => {
    setCur(new Date(cur.getFullYear(), cur.getMonth() + d, 1));
    setSelectedKey(null);
  };

  const selectDay = (key: string) => {
    setSelectedKey((prev) => (prev === key ? null : key));
  };

  return (
    <div className="rounded-xl border border-border bg-surface shadow-sm overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-border px-5 py-3.5">
        <div className="flex items-center gap-3">
          <CalendarDays className="h-4 w-4 text-accent" />
          <h2 className="font-semibold text-sm">ปฏิทินวันจัดส่งสินค้า</h2>
          <div className="flex items-center gap-3 ml-1">
            <div className="flex items-center gap-1.5">
              <span className="h-2 w-2 rounded-full bg-blue-500 shrink-0" />
              <span className="text-[11px] text-muted-2">ออกแบบ</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="h-2 w-2 rounded-full bg-purple-500 shrink-0" />
              <span className="text-[11px] text-muted-2">ผลิต</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="h-2 w-2 rounded-full bg-amber-400 shrink-0" />
              <span className="text-[11px] text-muted-2">หลายงาน</span>
            </div>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {noDateCount > 0 && (
            <span className="text-[11px] text-muted-2 hidden min-[720px]:inline">
              {noDateCount} งานยังไม่กรอกวันจัดส่ง
            </span>
          )}
          <div className="flex items-center gap-1">
            <button onClick={() => changeMonth(-1)} className="rounded-lg p-1 text-muted hover:bg-surface-2 transition-colors" aria-label="เดือนก่อน">
              <ChevronLeft className="h-4 w-4" />
            </button>
            <span className="text-sm font-medium min-w-[120px] text-center">
              {TH_MONTHS[month]} {year + 543}
            </span>
            <button onClick={() => changeMonth(1)} className="rounded-lg p-1 text-muted hover:bg-surface-2 transition-colors" aria-label="เดือนถัดไป">
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>
        </div>
      </div>

      <div className="p-4 min-[720px]:p-5">
        {/* DOW header */}
        <div className="grid grid-cols-7 gap-1.5 mb-1.5">
          {DOW.map((d) => (
            <div key={d} className="text-center text-xs font-medium text-muted-2 py-1">{d}</div>
          ))}
        </div>

        {/* Day grid */}
        <div className="grid grid-cols-7 gap-1.5">
          {Array.from({ length: firstDow }).map((_, i) => (
            <div key={`e${i}`} />
          ))}
          {Array.from({ length: daysInMonth }, (_, i) => i + 1).map((d) => {
            const key = `${year}-${String(month + 1).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
            const dayOrders = byDate[key] ?? [];
            const isToday = today.getFullYear() === year && today.getMonth() === month && today.getDate() === d;
            const isSel = selectedKey === key;
            const count = dayOrders.length;
            const hasMultiple = count > 1;
            const hasDesign = dayOrders.some(o => o.type === "design" || o.type === "design_produce");
            const hasProduce = dayOrders.some(o => o.type === "produce" || o.type === "design_produce");

            return (
              <button
                key={key}
                onClick={() => selectDay(key)}
                className={cn(
                  "min-h-[60px] rounded-xl border text-left px-2 pt-2 pb-1.5 transition-all",
                  isSel
                    ? "border-accent bg-accent-soft shadow-sm"
                    : isToday
                    ? "border-accent bg-accent-soft shadow-sm"
                    : count > 0
                    ? "border-border bg-surface-2 hover:bg-surface hover:shadow-sm cursor-pointer"
                    : "border-border bg-surface hover:bg-surface-2 cursor-default"
                )}
              >
                {/* Day number */}
                {isToday ? (
                  <span className="text-base font-bold block leading-none mb-1.5 text-accent">
                    {d}
                  </span>
                ) : (
                  <span className={cn(
                    "text-sm font-semibold block leading-none mb-1.5",
                    isSel ? "text-accent" : count > 0 ? "text-foreground" : "text-muted"
                  )}>{d}</span>
                )}

                {/* Team names */}
                {count > 0 && (
                  <div className="flex flex-col gap-0.5 mt-0.5">
                    {dayOrders.slice(0, 2).map((o) => (
                      <span key={o.id} className={cn(
                        "block truncate text-[10px] font-medium leading-tight rounded px-1 py-0.5",
                        o.type === "design" || o.type === "design_produce"
                          ? "bg-blue-500/10 text-blue-500"
                          : "bg-purple-500/10 text-purple-500"
                      )}>{o.teamName}</span>
                    ))}
                    {count > 2 && (
                      <span className="text-[10px] text-muted-2 leading-none px-1">+{count - 2} งาน</span>
                    )}
                  </div>
                )}
              </button>
            );
          })}
        </div>

        {/* Selected day panel */}
        {selectedKey && (
          <div className="mt-4 rounded-xl border border-border overflow-hidden">
            <div className="px-4 py-3 bg-surface-2 border-b border-border flex items-center gap-2">
              <CalendarDays className="h-3.5 w-3.5 text-accent shrink-0" />
              <span className="text-sm font-medium">
                {parseInt(selectedKey.slice(8, 10))} {TH_MONTHS[parseInt(selectedKey.slice(5, 7)) - 1]} {parseInt(selectedKey.slice(0, 4)) + 543}
              </span>
              {selectedOrders.length > 0 && (
                <span className="ml-auto text-xs text-muted-2">{selectedOrders.length} งาน</span>
              )}
            </div>
            {selectedOrders.length === 0 ? (
              <div className="py-8 text-center text-sm text-muted-2">ไม่มีงานจัดส่งในวันนี้</div>
            ) : (
              <div className="divide-y divide-border">
                {selectedOrders.map((o) => (
                  <Link key={o.id} href={`/orders/${o.id}`} className="flex items-center gap-3 px-4 py-3 hover:bg-surface-2 transition-colors">
                    <span className="font-mono text-[11px] text-muted-2 shrink-0 w-28">{o.id}</span>
                    <span className="font-medium text-sm flex-1 truncate">{o.teamName}</span>
                    <span className={cn(
                      "shrink-0 rounded-full px-2.5 py-0.5 text-[11px] font-medium",
                      o.type === "design"
                        ? "bg-blue-500/10 text-blue-500"
                        : "bg-purple-500/10 text-purple-500"
                    )}>
                      {o.type === "design" ? "ออกแบบ" : "ผลิต"}
                    </span>
                  </Link>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
