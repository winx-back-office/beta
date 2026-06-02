"use client";

import { useEffect, useRef, useState } from "react";
import { PageHeader } from "@/components/ui";
import { Plus, X, Loader2 } from "lucide-react";

interface FabricVariant { name: string }
interface Fabric { id: string; name: string; variants: FabricVariant[] }

export default function FabricsPage() {
  const [fabrics, setFabrics] = useState<Fabric[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/fabrics").then(r => r.json()).then(d => { setFabrics(d); setLoading(false); });
  }, []);

  async function save(updated: Fabric[]) {
    setFabrics(updated);
    await fetch("/api/fabrics", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(updated),
    });
  }

  function addVariant(fabricId: string, name: string) {
    const trimmed = name.trim();
    if (!trimmed) return;
    const updated = fabrics.map(f =>
      f.id === fabricId
        ? { ...f, variants: [...f.variants, { name: trimmed }] }
        : f
    );
    save(updated);
  }

  function removeVariant(fabricId: string, variantName: string) {
    const updated = fabrics.map(f =>
      f.id === fabricId
        ? { ...f, variants: f.variants.filter(v => v.name !== variantName) }
        : f
    );
    save(updated);
  }

  return (
    <div>
      <PageHeader title="ข้อมูลเนื้อผ้า" subtitle="รวมประเภทผ้าและแบบย่อยที่มีทั้งหมด" />
      <div className="p-8 max-w-3xl space-y-4">
        {loading ? (
          <div className="flex items-center justify-center py-24 text-muted">
            <Loader2 className="mr-2 h-5 w-5 animate-spin" /> กำลังโหลด…
          </div>
        ) : (
          fabrics.map((f, i) => (
            <FabricCard
              key={f.id}
              fabric={f}
              index={i}
              onAdd={(name) => addVariant(f.id, name)}
              onRemove={(name) => removeVariant(f.id, name)}
            />
          ))
        )}
      </div>
    </div>
  );
}

function FabricCard({
  fabric, index, onAdd, onRemove,
}: {
  fabric: Fabric;
  index: number;
  onAdd: (name: string) => void;
  onRemove: (name: string) => void;
}) {
  const [adding, setAdding] = useState(false);
  const [value, setValue] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  function submit() {
    if (!value.trim()) return;
    onAdd(value);
    setValue("");
    setAdding(false);
  }

  function openAdd() {
    setAdding(true);
    setTimeout(() => inputRef.current?.focus(), 50);
  }

  return (
    <div className="rounded-[var(--radius-lg)] border border-border bg-surface overflow-hidden">
      {/* Header */}
      <div className="flex items-center gap-4 border-b border-border bg-surface-2 px-6 py-4">
        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-[var(--radius-md)] bg-accent-soft text-accent text-sm font-bold">
          {index + 1}
        </div>
        <div className="flex-1">
          <h2 className="font-bold text-base">{fabric.name}</h2>
          {fabric.variants.length > 0 && (
            <p className="text-xs text-muted mt-0.5">{fabric.variants.length} แบบ</p>
          )}
        </div>
      </div>

      {/* Variants + Add */}
      <div className="p-5">
        <div className="flex flex-wrap gap-2">
          {fabric.variants.map(v => (
            <div
              key={v.name}
              className="group flex items-center gap-1.5 rounded-[var(--radius-md)] border border-border bg-surface-2 pl-3 pr-2 py-2 text-sm font-medium"
            >
              {v.name}
              <button
                onClick={() => onRemove(v.name)}
                className="text-muted-2 hover:text-danger transition-colors opacity-0 group-hover:opacity-100"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            </div>
          ))}

          {/* Add chip */}
          {adding ? (
            <div className="flex items-center gap-1.5 rounded-[var(--radius-md)] border border-accent bg-accent-soft pl-3 pr-2 py-2">
              <input
                ref={inputRef}
                value={value}
                onChange={e => setValue(e.target.value)}
                onKeyDown={e => {
                  if (e.key === "Enter") submit();
                  if (e.key === "Escape") { setAdding(false); setValue(""); }
                }}
                onBlur={() => { submit(); }}
                placeholder="ชื่อแบบผ้า"
                className="w-28 bg-transparent text-sm outline-none placeholder:text-accent/50 text-accent"
              />
              <button onClick={() => { setAdding(false); setValue(""); }} className="text-accent/60 hover:text-accent">
                <X className="h-3.5 w-3.5" />
              </button>
            </div>
          ) : (
            <button
              onClick={openAdd}
              className="flex items-center gap-1.5 rounded-[var(--radius-md)] border border-dashed border-border px-3 py-2 text-sm text-muted hover:border-accent hover:text-accent transition-colors"
            >
              <Plus className="h-3.5 w-3.5" />
              เพิ่มแบบ
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
