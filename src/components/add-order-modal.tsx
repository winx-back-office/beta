"use client";

import { useEffect, useMemo, useState } from "react";
import { X, Loader2 } from "lucide-react";
import { Button } from "@/components/ui";
import { cn, formatBaht } from "@/lib/utils";
import type { CustomerType, Order } from "@/lib/types";
import { notifyOrdersUpdated } from "@/lib/broadcast";
import {
  useShirtStyleOptions,
  useShirtStyles, useFabricsData, calcProductionPrice,
} from "@/lib/use-catalog";
const DESIGN_PACKAGES = [
  "แพคเกจ Standard (เสื้ออย่างเดียว)",
  "แพคเกจ Premium (เสื้อ + กางเกง)",
  "แพคเกจ Full Set (เสื้อ + กางเกง + แจ็คเก็ต)",
];

const DEFAULT_COST = { fabric: 0, paper: 0, ink: 0, cut: 0, sew: 0, other: 0 };

interface Props {
  open: boolean;
  onClose: () => void;
  onCreated: (order: Order) => void;
  editOrder?: Order; // ถ้าส่งมา = edit mode
}

export function AddOrderModal({ open, onClose, onCreated, editOrder }: Props) {
  const isEdit = !!editOrder;

  const shirtOptions  = useShirtStyleOptions();
  const shirtStyles   = useShirtStyles();
  const fabricsData   = useFabricsData();

  const [type, setType] = useState<CustomerType>("produce");
  const [teamName, setTeamName] = useState("");
  const [startDate, setStartDate] = useState(new Date().toISOString().slice(0, 10));
  const [deliveryDate, setDeliveryDate] = useState("");
  const [designPackage, setDesignPackage] = useState(DESIGN_PACKAGES[0]);
  const [designPackagePrice, setDesignPackagePrice] = useState("");
  const [shirtType, setShirtType] = useState("");
  const [fabricType, setFabricType] = useState("");
  const [collarType, setCollarType] = useState("");
  const [quantity, setQuantity] = useState("");
  const [productionPrice, setProductionPrice] = useState("");
  const [cost, setCost] = useState(DEFAULT_COST);
  const [costOverride, setCostOverride] = useState("");
  const [shipping, setShipping] = useState("");
  const [deposit, setDeposit] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  // Pre-fill เมื่อเปิด edit mode
  useEffect(() => {
    if (open && editOrder) {
      setType(editOrder.type);
      setTeamName(editOrder.teamName);
      setStartDate(editOrder.startDate);
      setDeliveryDate(editOrder.deliveryDate ?? "");
      setDesignPackage(editOrder.designPackage ?? DESIGN_PACKAGES[0]);
      setDesignPackagePrice(String(editOrder.designPackagePrice ?? ""));
      setShirtType(editOrder.shirtType ?? "");
      setFabricType(editOrder.fabricType ?? "");
      setCollarType(editOrder.collarType ?? "");
      setQuantity(String(editOrder.quantity ?? ""));
      setProductionPrice(String(editOrder.productionPrice ?? ""));
      setCost(editOrder.cost ?? DEFAULT_COST);
      setCostOverride(String(editOrder.costOverride ?? ""));
      setShipping(String(editOrder.shipping ?? ""));
      setDeposit(String(editOrder.deposit ?? ""));
      setError("");
    } else if (open && !editOrder) {
      reset();
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, editOrder]);

  const isDesign = type === "design" || type === "design_produce";
  const isProduce = type === "produce" || type === "design_produce";

  // options ที่ filter ตาม shirtType ที่เลือก
  const selectedStyle = shirtStyles.find(s => s.name === shirtType);
  const filteredFabricOptions = selectedStyle
    ? selectedStyle.fabrics.map(sf => ({ name: sf.name, price: sf.price }))
    : fabricsData.flatMap(f => f.variants.length > 0 ? f.variants.map(v => ({ name: v.name, price: 0 })) : [{ name: f.name, price: 0 }]);
  const filteredCollarOptions = selectedStyle
    ? selectedStyle.collars.map(c => ({ name: c.name, price: c.price }))
    : shirtStyles.flatMap(s => s.collars.map(c => ({ name: c.name, price: c.price }))).filter((v, i, a) => a.findIndex(x => x.name === v.name) === i);

  const [priceHint, setPriceHint] = useState<string>("");

  // reset เนื้อผ้า/คอ เมื่อเปลี่ยนทรงเสื้อ
  useEffect(() => {
    if (!isEdit) { setFabricType(""); setCollarType(""); }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [shirtType]);

  // auto-calc ราคาผลิต/ตัว เมื่อเลือก ทรงเสื้อ / ผ้า / คอ / จำนวน
  useEffect(() => {
    if (!isProduce || !shirtType || !fabricType || !collarType) { setPriceHint(""); return; }
    const qty = parseFloat(quantity) || 0;
    const result = calcProductionPrice(shirtStyles, fabricsData, shirtType, fabricType, collarType, qty);
    if (result !== null) {
      setProductionPrice(String(result.price));
      setPriceHint(result.inRange ? "" : "⚠️ จำนวนอยู่นอกช่วงราคา — ใช้ราคาใกล้เคียง");
    } else {
      setPriceHint("");
    }
  }, [shirtType, fabricType, collarType, quantity, shirtStyles, fabricsData, isProduce]);

  const updateCost = (key: keyof typeof DEFAULT_COST, val: string) => {
    setCost((prev) => {
      const next = { ...prev, [key]: parseFloat(val) || 0 };
      const sum = Object.values(next).reduce((a, b) => a + b, 0);
      setCostOverride(sum > 0 ? String(sum) : "");
      return next;
    });
  };

  const computedTotal = useMemo(() => {
    const designFee = isDesign ? (parseFloat(designPackagePrice) || 0) : 0;
    const qty = parseFloat(quantity) || 1;
    const prodFee = isProduce ? (parseFloat(productionPrice) || 0) * qty : 0;
    const ship = isProduce ? (parseFloat(shipping) || 0) : 0;
    return designFee + prodFee + ship;
  }, [isDesign, isProduce, designPackagePrice, quantity, productionPrice, shipping]);

  const computedCostTotal = useMemo(() => {
    const qty = parseFloat(quantity) || 1;
    const perUnit = costOverride !== ""
      ? parseFloat(costOverride) || 0
      : Object.values(cost).reduce((a, b) => a + b, 0);
    return perUnit * qty;
  }, [cost, costOverride, quantity]);

  const reset = () => {
    setType("produce");
    setTeamName(""); setStartDate(new Date().toISOString().slice(0, 10)); setDeliveryDate("");
    setDesignPackage(DESIGN_PACKAGES[0]); setDesignPackagePrice("");
    setShirtType(""); setFabricType(""); setCollarType("");
    setQuantity(""); setProductionPrice(""); setCost(DEFAULT_COST);
    setCostOverride(""); setShipping(""); setDeposit(""); setError("");
  };

  const handleClose = () => { if (!isEdit) reset(); onClose(); };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!teamName.trim()) { setError("กรุณากรอกชื่อทีม"); return; }
    setSaving(true); setError("");
    try {
      const body: Partial<Order> = {
        type,
        teamName: teamName.trim(),
        startDate,
        deliveryDate: deliveryDate || undefined,
        deposit: parseFloat(deposit) || 0,
        ...(isDesign && {
          designPackage,
          designPackagePrice: parseFloat(designPackagePrice) || 0,
        }),
        ...(isProduce && {
          shirtType,
          fabricType,
          collarType,
          quantity: parseFloat(quantity) || 1,
          productionPrice: parseFloat(productionPrice) || 0,
          cost,
          ...(costOverride !== "" && { costOverride: parseFloat(costOverride) || 0 }),
          shipping: parseFloat(shipping) || 0,
        }),
      };

      const url = isEdit ? `/api/orders/${editOrder!.id}` : "/api/orders";
      const method = isEdit ? "PUT" : "POST";

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const json = await res.json();
      if (!json.ok) throw new Error("บันทึกไม่สำเร็จ");
      notifyOrdersUpdated();
      onCreated(json.order);
      handleClose();
    } catch (err) {
      setError(String(err));
    } finally {
      setSaving(false);
    }
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={handleClose} />

      <div className="relative z-10 mx-4 w-full max-w-2xl max-h-[90vh] overflow-y-auto rounded-[var(--radius-lg)] border border-border bg-surface shadow-2xl">
        <div className="sticky top-0 flex items-center justify-between border-b border-border bg-surface px-6 py-4">
          <div>
            <h2 className="text-lg font-bold">
              {isEdit ? `แก้ไขออเดอร์` : "เพิ่มออเดอร์ใหม่"}
            </h2>
            {isEdit && (
              <p className="font-mono text-xs text-muted-2">{editOrder!.id}</p>
            )}
          </div>
          <button onClick={handleClose} className="rounded-md p-1 text-muted hover:bg-surface-2 hover:text-foreground">
            <X className="h-5 w-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-5 p-6">
          {/* ประเภทลูกค้า — ล็อคใน edit mode */}
          <div>
            <Label>ประเภทลูกค้า</Label>
            <div className="mt-2 flex gap-2">
              {([
                ["produce", "ผลิต"],
                ["design", "ออกแบบ"],
              ] as [CustomerType, string][]).map(([v, label]) => (
                <button key={v} type="button"
                  onClick={() => !isEdit && setType(v)}
                  className={cn(
                    "flex-1 rounded-[var(--radius-md)] border px-3 py-2 text-sm font-medium transition-colors",
                    type === v ? "border-accent bg-accent-soft text-accent" : "border-border text-muted hover:bg-surface-2",
                    isEdit && type !== v && "opacity-40 cursor-not-allowed"
                  )}>{label}</button>
              ))}
            </div>
          </div>

          {/* ข้อมูลพื้นฐาน */}
          <div className="grid grid-cols-2 gap-4">
            <div className="col-span-2">
              <Label>ชื่อทีม *</Label>
              <Input value={teamName} onChange={e => setTeamName(e.target.value)} placeholder="เช่น FC WINX" />
            </div>
            <div>
              <Label>วันที่เริ่ม</Label>
              <Input type="date" value={startDate} onChange={e => setStartDate(e.target.value)} />
            </div>
            <div>
              <Label>วันจัดส่งสินค้า</Label>
              <Input type="date" value={deliveryDate} onChange={e => setDeliveryDate(e.target.value)} />
            </div>
          </div>

          {/* ออกแบบ */}
          {isDesign && (
            <Section title="ข้อมูลออกแบบ">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>แพคเกจออกแบบ</Label>
                  <Select value={designPackage} onChange={e => setDesignPackage(e.target.value)}>
                    {DESIGN_PACKAGES.map(p => <option key={p} value={p}>{p}</option>)}
                  </Select>
                </div>
                <div>
                  <Label>ราคาแพคเกจ (บาท)</Label>
                  <Input type="number" value={designPackagePrice} onChange={e => setDesignPackagePrice(e.target.value)} placeholder="0" />
                </div>
              </div>
            </Section>
          )}

          {/* ผลิต */}
          {isProduce && (
            <Section title="ข้อมูลผลิต">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>ประเภทเสื้อ</Label>
                  <Select value={shirtType} onChange={e => setShirtType(e.target.value)}>
                    <option value="">— เลือกทรงเสื้อ —</option>
                    {shirtOptions.map(s => <option key={s} value={s}>{s}</option>)}
                  </Select>
                </div>
                <div>
                  <Label>เนื้อผ้า</Label>
                  <Select value={fabricType} onChange={e => setFabricType(e.target.value)} disabled={!shirtType}>
                    <option value="">{shirtType ? "— เลือกเนื้อผ้า —" : "— เลือกทรงเสื้อก่อน —"}</option>
                    {filteredFabricOptions.map(f => (
                      <option key={f.name} value={f.name}>
                        {f.name}{f.price > 0 ? ` (+${f.price} บาท)` : ""}
                      </option>
                    ))}
                  </Select>
                </div>
                <div>
                  <Label>ประเภทคอ</Label>
                  <Select value={collarType} onChange={e => setCollarType(e.target.value)} disabled={!shirtType}>
                    <option value="">{shirtType ? "— เลือกประเภทคอ —" : "— เลือกทรงเสื้อก่อน —"}</option>
                    {filteredCollarOptions.map(c => (
                      <option key={c.name} value={c.name}>
                        {c.name}{c.price > 0 ? ` (+${c.price} บาท)` : ""}
                      </option>
                    ))}
                  </Select>
                </div>
                <div>
                  <Label>จำนวนตัว</Label>
                  <Input type="number" value={quantity} onChange={e => setQuantity(e.target.value)} placeholder="1" min="1" />
                </div>
                <div>
                  <Label>ราคาผลิตต่อตัว (บาท)</Label>
                  <Input type="number" value={productionPrice} onChange={e => setProductionPrice(e.target.value)} placeholder="0" />
                  {priceHint && <p className="mt-1 text-xs text-warn">{priceHint}</p>}
                </div>
                <div>
                  <Label>ค่าจัดส่ง (บาท)</Label>
                  <Input type="number" value={shipping} onChange={e => setShipping(e.target.value)} placeholder="0" />
                </div>
              </div>

              <div className="mt-4 space-y-3">
                <div className="flex items-center justify-between">
                  <Label>ต้นทุนการผลิต (บาท)</Label>
                  <span className="text-xs text-muted-2">รวมอัตโนมัติจาก breakdown ด้านล่าง</span>
                </div>
                <div className="flex items-center gap-3">
                  <div className="flex-1">
                    <label className="mb-1 block text-xs text-muted-2">ต้นทุนผลิตรวม (พิมพ์เองได้)</label>
                    <Input
                      type="number"
                      value={costOverride}
                      onChange={e => setCostOverride(e.target.value)}
                      placeholder={`อัตโนมัติ: ${computedCostTotal.toLocaleString()} บาท`}
                    />
                  </div>
                  {costOverride !== "" && (
                    <button type="button" onClick={() => setCostOverride("")}
                      className="mt-5 text-xs text-muted-2 hover:text-danger underline">
                      ล้างค่า
                    </button>
                  )}
                </div>
                <div className="grid grid-cols-3 gap-3">
                  {([
                    ["fabric", "ผ้า"], ["paper", "กระดาษซับ"], ["ink", "หมึก"],
                    ["cut", "ตัด"], ["sew", "เย็บ"], ["other", "อื่นๆ"],
                  ] as [keyof typeof DEFAULT_COST, string][]).map(([key, label]) => (
                    <div key={key}>
                      <label className="mb-1 block text-xs text-muted-2">{label}</label>
                      <Input
                        type="number"
                        value={cost[key] || ""}
                        onChange={e => { updateCost(key, e.target.value); setCostOverride(""); }}
                        placeholder="0"
                      />
                    </div>
                  ))}
                </div>
              </div>
            </Section>
          )}

          {/* สรุปการเงิน */}
          {(isDesign || isProduce) && (
            <div className="rounded-[var(--radius-md)] border border-accent/30 bg-accent-soft p-4 space-y-2">
              <div className="text-xs font-semibold uppercase tracking-wide text-muted-2">สรุปการเงิน</div>
              <div className="flex items-center justify-between gap-4 pb-1">
                <Label>ยอดมัดจำ (บาท)</Label>
                <div className="w-40">
                  <Input type="number" value={deposit} onChange={e => setDeposit(e.target.value)} placeholder="0" />
                </div>
              </div>
              {isDesign && <Row label="ค่าออกแบบ" value={parseFloat(designPackagePrice) || 0} />}
              {isProduce && (
                <>
                  <Row
                    label={`ราคาผลิต (${parseFloat(productionPrice)||0} × ${parseFloat(quantity)||1} ตัว)`}
                    value={(parseFloat(productionPrice)||0) * (parseFloat(quantity)||1)}
                  />
                  <Row label="ค่าจัดส่ง" value={parseFloat(shipping)||0} />
                </>
              )}
              <div className="flex justify-between border-t border-accent/20 pt-2 text-sm font-bold text-accent">
                <span>ยอดรวมทั้งหมด</span>
                <span>{formatBaht(computedTotal)}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-muted">หักมัดจำ</span>
                <span>{formatBaht(parseFloat(deposit)||0)}</span>
              </div>
              <div className="flex justify-between text-sm font-semibold text-warn">
                <span>ยอดคงเหลือ</span>
                <span>{formatBaht(computedTotal - (parseFloat(deposit)||0))}</span>
              </div>
              {isProduce && (() => {
                const profit = (parseFloat(productionPrice)||0) * (parseFloat(quantity)||1) - computedCostTotal;
                return (
                  <>
                    <div className="flex justify-between text-sm text-muted border-t border-accent/20 pt-2">
                      <span>
                        ต้นทุนรวม
                        <span className="ml-1 text-xs text-muted-2">
                          ({formatBaht(costOverride !== "" ? parseFloat(costOverride)||0 : Object.values(cost).reduce((a,b)=>a+b,0))}/ตัว × {parseFloat(quantity)||1})
                        </span>
                      </span>
                      <span>{formatBaht(computedCostTotal)}</span>
                    </div>
                    <div className={`flex justify-between text-sm font-semibold ${profit >= 0 ? "text-success" : "text-danger"}`}>
                      <span>กำไรโดยประมาณ</span>
                      <span>{formatBaht(profit)}</span>
                    </div>
                  </>
                );
              })()}
            </div>
          )}

          {error && <p className="text-sm text-danger">{error}</p>}

          <div className="flex justify-end gap-3 border-t border-border pt-4">
            <Button type="button" variant="outline" onClick={handleClose}>ยกเลิก</Button>
            <Button type="submit" disabled={saving}>
              {saving && <Loader2 className="h-4 w-4 animate-spin" />}
              {isEdit ? "บันทึกการแก้ไข" : "บันทึกออเดอร์"}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}

function Label({ children }: { children: React.ReactNode }) {
  return <label className="mb-1 block text-sm font-medium">{children}</label>;
}
function Input({ className, ...props }: React.InputHTMLAttributes<HTMLInputElement>) {
  return (
    <input
      className={cn(
        "w-full rounded-[var(--radius-md)] border border-border bg-surface-2 px-3 py-2 text-sm outline-none placeholder:text-muted-2 focus:border-accent",
        className
      )}
      {...props}
    />
  );
}
function Select({ children, ...props }: React.SelectHTMLAttributes<HTMLSelectElement>) {
  return (
    <select
      className="w-full rounded-[var(--radius-md)] border border-border bg-surface-2 px-3 py-2 text-sm outline-none focus:border-accent"
      {...props}
    >{children}</select>
  );
}
function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="rounded-[var(--radius-md)] border border-border bg-surface-2 p-4">
      <h3 className="mb-3 text-xs font-semibold uppercase tracking-wide text-muted-2">{title}</h3>
      {children}
    </div>
  );
}
function Row({ label, value }: { label: string; value: number }) {
  return (
    <div className="flex justify-between text-sm">
      <span className="text-muted">{label}</span>
      <span>{formatBaht(value)}</span>
    </div>
  );
}
