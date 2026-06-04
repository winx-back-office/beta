"use client";

import { useState } from "react";
import { X, CreditCard, Copy, Check, ExternalLink, Loader2 } from "lucide-react";
import { Button } from "@/components/ui";
import { BANK_ACCOUNTS } from "@/lib/payment-config";
import { orderBalance, orderTotal, type Order } from "@/lib/types";
import { formatBaht } from "@/lib/utils";

interface Props {
  orders: Order[];
  onClose: () => void;
  defaultAmount?: number;
}

export function PaymentRequestModal({ orders, onClose, defaultAmount }: Props) {
  const billableOrders = orders.filter((o) => orderBalance(o) > 0);

  const [selectedOrderId, setSelectedOrderId] = useState(billableOrders[0]?.id ?? "");
  const [amount, setAmount] = useState(() => {
    if (defaultAmount !== undefined) return String(defaultAmount);
    const o = billableOrders[0];
    return o ? String(orderBalance(o)) : "";
  });
  const [accountIndex, setAccountIndex] = useState(0);
  const [note, setNote] = useState("");
  const [creating, setCreating] = useState(false);
  const [link, setLink] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  const selectedOrder = orders.find((o) => o.id === selectedOrderId);

  const onOrderChange = (id: string) => {
    setSelectedOrderId(id);
    const o = orders.find((ord) => ord.id === id);
    if (o) setAmount(String(orderBalance(o)));
  };

  const onCreate = async () => {
    if (!selectedOrderId || !amount) return;
    setCreating(true);
    const res = await fetch("/api/payment-requests", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        orderId: selectedOrderId,
        teamName: selectedOrder?.teamName ?? "",
        amount: Number(amount),
        accountIndex,
        note,
      }),
    });
    const data = await res.json();
    if (data.paymentRequest) {
      const base = window.location.origin;
      const generatedLink = `${base}/pay/${data.paymentRequest.token}`;
      setLink(generatedLink);
      // บันทึกลิงก์เข้าออเดอร์
      await fetch(`/api/orders/${selectedOrderId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ paymentLink: generatedLink }),
      });
    }
    setCreating(false);
  };

  const onCopy = () => {
    if (!link) return;
    navigator.clipboard.writeText(link);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const fieldCls =
    "w-full rounded-[var(--radius-md)] border border-border bg-surface-2 px-3 py-2 text-sm text-foreground placeholder:text-muted-2 focus:border-accent focus:outline-none";

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
      <div className="w-full max-w-lg rounded-[var(--radius-lg)] border border-border bg-surface shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-border px-6 py-4">
          <div className="flex items-center gap-2">
            <CreditCard className="h-5 w-5 text-accent" />
            <span className="font-semibold">เรียกเก็บเงิน</span>
          </div>
          <button onClick={onClose} className="text-muted hover:text-foreground">
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="p-6 space-y-5">
          {link ? (
            /* Success state */
            <div className="space-y-4">
              <div className="rounded-[var(--radius-md)] border border-success/30 bg-success/10 px-4 py-3 text-sm text-success">
                สร้างลิงก์เรียกเก็บเงินเรียบร้อย
              </div>
              <div>
                <label className="text-xs text-muted-2 mb-1 block">ลิงก์ชำระเงิน</label>
                <div className="flex items-center gap-2">
                  <input
                    readOnly
                    value={link}
                    className={`${fieldCls} font-mono text-xs`}
                    onClick={(e) => (e.target as HTMLInputElement).select()}
                  />
                  <button
                    onClick={onCopy}
                    className="shrink-0 rounded-[var(--radius-md)] border border-border bg-surface-2 p-2 text-muted hover:text-foreground transition-colors"
                    title="คัดลอก"
                  >
                    {copied ? <Check className="h-4 w-4 text-success" /> : <Copy className="h-4 w-4" />}
                  </button>
                </div>
              </div>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  className="flex-1"
                  onClick={() => window.open(link, "_blank")}
                >
                  <ExternalLink className="h-4 w-4" />
                  เปิดหน้าลูกค้า
                </Button>
                <Button
                  variant="outline"
                  className="flex-1"
                  onClick={() => { setLink(null); setNote(""); }}
                >
                  สร้างใหม่
                </Button>
              </div>
            </div>
          ) : (
            /* Create form */
            <div className="space-y-4">
              {/* Order selector — ซ่อนเมื่อมีออเดอร์เดียว */}
              {billableOrders.length === 0 ? (
                <div className="rounded-[var(--radius-md)] border border-border bg-surface-2 px-3 py-2 text-sm text-muted-2">
                  ไม่มีออเดอร์ที่มียอดค้างชำระ
                </div>
              ) : billableOrders.length > 1 ? (
                <div>
                  <label className="text-xs text-muted-2 mb-1 block">เลือกออเดอร์ *</label>
                  <select
                    className={fieldCls}
                    value={selectedOrderId}
                    onChange={(e) => onOrderChange(e.target.value)}
                  >
                    {billableOrders.map((o) => (
                      <option key={o.id} value={o.id}>
                        {o.id} · {o.teamName} · คงเหลือ {formatBaht(orderBalance(o))}
                      </option>
                    ))}
                  </select>
                </div>
              ) : (
                <div className="rounded-[var(--radius-md)] border border-border bg-surface-2 px-4 py-3 text-sm">
                  <span className="text-muted-2 text-xs">ออเดอร์</span>
                  <div className="font-medium mt-0.5">{billableOrders[0].teamName}</div>
                  <div className="font-mono text-xs text-muted mt-0.5">{billableOrders[0].id} · คงเหลือ {formatBaht(orderBalance(billableOrders[0]))}</div>
                </div>
              )}

              {/* Amount */}
              <div>
                <label className="text-xs text-muted-2 mb-1 block">ยอดเรียกเก็บ (บาท) *</label>
                <input
                  type="number"
                  min={1}
                  className={fieldCls}
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  placeholder="0"
                />
                {selectedOrder && (() => {
                  const total = orderTotal(selectedOrder);
                  const presets = [
                    { label: "30%", value: Math.round(total * 0.3) },
                    { label: "50%", value: Math.round(total * 0.5) },
                    { label: "ยอดคงเหลือ", value: orderBalance(selectedOrder) },
                  ];
                  return (
                    <div className="flex gap-2 mt-2">
                      {presets.map((p) => (
                        <button
                          key={p.label}
                          type="button"
                          onClick={() => setAmount(String(p.value))}
                          className={`flex-1 rounded-[var(--radius-md)] border px-2 py-1.5 text-xs font-medium transition-colors ${
                            amount === String(p.value)
                              ? "border-accent bg-accent text-accent-foreground"
                              : "border-border bg-surface-2 text-muted hover:bg-surface-3 hover:text-foreground"
                          }`}
                        >
                          <div>{p.label}</div>
                          <div className="font-mono opacity-70">{formatBaht(p.value)}</div>
                        </button>
                      ))}
                    </div>
                  );
                })()}
              </div>

              {/* Bank account radio */}
              <div>
                <label className="text-xs text-muted-2 mb-2 block">เลือกบัญชีรับเงิน *</label>
                <div className="space-y-2">
                  {BANK_ACCOUNTS.map((acc, idx) => (
                    <label
                      key={idx}
                      className={`flex items-center gap-3 rounded-[var(--radius-md)] border px-4 py-3 cursor-pointer transition-colors ${
                        accountIndex === idx
                          ? "border-accent bg-accent-soft"
                          : "border-border bg-surface-2 hover:bg-surface-3"
                      }`}
                    >
                      <input
                        type="radio"
                        name="account"
                        checked={accountIndex === idx}
                        onChange={() => setAccountIndex(idx)}
                        className="shrink-0"
                      />
                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          <span
                            className="text-xs font-bold px-1.5 py-0.5 rounded"
                            style={{ backgroundColor: acc.color, color: "#fff" }}
                          >
                            {acc.bank.split(" ")[0]}
                          </span>
                          <span className="text-sm font-medium">{acc.name}</span>
                        </div>
                        <div className="font-mono text-xs text-muted-2 mt-0.5">{acc.accountNumber}</div>
                      </div>
                    </label>
                  ))}
                </div>
              </div>

              {/* Note */}
              <div>
                <label className="text-xs text-muted-2 mb-1 block">หมายเหตุถึงลูกค้า (ไม่บังคับ)</label>
                <textarea
                  className={`${fieldCls} resize-none`}
                  rows={3}
                  value={note}
                  onChange={(e) => setNote(e.target.value)}
                  placeholder="เช่น ค่ามัดจำงวดที่ 2…"
                />
              </div>

              <Button
                className="w-full"
                disabled={creating || !selectedOrderId || !amount || billableOrders.length === 0}
                onClick={onCreate}
              >
                {creating ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    กำลังสร้าง…
                  </>
                ) : (
                  <>
                    <CreditCard className="h-4 w-4" />
                    สร้างลิงก์เรียกเก็บเงิน
                  </>
                )}
              </Button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
