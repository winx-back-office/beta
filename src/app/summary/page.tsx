"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useAuth } from "@/context/auth-context";
import { RefreshCw, ClipboardList, Palette, Factory, Scissors, Shirt, ChevronLeft, ChevronRight, CalendarDays, ChevronDown, ChevronUp, ChevronsUpDown, GripVertical, Maximize, Minimize } from "lucide-react";
import { cn, formatDate } from "@/lib/utils";
import type { Order } from "@/lib/types";

interface CuttingJob {
  id: string;
  orderId: string;
  teamName: string;
  status: "pending" | "cutting" | "cut_done" | "sewing" | "done";
  cutterName: string | null;
  sewerName: string | null;
  sewingStatus: "pending" | "sewing" | "done";
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
  { id: "summary",     label: "รอสรุปงาน",       color: "bg-orange-400",  chip: "bg-orange-400/15 text-orange-400 border-orange-400/30" },
  { id: "pattern_in", label: "เข้าแพทเทิร์น",    color: "bg-cyan-500",    chip: "bg-cyan-500/15 text-cyan-400 border-cyan-500/30" },
  { id: "size",        label: "วางไซส์",           color: "bg-purple-500",  chip: "bg-purple-500/15 text-purple-400 border-purple-500/30" },
  { id: "print",       label: "พิมพ์",             color: "bg-yellow-500",  chip: "bg-yellow-500/15 text-yellow-400 border-yellow-500/30" },
  { id: "pattern_cut", label: "ตัดแพทเทิร์น",    color: "bg-pink-500",    chip: "bg-pink-500/15 text-pink-400 border-pink-500/30" },
  { id: "sew",         label: "รอส่ง-เย็บ",       color: "bg-indigo-400",  chip: "bg-indigo-400/15 text-indigo-400 border-indigo-400/30" },
  { id: "sewing",      label: "กำลังเย็บ",         color: "bg-purple-500",  chip: "bg-purple-500/15 text-purple-400 border-purple-500/30" },
  { id: "done",        label: "แพ็ค/จัดส่ง",      color: "bg-green-500",   chip: "bg-green-500/15 text-green-400 border-green-500/30" },
  { id: "delivered",   label: "จัดส่งเรียบร้อย",  color: "bg-emerald-600", chip: "bg-emerald-600/15 text-emerald-400 border-emerald-600/30" },
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

function ProgressBar({
  cols, counts, items, isAdmin, storageKey,
}: {
  cols: { id: string; label: string; color: string; accent?: string }[];
  counts: Record<string, number>;
  items?: Record<string, { id: string; teamName: string; quantity?: number }[]>;
  isAdmin?: boolean;
  storageKey?: string;
}) {
  const [openStatuses, setOpenStatuses] = useState<Set<string>>(() => {
    if (!storageKey) return new Set();
    try { return new Set(JSON.parse(localStorage.getItem(storageKey) ?? "[]")); } catch { return new Set(); }
  });
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
          return <div key={c.id} className={cn("h-full transition-all", !c.accent && c.color)} style={{ width: `${pct}%`, ...(c.accent ? { backgroundColor: c.accent } : {}) }} title={`${c.label}: ${count}`} />;
        })}
      </div>
      {/* Legend */}
      <div className="flex flex-wrap gap-x-3 gap-y-1.5">
        {cols.map((c) => {
          const count = counts[c.id] ?? 0;
          const hasItems = items && (items[c.id]?.length ?? 0) > 0;
          const isOpen = openStatuses.has(c.id);
          return (
            <button
              key={c.id}
              onClick={() => {
                if (!hasItems) return;
                setOpenStatuses(prev => {
                  const s = new Set(prev);
                  s.has(c.id) ? s.delete(c.id) : s.add(c.id);
                  if (storageKey) localStorage.setItem(storageKey, JSON.stringify([...s]));
                  return s;
                });
              }}
              className={cn(
                "flex items-center gap-1.5 rounded-md px-1.5 py-0.5 -mx-1.5 transition-all",
                hasItems ? "cursor-pointer" : "cursor-default",
                isOpen
                  ? "ring-1 ring-inset ring-white/15 bg-white/8"
                  : hasItems ? "hover:bg-surface-2" : ""
              )}
            >
              <span className={cn("h-2 w-2 rounded-full shrink-0", !c.accent && c.color)} style={c.accent ? { backgroundColor: c.accent } : {}} />
              <span className={cn("text-xs transition-colors", isOpen ? "text-foreground font-medium" : "text-muted-2")}>{c.label}</span>
              <span className={cn("text-xs font-semibold", count > 0 ? "text-foreground" : "text-muted-2")}>{count}</span>
            </button>
          );
        })}
      </div>
      {/* Expanded order lists */}
      {cols.filter(c => openStatuses.has(c.id) && (items?.[c.id]?.length ?? 0) > 0).map(c => (
        <div key={c.id} className="mt-1 rounded-lg border border-border bg-surface-2 divide-y divide-border overflow-hidden">
          {items![c.id].map((o) => {
            const row = <>
              <span className="font-mono text-[11px] text-muted-2 shrink-0 w-24">{o.id}</span>
              <span className="text-xs font-medium flex-1 truncate">{o.teamName}</span>
              {o.quantity != null && <span className="text-[11px] text-muted-2 shrink-0">{o.quantity} ตัว</span>}
            </>;
            return isAdmin
              ? <Link key={o.id} href={`/orders/${o.id}`} className="flex items-center gap-2 px-3 py-2 hover:bg-surface-3 transition-colors">{row}</Link>
              : <div key={o.id} className="flex items-center gap-2 px-3 py-2">{row}</div>;
          })}
        </div>
      ))}
    </div>
  );
}


