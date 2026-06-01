"use client";

import { useEffect, useState } from "react";
import { PageHeader, Badge, Button, Card } from "@/components/ui";
import { AddOrderModal } from "@/components/add-order-modal";
import { orderTotal, orderBalance, orderProfit, costTotal, CUSTOMER_TYPE_LABEL, type Order } from "@/lib/types";
import { formatBaht, formatDate } from "@/lib/utils";
import { ArrowLeft, FileSpreadsheet, Table2, Loader2, Pencil } from "lucide-react";
import Link from "next/link";
import { useParams } from "next/navigation";

export default function OrderDetailPage() {
  const { id } = useParams<{ id: string }>();
  const [order, setOrder] = useState<Order | null>(null);
  const [loading, setLoading] = useState(true);
  const [editOpen, setEditOpen] = useState(false);

  const loadOrder = () => {
    fetch(`/api/orders/${id}`)
      .then((r) => r.json())
      .then((data) => { setOrder(data); setLoading(false); });
  };

  useEffect(() => { loadOrder(); }, [id]);

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
            <Button onClick={() => setEditOpen(true)}>
              <Pencil className="h-4 w-4" />
              แก้ไข
            </Button>
            <Link href="/orders">
              <Button variant="outline">
                <ArrowLeft className="h-4 w-4" />
                กลับ
              </Button>
            </Link>
          </div>
        }
      />

      <div className="grid grid-cols-1 gap-6 p-8 lg:grid-cols-3">
        {/* Left */}
        <div className="space-y-6 lg:col-span-2">
          <Card className="p-6">
            <h2 className="mb-4 text-sm font-semibold uppercase tracking-wide text-muted-2">ข้อมูลออเดอร์</h2>
            <dl className="grid grid-cols-2 gap-x-6 gap-y-4 text-sm">
              <Field label="ชื่อทีม" value={order.teamName} />
              <Field label="วันที่เริ่ม" value={formatDate(order.startDate)} />
              {order.type === "design" ? (
                <Field label="แพคเกจออกแบบ" value={order.designPackage ?? "-"} full />
              ) : (
                <>
                  <Field label="ประเภทเสื้อ" value={order.shirtType ?? "-"} />
                  <Field label="เนื้อผ้า" value={order.fabricType ?? "-"} />
                  <Field label="จำนวนตัว" value={`${order.quantity ?? 1} ตัว`} />
                </>
              )}
            </dl>
          </Card>

          {isProduce && order.cost && (
            <Card className="p-6">
              <h2 className="mb-4 text-sm font-semibold uppercase tracking-wide text-muted-2">ต้นทุนการผลิต</h2>
              <div className="space-y-2.5 text-sm">
                <CostRow label="ต้นทุนผ้า" value={order.cost.fabric} />
                <CostRow label="ต้นทุนกระดาษซับ" value={order.cost.paper} />
                <CostRow label="ต้นทุนหมึก" value={order.cost.ink} />
                <CostRow label="ต้นทุนตัด" value={order.cost.cut} />
                <CostRow label="ต้นทุนเย็บ" value={order.cost.sew} />
                <CostRow label="ต้นทุนอื่นๆ" value={order.cost.other} />
                <div className="mt-2 flex justify-between border-t border-border pt-3 font-semibold">
                  <span>รวมต้นทุนผลิต</span>
                  <span>{formatBaht(costTotal(order))}</span>
                </div>
              </div>
            </Card>
          )}
        </div>

        {/* Right */}
        <div className="space-y-6">
          <Card className="p-6">
            <h2 className="mb-4 text-sm font-semibold uppercase tracking-wide text-muted-2">สรุปการเงิน</h2>
            <div className="space-y-3 text-sm">
              {order.type === "design" ? (
                <SummaryRow label="ราคาแพคเกจ" value={order.designPackagePrice ?? 0} />
              ) : (
                <>
                  {order.type === "design_produce" && (
                    <SummaryRow label="ค่าออกแบบ" value={order.designPackagePrice ?? 0} />
                  )}
                  <SummaryRow
                    label={`ราคาผลิต (${formatBaht(order.productionPrice ?? 0)}/ตัว × ${order.quantity ?? 1} ตัว)`}
                    value={(order.productionPrice ?? 0) * (order.quantity ?? 1)}
                  />
                  <SummaryRow label="ค่าจัดส่ง" value={order.shipping ?? 0} />
                </>
              )}
              <div className="flex justify-between border-t border-border pt-3 text-base font-bold">
                <span>ยอดรวมทั้งหมด</span>
                <span>{formatBaht(orderTotal(order))}</span>
              </div>
              <SummaryRow label="ยอดมัดจำ" value={order.deposit} muted />
              <div className="flex justify-between rounded-[var(--radius-md)] bg-warn/10 px-3 py-2.5 font-semibold text-warn">
                <span>ยอดคงเหลือ</span>
                <span>{formatBaht(orderBalance(order))}</span>
              </div>
              {orderProfit(order) !== null && (
                <div className="flex justify-between rounded-[var(--radius-md)] bg-accent-soft px-3 py-2.5 font-semibold text-accent">
                  <span>กำไรโดยประมาณ</span>
                  <span>{formatBaht(orderProfit(order)!)}</span>
                </div>
              )}
            </div>
          </Card>

          {isProduce && (
            <Card className="p-6">
              <div className="mb-3 flex items-center gap-2 text-sm font-medium">
                <Table2 className="h-4 w-4 text-accent" />
                ตารางสั่งผลิต
              </div>
              <p className="mb-4 text-xs text-muted">
                สร้างตารางรายชื่อผู้เล่นและไซส์ — ระบบจะดึงชื่อทีม ประเภทเสื้อ และเนื้อผ้าไปให้อัตโนมัติ
              </p>
              <Link href={`/orders/${order.id}/production-table`}>
                <Button className="w-full">
                  <FileSpreadsheet className="h-4 w-4" />
                  {order.hasProductionTable ? "เปิดตารางสั่งผลิต" : "สร้างตารางสั่งผลิต"}
                </Button>
              </Link>
              {order.hasProductionTable && (
                <Badge tone="success" className="mt-3">สร้างแล้ว</Badge>
              )}
            </Card>
          )}
        </div>
      </div>

      <AddOrderModal
        open={editOpen}
        onClose={() => setEditOpen(false)}
        editOrder={order ?? undefined}
        onCreated={(updated) => {
          setOrder(updated);
          setEditOpen(false);
        }}
      />
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
