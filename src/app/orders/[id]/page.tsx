"use client";

import { useEffect, useRef, useState } from "react";
import { PageHeader, Badge, Button, Card } from "@/components/ui";
import {
  orderTotal,
  orderSubtotal,
  orderVat,
  orderBalance,
  orderProfit,
  costTotal,
  CUSTOMER_TYPE_LABEL,
  type Order,
  type ProductionCost,
} from "@/lib/types";
import { formatBaht, formatDate } from "@/lib/utils";
import { ArrowLeft, FileSpreadsheet, Table2, Loader2, Pencil, X, Check, Camera, Link2, Copy, CheckCheck, CreditCard } from "lucide-react";
import { CuttingJobCard } from "@/components/cutting-job-card";
import { PaymentRequestModal } from "@/components/payment-request-modal";
import Link from "next/link";
import { useParams } from "next/navigation";
import { useShirtStyleOptions, useShirtStyles, useFabricsData, calcProductionPrice } from "@/lib/use-catalog";

interface PaymentRequestLocal {
  token: string;
  orderId: string;
  teamName: string;
  amount: number;
  accountIndex: number;
  note: string;
  status: "pending" | "slip_uploaded" | "approved" | "rejected";
  createdAt: string;
  slipUrl: string | null;
  slipUploadedAt: string | null;
  approvedAt?: string | null;
  approvedAmount?: number | null;
}

