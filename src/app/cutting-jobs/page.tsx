"use client";

import { useEffect, useState, useRef } from "react";
import { PageHeader, Badge, Button, Card } from "@/components/ui";
import { Loader2, QrCode, ChevronDown, ChevronUp, Check, Pencil, Scissors, Trash2, X, Shirt } from "lucide-react";
import type { CuttingJob } from "@/app/api/cutting-jobs/route";
import type { Order } from "@/lib/types";
import QRCode from "qrcode";
import { notifyOrdersUpdated } from "@/lib/broadcast";
import { getSession } from "@/lib/auth";

interface Cutter {
  id: string;
  name: string;
  pin: string;
  active: boolean;
}

interface ShirtStyle {
  name: string;
  collars: { name: string; patternPieces: number }[];
}


// ──────────────────────────────────────────────────────
// Status Badge
// ──────────────────────────────────────────────────────
function StatusBadge({ status }: { status: CuttingJob["status"] }) {
  const map: Record<CuttingJob["status"], { label: string; color: string }> = {
    pending:  { label: "รอตัด",      color: "#888" },
    cutting:  { label: "กำลังตัด",   color: "#f97316" },
    cut_done: { label: "ตัดเสร็จ",   color: "#3b82f6" },
    sewing:   { label: "กำลังเย็บ",  color: "#a855f7" },
    done:     { label: "เสร็จสมบูรณ์", color: "#22c55e" },
  };
  const { label, color } = map[status] ?? { label: status, color: "#888" };
  return (
    <span className="inline-flex items-center gap-1 rounded-full border px-2.5 py-0.5 text-xs font-medium"
      style={{ color, borderColor: `${color}40`, backgroundColor: `${color}15` }}>
      {label}
    </span>
  );
}

// ──────────────────────────────────────────────────────
// QR Modal
// ──────────────────────────────────────────────────────
function QRModal({ job, onClose }: { job: CuttingJob; onClose: () => void }) {
  const [qrUrl, setQrUrl] = useState<string>("");
  const [cutUrl, setCutUrl] = useState<string>("");

  useEffect(() => {
    const url = `${window.location.origin}/cut/${job.token}`;
    setCutUrl(url);
    QRCode.toDataURL(url, { width: 280, margin: 2 }).then(setQrUrl).catch(() => {});
  }, [job.token]);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm">
      <div className="w-full max-w-sm rounded-[var(--radius-lg)] border border-border bg-surface shadow-2xl">
        <div className="flex items-center justify-between border-b border-border px-5 py-3">
          <span className="text-sm font-semibold">QR ใบงานตัด — {job.id}</span>
          <button onClick={onClose} className="text-muted hover:text-foreground text-lg">✕</button>
        </div>
        <div id="qr-print-area" className="px-5 py-6 flex flex-col items-center gap-3">
          {qrUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={qrUrl} alt="QR" className="rounded-xl" width={220} height={220} />
          ) : (
            <div className="h-56 w-56 flex items-center justify-center">
              <Loader2 className="h-8 w-8 animate-spin text-muted" />
            </div>
          )}
          <div className="w-[220px] rounded-[var(--radius-md)] border border-border bg-surface-2 px-3 py-2 font-mono text-[10px] text-muted break-all text-center">
            {cutUrl}
          </div>
          <div className="text-sm font-medium text-foreground text-center">{job.teamName}</div>
          <div className="text-xs text-muted text-center -mt-1">{job.shirtType}</div>
          <div className="flex gap-4 text-center">
            <div className="flex flex-col items-center">
              <span className="text-[10px] text-muted">จำนวนตัว</span>
              <span className="text-lg font-bold text-foreground">{job.quantity}</span>
            </div>
            <div className="w-px bg-border" />
            <div className="flex flex-col items-center">
              <span className="text-[10px] text-muted">ชิ้นแพทเทิร์น</span>
              <span className="text-lg font-bold text-accent">{job.patternPieces}</span>
            </div>
            <div className="w-px bg-border" />
            <div className="flex flex-col items-center">
              <span className="text-[10px] text-muted">ชิ้นต่อตัว</span>
              <span className="text-lg font-bold text-green-400">{job.quantity > 0 ? Math.round(job.patternPieces / job.quantity) : "-"}</span>
            </div>
          </div>
        </div>
        <div className="flex gap-2 border-t border-border px-5 py-3">
          <button onClick={onClose} className="flex-1 rounded-md border border-border py-2 text-sm text-muted hover:bg-surface-2">ปิด</button>
          <button
            onClick={() => window.open(`${window.location.origin}/cut/${job.token}`, "_blank")}
            className="flex-1 rounded-md border border-border py-2 text-sm text-muted hover:bg-surface-2"
          >
            เปิดลิงก์ ↗
          </button>
          <button
            onClick={() => {
              if (!qrUrl) return;
              const now = new Date();
              const printedDate = now.toLocaleString("th-TH", { day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" });
              const win = window.open("", "_blank");
              if (!win) return;
              win.document.write(`<!DOCTYPE html><html><head><title>ใบงานตัดแพทเทิร์น — ${job.id}</title>
                <style>
                  * { box-sizing: border-box; margin: 0; padding: 0; }
                  body { font-family: 'Sarabun', sans-serif; background: white; color: #111; display: flex; flex-direction: column; align-items: center; padding: 32px 24px; min-height: 100vh; }
                  .header { text-align: center; margin-bottom: 20px; }
                  .label { font-size: 13px; color: #888; letter-spacing: 0.08em; text-transform: uppercase; margin-bottom: 4px; }
                  .job-id { font-size: 28px; font-weight: 800; letter-spacing: 0.04em; }
                  .divider { width: 48px; height: 3px; background: #111; margin: 12px auto; border-radius: 2px; }
                  img { width: 240px; height: 240px; display: block; margin: 0 auto; }
                  .url { font-size: 9px; color: #aaa; margin-top: 8px; word-break: break-all; text-align: center; max-width: 260px; }
                  .team { font-size: 15px; font-weight: 600; margin-top: 14px; text-align: center; }
                  .shirt { font-size: 12px; color: #666; margin-top: 3px; text-align: center; }
                  .note-box { font-size: 12px; color: #555; margin-top: 8px; background: #f5f5f5; border-radius: 6px; padding: 5px 12px; text-align: center; max-width: 260px; }
                  .stats { display: flex; gap: 24px; justify-content: center; align-items: center; margin-top: 14px; }
                  .stat { display: flex; flex-direction: column; align-items: center; }
                  .stat-label { font-size: 10px; color: #888; margin-bottom: 2px; }
                  .stat-value { font-size: 24px; font-weight: 800; color: #111; }
                  .stat-value.accent { color: #4f46e5; }
                  .stat-unit { font-size: 10px; color: #888; margin-top: 1px; }
                  .stat-divider { width: 1px; height: 36px; background: #ddd; }
                  .printed-at { font-size: 10px; color: #aaa; margin-top: 10px; text-align: center; }
                  .steps { margin-top: 28px; border-top: 1px dashed #ddd; padding-top: 20px; width: 100%; max-width: 300px; }
                  .steps-title { font-size: 11px; font-weight: 700; color: #888; letter-spacing: 0.06em; text-transform: uppercase; margin-bottom: 10px; text-align: center; }
                  .step { display: flex; align-items: flex-start; gap: 10px; margin-bottom: 8px; }
                  .step-num { width: 20px; height: 20px; border-radius: 50%; background: #111; color: white; font-size: 11px; font-weight: 700; display: flex; align-items: center; justify-content: center; flex-shrink: 0; }
                  .step-text { font-size: 12px; color: #444; line-height: 1.5; }
                </style>
              </head><body>
                <div class="header">
                  <div class="label">ใบงานตัดแพทเทิร์น</div>
                  <div class="job-id">${job.id}</div>
                  <div class="divider"></div>
                </div>
                <img src="${qrUrl}" alt="QR"/>
                <div class="url">${cutUrl}</div>
                <div class="team">${job.teamName}</div>
                <div class="shirt">${job.shirtType} · ${job.collarType}</div>
                <div class="stats">
                  <div class="stat">
                    <div class="stat-label">จำนวนตัว</div>
                    <div class="stat-value">${job.quantity}</div>
                    <div class="stat-unit">ตัว</div>
                  </div>
                  <div class="stat-divider"></div>
                  <div class="stat">
                    <div class="stat-label">ชิ้นแพทเทิร์น</div>
                    <div class="stat-value accent">${job.patternPieces}</div>
                    <div class="stat-unit">ชิ้น</div>
                  </div>
                  <div class="stat-divider"></div>
                  <div class="stat">
                    <div class="stat-label">ชิ้นต่อตัว</div>
                    <div class="stat-value" style="color:#16a34a">${job.quantity > 0 ? Math.round(job.patternPieces / job.quantity) : "-"}</div>
                    <div class="stat-unit">ชิ้น/ตัว</div>
                  </div>
                </div>
                ${job.note ? `<div class="note-box"><svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" style="display:inline;vertical-align:middle;margin-right:4px;margin-bottom:1px"><path d="M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L14.5 2z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/><line x1="10" y1="9" x2="8" y2="9"/></svg>${job.note}</div>` : ""}
                <div class="printed-at">พิมพ์เมื่อ: ${printedDate}</div>
                <div class="steps">
                  <div class="steps-title">วิธีการใช้งาน</div>
                  <div class="step"><div class="step-num">1</div><div class="step-text">สแกน QR Code ด้วยกล้องมือถือ</div></div>
                  <div class="step"><div class="step-num">2</div><div class="step-text">กด "รับงาน" แล้วกรอก PIN ของช่างตัด</div></div>
                  <div class="step"><div class="step-num">3</div><div class="step-text">เมื่อตัดเสร็จ กด "ตัดเสร็จแล้ว" เพื่ออัปเดตสถานะ</div></div>
                </div>
                <script>window.onload = () => { window.print(); window.close(); }<\/script>
              </body></html>`);
              win.document.close();
              fetch(`/api/cutting-jobs/${job.id}`, {
                method: "PUT",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ printedAt: new Date().toISOString() }),
              }).catch(() => {});
            }}
            className="flex-1 rounded-md bg-accent py-2 text-sm font-semibold text-accent-foreground"
          >
            พิมพ์
          </button>
        </div>
      </div>
    </div>
  );
}