export default function SummaryPage() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [cuts, setCuts] = useState<CuttingJob[]>([]);
  const [prodCols, setProdCols] = useState<{ id: string; title: string; accent: string }[]>([]);
  const [loading, setLoading] = useState(true);
  const [lastUpdate, setLastUpdate] = useState("");
  const { user } = useAuth();
  const isAdmin = user?.role === "admin";
  const isTV = user?.name === "TV";
  const [isFullscreen, setIsFullscreen] = useState(false);

  const toggleFullscreen = () => {
    if (!isFullscreen) {
      document.documentElement.requestFullscreen?.();
      document.body.classList.add("presentation-mode");
    } else {
      document.exitFullscreen?.();
      document.body.classList.remove("presentation-mode");
    }
    setIsFullscreen(!isFullscreen);
  };

  useEffect(() => {
    const handler = () => {
      if (!document.fullscreenElement) {
        document.body.classList.remove("presentation-mode");
        setIsFullscreen(false);
      }
    };
    document.addEventListener("fullscreenchange", handler);
    return () => document.removeEventListener("fullscreenchange", handler);
  }, []);

  const SECTION_KEYS = ["upcoming", "stats", "queues", "cutting", "calendar", "orders"] as const;
  type SectionKey = typeof SECTION_KEYS[number];
  const STORAGE_KEY = "winx-summary-collapsed";
  const [collapsed, setCollapsed] = useState<Record<SectionKey, boolean>>({
    upcoming: false, stats: false, queues: false, cutting: false, calendar: false, orders: false,
  });
  const [zoom, setZoom] = useState(100);
  const DEFAULT_ORDER = ["upcoming", "stats", "queues", "cutting_calendar", "orders"];
  const [sectionOrder, setSectionOrder] = useState<string[]>(DEFAULT_ORDER);
  const dragItem = useRef<string | null>(null);
  const [dragOver, setDragOver] = useState<string | null>(null);

  useEffect(() => {
    const saved = localStorage.getItem("winx-summary-order");
    if (saved) {
      try {
        const parsed: string[] = JSON.parse(saved);
        // merge: keep all keys, respect saved order
        const merged = [...parsed.filter(k => DEFAULT_ORDER.includes(k)), ...DEFAULT_ORDER.filter(k => !parsed.includes(k))];
        setSectionOrder(merged);
      } catch {}
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const onDragStart = (key: string) => { dragItem.current = key; };
  const onDragOver = (e: React.DragEvent, key: string) => { e.preventDefault(); setDragOver(key); };
  const onDrop = (targetKey: string) => {
    const from = dragItem.current;
    if (!from || from === targetKey) { setDragOver(null); return; }
    setSectionOrder(prev => {
      const next = [...prev];
      const fi = next.indexOf(from);
      const ti = next.indexOf(targetKey);
      next.splice(fi, 1);
      next.splice(ti, 0, from);
      localStorage.setItem("winx-summary-order", JSON.stringify(next));
      return next;
    });
    dragItem.current = null;
    setDragOver(null);
  };
  const onDragEnd = () => { dragItem.current = null; setDragOver(null); };

  const scrollRef = useRef<HTMLDivElement>(null);
  const [scrollState, setScrollState] = useState({ canLeft: false, canRight: false });
  const updateScroll = () => {
    const el = scrollRef.current;
    if (!el) return;
    setScrollState({ canLeft: el.scrollLeft > 4, canRight: el.scrollLeft + el.clientWidth < el.scrollWidth - 4 });
  };
  const scrollCards = (dir: "left" | "right") => {
    scrollRef.current?.scrollBy({ left: dir === "left" ? -220 : 220, behavior: "smooth" });
  };
  useEffect(() => { setTimeout(updateScroll, 100); }, [orders, collapsed.upcoming]);

  useEffect(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) setCollapsed(JSON.parse(saved));
      const savedZoom = localStorage.getItem("winx-summary-zoom");
      if (savedZoom) setZoom(Number(savedZoom));
    } catch { /* ignore */ }
  }, []);

  const changeZoom = (delta: number) => {
    setZoom(prev => {
      const next = Math.max(60, Math.min(100, prev + delta));
      localStorage.setItem("winx-summary-zoom", String(next));
      return next;
    });
  };

  const updateCollapsed = (next: Record<SectionKey, boolean>) => {
    setCollapsed(next);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
  };
  const allCollapsed = SECTION_KEYS.every((k) => collapsed[k]);
  const toggleAll = () => {
    const next = !allCollapsed;
    updateCollapsed({ upcoming: next, stats: next, queues: next, cutting: next, calendar: next, orders: next });
  };
  const toggleSection = (k: SectionKey) => updateCollapsed({ ...collapsed, [k]: !collapsed[k] });

  const load = async () => {
    setLoading(true);
    const [oRes, cRes, pRes] = await Promise.all([
      fetch("/api/orders", { cache: "no-store" }),
      fetch("/api/cutting-jobs", { cache: "no-store" }),
      fetch("/api/production-columns", { cache: "no-store" }),
    ]);
    const [oData, cData, pData] = await Promise.all([oRes.json(), cRes.json(), pRes.json()]);
    setOrders(oData ?? []);
    setCuts(cData ?? []);
    setProdCols(pData ?? []);
    setLastUpdate(new Date().toLocaleTimeString("th-TH", { hour: "2-digit", minute: "2-digit" }));
    setLoading(false);
  };

  useEffect(() => {
    load();
    const interval = setInterval(load, 60_000);
    const channel = new BroadcastChannel("winx:orders");
    channel.onmessage = () => load();
    const onVisible = () => { if (document.visibilityState === "visible") load(); };
    document.addEventListener("visibilitychange", onVisible);
    return () => { clearInterval(interval); channel.close(); document.removeEventListener("visibilitychange", onVisible); };
  }, []);

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
  // build dynamic prod cols from API data (falls back to PROD_COLS if not loaded yet)
  const activeProdCols = prodCols.length > 0
    ? prodCols.map(c => ({ id: c.id, label: c.title, color: "", accent: c.accent as string | undefined }))
    : PROD_COLS.map(c => ({ id: c.id, label: c.label, color: c.color, accent: undefined as string | undefined }));

  const prodCounts: Record<string, number> = {};
  activeProdCols.forEach((c) => { prodCounts[c.id] = 0; });
  produceOrders.forEach((o) => {
    const k = o.productionStatus ?? "summary";
    prodCounts[k] = (prodCounts[k] ?? 0) + 1;
  });

  // รอสรุปงาน
  const waitSummaryOrders = produceOrders.filter((o) => !o.productionStatus || o.productionStatus === "summary");

  // items maps for clickable progress bar chips
  const designItems: Record<string, { id: string; teamName: string; quantity?: number }[]> = {};
  DESIGN_COLS.forEach((c) => { designItems[c.id] = []; });
  designOrders.forEach((o) => {
    const k = o.designStatus ?? "wait_design";
    if (designItems[k]) designItems[k].push({ id: o.id, teamName: o.teamName, quantity: o.quantity });
  });

  const prodItems: Record<string, { id: string; teamName: string; quantity?: number }[]> = {};
  activeProdCols.forEach((c) => { prodItems[c.id] = []; });
  produceOrders.forEach((o) => {
    const k = o.productionStatus ?? "summary";
    if (prodItems[k]) prodItems[k].push({ id: o.id, teamName: o.teamName, quantity: o.quantity });
  });

  // รอออกแบบ
  const waitDesignOrders = designOrders.filter((o) => !o.designStatus || o.designStatus === "wait_design");

  // cutting jobs
  const cutPending = cuts.filter((c) => c.status === "pending").length;
  const cutCutting = cuts.filter((c) => c.status === "cutting").length;
  const cutDone = cuts.filter((c) => c.status === "cut_done" || c.status === "sewing" || c.status === "done").length;
  const CUT_COLS = [
    { id: "pending", label: "รอรับงาน", color: "bg-gray-500" },
    { id: "cutting", label: "กำลังตัด", color: "bg-orange-400" },
    { id: "done", label: "ตัดเสร็จ/เย็บแล้ว", color: "bg-green-500" },
  ];
  const cutCounts = { pending: cutPending, cutting: cutCutting, done: cutDone };

  // sewing jobs
  const sewWaiting = cuts.filter((c) => c.status === "cut_done").length;
  const sewSewing = cuts.filter((c) => c.status === "sewing").length;
  const sewDone = cuts.filter((c) => c.status === "done").length;
  const SEW_COLS = [
    { id: "cut_done", label: "รอเย็บ", color: "bg-gray-500" },
    { id: "sewing",   label: "กำลังเย็บ", color: "bg-blue-500" },
    { id: "done",     label: "เสร็จสมบูรณ์", color: "bg-green-500" },
  ];
  const sewCounts = { cut_done: sewWaiting, sewing: sewSewing, done: sewDone };

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
      return d >= today && d <= in14 && o.productionStatus !== "delivered";
    })
    .sort((a, b) => (a.deliveryDate ?? "").localeCompare(b.deliveryDate ?? ""));

  return (
    <div className="min-h-screen">
      {/* Header */}
      {isFullscreen ? (
        <button
          onClick={toggleFullscreen}
          className="fixed top-3 right-3 z-50 flex items-center gap-1.5 rounded-lg border border-border bg-surface/80 backdrop-blur-sm px-2.5 py-1.5 text-xs hover:bg-surface-2"
        >
          <Minimize className="h-3.5 w-3.5" />
        </button>
      ) : (
      <div className="border-b border-border bg-surface px-4 py-4 min-[720px]:px-8">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-xl font-bold">สรุปภาพรวมงาน</h1>
            <p className="text-xs text-muted-2 mt-0.5">
              {formatDate(new Date().toISOString())}
              {lastUpdate && <> · อัพเดทล่าสุด {lastUpdate}</>}
            </p>
          </div>
          <div className="flex items-center gap-2">
            <span className="hidden min-[720px]:block text-xs text-muted-2">อัพเดทอัตโนมัติทุก 1 นาที</span>
            {/* Zoom controls — hidden on mobile */}
            <div className="hidden min-[720px]:flex items-center gap-1 rounded-lg border border-border px-1 py-1">
              <button onClick={() => changeZoom(-10)} disabled={zoom <= 60} className="rounded px-1.5 py-0.5 text-xs text-muted hover:bg-surface-2 disabled:opacity-30">−</button>
              <span className="min-w-[34px] text-center text-xs text-muted-2">{zoom}%</span>
              <button onClick={() => changeZoom(10)} disabled={zoom >= 100} className="rounded px-1.5 py-0.5 text-xs text-muted hover:bg-surface-2 disabled:opacity-30">+</button>
            </div>
            <button
              onClick={toggleAll}
              className="flex items-center gap-1.5 rounded-lg border border-border px-2.5 py-1.5 text-xs hover:bg-surface-2"
            >
              <ChevronsUpDown className="h-3.5 w-3.5" />
              <span className="hidden min-[720px]:inline">{allCollapsed ? "ขยายทั้งหมด" : "ย่อทั้งหมด"}</span>
            </button>
            <button
              onClick={load}
              disabled={loading}
              className="flex items-center gap-1.5 rounded-lg border border-border px-2.5 py-1.5 text-xs hover:bg-surface-2 disabled:opacity-50"
            >
              <RefreshCw className={cn("h-3.5 w-3.5", loading && "animate-spin")} />
              <span className="hidden min-[720px]:inline">รีเฟรช</span>
            </button>
            <button
              onClick={toggleFullscreen}
              className="flex items-center gap-1.5 rounded-lg border border-border px-2.5 py-1.5 text-xs hover:bg-surface-2"
            >
              <Maximize className="h-3.5 w-3.5" />
            </button>
          </div>
        </div>
      </div>
      )}

      <div className="space-y-6 px-4 py-6 min-[720px]:px-8" style={{ zoom: `${zoom}%` }}>

        {sectionOrder.map((skey) => {
        const dragHandle = (
          <div draggable onDragStart={() => onDragStart(skey)} onDragEnd={onDragEnd}
            className="cursor-grab active:cursor-grabbing p-1 -ml-1 text-muted-2 shrink-0 touch-none opacity-0 group-hover:opacity-100 transition-opacity">
            <GripVertical className="h-4 w-4" />
          </div>
        );
        const wrapSection = (content: React.ReactNode, visible = true) => visible ? (
          <div key={skey}
            onDragOver={(e) => onDragOver(e, skey)} onDrop={() => onDrop(skey)}
            className={cn("transition-opacity group", dragOver === skey && dragItem.current !== skey && "opacity-40")}>
            {content}
          </div>
        ) : null;

        if (skey === "upcoming") return wrapSection(
        upcomingDeliveries.length > 0 && (
          <div className="rounded-xl overflow-hidden">
            <div className="flex items-center gap-1 px-4 hover:bg-surface-2 hover:rounded-xl transition-all">
              {dragHandle}
              <button onClick={() => toggleSection("upcoming")} className="flex items-center gap-2 flex-1 text-left py-3.5">
                <CalendarDays className="h-4 w-4 text-orange-400 shrink-0" />
                <h2 className="font-semibold text-sm text-orange-400 flex-1">ใกล้วันส่ง</h2>
                <span className="rounded-full bg-orange-500/20 px-2 py-0.5 text-[11px] font-semibold text-orange-400">{upcomingDeliveries.length} งาน</span>
                {collapsed.upcoming ? <ChevronDown className="h-4 w-4 text-orange-400 shrink-0" /> : <ChevronUp className="h-4 w-4 text-orange-400 shrink-0" />}
              </button>
            </div>
            {!collapsed.upcoming && (
            <div className="relative py-4">
              {/* fade edges */}
              {scrollState.canLeft && <div className="pointer-events-none absolute left-0 top-0 bottom-5 w-10 z-10 bg-gradient-to-r from-background to-transparent" />}
              {scrollState.canRight && <div className="pointer-events-none absolute right-0 top-0 bottom-5 w-10 z-10 bg-gradient-to-l from-background to-transparent" />}
              {/* scroll arrows */}
              {scrollState.canLeft && (
                <button onClick={() => scrollCards("left")}
                  className="absolute left-1 top-1/2 -translate-y-1/2 z-20 flex h-7 w-7 items-center justify-center rounded-full bg-surface border border-border shadow-md hover:bg-surface-2 transition-colors">
                  <ChevronLeft className="h-4 w-4 text-muted-2" />
                </button>
              )}
              {scrollState.canRight && (
                <button onClick={() => scrollCards("right")}
                  className="absolute right-1 top-1/2 -translate-y-1/2 z-20 flex h-7 w-7 items-center justify-center rounded-full bg-surface border border-border shadow-md hover:bg-surface-2 transition-colors">
                  <ChevronRight className="h-4 w-4 text-muted-2" />
                </button>
              )}
            <div ref={scrollRef} onScroll={updateScroll} className="px-5 pb-5 flex gap-3 overflow-x-auto" style={{ scrollbarWidth: "none" }}>
              {upcomingDeliveries.map((o) => {
                const d = new Date(o.deliveryDate!); d.setHours(0, 0, 0, 0);
                const daysLeft = Math.round((d.getTime() - today.getTime()) / 86400000);
                const urgent = daysLeft <= 3;
                const warn = daysLeft <= 7;
                const accentText = urgent ? "text-red-400" : warn ? "text-yellow-400" : "text-green-400";
                const accentBg = urgent ? "bg-red-500/15" : warn ? "bg-yellow-500/15" : "bg-green-500/15";
                const cardClass = "flex flex-col rounded-xl bg-surface-2 p-3 gap-2.5 shrink-0 w-44";
                const cardContent = (
                  <>
                    <div className={cn("self-start rounded-lg px-3 py-2 text-center min-w-[52px]", accentBg, accentText)}>
                      <div className="text-2xl font-bold leading-none">{daysLeft}</div>
                      <div className="text-[10px] mt-0.5">วัน</div>
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="font-semibold text-sm leading-snug line-clamp-2">{o.teamName}</div>
                      <div className="text-[11px] text-muted-2 mt-1 font-mono">{o.id}</div>
                      {(o.shirtType || o.quantity) && (
                        <div className="text-[11px] text-muted-2 mt-0.5 flex flex-wrap gap-x-1.5">
                          {o.shirtType && <span>{o.shirtType}</span>}
                          {o.quantity && <span>· {o.quantity} ตัว</span>}
                        </div>
                      )}
                    </div>
                    {o.productionStatus && (() => {
                      const col = activeProdCols.find(c => c.id === o.productionStatus);
                      return (
                        <div
                          className="text-[10px] font-medium px-2 py-0.5 rounded-full border self-start"
                          style={col?.accent
                            ? { borderColor: col.accent + "55", backgroundColor: col.accent + "22", color: col.accent }
                            : undefined}
                        >
                          {col?.label ?? o.productionStatus}
                        </div>
                      );
                    })()}
                    {(() => {
                      const job = cuts.find(c => c.orderId === o.id);
                      if (!job) return null;
                      if (job.status === "cutting" && job.cutterName) return (
                        <div className="text-[11px] text-orange-400 flex items-center gap-1">
                          <Scissors className="h-3 w-3 shrink-0" />
                          <span className="truncate">{job.cutterName}</span>
                        </div>
                      );
                      if (job.sewingStatus === "sewing" && job.sewerName) return (
                        <div className="text-[11px] text-blue-400 flex items-center gap-1">
                          <Shirt className="h-3 w-3 shrink-0" />
                          <span className="truncate">{job.sewerName}</span>
                        </div>
                      );
                      return null;
                    })()}
                    <div className="border-t border-border pt-2 flex items-center justify-between">
                      <div className={cn("text-xs font-semibold", accentText)}>{formatDate(o.deliveryDate!)}</div>
                      <div className="text-[10px] text-muted-2">{TYPE_LABEL[o.type]}</div>
                    </div>
                  </>
                );
                return isAdmin ? (
                  <Link key={o.id} href={`/orders/${o.id}`}
                    className={cn(cardClass, "hover:bg-surface-2 transition-colors")}>{cardContent}</Link>
                ) : (
                  <div key={o.id} className={cardClass}>{cardContent}</div>
                );
              })}
            </div>
            </div>
            )}
          </div>
        )
        );

        if (skey === "stats") return wrapSection(
        <div className="rounded-xl overflow-hidden">
          <div className="flex items-center gap-1 px-4 hover:bg-surface-2 hover:rounded-xl transition-all">
            {dragHandle}
            <button onClick={() => toggleSection("stats")} className="flex items-center gap-2 flex-1 text-left py-3.5">
              <ClipboardList className="h-4 w-4 text-accent shrink-0" />
              <span className="font-semibold text-sm flex-1">ภาพรวมออเดอร์</span>
              <span className="text-xs text-muted-2 mr-2">{orders.length} ออเดอร์</span>
              {collapsed.stats ? <ChevronDown className="h-4 w-4 text-muted shrink-0" /> : <ChevronUp className="h-4 w-4 text-muted shrink-0" />}
            </button>
          </div>
          {!collapsed.stats && (
            <div className="grid grid-cols-2 gap-3 min-[720px]:grid-cols-4 p-4">
              <StatCard label="ออเดอร์ทั้งหมด" value={orders.length} href="/orders" tone="text-foreground" sub="รายการ" />
              <StatCard label="กำลังดำเนินการ" value={activeOrders.length} tone="text-accent" sub="รายการ" />
              <StatCard label="งานออกแบบ" value={designOrders.length} tone="text-blue-500" href="/queue/design" sub="รายการ" />
              <StatCard label="งานผลิต" value={produceOrders.length} tone="text-purple-500" href="/queue/production" sub="รายการ" />
            </div>
          )}
        </div>
        );

        if (skey === "queues") return wrapSection(
          <div className="rounded-xl overflow-hidden">
            <div className="flex items-center gap-1 px-4 hover:bg-surface-2 hover:rounded-xl transition-all">
              {dragHandle}
              <button onClick={() => !isTV && toggleSection("queues")} className="flex items-center gap-2 flex-1 text-left py-3.5">
                <Palette className="h-4 w-4 text-accent shrink-0" />
                <span className="font-semibold text-sm flex-1">คิวออกแบบ & ผลิต</span>
                <span className="text-xs text-muted-2 mr-2">{designOrders.length} ออกแบบ · {produceOrders.length} ผลิต</span>
                {!isTV && (collapsed.queues ? <ChevronDown className="h-4 w-4 text-muted shrink-0" /> : <ChevronUp className="h-4 w-4 text-muted shrink-0" />)}
              </button>
            </div>
            {(!collapsed.queues || isTV) && (
              <div className="p-4 grid grid-cols-1 gap-3 min-[720px]:grid-cols-2">
                {designOrders.length > 0 && (
                  <div className="rounded-xl border border-border bg-surface-2 p-5">
                    <SectionHeader icon={Palette} title="คิวออกแบบ" href="/queue/design" />
                    <ProgressBar cols={DESIGN_COLS} counts={designCounts} items={designItems} isAdmin={isAdmin} storageKey="winx-summary-design-open" />
                  </div>
                )}
                {produceOrders.length > 0 && (
                  <div className="rounded-xl border border-border bg-surface-2 p-5">
                    <SectionHeader icon={Factory} title="คิวผลิต" href="/queue/production" />
                    <ProgressBar cols={activeProdCols} counts={prodCounts} items={prodItems} isAdmin={isAdmin} storageKey="winx-summary-prod-open" />
                  </div>
                )}
              </div>
            )}
          </div>,
          designOrders.length > 0 || produceOrders.length > 0
        );

        if (skey === "cutting_calendar") return wrapSection(
          <div className="grid grid-cols-1 gap-4 min-[1024px]:grid-cols-2 min-[1024px]:items-stretch">
            <div className="rounded-xl overflow-hidden flex flex-col">
              <div className="flex items-center gap-1 px-4 hover:bg-surface-2 hover:rounded-xl transition-all shrink-0">
                {dragHandle}
                <button onClick={() => toggleSection("cutting")} className="flex items-center gap-2 flex-1 text-left py-3.5">
                  <Scissors className="h-4 w-4 text-accent shrink-0" />
                  <span className="font-semibold text-sm flex-1">ใบงานตัด & ตารางสั่งผลิต</span>
                  <span className="text-xs text-muted-2 mr-2">{cuts.length} ใบงานตัด · {sewWaiting + sewSewing + sewDone} ใบงานเย็บ</span>
                  {collapsed.cutting ? <ChevronDown className="h-4 w-4 text-muted shrink-0" /> : <ChevronUp className="h-4 w-4 text-muted shrink-0" />}
                </button>
              </div>
              {!collapsed.cutting && (
                <div className="flex flex-col gap-3 p-4 flex-1 pb-0">
                  <div className={cn("rounded-xl border border-border bg-surface p-5 shadow-sm", "flex flex-col flex-1 min-h-0")}>
                    <SectionHeader icon={Scissors} title="ใบงานตัด" href="/cutting-jobs" />
                    {cuts.length === 0
                      ? <div className="text-sm text-muted-2 py-2">ไม่มีข้อมูล</div>
                      : <ProgressBar cols={CUT_COLS} counts={cutCounts} />
                    }
                    {(() => {
                      const active = cuts.filter((c) => c.status === "cutting" && c.cutterName);
                      return active.length > 0 ? (
                        <div className="mt-3 flex flex-col gap-2 overflow-y-auto min-h-0">
                          {active.map((c) => (
                            <div key={c.id} className="flex items-center gap-2 text-sm shrink-0">
                              <span className="font-medium text-foreground">{c.cutterName}</span>
                              <span className="text-muted-2">กำลังตัด</span>
                              <span className="font-medium text-orange-400">{c.teamName}</span>
                            </div>
                          ))}
                        </div>
                      ) : null;
                    })()}
                  </div>
                  <div className={cn("rounded-xl border border-border bg-surface p-5 shadow-sm", "flex flex-col flex-1 min-h-0")}>
                    <SectionHeader icon={Shirt} title="ใบงานเย็บ" href="/cutting-jobs" />
                    {sewWaiting + sewSewing + sewDone === 0
                      ? <div className="text-sm text-muted-2 py-2">ไม่มีข้อมูล</div>
                      : <ProgressBar cols={SEW_COLS} counts={sewCounts} />
                    }
                    {(() => {
                      const active = cuts.filter((c) => c.sewingStatus === "sewing" && c.sewerName);
                      return active.length > 0 ? (
                        <div className="mt-3 flex flex-col gap-2 overflow-y-auto min-h-0">
                          {active.map((c) => (
                            <div key={c.id} className="flex items-center gap-2 text-sm shrink-0">
                              <span className="font-medium text-foreground">{c.sewerName}</span>
                              <span className="text-muted-2">กำลังเย็บ</span>
                              <span className="font-medium text-blue-400">{c.teamName}</span>
                            </div>
                          ))}
                        </div>
                      ) : null;
                    })()}
                  </div>
                </div>
              )}
            </div>
            <div className="flex flex-col">
              <div className="flex items-center gap-1 px-4 hover:bg-surface-2 hover:rounded-xl transition-all shrink-0">
                <span className="w-5 shrink-0" />
                <button onClick={() => toggleSection("calendar")} className="flex items-center gap-2 flex-1 text-left py-3.5">
                  <CalendarDays className="h-4 w-4 text-accent shrink-0" />
                  <span className="font-semibold text-sm flex-1">ปฏิทินวันจัดส่งสินค้า</span>
                  {collapsed.calendar ? <ChevronDown className="h-4 w-4 text-muted shrink-0" /> : <ChevronUp className="h-4 w-4 text-muted shrink-0" />}
                </button>
              </div>
              {!collapsed.calendar && (
                <div className="rounded-xl border border-border bg-surface overflow-hidden mt-4 flex-1">
                  <DeliveryCalendar orders={orders} embedded isAdmin={isAdmin} />
                </div>
              )}
            </div>
          </div>
        );

        if (skey === "orders") return wrapSection(
          <div className="rounded-xl border border-border bg-surface shadow-sm overflow-hidden">
            <div className="flex items-center border-b border-border px-4 py-3.5">
              {dragHandle}
              <button onClick={() => toggleSection("orders")} className="flex items-center gap-2 flex-1 text-left">
                <ClipboardList className="h-4 w-4 text-accent shrink-0" />
                <h2 className="font-semibold text-sm flex-1">งานที่กำลังดำเนินการ</h2>
                <span className="text-xs text-muted-2 mr-2">{recentActive.length} งาน</span>
                {collapsed.orders ? <ChevronDown className="h-4 w-4 text-muted shrink-0" /> : <ChevronUp className="h-4 w-4 text-muted shrink-0" />}
              </button>
              <Link href="/orders" className="text-xs text-accent hover:underline ml-3">ดูทั้งหมด →</Link>
            </div>
            {!collapsed.orders && (
              recentActive.length === 0 ? (
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
              )
            )}
          </div>
        );

        return null;
        })}

      </div>
    </div>
  );
}

