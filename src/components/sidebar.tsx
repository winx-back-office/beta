"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import {
  LayoutDashboard,
  ClipboardList,
  Palette,
  Factory,
  Search,
  TableProperties,
  Shirt,
  Layers,
  Scissors,
} from "lucide-react";
import { cn } from "@/lib/utils";

const nav = [
  { href: "/", label: "ภาพรวม", icon: LayoutDashboard, badge: null as null | string },
  { href: "/orders", label: "รายการออเดอร์", icon: ClipboardList, badge: "orders" as null | string },
  { href: "/queue/design", label: "คิวออกแบบ", icon: Palette, badge: "design" },
  { href: "/queue/production", label: "คิวผลิต", icon: Factory, badge: "production" },
  { href: "/production-tables", label: "ตารางสั่งผลิต", icon: TableProperties, badge: "prod-table" },
  { href: "/cutting-jobs", label: "ใบงานตัด", icon: Scissors, badge: null },
  { href: "/shirt-styles", label: "ข้อมูลทรงเสื้อ", icon: Shirt, badge: null },
  { href: "/fabrics", label: "ข้อมูลเนื้อผ้า", icon: Layers, badge: null },
  { href: "/track", label: "ติดตามสถานะ (ลูกค้า)", icon: Search, badge: null },
];

export function Sidebar() {
  const pathname = usePathname();

  if (pathname.startsWith("/cut/") || pathname.startsWith("/pay/") || pathname === "/track") return null;
  const [slipCount, setSlipCount] = useState(0);
  const [designWaitCount, setDesignWaitCount] = useState(0);
  const [productionWaitCount, setProductionWaitCount] = useState(0);
  const [prodTableNewCount, setProdTableNewCount] = useState(0);

  useEffect(() => {
    const fetchSlips = () =>
      fetch("/api/payment-requests", { cache: "no-store" })
        .then((r) => r.json())
        .then((data: { status: string }[]) => {
          setSlipCount(data.filter((pr) => pr.status === "slip_uploaded").length);
        })
        .catch(() => {});

    const fetchQueues = () =>
      fetch("/api/orders", { cache: "no-store" })
        .then((r) => r.json())
        .then((orders: { type: string; designStatus?: string; productionStatus?: string; hasProductionTable?: boolean }[]) => {
          setDesignWaitCount(orders.filter(
            (o) => (o.type === "design" || o.type === "design_produce") &&
              (!o.designStatus || o.designStatus === "wait_design")
          ).length);
          setProductionWaitCount(orders.filter(
            (o) => o.type !== "design" &&
              (o.hasProductionTable || o.productionStatus) &&
              (!o.productionStatus || o.productionStatus === "summary")
          ).length);
          setProdTableNewCount(orders.filter(
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            (o: any) => o.productionTableNew === true
          ).length);
        })
        .catch(() => {});

    fetchSlips();
    fetchQueues();

    // อัพเดททันทีเมื่อมีการเปลี่ยนแปลงออเดอร์ในแท็บเดียวกันหรือแท็บอื่น
    const channel = new BroadcastChannel("winx:orders");
    channel.onmessage = () => { fetchSlips(); fetchQueues(); };

    const interval = setInterval(() => { fetchSlips(); fetchQueues(); }, 30_000);
    return () => { clearInterval(interval); channel.close(); };
  }, []);

  return (
    <aside className="sticky top-0 hidden h-screen w-14 shrink-0 flex-col border-r border-border bg-surface min-[720px]:flex min-[720px]:w-64">
      {/* Logo */}
      <div className="flex items-center gap-2 px-3 py-6 min-[720px]:px-6">
        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-accent text-accent-foreground font-black text-lg">
          W
        </div>
        <div className="hidden leading-tight min-[720px]:block">
          <div className="font-bold tracking-wide">WINX STUDIO</div>
          <div className="text-[11px] uppercase tracking-[0.18em] text-muted-2">
            Back Office
          </div>
        </div>
      </div>

      {/* Nav */}
      <nav className="flex-1 space-y-1 px-1.5 py-2 min-[720px]:px-3">
        {nav.map(({ href, label, icon: Icon, badge }) => {
          const active =
            href === "/" ? pathname === "/" : pathname.startsWith(href);
          const showBadge = badge === "orders" && slipCount > 0;
          const showDesignBadge = badge === "design" && designWaitCount > 0;
          const showProductionBadge = badge === "production" && productionWaitCount > 0;
          const showProdTableBadge = badge === "prod-table" && prodTableNewCount > 0;
          return (
            <Link
              key={href}
              href={href}
              title={label}
              target={href === "/track" ? "_blank" : undefined}
              rel={href === "/track" ? "noopener noreferrer" : undefined}
              className={cn(
                "flex items-center gap-3 rounded-[var(--radius-md)] px-2.5 py-2.5 text-sm transition-colors min-[720px]:px-3",
                active
                  ? "bg-accent-soft text-accent font-medium"
                  : "text-muted hover:bg-surface-2 hover:text-foreground"
              )}
            >
              <Icon className="h-[18px] w-[18px] shrink-0" />
              <span className="hidden min-[720px]:inline flex-1">{label}</span>
              {showBadge && (
                <span className="hidden min-[720px]:flex ml-auto h-5 min-w-5 items-center justify-center rounded-full bg-yellow-400 px-1.5 text-[10px] font-bold text-black">
                  {slipCount}
                </span>
              )}
              {showDesignBadge && (
                <span className="hidden min-[720px]:flex ml-auto h-5 min-w-5 items-center justify-center rounded-full bg-accent px-1.5 text-[10px] font-bold text-accent-foreground">
                  {designWaitCount}
                </span>
              )}
              {showProductionBadge && (
                <span className="hidden min-[720px]:flex ml-auto h-5 min-w-5 items-center justify-center rounded-full bg-accent px-1.5 text-[10px] font-bold text-accent-foreground">
                  {productionWaitCount}
                </span>
              )}
              {showProdTableBadge && (
                <span className="hidden min-[720px]:flex ml-auto h-5 min-w-5 items-center justify-center rounded-full bg-yellow-400 px-1.5 text-[10px] font-bold text-black">
                  {prodTableNewCount}
                </span>
              )}
            </Link>
          );
        })}
      </nav>

      {/* Footer */}
      <div className="hidden border-t border-border px-6 py-4 min-[720px]:block">
        <div className="text-[11px] text-muted-2">WINX STUDIO</div>
        <div className="text-[11px] text-muted-2">Looking good at every stage</div>
        <div className="mt-1 text-[11px] font-medium text-accent">Beta 1.2.0.6</div>
      </div>
    </aside>
  );
}
