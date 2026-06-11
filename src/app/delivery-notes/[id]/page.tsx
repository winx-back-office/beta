"use client";

import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import Link from "next/link";
import { useParams } from "next/navigation";
import { ArrowLeft, Printer, MapPin, Upload, GripVertical, Minus, Plus, X } from "lucide-react";
import { cn, formatDate } from "@/lib/utils";
import type { Order, DeliveryAddress } from "@/lib/types";

interface Player {
  id: string;
  position: number;
  name: string;
  size: string;
  number: string;
  note: string;
}

interface ProductionData {
  meta: { fabric: string; collar: string };
  players: Player[];
}


const SIZES = ["SS","S","M","L","XL","2XL","3XL","4XL","5XL"];

// ── Print Slip Modal ───────────────────────────────────────────
function PrintSlipModal({ order, players, onClose }: {
  order: Order; players: Player[]; onClose: () => void;
}) {
  const sizeSummary = SIZES
    .map(s => ({ s, c: players.filter(p => p.size === s).length }))
    .filter(x => x.c > 0);

  const handlePrint = () => {
    const style = document.createElement("style");
    style.id = "winx-print-style";
    style.textContent = `
      @media print {
        @page { margin: 12mm; size: A4; }
        body * { visibility: hidden; }
        #winx-print-slip, #winx-print-slip * { visibility: visible; }
        #winx-print-slip {
          position: fixed; inset: 0;
          width: 100%; height: auto;
          background: #fff;
          padding: 28px 36px;
          font-family: 'Sarabun','Helvetica Neue',sans-serif;
          -webkit-print-color-adjust: exact;
          print-color-adjust: exact;
        }
      }
    `;
    document.head.appendChild(style);
    window.print();
    setTimeout(() => document.getElementById("winx-print-style")?.remove(), 1000);
  };

  return (
    <>
      {/* Print-only styles injected into the document */}
      <style>{`
        @media print {
          body > * { display: none !important; }
          #winx-print-slip { display: block !important; }
          @page { margin: 12mm; size: A4; }
        }
      `}</style>

      {/* Hidden print content rendered directly in body via portal */}
      {createPortal(<div id="winx-print-slip" style={{ display: "none", fontFamily: "'Sarabun','Helvetica Neue',sans-serif", fontSize: 13, color: "#111", background: "#fff", padding: "0 0 24px" }}>
        <h1 style={{ fontSize: 22, fontWeight: 700, marginBottom: 4 }}>{order.teamName}</h1>
        <div style={{ display: "flex", flexWrap: "wrap", gap: "0 20px", fontSize: 12, color: "#555", marginBottom: 20, paddingBottom: 14, borderBottom: "1.5px solid #ddd" }}>
          <span><b style={{ color: "#222" }}>รหัส</b> {order.id}</span>
          {order.deliveryDate && <span><b style={{ color: "#222" }}>วันจัดส่ง</b> {formatDate(order.deliveryDate)}</span>}
          <span><b style={{ color: "#222" }}>จำนวน</b> {players.length} ตัว</span>
          {order.shirtType && <span><b style={{ color: "#222" }}>ทรงเสื้อ</b> {order.shirtType}</span>}
          {order.fabricType && <span><b style={{ color: "#222" }}>เนื้อผ้า</b> {order.fabricType}</span>}
          {order.collarType && <span><b style={{ color: "#222" }}>ประเภทคอ</b> {order.collarType}</span>}
        </div>
        <table style={{ width: "100%", borderCollapse: "collapse" }}>
          <thead>
            <tr>
              {["#","ชื่อ","ไซส์","เลข","รายละเอียดเพิ่มเติม","✓"].map((h, i) => (
                <th key={i} style={{ background: "#f3f3f3", fontSize: 11, fontWeight: 700, padding: "8px 12px", textAlign: "left", border: "1px solid #ddd", width: i === 0 ? 40 : i === 2 || i === 3 ? 56 : i === 5 ? 44 : undefined }}>
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {players.map((p, i) => (
              <tr key={p.id} style={{ background: i % 2 === 1 ? "#fafafa" : "#fff" }}>
                <td style={{ padding: "7px 12px", border: "1px solid #e0e0e0", color: "#999", fontSize: 11 }}>{i + 1}</td>
                <td style={{ padding: "7px 12px", border: "1px solid #e0e0e0", fontWeight: 500 }}>{p.name || "—"}</td>
                <td style={{ padding: "7px 12px", border: "1px solid #e0e0e0", fontWeight: 700 }}>{p.size || "—"}</td>
                <td style={{ padding: "7px 12px", border: "1px solid #e0e0e0", color: "#555" }}>{p.number || "—"}</td>
                <td style={{ padding: "7px 12px", border: "1px solid #e0e0e0", color: "#666" }}>{p.note || ""}</td>
                <td style={{ padding: "7px 12px", border: "1px solid #e0e0e0", textAlign: "center" }}>
                  <span style={{ display: "inline-block", width: 15, height: 15, border: "1.5px solid #555", borderRadius: 3 }} />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        <div style={{ display: "flex", gap: 12, flexWrap: "wrap", fontSize: 12, color: "#444", marginTop: 10 }}>
          <span style={{ color: "#999" }}>สรุปไซส์:</span>
          {sizeSummary.map(x => (
            <span key={x.s} style={{ background: "#f0f0f0", borderRadius: 4, padding: "2px 8px", fontWeight: 600 }}>{x.s} × {x.c}</span>
          ))}
        </div>
        <div style={{ marginTop: 18, display: "flex", justifyContent: "space-between", fontSize: 11, color: "#999", paddingTop: 10, borderTop: "1px solid #eee" }}>
          <span>พิมพ์วันที่ {new Date().toLocaleDateString("th-TH", { year: "numeric", month: "long", day: "numeric" })}</span>
          <span>WINX STUDIO Back Office</span>
        </div>
      </div>, document.body)}

      {/* Modal UI */}
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4 print:hidden">
        <div className="w-full max-w-3xl rounded-xl border border-border bg-surface shadow-2xl flex flex-col max-h-[92vh]">
          {/* Header */}
          <div className="flex items-center justify-between border-b border-border px-6 py-4 shrink-0">
            <div className="flex items-center gap-2">
              <Printer className="h-4 w-4 text-accent" />
              <span className="font-semibold">พิมพ์ใบส่งของ</span>
            </div>
            <button onClick={onClose} className="text-muted hover:text-foreground"><X className="h-4 w-4" /></button>
          </div>

          {/* Paper preview */}
          <div className="overflow-y-auto flex-1 bg-[#e8e8e8] dark:bg-[#1a1a1a] p-6 flex justify-center">
            <div style={{
              background: "#fff", color: "#111",
              fontFamily: "'Sarabun','Helvetica Neue',sans-serif",
              fontSize: 13, width: "100%", maxWidth: 640,
              padding: "28px 32px 24px",
              boxShadow: "0 4px 24px rgba(0,0,0,0.18)",
              borderRadius: 4,
            }}>
              {/* Doc header */}
              <h2 style={{ fontSize: 20, fontWeight: 700, marginBottom: 4, color: "#111" }}>{order.teamName}</h2>
              <div style={{ display: "flex", flexWrap: "wrap", gap: "0 20px", fontSize: 12, color: "#555", marginBottom: 18, paddingBottom: 12, borderBottom: "1.5px solid #ddd" }}>
                <span><b style={{ color: "#222" }}>รหัส</b> {order.id}</span>
                {order.deliveryDate && <span><b style={{ color: "#222" }}>วันจัดส่ง</b> {formatDate(order.deliveryDate)}</span>}
                <span><b style={{ color: "#222" }}>จำนวน</b> {players.length} ตัว</span>
                {order.shirtType && <span><b style={{ color: "#222" }}>ทรงเสื้อ</b> {order.shirtType}</span>}
                {order.fabricType && <span><b style={{ color: "#222" }}>เนื้อผ้า</b> {order.fabricType}</span>}
                {order.collarType && <span><b style={{ color: "#222" }}>ประเภทคอ</b> {order.collarType}</span>}
              </div>

              {/* Table */}
              <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
                <thead>
                  <tr>
                    {(["#","ชื่อ","ไซส์","เลข","รายละเอียดเพิ่มเติม","✓"] as const).map((h, i) => (
                      <th key={i} style={{ background: "#f3f3f3", fontSize: 11, fontWeight: 700, padding: "7px 10px", textAlign: "left", border: "1px solid #ddd", width: i===0?36:i===2||i===3?52:i===5?40:undefined }}>
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {players.map((p, i) => (
                    <tr key={p.id} style={{ background: i % 2 === 1 ? "#fafafa" : "#fff" }}>
                      <td style={{ padding: "6px 10px", border: "1px solid #e0e0e0", color: "#999", fontSize: 11 }}>{i+1}</td>
                      <td style={{ padding: "6px 10px", border: "1px solid #e0e0e0", fontWeight: 500 }}>{p.name || "—"}</td>
                      <td style={{ padding: "6px 10px", border: "1px solid #e0e0e0", fontWeight: 700 }}>{p.size || "—"}</td>
                      <td style={{ padding: "6px 10px", border: "1px solid #e0e0e0", color: "#555" }}>{p.number || "—"}</td>
                      <td style={{ padding: "6px 10px", border: "1px solid #e0e0e0", color: "#666" }}>{p.note || ""}</td>
                      <td style={{ padding: "6px 10px", border: "1px solid #e0e0e0", textAlign: "center" }}>
                        <span style={{ display: "inline-block", width: 14, height: 14, border: "1.5px solid #555", borderRadius: 3 }} />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>

              {/* Size summary */}
              <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginTop: 12, alignItems: "center" }}>
                <span style={{ fontSize: 11, color: "#999" }}>สรุปไซส์:</span>
                {sizeSummary.map(x => (
                  <span key={x.s} style={{ background: "#f0f0f0", borderRadius: 4, padding: "2px 8px", fontSize: 12, fontWeight: 600, color: "#333" }}>{x.s} × {x.c}</span>
                ))}
              </div>

              {/* Footer */}
              <div style={{ marginTop: 20, display: "flex", justifyContent: "space-between", fontSize: 11, color: "#bbb", paddingTop: 10, borderTop: "1px solid #eee" }}>
                <span>พิมพ์วันที่ {new Date().toLocaleDateString("th-TH", { year: "numeric", month: "long", day: "numeric" })}</span>
                <span>WINX STUDIO Back Office</span>
              </div>
            </div>
          </div>

          {/* Footer */}
          <div className="border-t border-border px-6 py-4 shrink-0 flex items-center justify-end gap-3">
            <button onClick={onClose} className="rounded-lg border border-border px-4 py-2 text-sm hover:bg-surface-2 transition-colors">
              ปิด
            </button>
            <button
              onClick={handlePrint}
              className="flex items-center gap-2 rounded-lg bg-accent px-4 py-2 text-sm font-medium text-accent-foreground hover:opacity-90 transition-opacity"
            >
              <Printer className="h-4 w-4" />
              พิมพ์
            </button>
          </div>
        </div>
      </div>
    </>
  );
}

// ── Address Modal ──────────────────────────────────────────────
function formatDeliveryAddress(a: DeliveryAddress): string {
  return [a.name, a.phone, a.address1, a.address2, a.postal].filter(Boolean).join("\n");
}

function AddressModal({ onClose, defaultAddress, orderId }: { onClose: () => void; defaultAddress?: DeliveryAddress; orderId: string }) {
  const SETTINGS_KEY = `winx:address-settings:${orderId}`;
  const fileRef = useRef<HTMLInputElement>(null);
  const previewRef = useRef<HTMLDivElement>(null);
  const [templateSrc, setTemplateSrc] = useState<string>("");
  const [address, setAddress] = useState(defaultAddress ? formatDeliveryAddress(defaultAddress) : "");
  const [fontSize, setFontSize] = useState(14); // pt — shown to user as pt, converted to vw for render
  const [textColor, setTextColor] = useState("#000000");
  const [pos, setPos] = useState({ x: 10, y: 30 }); // % of image
  const [dragging, setDragging] = useState(false);
  const [resizing, setResizing] = useState(false);
  const [saved, setSaved] = useState(false);
  const dragStart = useRef({ mx: 0, my: 0, px: 0, py: 0 });
  const resizeStart = useRef({ my: 0, fs: 14 });

  useEffect(() => {
    const tpl = localStorage.getItem("winx:address-template");
    if (tpl) setTemplateSrc(tpl);
    const s = localStorage.getItem(SETTINGS_KEY);
    if (s) {
      try {
        const v = JSON.parse(s);
        if (v.address) setAddress(v.address);
        else if (defaultAddress) setAddress(formatDeliveryAddress(defaultAddress));
        // validate: pt range 1–72
        if (v.fontSize && v.fontSize >= 1 && v.fontSize <= 72) setFontSize(v.fontSize);
        if (v.textColor) setTextColor(v.textColor);
        // validate: new system uses % (0–100), old used canvas px (could be >100)
        if (v.pos && v.pos.x >= 0 && v.pos.x <= 100 && v.pos.y >= 0 && v.pos.y <= 100) setPos(v.pos);
      } catch {}
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      const src = ev.target?.result as string;
      localStorage.setItem("winx:address-template", src);
      setTemplateSrc(src);
    };
    reader.readAsDataURL(file);
  };

  // Drag on preview
  const onMouseDown = (e: React.MouseEvent) => {
    if (!address.trim()) return;
    e.preventDefault();
    const rect = previewRef.current!.getBoundingClientRect();
    dragStart.current = { mx: e.clientX, my: e.clientY, px: pos.x, py: pos.y };
    const onMove = (ev: MouseEvent) => {
      const dx = ((ev.clientX - dragStart.current.mx) / rect.width) * 100;
      const dy = ((ev.clientY - dragStart.current.my) / rect.height) * 100;
      setPos({ x: dragStart.current.px + dx, y: dragStart.current.py + dy });
    };
    const onUp = () => { setDragging(false); window.removeEventListener("mousemove", onMove); window.removeEventListener("mouseup", onUp); };
    setDragging(true);
    window.addEventListener("mousemove", onMove);
    window.addEventListener("mouseup", onUp);
  };

  const onResizeMouseDown = (e: React.MouseEvent) => {
    e.stopPropagation();
    e.preventDefault();
    resizeStart.current = { my: e.clientY, fs: fontSize };
    const onMove = (ev: MouseEvent) => {
      const dy = ev.clientY - resizeStart.current.my;
      const newSize = Math.max(1, Math.min(72, Math.round(resizeStart.current.fs + dy / 4)));
      setFontSize(newSize);
    };
    const onUp = () => { setResizing(false); window.removeEventListener("mousemove", onMove); window.removeEventListener("mouseup", onUp); };
    setResizing(true);
    window.addEventListener("mousemove", onMove);
    window.addEventListener("mouseup", onUp);
  };

  const handlePrint = () => {
    const lines = address.split("\n");
    const textHtml = lines.map(l => `<div>${l || "&nbsp;"}</div>`).join("");
    const html = `<!DOCTYPE html><html><head><meta charset="utf-8">
      <style>
        @page { margin: 0; size: A4 portrait; }
        * { box-sizing: border-box; margin: 0; padding: 0; }
        body { width: 210mm; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
        #wrap { position: relative; width: 100%; }
        img { width: 100%; display: block; }
        #addr { position: absolute; left: ${pos.x}%; top: ${pos.y}%;
          font-family: 'Sarabun', 'Helvetica Neue', sans-serif;
          font-size: ${fontSize}pt; color: ${textColor};
          line-height: 1.5; white-space: nowrap; }
      </style>
      <link href="https://fonts.googleapis.com/css2?family=Sarabun:wght@400;600&display=swap" rel="stylesheet">
    </head><body>
      <div id="wrap">
        ${templateSrc ? `<img src="${templateSrc}" />` : ""}
        <div id="addr">${textHtml}</div>
      </div>
      <script>window.onload = function(){ setTimeout(function(){ window.print(); window.close(); }, 800); }</script>
    </body></html>`;
    const win = window.open("", "_blank", "width=800,height=600");
    if (win) { win.document.write(html); win.document.close(); }
  };

  const textLines = address.split("\n");

  const previewContent = (
    <div style={{ position: "relative", width: "100%" }}>
      {templateSrc
        ? <img src={templateSrc} style={{ width: "100%", display: "block" }} />
        : <div style={{ width: "100%", paddingBottom: "56%", background: "#f0f0ec", display: "flex", alignItems: "center", justifyContent: "center", position: "relative" }}>
            <span style={{ position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center", color: "#aaa", fontSize: 14 }}>อัปโหลดเทมเพลตก่อน</span>
          </div>
      }
      {address.trim() && (
        <div
          onMouseDown={onMouseDown}
          style={{
            position: "absolute",
            left: `${pos.x}%`, top: `${pos.y}%`,
            cursor: dragging ? "grabbing" : "grab",
            userSelect: "none",
            fontFamily: "'Sarabun', sans-serif",
            fontSize: `${fontSize}pt`,
            color: textColor,
            lineHeight: 1.5,
            whiteSpace: "nowrap",
            outline: '1.5px dashed rgba(99,102,241,0.7)',
            outlineOffset: 4,
            padding: '2px 4px',
          }}
        >
          {textLines.map((l, i) => <div key={i}>{l || " "}</div>)}
          {/* Resize handle */}
          <div
            onMouseDown={onResizeMouseDown}
            title={fontSize + ' pt — ลากเพื่อปรับขนาด'}
            style={{
              position: 'absolute', bottom: -8, right: -8,
              width: 12, height: 12,
              background: '#6366f1', border: '2px solid #fff',
              borderRadius: 3, cursor: 'se-resize',
              boxShadow: '0 1px 4px rgba(0,0,0,0.3)',
            }}
          />
        </div>
      )}
    </div>
  );

  return (
    <>
      {/* Portal: hidden print-only content */}
      {createPortal(
        <div id="winx-print-address" style={{ display: "none", position: "relative", width: "100%" }}>
          {templateSrc && <img src={templateSrc} style={{ width: "100%", display: "block" }} />}
          {address.trim() && (
            <div id="winx-print-address-text" style={{
              position: "absolute", left: `${pos.x}%`, top: `${pos.y}%`,
              fontFamily: "'Sarabun', sans-serif", fontSize: `${fontSize}pt`,
              color: textColor, lineHeight: 1.5, whiteSpace: "nowrap",
            }}>
              {textLines.map((l, i) => <div key={i}>{l || " "}</div>)}
            </div>
          )}
        </div>,
        document.body
      )}

      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4 print:hidden">
        <div className="w-full max-w-5xl rounded-xl border border-border bg-surface shadow-2xl flex flex-col" style={{ maxHeight: "94vh" }}>
          {/* Header */}
          <div className="flex items-center justify-between border-b border-border px-6 py-4 shrink-0">
            <div className="flex items-center gap-2">
              <MapPin className="h-4 w-4 text-accent" />
              <span className="font-semibold">พิมพ์ที่อยู่</span>
            </div>
            <button onClick={onClose} className="text-muted hover:text-foreground"><X className="h-4 w-4" /></button>
          </div>

          <div className="flex flex-col min-[720px]:flex-row flex-1 min-h-0">
            {/* Left: controls */}
            <div className="shrink-0 w-full min-[720px]:w-60 border-b min-[720px]:border-b-0 min-[720px]:border-r border-border p-5 space-y-4 overflow-y-auto">
              <div>
                <label className="text-xs font-medium text-muted-2 block mb-1.5">เทมเพลต (JPG/PNG/SVG)</label>
                <button onClick={() => fileRef.current?.click()}
                  className="w-full flex items-center gap-2 rounded-lg border border-border px-3 py-2 text-sm hover:bg-surface-2 transition-colors">
                  <Upload className="h-3.5 w-3.5 text-muted-2" />
                  {templateSrc ? "เปลี่ยนเทมเพลต" : "อัปโหลดเทมเพลต"}
                </button>
                <input ref={fileRef} type="file" accept="image/jpeg,image/png,image/svg+xml" className="hidden" onChange={handleFile} />
              </div>

              <div>
                <label className="text-xs font-medium text-muted-2 block mb-1.5">ที่อยู่</label>
                <textarea value={address} onChange={e => setAddress(e.target.value)}
                  placeholder={"ชื่อผู้รับ\nที่อยู่บรรทัด 1\nที่อยู่บรรทัด 2\nรหัสไปรษณีย์"}
                  rows={5}
                  className="w-full rounded-lg border border-border bg-surface-2 px-3 py-2 text-sm text-foreground placeholder:text-muted-2 focus:border-accent focus:outline-none resize-none" />
              </div>

              <div>
                <label className="text-xs font-medium text-muted-2 block mb-1.5">ขนาดตัวอักษร</label>
                <div className="flex items-center gap-2">
                  <button onClick={() => setFontSize(f => Math.max(1, f - 1))} className="rounded-lg border border-border p-1.5 hover:bg-surface-2"><Minus className="h-3.5 w-3.5" /></button>
                  <input
                    type="number" min={1} max={72}
                    value={fontSize}
                    onChange={e => { const v = Math.max(1, Math.min(72, Number(e.target.value))); if (!isNaN(v)) setFontSize(v); }}
                    className="w-16 text-center text-sm font-medium rounded-lg border border-border bg-surface px-2 py-1 focus:outline-none focus:border-accent"
                  />
                  <span className="text-xs text-muted-2">pt</span>
                  <button onClick={() => setFontSize(f => Math.min(72, f + 1))} className="rounded-lg border border-border p-1.5 hover:bg-surface-2"><Plus className="h-3.5 w-3.5" /></button>
                </div>
                {fontSize < 8 && (
                  <p className="text-xs text-warning mt-1">⚠ ขนาดเล็กมาก แนะนำ 10–16 pt</p>
                )}
              </div>

              <div>
                <label className="text-xs font-medium text-muted-2 block mb-1.5">สีตัวอักษร</label>
                <div className="flex items-center gap-2">
                  <input type="color" value={textColor} onChange={e => setTextColor(e.target.value)} className="h-8 w-8 rounded border border-border cursor-pointer" />
                  <span className="text-xs text-muted-2 font-mono">{textColor}</span>
                </div>
              </div>

              <p className="text-[11px] text-muted-2 flex items-start gap-1">
                <GripVertical className="h-3.5 w-3.5 shrink-0 mt-0.5" />
                ลากข้อความบนภาพเพื่อจัดตำแหน่ง
              </p>

              <button
                onClick={() => {
                  localStorage.setItem(SETTINGS_KEY, JSON.stringify({ address, fontSize, textColor, pos }));
                  setSaved(true);
                  setTimeout(() => setSaved(false), 2000);
                }}
                className="w-full flex items-center justify-center gap-2 rounded-lg border border-border px-4 py-2.5 text-sm font-medium hover:bg-surface-2 transition-colors"
              >
                {saved ? "✓ บันทึกแล้ว" : "บันทึกตำแหน่ง"}
              </button>

              <button onClick={handlePrint} disabled={!templateSrc}
                className="w-full flex items-center justify-center gap-2 rounded-lg bg-accent px-4 py-2.5 text-sm font-medium text-accent-foreground hover:opacity-90 transition-opacity disabled:opacity-40">
                <Printer className="h-4 w-4" />
                พิมพ์
              </button>
            </div>

            {/* Right: preview */}
            <div ref={previewRef} className="flex-1 overflow-auto bg-[#e8e8e8] dark:bg-[#1a1a1a] p-6 flex items-start justify-center min-h-0">
              <div className="w-full max-w-2xl shadow-lg rounded overflow-hidden">
                {previewContent}
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}

// ── Main Page ──────────────────────────────────────────────────
export default function DeliveryNoteDetailPage() {
  const { id } = useParams<{ id: string }>();
  const [order, setOrder] = useState<Order | null>(null);
  const [production, setProduction] = useState<ProductionData | null>(null);
  const [loading, setLoading] = useState(true);
  const [showAddress, setShowAddress] = useState(false);
  const [showPrint, setShowPrint] = useState(false);
  const printUrl = `/delivery-notes/${id}/print`;

  useEffect(() => {
    if (!id) return;
    Promise.all([
      fetch(`/api/orders/${id}`).then(r => r.json()),
      fetch(`/api/production/${id}`).then(r => r.json()),
    ]).then(([o, p]) => {
      setOrder(o);
      setProduction(p);
      setLoading(false);
    });
  }, [id]);

  if (loading) return <div className="py-32 text-center text-sm text-muted-2">กำลังโหลด…</div>;
  if (!order) return <div className="py-32 text-center text-sm text-muted-2">ไม่พบออเดอร์</div>;

  const players = production?.players ?? [];

  return (
    <div className="min-h-screen">
      {/* Header */}
      <div className="border-b border-border bg-surface px-4 py-4 min-[720px]:px-8">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Link href="/delivery-notes" className="rounded-lg p-1.5 text-muted hover:bg-surface-2 transition-colors">
              <ArrowLeft className="h-4 w-4" />
            </Link>
            <div>
              <h1 className="text-xl font-bold">{order.teamName}</h1>
              <p className="text-xs text-muted-2 mt-0.5">
                {order.id}
                {order.deliveryDate && <> · วันจัดส่ง {formatDate(order.deliveryDate)}</>}
                {players.length > 0 && <> · {players.length} ตัว</>}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setShowAddress(true)}
              className="flex items-center gap-1.5 rounded-lg border border-border px-3 py-2 text-sm hover:bg-surface-2 transition-colors"
            >
              <MapPin className="h-4 w-4 text-muted-2" />
              <span className="hidden min-[720px]:inline">พิมพ์ที่อยู่</span>
            </button>
            <button
              onClick={() => setShowPrint(true)}
              disabled={players.length === 0}
              className="flex items-center gap-1.5 rounded-lg bg-accent px-3 py-2 text-sm font-medium text-accent-foreground hover:opacity-90 transition-opacity disabled:opacity-40"
            >
              <Printer className="h-4 w-4" />
              <span className="hidden min-[720px]:inline">พิมพ์ใบส่งของ</span>
            </button>
          </div>
        </div>
      </div>

      {/* Info chips */}
      <div className="px-4 pt-5 min-[720px]:px-8 flex flex-wrap gap-2">
        {order.shirtType && (
          <span className="rounded-full bg-surface-2 border border-border px-3 py-1 text-xs text-muted-2">
            {order.shirtType}
          </span>
        )}
        {order.fabricType && (
          <span className="rounded-full bg-surface-2 border border-border px-3 py-1 text-xs text-muted-2">
            {order.fabricType}
          </span>
        )}
        {order.collarType && (
          <span className="rounded-full bg-surface-2 border border-border px-3 py-1 text-xs text-muted-2">
            {order.collarType}
          </span>
        )}
      </div>

      {/* Table */}
      <div className="px-4 py-5 min-[720px]:px-8">
        {players.length === 0 ? (
          <div className="py-16 text-center text-sm text-muted-2 rounded-xl border border-border">
            ยังไม่มีตารางสั่งผลิต
          </div>
        ) : (
          <div className="rounded-xl border border-border bg-surface shadow-sm overflow-hidden">
            {/* Table header */}
            <div className="grid gap-3 px-5 py-2.5 border-b border-border bg-surface-2 text-[11px] font-medium text-muted-2 uppercase tracking-wider"
              style={{ gridTemplateColumns: "44px 1fr 64px 64px 1fr 48px" }}>
              <span>#</span>
              <span>ชื่อ</span>
              <span>ไซส์</span>
              <span>เลข</span>
              <span>รายละเอียด</span>
              <span className="text-center">✓</span>
            </div>
            <div className="divide-y divide-border">
              {players.map((p, i) => (
                <div
                  key={p.id}
                  className={cn(
                    "grid gap-3 px-5 py-3 items-center text-sm",
                    i % 2 === 1 && "bg-surface-2"
                  )}
                  style={{ gridTemplateColumns: "44px 1fr 64px 64px 1fr 48px" }}
                >
                  <span className="text-muted-2 text-xs">{i + 1}</span>
                  <span className="font-medium truncate">{p.name || "—"}</span>
                  <span className={cn(
                    "text-xs font-semibold rounded px-1.5 py-0.5 w-fit",
                    p.size === "XL" || p.size === "2XL" || p.size === "3XL" ? "bg-orange-500/10 text-orange-500"
                    : p.size === "S" || p.size === "SS" ? "bg-blue-500/10 text-blue-500"
                    : "bg-surface-2 text-foreground"
                  )}>{p.size || "—"}</span>
                  <span className="text-muted-2 text-xs">{p.number || "—"}</span>
                  <span className="text-xs text-muted-2 truncate">{p.note || ""}</span>
                  <div className="flex justify-center">
                    <span className="h-4 w-4 rounded border-2 border-border block" />
                  </div>
                </div>
              ))}
            </div>
            {/* Footer summary */}
            <div className="px-5 py-3 border-t border-border bg-surface-2 flex items-center gap-6 text-xs text-muted-2">
              <span>รวม <span className="font-semibold text-foreground">{players.length} ตัว</span></span>
              {["SS","S","M","L","XL","2XL","3XL"].map(size => {
                const c = players.filter(p => p.size === size).length;
                return c > 0 ? <span key={size}>{size} × {c}</span> : null;
              })}
            </div>
          </div>
        )}
      </div>

      {showAddress && <AddressModal onClose={() => setShowAddress(false)} defaultAddress={order.deliveryAddress} orderId={order.id} />}
      {showPrint && <PrintSlipModal order={order} players={players} onClose={() => setShowPrint(false)} />}
    </div>
  );
}
