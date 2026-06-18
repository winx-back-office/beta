"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import {
  Plus,
  Trash2,
  ImageIcon,
  Upload,
  X,
  Save,
  Check,
  Loader2,
  Star,
  Sheet,
  AlertCircle,
  RefreshCw,
  Printer,
} from "lucide-react";
import { Button } from "@/components/ui";
import { useProductionColumns } from "@/lib/use-production-columns";
import {
  loadProduction,
  saveProduction,
  subscribeProduction,
  type PlayerRow,
  type ProductionImage,
} from "@/lib/production-db";
import { useShirtStyleOptions, useShirtStyles, useFabricsData } from "@/lib/use-catalog";

const SIZES = ["SS", "S", "M", "L", "XL", "2XL", "3XL", "4XL", "5XL", "6XL", "7XL", "พิเศษ"];


let tmpSeq = 1;
const tmpId = () => `tmp-${tmpSeq++}`;

function emptyRow(): PlayerRow {
  return { id: tmpId(), position: 0, name: "", size: "", number: "", checked: false, status: "", note: "" };
}

type SaveState = "idle" | "saving" | "saved" | "error";


export function ProductionTable({
  orderId,
  teamName: teamNameProp,
  shirtType: shirtTypeProp,
  fabricType,
  collarType,
  productionStatus,
  onFirstSave,
  onUpdateOrder,
  onDirtyChange,
  hideSync = false,
  readOnly = false,
}: {
  orderId: string;
  teamName: string;
  shirtType: string;
  fabricType: string;
  collarType: string;
  productionStatus?: string;
  onFirstSave?: () => void;
  onUpdateOrder?: (patch: { teamName?: string; shirtType?: string; fabricType?: string; collarType?: string }) => Promise<void>;
  hideSync?: boolean;
  readOnly?: boolean;
  onDirtyChange?: (dirty: boolean) => void;
}) {
  const productionColumns = useProductionColumns();
  const shirtOptions  = useShirtStyleOptions();
  const shirtStyles   = useShirtStyles();
  const fabricsData   = useFabricsData();
  const [fabric, setFabric] = useState(fabricType);
  const [collar, setCollar] = useState(collarType || "คอกลม");
  const [teamName, setTeamName] = useState(teamNameProp);
  const [shirt, setShirt] = useState(shirtTypeProp);

  const selectedStyle = shirtStyles.find(s => s.name === shirt);
  const filteredFabricOptions = selectedStyle
    ? selectedStyle.fabrics.map(sf => sf.name)
    : fabricsData.flatMap(f => f.variants.length > 0 ? f.variants.map(v => v.name) : [f.name]);
  const filteredCollarOptions = selectedStyle
    ? selectedStyle.collars.map(c => c.name)
    : shirtStyles.flatMap(s => s.collars.map(c => c.name)).filter((v, i, a) => a.indexOf(v) === i);
  const [images, setImages] = useState<ProductionImage[]>([]);
  const [rows, setRows] = useState<PlayerRow[]>([emptyRow(), emptyRow()]);
  const [loading, setLoading] = useState(true);
  const [saveState, setSaveState] = useState<SaveState>("idle");
  const [errMsg, setErrMsg] = useState<string>("");
  const [isDirty, setIsDirty] = useState(false);
  const [columnLabels, setColumnLabels] = useState<string[]>([]);
  const [sheetsUrl, setSheetsUrl] = useState<string>("");
  const [syncing, setSyncing] = useState(false);

  // ── Sticker Print ──
  const [showSticker, setShowSticker] = useState(false);
  const [stickerLogoSvg, setStickerLogoSvg] = useState<string | null>(() => {
    if (typeof window === "undefined") return null;
    return localStorage.getItem("winx-sticker-logo") || null;
  });
  const stickerLogoInputRef = useRef<HTMLInputElement>(null);
  const [colW, setColW] = useState<{ logo: number; name: number; size: number; num: number; rowH: number; fontSize: number }>(() => {
    if (typeof window === "undefined") return { logo: 32, name: 80, size: 34, num: 24, rowH: 28, fontSize: 8 };
    try {
      const saved = localStorage.getItem("winx-sticker-colw");
      const def = { logo: 32, name: 80, size: 34, num: 24, rowH: 28, fontSize: 8 };
      return saved ? { ...def, ...JSON.parse(saved) } : def;
    } catch { return { logo: 32, name: 80, size: 34, num: 24, rowH: 28, fontSize: 8 }; }
  });
  const [stickerSaved, setStickerSaved] = useState(false);
  const saveSticker = () => {
    localStorage.setItem("winx-sticker-colw", JSON.stringify(colW));
    if (stickerLogoSvg) localStorage.setItem("winx-sticker-logo", stickerLogoSvg);
    else localStorage.removeItem("winx-sticker-logo");
    setStickerSaved(true);
    setTimeout(() => setStickerSaved(false), 2000);
  };

  // ── Import from Sheets ──
  const [showImport, setShowImport] = useState(false);
  const [importUrl, setImportUrl] = useState("");
  const [importFetching, setImportFetching] = useState(false);
  const [importPreview, setImportPreview] = useState<{ name: string; size: string; number: string }[] | null>(null);
  const [importHeaders, setImportHeaders] = useState<string[]>([]);
  const [importSheetTitle, setImportSheetTitle] = useState("");
  const [importError, setImportError] = useState<string | null>(null);
  const [importFabric, setImportFabric] = useState("");
  const [importCollar, setImportCollar] = useState("");

  const fileRef = useRef<HTMLInputElement>(null);
  const savingRef = useRef(false);
  const initializedRef = useRef(false);

  // notify parent when dirty state changes
  useEffect(() => { onDirtyChange?.(isDirty); }, [isDirty, onDirtyChange]);

  // ===== โหลดข้อมูล =====
  const refresh = useCallback(async () => {
    const data = await loadProduction(orderId, fabricType, collarType);

    // ใช้ค่าจาก production meta ก่อน ถ้าไม่มีค่อย fallback ไป order prop
    setFabric(data.meta.fabric || fabricType);
    setCollar(data.meta.collar || collarType || "คอกลม");
    if (data.meta.columnLabels?.length) setColumnLabels(data.meta.columnLabels);

    // migrate legacy single imageUrl → images array
    if (data.meta.images && data.meta.images.length > 0) {
      setImages(data.meta.images);
    } else if (data.meta.imageUrl) {
      setImages([{ url: data.meta.imageUrl, isMain: true }]);
    } else {
      setImages([]);
    }

    setSheetsUrl(data.meta.sheetsUrl ?? "");

    setRows(data.players.length > 0 ? data.players : [emptyRow(), emptyRow()]);
    setLoading(false);
    initializedRef.current = true;
    setIsDirty(false);
  }, [orderId, fabricType, collarType]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  // ===== Realtime sync =====
  useEffect(() => {
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

  const markDirty = () => { if (initializedRef.current) setIsDirty(true); };

  const update = (id: string, patch: Partial<PlayerRow>) => {
    markDirty();
    setRows((rs) => rs.map((r) => (r.id === id ? { ...r, ...patch } : r)));
  };

  const addRow = () => { markDirty(); setRows((rs) => [...rs, emptyRow()]); };

  const handleSyncNow = async () => {
    if (!sheetsUrl) return;
    setSyncing(true);
    try {
      const res = await fetch(`/api/import/production-sheet?url=${encodeURIComponent(sheetsUrl)}`);
      if (res.ok) {
        const sheet = await res.json();
        if (sheet.players?.length) {
          setRows(sheet.players.map((p: { name: string; size: string; number: string; status: string }) => ({
            ...emptyRow(), name: p.name, size: p.size, number: p.number, status: p.status ?? "",
          })));
          if (sheet.fabric) setFabric(sheet.fabric);
          if (sheet.collar) setCollar(sheet.collar);
          if (sheet.playerHeaders?.length) setColumnLabels(sheet.playerHeaders);
          if (sheet.sheetTitle) setTeamName(sheet.sheetTitle);
          markDirty();
        }
      }
    } finally {
      setSyncing(false);
    }
  };

  const handleImportFetch = async (e: React.FormEvent) => {
    e.preventDefault();
    setImportFetching(true);
    setImportError(null);
    setImportPreview(null);
    const res = await fetch(`/api/import/production-sheet?url=${encodeURIComponent(importUrl)}`);
    const data = await res.json();
    if (!res.ok || data.error) {
      setImportError(data.error ?? "เกิดข้อผิดพลาด");
    } else {
      setImportPreview(data.players);
      setImportHeaders(data.playerHeaders ?? []);
      setImportFabric(data.fabric ?? "");
      setImportCollar(data.collar ?? "");
      setImportSheetTitle(data.sheetTitle ?? "");
    }
    setImportFetching(false);
  };

  const handleImportConfirm = () => {
    if (!importPreview?.length) return;
    const newRows = importPreview.map((p) => ({
      ...emptyRow(),
      name: p.name,
      size: p.size,
      number: p.number,
      status: (p as { name: string; size: string; number: string; status?: string }).status ?? "",
    }));
    // ถ้า sheet มีข้อมูลผ้า/คอ และ headers ให้อัพเดทด้วย
    if (importFabric) setFabric(importFabric);
    if (importCollar) setCollar(importCollar);
    if (importHeaders.length) setColumnLabels(importHeaders);
    if (importSheetTitle) setTeamName(importSheetTitle);
    setSheetsUrl(importUrl); // จำ URL ไว้สำหรับ auto-sync
    setRows(newRows);
    markDirty();
    setShowImport(false);
    setImportUrl("");
    setImportPreview(null);
    setImportError(null);
  };

  const removeRow = (id: string) => { markDirty(); setRows((rs) => rs.filter((r) => r.id !== id)); };

  const onFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files ?? []);
    if (files.length === 0) return;
    files.forEach((file) => {
      const reader = new FileReader();
      reader.onload = () => {
        setImages((prev) => {
          const isFirst = prev.length === 0;
          return [...prev, { url: reader.result as string, isMain: isFirst }];
        });
        markDirty();
      };
      reader.readAsDataURL(file);
    });
    e.target.value = "";
  };

  const setMain = (idx: number) => {
    markDirty();
    setImages((prev) => prev.map((img, i) => ({ ...img, isMain: i === idx })));
  };

  const removeImage = (idx: number) => {
    markDirty();
    setImages((prev) => {
      const next = prev.filter((_, i) => i !== idx);
      // ถ้าลบรูป main ให้ตั้งรูปแรกเป็น main แทน
      if (prev[idx].isMain && next.length > 0) next[0].isMain = true;
      return next;
    });
  };

  // ===== บันทึก =====
  const onSave = async () => {
    setSaveState("saving");
    savingRef.current = true;
    const mainImage = images.find((img) => img.isMain) ?? images[0] ?? null;
    // sync fields back to order if changed
    const orderPatch: { teamName?: string; shirtType?: string; fabricType?: string; collarType?: string } = {};
    if (teamName !== teamNameProp) orderPatch.teamName = teamName;
    if (shirt !== shirtTypeProp) orderPatch.shirtType = shirt;
    if (fabric !== fabricType) orderPatch.fabricType = fabric;
    if (collar !== collarType) orderPatch.collarType = collar;
    if (Object.keys(orderPatch).length > 0) await onUpdateOrder?.(orderPatch);

    const res = await saveProduction(
      orderId,
      { fabric, collar, imageUrl: mainImage?.url ?? null, images, columnLabels: columnLabels.length ? columnLabels : undefined, sheetsUrl: sheetsUrl || undefined },
      rows.map((r) => ({
        position: r.position,
        name: r.name,
        size: r.size,
        number: r.number,
        checked: r.checked,
        status: r.status,
        note: r.note,
      }))
    );
    savingRef.current = false;
    if (res.ok) {
      setSaveState("saved");
      setIsDirty(false);
      onFirstSave?.();
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
      {/* WINX banner — กรอบแยก */}
      <div className="overflow-hidden rounded-[var(--radius-lg)] border border-accent bg-black">
        <div className="relative flex items-center justify-between overflow-hidden px-8 py-6">
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
          <div className="relative flex flex-col items-end gap-2">
            {/* Admin / ลูกค้า badge */}
            <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-[10px] font-semibold uppercase tracking-wider ${
              hideSync
                ? "bg-white/10 text-white/60"
                : "bg-accent/20 text-accent"
            }`}>
              {hideSync ? "ฝั่งลูกค้า" : "ฝั่ง Admin"}
            </span>
            {(() => {
              const col = productionColumns.find(c => c.id === productionStatus);
              return col ? (
                <div className="flex items-center gap-2">
                  <span className="h-2 w-2 rounded-full" style={{ background: col.accent }} />
                  <span className="text-xs font-semibold text-white/80">{col.title}</span>
                </div>
              ) : (
                <span className="text-xs text-white/40">ยังไม่มีสถานะ</span>
              );
            })()}
          </div>
        </div>
      </div>

      {/* ReadOnly banner */}
      {readOnly && (
        <div className="flex items-center gap-3 rounded-[var(--radius-md)] border border-warn/30 bg-warn/10 px-4 py-3 text-sm text-warn">
          <span className="text-lg">🔒</span>
          <span>ข้อมูลถูกล็อกแล้ว — ทางทีมงานกำลังดำเนินการผลิต ไม่สามารถแก้ไขได้ในขณะนี้</span>
        </div>
      )}

      <div className="overflow-hidden rounded-[var(--radius-lg)] border border-border bg-surface">
        {/* Fabric / collar selectors */}
        <div className="flex flex-wrap items-center gap-3 border-b border-border bg-surface-2 px-6 py-4">
          <span className="flex items-center gap-2 text-sm text-muted">
            ทีม
            <input
              value={teamName}
              onChange={e => { setTeamName(e.target.value); markDirty(); }}
              className="rounded-md bg-transparent px-2 py-1 font-bold text-foreground outline-none hover:bg-surface-3 focus:bg-surface-3"
            />
          </span>
          <SelectField value={shirt} onChange={v => { setShirt(v); setFabric(""); setCollar(""); markDirty(); }} options={shirtOptions} />
          <SelectField value={fabric} onChange={v => { setFabric(v); markDirty(); }} options={filteredFabricOptions} disabled={!shirt} />
          <SelectField value={collar} onChange={v => { setCollar(v); markDirty(); }} options={filteredCollarOptions} disabled={!shirt} />
          <div className="ml-auto flex items-center gap-3" style={{ display: readOnly ? "none" : undefined }}>
            {saveState === "saved" && (
              <span className="flex items-center gap-1 text-sm text-success">
                <Check className="h-4 w-4" /> บันทึกแล้ว
              </span>
            )}
            {saveState === "error" && (
              <span className="text-sm text-danger">{errMsg}</span>
            )}
            {!hideSync && sheetsUrl ? (
              <div className="flex items-center gap-1">
                <div className="flex items-center gap-1.5 rounded-l-[var(--radius-md)] border border-accent/30 bg-accent-soft px-3 py-2 text-xs font-medium text-accent">
                  <Sheet className="h-3.5 w-3.5" />
                  <span>sync จาก Sheets</span>
                </div>
                <button
                  onClick={handleSyncNow}
                  disabled={syncing}
                  className="flex items-center gap-1.5 rounded-none border-y border-r border-accent/30 bg-accent-soft px-3 py-2 text-xs font-medium text-accent hover:bg-accent/20 transition-colors disabled:opacity-60"
                  title="โหลดข้อมูลล่าสุดจาก Sheets"
                >
                  {syncing
                    ? <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    : <RefreshCw className="h-3.5 w-3.5" />
                  }
                  โหลดข้อมูล
                </button>
                <button
                  onClick={() => { setSheetsUrl(""); markDirty(); }}
                  className="flex items-center rounded-r-[var(--radius-md)] border-y border-r border-accent/30 bg-accent-soft px-2 py-2 text-accent/50 hover:text-accent transition-colors"
                  title="ยกเลิก auto-sync"
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              </div>
            ) : !hideSync ? (
              <Button variant="outline" onClick={() => { setShowImport(true); setImportPreview(null); setImportError(null); setImportUrl(""); }}>
                <Sheet className="h-4 w-4" />
                นำเข้าจาก Sheets
              </Button>
            ) : null}
            <Button variant="outline" onClick={() => setShowSticker(true)}>
              <Printer className="h-4 w-4" />
              <span className="hidden min-[720px]:inline">พิมพ์สติ๊กเกอร์หน้าถุง</span>
            </Button>
            <Button onClick={onSave} disabled={saveState === "saving"}>
              {saveState === "saving" ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Save className="h-4 w-4" />
              )}
              บันทึก
            </Button>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-6 p-6 lg:grid-cols-3">
          {/* Images */}
          <div className="lg:col-span-2">
            <input
              ref={fileRef}
              type="file"
              accept="image/*"
              multiple
              className="hidden"
              onChange={onFile}
            />
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
              {images.map((img, idx) => (
                <div key={idx} className="group relative aspect-square overflow-hidden rounded-[var(--radius-md)] border border-border bg-surface-2">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={img.url} alt={`รูป ${idx + 1}`} className="h-full w-full object-cover" />
                  {/* star badge */}
                  {img.isMain && (
                    <div className="absolute left-2 top-2 flex h-6 w-6 items-center justify-center rounded-full bg-yellow-400 shadow">
                      <Star className="h-3.5 w-3.5 fill-black text-black" />
                    </div>
                  )}
                  {/* hover controls */}
                  <div className="absolute inset-0 flex items-center justify-center gap-2 bg-black/50 opacity-0 transition-opacity group-hover:opacity-100">
                    {!img.isMain && (
                      <button
                        onClick={() => setMain(idx)}
                        title="ตั้งเป็นรูปหลัก"
                        className="flex h-8 w-8 items-center justify-center rounded-full bg-yellow-400 text-black hover:bg-yellow-300"
                      >
                        <Star className="h-4 w-4" />
                      </button>
                    )}
                    <button
                      onClick={() => removeImage(idx)}
                      title="ลบรูป"
                      className="flex h-8 w-8 items-center justify-center rounded-full bg-black/70 text-white hover:bg-red-500"
                    >
                      <X className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              ))}
              {/* Upload button */}
              <button
                onClick={() => fileRef.current?.click()}
                className="flex aspect-square flex-col items-center justify-center rounded-[var(--radius-md)] border-2 border-dashed border-border-strong bg-surface-2 text-center transition-colors hover:border-accent hover:bg-surface-3"
              >
                <ImageIcon className="mb-1.5 h-7 w-7 text-muted-2" />
                <p className="text-xs text-muted">เพิ่มรูป</p>
                <p className="mt-0.5 flex items-center gap-1 text-[10px] text-muted-2">
                  <Upload className="h-3 w-3" /> อัปโหลด
                </p>
              </button>
            </div>
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
                <th className="px-3 py-2.5 font-medium">{columnLabels[0] || "ชื่อผู้เล่น"}</th>
                <th className="w-28 px-3 py-2.5 font-medium">{columnLabels[1] || "ไซส์"}</th>
                <th className="w-20 px-3 py-2.5 font-medium">{columnLabels[2] || "เบอร์"}</th>
                <th className="w-20 px-3 py-2.5 text-center font-medium">{columnLabels[3] || "เช็คสินค้า"}</th>
                <th className="px-3 py-2.5 font-medium">{columnLabels[4] || "รายละเอียดเพิ่มเติม"}</th>
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
                      readOnly={readOnly}
                      className={`w-full rounded-md bg-transparent px-2 py-1.5 outline-none placeholder:text-muted-2 ${readOnly ? "cursor-default" : "focus:bg-surface-3"}`}
                    />
                  </td>
                  <td className="px-3 py-1.5">
                    <select
                      value={r.size}
                      onChange={(e) => update(r.id, { size: e.target.value })}
                      disabled={readOnly}
                      className="w-full rounded-md bg-surface-3 px-2 py-1.5 outline-none focus:ring-1 focus:ring-accent disabled:cursor-default disabled:opacity-70"
                    >
                      <option value="">Size</option>
                      {SIZES.map((s) => (
                        <option key={s} value={s}>{s}</option>
                      ))}
                    </select>
                  </td>
                  <td className="px-3 py-1.5">
                    <input
                      value={r.number}
                      onChange={(e) => update(r.id, { number: e.target.value })}
                      placeholder="—"
                      readOnly={readOnly}
                      className={`w-full rounded-md bg-transparent px-2 py-1.5 text-center outline-none placeholder:text-muted-2 ${readOnly ? "cursor-default" : "focus:bg-surface-3"}`}
                    />
                  </td>
                  <td className="px-3 py-1.5">
                    <input
                      value={r.status}
                      onChange={(e) => update(r.id, { status: e.target.value })}
                      placeholder="—"
                      readOnly={readOnly}
                      className={`w-full rounded-md bg-transparent px-2 py-1.5 outline-none placeholder:text-muted-2 ${readOnly ? "cursor-default" : "focus:bg-surface-3"}`}
                    />
                  </td>
                  <td className="px-3 py-1.5">
                    <input
                      value={r.note}
                      onChange={(e) => update(r.id, { note: e.target.value })}
                      placeholder="—"
                      readOnly={readOnly}
                      className={`w-full rounded-md bg-transparent px-2 py-1.5 outline-none placeholder:text-muted-2 ${readOnly ? "cursor-default" : "focus:bg-surface-3"}`}
                    />
                  </td>
                  {!readOnly && (
                    <td className="px-2 py-1.5 text-center">
                      <button
                        onClick={() => removeRow(r.id)}
                        className="text-muted-2 opacity-0 transition-opacity hover:text-danger group-hover:opacity-100"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>

          {!readOnly && (
            <Button variant="secondary" onClick={addRow} className="mt-4">
              <Plus className="h-4 w-4" />
              เพิ่มรายชื่อ
            </Button>
          )}
        </div>
      </div>

      {/* ── Import from Sheets Modal ── */}
      {showImport && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm"
          onClick={(e) => { if (e.target === e.currentTarget) setShowImport(false); }}
        >
          <div className="w-full max-w-2xl rounded-[var(--radius-lg)] border border-border bg-surface p-6 shadow-2xl mx-4">
            {/* Header */}
            <div className="flex items-center justify-between mb-5">
              <div>
                <h2 className="text-lg font-bold">นำเข้ารายชื่อจาก Google Sheets</h2>
                <p className="text-sm text-muted mt-0.5">วาง URL ของ Sheet ที่มีรายชื่อผู้เล่น — ข้อมูลปัจจุบันจะถูกแทนที่</p>
              </div>
              <button
                onClick={() => setShowImport(false)}
                className="rounded-md p-1.5 hover:bg-surface-2 text-muted hover:text-foreground transition-colors"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            {/* URL form */}
            <form onSubmit={handleImportFetch} className="flex gap-2 mb-4">
              <input
                value={importUrl}
                onChange={(e) => setImportUrl(e.target.value)}
                placeholder="https://docs.google.com/spreadsheets/d/..."
                required
                className="flex-1 rounded-[var(--radius-md)] border border-border bg-surface-2 px-3 py-2 text-sm focus:border-accent focus:outline-none"
              />
              <Button type="submit" disabled={importFetching || !importUrl.trim()}>
                {importFetching ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sheet className="h-4 w-4" />}
                {importFetching ? "กำลังดึง…" : "ดึงข้อมูล"}
              </Button>
            </form>

            {/* Error */}
            {importError && (
              <div className="flex items-center gap-2 rounded-[var(--radius-md)] border border-danger/30 bg-danger/10 px-4 py-3 text-sm text-danger mb-4">
                <AlertCircle className="h-4 w-4 shrink-0" />
                {importError}
              </div>
            )}

            {/* Fabric / collar detected */}
            {importPreview && (importFabric || importCollar) && (
              <div className="flex gap-2 mb-3">
                {importFabric && (
                  <span className="rounded-full border border-border bg-surface-2 px-3 py-1 text-xs text-muted">
                    ผ้า: <span className="text-foreground font-medium">{importFabric}</span>
                  </span>
                )}
                {importCollar && (
                  <span className="rounded-full border border-border bg-surface-2 px-3 py-1 text-xs text-muted">
                    คอ: <span className="text-foreground font-medium">{importCollar}</span>
                  </span>
                )}
                <span className="text-xs text-muted self-center">จะถูกอัพเดทอัตโนมัติ</span>
              </div>
            )}

            {/* Preview table */}
            {importPreview && (
              <>
                <div className="max-h-72 overflow-y-auto rounded-[var(--radius-md)] border border-border mb-4">
                  <table className="w-full text-sm">
                    <thead className="sticky top-0 bg-surface-2">
                      <tr className="border-b border-border text-left text-xs text-muted">
                        <th className="px-3 py-2.5 font-medium w-8">#</th>
                        {importHeaders.map((h) => (
                          <th key={h} className="px-3 py-2.5 font-medium">{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border">
                      {importPreview.map((p, i) => (
                        <tr key={i} className="hover:bg-surface-2">
                          <td className="px-3 py-2 text-muted-2 text-xs">{i + 1}</td>
                          <td className="px-3 py-2 font-medium">{p.name}</td>
                          <td className="px-3 py-2">
                            {p.size ? (
                              <span className="rounded-md bg-surface-2 px-2 py-0.5 text-xs font-semibold">{p.size}</span>
                            ) : (
                              <span className="text-muted-2 text-xs">—</span>
                            )}
                          </td>
                          <td className="px-3 py-2 text-muted">{p.number || "—"}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                <div className="flex items-center justify-between">
                  <p className="text-sm text-muted">พบ <span className="font-semibold text-foreground">{importPreview.length} คน</span> — ข้อมูลเดิมทั้งหมดจะถูกแทนที่</p>
                  <div className="flex gap-2">
                    <Button variant="secondary" type="button" onClick={() => setShowImport(false)}>
                      ยกเลิก
                    </Button>
                    <Button onClick={handleImportConfirm} disabled={importPreview.length === 0}>
                      <Check className="h-4 w-4" />
                      นำเข้า {importPreview.length} คน
                    </Button>
                  </div>
                </div>
              </>
            )}
          </div>
        </div>
      )}

      {/* ── Sticker Print Modal ── */}
      {showSticker && (() => {
        const validRows = rows.filter(r => r.name || r.number);
        const SZ_BG: Record<string, string> = {
          "SS": "#7C3AED", "S": "#E8B4A0", "M": "#f5d08a", "L": "#b8e0a0",
          "XL": "#a8c8f0", "2XL": "#E24B4A", "3XL": "#A32D2D",
          "4XL": "#533AB7", "5XL": "#0F6E56", "6XL": "#888", "7XL": "#555", "พิเศษ": "#6B21A8",
        };
        const SZ_TC: Record<string, string> = {
          "SS": "#fff", "S": "#7A3822", "M": "#6b4400", "L": "#1a4a08",
          "XL": "#0c3060", "2XL": "#fff", "3XL": "#fff",
          "4XL": "#fff", "5XL": "#fff", "6XL": "#fff", "7XL": "#fff", "พิเศษ": "#fff",
        };
        const logoHtml = stickerLogoSvg
          ? stickerLogoSvg
          : `<svg width="40" height="18" viewBox="0 0 40 18" xmlns="http://www.w3.org/2000/svg"><text x="0" y="14" font-family="Arial Black,sans-serif" font-weight="900" font-size="14" fill="#111">WINX</text></svg>`;

        const colSize = Math.ceil(validRows.length / 3);
        const cols = [
          validRows.slice(0, colSize),
          validRows.slice(colSize, colSize * 2),
          validRows.slice(colSize * 2),
        ];

        const buildTable = (colRows: typeof validRows) => {
          const bodyHtml = colRows.map(r => {
            const sz = r.size || "";
            const bg = SZ_BG[sz] || "#ccc";
            const tc = SZ_TC[sz] || "#333";
            return `<tr>
              <td class="td-logo"><div class="logo-cell">${logoHtml}</div></td>
              <td class="td-name">${r.name || "—"}</td>
              <td class="td-size"><span class="pill" style="background:${bg};color:${tc};">${sz || "—"}</span></td>
              <td class="td-num">${r.number || "—"}</td>
            </tr>`;
          }).join("");
          return `<table><tbody>${bodyHtml}</tbody></table>`;
        };

        const handlePrint = () => {
          const style = document.createElement("style");
          style.id = "winx-sticker-style";
          style.textContent = `
            @media print {
              @page { size: A4; margin: 6mm 8mm 6mm 6mm; }
              html, body { background: #fff !important; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
              body > *:not(#winx-print-sticker) { display: none !important; }
              #winx-print-sticker {
                display: grid !important;
                visibility: visible !important;
                position: static !important;
                left: auto !important;
                top: auto !important;
                visibility: visible !important;
                grid-template-columns: 1fr 1fr 1fr;
                gap: 0;
                align-items: start;
                width: 100% !important;
              }
              #winx-print-sticker * { visibility: visible !important; -webkit-print-color-adjust: exact !important; print-color-adjust: exact !important; }
              #winx-print-sticker table { width: 100%; border-collapse: collapse; table-layout: fixed; }
              #winx-print-sticker thead th { background: #f3f3f3 !important; font-size: ${(colW.fontSize - 1) * 0.75}pt; font-weight: 700; padding: 3px 4px; border: 1px solid #ddd !important; color: #555 !important; }
              #winx-print-sticker tbody tr:nth-child(even) td { background: #fafafa !important; }
              #winx-print-sticker tbody tr:nth-child(odd) td { background: #fff !important; }
              #winx-print-sticker td { padding: 3px 4px; border: 1px solid #e0e0e0 !important; font-size: ${colW.fontSize * 0.75}pt; vertical-align: middle; color: #111 !important; height: ${colW.rowH * 0.265}mm; }
              #winx-print-sticker td span { color: #999 !important; font-size: ${(colW.fontSize - 1) * 0.75}pt; }
            }
          `;
          document.head.appendChild(style);
          window.print();
          setTimeout(() => document.getElementById("winx-sticker-style")?.remove(), 1000);
        };

        return (
          <div
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
            onClick={(e) => { if (e.target === e.currentTarget) setShowSticker(false); }}
          >
            <div className="w-full max-w-5xl rounded-[var(--radius-lg)] border border-border bg-surface shadow-xl flex flex-col max-h-[92vh]">
              {/* header */}
              <div className="flex items-center justify-between border-b border-border px-5 py-4">
                <div>
                  <h2 className="font-semibold">พิมพ์สติ๊กเกอร์หน้าถุง</h2>
                  <p className="text-xs text-muted mt-0.5">{validRows.length} แถว · A4</p>
                </div>
                <div className="flex items-center gap-2">
                  <Button variant="outline" onClick={saveSticker}>
                    {stickerSaved ? <><Check className="h-4 w-4" />บันทึกแล้ว</> : <><Save className="h-4 w-4" />บันทึก</>}
                  </Button>
                  <Button onClick={handlePrint} disabled={validRows.length === 0}>
                    <Printer className="h-4 w-4" />
                    พิมพ์
                  </Button>
                  <button onClick={() => setShowSticker(false)} className="rounded-lg p-1.5 text-muted hover:bg-surface-2">
                    <X className="h-4 w-4" />
                  </button>
                </div>
              </div>

              {/* logo upload */}
              <div className="border-b border-border px-5 py-3 flex items-center gap-3">
                <span className="text-sm text-muted shrink-0">โลโก้ (SVG)</span>
                <input ref={stickerLogoInputRef} type="file" accept=".svg,image/svg+xml" className="hidden"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (!file) return;
                    const reader = new FileReader();
                    reader.onload = (ev) => setStickerLogoSvg(ev.target?.result as string);
                    reader.readAsText(file);
                  }} />
                {stickerLogoSvg ? (
                  <div className="flex items-center gap-3">
                    <div className="h-7 w-14 rounded border border-border bg-white flex items-center justify-center p-1 overflow-hidden"
                      dangerouslySetInnerHTML={{ __html: stickerLogoSvg }} />
                    <button onClick={() => { setStickerLogoSvg(null); if (stickerLogoInputRef.current) stickerLogoInputRef.current.value = ""; }}
                      className="text-xs text-muted hover:text-foreground">ลบ</button>
                    <button onClick={() => stickerLogoInputRef.current?.click()}
                      className="text-xs text-muted hover:text-foreground">เปลี่ยน</button>
                  </div>
                ) : (
                  <button onClick={() => stickerLogoInputRef.current?.click()}
                    className="flex items-center gap-1.5 rounded-[var(--radius-md)] border border-dashed border-border px-3 py-1.5 text-xs text-muted hover:border-accent hover:text-accent transition-colors">
                    <Upload className="h-3.5 w-3.5" />
                    อัพโหลด .svg · ถ้าไม่อัพจะแสดงเลข #
                  </button>
                )}
              </div>

              {/* column width controls */}
              <div className="border-b border-border px-5 py-2.5 grid grid-cols-2 gap-x-6 gap-y-1.5">
                {([
                  { key: "name",     label: "ชื่อ",    min: 40,  max: 200, unit: "px" },
                  { key: "size",     label: "ไซส์",    min: 24,  max: 80,  unit: "px" },
                  { key: "num",      label: "เลข",     min: 20,  max: 60,  unit: "px" },
                  { key: "logo",     label: "โลโก้",   min: 16,  max: 80,  unit: "px" },
                  { key: "rowH",     label: "สูง",     min: 16,  max: 80,  unit: "px" },
                  { key: "fontSize", label: "ฟ้อนต์",  min: 6,   max: 18,  unit: "pt" },
                ] as const).map(({ key, label, min, max, unit }) => (
                  <div key={key} className="flex items-center gap-2 min-w-0">
                    <span className="text-[11px] text-muted shrink-0 w-10">{label}</span>
                    <input
                      type="range" min={min} max={max} step={1}
                      value={colW[key]}
                      onChange={e => setColW(prev => ({ ...prev, [key]: Number(e.target.value) }))}
                      className="flex-1 h-0.5 accent-accent min-w-0"
                    />
                    <span className="text-[11px] text-muted tabular-nums shrink-0 w-9 text-right">{colW[key]}{unit}</span>
                  </div>
                ))}
              </div>

              {/* preview — A4 portrait */}
              <div className="flex-1 overflow-auto p-6" style={{ background: "#e5e7eb" }}>
                {validRows.length === 0 ? (
                  <p className="text-center text-sm text-muted py-8">ยังไม่มีข้อมูลผู้เล่น</p>
                ) : (
                  <div style={{ display: "flex", justifyContent: "center" }}>
                    {/* A4 page: 210mm wide, 297mm tall, margin 6mm/8mm */}
                    <div style={{
                      width: "210mm", minHeight: "297mm",
                      background: "#fff",
                      boxShadow: "0 4px 24px rgba(0,0,0,0.22)",
                      padding: "6mm 8mm 6mm 6mm",
                      boxSizing: "border-box",
                      fontFamily: "'Sarabun','Helvetica Neue',Arial,sans-serif",
                      flexShrink: 0,
                    }}>
                      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 0, alignItems: "start" }}>
                        {cols.map((colRows, ci) => (
                          <table key={ci} style={{ width: "100%", borderCollapse: "collapse", tableLayout: "fixed" }}>
                            <colgroup>
                              <col style={{ width: `${colW.logo * 0.265}mm` }} />
                              <col style={{ width: `${colW.name * 0.265}mm` }} />
                              <col style={{ width: `${colW.size * 0.265}mm` }} />
                              <col style={{ width: `${colW.num  * 0.265}mm` }} />
                            </colgroup>
                            <thead>
                              <tr>
                                {[stickerLogoSvg ? "โลโก้" : "#","ชื่อ","ไซส์","เลข"].map((h, hi) => (
                                  <th key={hi} style={{ background: "#f3f3f3", color: "#555", border: "1px solid #ddd", fontSize: `${(colW.fontSize - 1) * 0.75}pt`, fontWeight: 700, padding: "3px 4px", textAlign: hi === 0 || hi >= 2 ? "center" : "left" }}>{h}</th>
                                ))}
                              </tr>
                            </thead>
                            <tbody>
                              {colRows.map((r, i) => (
                                <tr key={i} style={{ background: i % 2 === 1 ? "#fafafa" : "#fff" }}>
                                  <td style={{ border: "1px solid #e0e0e0", textAlign: "center", padding: "2px", height: `${colW.rowH * 0.265}mm`, background: "#fff" }}>
                                    {stickerLogoSvg ? (
                                      <div style={{ display: "flex", alignItems: "center", justifyContent: "center", width: "100%", height: "100%", overflow: "hidden" }}
                                        dangerouslySetInnerHTML={{ __html: stickerLogoSvg }} />
                                    ) : (
                                      <span style={{ fontSize: `${(colW.fontSize - 1) * 0.75}pt`, color: "#999" }}>{i + 1}</span>
                                    )}
                                  </td>
                                  <td style={{ border: "1px solid #e0e0e0", fontSize: `${colW.fontSize * 0.75}pt`, fontWeight: 500, color: "#111", padding: "3px 4px", overflow: "hidden", whiteSpace: "nowrap" }}>{r.name || "—"}</td>
                                  <td style={{ border: "1px solid #e0e0e0", fontSize: `${colW.fontSize * 0.75}pt`, fontWeight: 700, color: "#111", textAlign: "center", padding: "3px 4px" }}>{r.size || "—"}</td>
                                  <td style={{ border: "1px solid #e0e0e0", fontSize: `${colW.fontSize * 0.75}pt`, color: "#555", textAlign: "center", padding: "3px 4px" }}>{r.number || "—"}</td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        ))}
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        );
      })()}

      {/* Portal: print-only sticker content */}
      {typeof window !== "undefined" && (() => {
        const validRows = rows.filter(r => r.name || r.number);
        const colSize = Math.ceil(validRows.length / 3);
        const cols3 = [
          validRows.slice(0, colSize),
          validRows.slice(colSize, colSize * 2),
          validRows.slice(colSize * 2),
        ];
        const logoColW = `${colW.logo * 0.265}mm`;
        const nameColW = `${colW.name * 0.265}mm`;
        const sizeColW = `${colW.size * 0.265}mm`;
        const numColW  = `${colW.num  * 0.265}mm`;
        const fsPt = `${(colW.fontSize - 1) * 0.75}pt`;
        const fsPtData = `${colW.fontSize * 0.75}pt`;
        const thStyle: React.CSSProperties = { background: "#f3f3f3", fontSize: fsPt, fontWeight: 700, padding: "3px 4px", textAlign: "left", border: "1px solid #ddd", color: "#555" };
        const tdBase: React.CSSProperties = { padding: "3px 4px", border: "1px solid #e0e0e0", fontSize: fsPtData, verticalAlign: "middle", color: "#111" };
        return createPortal(
          <div id="winx-print-sticker" style={{ display: "none", gridTemplateColumns: "1fr 1fr 1fr", gap: 0, fontFamily: "'Sarabun','Helvetica Neue',Arial,sans-serif" }}>
            {cols3.map((colRows, ci) => (
              <table key={ci} style={{ width: "100%", borderCollapse: "collapse", tableLayout: "fixed" }}>
                <colgroup>
                  <col style={{ width: logoColW }} />
                  <col style={{ width: nameColW }} />
                  <col style={{ width: sizeColW }} />
                  <col style={{ width: numColW }} />
                </colgroup>
                <thead>
                  <tr>
                    <th style={{ ...thStyle, textAlign: "center" }}>{stickerLogoSvg ? "โลโก้" : "#"}</th>
                    <th style={thStyle}>ชื่อ</th>
                    <th style={{ ...thStyle, textAlign: "center" }}>ไซส์</th>
                    <th style={{ ...thStyle, textAlign: "center" }}>เลข</th>
                  </tr>
                </thead>
                <tbody>
                  {colRows.map((r, i) => (
                    <tr key={i} style={{ background: i % 2 === 1 ? "#fafafa" : "#fff" }}>
                      <td style={{ ...tdBase, textAlign: "center", padding: "2px", background: "#fff", height: `${colW.rowH * 0.265}mm` }}>
                        {stickerLogoSvg
                          ? <div dangerouslySetInnerHTML={{ __html: stickerLogoSvg }} style={{ display: "flex", alignItems: "center", justifyContent: "center", overflow: "hidden", height: "100%" }} />
                          : <span style={{ color: "#999", fontSize: "7pt" }}>{i + 1}</span>
                        }
                      </td>
                      <td style={{ ...tdBase, fontWeight: 500, overflow: "hidden", whiteSpace: "nowrap" }}>{r.name || "—"}</td>
                      <td style={{ ...tdBase, textAlign: "center", fontWeight: 700 }}>{r.size || "—"}</td>
                      <td style={{ ...tdBase, textAlign: "center", color: "#555" }}>{r.number || "—"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            ))}
          </div>,
          document.body
        );
      })()}
    </div>
  );
}

function SelectField({
  value,
  onChange,
  options,
  disabled,
}: {
  value: string;
  onChange: (v: string) => void;
  options: string[];
  disabled?: boolean;
}) {
  return (
    <select
      value={value}
      onChange={(e) => onChange(e.target.value)}
      disabled={disabled}
      className="rounded-full bg-surface-3 px-4 py-2 text-sm font-medium outline-none focus:ring-1 focus:ring-accent disabled:opacity-40 disabled:cursor-not-allowed"
    >
      {!options.includes(value) && value && <option value={value}>{value}</option>}
      <option value="">{disabled ? "— เลือกทรงเสื้อก่อน —" : "— เลือก —"}</option>
      {options.map((o) => (
        <option key={o} value={o}>
          {o}
        </option>
      ))}
    </select>
  );
}
