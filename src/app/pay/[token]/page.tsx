import { notFound } from "next/navigation";
import { BANK_ACCOUNTS, type PaymentRequest } from "@/lib/payment-config";
import { orderTotal, orderBalance, type Order } from "@/lib/types";
import { SlipUpload } from "./slip-upload";
import generatePayload from "promptpay-qr";
import QRCode from "qrcode";

const BASE = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";

async function getPaymentRequest(token: string): Promise<PaymentRequest | null> {
  try {
    const res = await fetch(`${BASE}/api/payment-requests/${token}`, { cache: "no-store" });
    if (!res.ok) return null;
    return res.json();
  } catch { return null; }
}

async function getOrder(id: string): Promise<Order | null> {
  try {
    const res = await fetch(`${BASE}/api/orders/${id}`, { cache: "no-store" });
    if (!res.ok) return null;
    return res.json();
  } catch { return null; }
}

function formatBaht(n: number) {
  return `฿${n.toLocaleString("th-TH")}`;
}

export default async function PayPage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const pr = await getPaymentRequest(token);
  if (!pr) notFound();

  const account = BANK_ACCOUNTS[pr.accountIndex] ?? BANK_ACCOUNTS[0];
  const order = await getOrder(pr.orderId);

  // Generate PromptPay QR
  const payload = generatePayload(account.accountNumber, { amount: pr.amount });
  const qrDataUrl: string = await QRCode.toDataURL(payload, { width: 280, margin: 2 });

  const isApproved = pr.status === "approved";
  const hasSlip = pr.status === "slip_uploaded";

  const total = order ? orderTotal(order) : null;
  const balance = order ? orderBalance(order) : null;

  return (
    <div className="min-h-screen bg-[#0f1117] text-white">
      {/* Header */}
      <div className="border-b border-white/10 bg-[#15171e] px-6 py-4 flex items-center gap-3">
        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-[#6366f1] font-black text-lg">W</div>
        <div>
          <div className="font-bold tracking-wide text-sm">WINX STUDIO</div>
          <div className="text-[10px] uppercase tracking-widest text-white/40">ชำระเงิน</div>
        </div>
      </div>

      <div className="mx-auto max-w-md px-4 py-8 space-y-4">
        {/* Order info + รายละเอียด */}
        <div className="rounded-2xl border border-white/10 bg-white/5 px-6 py-5 space-y-4">
          <div>
            <div className="text-xs text-white/40 uppercase tracking-widest mb-1">ออเดอร์</div>
            <div className="text-lg font-bold">{pr.teamName}</div>
            <div className="text-sm text-white/50 font-mono">{pr.orderId}</div>
          </div>
          {order && (order.shirtType || order.fabricType || order.collarType || order.quantity) && (
            <div className="border-t border-white/10 pt-4 grid grid-cols-2 gap-x-6 gap-y-3 text-sm">
              {order.shirtType && (
                <div>
                  <div className="text-xs text-white/40 mb-0.5">ประเภทเสื้อ</div>
                  <div className="font-medium">{order.shirtType}</div>
                </div>
              )}
              {order.fabricType && (
                <div>
                  <div className="text-xs text-white/40 mb-0.5">เนื้อผ้า</div>
                  <div className="font-medium">{order.fabricType}</div>
                </div>
              )}
              {order.collarType && (
                <div>
                  <div className="text-xs text-white/40 mb-0.5">ประเภทคอ</div>
                  <div className="font-medium">{order.collarType}</div>
                </div>
              )}
              {order.quantity != null && (
                <div>
                  <div className="text-xs text-white/40 mb-0.5">จำนวน</div>
                  <div className="font-medium">{order.quantity} ตัว</div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* สรุปการเงิน */}
        {order && total != null && (
          <div className="rounded-2xl border border-white/10 bg-white/5 px-6 py-5 space-y-2 text-sm">
            <div className="text-xs text-white/40 uppercase tracking-widest mb-3">สรุปการเงิน</div>
            <div className="flex justify-between">
              <span className="text-white/60">ยอดรวมทั้งหมด</span>
              <span className="font-semibold">{formatBaht(total)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-white/60">มัดจำที่ชำระแล้ว</span>
              <span className="text-white/80">{formatBaht(order.deposit ?? 0)}</span>
            </div>
            <div className="flex justify-between border-t border-white/10 pt-2 mt-2">
              <span className="font-semibold">ยอดคงเหลือ</span>
              <span className="font-bold text-yellow-400">{formatBaht(balance ?? 0)}</span>
            </div>
          </div>
        )}

        {/* Amount */}
        <div className="rounded-2xl border border-white/10 bg-white/5 px-6 py-5 text-center">
          <div className="text-xs text-white/40 mb-2">ยอดที่ต้องชำระครั้งนี้</div>
          <div className="text-4xl font-black text-white">
            {formatBaht(pr.amount)}
          </div>
        </div>

        {/* QR Code */}
        <div className="rounded-2xl border border-white/10 bg-white p-6 flex flex-col items-center gap-3">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={qrDataUrl} alt="PromptPay QR" width={240} height={240} className="rounded-lg" />
          <div className="text-xs text-black/50">สแกนด้วย Mobile Banking</div>
        </div>

        {/* Bank account */}
        <div
          className="rounded-2xl border px-6 py-5 space-y-3"
          style={{ borderColor: `${account.color}60`, backgroundColor: `${account.color}18` }}
        >
          <div
            className="text-xs font-bold uppercase tracking-widest"
            style={{ color: account.color }}
          >
            {account.bank}
          </div>
          <div>
            <div className="text-xs text-white/40 mb-0.5">ชื่อบัญชี</div>
            <div className="font-semibold">{account.name}</div>
          </div>
          <div>
            <div className="text-xs text-white/40 mb-0.5">เลขบัญชี</div>
            <div className="font-mono text-lg tracking-widest">{account.accountNumber}</div>
          </div>
        </div>

        {/* Note */}
        {pr.note && (
          <div className="rounded-2xl border border-white/10 bg-white/5 px-6 py-4">
            <div className="text-xs text-white/40 mb-1">หมายเหตุ</div>
            <div className="text-sm text-white/80">{pr.note}</div>
          </div>
        )}

        {/* Status / Slip Upload */}
        {isApproved ? (
          <div className="rounded-2xl border border-green-500/40 bg-green-500/10 px-6 py-8 text-center">
            <div className="text-4xl mb-3">✅</div>
            <div className="text-lg font-semibold text-green-400">ได้รับการยืนยันแล้ว</div>
            {pr.approvedAmount != null && (
              <div className="mt-1 text-sm text-white/60">
                ยืนยันยอด ฿{pr.approvedAmount.toLocaleString("th-TH")}
              </div>
            )}
          </div>
        ) : hasSlip ? (
          <div className="rounded-2xl border border-yellow-500/40 bg-yellow-500/10 px-6 py-8 text-center">
            <div className="text-4xl mb-3">⏳</div>
            <div className="text-lg font-semibold text-yellow-400">รอตรวจสอบสลิป</div>
            <div className="mt-1 text-sm text-white/60">ทีมงานกำลังตรวจสอบการโอนของคุณ</div>
          </div>
        ) : (
          <div className="rounded-2xl border border-white/10 bg-white/5 px-6 py-5 space-y-4">
            <div className="font-semibold">อัปโหลดสลิปการโอน</div>
            <SlipUpload token={token} />
          </div>
        )}
      </div>
    </div>
  );
}
