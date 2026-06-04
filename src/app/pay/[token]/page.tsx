import { notFound } from "next/navigation";
import { BANK_ACCOUNTS, type PaymentRequest } from "@/lib/payment-config";
import { orderTotal, orderBalance, type Order } from "@/lib/types";
import { SlipUpload } from "./slip-upload";
import generatePayload from "promptpay-qr";
import QRCode from "qrcode";
import shirtStylesData from "@/data/shirt-styles.json";

function buildRoundedQrSvg(data: string): string {
  const qr = QRCode.create(data, { errorCorrectionLevel: "M" });
  const matrix = qr.modules;
  const size = matrix.size;
  const cell = 10;
  const pad = 16;
  const r = 3;   // module corner radius
  const fr = 5;  // finder outer corner radius
  const total = size * cell + pad * 2;

  const isFinderCenter = (row: number, col: number) =>
    (row < 9 && col < 9) ||
    (row < 9 && col >= size - 8) ||
    (row >= size - 8 && col < 9);

  const rects: string[] = [];

  for (let row = 0; row < size; row++) {
    for (let col = 0; col < size; col++) {
      if (!matrix.get(row, col)) continue;
      const x = pad + col * cell;
      const y = pad + row * cell;
      const radius = isFinderCenter(row, col) ? fr : r;
      rects.push(`<rect x="${x}" y="${y}" width="${cell}" height="${cell}" rx="${radius}" ry="${radius}" fill="#111"/>`);
    }
  }

  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${total} ${total}" width="100%" height="100%">
  <rect width="${total}" height="${total}" rx="24" ry="24" fill="white"/>
  ${rects.join("")}
</svg>`;
}

const BASE = process.env.NEXT_PUBLIC_APP_URL ??
  (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : "http://localhost:3000");

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
  const qrDataUrl: string = await QRCode.toDataURL(payload, { width: 300, margin: 2 });

  const isApproved = pr.status === "approved";
  const hasSlip = pr.status === "slip_uploaded";

  const total = order ? orderTotal(order) : null;
  const balance = order ? orderBalance(order) : null;

  const style = order?.shirtType ? (shirtStylesData as {name:string; fabrics:{name:string;price:number}[]; collars:{name:string;price:number}[]}[]).find(s => s.name === order.shirtType) : null;
  const fabricExtra = style?.fabrics.find(f => f.name === order?.fabricType)?.price ?? 0;
  const collarExtra = style?.collars.find(c => c.name === order?.collarType)?.price ?? 0;
  const basePrice = order ? (order.productionPrice ?? 0) - fabricExtra - collarExtra : 0;

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

      <div className="mx-auto max-w-sm px-4 py-6 space-y-3">

        {/* QR Card — เหมือน modal */}
        <div className="rounded-2xl border border-white/10 bg-[#15171e] overflow-hidden">

          {/* ชื่อทีม + รายละเอียด */}
          <div className="text-center px-5 pt-5 pb-3 space-y-1">
            <div className="text-lg font-bold">{pr.teamName}</div>
            <div className="text-xs text-white/40 font-mono">{pr.orderId}</div>
            {order && (order.shirtType || order.collarType) && (
              <div className="text-xs text-white/50 mt-1">
                {[order.shirtType, order.fabricType, order.collarType].filter(Boolean).join(" · ")}
              </div>
            )}
            {/* Price breakdown */}
            {order && order.productionPrice && (
              <div className="flex flex-wrap justify-center gap-2 mt-2">
                <span className="rounded-full border border-white/15 bg-white/5 px-3 py-1 text-[11px] text-white/50">
                  ราคาเสื้อ <span className="text-white/80">{formatBaht(basePrice)}</span>
                </span>
                {fabricExtra > 0 && (
                  <span className="rounded-full border border-white/15 bg-white/5 px-3 py-1 text-[11px] text-white/50">
                    {order.fabricType} <span className="text-white/80">+{formatBaht(fabricExtra)}</span>
                  </span>
                )}
                {collarExtra > 0 && (
                  <span className="rounded-full border border-white/15 bg-white/5 px-3 py-1 text-[11px] text-white/50">
                    {order.collarType} <span className="text-white/80">+{formatBaht(collarExtra)}</span>
                  </span>
                )}
                <span className="rounded-full border border-white/15 bg-white/5 px-3 py-1 text-[11px] text-white/50">
                  × {order.quantity ?? 1} ตัว
                </span>
              </div>
            )}
            {pr.note && (
              <div className="text-xs text-white/35 mt-1">📝 {pr.note}</div>
            )}
          </div>

          {/* QR */}
          <div className="flex justify-center pb-4 px-5">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={qrDataUrl} alt="PromptPay QR" width={220} height={220} className="rounded-2xl" />
          </div>

          {/* Stats — ยอดที่ต้องชำระ | ยอดคงเหลือ */}
          <div className="flex border-t border-white/10">
            <div className="flex-1 flex flex-col items-center py-4 gap-0.5">
              <span className="text-[10px] text-white/40">ยอดที่ต้องชำระครั้งนี้</span>
              <span className="text-xl font-black text-yellow-400">{formatBaht(pr.amount)}</span>
            </div>
            {order && balance != null && (
              <>
                <div className="w-px bg-white/10" />
                <div className="flex-1 flex flex-col items-center py-4 gap-0.5">
                  <span className="text-[10px] text-white/40">ยอดคงเหลือ</span>
                  <span className="text-xl font-bold text-white">{formatBaht(balance)}</span>
                </div>
              </>
            )}
          </div>

          {/* Bank account */}
          <div className="flex items-center justify-between border-t border-white/10 px-5 py-4" style={{ backgroundColor: `${account.color}15` }}>
            <div>
              <div className="text-[10px] font-bold uppercase tracking-widest mb-0.5" style={{ color: account.color }}>{account.bank}</div>
              <div className="font-semibold text-sm">{account.name}</div>
            </div>
            <div className="text-right">
              <div className="text-[10px] text-white/40 mb-0.5">เลขบัญชี</div>
              <div className="font-mono text-sm tracking-widest">{account.accountNumber}</div>
            </div>
          </div>
        </div>

        {/* Slip Upload / Status */}
        {isApproved ? (
          <div className="rounded-2xl border border-green-500/40 bg-green-500/10 px-6 py-6 text-center">
            <div className="text-3xl mb-2">✅</div>
            <div className="text-base font-semibold text-green-400">ได้รับการยืนยันแล้ว</div>
            {pr.approvedAmount != null && (
              <div className="mt-1 text-sm text-white/60">ยืนยันยอด {formatBaht(pr.approvedAmount)}</div>
            )}
          </div>
        ) : hasSlip ? (
          <div className="rounded-2xl border border-yellow-500/40 bg-yellow-500/10 px-6 py-6 text-center">
            <div className="text-3xl mb-2">⏳</div>
            <div className="text-base font-semibold text-yellow-400">รอตรวจสอบสลิป</div>
            <div className="mt-1 text-sm text-white/60">ทีมงานกำลังตรวจสอบการโอนของคุณ</div>
          </div>
        ) : (
          <div className="rounded-2xl border border-white/10 bg-white/5 px-5 py-4 space-y-3">
            <div className="font-semibold text-sm">อัปโหลดสลิปการโอน</div>
            <SlipUpload token={token} />
          </div>
        )}
      </div>
    </div>
  );
}
