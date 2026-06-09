"use client";

import { useEffect, useState, useRef, useCallback, useMemo } from "react";
import { PageHeader, Badge, Button, Card } from "@/components/ui";
import { AddOrderModal } from "@/components/add-order-modal";
import { orderTotal, orderBalance, CUSTOMER_TYPE_LABEL, GROUP_COLORS, type Order } from "@/lib/types";
import { formatBaht, formatDate } from "@/lib/utils";
import { Plus, Loader2, Trash2, Sheet, X, FileSpreadsheet, Upload, AlertCircle, Search, ChevronUp, ChevronDown, ChevronsUpDown, SlidersHorizontal, RotateCcw } from "lucide-react";
import type { PaymentRequest } from "@/lib/payment-config";
import Link from "next/link";
import { notifyOrdersUpdated } from "@/lib/broadcast";

import { designColumns } from "@/lib/mock-data";
import type { QueueColumn } from "@/lib/types";

type ColStatus = { label: string; accent: string };
type ColMap = Record<string, ColStatus>;

function buildColMap(cols: QueueColumn[]): ColMap {
  return Object.fromEntries(cols.map(c => [c.id, { label: c.title, accent: c.accent }]));
}

const NO_STATUS = { label: "ยังไม่มีคิว", accent: "#666" };

function deriveStatus(o: Order, designMap: ColMap, prodMap: ColMap) {
  if (o.type === "design") return o.designStatus ? (designMap[o.designStatus] ?? NO_STATUS) : NO_STATUS;
  if (o.type === "produce") return o.productionStatus ? (prodMap[o.productionStatus] ?? NO_STATUS) : NO_STATUS;
  if (o.productionStatus) return prodMap[o.productionStatus] ?? NO_STATUS;
  if (o.designStatus) return designMap[o.designStatus] ?? NO_STATUS;
  return NO_STATUS;
}

