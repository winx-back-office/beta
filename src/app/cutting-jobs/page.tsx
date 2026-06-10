"use client";

import { useEffect, useState, useRef } from "react";
import { PageHeader, Badge, Button, Card } from "@/components/ui";
import { Loader2, QrCode, ChevronDown, ChevronUp, Check, Pencil, Scissors, Trash2, X } from "lucide-react";
import type { CuttingJob } from "@/app/api/cutting-jobs/route";
import type { Order } from "@/lib/types";
import QRCode from "qrcode";

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
  if (status === "pending") return <Badge tone="neutral">รอตัด</Badge>;
  if (status === "cutting") return <Badge tone="warn">กำลังตัด ✂️</Badge>;
  return <Badge tone="success">เสร็จแล้ว</Badge>;
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
                ${job.note ? `<div class="note-box">📝 ${job.note}</div>` : ""}
                <div class="steps">
                  <div class="steps-title">วิธีการใช้งาน</div>
                  <div class="step"><div class="step-num">1</div><div class="step-text">สแกน QR Code ด้วยกล้องมือถือ</div></div>
                  <div class="step"><div class="step-num">2</div><div class="step-text">กด "รับงาน" แล้วกรอก PIN ของช่างตัด</div></div>
                  <div class="step"><div class="step-num">3</div><div class="step-text">เมื่อตัดเสร็จ กด "ตัดเสร็จแล้ว" เพื่ออัปเดตสถานะ</div></div>
                </div>
                <script>window.onload = () => { window.print(); window.close(); }<\/script>
              </body></html>`);
              win.document.close();
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

  const markDone = async (job: CuttingJob) => {
    setMarking(job.id);
    const res = await fetch(`/api/cutting-jobs/${job.id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: "done", completedAt: new Date().toISOString() }),
    });
    const data = await res.json();
    if (data.job) setJobs((prev) => prev.map((j) => (j.id === job.id ? data.job : j)));
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

      <div className="px-6 py-6 space-y-6 max-w-7xl">
        {/* Jobs Card List */}
        <div className="flex flex-col gap-2">
          {jobs.length === 0 ? (
            <div className="py-12 text-center text-sm text-muted">
              ยังไม่มีใบงาน — กดปุ่ม &quot;สร้างใบงานใหม่&quot; เพื่อเริ่ม
            </div>
          ) : jobs.map((job) => (
            <div
              key={job.id}
              className="group relative rounded-[var(--radius-lg)] border border-border bg-surface px-5 py-4 transition-colors hover:bg-surface-2"
            >
              {/* Row 1: ID + ทีม + สถานะ + actions */}
              <div className="flex items-center gap-3 mb-2">
                <span className="font-mono text-xs text-accent shrink-0">{job.id}</span>
                <div className="min-w-0 flex-1">
                  <span className="font-semibold truncate">{job.teamName}</span>
                  <span className="ml-2 text-xs text-muted-2">{job.orderId}</span>
                </div>
                <StatusBadge status={job.status} />
                <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                  <button
                    onClick={() => setQrJob(job)}
                    className="rounded p-1.5 text-muted hover:bg-surface-3 hover:text-foreground transition-colors"
                    title="แสดง QR"
                  >
                    <QrCode className="h-3.5 w-3.5" />
                  </button>
                  <button
                    onClick={() => setEditJob(job)}
                    className="rounded p-1.5 text-muted hover:bg-surface-3 hover:text-foreground transition-colors"
                    title="แก้ไขใบงาน"
                  >
                    <Pencil className="h-3.5 w-3.5" />
                  </button>
                  <button
                    onClick={() => deleteJob(job)}
                    disabled={deleting === job.id}
                    className="rounded p-1.5 text-muted hover:bg-red-500/10 hover:text-red-400 transition-colors disabled:opacity-50"
                    title="ลบใบงาน"
                  >
                    {deleting === job.id ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Trash2 className="h-3.5 w-3.5" />}
                  </button>
                </div>
              </div>
              {/* Row 2: ข้อมูลงาน */}
              <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-muted">
                <span>{job.shirtType}</span>
                {job.collarType !== job.shirtType && <span className="text-muted-2">· {job.collarType}</span>}
                <span>{job.quantity} ตัว</span>
                <span>ชิ้นแพทเทิร์น <span className="font-bold text-accent">{job.patternPieces}</span></span>
                {job.cutterName && <span>ช่าง <span className="text-foreground font-medium">{job.cutterName}</span></span>}
                {job.startedAt && <span>รับงาน {formatDateTime(job.startedAt)}</span>}
                {job.note && (
                  <span className="text-muted-2">📝 {job.note}</span>
                )}
              </div>
            </div>
          ))}
        </div>

        {/* Cutter Management */}
        <CutterManagementCard />
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
          onClose={() => setEditJob(null)}
          onSave={(updated) => {
            setJobs((prev) => prev.map((j) => (j.id === updated.id ? updated : j)));
            setEditJob(null);
          }}
        />
      )}
    </div>
  );
}

