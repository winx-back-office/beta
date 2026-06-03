"use client";

import { useEffect, useState } from "react";
import { PageHeader, Button } from "@/components/ui";
import { Plus, X, Loader2, Pencil } from "lucide-react";
import { cn } from "@/lib/utils";

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

interface ShirtStyle {
  id: string;
  name: string;
  pricing: PricingTier[];
  collars: Option[];
  fabrics: Option[];
}

// ────────────────────────────────────────────────────────────
// Display components
// ────────────────────────────────────────────────────────────

function OptionChip({ name, price, patternPieces }: Option) {
  return (
    <div className="flex items-center justify-between gap-3 rounded-[var(--radius-md)] border border-border bg-surface-2 px-4 py-2.5">
      <div>
        <span className="text-sm font-medium">{name}</span>
        {patternPieces !== undefined && (
          <div className="text-xs text-muted-2 mt-0.5">{patternPieces} ชิ้นแพทเทิร์น</div>
        )}
      </div>
      {price > 0 ? (
        <span className="rounded-full bg-warn/10 border border-warn/30 px-2.5 py-0.5 text-xs font-semibold text-warn">
          +{price} บาท
        </span>
      ) : (
        <span className="rounded-full bg-surface-3 border border-border px-2.5 py-0.5 text-xs text-muted">
          มาตรฐาน
        </span>
      )}
    </div>
  );
}

function Section({ title, options }: { title: string; options: Option[] }) {
  return (
    <div>
      <h3 className="mb-3 text-xs font-semibold uppercase tracking-widest text-muted-2">{title}</h3>
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
        {options.map((o) => <OptionChip key={o.name} {...o} />)}
      </div>
    </div>
  );
}

