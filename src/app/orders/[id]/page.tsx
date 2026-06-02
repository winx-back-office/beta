"use client";

import { useEffect, useState } from "react";
import { PageHeader, Badge, Button, Card } from "@/components/ui";
import {
  orderTotal,
  orderBalance,
  orderProfit,
  costTotal,
  CUSTOMER_TYPE_LABEL,
  type Order,
  type ProductionCost,
} from "@/lib/types";
import { formatBaht, formatDate } from "@/lib/utils";
import { ArrowLeft, FileSpreadsheet, Table2, Loader2, Pencil, X, Check } from "lucide-react";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useFabricOptions, useShirtStyleOptions, useCollarOptions } from "@/lib/use-catalog";

export default function OrderDetailPage() {
  const { id } = useParams<{ id: string }>();
  const [order, setOrder] = useState<Order | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch(`/api/orders/${id}`)
      .then((r) => r.json())
      .then((data) => { setOrder(data); setLoading(false); });
  }, [id]);

  const save = async (patch: Partial<Order>) => {
    const res = await fetch(`/api/orders/${id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(patch),
    });
    const data = await res.json();
    if (data.order) setOrder(data.order);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-32 text-muted">
        <Loader2 className="mr-2 h-5 w-5 animate-spin" /> กำลังโหลด…
      </div>
    );
  }

  if (!order || "error" in order) {
    return <div className="p-8 text-muted">ไม่พบออเดอร์นี้</div>;
  }

  const isProduce = order.type !== "design";

  return (
    <div>
      <PageHeader
        title={order.teamName}
        subtitle={`${order.id} · ${CUSTOMER_TYPE_LABEL[order.type]}`}
        action={
          <Link href="/orders">
            <Button variant="outline">
              <ArrowLeft className="h-4 w-4" />
              กลับ
            </Button>
          </Link>
        }
      />

      <div className="grid grid-cols-1 gap-6 p-8 lg:grid-cols-3">
        {/* Left */}
        <div className="space-y-6 lg:col-span-2">
          <OrderInfoCard order={order} onSave={save} />
          {isProduce && <FinanceCard order={order} onSave={save} />}
          {isProduce && order.hasProductionTable && <ProductionSummaryCard orderId={order.id} />}
        </div>

        {/* Right */}
        <div className="space-y-6">
          {!isProduce && <FinanceCard order={order} onSave={save} />}
          {isProduce && order.cost && <CostCard order={order} onSave={save} />}

          {isProduce && (
            <ProductionTableCard order={order} onSave={save} />
          )}
        </div>
      </div>
    </div>
  );
}

// ── ข้อมูลออเดอร์ ──────────────────────────────────────────
function OrderInfoCard({ order, onSave }: { order: Order; onSave: (p: Partial<Order>) => Promise<void> }) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState<Partial<Order>>({});
  const [saving, setSaving] = useState(false);
  const shirtOptions  = useShirtStyleOptions();
  const fabricOptions = useFabricOptions();
  const collarOptions = useCollarOptions();

  const start = () => {
    setDraft({
      teamName: order.teamName,
      startDate: order.startDate,
      shirtType: order.shirtType,
      fabricType: order.fabricType,
      collarType: order.collarType,
      quantity: order.quantity,
      designPackage: order.designPackage,
    });
    setEditing(true);
  };

  const cancel = () => setEditing(false);

  const submit = async () => {
    setSaving(true);
    await onSave(draft);
    setSaving(false);
    setEditing(false);
  };

  return (
    <Card className="p-6">
      <CardHeader title="ข้อมูลออเดอร์" editing={editing} saving={saving} onEdit={start} onCancel={cancel} onSave={submit} />
      <dl className="grid grid-cols-2 gap-x-6 gap-y-4 text-sm">
        {editing ? (
          <>
            <EditField label="ชื่อทีม">
              <input className="field-input" value={draft.teamName ?? ""} onChange={e => setDraft(d => ({ ...d, teamName: e.target.value }))} />
            </EditField>
            <EditField label="วันที่เริ่ม">
              <input type="date" className="field-input" value={draft.startDate?.slice(0, 10) ?? ""} onChange={e => setDraft(d => ({ ...d, startDate: e.target.value }))} />
            </EditField>
            {order.type === "design" ? (
              <EditField label="แพคเกจออกแบบ" full>
                <input className="field-input" value={draft.designPackage ?? ""} onChange={e => setDraft(d => ({ ...d, designPackage: e.target.value }))} />
              </EditField>
            ) : (
              <>
                <EditField label="ประเภทเสื้อ">
                  <select className="field-input" value={draft.shirtType ?? ""} onChange={e => setDraft(d => ({ ...d, shirtType: e.target.value }))}>
                    <option value="">— เลือกทรงเสื้อ —</option>
                    {!shirtOptions.includes(draft.shirtType ?? "") && draft.shirtType && (
                      <option value={draft.shirtType}>{draft.shirtType}</option>
                    )}
                    {shirtOptions.map(s => <option key={s} value={s}>{s}</option>)}
                  </select>
                </EditField>
                <EditField label="เนื้อผ้า">
                  <select className="field-input" value={draft.fabricType ?? ""} onChange={e => setDraft(d => ({ ...d, fabricType: e.target.value }))}>
                    <option value="">— เลือกเนื้อผ้า —</option>
                    {!fabricOptions.includes(draft.fabricType ?? "") && draft.fabricType && (
                      <option value={draft.fabricType}>{draft.fabricType}</option>
                    )}
                    {fabricOptions.map(f => <option key={f} value={f}>{f}</option>)}
                  </select>
                </EditField>
                <EditField label="ประเภทคอ">
                  <select className="field-input" value={draft.collarType ?? ""} onChange={e => setDraft(d => ({ ...d, collarType: e.target.value }))}>
                    <option value="">— เลือกประเภทคอ —</option>
                    {!collarOptions.includes(draft.collarType ?? "") && draft.collarType && (
                      <option value={draft.collarType}>{draft.collarType}</option>
                    )}
                    {collarOptions.map(c => <option key={c} value={c}>{c}</option>)}
                  </select>
                </EditField>
                <EditField label="จำนวนตัว">
                  <input type="number" min={1} className="field-input" value={draft.quantity ?? ""} onChange={e => setDraft(d => ({ ...d, quantity: Number(e.target.value) }))} />
                </EditField>
              </>
            )}
          </>
        ) : (
          <>
            <Field label="ชื่อทีม" value={order.teamName} />
            <Field label="วันที่เริ่ม" value={formatDate(order.startDate)} />
            {order.type === "design" ? (
              <Field label="แพคเกจออกแบบ" value={order.designPackage ?? "-"} full />
            ) : (
              <>
                <Field label="ประเภทเสื้อ" value={order.shirtType ?? "-"} />
                <Field label="เนื้อผ้า" value={order.fabricType ?? "-"} />
                <Field label="ประเภทคอ" value={order.collarType ?? "-"} />
                <Field label="จำนวนตัว" value={`${order.quantity ?? 1} ตัว`} />
              </>
            )}
          </>
        )}
      </dl>
    </Card>
  );
}

// ── ต้นทุนการผลิต ───────────────────────────────────────────
const COST_FIELDS: { key: keyof ProductionCost; label: string }[] = [
  { key: "fabric", label: "ผ้า" },
  { key: "paper",  label: "กระดาษ" },
  { key: "ink",    label: "หมึก" },
  { key: "cut",    label: "ตัด" },
  { key: "sew",    label: "เย็บ" },
  { key: "other",  label: "อื่นๆ" },
];

function CostCard({ order, onSave }: { order: Order; onSave: (p: Partial<Order>) => Promise<void> }) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState<ProductionCost>({ ...(order.cost!) });
  const [useOverride, setUseOverride] = useState(!!(order.costOverride && order.costOverride > 0));
  const [overrideDraft, setOverrideDraft] = useState<number>(order.costOverride ?? 0);
  const [saving, setSaving] = useState(false);

  const qty = order.quantity || 1;

  const start = () => {
    setDraft({ ...(order.cost!) });
    setUseOverride(!!(order.costOverride && order.costOverride > 0));
    setOverrideDraft(order.costOverride ?? 0);
    setEditing(true);
  };
  const cancel = () => setEditing(false);
  const submit = async () => {
    setSaving(true);
    if (useOverride) {
      await onSave({ costOverride: overrideDraft, cost: draft });
    } else {
      await onSave({ cost: draft, costOverride: 0 });
    }
    setSaving(false);
    setEditing(false);
  };

  const previewTotal = useOverride
    ? overrideDraft * qty
    : Object.values(draft).reduce((a, b) => a + b, 0) * qty;

  return (
    <Card className="p-6">
      <CardHeader title="ต้นทุนการผลิต" editing={editing} saving={saving} onEdit={start} onCancel={cancel} onSave={submit} />
      <div className="space-y-2.5 text-sm">

        {/* Toggle แยกรายการ / กำหนดรวม */}
        {editing && (
          <div className="flex gap-1 rounded-[var(--radius-md)] border border-border bg-surface-2 p-1 mb-3">
            {([false, true] as const).map((v) => (
              <button
                key={String(v)}
                type="button"
                onClick={() => setUseOverride(v)}
                className={`flex-1 rounded-[var(--radius-sm)] px-3 py-1.5 text-xs font-medium transition-colors ${
                  useOverride === v
                    ? "bg-surface text-foreground shadow-sm"
                    : "text-muted hover:text-foreground"
                }`}
              >
                {v ? "กำหนดรวมเอง" : "แยกรายการ"}
              </button>
            ))}
          </div>
        )}

        {/* Override mode */}
        {useOverride ? (
          editing ? (
            <div className="flex items-center justify-between gap-4">
              <span className="text-muted">ต้นทุนรวม/ตัว</span>
              <input
                type="number"
                min={0}
                className="field-input w-32 text-right"
                value={overrideDraft}
                onChange={e => setOverrideDraft(Number(e.target.value))}
              />
            </div>
          ) : (
            <CostRow label="ต้นทุนรวม/ตัว" value={order.costOverride ?? 0} />
          )
        ) : (
          /* แยกรายการ */
          COST_FIELDS.map(({ key, label }) =>
            editing ? (
              <div key={key} className="flex items-center justify-between gap-4">
                <span className="text-muted">{label}</span>
                <input
                  type="number"
                  min={0}
                  className="field-input w-32 text-right"
                  value={draft[key]}
                  onChange={e => setDraft(d => ({ ...d, [key]: Number(e.target.value) }))}
                />
              </div>
            ) : (
              <CostRow key={key} label={label} value={order.cost![key]} />
            )
          )
        )}

        {/* ต้นทุนรวมต่อตัว — แสดงเฉพาะโหมดแยกรายการ */}
        {!useOverride && (
          <div className="flex justify-between border-t border-border pt-2.5 text-sm text-muted">
            <span>ต้นทุนรวมต่อตัว</span>
            <span>{formatBaht(
              editing
                ? Object.values(draft).reduce((a, b) => a + b, 0)
                : Object.values(order.cost ?? {}).reduce((a: number, b: number) => a + b, 0)
            )}</span>
          </div>
        )}

        <div className="mt-1 flex justify-between border-t border-border pt-2.5 font-semibold">
          <span>รวมต้นทุนผลิต</span>
          <span>{formatBaht(editing ? previewTotal : costTotal(order))}</span>
        </div>
      </div>
    </Card>
  );
}

// ── สรุปการเงิน ──────────────────────────────────────────────
function FinanceCard({ order, onSave }: { order: Order; onSave: (p: Partial<Order>) => Promise<void> }) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState<Partial<Order>>({});
  const [saving, setSaving] = useState(false);

  const start = () => {
    setDraft({
      designPackagePrice: order.designPackagePrice,
      productionPrice: order.productionPrice,
      shipping: order.shipping,
      deposit: order.deposit,
    });
    setEditing(true);
  };
  const cancel = () => setEditing(false);
  const submit = async () => {
    setSaving(true);
    await onSave(draft);
    setSaving(false);
    setEditing(false);
  };

  const previewOrder = editing ? { ...order, ...draft } : order;
  const balance = orderBalance(previewOrder);
  const profit = orderProfit(previewOrder);

  return (
    <Card className="p-6">
      <CardHeader title="สรุปการเงิน" editing={editing} saving={saving} onEdit={start} onCancel={cancel} onSave={submit} />
      <div className="space-y-3 text-sm">
        {order.type === "design" ? (
          editing ? (
            <EditNumRow label="ราคาแพคเกจ" value={draft.designPackagePrice ?? 0} onChange={v => setDraft(d => ({ ...d, designPackagePrice: v }))} />
          ) : (
            <SummaryRow label="ราคาแพคเกจ" value={order.designPackagePrice ?? 0} />
          )
        ) : (
          <>
            {order.type === "design_produce" && (
              editing ? (
                <EditNumRow label="ค่าออกแบบ" value={draft.designPackagePrice ?? 0} onChange={v => setDraft(d => ({ ...d, designPackagePrice: v }))} />
              ) : (
                <SummaryRow label="ค่าออกแบบ" value={order.designPackagePrice ?? 0} />
              )
            )}
            {editing ? (
              <EditNumRow
                label={`ราคาผลิต/ตัว × ${order.quantity ?? 1}`}
                value={draft.productionPrice ?? 0}
                onChange={v => setDraft(d => ({ ...d, productionPrice: v }))}
              />
            ) : (
              <div className="flex items-start justify-between gap-4 text-sm">
                <div>
                  <div>ราคาผลิต</div>
                  <div className="text-xs text-muted mt-0.5">{formatBaht(order.productionPrice ?? 0)}/ตัว × {order.quantity ?? 1} ตัว</div>
                </div>
                <span className="font-medium">{formatBaht((order.productionPrice ?? 0) * (order.quantity ?? 1))}</span>
              </div>
            )}
            {editing ? (
              <EditNumRow label="ค่าจัดส่ง" value={draft.shipping ?? 0} onChange={v => setDraft(d => ({ ...d, shipping: v }))} />
            ) : (
              <SummaryRow label="ค่าจัดส่ง" value={order.shipping ?? 0} />
            )}
          </>
        )}

        <div className="flex justify-between border-t border-border pt-3 text-base font-bold">
          <span>ยอดรวมทั้งหมด</span>
          <span>{formatBaht(orderTotal(previewOrder))}</span>
        </div>

        {editing ? (
          <EditNumRow label="ยอดมัดจำ" value={draft.deposit ?? 0} onChange={v => setDraft(d => ({ ...d, deposit: v }))} muted />
        ) : (
          <SummaryRow label="ยอดมัดจำ" value={order.deposit} muted />
        )}

        <div className="flex justify-between rounded-[var(--radius-md)] bg-warn/10 px-3 py-2.5 font-semibold text-warn">
          <span>ยอดคงเหลือ</span>
          <span>{formatBaht(balance)}</span>
        </div>
        {profit !== null && (
          <div className="flex justify-between rounded-[var(--radius-md)] bg-accent-soft px-3 py-2.5 font-semibold text-accent">
            <span>กำไรโดยประมาณ</span>
            <span>{formatBaht(profit)}</span>
          </div>
        )}
      </div>
    </Card>
  );
}

// ── Shared UI helpers ───────────────────────────────────────
function CardHeader({
  title, editing, saving, onEdit, onCancel, onSave,
}: {
  title: string; editing: boolean; saving: boolean;
  onEdit: () => void; onCancel: () => void; onSave: () => void;
}) {
  return (
    <div className="mb-4 flex items-center justify-between">
      <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-2">{title}</h2>
      {editing ? (
        <div className="flex gap-1.5">
          <button onClick={onCancel} className="inline-flex items-center gap-1 rounded-md px-2.5 py-1 text-xs text-muted hover:bg-surface-2">
            <X className="h-3.5 w-3.5" /> ยกเลิก
          </button>
          <button onClick={onSave} disabled={saving} className="inline-flex items-center gap-1 rounded-md bg-accent px-2.5 py-1 text-xs text-accent-foreground disabled:opacity-60">
            {saving ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Check className="h-3.5 w-3.5" />} บันทึก
          </button>
        </div>
      ) : (
        <button onClick={onEdit} className="inline-flex items-center gap-1 rounded-md px-2.5 py-1 text-xs text-muted hover:bg-surface-2 hover:text-foreground">
          <Pencil className="h-3.5 w-3.5" /> แก้ไข
        </button>
      )}
    </div>
  );
}

function Field({ label, value, full }: { label: string; value: string; full?: boolean }) {
  return (
    <div className={full ? "col-span-2" : ""}>
      <dt className="text-xs text-muted-2">{label}</dt>
      <dd className="mt-0.5 font-medium">{value}</dd>
    </div>
  );
}

function EditField({ label, children, full }: { label: string; children: React.ReactNode; full?: boolean }) {
  return (
    <div className={full ? "col-span-2" : ""}>
      <label className="text-xs text-muted-2">{label}</label>
      <div className="mt-0.5">{children}</div>
    </div>
  );
}

function EditNumRow({ label, value, onChange, muted }: { label: string; value: number; onChange: (v: number) => void; muted?: boolean }) {
  return (
    <div className="flex items-center justify-between gap-4">
      <span className={muted ? "text-muted" : ""}>{label}</span>
      <input
        type="number"
        min={0}
        className="field-input w-32 text-right"
        value={value}
        onChange={e => onChange(Number(e.target.value))}
      />
    </div>
  );
}

function CostRow({ label, value }: { label: string; value: number }) {
  return (
    <div className="flex justify-between text-muted">
      <span>{label}</span>
      <span className="font-medium text-foreground">{formatBaht(value)}</span>
    </div>
  );
}

function SummaryRow({ label, value, muted }: { label: string; value: number; muted?: boolean }) {
  return (
    <div className="flex justify-between">
      <span className={muted ? "text-muted" : ""}>{label}</span>
      <span className="font-medium">{formatBaht(value)}</span>
    </div>
  );
}

// ── การ์ดตารางสั่งผลิต (พร้อมตรวจจำนวน) ─────────────────────
function ProductionTableCard({ order, onSave }: { order: Order; onSave: (p: Partial<Order>) => Promise<void> }) {
  const [tableQty, setTableQty] = useState<number | null>(null);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [updating, setUpdating] = useState(false);

  useEffect(() => {
    if (!order.hasProductionTable) return;
    fetch(`/api/production/${order.id}`, { cache: "no-store" })
      .then(r => r.json())
      .then(data => {
        const count = (data.players as { name: string; size: string }[]).filter(p => p.name || p.size).length;
        setTableQty(count);
      })
      .catch(() => {});
  }, [order.id, order.hasProductionTable]);

  const mismatch = tableQty !== null && tableQty !== (order.quantity ?? 0);

  const handleUpdate = async () => {
    setUpdating(true);
    await onSave({ quantity: tableQty! });
    setUpdating(false);
    setConfirmOpen(false);
  };

  return (
    <>
      <Card className="p-6">
        <div className="mb-3 flex items-center gap-2 text-sm font-medium">
          <Table2 className="h-4 w-4 text-accent" />
          ตารางสั่งผลิต
        </div>
        <p className="mb-4 text-xs text-muted">
          สร้างตารางรายชื่อผู้เล่นและไซส์ — ระบบจะดึงชื่อทีม ประเภทเสื้อ และเนื้อผ้าไปให้อัตโนมัติ
        </p>
        <Link href={`/production-tables/${order.id}`}>
          <Button className="w-full">
            <FileSpreadsheet className="h-4 w-4" />
            {order.hasProductionTable ? "เปิดตารางสั่งผลิต" : "สร้างตารางสั่งผลิต"}
          </Button>
        </Link>
        {order.hasProductionTable && (
          <Badge tone="success" className="mt-3">สร้างแล้ว</Badge>
        )}
        {mismatch && (
          <div className="mt-4 rounded-[var(--radius-md)] border border-warn/40 bg-warn/10 p-3 text-xs">
            <p className="mb-2 text-warn font-medium">
              จำนวนในตารางผลิต ({tableQty} คน) ไม่ตรงกับออเดอร์ ({order.quantity} ตัว)
            </p>
            <button
              onClick={() => setConfirmOpen(true)}
              className="rounded-md bg-warn px-3 py-1.5 text-xs font-semibold text-black"
            >
              อัพเดทจำนวนออเดอร์ให้ตรงกับตาราง
            </button>
          </div>
        )}
      </Card>

      {confirmOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
          <div className="w-80 rounded-[var(--radius-lg)] border border-border bg-surface p-6 shadow-xl">
            <h3 className="mb-2 font-semibold">ยืนยันการอัพเดท</h3>
            <p className="mb-5 text-sm text-muted">
              เปลี่ยนจำนวนตัวในออเดอร์จาก <strong className="text-foreground">{order.quantity} ตัว</strong> เป็น <strong className="text-foreground">{tableQty} ตัว</strong> ตามรายชื่อในตารางผลิต?
            </p>
            <div className="flex gap-2">
              <button
                onClick={() => setConfirmOpen(false)}
                className="flex-1 rounded-md border border-border py-2 text-sm text-muted hover:bg-surface-2"
              >
                ยกเลิก
              </button>
              <button
                onClick={handleUpdate}
                disabled={updating}
                className="flex-1 rounded-md bg-accent py-2 text-sm font-semibold text-accent-foreground disabled:opacity-60"
              >
                {updating ? "กำลังอัพเดท…" : "ยืนยัน"}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

// ── สรุปตารางสั่งผลิต ────────────────────────────────────────
const SIZES = ["SS", "S", "M", "L", "XL", "2XL", "3XL", "4XL", "5XL", "6XL", "7XL", "พิเศษ"];

function ProductionSummaryCard({ orderId }: { orderId: string }) {
  const [data, setData] = useState<{ meta: { fabric: string; collar: string }; players: { name: string; size: string; number: string; checked: boolean }[] } | null>(null);

  useEffect(() => {
    fetch(`/api/production/${orderId}`, { cache: "no-store" })
      .then(r => r.json())
      .then(setData)
      .catch(() => {});
  }, [orderId]);

  if (!data) return null;

  const players = data.players.filter(p => p.name || p.size);
  const sizeCounts = SIZES.reduce<Record<string, number>>((acc, s) => {
    acc[s] = players.filter(p => p.size === s).length;
    return acc;
  }, {});
  const total = players.length;
  const checkedCount = players.filter(p => p.checked).length;

  return (
    <Card className="p-6">
      <div className="mb-4 flex items-center justify-between">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-2">สรุปตารางผลิต</h2>
        <div className="flex items-center gap-2 text-xs text-muted">
          <span>{data.meta.fabric}</span>
          <span>·</span>
          <span>{data.meta.collar}</span>
        </div>
      </div>

      {/* รายชื่อ */}
      <div className="mb-4 max-h-48 overflow-y-auto divide-y divide-border rounded-[var(--radius-md)] border border-border text-sm">
        {players.length === 0 ? (
          <p className="px-4 py-3 text-center text-muted">ยังไม่มีรายชื่อ</p>
        ) : (
          players.map((p, i) => (
            <div key={i} className="flex items-center justify-between px-4 py-2">
              <div className="flex items-center gap-2">
                <span className="w-5 text-xs text-muted-2">{i + 1}</span>
                <span className={p.checked ? "line-through text-muted" : ""}>{p.name || "—"}</span>
                {p.number && <span className="text-xs text-muted">#{p.number}</span>}
              </div>
              <div className="flex items-center gap-3">
                <span className="rounded bg-surface-2 px-2 py-0.5 text-xs font-medium">{p.size || "—"}</span>
                {p.checked && <span className="text-xs text-success">✓</span>}
              </div>
            </div>
          ))
        )}
      </div>

      {/* สรุปไซส์ */}
      <div className="flex flex-wrap gap-2">
        {SIZES.filter(s => sizeCounts[s] > 0).map(s => (
          <span key={s} className="rounded-full bg-accent-soft px-3 py-1 text-xs font-semibold text-accent">
            {s} × {sizeCounts[s]}
          </span>
        ))}
      </div>

      <div className="mt-3 flex items-center justify-between text-xs text-muted border-t border-border pt-3">
        <span>รวม {total} ตัว</span>
        <span>เช็คสินค้าแล้ว {checkedCount}/{total}</span>
      </div>
    </Card>
  );
}
