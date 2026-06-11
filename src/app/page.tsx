"use client";

import { useEffect, useState } from "react";
import { Card, PageHeader } from "@/components/ui";
import { orderTotal, orderBalance, orderProfit, costTotal, type Order } from "@/lib/types";
import { formatBaht } from "@/lib/utils";
import { TrendingUp, Wallet, Clock, Loader2 } from "lucide-react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
} from "recharts";

interface MonthData {
  month: string; // "ม.ค. 68"
  monthKey: string; // "2025-01"
  revenue: number;
  received: number;
  outstanding: number;
  profit: number;
  count: number;
}

function getMonthKey(iso: string) {
  const d = new Date(iso);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}

function getMonthLabel(key: string) {
  const [y, m] = key.split("-").map(Number);
  const thMonth = ["ม.ค.", "ก.พ.", "มี.ค.", "เม.ย.", "พ.ค.", "มิ.ย.", "ก.ค.", "ส.ค.", "ก.ย.", "ต.ค.", "พ.ย.", "ธ.ค."];
  return `${thMonth[m - 1]} ${String(y + 543).slice(-2)}`;
}

function buildMonthlyData(orders: Order[]): MonthData[] {
  const year = new Date().getFullYear();
  const map = new Map<string, MonthData>();

  // Pre-fill all 12 months of current year
  for (let m = 1; m <= 12; m++) {
    const key = `${year}-${String(m).padStart(2, "0")}`;
    map.set(key, { month: getMonthLabel(key), monthKey: key, revenue: 0, received: 0, outstanding: 0, profit: 0, count: 0 });
  }

  for (const o of orders) {
    const key = getMonthKey(o.startDate);
    const existing = map.get(key) ?? { month: getMonthLabel(key), monthKey: key, revenue: 0, received: 0, outstanding: 0, profit: 0, count: 0 };
    existing.revenue += orderTotal(o);
    existing.received += o.deposit;
    existing.outstanding += orderBalance(o);
    existing.profit += orderProfit(o) ?? 0;
    existing.count += 1;
    map.set(key, existing);
  }

  return Array.from(map.values()).sort((a, b) => a.monthKey.localeCompare(b.monthKey));
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function CustomTooltip({ active, payload, label }: any) {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-lg border border-border bg-surface px-3 py-2 text-xs shadow-xl">
      <div className="mb-1 font-semibold">{label}</div>
      {payload.map((p: { name: string; value: number; color: string }) => (
        <div key={p.name} className="flex items-center gap-2">
          <span className="h-2 w-2 rounded-full" style={{ background: p.color }} />
          <span className="text-muted">{p.name}:</span>
          <span className="font-medium">{formatBaht(p.value)}</span>
        </div>
      ))}
    </div>
  );
}

