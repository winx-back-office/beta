"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { formatDate } from "@/lib/utils";
import type { Order } from "@/lib/types";

interface Player {
  id: string;
  position: number;
  name: string;
  size: string;
  number: string;
  note: string;
}

const SIZES = ["SS","S","M","L","XL","2XL","3XL","4XL","5XL"];

export default function PrintSlipPage() {
  const { id } = useParams<{ id: string }>();
  const [order, setOrder] = useState<Order | null>(null);
  const [players, setPlayers] = useState<Player[]>([]);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    if (!id) return;
    Promise.all([
      fetch(`/api/orders/${id}`).then(r => r.json()),
      fetch(`/api/production/${id}`).then(r => r.json()),
    ]).then(([o, p]) => {
      setOrder(o);
      setPlayers(p?.players ?? []);
      setReady(true);
    });
  }, [id]);

  useEffect(() => {
    if (!ready) return;
    const t = setTimeout(() => window.print(), 400);
    return () => clearTimeout(t);
  }, [ready]);

  if (!ready || !order) {
    return <div style={{ fontFamily: "sans-serif", padding: 32, color: "#666" }}>กำลังโหลด…</div>;
  }

  const sizeSummary = SIZES
    .map(s => ({ s, c: players.filter(p => p.size === s).length }))
    .filter(x => x.c > 0);

  return (
    <>
      <style>{`
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body { font-family: 'Sarabun', 'Helvetica Neue', sans-serif; font-size: 13px; color: #111; background: #fff; }
        .page { padding: 28px 36px; max-width: 800px; margin: 0 auto; }
        h1 { font-size: 22px; font-weight: 700; margin-bottom: 4px; }
        .meta { display: flex; flex-wrap: wrap; gap: 20px; font-size: 12px; color: #555; margin-bottom: 20px; padding-bottom: 14px; border-bottom: 1.5px solid #ddd; }
        .meta b { color: #222; }
        table { width: 100%; border-collapse: collapse; }
        thead th { background: #f3f3f3; font-size: 11px; font-weight: 700; text-transform: uppercase; letter-spacing: .06em; padding: 8px 12px; text-align: left; border: 1px solid #ddd; }
        td { padding: 7px 12px; border: 1px solid #e0e0e0; vertical-align: middle; font-size: 13px; }
        tr:nth-child(even) td { background: #fafafa; }
        .check { display: inline-block; width: 15px; height: 15px; border: 1.5px solid #555; border-radius: 3px; }
        .footer { margin-top: 18px; display: flex; justify-content: space-between; font-size: 11px; color: #999; padding-top: 10px; border-top: 1px solid #eee; }
        .size-sum { display: flex; gap: 12px; flex-wrap: wrap; font-size: 12px; color: #444; margin-top: 10px; }
        .size-chip { background: #f0f0f0; border-radius: 4px; padding: 2px 8px; font-weight: 600; }
        @media print {
          body { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
          @page { margin: 12mm; size: A4; }
        }
      `}</style>
      <div className="page">
        <h1>{order.teamName}</h1>
        <div className="meta">
          <span><b>รหัส</b> {order.id}</span>
          {order.deliveryDate && <span><b>วันจัดส่ง</b> {formatDate(order.deliveryDate)}</span>}
          <span><b>จำนวน</b> {players.length} ตัว</span>
          {order.shirtType && <span><b>ทรงเสื้อ</b> {order.shirtType}</span>}
          {order.fabricType && <span><b>เนื้อผ้า</b> {order.fabricType}</span>}
          {order.collarType && <span><b>ประเภทคอ</b> {order.collarType}</span>}
        </div>

        <table>
          <thead>
            <tr>
              <th style={{ width: 40 }}>#</th>
              <th>ชื่อ</th>
              <th style={{ width: 56 }}>ไซส์</th>
              <th style={{ width: 56 }}>เลข</th>
              <th>รายละเอียดเพิ่มเติม</th>
              <th style={{ width: 44, textAlign: "center" }}>✓</th>
            </tr>
          </thead>
          <tbody>
            {players.map((p, i) => (
              <tr key={p.id}>
                <td style={{ color: "#999", fontSize: 11 }}>{i + 1}</td>
                <td style={{ fontWeight: 500 }}>{p.name || "—"}</td>
                <td style={{ fontWeight: 700 }}>{p.size || "—"}</td>
                <td style={{ color: "#555" }}>{p.number || "—"}</td>
                <td style={{ color: "#666" }}>{p.note || ""}</td>
                <td style={{ textAlign: "center" }}><span className="check" /></td>
              </tr>
            ))}
          </tbody>
        </table>

        <div className="size-sum">
          <span style={{ color: "#999", alignSelf: "center" }}>สรุปไซส์:</span>
          {sizeSummary.map(x => (
            <span key={x.s} className="size-chip">{x.s} × {x.c}</span>
          ))}
        </div>

        <div className="footer">
          <span>พิมพ์วันที่ {new Date().toLocaleDateString("th-TH", { year: "numeric", month: "long", day: "numeric" })}</span>
          <span>WINX STUDIO Back Office</span>
        </div>
      </div>
    </>
  );
}