function StatusCell({ order, onSave, designMap, prodMap }: {
  order: Order;
  onSave: (field: "designStatus" | "productionStatus", value: string) => void;
  designMap: ColMap;
  prodMap: ColMap;
}) {
  const [pos, setPos] = useState<{ top: number; left: number } | null>(null);
  const btnRef = useRef<HTMLButtonElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const s = deriveStatus(order, designMap, prodMap);

  const isProdOnly = order.type === "produce";
  const isDesignOnly = order.type === "design";
  const activeField: "designStatus" | "productionStatus" =
    isProdOnly ? "productionStatus" :
    isDesignOnly ? "designStatus" :
    order.productionStatus ? "productionStatus" : "designStatus";

  const activeMap = activeField === "designStatus" ? designMap : prodMap;
  const options = Object.entries(activeMap).map(([id, v]) => ({ id, ...v }));
  const currentId = activeField === "designStatus" ? order.designStatus : order.productionStatus;

  const open = pos !== null;

  const handleOpen = () => {
    if (open) { setPos(null); return; }
    const rect = btnRef.current?.getBoundingClientRect();
    if (rect) setPos({ top: rect.bottom + 4, left: rect.left });
  };

  useEffect(() => {
    if (!open) return;
    const handler = (e: MouseEvent) => {
      if (!btnRef.current?.contains(e.target as Node) && !menuRef.current?.contains(e.target as Node))
        setPos(null);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [open]);

  return (
    <>
      <button
        ref={btnRef}
        onClick={handleOpen}
        className="flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium transition-opacity hover:opacity-75"
        style={{ color: s.accent, backgroundColor: `color-mix(in srgb, ${s.accent} 15%, transparent)` }}
      >
        <span className="h-1.5 w-1.5 rounded-full flex-shrink-0" style={{ backgroundColor: s.accent }} />
        {s.label}
      </button>
      {open && pos && (
        <div
          ref={menuRef}
          style={{ position: "fixed", top: pos.top, left: pos.left, zIndex: 9999 }}
          className="w-48 rounded-[var(--radius-md)] border border-border bg-surface shadow-xl py-1"
        >
          <div className="px-3 py-1.5 text-[10px] uppercase tracking-wider text-muted-2 border-b border-border mb-1">
            {activeField === "designStatus" ? "คิวออกแบบ" : "คิวผลิต"}
          </div>
          {options.map(opt => (
            <button
              key={opt.id}
              onClick={() => { onSave(activeField, opt.id); setPos(null); }}
              className="flex w-full items-center gap-2 px-3 py-2 text-xs hover:bg-surface-2 transition-colors"
              style={{ color: opt.accent, fontWeight: currentId === opt.id ? 700 : 400 }}
            >
              <span className="h-1.5 w-1.5 rounded-full flex-shrink-0" style={{ backgroundColor: opt.accent }} />
              {opt.label}
              {currentId === opt.id && <span className="ml-auto text-[10px]">✓</span>}
            </button>
          ))}
        </div>
      )}
    </>
  );
}

// ===== Resizable columns =====
const COL_KEYS = ["id","date","team","status","type","shirt","qty","total","deposit","balance"] as const;
type ColKey = typeof COL_KEYS[number];
const DEFAULT_WIDTHS: Record<ColKey, number> = {
  id: 120, date: 100, team: 280, status: 130, type: 100,
  shirt: 140, qty: 80, total: 100, deposit: 90, balance: 100,
};
const LS_KEY = "winx-orders-col-widths";

function useColWidths() {
  const [widths, setWidths] = useState<Record<ColKey, number>>(() => {
    if (typeof window === "undefined") return { ...DEFAULT_WIDTHS };
    try {
      const saved = JSON.parse(localStorage.getItem(LS_KEY) ?? "{}");
      return { ...DEFAULT_WIDTHS, ...saved };
    } catch { return { ...DEFAULT_WIDTHS }; }
  });

  const save = useCallback((next: Record<ColKey, number>) => {
    setWidths(next);
    localStorage.setItem(LS_KEY, JSON.stringify(next));
  }, []);

  const reset = useCallback(() => {
    save({ ...DEFAULT_WIDTHS });
  }, [save]);

  return { widths, save, reset };
}

type SortDir = "asc" | "desc";

function ResizableTh({ colKey, widths, onResize, className, children, sortDir, onSort }: {
  colKey: ColKey;
  widths: Record<ColKey, number>;
  onResize: (key: ColKey, w: number) => void;
  className?: string;
  children?: React.ReactNode;
  sortDir?: SortDir | null;
  onSort?: () => void;
}) {
  const startX = useRef(0);
  const startW = useRef(0);
  const dragging = useRef(false);

  const onMouseDown = (e: React.MouseEvent) => {
    e.preventDefault();
    dragging.current = false;
    startX.current = e.clientX;
    startW.current = widths[colKey];

    const onMove = (mv: MouseEvent) => {
      if (Math.abs(mv.clientX - startX.current) > 3) dragging.current = true;
      const next = Math.max(40, startW.current + mv.clientX - startX.current);
      onResize(colKey, next);
    };
    const onUp = () => {
      document.removeEventListener("mousemove", onMove);
      document.removeEventListener("mouseup", onUp);
    };
    document.addEventListener("mousemove", onMove);
    document.addEventListener("mouseup", onUp);
  };

  const SortIcon = sortDir === "asc" ? ChevronUp : sortDir === "desc" ? ChevronDown : ChevronsUpDown;

  return (
    <th
      style={{ width: widths[colKey], minWidth: widths[colKey] }}
      className={`relative select-none border-b border-border px-3 py-3 font-medium ${onSort ? "cursor-pointer hover:text-foreground" : ""} ${className ?? ""}`}
      onClick={() => { if (onSort && !dragging.current) onSort(); }}
    >
      <span className="inline-flex items-center gap-1">
        {children}
        {onSort && <SortIcon className={`h-3 w-3 ${sortDir ? "opacity-100" : "opacity-30"}`} />}
      </span>
      <span
        onMouseDown={onMouseDown}
        onClick={e => e.stopPropagation()}
        className="absolute right-0 top-0 h-full w-2 cursor-col-resize opacity-0 hover:opacity-100 group-hover/thead:opacity-30 flex items-center justify-center"
        style={{ userSelect: "none" }}
      >
        <span className="h-4 w-px bg-border" />
      </span>
    </th>
  );
}

export default function OrdersPage() {
  const { widths, save: saveWidths, reset: resetWidths } = useColWidths();
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [chipsOpen, setChipsOpen] = useState(false);
  const [sheetsModalOpen, setSheetsModalOpen] = useState(false);
  const [tooltip, setTooltip] = useState<{ order: Order; x: number; y: number } | null>(null);
  const [tableUpdates, setTableUpdates] = useState<Record<string, string>>({});
  const [paymentRequests, setPaymentRequests] = useState<PaymentRequest[]>([]);
  const [designMap, setDesignMap] = useState<ColMap>(() => buildColMap(designColumns));
  const [prodMap, setProdMap] = useState<ColMap>({});

  // ── Filter & Sort (persisted in localStorage) ─────────────
  const LS_FILTER = "winx-orders-filter";
  function saveFilter(patch: Record<string, unknown>) {
    try {
      const prev = JSON.parse(localStorage.getItem(LS_FILTER) ?? "{}");
      localStorage.setItem(LS_FILTER, JSON.stringify({ ...prev, ...patch }));
    } catch { /* ignore */ }
  }

  const [search, _setSearch] = useState<string>("");
  const [filterType, _setFilterType] = useState<"all"|"design"|"design_produce"|"produce">("all");
  const [filterStatus, _setFilterStatus] = useState<string>("all");
  const [sortKey, _setSortKey] = useState<ColKey | null>(null);
  const [sortDir, _setSortDir] = useState<SortDir>("asc");

  useEffect(() => {
    try {
      const saved = JSON.parse(localStorage.getItem(LS_FILTER) ?? "{}");
      if (saved.search) _setSearch(saved.search);
      if (saved.filterType) _setFilterType(saved.filterType);
      if (saved.filterStatus) _setFilterStatus(saved.filterStatus);
      if (saved.sortKey) _setSortKey(saved.sortKey);
      if (saved.sortDir) _setSortDir(saved.sortDir);
    } catch { /* ignore */ }
  }, []);

  const setSearch = (v: string) => { _setSearch(v); saveFilter({ search: v }); };
  const setFilterType = (v: typeof filterType) => { _setFilterType(v); saveFilter({ filterType: v }); };
  const setFilterStatus = (v: string) => { _setFilterStatus(v); saveFilter({ filterStatus: v }); };

  const handleSort = (key: ColKey) => {
    if (sortKey === key) {
      const next = sortDir === "asc" ? "desc" : "asc";
      _setSortDir(next); saveFilter({ sortDir: next });
    } else {
      _setSortKey(key); _setSortDir("asc"); saveFilter({ sortKey: key, sortDir: "asc" });
    }
  };

  const designStatuses = useMemo(() => Object.entries(designMap), [designMap]);
  const prodStatuses = useMemo(() => Object.entries(prodMap), [prodMap]);
  const allStatuses = useMemo(() => [...designStatuses, ...prodStatuses], [designStatuses, prodStatuses]);

  // ── Chip order (drag-to-reorder, persisted) ───────────────
  const [designChipOrder, setDesignChipOrder] = useState<string[]>([]);
  const [prodChipOrder, setProdChipOrder] = useState<string[]>([]);

  // sync order when maps load
  useEffect(() => {
    if (designStatuses.length === 0) return;
    const saved: string[] = JSON.parse(localStorage.getItem("winx-chip-order-design") ?? "[]");
    const ids = designStatuses.map(([id]) => id);
    const merged = [...saved.filter(id => ids.includes(id)), ...ids.filter(id => !saved.includes(id))];
    setDesignChipOrder(merged);
  }, [designStatuses.length]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (prodStatuses.length === 0) return;
    const saved: string[] = JSON.parse(localStorage.getItem("winx-chip-order-prod") ?? "[]");
    const ids = prodStatuses.map(([id]) => id);
    const merged = [...saved.filter(id => ids.includes(id)), ...ids.filter(id => !saved.includes(id))];
    setProdChipOrder(merged);
  }, [prodStatuses.length]); // eslint-disable-line react-hooks/exhaustive-deps

  const orderedDesign = useMemo(() =>
    designChipOrder.length ? designChipOrder.map(id => [id, designMap[id]] as [string, ColStatus]).filter(([,v]) => v) : designStatuses,
  [designChipOrder, designMap, designStatuses]);

  const orderedProd = useMemo(() =>
    prodChipOrder.length ? prodChipOrder.map(id => [id, prodMap[id]] as [string, ColStatus]).filter(([,v]) => v) : prodStatuses,
  [prodChipOrder, prodMap, prodStatuses]);

  // priority index ตามลำดับ chip ที่ผู้ใช้ตั้ง
  const statusPriority = useMemo(() => {
    const combined = [...orderedDesign.map(([id]) => id), ...orderedProd.map(([id]) => id)];
    return Object.fromEntries(combined.map((id, i) => [id, i]));
  }, [orderedDesign, orderedProd]);

  const dragChip = useRef<{ id: string; group: "design" | "prod" } | null>(null);

  const reorderChips = (group: "design" | "prod", fromId: string, toId: string) => {
    if (fromId === toId) return;
    const setter = group === "design" ? setDesignChipOrder : setProdChipOrder;
    const current = group === "design" ? designChipOrder : prodChipOrder;
    const arr = [...current];
    const fi = arr.indexOf(fromId), ti = arr.indexOf(toId);
    if (fi < 0 || ti < 0) return;
    arr.splice(fi, 1);
    arr.splice(ti, 0, fromId);
    setter(arr);
    localStorage.setItem(`winx-chip-order-${group}`, JSON.stringify(arr));
  };

  const displayedOrders = useMemo(() => {
    let list = [...orders];

    // Search
    const q = search.trim().toLowerCase();
    if (q) list = list.filter(o =>
      o.id.toLowerCase().includes(q) ||
      o.teamName.toLowerCase().includes(q) ||
      (o.shirtType ?? "").toLowerCase().includes(q)
    );

    // Type filter
    if (filterType !== "all") list = list.filter(o => o.type === filterType);

    // Status filter
    if (filterStatus !== "all") {
      list = list.filter(o => o.designStatus === filterStatus || o.productionStatus === filterStatus);
    }

    // Sort
    if (sortKey) {
      list.sort((a, b) => {
        let av: number | string = 0, bv: number | string = 0;
        switch (sortKey) {
          case "id":    av = a.id; bv = b.id; break;
          case "date":  av = a.startDate ?? ""; bv = b.startDate ?? ""; break;
          case "team":  av = a.teamName; bv = b.teamName; break;
          case "qty":   av = a.quantity ?? 0; bv = b.quantity ?? 0; break;
          case "total": av = orderTotal(a); bv = orderTotal(b); break;
          case "deposit": av = a.deposit; bv = b.deposit; break;
          case "balance": av = orderBalance(a); bv = orderBalance(b); break;
          case "status": {
            const getStatusId = (o: Order) =>
              o.type === "design" ? (o.designStatus ?? "") :
              o.type === "produce" ? (o.productionStatus ?? "") :
              (o.productionStatus ?? o.designStatus ?? "");
            av = statusPriority[getStatusId(a)] ?? 999;
            bv = statusPriority[getStatusId(b)] ?? 999;
            break;
          }
          default: return 0;
        }
        if (av < bv) return sortDir === "asc" ? -1 : 1;
        if (av > bv) return sortDir === "asc" ? 1 : -1;
        return 0;
      });
    }
    return list;
  }, [orders, search, filterType, filterStatus, sortKey, sortDir, designMap, prodMap, statusPriority]);

  const hasFilters = search || filterType !== "all" || filterStatus !== "all" || sortKey !== null;
  const clearFilters = () => {
    _setSearch(""); _setFilterType("all"); _setFilterStatus("all"); _setSortKey(null); _setSortDir("asc");
    try { localStorage.removeItem(LS_FILTER); } catch { /* ignore */ }
  };

  const fetchOrders = async () => {
    const [ordersRes, summaryRes, payReqRes, colsRes] = await Promise.all([
      fetch("/api/orders", { cache: "no-store" }),
      fetch("/api/production/summary", { cache: "no-store" }),
      fetch("/api/payment-requests", { cache: "no-store" }),
      fetch("/api/production-columns", { cache: "no-store" }),
    ]);
    setOrders(await ordersRes.json());
    setTableUpdates(await summaryRes.json());
    setPaymentRequests(await payReqRes.json());
    const cols: QueueColumn[] = await colsRes.json();
    setProdMap(buildColMap(cols));
    setLoading(false);
  };

  const hasSlipPending = (orderId: string) =>
    paymentRequests.some((pr) => pr.orderId === orderId && pr.status === "slip_uploaded");

  const hasTableUpdate = (orderId: string) => {
    const updatedAt = tableUpdates[orderId];
    if (!updatedAt) return false;
    const viewedAt = localStorage.getItem(`table-viewed-${orderId}`);
    if (!viewedAt) return true;
    return updatedAt > viewedAt;
  };

  useEffect(() => { fetchOrders(); }, []);

  const onCreated = (order: Order) => {
    setOrders((prev) => [order, ...prev]);
  };

  const onDelete = async (id: string) => {
    if (!confirm(`ลบออเดอร์ ${id} ใช่ไหม?`)) return;
    await fetch(`/api/orders/${id}`, { method: "DELETE" });
    setOrders((prev) => prev.filter((o) => o.id !== id));
    notifyOrdersUpdated();
  };

  const onColorOrder = async (id: string, color: string) => {
    await fetch(`/api/orders/${id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ color }),
    });
    setOrders((prev) => prev.map((o) => (o.id === id ? { ...o, color } : o)));
  };

  const onUpdateQueueStatus = async (id: string, field: "designStatus" | "productionStatus", value: string) => {
    await fetch(`/api/orders/${id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ [field]: value }),
    });
    setOrders(prev => prev.map(o => o.id === id ? { ...o, [field]: value } : o));
    notifyOrdersUpdated();
  };

  const onUpdateDate = async (id: string, startDate: string) => {
    await fetch(`/api/orders/${id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ startDate }),
    });
    setOrders((prev) => prev.map((o) => (o.id === id ? { ...o, startDate } : o)));
  };


  return (
    <div>
      <PageHeader
        title="รายการออเดอร์"
        subtitle="จัดการออเดอร์และการเงินของลูกค้าทุกกลุ่ม"
      />

      <div className="px-4 pb-4 min-[720px]:px-8 min-[720px]:pb-8" style={{ paddingTop: 26 }}>
        {/* Filter bar */}
        <div className="flex flex-wrap items-center gap-2 mb-3">
          {/* Search */}
          <div className="relative min-w-[140px] max-w-xs flex-1">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-2 pointer-events-none" />
            <input
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="ค้นหารหัส / ชื่อทีม…"
              className="w-full rounded-[var(--radius-md)] border border-border bg-surface-2 pl-8 pr-3 py-1.5 text-sm text-foreground placeholder:text-muted-2 focus:border-accent focus:outline-none"
            />
          </div>

          {/* Action buttons */}
          <div className="flex items-center gap-2">
            <Button variant="outline" onClick={() => setSheetsModalOpen(true)}>
              <Sheet className="h-4 w-4" />
              <span className="hidden min-[720px]:inline">สร้างออเดอร์จาก Sheets</span>
            </Button>
            <Button onClick={() => setModalOpen(true)}>
              <Plus className="h-4 w-4" />
              <span className="hidden min-[480px]:inline">เพิ่มออเดอร์</span>
            </Button>
          </div>
        </div>

        {/* Type filter + counter + clear */}
        <div className="flex flex-wrap items-center gap-2 mb-3">
          <div className="flex items-center gap-1 rounded-[var(--radius-md)] border border-border bg-surface-2 p-0.5 text-xs">
            {(["all","design","design_produce","produce"] as const).map(t => (
              <button
                key={t}
                onClick={() => setFilterType(t)}
                className={`rounded-[var(--radius-sm)] px-2.5 py-1 transition-colors ${filterType === t ? "bg-surface text-foreground shadow-sm font-medium" : "text-muted hover:text-foreground"}`}
              >
                {t === "all" ? "ทั้งหมด" : CUSTOMER_TYPE_LABEL[t]}
              </button>
            ))}
          </div>

          {hasFilters && (
            <button
              onClick={clearFilters}
              className="flex items-center gap-1 rounded-[var(--radius-md)] border border-border bg-surface-2 px-2.5 py-1.5 text-xs text-muted hover:text-foreground transition-colors"
            >
              <X className="h-3 w-3" /> ล้าง
            </button>
          )}

        </div>

        {/* Status filter chips */}
        {allStatuses.length > 0 && (
          <div className="mb-3 rounded-[var(--radius-lg)] border border-border bg-surface-2/50">
            {/* Header row — always visible */}
            <button
              onClick={() => setChipsOpen(v => !v)}
              className="flex w-full items-center gap-2 px-4 py-2.5 min-[720px]:cursor-default"
            >
              <SlidersHorizontal className="h-3 w-3 text-muted-2 shrink-0" />
              <span className="text-xs text-muted-2">กรองสถานะ:</span>
              {filterStatus !== "all" && (
                <span
                  className="rounded-full px-2 py-0.5 text-xs font-medium"
                  style={{ color: (designMap[filterStatus] ?? prodMap[filterStatus])?.accent, backgroundColor: `color-mix(in srgb, ${(designMap[filterStatus] ?? prodMap[filterStatus])?.accent} 15%, transparent)` }}
                >
                  {(designMap[filterStatus] ?? prodMap[filterStatus])?.label}
                </span>
              )}
              <span className="text-xs text-muted-2">{displayedOrders.length} / {orders.length} รายการ</span>
              <ChevronDown className={`ml-auto h-3.5 w-3.5 text-muted-2 transition-transform min-[720px]:hidden ${chipsOpen ? "rotate-180" : ""}`} />
            </button>

            {/* Chips body — always shown on desktop, collapsible on mobile */}
            <div className={`px-4 pb-3 ${chipsOpen ? "block" : "hidden"} min-[720px]:block`}>
              <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
                {orderedDesign.length > 0 && (
                  <div className="w-full">
                    <div className="mb-1.5 text-[10px] text-muted-2">คิวออกแบบ</div>
                    <div className="flex flex-wrap gap-1.5">
                      {orderedDesign.map(([id, s]) => (
                        <StatusChip key={id} id={id} s={s} group="design"
                          active={filterStatus === id}
                          onToggle={() => setFilterStatus(filterStatus === id ? "all" : id)}
                          dragRef={dragChip} onReorder={reorderChips}
                        />
                      ))}
                    </div>
                  </div>
                )}
                {orderedProd.length > 0 && (
                  <div className="w-full">
                    <div className="mb-1.5 text-[10px] text-muted-2">คิวผลิต</div>
                    <div className="flex flex-wrap gap-1.5">
                      {orderedProd.map(([id, s]) => (
                        <StatusChip key={id} id={id} s={s} group="prod"
                          active={filterStatus === id}
                          onToggle={() => setFilterStatus(filterStatus === id ? "all" : id)}
                          dragRef={dragChip} onReorder={reorderChips}
                        />
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
        {loading ? (
          <div className="flex items-center justify-center py-24 text-muted">
            <Loader2 className="mr-2 h-5 w-5 animate-spin" />
            กำลังโหลด…
          </div>
        ) : (
          <>
          {/* Mobile card list (< 720px) */}
          <div className="flex flex-col gap-2 min-[720px]:hidden">
            {displayedOrders.length === 0 ? (
              <div className="py-12 text-center text-sm text-muted">
                {orders.length === 0
                  ? "ยังไม่มีออเดอร์"
                  : <span>ไม่พบรายการ — <button onClick={clearFilters} className="text-accent hover:underline">ล้างตัวกรอง</button></span>}
              </div>
            ) : displayedOrders.map((o) => {
              const s = deriveStatus(o, designMap, prodMap);
              const balance = orderBalance(o);
              return (
                <Link key={o.id} href={`/orders/${o.id}`}>
                  <div
                    className="rounded-[var(--radius-lg)] border border-border bg-surface p-4 transition-colors active:bg-surface-2"
                    style={s.accent && s.accent !== "#666" ? { borderLeft: `3px solid ${s.accent}`, backgroundColor: `color-mix(in srgb, ${s.accent} 3%, var(--color-surface))` } : {}}
                  >
                    <div className="flex items-start justify-between gap-2 mb-2">
                      <div className="min-w-0">
                        <div className="font-semibold truncate">{o.teamName}</div>
                        <div className="font-mono text-xs text-muted mt-0.5">{o.id}</div>
                      </div>
                      <StatusCell order={o} onSave={(field, value) => onUpdateQueueStatus(o.id, field, value)} designMap={designMap} prodMap={prodMap} />
                    </div>
                    <div className="flex items-center justify-between text-xs text-muted">
                      <div className="flex items-center gap-2">
                        <Badge tone={o.type === "design" ? "info" : o.type === "produce" ? "purple" : "accent"}>
                          {CUSTOMER_TYPE_LABEL[o.type]}
                        </Badge>
                        {o.quantity != null && <span>{o.quantity} ตัว</span>}
                        {o.startDate && <span>{formatDate(o.startDate)}</span>}
                      </div>
                      <div className="text-right font-medium">
                        {balance > 0
                          ? <span className="text-warn">{formatBaht(balance)}</span>
                          : <span className="text-success text-xs">ชำระครบ</span>}
                      </div>
                    </div>
                  </div>
                </Link>
              );
            })}
          </div>

          {/* Desktop card list — hidden on mobile, visible at 720px+ */}
          <div className="hidden min-[720px]:flex flex-col gap-2">
            {displayedOrders.length === 0 ? (
              <div className="py-12 text-center text-sm text-muted">
                {orders.length === 0
                  ? <>ยังไม่มีออเดอร์ — กดปุ่ม &ldquo;เพิ่มออเดอร์&rdquo; เพื่อเริ่มต้น</>
                  : <span>ไม่พบรายการที่ตรงกับเงื่อนไข — <button onClick={clearFilters} className="text-accent hover:underline">ล้างตัวกรอง</button></span>}
              </div>
            ) : displayedOrders.map((o) => {
              const s = deriveStatus(o, designMap, prodMap);
              const balance = orderBalance(o);
              return (
                <div
                  key={o.id}
                  className="group relative rounded-[var(--radius-lg)] border border-border bg-surface px-5 py-4 transition-colors hover:bg-surface-2"
                  style={s.accent && s.accent !== "#666" ? { borderLeft: `3px solid ${s.accent}`, backgroundColor: `color-mix(in srgb, ${s.accent} 3%, var(--color-surface))` } : {}}
                  onMouseMove={e => (o.shirtType || o.fabricType || o.collarType) && setTooltip({ order: o, x: e.clientX, y: e.clientY })}
                  onMouseLeave={() => setTooltip(null)}
                >
                  {/* Row 1: ID + team name + status + delete */}
                  <div className="flex items-center gap-3 mb-2">
                    <Link href={`/orders/${o.id}`} className="font-mono text-xs text-accent hover:underline shrink-0">
                      {o.id}
                    </Link>
                    <div className="flex items-center gap-1.5 min-w-0 flex-1">
                      <Link href={`/orders/${o.id}`} className="font-semibold hover:text-accent truncate">
                        {o.teamName}
                      </Link>
                      {hasTableUpdate(o.id) && <span className="h-2 w-2 rounded-full bg-warn shrink-0" title="มีข้อมูลอัพเดทในตารางสั่งผลิต" />}
                      {hasSlipPending(o.id) && <span className="h-2 w-2 rounded-full bg-yellow-400 shrink-0" title="มีสลิปรอตรวจสอบ" />}
                    </div>
                    <StatusCell order={o} onSave={(field, value) => onUpdateQueueStatus(o.id, field, value)} designMap={designMap} prodMap={prodMap} />
                    <button
                      onClick={() => onDelete(o.id)}
                      className="invisible group-hover:visible rounded p-1 text-muted hover:bg-red-50 hover:text-red-500 transition-colors"
                      title="ลบออเดอร์"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                  {/* Row 2: meta + financials */}
                  <div className="flex items-center gap-4 text-xs text-muted">
                    <Badge tone={o.type === "design" ? "info" : o.type === "produce" ? "purple" : "accent"}>
                      {CUSTOMER_TYPE_LABEL[o.type]}
                    </Badge>
                    {o.shirtType && <span>{o.shirtType}</span>}
                    {o.quantity != null && <span>{o.quantity} ตัว</span>}
                    <DateCell date={o.startDate} onSave={d => onUpdateDate(o.id, d)} />
                    <div className="ml-auto flex items-center gap-4">
                      <span className="text-muted-2">รวม <span className="font-semibold text-foreground">{formatBaht(orderTotal(o))}</span></span>
                      <span className="text-muted-2">มัดจำ <span className="text-muted">{formatBaht(o.deposit)}</span></span>
                      <span>
                        {balance > 0
                          ? <span className="font-semibold text-warn">คงเหลือ {formatBaht(balance)}</span>
                          : <span className="text-success">ชำระครบ</span>}
                      </span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
          </>
        )}
      </div>

      <AddOrderModal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        onCreated={onCreated}
      />


      {sheetsModalOpen && (
        <ImportSheetsModal
          onClose={() => setSheetsModalOpen(false)}
          onImported={(newOrders) => {
            setOrders((prev) => [...newOrders, ...prev]);
            setSheetsModalOpen(false);
          }}
        />
      )}

      {tooltip && (
        <div
          className="pointer-events-none fixed z-50 rounded-[var(--radius-md)] border border-border bg-surface px-4 py-3 shadow-xl"
          style={{ left: tooltip.x + 16, top: tooltip.y + 16 }}
        >
          <div className="flex flex-col gap-2 text-sm">
            {tooltip.order.shirtType && (
              <div className="flex items-center gap-3">
                <span className="w-8 shrink-0 text-xs text-muted-2">เสื้อ</span>
                <span className="font-medium text-foreground">{tooltip.order.shirtType}</span>
              </div>
            )}
            {tooltip.order.fabricType && (
              <div className="flex items-center gap-3">
                <span className="w-8 shrink-0 text-xs text-muted-2">ผ้า</span>
                <span className="font-medium text-foreground">{tooltip.order.fabricType}</span>
              </div>
            )}
            {tooltip.order.collarType && (
              <div className="flex items-center gap-3">
                <span className="w-8 shrink-0 text-xs text-muted-2">คอ</span>
                <span className="font-medium text-foreground">{tooltip.order.collarType}</span>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

// ── StatusChip (draggable filter chip) ────────────────────────
function StatusChip({ id, s, group, active, onToggle, dragRef, onReorder }: {
  id: string;
  s: ColStatus;
  group: "design" | "prod";
  active: boolean;
  onToggle: () => void;
  dragRef: React.MutableRefObject<{ id: string; group: "design" | "prod" } | null>;
  onReorder: (group: "design" | "prod", fromId: string, toId: string) => void;
}) {
  const [dragging, setDragging] = useState(false);
  const [over, setOver] = useState(false);

  return (
    <div
      draggable
      onDragStart={e => { dragRef.current = { id, group }; setDragging(true); e.dataTransfer.effectAllowed = "move"; }}
      onDragEnd={() => { setDragging(false); setOver(false); }}
      onDragOver={e => { e.preventDefault(); if (dragRef.current?.group === group) setOver(true); }}
      onDragLeave={() => setOver(false)}
      onDrop={e => {
        e.preventDefault(); setOver(false);
        if (dragRef.current && dragRef.current.group === group) onReorder(group, dragRef.current.id, id);
        dragRef.current = null;
      }}
      className={`rounded-full border text-xs font-medium transition-all cursor-grab active:cursor-grabbing select-none
        ${dragging ? "opacity-30 scale-95" : ""}
        ${over ? "ring-2 ring-offset-1 ring-accent/50" : ""}
      `}
      style={active ? {
        color: s.accent,
        backgroundColor: `color-mix(in srgb, ${s.accent} 18%, transparent)`,
        borderColor: `color-mix(in srgb, ${s.accent} 45%, transparent)`,
      } : {
        color: s.accent,
        backgroundColor: `color-mix(in srgb, ${s.accent} 8%, transparent)`,
        borderColor: `color-mix(in srgb, ${s.accent} 20%, transparent)`,
        opacity: 0.75,
      }}
    >
      <button
        onClick={onToggle}
        className="inline-flex items-center gap-1 px-2.5 py-1"
        style={{ color: "inherit" }}
      >
        <span className="h-1.5 w-1.5 rounded-full shrink-0" style={{ backgroundColor: s.accent }} />
        {s.label}
        {active && <X className="h-2.5 w-2.5 ml-0.5" />}
      </button>
    </div>
  );
}

// ── ColorDot ──────────────────────────────────────────────────
function ColorDot({ color, onSelect }: { color?: string; onSelect: (c: string) => void }) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [open]);

  return (
    <div className="relative flex-shrink-0" ref={ref}>
      <button
        onClick={(e) => { e.preventDefault(); e.stopPropagation(); setOpen((v) => !v); }}
        className="h-3 w-3 rounded-full border border-border/60 transition-transform hover:scale-125 flex-shrink-0 opacity-30 group-hover:opacity-100"
        style={{ backgroundColor: color || "transparent", boxShadow: color ? `0 0 0 1px ${color}50` : undefined, opacity: color ? 1 : undefined }}
        title="เลือกสีรายการ"
      />
      {open && (
        <div className="absolute left-0 top-5 z-50 rounded-[var(--radius-md)] border border-border bg-surface p-2 shadow-xl flex gap-1.5 flex-wrap w-44">
          {GROUP_COLORS.map((c) => (
            <button
              key={c.value}
              onClick={(e) => { e.stopPropagation(); onSelect(c.value); setOpen(false); }}
              title={c.label}
              className="h-5 w-5 rounded-full border-2 transition-transform hover:scale-110 flex-shrink-0"
              style={{
                backgroundColor: c.value || "transparent",
                borderColor: c.value || "var(--color-border)",
                outline: color === c.value ? `2px solid ${c.value || "var(--color-muted)"}` : "none",
                outlineOffset: "2px",
              }}
            />
          ))}
        </div>
      )}
    </div>
  );
}

function DateCell({ date, onSave }: { date: string; onSave: (d: string) => void }) {
  const [editing, setEditing] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const start = () => {
    setEditing(true);
    setTimeout(() => inputRef.current?.showPicker?.(), 50);
  };

  const commit = (val: string) => {
    if (val) onSave(val);
    setEditing(false);
  };

  if (editing) {
    return (
      <input
        ref={inputRef}
        type="date"
        autoFocus
        defaultValue={date?.slice(0, 10)}
        onChange={e => { if (e.target.value) commit(e.target.value); }}
        onBlur={e => commit(e.target.value)}
        className="w-28 rounded bg-surface-3 px-1 py-0.5 text-center text-sm text-foreground outline-none [color-scheme:dark] [&::-webkit-calendar-picker-indicator]:hidden"
      />
    );
  }

  return (
    <span
      onDoubleClick={start}
      title="ดับเบิ้ลคลิกเพื่อแก้ไข"
      className="cursor-pointer select-none rounded px-2 py-0.5 hover:bg-surface-3"
    >
      {formatDate(date)}
    </span>
  );
}

// ── Import from Sheets Modal ────────────────────────────────
type ImportRow = Partial<Order>;
type PlayerRow = { name: string; size: string; number: string };

function ImportSheetsModal({
  onClose,
  onImported,
}: {
  onClose: () => void;
  onImported: (orders: Order[]) => void;
}) {
  const [mode, setMode] = useState<"orders" | "production">("production");
  const [url, setUrl] = useState("");
  const [fetching, setFetching] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [importing, setImporting] = useState(false);

  const [rows, setRows] = useState<ImportRow[] | null>(null);
  const [players, setPlayers] = useState<PlayerRow[] | null>(null);
  const [detectedFabric, setDetectedFabric] = useState("");
  const [detectedShirt, setDetectedShirt] = useState("");
  const [detectedCollar, setDetectedCollar] = useState("");
  const [teamName, setTeamName] = useState("");
  const [shirtType, setShirtType] = useState("");
  const [fabricType, setFabricType] = useState("");
  const [collarType, setCollarType] = useState("");

  const resetData = () => { setRows(null); setPlayers(null); setError(null); setDetectedCollar(""); setCollarType(""); };

  async function handleFetch(e: React.FormEvent) {
    e.preventDefault();
    setFetching(true);
    resetData();

    const endpoint = mode === "production"
      ? `/api/import/production-sheet?url=${encodeURIComponent(url)}`
      : `/api/import/sheets?url=${encodeURIComponent(url)}`;

    const res = await fetch(endpoint);
    const data = await res.json();

    if (!res.ok || data.error) {
      setError(data.error ?? "เกิดข้อผิดพลาด");
    } else if (mode === "production") {
      setPlayers(data.players);
      setDetectedFabric(data.detectedFabric ?? "");
      setDetectedShirt(data.detectedShirt ?? "");
      setDetectedCollar(data.detectedCollar ?? "");
      setShirtType(data.detectedShirt ?? "");
      setFabricType(data.detectedFabric ?? "");
      setCollarType(data.detectedCollar ?? "");
      if (data.sheetTitle) setTeamName(data.sheetTitle);
    } else {
      setRows(data.rows);
    }
    setFetching(false);
  }

  async function handleImportOrders() {
    if (!rows?.length) return;
    setImporting(true);
    const created: Order[] = [];
    for (const row of rows) {
      const res = await fetch("/api/orders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(row),
      });
      const data = await res.json();
      if (res.ok && data.order) created.push(data.order);
    }
    setImporting(false);
    notifyOrdersUpdated();
    onImported(created);
  }

  async function handleImportProduction() {
    if (!players) return;
    setImporting(true);
    const orderPayload = {
      type: "produce",
      teamName,
      shirtType,
      fabricType,
      collarType,
      productionPrice: 0,
      deposit: 0,
      quantity: players.length,
      cost: { fabric: 0, paper: 0, ink: 0, cut: 0, sew: 0, other: 0 },
      startDate: new Date().toISOString().slice(0, 10),
    };
    const orderRes = await fetch("/api/orders", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(orderPayload),
    });
    const orderData = await orderRes.json();
    if (!orderRes.ok || !orderData.order) {
      setError("สร้างออเดอร์ไม่ได้");
      setImporting(false);
      return;
    }
    const newOrder: Order = orderData.order;
    const prodRes = await fetch(`/api/production/${newOrder.id}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        meta: { fabric: fabricType, collar: collarType, imageUrl: null },
        players: players.map((p, i) => ({
          id: i + 1,
          position: i + 1,
          name: p.name,
          size: p.size,
          number: p.number,
          checked: false,
          note: "",
          status: "",
        })),
      }),
    });
    if (prodRes.ok) {
      await fetch(`/api/orders/${newOrder.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          hasProductionTable: true,
          productionTableNew: true,
          productionStatus: "summary",
        }),
      });
    }
    setImporting(false);
    notifyOrdersUpdated();
    onImported([newOrder]);
  }

  const fieldCls = "w-full rounded-[var(--radius-md)] border border-border bg-surface-2 px-3 py-2 text-sm text-foreground placeholder:text-muted-2 focus:border-accent focus:outline-none";

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
      <div className="w-full max-w-3xl rounded-[var(--radius-lg)] border border-border bg-surface shadow-2xl flex flex-col max-h-[90vh]">
        <div className="flex items-center justify-between border-b border-border px-6 py-4 shrink-0">
          <div className="flex items-center gap-2">
            <FileSpreadsheet className="h-5 w-5 text-accent" />
            <span className="font-semibold">สร้างออเดอร์จาก Google Sheets</span>
          </div>
          <button onClick={onClose} className="text-muted hover:text-foreground"><X className="h-4 w-4" /></button>
        </div>

        <div className="overflow-y-auto p-6 space-y-5">
          <div className="flex gap-1 rounded-[var(--radius-md)] border border-border bg-surface-2 p-1">
            {(["production", "orders"] as const).map((m) => (
              <button key={m} type="button"
                onClick={() => { setMode(m); resetData(); setUrl(""); }}
                className={`flex-1 rounded-[var(--radius-sm)] px-3 py-1.5 text-xs font-medium transition-colors ${mode === m ? "bg-surface text-foreground shadow-sm" : "text-muted hover:text-foreground"}`}>
                {m === "production" ? "ตารางสั่งผลิต (ชื่อ + ไซส์)" : "รายการออเดอร์หลายรายการ"}
              </button>
            ))}
          </div>

          <div>
            <p className="text-xs text-muted mb-2">
              {mode === "production"
                ? "วาง URL ตารางสั่งผลิต WINX (Google Sheets สาธารณะ)"
                : "วาง URL Google Sheets ที่มีหัวคอลัมน์ ชื่อทีม / ประเภท / ทรงเสื้อ …"}
            </p>
            <form onSubmit={handleFetch} className="flex gap-2">
              <input value={url} onChange={(e) => setUrl(e.target.value)}
                placeholder="https://docs.google.com/spreadsheets/d/..."
                className="flex-1 rounded-[var(--radius-md)] border border-border bg-surface-2 px-3 py-2 text-sm text-foreground placeholder:text-muted-2 focus:border-accent focus:outline-none"
                required />
              <Button type="submit" disabled={fetching || !url.trim()}>
                {fetching ? <Loader2 className="h-4 w-4 animate-spin" /> : <FileSpreadsheet className="h-4 w-4" />}
                {fetching ? "กำลังดึง…" : "ดึงข้อมูล"}
              </Button>
            </form>
          </div>

          {error && (
            <div className="flex items-center gap-2 rounded-[var(--radius-md)] border border-danger/30 bg-danger/10 px-4 py-3 text-sm text-danger">
              <AlertCircle className="h-4 w-4 shrink-0" />{error}
            </div>
          )}

          {mode === "production" && players !== null && (
            <div className="space-y-4">
              <p className="text-sm font-medium">
                พบผู้เล่น <span className="text-accent">{players.length} คน</span> — กรอกข้อมูลออเดอร์แล้วนำเข้า
              </p>
              <div className="grid grid-cols-2 gap-3 text-sm">
                <div className="col-span-2">
                  <label className="text-xs text-muted-2 mb-1 block">ชื่อทีม *</label>
                  <input className={fieldCls} value={teamName} onChange={e => setTeamName(e.target.value)} placeholder="ชื่อทีม" />
                </div>
                <div>
                  <label className="text-xs text-muted-2 mb-1 block">ทรงเสื้อ {detectedShirt && <span className="text-accent">(ตรวจพบ: {detectedShirt})</span>}</label>
                  <input className={fieldCls} value={shirtType} onChange={e => setShirtType(e.target.value)} placeholder="เช่น Basic Jersey" />
                </div>
                <div>
                  <label className="text-xs text-muted-2 mb-1 block">เนื้อผ้า {detectedFabric && <span className="text-accent">(ตรวจพบ: {detectedFabric})</span>}</label>
                  <input className={fieldCls} value={fabricType} onChange={e => setFabricType(e.target.value)} placeholder="เช่น เม็ดข้าวสาร 150 แกรม" />
                </div>
                <div>
                  <label className="text-xs text-muted-2 mb-1 block">ประเภทคอ {detectedCollar && <span className="text-accent">(ตรวจพบ: {detectedCollar})</span>}</label>
                  <input className={fieldCls} value={collarType} onChange={e => setCollarType(e.target.value)} placeholder="เช่น คอกลม, คอวี" />
                </div>
              </div>
              {players.length > 0 && (
                <div className="overflow-x-auto rounded-[var(--radius-md)] border border-border max-h-52">
                  <table className="w-full text-sm border-collapse">
                    <thead className="sticky top-0">
                      <tr className="border-b border-border bg-surface-2 text-left text-xs text-muted">
                        <th className="px-4 py-2 font-medium w-10">#</th>
                        <th className="px-4 py-2 font-medium">ชื่อ</th>
                        <th className="px-4 py-2 font-medium">ไซส์</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border">
                      {players.map((p, i) => (
                        <tr key={i} className={i % 2 === 1 ? "bg-surface-2" : ""}>
                          <td className="px-4 py-2 text-muted">{p.number || i + 1}</td>
                          <td className="px-4 py-2">{p.name}</td>
                          <td className="px-4 py-2"><span className="rounded bg-surface-2 px-2 py-0.5 text-xs font-medium">{p.size}</span></td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
              <div className="flex justify-end">
                <Button onClick={handleImportProduction} disabled={importing || !teamName.trim()}>
                  {importing ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />}
                  {importing ? "กำลังสร้าง…" : players.length > 0 ? `สร้างออเดอร์ + นำเข้า ${players.length} คน` : "สร้างออเดอร์เปล่า"}
                </Button>
              </div>
            </div>
          )}

          {mode === "orders" && rows !== null && (
            <div>
              <div className="flex items-center justify-between mb-3">
                <p className="text-sm font-medium">พบ <span className="text-accent">{rows.length} รายการ</span></p>
                <Button onClick={handleImportOrders} disabled={importing || rows.length === 0}>
                  {importing ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />}
                  {importing ? "กำลังนำเข้า…" : `นำเข้า ${rows.length} ออเดอร์`}
                </Button>
              </div>
              <div className="overflow-x-auto rounded-[var(--radius-md)] border border-border">
                <table className="w-full text-sm border-collapse">
                  <thead>
                    <tr className="border-b border-border bg-surface-2 text-left text-xs text-muted">
                      <th className="px-4 py-2.5 font-medium">ชื่อทีม</th>
                      <th className="px-4 py-2.5 font-medium">ประเภท</th>
                      <th className="px-4 py-2.5 font-medium">ทรงเสื้อ</th>
                      <th className="px-4 py-2.5 font-medium">จำนวน</th>
                      <th className="px-4 py-2.5 font-medium">ราคาผลิต</th>
                      <th className="px-4 py-2.5 font-medium">มัดจำ</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {rows.map((r, i) => (
                      <tr key={i} className={i % 2 === 1 ? "bg-surface-2" : ""}>
                        <td className="px-4 py-2.5 font-medium">{r.teamName ?? "—"}</td>
                        <td className="px-4 py-2.5">{r.type ? <Badge tone={r.type === "design" ? "info" : r.type === "produce" ? "purple" : "accent"}>{CUSTOMER_TYPE_LABEL[r.type]}</Badge> : "—"}</td>
                        <td className="px-4 py-2.5 text-muted">{r.shirtType ?? "—"}</td>
                        <td className="px-4 py-2.5">{r.quantity ?? "—"}</td>
                        <td className="px-4 py-2.5">{r.productionPrice != null ? `฿${r.productionPrice.toLocaleString()}` : "—"}</td>
                        <td className="px-4 py-2.5">{r.deposit != null ? `฿${r.deposit.toLocaleString()}` : "฿0"}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>

        <div className="border-t border-border px-6 py-3 shrink-0 flex justify-end">
          <button onClick={onClose} className="rounded-md border border-border px-4 py-2 text-sm text-muted hover:bg-surface-2">
            ปิด
          </button>
        </div>
      </div>
    </div>
  );
}
