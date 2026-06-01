"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  Plus,
  Trash2,
  ImageIcon,
  Upload,
  X,
  Save,
  Check,
  Loader2,
} from "lucide-react";
import { Button } from "@/components/ui";
import {
  loadProduction,
  saveProduction,
  subscribeProduction,
  supabaseEnabled,
  type PlayerRow,
} from "@/lib/production-db";

const SIZES = ["SS", "S", "M", "L", "XL", "2XL", "3XL", "4XL", "5XL", "6XL", "7XL", "พิเศษ"];

const FABRIC_OPTIONS = [
  "ผ้าเรียบ 140 แกรม",
  "ผ้าไมโครพีช",
  "ผ้าจูติ",
  "ผ้าเบริด์อาย",
  "ผ้าเกล็ดปลา",
];

const COLLAR_OPTIONS = ["คอกลม", "คอวี", "คอปก", "คอจีน"];

let tmpSeq = 1;
const tmpId = () => `tmp-${tmpSeq++}`;

function emptyRow(): PlayerRow {
  return { id: tmpId(), position: 0, name: "", size: "", number: "", checked: false, note: "" };
}

type SaveState = "idle" | "saving" | "saved" | "error";

export function ProductionTable({
  orderId,
  teamName,
  shirtType,
  fabricType,
}: {
  orderId: string;
  teamName: string;
  shirtType: string;
  fabricType: string;
}) {
  const [fabric, setFabric] = useState(fabricType);
  const [collar, setCollar] = useState("คอกลม");
  const [image, setImage] = useState<string | null>(null);
  const [rows, setRows] = useState<PlayerRow[]>([emptyRow(), emptyRow()]);
  const [loading, setLoading] = useState(true);
  const [saveState, setSaveState] = useState<SaveState>("idle");
  const [errMsg, setErrMsg] = useState<string>("");

  const fileRef = useRef<HTMLInputElement>(null);
  const savingRef = useRef(false);

  // ===== โหลดข้อมูล =====
  const refresh = useCallback(async () => {
    const data = await loadProduction(orderId, fabricType);
    setFabric(data.meta.fabric);
    setCollar(data.meta.collar);
    setImage(data.meta.imageUrl);
    setRows(data.players.length > 0 ? data.players : [emptyRow(), emptyRow()]);
    setLoading(false);
  }, [orderId, fabricType]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  // ===== Realtime sync =====
  useEffect(() => {
    if (!supabaseEnabled) return;
    return subscribeProduction(orderId, () => {
      if (!savingRef.current) refresh();
    });
  }, [orderId, refresh]);

  const sizeCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    SIZES.forEach((s) => (counts[s] = 0));
    rows.forEach((r) => {
      if (r.size && counts[r.size] !== undefined) counts[r.size]++;
    });
    return counts;
  }, [rows]);

  const total = Object.values(sizeCounts).reduce((a, b) => a + b, 0);

  const update = (id: string, patch: Partial<PlayerRow>) =>
    setRows((rs) => rs.map((r) => (r.id === id ? { ...r, ...patch } : r)));

  const addRow = () => setRows((rs) => [...rs, emptyRow()]);

  const removeRow = (id: string) =>
    setRows((rs) => rs.filter((r) => r.id !== id));

  const onFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => setImage(reader.result as string); // data URL (เก็บลง DB ได้เลย)
    reader.readAsDataURL(file);
  };

  // ===== บันทึก =====
  const onSave = async () => {
    setSaveState("saving");
    savingRef.current = true;
    const res = await saveProduction(
      orderId,
      { fabric, collar, imageUrl: image },
      rows.map((r) => ({
        position: r.position,
        name: r.name,
        size: r.size,
        number: r.number,
        checked: r.checked,
        note: r.note,
      }))
    );
    savingRef.current = false;
    if (res.ok) {
      setSaveState("saved");
      setTimeout(() => setSaveState("idle"), 2500);
    } else {
      setSaveState("error");
      setErrMsg(res.error ?? "บันทึกไม่สำเร็จ");
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center rounded-[var(--radius-lg)] border border-border bg-surface py-24 text-muted">
        <Loader2 className="mr-2 h-5 w-5 animate-spin" />
        กำลังโหลดตารางผลิต…
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="overflow-hidden rounded-[var(--radius-lg)] border border-border bg-surface">
        {/* WINX banner */}
        <div className="relative flex items-center justify-between overflow-hidden bg-gradient-to-r from-black via-[#0f1310] to-black px-8 py-6">
          <div
            className="pointer-events-none absolute inset-0 opacity-[0.07]"
            style={{
              backgroundImage:
                "repeating-linear-gradient(115deg, #fff 0 2px, transparent 2px 22px)",
            }}
          />
          <div className="relative">
            <div className="flex items-center gap-2 text-2xl font-black italic tracking-tight text-white">
              WINX
              <span className="text-accent">|</span>
              <span>3.0</span>
            </div>
            <div className="mt-1 text-[10px] font-semibold uppercase tracking-[0.3em] text-white/70">
              Looking good at every stage.
            </div>
          </div>
          <div className="relative text-right text-xs text-white/60">
            <div>f WNX.TH</div>
            <div>◎ WINX.JERSEY</div>
          </div>
        </div>

        {/* Fabric / collar selectors */}
        <div className="flex flex-wrap items-center gap-3 border-b border-border bg-surface-2 px-6 py-4">
          <SelectField value={fabric} onChange={setFabric} options={FABRIC_OPTIONS} />
          <SelectField value={collar} onChange={setCollar} options={COLLAR_OPTIONS} />
          <span className="ml-auto text-sm text-muted">
            ทีม <strong className="text-foreground">{teamName}</strong> · {shirtType}
          </span>
        </div>

        <div className="grid grid-cols-1 gap-6 p-6 lg:grid-cols-3">
          {/* Image */}
          <div className="lg:col-span-2">
            <input
              ref={fileRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={onFile}
            />
            {image ? (
              <div className="group relative h-full min-h-[360px] overflow-hidden rounded-[var(--radius-md)] border border-border">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={image} alt="งานลูกค้า" className="h-full w-full object-contain" />
                <button
                  onClick={() => setImage(null)}
                  className="absolute right-3 top-3 flex h-8 w-8 items-center justify-center rounded-full bg-black/60 text-white opacity-0 transition-opacity hover:bg-black/80 group-hover:opacity-100"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
            ) : (
              <button
                onClick={() => fileRef.current?.click()}
                className="flex h-full min-h-[360px] w-full flex-col items-center justify-center rounded-[var(--radius-md)] border-2 border-dashed border-border-strong bg-surface-2 text-center transition-colors hover:border-accent hover:bg-surface-3"
              >
                <ImageIcon className="mb-3 h-10 w-10 text-muted-2" />
                <p className="font-medium text-muted">ช่องสำหรับโชว์ภาพงานลูกค้า</p>
                <p className="mt-1 flex items-center gap-1 text-xs text-muted-2">
                  <Upload className="h-3.5 w-3.5" />
                  คลิกเพื่ออัปโหลดรูป
                </p>
              </button>
            )}
          </div>

          {/* Size summary */}
          <div className="rounded-[var(--radius-md)] border border-border bg-surface-2">
            <div className="border-b border-border px-4 py-3 text-center text-lg font-bold">
              รวมไซส์
            </div>
            <div className="divide-y divide-border">
              {SIZES.map((s) => (
                <div key={s} className="flex items-center justify-between px-4 py-2 text-sm">
                  <span className={sizeCounts[s] > 0 ? "font-medium" : "text-muted-2"}>
                    {s}
                  </span>
                  <span
                    className={sizeCounts[s] > 0 ? "font-bold text-accent" : "text-muted-2"}
                  >
                    {sizeCounts[s]}
                  </span>
                </div>
              ))}
            </div>
            <div className="flex items-center justify-between bg-accent-soft px-4 py-3 font-bold">
              <span>รวมทั้งหมด</span>
              <span className="text-lg text-accent">{total}</span>
            </div>
          </div>
        </div>

        <p className="px-6 pb-2 text-center text-xs font-medium text-danger">
          ** ข้อสังเกตุ หลีกเลี่ยงการใช้อักษรพิเศษที่ไม่มีบนคีย์บอร์ด
          หากมีความจำเป็นจริงๆ ให้แจ้งกับทางผู้ผลิต
        </p>

        {/* Roster */}
        <div className="overflow-x-auto px-6 pb-6">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border text-left text-xs text-muted-2">
                <th className="w-10 px-2 py-2.5 text-center font-medium">#</th>
                <th className="px-3 py-2.5 font-medium">ชื่อผู้เล่น</th>
                <th className="w-28 px-3 py-2.5 font-medium">ไซส์</th>
                <th className="w-20 px-3 py-2.5 font-medium">เบอร์</th>
                <th className="w-20 px-3 py-2.5 text-center font-medium">เช็คสินค้า</th>
                <th className="px-3 py-2.5 font-medium">รายละเอียดเพิ่มเติม</th>
                <th className="w-10 px-2 py-2.5" />
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {rows.map((r, i) => (
                <tr key={r.id} className="group hover:bg-surface-2">
                  <td className="px-2 py-1.5 text-center text-muted-2">{i + 1}</td>
                  <td className="px-3 py-1.5">
                    <input
                      value={r.name}
                      onChange={(e) => update(r.id, { name: e.target.value })}
                      placeholder="ชื่อ"
                      className="w-full rounded-md bg-transparent px-2 py-1.5 outline-none placeholder:text-muted-2 focus:bg-surface-3"
                    />
                  </td>
                  <td className="px-3 py-1.5">
                    <select
                      value={r.size}
                      onChange={(e) => update(r.id, { size: e.target.value })}
                      className="w-full rounded-md bg-surface-3 px-2 py-1.5 outline-none focus:ring-1 focus:ring-accent"
                    >
                      <option value="">Size</option>
                      {SIZES.map((s) => (
                        <option key={s} value={s}>
                          {s}
                        </option>
                      ))}
                    </select>
                  </td>
                  <td className="px-3 py-1.5">
                    <input
                      value={r.number}
                      onChange={(e) => update(r.id, { number: e.target.value })}
                      placeholder="—"
                      className="w-full rounded-md bg-transparent px-2 py-1.5 text-center outline-none placeholder:text-muted-2 focus:bg-surface-3"
                    />
                  </td>
                  <td className="px-3 py-1.5 text-center">
                    <input
                      type="checkbox"
                      checked={r.checked}
                      onChange={(e) => update(r.id, { checked: e.target.checked })}
                      className="h-4 w-4 accent-[var(--accent)]"
                    />
                  </td>
                  <td className="px-3 py-1.5">
                    <input
                      value={r.note}
                      onChange={(e) => update(r.id, { note: e.target.value })}
                      placeholder="—"
                      className="w-full rounded-md bg-transparent px-2 py-1.5 outline-none placeholder:text-muted-2 focus:bg-surface-3"
                    />
                  </td>
                  <td className="px-2 py-1.5 text-center">
                    <button
                      onClick={() => removeRow(r.id)}
                      className="text-muted-2 opacity-0 transition-opacity hover:text-danger group-hover:opacity-100"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          <Button variant="secondary" onClick={addRow} className="mt-4">
            <Plus className="h-4 w-4" />
            เพิ่มรายชื่อ
          </Button>
        </div>
      </div>

      {/* Save bar */}
      <div className="flex items-center justify-end gap-3">
        {saveState === "saved" && (
          <span className="flex items-center gap-1 text-sm text-success">
            <Check className="h-4 w-4" /> บันทึกแล้ว
          </span>
        )}
        {saveState === "error" && (
          <span className="text-sm text-danger">{errMsg}</span>
        )}
        <Button onClick={onSave} disabled={saveState === "saving"}>
          {saveState === "saving" ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <Save className="h-4 w-4" />
          )}
          บันทึกตารางผลิต
        </Button>
      </div>
    </div>
  );
}

function SelectField({
  value,
  onChange,
  options,
}: {
  value: string;
  onChange: (v: string) => void;
  options: string[];
}) {
  return (
    <select
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className="rounded-full bg-surface-3 px-4 py-2 text-sm font-medium outline-none focus:ring-1 focus:ring-accent"
    >
      {!options.includes(value) && <option value={value}>{value}</option>}
      {options.map((o) => (
        <option key={o} value={o}>
          {o}
        </option>
      ))}
    </select>
  );
}