export default function DashboardPage() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/orders", { cache: "no-store" })
      .then((r) => r.json())
      .then((data: Order[]) => { setOrders(data); setLoading(false); })
      .catch(() => setLoading(false));
  }, []);

  const revenue = orders.reduce((s, o) => s + orderTotal(o), 0);
  const received = orders.reduce((s, o) => s + o.deposit, 0);
  const outstanding = orders.reduce((s, o) => s + orderBalance(o), 0);
  const profit = orders.reduce((s, o) => s + (orderProfit(o) ?? 0), 0);
  const monthlyData = buildMonthlyData(orders);

  const stats = [
    { label: "ยอดขายรวม", value: formatBaht(revenue), icon: TrendingUp, color: "var(--accent)", bgColor: "rgba(var(--accent-rgb,99,102,241),0.1)" },
    { label: "รับชำระแล้ว", value: formatBaht(received), icon: Wallet, color: "var(--info)", bgColor: "rgba(59,130,246,0.1)" },
    { label: "ยอดคงค้าง", value: formatBaht(outstanding), icon: Clock, color: "var(--warn)", bgColor: "rgba(234,179,8,0.1)" },
    { label: "กำไรรวม", value: formatBaht(profit), icon: TrendingUp, color: "#22c55e", bgColor: "rgba(34,197,94,0.1)" },
  ];

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
        title="ภาพรวมการเงิน"
        subtitle={`ออเดอร์ทั้งหมด ${orders.length} รายการ · ${monthlyData.length} เดือน`}
      />

      <div className="space-y-6 px-4 py-6 min-[720px]:px-8">
        {/* Summary cards */}
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
          {stats.map((s) => (
            <Card key={s.label} className="p-5">
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted">{s.label}</span>
                <div className="flex h-8 w-8 items-center justify-center rounded-lg" style={{ background: s.bgColor }}>
                  <s.icon className="h-4 w-4" style={{ color: s.color }} />
                </div>
              </div>
              <div className="mt-3 text-2xl font-bold tracking-tight" style={{ color: s.color }}>{s.value}</div>
            </Card>
          ))}
        </div>

        {/* Chart */}
        <Card className="p-5">
          <h2 className="mb-4 font-semibold">ยอดขายรายเดือน</h2>
          {monthlyData.length === 0 ? (
            <div className="py-12 text-center text-sm text-muted">ไม่มีข้อมูล</div>
          ) : (
            <ResponsiveContainer width="100%" height={260}>
              <BarChart data={monthlyData} barGap={4} margin={{ top: 4, right: 8, left: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
                <XAxis dataKey="month" tick={{ fontSize: 11, fill: "var(--muted)" }} axisLine={false} tickLine={false} />
                <YAxis
                  tick={{ fontSize: 11, fill: "var(--muted)" }}
                  axisLine={false}
                  tickLine={false}
                  tickFormatter={(v) => `${(v / 1000).toFixed(0)}k`}
                  width={40}
                />
                <Tooltip content={<CustomTooltip />} cursor={{ fill: "var(--surface-2)" }} />
                <Bar dataKey="revenue" name="ยอดขาย" fill="var(--accent)" radius={[4, 4, 0, 0]} />
                <Bar dataKey="received" name="รับชำระ" fill="var(--info)" radius={[4, 4, 0, 0]} />
                <Bar dataKey="profit" name="กำไร" fill="var(--success)" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          )}
        </Card>

        {/* Monthly breakdown table */}
        <Card className="overflow-hidden">
          <div className="border-b border-border px-5 py-4">
            <h2 className="font-semibold">สรุปรายเดือน</h2>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border bg-surface-2">
                  <th className="px-5 py-3 text-left text-xs text-muted-2">เดือน</th>
                  <th className="px-5 py-3 text-right text-xs text-muted-2">จำนวนออเดอร์</th>
                  <th className="px-5 py-3 text-right text-xs text-muted-2">ยอดขาย</th>
                  <th className="px-5 py-3 text-right text-xs text-muted-2">รับชำระแล้ว</th>
                  <th className="px-5 py-3 text-right text-xs text-muted-2">คงค้าง</th>
                  <th className="px-5 py-3 text-right text-xs text-muted-2">กำไร</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {[...monthlyData].reverse().map((m) => (
                  <tr key={m.monthKey} className="hover:bg-surface-2">
                    <td className="px-5 py-3 font-medium">{m.month}</td>
                    <td className="px-5 py-3 text-right text-muted">{m.count} รายการ</td>
                    <td className="px-5 py-3 text-right font-semibold text-accent">{formatBaht(m.revenue)}</td>
                    <td className="px-5 py-3 text-right text-info">{formatBaht(m.received)}</td>
                    <td className="px-5 py-3 text-right">
                      <span className={m.outstanding > 0 ? "text-warn" : "text-muted"}>
                        {formatBaht(m.outstanding)}
                      </span>
                    </td>
                    <td className="px-5 py-3 text-right">
                      <span style={{ color: m.profit >= 0 ? "#22c55e" : "#f87171" }}>
                        {formatBaht(m.profit)}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr className="border-t-2 border-border bg-surface-2 font-semibold">
                  <td className="px-5 py-3">รวมทั้งหมด</td>
                  <td className="px-5 py-3 text-right text-muted">{orders.length} รายการ</td>
                  <td className="px-5 py-3 text-right text-accent">{formatBaht(revenue)}</td>
                  <td className="px-5 py-3 text-right text-info">{formatBaht(received)}</td>
                  <td className="px-5 py-3 text-right text-warn">{formatBaht(outstanding)}</td>
                  <td className="px-5 py-3 text-right" style={{ color: "#22c55e" }}>{formatBaht(profit)}</td>
                </tr>
              </tfoot>
            </table>
          </div>
        </Card>
      </div>
    </div>
  );
}
