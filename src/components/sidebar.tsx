"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import {
  LayoutDashboard,
  ClipboardList,
  Palette,
  Factory,
  TableProperties,
  Shirt,
  Layers,
  Search,
  Scissors,
  Users,
  LogOut,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useAuth } from "@/context/auth-context";
import { canAccess } from "@/lib/auth";

const nav = [
  { href: "/", label: "ภาพรวม", icon: LayoutDashboard, badge: null as null | string, menuKey: "overview" as null | string, adminOnly: false },
  { href: "/orders", label: "รายการออเดอร์", icon: ClipboardList, badge: "orders", menuKey: "orders", adminOnly: false },
  { href: "/queue/design", label: "คิวออกแบบ", icon: Palette, badge: "design", menuKey: "queue", adminOnly: false },
  { href: "/queue/production", label: "คิวผลิต", icon: Factory, badge: "production", menuKey: "queue", adminOnly: false },
  { href: "/production-tables", label: "ตารางสั่งผลิต", icon: TableProperties, badge: "prod-table", menuKey: "production-tables", adminOnly: false },
  { href: "/cutting-jobs", label: "ใบงานตัด", icon: Scissors, badge: null, menuKey: "cutting-jobs", adminOnly: false },
  { href: "/shirt-styles", label: "ข้อมูลทรงเสื้อ", icon: Shirt, badge: null, menuKey: null, adminOnly: true },
  { href: "/fabrics", label: "ข้อมูลเนื้อผ้า", icon: Layers, badge: null, menuKey: null, adminOnly: true },
  { href: "/track", label: "ติดตามสถานะ (ลูกค้า)", icon: Search, badge: null, menuKey: null, adminOnly: false },
  { href: "/admin/employees", label: "จัดการพนักงาน", icon: Users, badge: null, menuKey: null, adminOnly: true },
];

export function Sidebar() {
  const pathname = usePathname();
  const { user, logout } = useAuth();

  const [slipCount, setSlipCount] = useState(0);
  const [designWaitCount, setDesignWaitCount] = useState(0);
  const [productionWaitCount, setProductionWaitCount] = useState(0);
  const [prodTableNewCount, setProdTableNewCount] = useState(0);

  const isPublic = pathname.startsWith("/cut/") || pathname.startsWith("/pay/") || pathname === "/track" || pathname === "/login";

  useEffect(() => {
    if (!user || isPublic) return;
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

    const channel = new BroadcastChannel("winx:orders");
    channel.onmessage = () => { fetchSlips(); fetchQueues(); };
    const interval = setInterval(() => { fetchSlips(); fetchQueues(); }, 30_000);
    return () => { clearInterval(interval); channel.close(); };
  }, [user]);

  const visibleNav = nav.filter(({ menuKey, adminOnly }) => {
    if (!user) return false;
    if (adminOnly) return user.role === "admin";
    if (menuKey === null) return true;
    return canAccess(user, menuKey);
  });

  if (isPublic) return null;

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
        {visibleNav.map(({ href, label, icon: Icon, badge }) => {
          const active = href === "/" ? pathname === "/" : pathname.startsWith(href);
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

      {/* Version */}
      <div className="hidden min-[720px]:block px-6 pb-2 pt-3">
        <div className="text-[11px] text-muted-2">WINX STUDIO</div>
        <div className="text-[11px] text-muted-2">Looking good at every stage</div>
        <div className="mt-0.5 text-[11px] font-medium text-accent">Beta 1.3.0</div>
      </div>

      {/* Footer: user info + logout */}
      <div className="border-t border-border px-3 py-3 min-[720px]:px-4">
        <div className="hidden min-[720px]:flex items-center justify-between gap-2">
          <div className="min-w-0">
            <div className="truncate text-sm font-medium">{user?.name ?? "—"}</div>
            <div className="text-[11px] text-muted-2">{user?.role === "admin" ? "Admin" : "พนักงาน"}</div>
          </div>
          <button onClick={logout} title="ออกจากระบบ" className="rounded-lg p-1.5 text-muted hover:bg-surface-2 hover:text-foreground">
            <LogOut className="h-4 w-4" />
          </button>
        </div>
        {/* Mobile: icon only */}
        <div className="flex min-[720px]:hidden justify-center">
          <button onClick={logout} title="ออกจากระบบ" className="rounded-lg p-1.5 text-muted hover:bg-surface-2">
            <LogOut className="h-4 w-4" />
          </button>
        </div>
      </div>
    </aside>
  );
}
