"use client";

import { useEffect, useRef, useState } from "react";
import { PageHeader, Button } from "@/components/ui";
import { Plus, X, Loader2, Pencil, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";

// ────────────────────────────────────────────────────────────
// Fabrics section
// ────────────────────────────────────────────────────────────

interface FabricVariant { name: string }
interface Fabric { id: string; name: string; variants: FabricVariant[] }

function FabricChip({ name, onRemove }: { name: string; onRemove: () => void }) {
  return (
    <div className="group flex items-center gap-1.5 rounded-[var(--radius-md)] border border-border bg-surface-2 pl-3 pr-2 py-2 text-sm font-medium">
      {name}
      <button onClick={onRemove} className="text-muted-2 hover:text-danger transition-colors opacity-0 group-hover:opacity-100">
        <X className="h-3.5 w-3.5" />
      </button>
    </div>
  );
}

function FabricCard({ fabric, index, onAdd, onRemove, onRename }: { fabric: Fabric; index: number; onAdd: (name: string) => void; onRemove: (name: string) => void; onRename: (name: string) => void }) {
  const [adding, setAdding] = useState(false);
  const [value, setValue] = useState("");
  const [editing, setEditing] = useState(false);
  const [editName, setEditName] = useState(fabric.name);
  const inputRef = useRef<HTMLInputElement>(null);
  const editRef = useRef<HTMLInputElement>(null);

  function submit() {
    if (!value.trim()) return;
    onAdd(value);
    setValue("");
    setAdding(false);
  }

  function submitRename() {
    if (editName.trim() && editName.trim() !== fabric.name) onRename(editName.trim());
    setEditing(false);
  }

  return (
    <div className="rounded-[var(--radius-lg)] border border-border bg-surface overflow-hidden">
      <div className="flex items-center gap-4 border-b border-border bg-surface-2 px-6 py-4">
        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-[var(--radius-md)] bg-accent-soft text-accent text-sm font-bold">{index + 1}</div>
        <div className="flex-1 min-w-0">
          {editing ? (
            <input
              ref={editRef}
              className="w-full rounded-[var(--radius-md)] border border-accent bg-surface px-2 py-1 text-base font-bold outline-none"
              value={editName}
              onChange={e => setEditName(e.target.value)}
              onKeyDown={e => { if (e.key === "Enter") submitRename(); if (e.key === "Escape") { setEditing(false); setEditName(fabric.name); } }}
              onBlur={submitRename}
              autoFocus
            />
          ) : (
            <>
              <h2 className="font-bold text-base">{fabric.name}</h2>
              {fabric.variants.length > 0 && <p className="text-xs text-muted mt-0.5">{fabric.variants.length} แบบ</p>}
            </>
          )}
        </div>
        <button
          onClick={() => { setEditing(true); setEditName(fabric.name); setTimeout(() => editRef.current?.focus(), 50); }}
          className="flex items-center gap-1.5 rounded-[var(--radius-md)] border border-border px-2.5 py-1 text-xs text-muted hover:bg-surface-3 hover:text-foreground transition-colors shrink-0"
        >
          <Pencil className="h-3 w-3" /> แก้ไข
        </button>
      </div>
      <div className="p-5">
        <div className="flex flex-wrap gap-2">
          {fabric.variants.map(v => (
            <FabricChip key={v.name} name={v.name} onRemove={() => onRemove(v.name)} />
          ))}
          {adding ? (
            <div className="flex items-center gap-1.5 rounded-[var(--radius-md)] border border-accent bg-accent-soft pl-3 pr-2 py-2">
              <input
                ref={inputRef}
                value={value}
                onChange={e => setValue(e.target.value)}
                onKeyDown={e => { if (e.key === "Enter") submit(); if (e.key === "Escape") { setAdding(false); setValue(""); } }}
                onBlur={() => submit()}
                placeholder="ชื่อแบบผ้า"
                className="w-28 bg-transparent text-sm outline-none placeholder:text-accent/50 text-accent"
              />
              <button onClick={() => { setAdding(false); setValue(""); }} className="text-accent/60 hover:text-accent"><X className="h-3.5 w-3.5" /></button>
            </div>
          ) : (
            <button onClick={() => { setAdding(true); setTimeout(() => inputRef.current?.focus(), 50); }}
              className="flex items-center gap-1.5 rounded-[var(--radius-md)] border border-dashed border-border px-3 py-2 text-sm text-muted hover:border-accent hover:text-accent transition-colors">
              <Plus className="h-3.5 w-3.5" /> เพิ่มแบบ
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

function FabricsTab() {
  const [fabrics, setFabrics] = useState<Fabric[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/fabrics").then(r => r.json()).then(d => { setFabrics(d); setLoading(false); });
  }, []);

  async function saveFabrics(updated: Fabric[]) {
    setFabrics(updated);
    await fetch("/api/fabrics", { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify(updated) });
  }

  if (loading) return <div className="flex items-center justify-center py-24 text-muted"><Loader2 className="mr-2 h-5 w-5 animate-spin" /> กำลังโหลด…</div>;

  return (
    <div className="space-y-4">
      {fabrics.map((f, i) => (
        <FabricCard
          key={f.id}
          fabric={f}
          index={i}
          onAdd={(name) => saveFabrics(fabrics.map(x => x.id === f.id ? { ...x, variants: [...x.variants, { name: name.trim() }] } : x))}
          onRemove={(name) => saveFabrics(fabrics.map(x => x.id === f.id ? { ...x, variants: x.variants.filter(v => v.name !== name) } : x))}
          onRename={(name) => saveFabrics(fabrics.map(x => x.id === f.id ? { ...x, name } : x))}
        />
      ))}
    </div>
  );
}

// ────────────────────────────────────────────────────────────
// Types
// ────────────────────────────────────────────────────────────

interface Option {
  name: string;
  price: number;
  patternPieces?: number;
}

interface PricingTier {
  minQty: number;
  maxQty: number;
  basePrice: number;
}

interface SizeRow {
  label: string;
  values: string[];
}

interface SizeChart {
  sizes: string[];
  rows: SizeRow[];
  unit: string;
}

interface ShirtStyle {
  id: string;
  name: string;
  pricing: PricingTier[];
  collars: Option[];
  fabrics: Option[];
  sizeChart?: SizeChart;
}

const DEFAULT_SIZES = ["S", "M", "L", "XL", "2XL", "3XL"];
const DEFAULT_SIZE_CHART: SizeChart = {
  sizes: DEFAULT_SIZES,
  rows: [
    { label: "อกเสื้อ", values: ["", "", "", "", "", ""] },
    { label: "ความยาวเสื้อ", values: ["", "", "", "", "", ""] },
    { label: "ไหล่", values: ["", "", "", "", "", ""] },
    { label: "แขน", values: ["", "", "", "", "", ""] },
  ],
  unit: "นิ้ว",
};

// ────────────────────────────────────────────────────────────
// Display tabs
// ────────────────────────────────────────────────────────────

type TabId = "price" | "size" | "fabric";

function PricingTable({ tiers, fabrics }: { tiers: PricingTier[]; fabrics: Option[] }) {
  return (
    <div className="overflow-hidden rounded-[var(--radius-md)] border border-border">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-border bg-surface-2 text-left text-xs text-muted">
            <th className="px-3 py-2 font-medium">จำนวนตัว</th>
            {fabrics.map((f) => (
              <th key={f.name} className="px-3 py-2 font-medium text-right whitespace-nowrap">
                {f.name}
                {f.price > 0 && <span className="ml-1 text-warn">(+{f.price})</span>}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-border">
          {tiers.map((tier) => (
            <tr key={tier.minQty} className="hover:bg-surface-2">
              <td className="px-3 py-2.5 font-semibold whitespace-nowrap">{tier.minQty}–{tier.maxQty} ตัว</td>
              {fabrics.map((f) => (
                <td key={f.name} className="px-3 py-2.5 text-right">
                  <span className={f.price > 0 ? "text-muted" : "font-semibold"}>
                    {(tier.basePrice + f.price).toLocaleString()}
                  </span>
                  <span className="ml-1 text-muted text-xs">฿</span>
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function SizeChartDisplay({ chart }: { chart: SizeChart }) {
  if (!chart.rows.length) return <p className="text-sm text-muted">ยังไม่มีข้อมูลตารางไซส์</p>;
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-xs border-collapse min-w-[320px]">
        <thead>
          <tr className="bg-surface-2">
            <th className="border border-border px-3 py-2 text-left font-medium text-muted whitespace-nowrap">
              ส่วนวัด ({chart.unit})
            </th>
            {chart.sizes.map((s) => (
              <th key={s} className="border border-border px-3 py-2 font-medium text-center">{s}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {chart.rows.map((row) => (
            <tr key={row.label} className="even:bg-surface-2">
              <td className="border border-border px-3 py-2 text-muted whitespace-nowrap">{row.label}</td>
              {chart.sizes.map((_, i) => (
                <td key={i} className="border border-border px-3 py-2 text-center">
                  {row.values[i] || "–"}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
      <p className="mt-1.5 text-[10px] text-muted-2">* ขนาดตัวเสื้อ (ไม่ใช่ขนาดตัวคน) · วัดแบบแบนราบ</p>
    </div>
  );
}

function FabricCollarDisplay({ collars, fabrics }: { collars: Option[]; fabrics: Option[] }) {
  return (
    <div className="space-y-4">
      <div>
        <p className="mb-2 text-xs font-semibold uppercase tracking-widest text-muted-2">คอเสื้อ</p>
        <div className="flex flex-wrap gap-2">
          {collars.map((c) => (
            <div key={c.name} className="flex items-center gap-2 rounded-[var(--radius-md)] border border-border bg-surface-2 px-3 py-1.5">
              <span className="text-sm font-medium">{c.name}</span>
              {c.patternPieces !== undefined && (
                <span className="text-xs text-muted-2">{c.patternPieces} ชิ้น</span>
              )}
              {c.price > 0
                ? <span className="rounded-full bg-warn/10 border border-warn/30 px-2 py-0.5 text-[10px] font-semibold text-warn">+{c.price} ฿</span>
                : <span className="rounded-full bg-surface-3 border border-border px-2 py-0.5 text-[10px] text-muted">มาตรฐาน</span>
              }
            </div>
          ))}
        </div>
      </div>
      <div>
        <p className="mb-2 text-xs font-semibold uppercase tracking-widest text-muted-2">เนื้อผ้า</p>
        <div className="flex flex-wrap gap-2">
          {fabrics.map((f) => (
            <div key={f.name} className="flex items-center gap-2 rounded-[var(--radius-md)] border border-border bg-surface-2 px-3 py-1.5">
              <span className="text-sm font-medium">{f.name}</span>
              {f.price > 0
                ? <span className="rounded-full bg-warn/10 border border-warn/30 px-2 py-0.5 text-[10px] font-semibold text-warn">+{f.price} ฿</span>
                : <span className="rounded-full bg-surface-3 border border-border px-2 py-0.5 text-[10px] text-muted">มาตรฐาน</span>
              }
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// ────────────────────────────────────────────────────────────
// Accordion card
// ────────────────────────────────────────────────────────────

function StyleAccordion({ style, onEdit }: { style: ShirtStyle; onEdit: (s: ShirtStyle) => void }) {
  const [open, setOpen] = useState(false);
  const [tab, setTab] = useState<TabId>("price");

  const tabs: { id: TabId; label: string }[] = [
    { id: "price", label: "ราคา/ตัว" },
    { id: "size", label: "ตารางไซส์" },
    { id: "fabric", label: "ผ้า & คอ" },
  ];

  return (
    <div className={cn(
      "rounded-[var(--radius-lg)] border bg-surface overflow-hidden transition-colors",
      open ? "border-border" : "border-border"
    )}>
      {/* Header */}
      <div
        onClick={() => setOpen((v) => !v)}
        className="w-full flex items-center gap-3 px-4 py-3.5 text-left hover:bg-surface-2 transition-colors cursor-pointer"
      >
        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-[var(--radius-md)] bg-accent-soft text-accent text-sm font-black">
          {style.name[0]}
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold truncate">{style.name}</p>
          <p className="text-[11px] text-muted mt-0.5">
            {style.collars.length} คอ · {style.fabrics.length} ผ้า · {style.pricing.length} tier
          </p>
        </div>
        <button
          onClick={(e) => { e.stopPropagation(); onEdit(style); }}
          className="flex items-center gap-1 rounded-[var(--radius-md)] border border-border px-2.5 py-1 text-[11px] text-muted hover:bg-surface-3 hover:text-foreground transition-colors shrink-0"
        >
          <Pencil className="h-3 w-3" />
          แก้ไข
        </button>
        <ChevronRight className={cn("h-4 w-4 text-muted shrink-0 transition-transform duration-200", open && "rotate-90")} />
      </div>

      {/* Body */}
      {open && (
        <div className="border-t border-border">
          {/* Tabs */}
          <div className="flex border-b border-border bg-surface-2">
            {tabs.map((t) => (
              <button
                key={t.id}
                onClick={() => setTab(t.id)}
                className={cn(
                  "px-4 py-2 text-xs font-medium border-b-2 transition-colors",
                  tab === t.id
                    ? "border-accent text-accent"
                    : "border-transparent text-muted hover:text-foreground"
                )}
              >
                {t.label}
              </button>
            ))}
          </div>
          {/* Tab content */}
          <div className="p-4">
            {tab === "price" && (
              <PricingTable tiers={style.pricing} fabrics={style.fabrics} />
            )}
            {tab === "size" && (
              style.sizeChart
                ? <SizeChartDisplay chart={style.sizeChart} />
                : <p className="text-sm text-muted">ยังไม่มีข้อมูลตารางไซส์ · กด <span className="font-medium">แก้ไข</span> เพื่อเพิ่ม</p>
            )}
            {tab === "fabric" && (
              <FabricCollarDisplay collars={style.collars} fabrics={style.fabrics} />
            )}
          </div>
        </div>
      )}
    </div>
  );
}

// ────────────────────────────────────────────────────────────
// Modal — form rows
// ────────────────────────────────────────────────────────────

const LABEL = "block mb-1 text-xs font-medium text-muted-2 uppercase tracking-wide";
const INPUT = "rounded-[var(--radius-md)] border border-border bg-surface-2 px-3 py-2 text-sm outline-none focus:border-accent placeholder:text-muted-2";
const INPUT_FULL = INPUT + " w-full";

function TierRow({ tier, onChange, onRemove }: { tier: PricingTier; onChange: (v: PricingTier) => void; onRemove: () => void }) {
  return (
    <div className="flex gap-2 items-center">
      <input className={cn(INPUT, "w-20")} type="number" placeholder="ต่ำสุด"
        value={tier.minQty || ""} onChange={(e) => onChange({ ...tier, minQty: parseInt(e.target.value) || 0 })} />
      <span className="text-muted text-sm">–</span>
      <input className={cn(INPUT, "w-20")} type="number" placeholder="สูงสุด"
        value={tier.maxQty || ""} onChange={(e) => onChange({ ...tier, maxQty: parseInt(e.target.value) || 0 })} />
      <span className="text-muted text-sm">ตัว</span>
      <input className={cn(INPUT, "flex-1")} type="number" placeholder="ราคา/ตัว"
        value={tier.basePrice || ""} onChange={(e) => onChange({ ...tier, basePrice: parseFloat(e.target.value) || 0 })} />
      <span className="text-muted text-sm">฿</span>
      <button type="button" onClick={onRemove} className="text-muted hover:text-danger"><X className="h-4 w-4" /></button>
    </div>
  );
}

function CollarRow({ item, onChange, onRemove }: { item: Option; onChange: (v: Option) => void; onRemove: () => void }) {
  return (
    <div className="flex gap-2 items-center">
      <input className={cn(INPUT, "flex-1 min-w-0")} placeholder="ชื่อ"
        value={item.name} onChange={(e) => onChange({ ...item, name: e.target.value })} />
      <input className={cn(INPUT, "w-24 shrink-0")} type="number" placeholder="ราคาเพิ่ม"
        value={item.price || ""} onChange={(e) => onChange({ ...item, price: parseFloat(e.target.value) || 0 })} />
      <input className={cn(INPUT, "w-20 shrink-0")} type="number" placeholder="ชิ้น" title="จำนวนชิ้นแพทเทิร์น"
        value={item.patternPieces ?? ""} onChange={(e) => onChange({ ...item, patternPieces: parseInt(e.target.value) || undefined })} />
      <button type="button" onClick={onRemove} className="text-muted hover:text-danger"><X className="h-4 w-4" /></button>
    </div>
  );
}

interface FabricData { id: string; name: string; variants: { name: string }[] }

function FabricRow({ item, fabricOptions, onChange, onRemove }: { item: Option; fabricOptions: string[]; onChange: (v: Option) => void; onRemove: () => void }) {
  return (
    <div className="flex gap-2 items-center">
      <select className={cn(INPUT, "flex-1 min-w-0")} value={item.name}
        onChange={(e) => onChange({ ...item, name: e.target.value })}>
        <option value="">— เลือกเนื้อผ้า —</option>
        {fabricOptions.map(f => <option key={f} value={f}>{f}</option>)}
      </select>
      <input className={cn(INPUT, "w-28 shrink-0")} type="number" placeholder="ราคาเพิ่ม (฿)"
        value={item.price || ""} onChange={(e) => onChange({ ...item, price: parseFloat(e.target.value) || 0 })} />
      <button type="button" onClick={onRemove} className="text-muted hover:text-danger"><X className="h-4 w-4" /></button>
    </div>
  );
}

// ────────────────────────────────────────────────────────────
// Size chart editor
// ────────────────────────────────────────────────────────────

function SizeChartEditor({ chart, onChange }: { chart: SizeChart; onChange: (c: SizeChart) => void }) {
  const updateRow = (i: number, row: SizeRow) =>
    onChange({ ...chart, rows: chart.rows.map((r, j) => j === i ? row : r) });
  const updateCell = (rowIdx: number, colIdx: number, val: string) => {
    const newRows = chart.rows.map((r, i) => {
      if (i !== rowIdx) return r;
      const values = [...r.values];
      values[colIdx] = val;
      return { ...r, values };
    });
    onChange({ ...chart, rows: newRows });
  };
  const addRow = () =>
    onChange({ ...chart, rows: [...chart.rows, { label: "", values: chart.sizes.map(() => "") }] });
  const removeRow = (i: number) =>
    onChange({ ...chart, rows: chart.rows.filter((_, j) => j !== i) });

  return (
    <div className="space-y-3">
      {/* Unit */}
      <div className="flex items-center gap-2">
        <label className="text-xs text-muted-2">หน่วย:</label>
        <select
          className={cn(INPUT, "w-24")}
          value={chart.unit}
          onChange={(e) => onChange({ ...chart, unit: e.target.value })}
        >
          <option value="นิ้ว">นิ้ว</option>
          <option value="ซม.">ซม.</option>
        </select>
      </div>

      {/* Table */}
      <div className="overflow-x-auto rounded-[var(--radius-md)] border border-border">
        <table className="w-full text-xs border-collapse min-w-[420px]">
          <thead>
            <tr className="bg-surface-2">
              <th className="border-b border-border px-3 py-2 text-left font-medium text-muted w-32">ส่วนวัด</th>
              {chart.sizes.map((s) => (
                <th key={s} className="border-b border-border px-2 py-2 font-medium text-center w-14">{s}</th>
              ))}
              <th className="border-b border-border w-8" />
            </tr>
          </thead>
          <tbody>
            {chart.rows.map((row, ri) => (
              <tr key={ri} className="even:bg-surface-2">
                <td className="border-b border-border px-2 py-1">
                  <input
                    className={cn(INPUT, "w-full text-xs py-1 px-2")}
                    placeholder="เช่น อกเสื้อ"
                    value={row.label}
                    onChange={(e) => updateRow(ri, { ...row, label: e.target.value })}
                  />
                </td>
                {chart.sizes.map((_, ci) => (
                  <td key={ci} className="border-b border-border px-1 py-1">
                    <input
                      className={cn(INPUT, "w-full text-xs py-1 px-2 text-center")}
                      placeholder="–"
                      value={row.values[ci] ?? ""}
                      onChange={(e) => updateCell(ri, ci, e.target.value)}
                    />
                  </td>
                ))}
                <td className="border-b border-border px-1 py-1 text-center">
                  <button type="button" onClick={() => removeRow(ri)} className="text-muted hover:text-danger">
                    <X className="h-3.5 w-3.5" />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <button
        type="button"
        onClick={addRow}
        className="flex items-center gap-1 text-xs text-accent hover:underline"
      >
        <Plus className="h-3 w-3" /> เพิ่มแถว
      </button>
    </div>
  );
}

// ────────────────────────────────────────────────────────────
// Modal
// ────────────────────────────────────────────────────────────

type ModalTab = "basic" | "size";

function AddStyleModal({
  onClose, onAdded, onUpdated, editStyle,
}: {
  onClose: () => void;
  onAdded?: (s: ShirtStyle) => void;
  onUpdated?: (s: ShirtStyle) => void;
  editStyle?: ShirtStyle;
}) {
  const isEdit = !!editStyle;
  const [modalTab, setModalTab] = useState<ModalTab>("basic");
  const [name, setName] = useState(editStyle?.name ?? "");
  const [pricing, setPricing] = useState<PricingTier[]>(editStyle?.pricing ?? [{ minQty: 10, maxQty: 20, basePrice: 0 }]);
  const [collars, setCollars] = useState<Option[]>(editStyle?.collars ?? [{ name: "คอกลม", price: 0 }]);
  const [fabrics, setFabrics] = useState<Option[]>(editStyle?.fabrics ?? [{ name: "", price: 0 }]);
  const [sizeChart, setSizeChart] = useState<SizeChart>(editStyle?.sizeChart ?? DEFAULT_SIZE_CHART);
  const [fabricsData, setFabricsData] = useState<FabricData[]>([]);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetch("/api/fabrics").then(r => r.json()).then(setFabricsData).catch(() => {});
  }, []);

  const fabricOptions = fabricsData.flatMap(f =>
    f.variants.length > 0 ? f.variants.map(v => v.name) : [f.name]
  );

  const save = async () => {
    if (!name.trim()) return;
    setSaving(true);
    const body = { name: name.trim(), pricing, collars, fabrics, sizeChart };
    if (isEdit) {
      const res = await fetch(`/api/shirt-styles/${editStyle.id}`, {
        method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body),
      });
      onUpdated?.(await res.json());
    } else {
      const res = await fetch("/api/shirt-styles", {
        method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body),
      });
      onAdded?.(await res.json());
    }
    onClose();
  };

  const modalTabs: { id: ModalTab; label: string }[] = [
    { id: "basic", label: "ราคา & ผ้า & คอ" },
    { id: "size", label: "ตารางไซส์" },
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
      <div className="w-full max-w-2xl max-h-[92vh] flex flex-col rounded-[var(--radius-lg)] border border-border bg-surface shadow-xl">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-border px-6 py-4 shrink-0">
          <h2 className="text-base font-semibold">{isEdit ? `แก้ไข: ${editStyle.name}` : "เพิ่มทรงเสื้อใหม่"}</h2>
          <button onClick={onClose} className="text-muted hover:text-foreground"><X className="h-5 w-5" /></button>
        </div>
        {/* Modal tabs */}
        <div className="flex border-b border-border bg-surface-2 shrink-0">
          {modalTabs.map((t) => (
            <button key={t.id} onClick={() => setModalTab(t.id)}
              className={cn(
                "px-5 py-2.5 text-sm font-medium border-b-2 transition-colors",
                modalTab === t.id ? "border-accent text-accent" : "border-transparent text-muted hover:text-foreground"
              )}
            >
              {t.label}
            </button>
          ))}
        </div>

        {/* Body */}
        <div className="overflow-y-auto flex-1">
          {modalTab === "basic" && (
            <div className="space-y-5 p-6">
              {/* ชื่อ */}
              <div>
                <label className={LABEL}>ชื่อทรงเสื้อ *</label>
                <input className={INPUT_FULL} placeholder="เช่น ZIP" value={name} onChange={(e) => setName(e.target.value)} />
              </div>

              {/* ช่วงราคา */}
              <div>
                <label className={LABEL}>ช่วงราคา</label>
                <div className="space-y-2">
                  {pricing.map((tier, i) => (
                    <TierRow key={i} tier={tier}
                      onChange={(v) => setPricing(pricing.map((t, j) => j === i ? v : t))}
                      onRemove={() => setPricing(pricing.filter((_, j) => j !== i))} />
                  ))}
                </div>
                <button type="button" onClick={() => setPricing([...pricing, { minQty: 0, maxQty: 0, basePrice: 0 }])}
                  className="mt-2 flex items-center gap-1 text-xs text-accent hover:underline">
                  <Plus className="h-3 w-3" /> เพิ่มช่วงราคา
                </button>
              </div>

              {/* คอเสื้อ */}
              <div>
                <label className={LABEL}>คอเสื้อ</label>
                <div className="mb-2 flex gap-2 text-xs text-muted-2 pr-7">
                  <span className="flex-1">ชื่อ</span>
                  <span className="w-24 shrink-0">ราคาเพิ่ม</span>
                  <span className="w-20 shrink-0">ชิ้นแพทเทิร์น</span>
                </div>
                <div className="space-y-2">
                  {collars.map((c, i) => (
                    <CollarRow key={i} item={c}
                      onChange={(v) => setCollars(collars.map((x, j) => j === i ? v : x))}
                      onRemove={() => setCollars(collars.filter((_, j) => j !== i))} />
                  ))}
                </div>
                <button type="button" onClick={() => setCollars([...collars, { name: "", price: 0 }])}
                  className="mt-2 flex items-center gap-1 text-xs text-accent hover:underline">
                  <Plus className="h-3 w-3" /> เพิ่มแบบคอ
                </button>
              </div>

              {/* เนื้อผ้า */}
              <div>
                <label className={LABEL}>เนื้อผ้า</label>
                <p className="mb-2 text-xs text-muted-2">ราคาเพิ่ม = 0 คือมาตรฐาน</p>
                <div className="space-y-2">
                  {fabrics.map((f, i) => (
                    <FabricRow key={i} item={f} fabricOptions={fabricOptions}
                      onChange={(v) => setFabrics(fabrics.map((x, j) => j === i ? v : x))}
                      onRemove={() => setFabrics(fabrics.filter((_, j) => j !== i))} />
                  ))}
                </div>
                <button type="button" onClick={() => setFabrics([...fabrics, { name: "", price: 0 }])}
                  className="mt-2 flex items-center gap-1 text-xs text-accent hover:underline">
                  <Plus className="h-3 w-3" /> เพิ่มเนื้อผ้า
                </button>
              </div>
            </div>
          )}

          {modalTab === "size" && (
            <div className="p-6">
              <p className="mb-4 text-xs text-muted-2">กรอกขนาดตัวเสื้อ (ไม่ใช่ขนาดตัวคน) · วัดแบบแบนราบ</p>
              <SizeChartEditor chart={sizeChart} onChange={setSizeChart} />
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex justify-end gap-3 border-t border-border px-6 py-4 shrink-0">
          <Button variant="outline" onClick={onClose}>ยกเลิก</Button>
          <Button onClick={save} disabled={saving || !name.trim()}>
            {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : isEdit ? "บันทึกการแก้ไข" : "บันทึกทรงเสื้อ"}
          </Button>
        </div>
      </div>
    </div>
  );
}

// ────────────────────────────────────────────────────────────
// Page
// ────────────────────────────────────────────────────────────

type PageTab = "styles" | "fabrics";

export default function ShirtStylesPage() {
  const [pageTab, setPageTab] = useState<PageTab>("styles");
  const [styles, setStyles] = useState<ShirtStyle[]>([]);
  const [showModal, setShowModal] = useState(false);
  const [editStyle, setEditStyle] = useState<ShirtStyle | undefined>();

  useEffect(() => {
    fetch("/api/shirt-styles", { cache: "no-store" })
      .then((r) => r.json())
      .then(setStyles);
  }, []);

  const openEdit = (s: ShirtStyle) => { setEditStyle(s); setShowModal(true); };
  const closeModal = () => { setShowModal(false); setEditStyle(undefined); };

  const pageTabs: { id: PageTab; label: string }[] = [
    { id: "styles", label: "ทรงเสื้อ" },
    { id: "fabrics", label: "เนื้อผ้า" },
  ];

  return (
    <div>
      <PageHeader
        title="ข้อมูลเสื้อ"
        subtitle="ทรงเสื้อ เนื้อผ้า ราคา และตารางไซส์"
        action={
          pageTab === "styles" ? (
            <Button onClick={() => setShowModal(true)}>
              <Plus className="h-4 w-4" />
              เพิ่มทรงเสื้อ
            </Button>
          ) : null
        }
      />

      {/* Page-level tabs */}
      <div className="flex border-b border-border px-6 md:px-8 bg-surface">
        {pageTabs.map((t) => (
          <button
            key={t.id}
            onClick={() => setPageTab(t.id)}
            className={cn(
              "px-5 py-3 text-sm font-medium border-b-2 transition-colors",
              pageTab === t.id
                ? "border-accent text-accent"
                : "border-transparent text-muted hover:text-foreground"
            )}
          >
            {t.label}
          </button>
        ))}
      </div>

      <div className="p-6 md:p-8 max-w-7xl">
        {pageTab === "styles" && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {styles.map((s) => (
              <StyleAccordion key={s.id} style={s} onEdit={openEdit} />
            ))}
          </div>
        )}
        {pageTab === "fabrics" && <FabricsTab />}
      </div>

      {showModal && (
        <AddStyleModal
          onClose={closeModal}
          editStyle={editStyle}
          onAdded={(s) => setStyles((prev) => [...prev, s])}
          onUpdated={(s) => setStyles((prev) => prev.map((x) => x.id === s.id ? s : x))}
        />
      )}
    </div>
  );
}