// ──────────────────────────────────────────────────────
// Create Job Modal
// ──────────────────────────────────────────────────────
function CreateJobModal({
  orders,
  existingJobs,
  shirtStyles,
  onClose,
  onCreate,
}: {
  orders: Order[];
  existingJobs: CuttingJob[];
  shirtStyles: ShirtStyle[];
  onClose: () => void;
  onCreate: (job: CuttingJob) => void;
}) {
  const usedOrderIds = new Set(existingJobs.map((j) => j.orderId));
  const eligible = orders.filter(
    (o) => o.type !== "design" && o.shirtType && o.collarType
  );

  const [selectedId, setSelectedId] = useState("");
  const [note, setNote] = useState("");
  const [saving, setSaving] = useState(false);
  const [quantity, setQuantity] = useState<number>(0);

  const selectedOrder = eligible.find((o) => o.id === selectedId);
  const collarPieces = selectedOrder
    ? (shirtStyles.find((s) => s.name.trim().toLowerCase() === selectedOrder.shirtType?.trim().toLowerCase())?.collars.find((c) => c.name.trim().toLowerCase() === selectedOrder.collarType?.trim().toLowerCase())?.patternPieces ?? 0)
    : 0;
  const totalPieces = quantity * collarPieces;

  const handleSelectOrder = (id: string) => {
    setSelectedId(id);
    const o = eligible.find((o) => o.id === id);
    setQuantity(o?.quantity ?? 1);
  };

  const submit = async () => {
    if (!selectedOrder) return;
    setSaving(true);
    try {
      const res = await fetch("/api/cutting-jobs", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          orderId: selectedOrder.id,
          teamName: selectedOrder.teamName,
          shirtType: selectedOrder.shirtType,
          collarType: selectedOrder.collarType,
          quantity,
          patternPieces: totalPieces,
          note,
        }),
      });
      const data = await res.json();
      if (data.job) onCreate(data.job);
    } catch {
      // ไม่ทำอะไรถ้า offline
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm">
      <div className="w-full max-w-md rounded-[var(--radius-lg)] border border-border bg-surface shadow-2xl">
        <div className="flex items-center justify-between border-b border-border px-5 py-3">
          <span className="text-sm font-semibold">สร้างใบงานตัดใหม่</span>
          <button onClick={onClose} className="text-muted hover:text-foreground text-lg">✕</button>
        </div>

        <div className="px-5 py-5 space-y-4">
          <div>
            <label className="text-xs text-muted-2 mb-1 block">เลือกออเดอร์</label>
            <select
              className="field-input w-full"
              value={selectedId}
              onChange={(e) => handleSelectOrder(e.target.value)}
            >
              <option value="">— เลือกออเดอร์ —</option>
              {eligible.map((o) => (
                <option key={o.id} value={o.id}>
                  {o.id} · {o.teamName}{usedOrderIds.has(o.id) ? " [มีใบตัดแล้ว]" : ""}
                </option>
              ))}
            </select>
            {eligible.length === 0 && (
              <p className="mt-1 text-xs text-muted">ไม่มีออเดอร์ที่พร้อมสร้างใบงาน</p>
            )}
          </div>

          {selectedOrder && (
            <div className="rounded-[var(--radius-md)] border border-border bg-surface-2 p-4 space-y-3 text-sm">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <div className="text-xs text-muted-2 mb-0.5">ทรงเสื้อ</div>
                  <div className="font-medium">{selectedOrder.shirtType}</div>
                </div>
                <div>
                  <div className="text-xs text-muted-2 mb-0.5">ประเภทคอ</div>
                  <div className="font-medium">{selectedOrder.collarType}</div>
                </div>
                <div>
                  <div className="text-xs text-muted-2 mb-1">จำนวนตัว</div>
                  <input
                    type="number"
                    min={1}
                    value={quantity}
                    onChange={(e) => setQuantity(Number(e.target.value))}
                    className="w-full rounded-[var(--radius-md)] border border-border bg-surface px-3 py-1.5 text-xl font-bold focus:border-accent focus:outline-none"
                  />
                </div>
                <div>
                  <div className="text-xs text-muted-2 mb-0.5">ชิ้นแพทเทิร์นรวม</div>
                  <div className="text-xl font-bold text-accent">{totalPieces}</div>
                  {collarPieces > 0 && (
                    <div className="text-xs text-muted mt-0.5">{collarPieces} ชิ้น/ตัว</div>
                  )}
                </div>
              </div>
            </div>
          )}

          <div>
            <label className="text-xs text-muted-2 mb-1 block">หมายเหตุ (ไม่จำเป็น)</label>
            <textarea
              className="field-input w-full"
              rows={2}
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="หมายเหตุเพิ่มเติม…"
            />
          </div>
        </div>

        <div className="flex gap-2 border-t border-border px-5 py-3">
          <button onClick={onClose} className="flex-1 rounded-md border border-border py-2 text-sm text-muted hover:bg-surface-2">ยกเลิก</button>
          <button
            onClick={submit}
            disabled={!selectedOrder || saving}
            className="flex-1 rounded-md bg-accent py-2 text-sm font-semibold text-accent-foreground disabled:opacity-50"
          >
            {saving ? "กำลังสร้าง…" : "สร้างใบงาน"}
          </button>
        </div>
      </div>
    </div>
  );
}