// ── Edit Job Modal ─────────────────────────────────────────
function EditJobModal({
  job,
  onClose,
  onSave,
}: {
  job: CuttingJob;
  onClose: () => void;
  onSave: (job: CuttingJob) => void;
}) {
  const [note, setNote] = useState(job.note ?? "");
  const [cutterNote, setCutterNote] = useState(job.cutterNote ?? "");
  const [status, setStatus] = useState<CuttingJob["status"]>(job.status);
  const [saving, setSaving] = useState(false);

  const fieldCls = "w-full rounded-[var(--radius-md)] border border-border bg-surface-2 px-3 py-2 text-sm text-foreground focus:border-accent focus:outline-none";

  const handleSave = async () => {
    setSaving(true);
    const res = await fetch(`/api/cutting-jobs/${job.id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ note, cutterNote, status }),
    });
    const data = await res.json();
    if (data.job) onSave(data.job);
    setSaving(false);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
      <div className="w-full max-w-md rounded-[var(--radius-lg)] border border-border bg-surface shadow-2xl">
        <div className="flex items-center justify-between border-b border-border px-6 py-4">
          <div className="flex items-center gap-2">
            <Pencil className="h-4 w-4 text-accent" />
            <span className="font-semibold">แก้ไขใบงาน {job.id}</span>
          </div>
          <button onClick={onClose} className="text-muted hover:text-foreground"><X className="h-4 w-4" /></button>
        </div>

        <div className="p-6 space-y-4">
          {/* Info (read-only) */}
          <div className="rounded-[var(--radius-md)] border border-border bg-surface-2 px-4 py-3 text-sm space-y-1.5">
            <div className="flex justify-between"><span className="text-muted">ทีม</span><span className="font-medium">{job.teamName}</span></div>
            <div className="flex justify-between"><span className="text-muted">ทรงเสื้อ</span><span>{job.shirtType}</span></div>
            <div className="flex justify-between"><span className="text-muted">ปก</span><span>{job.collarType}</span></div>
            <div className="flex justify-between"><span className="text-muted">จำนวน</span><span>{job.quantity} ตัว · {job.patternPieces} ชิ้น</span></div>
          </div>

          {/* Status */}
          <div>
            <label className="text-xs text-muted-2 mb-1 block">สถานะ</label>
            <select className={fieldCls} value={status} onChange={(e) => setStatus(e.target.value as CuttingJob["status"])}>
              <option value="pending">รอตัด</option>
              <option value="cutting">กำลังตัด</option>
              <option value="done">เสร็จแล้ว</option>
            </select>
          </div>

          {/* Note (สำหรับพิมพ์ QR) */}
          <div>
            <label className="text-xs text-muted-2 mb-1 block">หมายเหตุ (สำหรับพิมพ์ QR)</label>
            <textarea
              className={`${fieldCls} resize-none`}
              rows={2}
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="หมายเหตุเพิ่มเติม..."
            />
          </div>

          {/* Cutter Note */}
          <div>
            <label className="text-xs text-muted-2 mb-1 block">หมายเหตุจากช่างตัด</label>
            <textarea
              className={`${fieldCls} resize-none`}
              rows={2}
              value={cutterNote}
              onChange={(e) => setCutterNote(e.target.value)}
              placeholder="หมายเหตุที่ช่างส่งมา..."
            />
          </div>
        </div>

        <div className="flex justify-end gap-2 border-t border-border px-6 py-3">
          <button onClick={onClose} className="rounded-md border border-border px-4 py-2 text-sm text-muted hover:bg-surface-2">ยกเลิก</button>
          <Button onClick={handleSave} disabled={saving}>
            {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />}
            บันทึก
          </Button>
        </div>
      </div>
    </div>
  );
}
