import { Card, PageHeader, Badge } from "@/components/ui";
import {
  orderTotal,
  orderBalance,
  CUSTOMER_TYPE_LABEL,
  type Order,
} from "@/lib/types";
import { formatBaht, formatDate } from "@/lib/utils";
import { TrendingUp, Wallet, Clock, Palette, Factory } from "lucide-react";
import Link from "next/link";
import fs from "fs";
import path from "path";

function readOrders(): Order[] {
  try {
    return JSON.parse(fs.readFileSync(path.join(process.cwd(), "src/data/orders.json"), "utf-8"));
  } catch { return []; }
}

export const dynamic = "force-dynamic";

export default function DashboardPage() {
  const orders = readOrders();
  const revenue = orders.reduce((s, o) => s + orderTotal(o), 0);
  const received = orders.reduce((s, o) => s + o.deposit, 0);
  const outstanding = orders.reduce((s, o) => s + orderBalance(o), 0);
  const designCount = orders.filter(o => o.type === "design" || o.type === "design_produce").length;
  const produceCount = orders.filter(o => o.type === "produce" || o.type === "design_produce").length;

  const stats = [
    {
      label: "ยอดขายรวม",
      value: formatBaht(revenue),
      icon: TrendingUp,
      tone: "text-accent",
    },
    {
      label: "รับชำระแล้ว",
      value: formatBaht(received),
      icon: Wallet,
      tone: "text-info",
    },
    {
      label: "ยอดคงค้าง",
      value: formatBaht(outstanding),
      icon: Clock,
      tone: "text-warn",
    },
  ];

  return (
    <div>
      <PageHeader
        title="ภาพรวม"
        subtitle={`${formatDate(new Date().toISOString())} · ออเดอร์ทั้งหมด ${orders.length} รายการ`}
      />

      <div className="space-y-6 p-8">
        {/* Stat cards */}
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          {stats.map((s) => (
            <Card key={s.label} className="p-5">
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted">{s.label}</span>
                <s.icon className={`h-5 w-5 ${s.tone}`} />
              </div>
              <div className="mt-3 text-2xl font-bold tracking-tight">
                {s.value}
              </div>
            </Card>
          ))}
        </div>

        {/* Queue summary */}
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
          <QueueSummary
            href="/queue/design"
            title="คิวออกแบบ"
            icon={Palette}
            count={designCount}
          />
          <QueueSummary
            href="/queue/production"
            title="คิวผลิต"
            icon={Factory}
            count={produceCount}
          />
        </div>

        {/* Recent orders */}
        <Card className="overflow-hidden">
          <div className="flex items-center justify-between border-b border-border px-5 py-4">
            <h2 className="font-semibold">ออเดอร์ล่าสุด</h2>
            <Link
              href="/orders"
              className="text-sm text-accent hover:underline"
            >
              ดูทั้งหมด →
            </Link>
          </div>
          <div className="divide-y divide-border">
            {orders.slice(0, 5).map((o) => (
              <div
                key={o.id}
                className="flex items-center justify-between px-5 py-3.5"
              >
                <div className="flex items-center gap-3">
                  <span className="font-mono text-xs text-muted-2">{o.id}</span>
                  <span className="font-medium">{o.teamName}</span>
                  <Badge
                    tone={
                      o.type === "design"
                        ? "info"
                        : o.type === "produce"
                          ? "purple"
                          : "accent"
                    }
                  >
                    {CUSTOMER_TYPE_LABEL[o.type]}
                  </Badge>
                </div>
                <div className="text-right">
                  <div className="text-sm font-semibold">
                    {formatBaht(orderTotal(o))}
                  </div>
                  {orderBalance(o) > 0 && (
                    <div className="text-xs text-warn">
                      คงเหลือ {formatBaht(orderBalance(o))}
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        </Card>
      </div>
    </div>
  );
}

function QueueSummary({
  href,
  title,
  icon: Icon,
  count,
}: {
  href: string;
  title: string;
  icon: React.ElementType;
  count: number;
}) {
  return (
    <Link href={href}>
      <Card className="card-hover flex items-center justify-between p-5">
        <div className="flex items-center gap-3">
          <div className="flex h-11 w-11 items-center justify-center rounded-[var(--radius-md)] bg-accent-soft text-accent">
            <Icon className="h-5 w-5" />
          </div>
          <div>
            <div className="font-semibold">{title}</div>
            <div className="text-sm text-muted">{count} งานในคิว</div>
          </div>
        </div>
        <span className="text-2xl font-bold text-muted-2">→</span>
      </Card>
    </Link>
  );
}
