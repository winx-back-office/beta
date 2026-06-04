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

const BASE = typeof window !== "undefined" ? window.location.origin : "http://localhost:3000";

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
  const url = `${BASE}/cut/${job.token}`;

  useEffect(() => {
    QRCode.toDataURL(url, { width: 280, margin: 2 }).then(setQrUrl).catch(() => {});
  }, [url]);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm">
      <div className="w-full max-w-sm rounded-[var(--radius-lg)] border border-border bg-surface shadow-2xl">
        <div className="flex items-center justify-between border-b border-border px-5 py-3">
          <span className="text-sm font-semibold">QR ใบงานตัด — {job.id}</span>
          <button onClick={onClose} className="text-muted hover:text-foreground text-lg">✕</button>
        </div>
        <div className="px-5 py-6 flex flex-col items-center gap-4">
          {qrUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={qrUrl} alt="QR" className="rounded-xl" width={220} height={220} />
          ) : (
            <div className="h-56 w-56 flex items-center justify-center">
              <Loader2 className="h-8 w-8 animate-spin text-muted" />
            </div>
          )}
          <div className="w-full rounded-[var(--radius-md)] border border-border bg-surface-2 px-3 py-2 font-mono text-xs text-muted break-all text-center">
            {url}
          </div>
          <div className="text-xs text-muted text-center">{job.teamName} · {job.shirtType}</div>
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
            onClick={() => window.print()}
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
    (o) => o.type !== "design" && o.shirtType && o.collarType && !usedOrderIds.has(o.id)
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
    setSaving(false);
    if (data.job) onCreate(data.job);
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
                  {o.id} · {o.teamName}
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
    Promise.all([
      fetch("/api/cutting-jobs").then((r) => r.json()),
      fetch("/api/orders").then((r) => r.json()),
      fetch("/api/shirt-styles").then((r) => r.json()),
    ])
      .then(([j, o, s]) => { setJobs(j); setOrders(o); setShirtStyles(s); })
      .catch(() => {})
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
        {/* Jobs Table */}
        <Card className="overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border bg-surface-2">
                  <th className="px-4 py-3 text-left text-xs text-muted-2">รหัส</th>
                  <th className="px-4 py-3 text-left text-xs text-muted-2">ออเดอร์/ทีม</th>
                  <th className="px-4 py-3 text-left text-xs text-muted-2">ทรงเสื้อ</th>
                  <th className="px-4 py-3 text-left text-xs text-muted-2">ปก</th>
                  <th className="px-4 py-3 text-right text-xs text-muted-2">จำนวนตัว</th>
                  <th className="px-4 py-3 text-right text-xs text-muted-2">ชิ้นแพทเทิร์น</th>
                  <th className="px-4 py-3 text-left text-xs text-muted-2">สถานะ</th>
                  <th className="px-4 py-3 text-left text-xs text-muted-2">ช่าง</th>
                  <th className="px-4 py-3 text-left text-xs text-muted-2">เวลารับ</th>
                  <th className="px-4 py-3 text-center text-xs text-muted-2">QR</th>
                  <th className="px-4 py-3 text-right text-xs text-muted-2">จัดการ</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {jobs.length === 0 && (
                  <tr>
                    <td colSpan={11} className="px-4 py-8 text-center text-muted">
                      ยังไม่มีใบงาน — กด &quot;สร้างใบงานใหม่&quot; เพื่อเริ่ม
                    </td>
                  </tr>
                )}
                {jobs.map((job) => (
                  <tr key={job.id} className="hover:bg-surface-2">
                    <td className="px-4 py-3 font-mono text-xs">{job.id}</td>
                    <td className="px-4 py-3">
                      <div className="font-medium">{job.teamName}</div>
                      <div className="text-xs text-muted">{job.orderId}</div>
                    </td>
                    <td className="px-4 py-3 text-xs">{job.shirtType}</td>
                    <td className="px-4 py-3 text-xs">{job.collarType}</td>
                    <td className="px-4 py-3 text-right font-medium">{job.quantity}</td>
                    <td className="px-4 py-3 text-right font-bold text-accent">{job.patternPieces}</td>
                    <td className="px-4 py-3"><StatusBadge status={job.status} /></td>
                    <td className="px-4 py-3 text-xs text-muted">{job.cutterName ?? "-"}</td>
                    <td className="px-4 py-3 text-xs text-muted">{formatDateTime(job.startedAt)}</td>
                    <td className="px-4 py-3 text-center">
                      <button
                        onClick={() => setQrJob(job)}
                        className="inline-flex h-8 w-8 items-center justify-center rounded-md text-muted hover:bg-surface-3 hover:text-foreground"
                        title="แสดง QR"
                      >
                        <QrCode className="h-4 w-4" />
                      </button>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        {job.status === "cutting" && (
                          <button
                            onClick={() => markDone(job)}
                            disabled={marking === job.id}
                            className="inline-flex items-center gap-1 rounded-md bg-success/20 px-2.5 py-1 text-xs text-success hover:bg-success/30 disabled:opacity-50"
                          >
                            {marking === job.id ? <Loader2 className="h-3 w-3 animate-spin" /> : <Check className="h-3 w-3" />}
                            เสร็จแล้ว
                          </button>
                        )}
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
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>

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
  const [status, setStatus] = useState<CuttingJob["status"]>(job.status);
  const [saving, setSaving] = useState(false);

  const fieldCls = "w-full rounded-[var(--radius-md)] border border-border bg-surface-2 px-3 py-2 text-sm text-foreground focus:border-accent focus:outline-none";

  const handleSave = async () => {
    setSaving(true);
    const res = await fetch(`/api/cutting-jobs/${job.id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ note, status }),
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

          {/* Note */}
          <div>
            <label className="text-xs text-muted-2 mb-1 block">หมายเหตุ</label>
            <textarea
              className={`${fieldCls} resize-none`}
              rows={3}
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="หมายเหตุเพิ่มเติม..."
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