export default function OrderDetailPage() {
  const { id } = useParams<{ id: string }>();
  const [order, setOrder] = useState<Order | null>(null);
  const [loading, setLoading] = useState(true);
  const [paymentRequests, setPaymentRequests] = useState<PaymentRequestLocal[]>([]);
  const [paymentModalOpen, setPaymentModalOpen] = useState(false);
  const [paymentDefaultAmount, setPaymentDefaultAmount] = useState<number | undefined>();

  useEffect(() => {
    fetch(`/api/orders/${id}`)
      .then((r) => r.json())
      .then((data) => { setOrder(data); setLoading(false); });
    fetch("/api/payment-requests", { cache: "no-store" })
      .then((r) => r.json())
      .then((all: PaymentRequestLocal[]) => {
        setPaymentRequests(all.filter((pr) => pr.orderId === id));
      })
      .catch(() => {});
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

  const optimisticUpdate = (patch: Partial<Order>) => {
    setOrder(prev => prev ? { ...prev, ...patch } : prev);
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
          <div className="flex gap-2">
            <Link href="/orders">
              <Button variant="outline">
                <ArrowLeft className="h-4 w-4" />
                กลับ
              </Button>
            </Link>
          </div>
        }
      />

      <div className="grid w-full max-w-6xl grid-cols-1 gap-4 px-8 py-4 lg:grid-cols-3">
        {/* Left */}
        <div className="space-y-4 lg:col-span-2">
          <OrderInfoCard order={order} onSave={save} onOptimisticUpdate={optimisticUpdate} />
          {isProduce && <FinanceCard order={order} onSave={save} />}
          {isProduce && order.hasProductionTable && <ProductionSummaryCard orderId={order.id} />}
          {paymentRequests.filter(pr => pr.status === "slip_uploaded").map(pr => (
            <SlipApprovalCard
              key={pr.token}
              pr={pr}
              onApprove={async (approvedAmount) => {
                await fetch(`/api/payment-requests/${pr.token}`, {
                  method: "PUT",
                  headers: { "Content-Type": "application/json" },
                  body: JSON.stringify({ status: "approved", approvedAmount, approvedAt: new Date().toISOString() }),
                });
                // Add to deposit
                const newDeposit = (order?.deposit ?? 0) + approvedAmount;
                await save({ deposit: newDeposit });
                setPaymentRequests(prev => prev.map(p => p.token === pr.token ? { ...p, status: "approved", approvedAmount, approvedAt: new Date().toISOString() } : p));
              }}
              onReject={async () => {
                await fetch(`/api/payment-requests/${pr.token}`, {
                  method: "PUT",
                  headers: { "Content-Type": "application/json" },
                  body: JSON.stringify({ status: "rejected" }),
                });
                setPaymentRequests(prev => prev.map(p => p.token === pr.token ? { ...p, status: "rejected" } : p));
              }}
            />
          ))}
        </div>

        {/* Right */}
        <div className="space-y-4">
          {!isProduce && <FinanceCard order={order} onSave={save} />}
          {isProduce && <ProfitCard order={order} />}
          {isProduce && order.cost && <CostCard order={order} onSave={save} />}

          {isProduce && (orderBalance(order) > 0 || paymentRequests.length > 0) && (
            <Card className="p-5 space-y-4">
              <div className="flex items-center gap-2">
                <CreditCard className="h-4 w-4 text-accent" />
                <span className="text-sm font-semibold">เรียกเก็บเงิน</span>
              </div>

              {/* ปุ่มสร้างใหม่ หรือ badge ชำระครบ */}
              {orderBalance(order) > 0 ? (
                <div className="flex gap-2">
                  <button
                    onClick={() => { setPaymentDefaultAmount(order.deposit); setPaymentModalOpen(true); }}
                    className="flex-1 rounded-[var(--radius-md)] border border-border bg-surface-2 px-3 py-2.5 text-sm font-medium text-foreground hover:bg-surface-3 transition-colors"
                  >
                    <div className="flex items-center justify-center gap-1.5 mb-0.5">
                      <CreditCard className="h-3.5 w-3.5" />
                      เก็บมัดจำ
                    </div>
                    <div className="text-xs text-muted">{formatBaht(order.deposit)}</div>
                  </button>
                  <button
                    onClick={() => { setPaymentDefaultAmount(orderBalance(order)); setPaymentModalOpen(true); }}
                    className="flex-1 rounded-[var(--radius-md)] border border-accent/40 bg-accent/10 px-3 py-2.5 text-sm font-medium text-accent hover:bg-accent/20 transition-colors"
                  >
                    <div className="flex items-center justify-center gap-1.5 mb-0.5">
                      <Check className="h-3.5 w-3.5" />
                      ยอดสุดท้าย
                    </div>
                    <div className="text-xs text-accent/70">{formatBaht(orderBalance(order))}</div>
                  </button>
                </div>
              ) : (
                <div className="rounded-[var(--radius-md)] border border-success/30 bg-success/10 px-3 py-2 text-xs text-success text-center">
                  ✅ ชำระครบแล้ว
                </div>
              )}

              {/* ประวัติรายการ payment requests */}
              {paymentRequests.length > 0 && (
                <div className="border-t border-border pt-3 space-y-2">
                  <div className="text-[10px] text-muted uppercase tracking-widest mb-1">ประวัติการเรียกเก็บ</div>
                  {paymentRequests.map((pr) => {
                    const statusLabel: Record<string, { label: string; cls: string }> = {
                      pending:       { label: "รอชำระ",    cls: "text-muted border-border" },
                      slip_uploaded: { label: "รอตรวจสอบ", cls: "text-yellow-400 border-yellow-500/30 bg-yellow-500/10" },
                      approved:      { label: "อนุมัติแล้ว", cls: "text-success border-success/30 bg-success/10" },
                      rejected:      { label: "ปฏิเสธ",    cls: "text-red-400 border-red-500/30 bg-red-500/10" },
                    };
                    const s = statusLabel[pr.status] ?? statusLabel.pending;
                    return (
                      <div key={pr.token} className="rounded-[var(--radius-md)] border border-border bg-surface-2 overflow-hidden">
                        {/* Row: ยอด + status */}
                        <div className="flex items-center justify-between px-3 py-2.5">
                          <div>
                            <div className="text-sm font-semibold">{formatBaht(pr.amount)}</div>
                            <div className="text-[10px] text-muted mt-0.5">
                              {new Date(pr.createdAt).toLocaleDateString("th-TH", { day: "numeric", month: "short", year: "2-digit" })}
                              {pr.approvedAmount != null && pr.approvedAmount !== pr.amount && (
                                <span className="ml-1 text-yellow-400">(ยืนยัน {formatBaht(pr.approvedAmount)})</span>
                              )}
                            </div>
                          </div>
                          <div className="flex items-center gap-2">
                            <span className={`text-[10px] font-medium px-2 py-0.5 rounded-full border ${s.cls}`}>{s.label}</span>
                            <a
                              href={`/pay/${pr.token}`}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-[10px] text-muted hover:text-foreground underline"
                            >
                              ลิงก์ ↗
                            </a>
                            {pr.status === "pending" && (
                              <button
                                onClick={async () => {
                                  if (!confirm("ยกเลิกรายการนี้ใช่ไหม?")) return;
                                  await fetch(`/api/payment-requests/${pr.token}`, { method: "DELETE" });
                                  setPaymentRequests((prev) => prev.filter((r) => r.token !== pr.token));
                                }}
                                className="text-[10px] text-red-400 hover:text-red-300 underline"
                              >
                                ยกเลิก
                              </button>
                            )}
                          </div>
                        </div>
                        {/* สลิป */}
                        {pr.slipUrl && (
                          <div className="border-t border-border px-3 py-2 flex items-center gap-3">
                            <a href={pr.slipUrl} target="_blank" rel="noopener noreferrer" className="shrink-0">
                              {/* eslint-disable-next-line @next/next/no-img-element */}
                              <img src={pr.slipUrl} alt="slip" className="h-14 w-14 rounded-md object-cover border border-border hover:opacity-80 transition-opacity" />
                            </a>
                            <div className="text-[10px] text-muted">
                              <div>อัปโหลดสลิป</div>
                              {pr.slipUploadedAt && (
                                <div className="text-muted/60">{new Date(pr.slipUploadedAt).toLocaleString("th-TH", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" })}</div>
                              )}
                            </div>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </Card>
          )}
          {!isProduce && order.paymentLink && <PaymentLinkCard link={order.paymentLink} />}

          {isProduce && (
            <ProductionTableCard order={order} onSave={save} />
          )}

          {isProduce && (
            <CuttingJobCard orderId={order.id} />
          )}
        </div>
      </div>

      {paymentModalOpen && order && (
        <PaymentRequestModal
          orders={[order]}
          defaultAmount={paymentDefaultAmount}
          onClose={() => { setPaymentModalOpen(false); setPaymentDefaultAmount(undefined); }}
        />
      )}
    </div>
  );
}

// ── ข้อมูลออเดอร์ ──────────────────────────────────────────
function OrderInfoCard({ order, onSave, onOptimisticUpdate }: { order: Order; onSave: (p: Partial<Order>) => Promise<void>; onOptimisticUpdate: (p: Partial<Order>) => void }) {
  const [draft, setDraft] = useState<Partial<Order>>({
    teamName: order.teamName,
    startDate: order.startDate,
    shirtType: order.shirtType,
    fabricType: order.fabricType,
    collarType: order.collarType,
    productionPrice: order.productionPrice,
    designPackage: order.designPackage,
  });
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const isMounted = useRef(false);
  const shirtOptions  = useShirtStyleOptions();
  const shirtStyles   = useShirtStyles();
  const fabricsData   = useFabricsData();

  const selectedStyle = shirtStyles.find(s => s.name === (draft.shirtType ?? ""));
  const filteredFabricOptions = selectedStyle
    ? selectedStyle.fabrics.map(sf => ({ name: sf.name, price: sf.price }))
    : fabricsData.flatMap(f => f.variants.length > 0 ? f.variants.map(v => ({ name: v.name, price: 0 })) : [{ name: f.name, price: 0 }]);
  const filteredCollarOptions = selectedStyle
    ? selectedStyle.collars.map(c => ({ name: c.name, price: c.price }))
    : shirtStyles.flatMap(s => s.collars.map(c => ({ name: c.name, price: c.price }))).filter((v, i, a) => a.findIndex(x => x.name === v.name) === i);

  const autoSave = async (patch: Partial<Order>) => {
    setSaving(true);
    await onSave(patch);
    setSaving(false);
    setSaved(true);
    setTimeout(() => setSaved(false), 1500);
  };

  // auto-recalculate productionPrice เฉพาะเมื่อ user เปลี่ยน ไม่ fire ตอน mount
  useEffect(() => {
    if (!isMounted.current) { isMounted.current = true; return; }
    const { shirtType, fabricType, collarType } = draft;
    if (!shirtType || !fabricType || !collarType) return;
    const result = calcProductionPrice(shirtStyles, fabricsData, shirtType, fabricType, collarType, order.quantity ?? 1);
    const newDraft = result !== null ? { ...draft, productionPrice: result.price } : draft;
    setDraft(newDraft);
    onOptimisticUpdate(newDraft); // update FinanceCard ทันทีก่อน API
    autoSave(newDraft);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [draft.shirtType, draft.fabricType, draft.collarType]);

  return (
    <Card className="p-6">
      <div className="mb-4 flex items-center justify-between">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-2">ข้อมูลออเดอร์</h2>
        <div className="flex items-center gap-1.5 text-xs text-muted">
          {saving && <Loader2 className="h-3 w-3 animate-spin" />}
          {saved && !saving && <><Check className="h-3 w-3 text-success" /><span className="text-success">บันทึกแล้ว</span></>}
        </div>
      </div>
      <dl className="grid grid-cols-2 gap-x-6 gap-y-4 text-sm">
        <EditField label="ชื่อทีม">
          <input className="field-input" value={draft.teamName ?? ""}
            onChange={e => setDraft(d => ({ ...d, teamName: e.target.value }))}
            onBlur={() => autoSave(draft)} />
        </EditField>
        <EditField label="วันที่เริ่ม">
          <input type="date" className="field-input" value={draft.startDate?.slice(0, 10) ?? ""}
            onChange={e => setDraft(d => ({ ...d, startDate: e.target.value }))}
            onBlur={() => autoSave(draft)} />
        </EditField>
        {order.type === "design" ? (
          <EditField label="แพคเกจออกแบบ" full>
            <input className="field-input" value={draft.designPackage ?? ""}
              onChange={e => setDraft(d => ({ ...d, designPackage: e.target.value }))}
              onBlur={() => autoSave(draft)} />
          </EditField>
        ) : (
          <>
            <EditField label="ประเภทเสื้อ">
              <select className="field-input" value={draft.shirtType ?? ""}
                onChange={e => setDraft(d => ({ ...d, shirtType: e.target.value, fabricType: "", collarType: "" }))}>
                <option value="">— เลือกทรงเสื้อ —</option>
                {!shirtOptions.includes(draft.shirtType ?? "") && draft.shirtType && (
                  <option value={draft.shirtType}>{draft.shirtType}</option>
                )}
                {shirtOptions.map(s => <option key={s} value={s}>{s}</option>)}
              </select>
            </EditField>
            <EditField label="เนื้อผ้า">
              <select className="field-input" value={draft.fabricType ?? ""}
                onChange={e => setDraft(d => ({ ...d, fabricType: e.target.value }))}
                disabled={!draft.shirtType}>
                <option value="">{draft.shirtType ? "— เลือกเนื้อผ้า —" : "— เลือกทรงเสื้อก่อน —"}</option>
                {!filteredFabricOptions.some(f => f.name === (draft.fabricType ?? "")) && draft.fabricType && (
                  <option value={draft.fabricType}>{draft.fabricType}</option>
                )}
                {filteredFabricOptions.map(f => (
                  <option key={f.name} value={f.name}>{f.name}{f.price > 0 ? ` (+${f.price} บาท)` : ""}</option>
                ))}
              </select>
            </EditField>
            <EditField label="ประเภทคอ">
              <select className="field-input" value={draft.collarType ?? ""}
                onChange={e => setDraft(d => ({ ...d, collarType: e.target.value }))}
                disabled={!draft.shirtType}>
                <option value="">{draft.shirtType ? "— เลือกประเภทคอ —" : "— เลือกทรงเสื้อก่อน —"}</option>
                {!filteredCollarOptions.some(c => c.name === (draft.collarType ?? "")) && draft.collarType && (
                  <option value={draft.collarType}>{draft.collarType}</option>
                )}
                {filteredCollarOptions.map(c => (
                  <option key={c.name} value={c.name}>{c.name}{c.price > 0 ? ` (+${c.price} บาท)` : ""}</option>
                ))}
              </select>
            </EditField>
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
  const [valuesHidden, setValuesHidden] = useState(false);
  const [draft, setDraft] = useState<ProductionCost>({ ...(order.cost!) });
  const [useOverride, setUseOverride] = useState(!!(order.costOverride && order.costOverride > 0));
  const [overrideDraft, setOverrideDraft] = useState<number>(order.costOverride ?? 0);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  const qty = order.quantity || 1;

  const liveTotal = useOverride
    ? overrideDraft * qty
    : Object.values(draft).reduce((a, b) => a + b, 0) * qty;

  const autoSave = async (patch: Partial<Order>) => {
    setSaving(true);
    await onSave(patch);
    setSaving(false);
    setSaved(true);
    setTimeout(() => setSaved(false), 1500);
  };

  const inputCls = "w-20 rounded-[var(--radius-md)] border border-border bg-surface-2 px-2 py-1 text-right text-sm text-foreground outline-none focus:border-accent [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none";

  return (
    <Card className="p-6">
      <div className="mb-4 flex items-center justify-between">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-2">ต้นทุนการผลิต</h2>
        <button
          onClick={() => setValuesHidden((v) => !v)}
          className="text-xs text-muted hover:text-foreground transition-colors"
        >
          {valuesHidden ? "แสดง" : "ซ่อน"}
        </button>
      </div>

      <div className="space-y-2 text-sm">
        {/* Toggle แยกรายการ / กำหนดรวม */}
        {(
          <div className="flex gap-1 rounded-[var(--radius-md)] border border-border bg-surface-2 p-1 mb-3">
            {([false, true] as const).map((v) => (
              <button
                key={String(v)}
                type="button"
                onClick={() => {
                  setUseOverride(v);
                  autoSave(v ? { costOverride: overrideDraft, cost: draft } : { cost: draft, costOverride: 0 });
                }}
                className={`flex-1 rounded-[var(--radius-sm)] px-3 py-1.5 text-xs font-medium transition-colors ${
                  useOverride === v ? "bg-surface text-foreground shadow-sm" : "text-muted hover:text-foreground"
                }`}
              >
                {v ? "กำหนดรวมเอง" : "แยกรายการ"}
              </button>
            ))}
          </div>
        )}

        {useOverride ? (
          <div className="flex items-center justify-between gap-4">
            <span className="text-muted">ต้นทุนรวม/ตัว</span>
            {valuesHidden ? <span className="text-muted">...</span> : (
              <input type="number" min={0} className={inputCls}
                value={overrideDraft}
                onChange={e => setOverrideDraft(Number(e.target.value))}
                onBlur={e => autoSave({ costOverride: Number(e.target.value), cost: draft })}
              />
            )}
          </div>
        ) : (
          COST_FIELDS.map(({ key, label }) => (
            <div key={key} className="flex items-center justify-between gap-4">
              <span className="text-muted">{label}</span>
              {valuesHidden ? <span className="text-muted">...</span> : (
                <input type="number" min={0} className={inputCls}
                  value={draft[key]}
                  onChange={e => setDraft(d => ({ ...d, [key]: Number(e.target.value) }))}
                  onBlur={() => autoSave({ cost: draft, costOverride: 0 })}
                />
              )}
            </div>
          ))
        )}

        {!useOverride && (
          <div className="flex justify-between border-t border-border pt-2.5 text-muted">
            <span>ต้นทุนรวมต่อตัว</span>
            <span>{valuesHidden ? "..." : formatBaht(Object.values(draft).reduce((a, b) => a + b, 0))}</span>
          </div>
        )}

        <div className="flex justify-between border-t border-border pt-2.5 font-semibold">
          <span>รวมต้นทุนผลิต</span>
          <span className="flex items-center gap-1.5">
            {saving && <Loader2 className="h-3 w-3 animate-spin text-muted" />}
            {saved && !saving && <Check className="h-3 w-3 text-success" />}
            {valuesHidden ? "..." : formatBaht(liveTotal)}
          </span>
        </div>
      </div>
    </Card>
  );
}

// ── สรุปยอด ──────────────────────────────────────────────
function FinanceCard({ order, onSave }: { order: Order; onSave: (p: Partial<Order>) => Promise<void> }) {
  const [draft, setDraft] = useState<Partial<Order>>({
    designPackagePrice: order.designPackagePrice,
    productionPrice: order.productionPrice,
    quantity: order.quantity,
    shipping: order.shipping,
    serviceCharge: order.serviceCharge,
    vat: order.vat,
    deposit: order.deposit,
  });
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [printOpen, setPrintOpen] = useState(false);
  const shirtStylesForFinance = useShirtStyles();

  // sync draft เมื่อ order เปลี่ยนจากภายนอก (เช่น OrderInfoCard auto-save)
  useEffect(() => {
    setDraft({
      designPackagePrice: order.designPackagePrice,
      productionPrice: order.productionPrice,
      quantity: order.quantity,
      shipping: order.shipping,
      serviceCharge: order.serviceCharge,
      vat: order.vat,
      deposit: order.deposit,
    });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [order.productionPrice, order.quantity, order.designPackagePrice, order.shipping, order.serviceCharge, order.vat, order.deposit]);
  const fabricsDataForFinance = useFabricsData();
  const fabricExtra = shirtStylesForFinance
    .find(s => s.name === order.shirtType)
    ?.fabrics.find(f => f.name === order.fabricType)
    ?.price ?? 0;

  const collarExtra = shirtStylesForFinance
    .find(s => s.name === order.shirtType)
    ?.collars.find(c => c.name === order.collarType)
    ?.price ?? 0;

  const calcResult = order.shirtType && order.fabricType && order.collarType
    ? calcProductionPrice(shirtStylesForFinance, fabricsDataForFinance, order.shirtType, order.fabricType, order.collarType, order.quantity ?? 1)
    : null;
  const calculatedPrice = calcResult?.price ?? null;
  const isPriceOutOfSync = calculatedPrice !== null && calculatedPrice !== (order.productionPrice ?? 0);

  const autoSave = async (patch: Partial<Order>) => {
    setSaving(true);
    await onSave(patch);
    setSaving(false);
    setSaved(true);
    setTimeout(() => setSaved(false), 1500);
  };

  const syncPrice = async () => {
    if (calculatedPrice === null) return;
    setSyncing(true);
    await onSave({ productionPrice: calculatedPrice });
    setDraft(d => ({ ...d, productionPrice: calculatedPrice }));
    setSyncing(false);
  };

  const liveOrder = { ...order, ...draft };
  const balance = orderBalance(liveOrder);
  const vatAmount = orderVat(liveOrder);
  const total = orderTotal(liveOrder);

  const numInputCls = "w-24 rounded-[var(--radius-md)] border border-border bg-surface-2 px-2 py-1.5 text-right text-sm text-foreground outline-none focus:border-accent [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none";

  return (
    <>
      <Card className="p-6">
        {isPriceOutOfSync && (
          <div className="mb-4 flex items-center justify-between gap-3 rounded-[var(--radius-md)] border border-warn/40 bg-warn/10 px-4 py-2.5 text-sm">
            <div className="flex items-center gap-2 text-warn">
              <span className="text-base">⚠️</span>
              <span>ราคาผลิตไม่ตรงกับข้อมูลทรงเสื้อปัจจุบัน</span>
              <span className="text-xs text-muted">({formatBaht(order.productionPrice ?? 0)} → {formatBaht(calculatedPrice!)})</span>
            </div>
            <button onClick={syncPrice} disabled={syncing}
              className="shrink-0 rounded-md bg-warn/20 px-3 py-1 text-xs font-semibold text-warn hover:bg-warn/30 transition-colors disabled:opacity-50">
              {syncing ? "กำลังอัปเดต…" : "อัปเดตราคา"}
            </button>
          </div>
        )}

        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-2">สรุปยอด</h2>
          <div className="flex items-center gap-2">
            {saving && <Loader2 className="h-3 w-3 animate-spin text-muted" />}
            {saved && !saving && <Check className="h-3 w-3 text-success" />}
            <button onClick={() => setPrintOpen(true)} className="inline-flex items-center gap-1 rounded-md px-2.5 py-1 text-xs text-muted hover:bg-surface-2 hover:text-foreground">
              <Camera className="h-3.5 w-3.5" /> ส่งลูกค้า
            </button>
          </div>
        </div>

        <div className="space-y-3 text-sm">
          {order.type === "design" ? (
            <div className="flex items-center justify-between gap-3">
              <span>ราคาแพคเกจ</span>
              <input type="number" min={0} className={numInputCls}
                value={draft.designPackagePrice ?? 0}
                onChange={e => setDraft(d => ({ ...d, designPackagePrice: Number(e.target.value) }))}
                onBlur={() => autoSave(draft)} />
            </div>
          ) : (
            <>
              {order.type === "design_produce" && (
                <div className="flex items-center justify-between gap-3">
                  <span>ค่าออกแบบ</span>
                  <input type="number" min={0} className={numInputCls}
                    value={draft.designPackagePrice ?? 0}
                    onChange={e => setDraft(d => ({ ...d, designPackagePrice: Number(e.target.value) }))}
                    onBlur={() => autoSave(draft)} />
                </div>
              )}
              <div className="flex items-center justify-between gap-3">
                <span className="whitespace-nowrap">ราคาผลิต/ตัว</span>
                <input type="number" min={0} className={numInputCls}
                  value={draft.productionPrice ?? 0}
                  onChange={e => setDraft(d => ({ ...d, productionPrice: Number(e.target.value) }))}
                  onBlur={() => autoSave(draft)} />
              </div>
              <div className="flex items-center justify-between gap-3">
                <div>
                  <span className="whitespace-nowrap">จำนวนตัว</span>
                  {(fabricExtra > 0 || collarExtra > 0) && (
                    <div className="text-xs text-muted mt-0.5 font-mono">
                      {(() => {
                        const base = (draft.productionPrice ?? 0) - fabricExtra - collarExtra;
                        const parts = [formatBaht(base)];
                        if (fabricExtra > 0) parts.push(`+${formatBaht(fabricExtra)} ${order.fabricType}`);
                        if (collarExtra > 0) parts.push(`+${formatBaht(collarExtra)} ${order.collarType}`);
                        return `(${parts.join(" ")}) × ${draft.quantity ?? 1} ตัว`;
                      })()}
                    </div>
                  )}
                </div>
                <input type="number" min={1} className={numInputCls}
                  value={draft.quantity ?? 1}
                  onChange={e => setDraft(d => ({ ...d, quantity: Number(e.target.value) }))}
                  onBlur={() => autoSave(draft)} />
              </div>
              <div className="flex items-center justify-between gap-3">
                <span>ค่าจัดส่ง</span>
                <input type="number" min={0} className={numInputCls}
                  value={draft.shipping ?? 0}
                  onChange={e => setDraft(d => ({ ...d, shipping: Number(e.target.value) }))}
                  onBlur={() => autoSave(draft)} />
              </div>
              <div className="flex items-center justify-between gap-3">
                <span>ค่าบริการอื่นๆ</span>
                <input type="number" min={0} className={numInputCls}
                  value={draft.serviceCharge ?? 0}
                  onChange={e => setDraft(d => ({ ...d, serviceCharge: Number(e.target.value) }))}
                  onBlur={() => autoSave(draft)} />
              </div>
              <div className="flex items-center justify-between gap-3">
                <div className="flex items-center gap-2">
                  <span>VAT 7%</span>
                  {draft.vat && <span className="text-xs text-accent font-medium">+{formatBaht(vatAmount)}</span>}
                </div>
                <button type="button"
                  onClick={() => { const next = { ...draft, vat: !draft.vat }; setDraft(next); autoSave(next); }}
                  className={`relative inline-flex h-5 w-9 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 focus:outline-none ${draft.vat ? "bg-accent" : "bg-surface-2"}`}>
                  <span className={`pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow ring-0 transition duration-200 ${draft.vat ? "translate-x-4" : "translate-x-0"}`} />
                </button>
              </div>
            </>
          )}

          <div className="flex justify-between rounded-[var(--radius-md)] bg-accent-soft px-3 py-2.5 text-base font-bold text-accent mt-1">
            <span>ยอดรวมทั้งหมด</span>
            <span>{formatBaht(total)}</span>
          </div>

          <div className="flex items-center justify-between gap-3 rounded-[var(--radius-md)] bg-surface-2 px-3 py-2.5">
            <span className="font-semibold text-muted">ยอดมัดจำ</span>
            <input type="number" min={0}
              className="w-32 text-right font-semibold bg-transparent outline-none border-b border-transparent hover:border-border focus:border-accent transition-colors [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
              value={draft.deposit ?? 0}
              onChange={e => setDraft(d => ({ ...d, deposit: Number(e.target.value) }))}
              onBlur={() => autoSave(draft)} />
          </div>

          <div className="flex justify-between rounded-[var(--radius-md)] bg-warn/10 px-3 py-2.5 font-semibold text-warn">
            <span>ยอดคงเหลือ</span>
            <span>{formatBaht(balance)}</span>
          </div>
        </div>
      </Card>

      {printOpen && <FinancePrintModal order={order} onClose={() => setPrintOpen(false)} />}
    </>
  );
}

// ── กำไรโดยประมาณ (แยกออกจากสรุปยอด) ──────────────────
function ProfitCard({ order }: { order: Order }) {
  const profit = orderProfit(order);
  const [hidden, setHidden] = useState(false);
  if (profit === null) return null;
  return (
    <div className="flex items-center justify-between rounded-[var(--radius-lg)] bg-accent-soft px-4 py-8">
      <div>
        <p className="text-xs font-semibold uppercase tracking-wide text-accent mb-0.5">กำไรโดยประมาณ</p>
        <p className="text-xs text-accent/60">รายรับ − ต้นทุนผลิต</p>
      </div>
      <div className="flex items-center gap-3">
        {hidden ? (
          <span className="text-2xl font-bold text-accent tracking-widest">...</span>
        ) : (
          <span className="text-2xl font-bold text-accent">{formatBaht(profit)}</span>
        )}
        <button
          onClick={() => setHidden((h) => !h)}
          className="text-xs text-accent/50 hover:text-accent transition-colors"
        >
          {hidden ? "แสดง" : "ซ่อน"}
        </button>
      </div>
    </div>
  );
}

// ── Modal แคปส่งลูกค้า ──────────────────────────────────────
function FinancePrintModal({ order, onClose }: { order: Order; onClose: () => void }) {
  const vatAmount = orderVat(order);
  const subtotal = orderSubtotal(order);
  const total = orderTotal(order);
  const balance = orderBalance(order);
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    const lines: string[] = [];
    lines.push(`สรุปยอด — ${order.teamName}`);
    lines.push(`รหัส: ${order.id}`);
    lines.push(`──────────────────`);
    if (order.type !== "design") {
      lines.push(`ราคาผลิต: ${formatBaht(order.productionPrice ?? 0)}/ตัว x ${order.quantity ?? 1} ตัว = ${formatBaht((order.productionPrice ?? 0) * (order.quantity ?? 1))}`);
    }
    if (order.type === "design") {
      lines.push(`ราคาแพคเกจ: ${formatBaht(order.designPackagePrice ?? 0)}`);
    }
    if (order.type === "design_produce") {
      lines.push(`ค่าออกแบบ: ${formatBaht(order.designPackagePrice ?? 0)}`);
    }
    if ((order.shipping ?? 0) > 0) lines.push(`ค่าจัดส่ง: ${formatBaht(order.shipping ?? 0)}`);
    if ((order.serviceCharge ?? 0) > 0) lines.push(`ค่าบริการอื่นๆ: ${formatBaht(order.serviceCharge ?? 0)}`);
    if (order.vat) lines.push(`VAT 7%: ${formatBaht(vatAmount)}`);
    lines.push(`──────────────────`);
    lines.push(`ยอดรวมทั้งหมด: ${formatBaht(total)}`);
    lines.push(`ยอดมัดจำ: ${formatBaht(order.deposit)}`);
    lines.push(`ยอดคงเหลือ: ${formatBaht(balance)}`);
    const text = lines.join("\n");
    const ta = document.createElement("textarea");
    ta.value = text;
    ta.style.position = "fixed";
    ta.style.opacity = "0";
    document.body.appendChild(ta);
    ta.focus();
    ta.select();
    document.execCommand("copy");
    document.body.removeChild(ta);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm">
      <div className="w-full max-w-sm rounded-[var(--radius-lg)] border border-border bg-surface shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-border px-5 py-3">
          <span className="text-sm font-semibold">สรุปยอด — ส่งลูกค้า</span>
          <button onClick={onClose} className="text-muted hover:text-foreground"><X className="h-4 w-4" /></button>
        </div>

        <div className="px-5 py-4 space-y-2.5 text-sm">
          <div className="text-center mb-3">
            <p className="font-bold text-base">{order.teamName}</p>
            <p className="text-xs text-muted">{order.id} · {CUSTOMER_TYPE_LABEL[order.type]}</p>
          </div>

          {order.type !== "design" && (
            <div className="flex items-start justify-between gap-4">
              <div>
                <div>ราคาผลิต</div>
                <div className="text-xs text-muted mt-0.5">{formatBaht(order.productionPrice ?? 0)}/ตัว × {order.quantity ?? 1} ตัว</div>
              </div>
              <span className="font-medium">{formatBaht((order.productionPrice ?? 0) * (order.quantity ?? 1))}</span>
            </div>
          )}
          {order.type === "design" && <SummaryRow label="ราคาแพคเกจ" value={order.designPackagePrice ?? 0} />}
          {order.type === "design_produce" && <SummaryRow label="ค่าออกแบบ" value={order.designPackagePrice ?? 0} />}
          {(order.shipping ?? 0) > 0 && <SummaryRow label="ค่าจัดส่ง" value={order.shipping ?? 0} />}
          {(order.serviceCharge ?? 0) > 0 && <SummaryRow label="ค่าบริการอื่นๆ" value={order.serviceCharge ?? 0} />}
          {order.vat && <SummaryRow label="VAT 7%" value={vatAmount} muted />}

          <div className="flex justify-between rounded-[var(--radius-md)] bg-accent-soft px-3 py-2.5 text-base font-bold text-accent">
            <span>ยอดรวมทั้งหมด</span>
            <span>{formatBaht(total)}</span>
          </div>
          <div className="flex justify-between rounded-[var(--radius-md)] bg-surface-2 px-3 py-2.5 font-semibold text-muted">
            <span>ยอดมัดจำ</span>
            <span className="text-foreground">{formatBaht(order.deposit)}</span>
          </div>
          <div className="flex justify-between rounded-[var(--radius-md)] bg-warn/10 px-3 py-2.5 font-semibold text-warn">
            <span>ยอดคงเหลือ</span>
            <span>{formatBaht(balance)}</span>
          </div>
        </div>

        {/* Actions */}
        <div className="flex gap-2 border-t border-border px-5 py-3">
          <button onClick={onClose} className="flex-1 rounded-md border border-border py-2 text-sm text-muted hover:bg-surface-2">
            ปิด
          </button>
          <button onClick={handleCopy} className="flex-1 rounded-md bg-accent py-2 text-sm font-semibold text-accent-foreground">
            {copied ? "✓ คัดลอกแล้ว" : "คัดลอก"}
          </button>
        </div>
      </div>
    </div>
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
    <div className="flex items-center justify-between gap-3">
      <span className={`whitespace-nowrap ${muted ? "text-muted" : ""}`}>{label}</span>
      <input
        type="number"
        min={0}
        className="field-input w-36 text-right"
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

// ── สลิปรอตรวจสอบ ────────────────────────────────────────────
function SlipApprovalCard({
  pr,
  onApprove,
  onReject,
}: {
  pr: PaymentRequestLocal;
  onApprove: (amount: number) => Promise<void>;
  onReject: () => Promise<void>;
}) {
  const [approvedAmount, setApprovedAmount] = useState(pr.amount);
  const [approving, setApproving] = useState(false);
  const [rejecting, setRejecting] = useState(false);

  return (
    <Card className="p-6 border-yellow-500/30 bg-yellow-500/5">
      <div className="mb-4 flex items-center gap-2">
        <span className="text-yellow-400 text-lg">⏳</span>
        <h2 className="text-sm font-semibold uppercase tracking-wide text-yellow-400">สลิปรอตรวจสอบ</h2>
      </div>
      {pr.slipUrl && (
        <a href={pr.slipUrl} target="_blank" rel="noopener noreferrer" className="block mb-4">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={pr.slipUrl}
            alt="slip"
            className="max-h-64 w-auto rounded-[var(--radius-md)] border border-border object-contain"
          />
        </a>
      )}
      <div className="mb-4 text-sm text-muted">
        <span>ยอดที่ขอ: </span>
        <span className="font-semibold text-foreground">฿{pr.amount.toLocaleString("th-TH")}</span>
      </div>
      <div className="mb-4">
        <label className="text-xs text-muted-2 mb-1 block">ยืนยันยอดที่รับ (บาท)</label>
        <input
          type="number"
          min={0}
          className="field-input w-40"
          value={approvedAmount}
          onChange={(e) => setApprovedAmount(Number(e.target.value))}
        />
      </div>
      <div className="flex gap-2">
        <button
          onClick={async () => { setApproving(true); await onApprove(approvedAmount); setApproving(false); }}
          disabled={approving || rejecting}
          className="flex-1 rounded-[var(--radius-md)] bg-success px-4 py-2 text-sm font-semibold text-white disabled:opacity-60"
        >
          {approving ? "กำลังอนุมัติ…" : "อนุมัติ"}
        </button>
        <button
          onClick={async () => { setRejecting(true); await onReject(); setRejecting(false); }}
          disabled={approving || rejecting}
          className="flex-1 rounded-[var(--radius-md)] border border-danger/40 bg-danger/10 px-4 py-2 text-sm font-semibold text-danger disabled:opacity-60"
        >
          {rejecting ? "กำลังปฏิเสธ…" : "ปฏิเสธ"}
        </button>
      </div>
    </Card>
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
// ── Payment Link Card ──────────────────────────────────────────
function PaymentLinkCard({ link }: { link: string }) {
  const [copied, setCopied] = useState(false);

  const onCopy = () => {
    navigator.clipboard.writeText(link);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <Card className="p-5">
      <div className="flex items-center gap-2 mb-3">
        <Link2 className="h-4 w-4 text-accent" />
        <span className="text-sm font-semibold">ลิงก์ชำระเงิน</span>
      </div>
      <div className="flex items-center gap-2 rounded-[var(--radius-md)] border border-border bg-surface-2 px-3 py-2">
        <span className="flex-1 truncate font-mono text-xs text-muted">{link}</span>
        <button
          onClick={onCopy}
          title="คัดลอกลิงก์"
          className="shrink-0 rounded p-1 text-muted hover:bg-surface-3 hover:text-foreground transition-colors"
        >
          {copied ? <CheckCheck className="h-3.5 w-3.5 text-success" /> : <Copy className="h-3.5 w-3.5" />}
        </button>
      </div>
      <div className="mt-2">
        <a
          href={link}
          target="_blank"
          rel="noopener noreferrer"
          className="block w-full rounded-[var(--radius-md)] border border-border px-3 py-1.5 text-center text-xs text-muted hover:bg-surface-2 hover:text-foreground transition-colors"
        >
          เปิดหน้าชำระเงิน ↗
        </a>
      </div>
    </Card>
  );
}