function PricingTable({ tiers, fabrics }: { tiers: PricingTier[]; fabrics: Option[] }) {
  return (
    <div>
      <h3 className="mb-3 text-xs font-semibold uppercase tracking-widest text-muted-2">ราคา/ตัว</h3>
      <div className="overflow-hidden rounded-[var(--radius-md)] border border-border">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border bg-surface-2 text-left text-xs text-muted">
              <th className="px-4 py-2.5 font-medium">จำนวนตัว</th>
              {fabrics.map((f) => (
                <th key={f.name} className="px-4 py-2.5 font-medium text-right">
                  {f.name}{f.price > 0 && <span className="ml-1.5 text-warn">(+{f.price})</span>}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {tiers.map((tier) => (
              <tr key={tier.minQty} className="hover:bg-surface-2">
                <td className="px-4 py-3 font-semibold">{tier.minQty}–{tier.maxQty} ตัว</td>
                {fabrics.map((f) => (
                  <td key={f.name} className="px-4 py-3 text-right">
                    <span className={f.price > 0 ? "text-muted" : "font-semibold text-foreground"}>
                      {(tier.basePrice + f.price).toLocaleString()}
                    </span>
                    <span className="ml-1 text-muted text-xs">บาท</span>
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function StyleCard({ style, onEdit }: { style: ShirtStyle; onEdit: (s: ShirtStyle) => void }) {
  return (
    <div className="rounded-[var(--radius-lg)] border border-border bg-surface overflow-hidden">
      <div className="flex items-center gap-4 border-b border-border bg-surface-2 px-6 py-5">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-[var(--radius-md)] bg-accent-soft text-accent text-lg font-black">
          {style.name[0]}
        </div>
        <div className="flex-1">
          <h2 className="text-lg font-bold">{style.name}</h2>
          <p className="text-xs text-muted mt-0.5">
            {style.collars.length} แบบคอ · {style.fabrics.length} แบบผ้า · {style.pricing.length} ช่วงราคา
          </p>
        </div>
        <button
          onClick={() => onEdit(style)}
          className="flex items-center gap-1.5 rounded-[var(--radius-md)] border border-border px-3 py-1.5 text-xs text-muted hover:bg-surface-3 hover:text-foreground transition-colors"
        >
          <Pencil className="h-3.5 w-3.5" />
          แก้ไข
        </button>
      </div>
      <div className="space-y-6 p-6">
        <PricingTable tiers={style.pricing} fabrics={style.fabrics} />
        <Section title="คอเสื้อ" options={style.collars} />
        <Section title="เนื้อผ้า" options={style.fabrics} />
      </div>
    </div>
  );
}

// ────────────────────────────────────────────────────────────
// Add modal
// ────────────────────────────────────────────────────────────

const LABEL = "block mb-1 text-xs font-medium text-muted-2 uppercase tracking-wide";
const INPUT = "rounded-[var(--radius-md)] border border-border bg-surface-2 px-3 py-2 text-sm outline-none focus:border-accent placeholder:text-muted-2";
const INPUT_FULL = INPUT + " w-full";

function OptionRow({
  item,
  onChange,
  onRemove,
}: {
  item: Option;
  onChange: (v: Option) => void;
  onRemove: () => void;
}) {
  return (
    <div className="flex gap-2 items-center">
      <input
        className={cn(INPUT, "flex-1 min-w-0")}
        placeholder="ชื่อ"
        value={item.name}
        onChange={(e) => onChange({ ...item, name: e.target.value })}
      />
      <input
        className={cn(INPUT, "w-28 shrink-0")}
        type="number"
        placeholder="ราคาเพิ่ม (บาท)"
        value={item.price || ""}
        onChange={(e) => onChange({ ...item, price: parseFloat(e.target.value) || 0 })}
      />
      <button type="button" onClick={onRemove} className="text-muted hover:text-danger">
        <X className="h-4 w-4" />
      </button>
    </div>
  );
}

function CollarRow({
  item,
  onChange,
  onRemove,
}: {
  item: Option;
  onChange: (v: Option) => void;
  onRemove: () => void;
}) {
  return (
    <div className="flex gap-2 items-center">
      <input
        className={cn(INPUT, "flex-1 min-w-0")}
        placeholder="ชื่อ"
        value={item.name}
        onChange={(e) => onChange({ ...item, name: e.target.value })}
      />
      <input
        className={cn(INPUT, "w-24 shrink-0")}
        type="number"
        placeholder="ราคาเพิ่ม"
        value={item.price || ""}
        onChange={(e) => onChange({ ...item, price: parseFloat(e.target.value) || 0 })}
      />
      <input
        className={cn(INPUT, "w-20 shrink-0")}
        type="number"
        placeholder="ชิ้น"
        title="จำนวนชิ้นแพทเทิร์น"
        value={item.patternPieces ?? ""}
        onChange={(e) => onChange({ ...item, patternPieces: parseInt(e.target.value) || undefined })}
      />
      <button type="button" onClick={onRemove} className="text-muted hover:text-danger">
        <X className="h-4 w-4" />
      </button>
    </div>
  );
}

function TierRow({
  tier,
  onChange,
  onRemove,
}: {
  tier: PricingTier;
  onChange: (v: PricingTier) => void;
  onRemove: () => void;
}) {
  return (
    <div className="flex gap-2 items-center">
      <input
        className={cn(INPUT, "w-20")}
        type="number"
        placeholder="ต่ำสุด"
        value={tier.minQty || ""}
        onChange={(e) => onChange({ ...tier, minQty: parseInt(e.target.value) || 0 })}
      />
      <span className="text-muted text-sm">–</span>
      <input
        className={cn(INPUT, "w-20")}
        type="number"
        placeholder="สูงสุด"
        value={tier.maxQty || ""}
        onChange={(e) => onChange({ ...tier, maxQty: parseInt(e.target.value) || 0 })}
      />
      <span className="text-muted text-sm">ตัว</span>
      <input
        className={cn(INPUT, "flex-1")}
        type="number"
        placeholder="ราคา/ตัว"
        value={tier.basePrice || ""}
        onChange={(e) => onChange({ ...tier, basePrice: parseFloat(e.target.value) || 0 })}
      />
      <span className="text-muted text-sm">บาท</span>
      <button type="button" onClick={onRemove} className="text-muted hover:text-danger">
        <X className="h-4 w-4" />
      </button>
    </div>
  );
}

interface FabricVariant { name: string }
interface FabricData { id: string; name: string; variants: FabricVariant[] }

function FabricRow({
  item,
  fabricOptions,
  onChange,
  onRemove,
}: {
  item: Option;
  fabricOptions: string[];
  onChange: (v: Option) => void;
  onRemove: () => void;
}) {
  return (
    <div className="flex gap-2 items-center">
      <select
        className={cn(INPUT, "flex-1 min-w-0")}
        value={item.name}
        onChange={(e) => onChange({ ...item, name: e.target.value })}
      >
        <option value="">— เลือกเนื้อผ้า —</option>
        {fabricOptions.map(f => <option key={f} value={f}>{f}</option>)}
      </select>
      <input
        className={cn(INPUT, "w-28 shrink-0")}
        type="number"
        placeholder="ราคาเพิ่ม (บาท)"
        value={item.price || ""}
        onChange={(e) => onChange({ ...item, price: parseFloat(e.target.value) || 0 })}
      />
      <button type="button" onClick={onRemove} className="text-muted hover:text-danger">
        <X className="h-4 w-4" />
      </button>
    </div>
  );
}

function AddStyleModal({
  onClose,
  onAdded,
  onUpdated,
  editStyle,
}: {
  onClose: () => void;
  onAdded?: (s: ShirtStyle) => void;
  onUpdated?: (s: ShirtStyle) => void;
  editStyle?: ShirtStyle;
}) {
  const isEdit = !!editStyle;
  const [name, setName] = useState(editStyle?.name ?? "");
  const [pricing, setPricing] = useState<PricingTier[]>(editStyle?.pricing ?? [{ minQty: 10, maxQty: 20, basePrice: 0 }]);
  const [collars, setCollars] = useState<Option[]>(editStyle?.collars ?? [{ name: "คอกลม", price: 0 }]);
  const [fabrics, setFabrics] = useState<Option[]>(editStyle?.fabrics ?? [{ name: "", price: 0 }]);
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
    if (isEdit) {
      const res = await fetch(`/api/shirt-styles/${editStyle.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: name.trim(), pricing, collars, fabrics }),
      });
      const updated = await res.json();
      onUpdated?.(updated);
    } else {
      const res = await fetch("/api/shirt-styles", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: name.trim(), pricing, collars, fabrics }),
      });
      const created = await res.json();
      onAdded?.(created);
    }
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
      <div className="w-full max-w-xl max-h-[90vh] overflow-y-auto rounded-[var(--radius-lg)] border border-border bg-surface shadow-xl">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-border px-6 py-4">
          <h2 className="text-base font-semibold">{isEdit ? `แก้ไข: ${editStyle.name}` : "เพิ่มทรงเสื้อใหม่"}</h2>
          <button onClick={onClose} className="text-muted hover:text-foreground"><X className="h-5 w-5" /></button>
        </div>

        <div className="space-y-6 p-6">
          {/* ชื่อ */}
          <div>
            <label className={LABEL}>ชื่อทรงเสื้อ *</label>
            <input className={INPUT_FULL} placeholder="เช่น เสื้อกล้าม" value={name} onChange={(e) => setName(e.target.value)} />
          </div>

          {/* ช่วงราคา */}
          <div>
            <label className={LABEL}>ช่วงราคา</label>
            <div className="space-y-2">
              {pricing.map((tier, i) => (
                <TierRow
                  key={i}
                  tier={tier}
                  onChange={(v) => setPricing(pricing.map((t, j) => j === i ? v : t))}
                  onRemove={() => setPricing(pricing.filter((_, j) => j !== i))}
                />
              ))}
            </div>
            <button
              type="button"
              onClick={() => setPricing([...pricing, { minQty: 0, maxQty: 0, basePrice: 0 }])}
              className="mt-2 flex items-center gap-1 text-xs text-accent hover:underline"
            >
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
                <CollarRow
                  key={i}
                  item={c}
                  onChange={(v) => setCollars(collars.map((x, j) => j === i ? v : x))}
                  onRemove={() => setCollars(collars.filter((_, j) => j !== i))}
                />
              ))}
            </div>
            <button
              type="button"
              onClick={() => setCollars([...collars, { name: "", price: 0, patternPieces: undefined }])}
              className="mt-2 flex items-center gap-1 text-xs text-accent hover:underline"
            >
              <Plus className="h-3 w-3" /> เพิ่มแบบคอ
            </button>
          </div>

          {/* เนื้อผ้า */}
          <div>
            <label className={LABEL}>เนื้อผ้า</label>
            <p className="mb-2 text-xs text-muted-2">เลือกจากข้อมูลเนื้อผ้า · ราคาเพิ่ม = 0 หมายถึงมาตรฐาน</p>
            <div className="space-y-2">
              {fabrics.map((f, i) => (
                <FabricRow
                  key={i}
                  item={f}
                  fabricOptions={fabricOptions}
                  onChange={(v) => setFabrics(fabrics.map((x, j) => j === i ? v : x))}
                  onRemove={() => setFabrics(fabrics.filter((_, j) => j !== i))}
                />
              ))}
            </div>
            <button
              type="button"
              onClick={() => setFabrics([...fabrics, { name: "", price: 0 }])}
              className="mt-2 flex items-center gap-1 text-xs text-accent hover:underline"
            >
              <Plus className="h-3 w-3" /> เพิ่มเนื้อผ้า
            </button>
          </div>
        </div>

        {/* Footer */}
        <div className="flex justify-end gap-3 border-t border-border px-6 py-4">
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

export default function ShirtStylesPage() {
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

  return (
    <div>
      <PageHeader
        title="ข้อมูลทรงเสื้อ"
        subtitle="รวมตัวเลือกคอเสื้อ เนื้อผ้า และราคาแต่ละทรง"
        action={
          <Button onClick={() => setShowModal(true)}>
            <Plus className="h-4 w-4" />
            เพิ่มทรงเสื้อ
          </Button>
        }
      />
      <div className="p-8 space-y-6 max-w-3xl">
        {styles.map((s) => <StyleCard key={s.id} style={s} onEdit={openEdit} />)}
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