// ── Delivery Calendar ─────────────────────────────────────────
const TH_MONTHS = ["มกราคม","กุมภาพันธ์","มีนาคม","เมษายน","พฤษภาคม","มิถุนายน","กรกฎาคม","สิงหาคม","กันยายน","ตุลาคม","พฤศจิกายน","ธันวาคม"];
const DOW = ["อา","จ","อ","พ","พฤ","ศ","ส"];

function DeliveryCalendar({ orders, embedded, isAdmin }: { orders: Order[]; embedded?: boolean; isAdmin?: boolean }) {
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
    <div className={cn(!embedded && "rounded-xl border border-border bg-surface shadow-sm overflow-hidden")}>
      {/* Header */}
      <div className="flex items-center justify-between border-b border-border px-5 py-3.5">
        {!embedded && (
          <div className="flex items-center gap-3">
            <CalendarDays className="h-4 w-4 text-accent" />
            <h2 className="font-semibold text-sm">ปฏิทินวันจัดส่งสินค้า</h2>
          </div>
        )}
        <div className="flex items-center gap-3 flex-1">
          <div className="flex items-center gap-3">
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
        <div className="flex items-center gap-2 ml-2">
          {noDateCount > 0 && (
            <span className="text-[11px] text-muted-2 hidden min-[720px]:inline">
              {noDateCount} งานยังไม่กรอกวันจัดส่ง
            </span>
          )}
          <div className="flex items-center gap-1">
            <button onClick={() => changeMonth(-1)} className="rounded-lg p-1 text-muted hover:bg-surface-2 transition-colors" aria-label="เดือนก่อน">
              <ChevronLeft className="h-4 w-4" />
            </button>
            <span className="text-sm font-medium min-w-[100px] text-center">
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
                {selectedOrders.map((o) => {
                  const row = <>
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
                  </>;
                  return isAdmin
                    ? <Link key={o.id} href={`/orders/${o.id}`} className="flex items-center gap-3 px-4 py-3 hover:bg-surface-2 transition-colors">{row}</Link>
                    : <div key={o.id} className="flex items-center gap-3 px-4 py-3">{row}</div>;
                })}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