// ──────────────────────────────────────────────────────
// Cutter Management Card
// ──────────────────────────────────────────────────────
function CutterManagementCard() {
  const [cutters, setCutters] = useState<Cutter[]>([]);
  const [editing, setEditing] = useState<Record<string, Cutter>>({});
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/cutters").then((r) => r.json()).then(setCutters).catch(() => {});
  }, []);

  const startEdit = (c: Cutter) => {
    setEditing((prev) => ({ ...prev, [c.id]: { ...c } }));
  };

  const saveOne = async (id: string) => {
    const updated = editing[id];
    if (!updated) return;
    setSaving(id);
    const newCutters = cutters.map((c) => (c.id === id ? updated : c));
    await fetch("/api/cutters", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(newCutters),
    });
    setCutters(newCutters);
    setEditing((prev) => { const n = { ...prev }; delete n[id]; return n; });
    setSaving(null);
  };

  return (
    <Card className="overflow-hidden">
      <button
        className="flex w-full items-center justify-between px-5 py-4 text-sm font-semibold hover:bg-surface-2"
        onClick={() => setOpen((o) => !o)}
      >
        <span className="flex items-center gap-2">
          <Scissors className="h-4 w-4 text-accent" />
          จัดการช่างตัด
        </span>
        {open ? <ChevronUp className="h-4 w-4 text-muted" /> : <ChevronDown className="h-4 w-4 text-muted" />}
      </button>

      {open && (
        <div className="border-t border-border">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border bg-surface-2">
                <th className="px-4 py-2.5 text-left text-xs text-muted-2">ชื่อ</th>
                <th className="px-4 py-2.5 text-left text-xs text-muted-2">PIN</th>
                <th className="px-4 py-2.5 text-left text-xs text-muted-2">สถานะ</th>
                <th className="px-4 py-2.5 text-right text-xs text-muted-2">แก้ไข</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {cutters.map((c) => {
                const isEditing = !!editing[c.id];
                const draft = editing[c.id] ?? c;
                return (
                  <tr key={c.id} className="hover:bg-surface-2">
                    <td className="px-4 py-3">
                      {isEditing ? (
                        <input
                          className="field-input w-40"
                          value={draft.name}
                          onChange={(e) =>
                            setEditing((prev) => ({ ...prev, [c.id]: { ...draft, name: e.target.value } }))
                          }
                        />
                      ) : (
                        c.name
                      )}
                    </td>
                    <td className="px-4 py-3">
                      {isEditing ? (
                        <input
                          className="field-input w-20 font-mono"
                          value={draft.pin}
                          maxLength={4}
                          onChange={(e) =>
                            setEditing((prev) => ({ ...prev, [c.id]: { ...draft, pin: e.target.value } }))
                          }
                        />
                      ) : (
                        <span className="font-mono">{c.pin}</span>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <Badge tone={c.active ? "success" : "neutral"}>
                        {c.active ? "ใช้งาน" : "ไม่ใช้งาน"}
                      </Badge>
                    </td>
                    <td className="px-4 py-3 text-right">
                      {isEditing ? (
                        <button
                          onClick={() => saveOne(c.id)}
                          disabled={saving === c.id}
                          className="inline-flex items-center gap-1 rounded-md bg-accent px-2.5 py-1 text-xs text-accent-foreground disabled:opacity-60"
                        >
                          <Check className="h-3 w-3" /> บันทึก
                        </button>
                      ) : (
                        <button
                          onClick={() => startEdit(c)}
                          className="inline-flex items-center gap-1 rounded-md px-2.5 py-1 text-xs text-muted hover:bg-surface-3 hover:text-foreground"
                        >
                          <Pencil className="h-3 w-3" /> แก้ไข
                        </button>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </Card>
  );
}

// ──────────────────────────────────────────────────────
// Main Page
// ──────────────────────────────────────────────────────
export default function CuttingJobsPage() {
  const [jobs, setJobs] = useState<CuttingJob[]>([]);
  const [orders, setOrders] = useState<Order[]>([]);
  const [shirtStyles, setShirtStyles] = useState<ShirtStyle[]>([]);
  const [loading, setLoading] = useState(true);
  const [createOpen, setCreateOpen] = useState(false);
  const [qrJob, setQrJob] = useState<CuttingJob | null>(null);
  const [marking, setMarking] = useState<string | null>(null);
  const [deleting, setDeleting] = useState<string | null>(null);
  const [editJob, setEditJob] = useState<CuttingJob | null>(null);
  const [editSewingJob, setEditSewingJob] = useState<CuttingJob | null>(null);
  const [cancelingSewing, setCancelingSewing] = useState<string | null>(null);
  const isAdmin = getSession()?.role === "admin";
  const [filterStatus, setFilterStatus] = useState<CuttingJob["status"] | "all">("all");

  const ALL_STATUSES: CuttingJob["status"][] = ["pending", "cutting", "cut_done", "sewing", "done"];
  const LS_CHIP_KEY = "winx-cut-chip-order";
  const [chipOrder, setChipOrder] = useState<CuttingJob["status"][]>(() => {
    if (typeof window === "undefined") return ALL_STATUSES;
    try {
      const s: CuttingJob["status"][] = JSON.parse(localStorage.getItem(LS_CHIP_KEY) ?? "[]");
      if (s.length) {
        const merged = [...s, ...ALL_STATUSES.filter(k => !s.includes(k))];
        return merged;
      }
    } catch {}
    return ALL_STATUSES;
  });
  const dragChip = useRef<CuttingJob["status"] | null>(null);

  const reorderChips = (fromId: CuttingJob["status"], toId: CuttingJob["status"]) => {
    if (fromId === toId) return;
    setChipOrder(prev => {
      const arr = [...prev];
      const fi = arr.indexOf(fromId), ti = arr.indexOf(toId);
      if (fi < 0 || ti < 0) return prev;
      arr.splice(fi, 1); arr.splice(ti, 0, fromId);
      localStorage.setItem(LS_CHIP_KEY, JSON.stringify(arr));
      return arr;
    });
  };

  const statusPriority = Object.fromEntries(chipOrder.map((id, i) => [id, i]));

  const fetchJobs = () =>
    fetch("/api/cutting-jobs", { cache: "no-store" })
      .then((r) => r.json())
      .then(setJobs)
      .catch(() => {});

  useEffect(() => {
    Promise.allSettled([
      fetch("/api/cutting-jobs").then((r) => r.json()),
      fetch("/api/orders").then((r) => r.json()),
      fetch("/api/shirt-styles").then((r) => r.json()),
    ])
      .then(([j, o, s]) => {
        if (j.status === "fulfilled" && Array.isArray(j.value)) setJobs(j.value);
        if (o.status === "fulfilled" && Array.isArray(o.value)) setOrders(o.value);
        if (s.status === "fulfilled" && Array.isArray(s.value)) setShirtStyles(s.value);
      })
      .finally(() => setLoading(false));
  }, []);

  const deleteJob = async (job: CuttingJob) => {
    if (!confirm(`ลบใบงาน ${job.id} (${job.teamName}) ใช่ไหม?`)) return;
    setDeleting(job.id);
    await fetch(`/api/cutting-jobs/${job.id}`, { method: "DELETE" });
    setJobs((prev) => prev.filter((j) => j.id !== job.id));
    setDeleting(null);
  };

  const cancelSewing = async (job: CuttingJob) => {
    if (!confirm(`ยกเลิกการเย็บ "${job.teamName}" ใช่ไหม?\nสถานะจะกลับเป็น "ตัดเสร็จ"`)) return;
    setCancelingSewing(job.id);
    const res = await fetch(`/api/cutting-jobs/${job.id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        status: "cut_done",
        sewingStatus: "pending",
        sewerId: null,
        sewerName: null,
        sewingStartedAt: null,
        sewingCompletedAt: null,
      }),
    });
    const data = await res.json();
    if (data.job) setJobs((prev) => prev.map((j) => (j.id === job.id ? data.job : j)));
    notifyOrdersUpdated();
    setCancelingSewing(null);
  };

  const markDone = async (job: CuttingJob) => {
    setMarking(job.id);
    const res = await fetch(`/api/cutting-jobs/${job.id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: "cut_done", completedAt: new Date().toISOString() }),
    });
    const data = await res.json();
    if (data.job) setJobs((prev) => prev.map((j) => (j.id === job.id ? data.job : j)));
    notifyOrdersUpdated();
    setMarking(null);
  };

  function formatDateTime(iso: string | null) {
    if (!iso) return "-";
    return new Date(iso).toLocaleString("th-TH", {
      day: "2-digit", month: "short",
      hour: "2-digit", minute: "2-digit",
    });
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-32 text-muted">
        <Loader2 className="mr-2 h-5 w-5 animate-spin" /> กำลังโหลด…
      </div>
    );
  }

  return (
    <div>
      <PageHeader
        title="ใบงานตัดแพทเทิร์น"
        subtitle="จัดการใบงานส่งช่างตัดแพทเทิร์น"
        action={
          <Button onClick={() => setCreateOpen(true)}>
            <Scissors className="h-4 w-4" />
            สร้างใบงานใหม่
          </Button>
        }
      />

      <div className="px-6 py-6 space-y-4 max-w-7xl">
        {/* Status filter chips */}
        {(() => {
          const STATUS_META: Record<CuttingJob["status"], { label: string; accent: string }> = {
            pending:  { label: "รอตัด",       accent: "#888888" },
            cutting:  { label: "กำลังตัด",    accent: "#f97316" },
            cut_done: { label: "ตัดเสร็จ",    accent: "#3b82f6" },
            sewing:   { label: "กำลังเย็บ",   accent: "#a855f7" },
            done:     { label: "เสร็จสมบูรณ์", accent: "#22c55e" },
          };
          const displayedCount = filterStatus === "all" ? jobs.length : jobs.filter(j => j.status === filterStatus).length;
          return (
            <div className="rounded-[var(--radius-lg)] border border-border bg-surface px-4 py-3">
              <div className="mb-2 flex items-center gap-2 text-xs text-muted-2">
                <span className="font-medium">กรองสถานะ:</span>
                <span>{displayedCount} / {jobs.length} รายการ</span>
              </div>
              <div className="flex flex-wrap gap-2">
                {/* chip ทั้งหมด */}
                <button
                  onClick={() => setFilterStatus("all")}
                  className="flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-medium transition-all border"
                  style={filterStatus === "all"
                    ? { backgroundColor: "#88888822", color: "#888", borderColor: "#888" }
                    : { backgroundColor: "#88888810", color: "#888", borderColor: "#88888840", opacity: 0.6 }}
                >
                  <span className="h-1.5 w-1.5 rounded-full shrink-0 bg-[#888]" />
                  ทั้งหมด <span className="opacity-70">{jobs.length}</span>
                </button>

                {/* chip แต่ละสถานะ — draggable */}
                {chipOrder.map((key) => {
                  const meta = STATUS_META[key];
                  const count = jobs.filter(j => j.status === key).length;
                  const active = filterStatus === key;
                  return (
                    <div
                      key={key}
                      draggable
                      onDragStart={e => { dragChip.current = key; e.dataTransfer.effectAllowed = "move"; }}
                      onDragEnd={() => { dragChip.current = null; }}
                      onDragOver={e => e.preventDefault()}
                      onDrop={e => {
                        e.preventDefault();
                        if (dragChip.current && dragChip.current !== key) reorderChips(dragChip.current, key);
                        dragChip.current = null;
                      }}
                      className="cursor-grab active:cursor-grabbing select-none"
                    >
                      <button
                        onClick={() => setFilterStatus(active ? "all" : key)}
                        className="flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-medium transition-all border"
                        style={active
                          ? { backgroundColor: `${meta.accent}22`, color: meta.accent, borderColor: meta.accent }
                          : { backgroundColor: `${meta.accent}10`, color: meta.accent, borderColor: `${meta.accent}40`, opacity: 0.6 }}
                      >
                        <span className="h-1.5 w-1.5 rounded-full shrink-0" style={{ backgroundColor: meta.accent }} />
                        {meta.label}
                        <span className="ml-0.5 opacity-70">{count}</span>
                        {active && <X className="h-2.5 w-2.5 ml-0.5" />}
                      </button>
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })()}

        {/* Jobs Card List */}
        {(() => {
          const base = filterStatus === "all" ? jobs : jobs.filter(j => j.status === filterStatus);
          const displayed = [...base].sort((a, b) =>
            (statusPriority[a.status] ?? 99) - (statusPriority[b.status] ?? 99)
          );

          // Group by orderId
          const groups: { orderId: string; teamName: string; jobs: CuttingJob[] }[] = [];
          displayed.forEach(job => {
            const g = groups.find(g => g.orderId === job.orderId);
            if (g) g.jobs.push(job);
            else groups.push({ orderId: job.orderId, teamName: job.teamName, jobs: [job] });
          });

          return (
        <div className="flex flex-col gap-3">
          {groups.length === 0 ? (
            <div className="py-12 text-center text-sm text-muted">
              ยังไม่มีใบงาน — กดปุ่ม &quot;สร้างใบงานใหม่&quot; เพื่อเริ่ม
            </div>
          ) : groups.map(({ orderId, teamName, jobs: groupJobs }) => {
            const sewDone = groupJobs.filter(j => j.sewingStatus === "done").length;
            const sewTotal = groupJobs.length;
            const allDone = groupJobs.every(j => j.status === "done");
            const hasAnySewing = groupJobs.some(j => j.status === "sewing" || j.status === "cut_done" || j.status === "done");
            const defaultExpanded = !allDone && groupJobs.length <= 3;
            return (
              <OrderGroup
                key={orderId}
                orderId={orderId}
                teamName={teamName}
                jobs={groupJobs}
                sewDone={sewDone}
                sewTotal={sewTotal}
                allDone={allDone}
                hasAnySewing={hasAnySewing}
                defaultExpanded={defaultExpanded}
                isAdmin={isAdmin}
                formatDateTime={formatDateTime}
                onEditJob={setEditJob}
                onEditSewingJob={setEditSewingJob}
                onDeleteJob={deleteJob}
                onQrJob={setQrJob}
                onCancelSewing={cancelSewing}
                deleting={deleting}
                cancelingSewing={cancelingSewing}
              />
            );
          })}
        </div>
          );
        })()}

      </div>

      {createOpen && (
        <CreateJobModal
          orders={orders}
          existingJobs={jobs}
          shirtStyles={shirtStyles}
          onClose={() => setCreateOpen(false)}
          onCreate={(job) => {
            setJobs((prev) => [job, ...prev]);
            setCreateOpen(false);
          }}
        />
      )}

      {qrJob && <QRModal job={qrJob} onClose={() => setQrJob(null)} />}

      {editJob && (
        <EditJobModal
          job={editJob}
          shirtStyles={shirtStyles}
          onClose={() => setEditJob(null)}
          onSave={(updated) => {
            setJobs((prev) => prev.map((j) => (j.id === updated.id ? updated : j)));
            setEditJob(null);
          }}
        />
      )}

      {editSewingJob && (
        <EditSewingModal
          job={editSewingJob}
          onClose={() => setEditSewingJob(null)}
          onSave={(updated) => {
            setJobs((prev) => prev.map((j) => (j.id === updated.id ? updated : j)));
            setEditSewingJob(null);
          }}
          onCancel={editSewingJob.sewingStatus !== "pending" ? async () => { await cancelSewing(editSewingJob); setEditSewingJob(null); } : undefined}
        />
      )}
    </div>
  );
}

// ── Order Group ───────────────────────────────────────────
function OrderGroup({
  orderId, teamName, jobs, sewDone, sewTotal, allDone, hasAnySewing,
  defaultExpanded, isAdmin, formatDateTime,
  onEditJob, onEditSewingJob, onDeleteJob, onQrJob, onCancelSewing,
  deleting, cancelingSewing,
}: {
  orderId: string; teamName: string; jobs: CuttingJob[];
  sewDone: number; sewTotal: number; allDone: boolean; hasAnySewing: boolean;
  defaultExpanded: boolean; isAdmin: boolean;
  formatDateTime: (iso: string | null) => string;
  onEditJob: (j: CuttingJob) => void;
  onEditSewingJob: (j: CuttingJob) => void;
  onDeleteJob: (j: CuttingJob) => void;
  onQrJob: (j: CuttingJob) => void;
  onCancelSewing: (j: CuttingJob) => void;
  deleting: string | null; cancelingSewing: string | null;
}) {
  const [expanded, setExpanded] = useState(defaultExpanded);
  const sewingPct = sewTotal > 0 ? Math.round((sewDone / sewTotal) * 100) : 0;

  return (
    <div className="rounded-[var(--radius-lg)] border border-border bg-surface overflow-hidden">
      {/* Summary header */}
      <button
        onClick={() => setExpanded(e => !e)}
        className="w-full flex items-center gap-3 px-5 py-3.5 hover:bg-surface-2 transition-colors text-left"
      >
        <ChevronDown className={`h-4 w-4 text-muted shrink-0 transition-transform ${expanded ? "" : "-rotate-90"}`} />
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
            <span className="font-semibold">{teamName}</span>
            <span className="font-mono text-xs text-muted-2">{orderId}</span>
            <span className="inline-flex items-center gap-1 text-xs text-muted">
              <Scissors className="h-3 w-3" /> <span className="font-semibold">{jobs.length}</span> ใบ
            </span>
            {hasAnySewing && (
              <span className="inline-flex items-center gap-1 text-xs text-muted">
                <Shirt className="h-3 w-3" /> เย็บ <span className={`font-semibold ${sewDone === sewTotal && sewTotal > 0 ? "text-green-400" : "text-purple-400"}`}>{sewDone}/{sewTotal}</span>
              </span>
            )}
            {allDone && (
              <span className="inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[11px] font-medium"
                style={{ color: "#22c55e", borderColor: "#22c55e40", backgroundColor: "#22c55e15" }}>
                เสร็จสมบูรณ์
              </span>
            )}
          </div>
          {hasAnySewing && sewTotal > 0 && (
            <div className="mt-1.5 h-1 w-full max-w-xs rounded-full bg-surface-3 overflow-hidden">
              <div className="h-full rounded-full transition-all" style={{ width: `${sewingPct}%`, backgroundColor: sewDone === sewTotal ? "#22c55e" : "#a855f7" }} />
            </div>
          )}
        </div>
        <span className="text-xs text-muted shrink-0">{expanded ? "ซ่อน" : `ดู ${jobs.length} ใบ`}</span>
      </button>

      {/* Expanded job rows */}
      {expanded && (
        <div className="border-t border-border divide-y divide-border/50">
          {jobs.map(job => {
            const hasSewing = job.status === "cut_done" || job.status === "sewing" || job.status === "done" || job.sewingStatus !== "pending";
            const rowInner = (
            <>
              {/* Job ID + status */}
              <div className="flex items-center gap-2 mb-2">
                <span className="font-mono text-xs text-accent shrink-0">{job.id}</span>
                <span className="text-xs text-muted-2 shrink-0 truncate">{job.orderId}</span>
                <div className="ml-auto shrink-0">
                  <StatusBadge status={job.status} />
                </div>
              </div>

              {/* ช่างตัด */}
              <div className="flex items-center gap-2 mb-1.5">
                <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-accent/10 text-accent">
                  <Scissors className="h-3.5 w-3.5" />
                </div>
                <div className="min-w-0">
                  {job.cutterName
                    ? <span className="text-sm font-medium text-foreground">{job.cutterName}</span>
                    : <span className="text-sm text-muted-2">ยังไม่มีช่างรับ</span>
                  }
                  <span className="ml-1.5 text-[11px] text-muted-2">ช่างตัด</span>
                </div>
                {job.startedAt && <span className="ml-auto text-[11px] text-muted-2 shrink-0">รับ {formatDateTime(job.startedAt)}</span>}
              </div>

              {/* ช่างเย็บ */}
              {hasSewing && (
                <div className="flex items-center gap-2 mb-1.5">
                  <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-purple-500/10 text-purple-400">
                    <Shirt className="h-3.5 w-3.5" />
                  </div>
                  <div className="min-w-0">
                    {job.sewerName
                      ? <span className="text-sm font-medium text-foreground">{job.sewerName}</span>
                      : <span className="text-sm text-muted-2">ยังไม่มีช่างรับ</span>
                    }
                    <span className="ml-1.5 text-[11px] text-muted-2">ช่างเย็บ</span>
                    {job.sewingStatus === "sewing" && !job.sewingCompletedAt && <span className="ml-2 rounded-full border px-2 py-0.5 text-[11px] font-medium" style={{ color:"#a855f7",borderColor:"#a855f740",backgroundColor:"#a855f715"}}>กำลังเย็บ</span>}
                    {job.sewingStatus === "done" && <span className="ml-2 rounded-full border px-2 py-0.5 text-[11px] font-medium" style={{ color:"#22c55e",borderColor:"#22c55e40",backgroundColor:"#22c55e15"}}>เย็บเสร็จ</span>}
                  </div>
                  {job.sewingCompletedAt && <span className="ml-auto text-[11px] text-green-500 shrink-0">ส่ง {formatDateTime(job.sewingCompletedAt)}</span>}
                </div>
              )}

              {/* รายละเอียดเสื้อ — chip เล็กรองลงมา */}
              <div className="flex flex-wrap items-center gap-1.5 mt-2">
                <span className="rounded bg-surface-3 px-1.5 py-0.5 text-[11px] text-muted">{job.shirtType}</span>
                {job.collarType !== job.shirtType && <span className="rounded bg-surface-3 px-1.5 py-0.5 text-[11px] text-muted">{job.collarType}</span>}
                <span className="rounded bg-surface-3 px-1.5 py-0.5 text-[11px] text-muted">{job.quantity} ตัว</span>
                {job.quantity > 0 && <span className="rounded bg-surface-3 px-1.5 py-0.5 text-[11px] text-muted">{Math.round(job.patternPieces / job.quantity)} ชิ้น/ตัว</span>}
                <span className="rounded bg-accent/10 px-1.5 py-0.5 text-[11px] font-semibold text-accent">{job.patternPieces} ชิ้น</span>
                {job.completedAt && <span className="text-[11px] text-green-500 ml-1">ส่งตัด {formatDateTime(job.completedAt)}</span>}
                {job.note && <span className="text-[11px] text-muted-2">· {job.note}</span>}
              </div>
            </>
            );

            if (!isAdmin) {
              return (
                <div key={job.id} className="px-4 py-3 hover:bg-surface-2 transition-colors">
                  {rowInner}
                </div>
              );
            }

            const sewingActive = job.status === "cut_done" || job.status === "sewing" || job.status === "done" || job.sewingStatus !== "pending";
            const actionWidth = (3 + (sewingActive ? 1 : 0)) * 44;

            const inlineActions = (
              <div className="flex items-center gap-0.5 shrink-0">
                <button onClick={() => onQrJob(job)} className="rounded-lg p-1.5 text-muted hover:bg-surface-3 hover:text-foreground transition-colors" title="แสดง QR"><QrCode className="h-4 w-4" /></button>
                <button onClick={() => onEditJob(job)} className="rounded-lg p-1.5 text-muted hover:bg-surface-3 hover:text-foreground transition-colors" title="แก้ไขใบงาน"><Pencil className="h-4 w-4" /></button>
                {sewingActive && (
                  <button onClick={() => onEditSewingJob(job)} className="rounded-lg p-1.5 text-purple-400 hover:bg-purple-500/15 transition-colors" title="แก้ไขงานเย็บ"><Shirt className="h-4 w-4" /></button>
                )}
                <button onClick={() => onDeleteJob(job)} disabled={deleting === job.id} className="rounded-lg p-1.5 text-red-400 hover:bg-red-500/15 transition-colors disabled:opacity-50" title="ลบใบงาน">
                  {deleting === job.id ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
                </button>
              </div>
            );

            return (
              <div key={job.id}>
                {/* Desktop: inline actions */}
                <div className="hidden min-[720px]:flex items-start gap-2 px-4 py-3 hover:bg-surface-2 transition-colors">
                  <div className="flex-1 min-w-0">{rowInner}</div>
                  {inlineActions}
                </div>
                {/* Mobile: swipe to reveal */}
                <div className="min-[720px]:hidden">
                  <SwipeRow
                    actionWidth={actionWidth}
                    actions={
                      <>
                        <button onClick={() => onQrJob(job)} className="flex h-full flex-1 items-center justify-center bg-surface-3 text-muted active:bg-surface-2 transition-colors" title="แสดง QR"><QrCode className="h-4 w-4" /></button>
                        <button onClick={() => onEditJob(job)} className="flex h-full flex-1 items-center justify-center bg-surface-3 text-muted active:bg-surface-2 transition-colors" title="แก้ไขใบงาน"><Pencil className="h-4 w-4" /></button>
                        {sewingActive && (
                          <button onClick={() => onEditSewingJob(job)} className="flex h-full flex-1 items-center justify-center bg-purple-500/85 text-white active:bg-purple-600 transition-colors" title="แก้ไขงานเย็บ"><Shirt className="h-4 w-4" /></button>
                        )}
                        <button onClick={() => onDeleteJob(job)} disabled={deleting === job.id} className="flex h-full flex-1 items-center justify-center bg-red-500 text-white active:bg-red-600 transition-colors disabled:opacity-50" title="ลบใบงาน">
                          {deleting === job.id ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
                        </button>
                      </>
                    }
                  >
                    {rowInner}
                  </SwipeRow>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

// ── Swipe Row — เลื่อนการ์ดไปทางซ้ายเพื่อเผยปุ่มจัดการ ───────
function SwipeRow({
  actions,
  actionWidth = 132,
  children,
}: {
  actions: React.ReactNode;
  actionWidth?: number;
  children: React.ReactNode;
}) {
  const [offset, setOffset] = useState(0);
  const [dragging, setDragging] = useState(false);
  const active = useRef(false);
  const startX = useRef(0);
  const startY = useRef(0);
  const startOffset = useRef(0);
  const axis = useRef<null | "h" | "v">(null);
  const moved = useRef(false);

  const begin = (x: number, y: number) => {
    active.current = true;
    startX.current = x;
    startY.current = y;
    startOffset.current = offset;
    axis.current = null;
    moved.current = false;
    setDragging(true);
  };
  const move = (x: number, y: number) => {
    if (!active.current) return;
    const dx = x - startX.current;
    const dy = y - startY.current;
    if (axis.current === null) {
      if (Math.abs(dx) < 6 && Math.abs(dy) < 6) return;
      axis.current = Math.abs(dx) > Math.abs(dy) ? "h" : "v";
    }
    if (axis.current !== "h") return; // ปล่อยให้ scroll แนวตั้งทำงาน
    moved.current = true;
    let next = startOffset.current + dx;
    if (next > 0) next = 0;
    if (next < -actionWidth) next = -actionWidth;
    setOffset(next);
  };
  const end = () => {
    if (!active.current) return;
    active.current = false;
    setDragging(false);
    setOffset((o) => (o < -actionWidth / 2 ? -actionWidth : 0));
  };

  return (
    <div className="relative overflow-hidden">
      {/* ปุ่มจัดการด้านหลัง — เผยเมื่อเลื่อนการ์ดไปซ้าย */}
      <div className="absolute inset-y-0 right-0 flex" style={{ width: actionWidth }}>
        {actions}
      </div>
      {/* เนื้อหาการ์ด — เลื่อนได้ */}
      <div
        className="relative bg-surface px-4 py-3 select-none"
        style={{
          transform: `translateX(${offset}px)`,
          transition: dragging ? "none" : "transform 0.2s ease",
          touchAction: "pan-y",
        }}
        onTouchStart={(e) => begin(e.touches[0].clientX, e.touches[0].clientY)}
        onTouchMove={(e) => move(e.touches[0].clientX, e.touches[0].clientY)}
        onTouchEnd={end}
        onMouseDown={(e) => begin(e.clientX, e.clientY)}
        onMouseMove={(e) => move(e.clientX, e.clientY)}
        onMouseUp={end}
        onMouseLeave={end}
        onClickCapture={(e) => {
          // ถ้าเปิดอยู่และเป็นการแตะ (ไม่ใช่ลาก) ให้ปิดแทนการกดเนื้อหา
          if (offset !== 0 && !moved.current) {
            e.stopPropagation();
            e.preventDefault();
            setOffset(0);
          }
        }}
      >
        {children}
      </div>
    </div>
  );
}

// ── Edit Job Modal ─────────────────────────────────────────
function EditJobModal({
  job,
  shirtStyles,
  onClose,
  onSave,
}: {
  job: CuttingJob;
  shirtStyles: ShirtStyle[];
  onClose: () => void;
  onSave: (job: CuttingJob) => void;
}) {
  const [shirtType, setShirtType] = useState(job.shirtType);
  const [collarType, setCollarType] = useState(job.collarType);
  const [quantity, setQuantity] = useState(job.quantity);
  const [note, setNote] = useState(job.note ?? "");
  const [cutterNote, setCutterNote] = useState(job.cutterNote ?? "");
  const [status, setStatus] = useState<CuttingJob["status"]>(job.status);
  const [saving, setSaving] = useState(false);

  const fieldCls = "w-full rounded-[var(--radius-md)] border border-border bg-surface-2 px-3 py-2 text-sm text-foreground focus:border-accent focus:outline-none";

  // หาทรงเสื้อที่เลือกอยู่
  const selectedStyle = shirtStyles.find(
    (s) => s.name.trim().toLowerCase() === shirtType.trim().toLowerCase()
  );
  const collarOptions = selectedStyle?.collars ?? [];

  // ชิ้น/ตัว — ใช้ค่าที่บันทึกไว้ก่อน fallback ไป catalog เฉพาะเมื่อยังไม่มีข้อมูล
  const getInitialPiecesPerUnit = () => {
    if (job.quantity > 0 && job.patternPieces > 0) return Math.round(job.patternPieces / job.quantity);
    const style = shirtStyles.find((s) => s.name.trim().toLowerCase() === job.shirtType.trim().toLowerCase());
    const collar = style?.collars.find((c) => c.name.trim().toLowerCase() === job.collarType.trim().toLowerCase());
    if (collar?.patternPieces) return collar.patternPieces;
    return 0;
  };
  const [piecesPerUnit, setPiecesPerUnit] = useState(getInitialPiecesPerUnit);

  // ยอดรวมชิ้น (derive อัตโนมัติ)
  const patternPieces = quantity * piecesPerUnit;

  // เมื่อเปลี่ยนทรงเสื้อ ให้รีเซ็ตปกและชิ้น/ตัว
  const handleShirtChange = (name: string) => {
    setShirtType(name);
    const style = shirtStyles.find((s) => s.name.trim().toLowerCase() === name.trim().toLowerCase());
    const firstCollar = style?.collars[0];
    if (firstCollar) {
      setCollarType(firstCollar.name);
      setPiecesPerUnit(firstCollar.patternPieces);
    }
  };

  // เมื่อเปลี่ยนปก อัปเดตชิ้น/ตัว
  const handleCollarChange = (name: string) => {
    setCollarType(name);
    const style = shirtStyles.find((s) => s.name.trim().toLowerCase() === shirtType.trim().toLowerCase());
    const collar = style?.collars.find((c) => c.name.trim().toLowerCase() === name.trim().toLowerCase());
    if (collar) setPiecesPerUnit(collar.patternPieces);
  };

  const handleQtyChange = (q: number) => setQuantity(q);

  const handleSave = async () => {
    setSaving(true);
    const res = await fetch(`/api/cutting-jobs/${job.id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ shirtType, collarType, quantity, patternPieces, note, cutterNote, status }),
    });
    const data = await res.json();
    if (data.job) { onSave(data.job); notifyOrdersUpdated(); }
    setSaving(false);
  };

  const handleCancelCutting = async () => {
    if (!confirm(`ยกเลิกงานตัด "${job.teamName}" ใช่ไหม?\nสถานะจะกลับเป็น "รอตัด" และล้างข้อมูลช่างตัด`)) return;
    setSaving(true);
    const res = await fetch(`/api/cutting-jobs/${job.id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        status: "pending",
        cutterId: null,
        cutterName: null,
        startedAt: null,
        completedAt: null,
      }),
    });
    const data = await res.json();
    if (data.job) { onSave(data.job); notifyOrdersUpdated(); }
    setSaving(false);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
      <div className="w-full max-w-md rounded-[var(--radius-lg)] border border-border bg-surface shadow-2xl max-h-[90vh] flex flex-col">
        <div className="flex items-center justify-between border-b border-border px-6 py-4 shrink-0">
          <div className="flex items-center gap-2">
            <Pencil className="h-4 w-4 text-accent" />
            <span className="font-semibold">แก้ไขใบงาน {job.id}</span>
          </div>
          <button onClick={onClose} className="text-muted hover:text-foreground"><X className="h-4 w-4" /></button>
        </div>

        <div className="p-6 space-y-4 overflow-y-auto">
          {/* ทีม (read-only) */}
          <div className="rounded-[var(--radius-md)] border border-border bg-surface-2 px-4 py-2.5 text-sm flex justify-between">
            <span className="text-muted">ทีม</span>
            <span className="font-medium">{job.teamName}</span>
          </div>

          {/* ทรงเสื้อ */}
          <div>
            <label className="text-xs text-muted-2 mb-1 block">ทรงเสื้อ</label>
            <select className={fieldCls} value={shirtType} onChange={(e) => handleShirtChange(e.target.value)}>
              {shirtStyles.map((s) => (
                <option key={s.name} value={s.name}>{s.name}</option>
              ))}
              {/* fallback ถ้าไม่อยู่ใน list */}
              {!shirtStyles.some((s) => s.name.trim().toLowerCase() === shirtType.trim().toLowerCase()) && (
                <option value={shirtType}>{shirtType}</option>
              )}
            </select>
          </div>

          {/* ปก */}
          <div>
            <label className="text-xs text-muted-2 mb-1 block">ปก</label>
            {collarOptions.length > 0 ? (
              <select className={fieldCls} value={collarType} onChange={(e) => handleCollarChange(e.target.value)}>
                {collarOptions.map((c) => (
                  <option key={c.name} value={c.name}>{c.name}</option>
                ))}
              </select>
            ) : (
              <input className={fieldCls} value={collarType} onChange={(e) => setCollarType(e.target.value)} />
            )}
          </div>

          {/* จำนวนตัว + ชิ้น/ตัว */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs text-muted-2 mb-1 block">จำนวนตัว</label>
              <input
                type="number" min={1}
                className={fieldCls}
                value={quantity}
                onChange={(e) => handleQtyChange(Number(e.target.value))}
              />
            </div>
            <div>
              <label className="text-xs text-muted-2 mb-1 block">ชิ้นแพทเทิร์น (ชิ้น/ตัว)</label>
              <input
                type="number" min={0}
                className={fieldCls}
                value={piecesPerUnit}
                onChange={(e) => setPiecesPerUnit(Number(e.target.value))}
              />
            </div>
          </div>
          {patternPieces > 0 && (
            <p className="text-xs text-muted-2">รวม {patternPieces} ชิ้น ({quantity} ตัว × {piecesPerUnit} ชิ้น/ตัว)</p>
          )}

          {/* Status */}
          <div>
            <label className="text-xs text-muted-2 mb-1 block">สถานะ</label>
            <select className={fieldCls} value={status} onChange={(e) => setStatus(e.target.value as CuttingJob["status"])}>
              <option value="pending">รอตัด</option>
              <option value="cutting">กำลังตัด</option>
              <option value="cut_done">ตัดเสร็จ</option>
            </select>
          </div>

          {/* Note QR */}
          <div>
            <label className="text-xs text-muted-2 mb-1 block">หมายเหตุ (สำหรับพิมพ์ QR)</label>
            <textarea className={`${fieldCls} resize-none`} rows={2} value={note}
              onChange={(e) => setNote(e.target.value)} placeholder="หมายเหตุเพิ่มเติม..." />
          </div>

          {/* Cutter Note */}
          <div>
            <label className="text-xs text-muted-2 mb-1 block">หมายเหตุจากช่างตัด</label>
            <textarea className={`${fieldCls} resize-none`} rows={2} value={cutterNote}
              onChange={(e) => setCutterNote(e.target.value)} placeholder="หมายเหตุที่ช่างส่งมา..." />
          </div>
        </div>

        <div className="flex items-center justify-between gap-2 border-t border-border px-6 py-3 shrink-0">
          <button
            onClick={handleCancelCutting}
            disabled={saving}
            className="flex items-center gap-1.5 rounded-md border border-red-400/30 px-3 py-2 text-sm text-red-400 hover:bg-red-400/10 transition-colors disabled:opacity-50"
          >
            <X className="h-3.5 w-3.5" /> ยกเลิกงานตัด
          </button>
          <div className="flex gap-2">
            <button onClick={onClose} className="rounded-md border border-border px-4 py-2 text-sm text-muted hover:bg-surface-2">ปิด</button>
            <Button onClick={handleSave} disabled={saving}>
              {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />}
              บันทึก
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ── Edit Sewing Modal ──────────────────────────────────────
interface Sewer { id: string; name: string; pin: string; active: boolean; }

function EditSewingModal({
  job,
  onClose,
  onSave,
  onCancel,
}: {
  job: CuttingJob;
  onClose: () => void;
  onSave: (job: CuttingJob) => void;
  onCancel?: () => void;
}) {
  const [sewers, setSewers] = useState<Sewer[]>([]);
  const [sewerId, setSewerId] = useState(job.sewerId ?? "");
  const [sewerName, setSewerName] = useState(job.sewerName ?? "");
  const [sewingStatus, setSewingStatus] = useState<CuttingJob["sewingStatus"]>(job.sewingStatus);
  const [sewingStartedAt, setSewingStartedAt] = useState(
    job.sewingStartedAt ? new Date(job.sewingStartedAt).toISOString().slice(0, 16) : ""
  );
  const [sewingCompletedAt, setSewingCompletedAt] = useState(
    job.sewingCompletedAt ? new Date(job.sewingCompletedAt).toISOString().slice(0, 16) : ""
  );
  const [saving, setSaving] = useState(false);

  const fieldCls = "w-full rounded-[var(--radius-md)] border border-border bg-surface-2 px-3 py-2 text-sm text-foreground focus:border-accent focus:outline-none";

  useEffect(() => {
    fetch("/api/sewers").then((r) => r.json()).then(setSewers).catch(() => {});
  }, []);

  const handleSewerSelect = (id: string) => {
    setSewerId(id);
    const s = sewers.find((sw) => sw.id === id);
    setSewerName(s?.name ?? "");
  };

  const handleSave = async () => {
    setSaving(true);
    const statusMap: Record<CuttingJob["sewingStatus"], CuttingJob["status"]> = {
      pending: "cut_done",
      sewing: "sewing",
      done: "done",
    };
    const body: Record<string, unknown> = {
      status: statusMap[sewingStatus],
      sewingStatus,
      sewerId: sewerId || null,
      sewerName: sewerName || null,
      sewingStartedAt: sewingStartedAt ? new Date(sewingStartedAt).toISOString() : null,
      sewingCompletedAt: sewingCompletedAt ? new Date(sewingCompletedAt).toISOString() : null,
    };
    const res = await fetch(`/api/cutting-jobs/${job.id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    const data = await res.json();
    if (data.job) { onSave(data.job); notifyOrdersUpdated(); }
    setSaving(false);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
      <div className="w-full max-w-md rounded-[var(--radius-lg)] border border-border bg-surface shadow-2xl flex flex-col">
        <div className="flex items-center justify-between border-b border-border px-6 py-4 shrink-0">
          <div className="flex items-center gap-2">
            <Shirt className="h-4 w-4 text-purple-400" />
            <span className="font-semibold">แก้ไขงานเย็บ — {job.id}</span>
          </div>
          <button onClick={onClose} className="text-muted hover:text-foreground"><X className="h-4 w-4" /></button>
        </div>

        {/* ข้อมูลอ้างอิง */}
        <div className="mx-6 mt-4 rounded-[var(--radius-md)] border border-border bg-surface-2 px-4 py-2.5 text-xs text-muted flex gap-4">
          <span><span className="text-muted-2">ทีม:</span> <span className="text-foreground font-medium">{job.teamName}</span></span>
          <span><span className="text-muted-2">ทรงเสื้อ:</span> {job.shirtType}</span>
          <span><span className="text-muted-2">จำนวน:</span> {job.quantity} ตัว</span>
        </div>

        <div className="p-6 space-y-4">
          {/* สถานะงานเย็บ */}
          <div>
            <label className="text-xs text-muted-2 mb-1 block">สถานะงานเย็บ</label>
            <select className={fieldCls} value={sewingStatus} onChange={(e) => setSewingStatus(e.target.value as CuttingJob["sewingStatus"])}>
              <option value="pending">รอเย็บ</option>
              <option value="sewing">กำลังเย็บ</option>
              <option value="done">เย็บเสร็จ</option>
            </select>
          </div>

          {/* ช่างเย็บ */}
          <div>
            <label className="text-xs text-muted-2 mb-1 block">ช่างเย็บ</label>
            {sewers.length > 0 ? (
              <select className={fieldCls} value={sewerId} onChange={(e) => handleSewerSelect(e.target.value)}>
                <option value="">— ยังไม่ระบุ —</option>
                {sewers.filter((s) => s.active).map((s) => (
                  <option key={s.id} value={s.id}>{s.name}</option>
                ))}
              </select>
            ) : (
              <input className={fieldCls} value={sewerName} onChange={(e) => setSewerName(e.target.value)} placeholder="ชื่อช่างเย็บ…" />
            )}
          </div>

          {/* เวลารับงาน */}
          <div>
            <label className="text-xs text-muted-2 mb-1 block">เวลารับงาน</label>
            <input type="datetime-local" className={fieldCls} value={sewingStartedAt}
              onChange={(e) => setSewingStartedAt(e.target.value)} />
          </div>

          {/* เวลาส่งงาน */}
          <div>
            <label className="text-xs text-muted-2 mb-1 block">เวลาส่งงาน</label>
            <input type="datetime-local" className={fieldCls} value={sewingCompletedAt}
              onChange={(e) => setSewingCompletedAt(e.target.value)} />
          </div>
        </div>

        <div className="flex items-center justify-between border-t border-border px-6 py-3 shrink-0">
          {onCancel ? (
            <button onClick={onCancel} disabled={saving}
              className="flex items-center gap-1.5 rounded-md border border-red-500/40 px-3 py-2 text-sm text-red-400 hover:bg-red-500/10 disabled:opacity-50 transition-colors">
              <X className="h-3.5 w-3.5" />
              ยกเลิกงานเย็บ
            </button>
          ) : <span />}
          <div className="flex gap-2">
            <button onClick={onClose} className="rounded-md border border-border px-4 py-2 text-sm text-muted hover:bg-surface-2">ปิด</button>
            <Button onClick={handleSave} disabled={saving}>
              {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />}
              บันทึก
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
