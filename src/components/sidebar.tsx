"use client";

import React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import {
  LayoutDashboard,
  ClipboardList,
  Palette,
  Factory,
  TableProperties,
  Crown,
  Shirt,
  Layers,
  Search,
  Scissors,
  PackageCheck,
  Users,
  LogOut,
  BarChart2,
  PanelLeftClose,
  PanelLeftOpen,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useAuth } from "@/context/auth-context";
import { canAccess } from "@/lib/auth";

type NavItem = {
  href: string;
  label: string;
  icon: React.ElementType;
  badge: null | string;
  menuKey: null | string;
  adminOnly: boolean;
};

type NavGroup = {
  groupLabel: string;
  items: NavItem[];
};

const navGroups: NavGroup[] = [
  {
    groupLabel: "ภาพรวม",
    items: [
      { href: "/", label: "ภาพรวมการเงิน", icon: LayoutDashboard, badge: null, menuKey: "overview", adminOnly: false },
      { href: "/summary", label: "สรุปภาพรวมงาน", icon: BarChart2, badge: null, menuKey: "summary", adminOnly: false },
    ],
  },
  {
    groupLabel: "ออเดอร์ & คิว",
    items: [
      { href: "/orders", label: "รายการออเดอร์", icon: ClipboardList, badge: "orders", menuKey: "orders", adminOnly: false },
      { href: "/queue/design", label: "คิวออกแบบ", icon: Palette, badge: "design", menuKey: "queue", adminOnly: false },
      { href: "/queue/production", label: "คิวผลิต", icon: Factory, badge: "production", menuKey: "queue", adminOnly: false },
      { href: "/production-tables", label: "ตารางสั่งผลิต", icon: TableProperties, badge: "prod-table", menuKey: "production-tables", adminOnly: false },
    ],
  },
  {
    groupLabel: "ใบงาน",
    items: [
      { href: "/cutting-jobs", label: "ใบงานตัด-เย็บ", icon: Scissors, badge: null, menuKey: "cutting-jobs", adminOnly: false },
      { href: "/delivery-notes", label: "ใบส่งสินค้า", icon: PackageCheck, badge: null, menuKey: "delivery-notes", adminOnly: false },
    ],
  },
  {
    groupLabel: "แพคเกจ & ข้อมูลเสื้อ",
    items: [
      { href: "/design-packages", label: "แพคเกจออกแบบ", icon: Crown, badge: null, menuKey: null, adminOnly: true },
      { href: "/shirt-styles", label: "ข้อมูลทรงเสื้อ", icon: Shirt, badge: null, menuKey: null, adminOnly: true },
      { href: "/fabrics", label: "ข้อมูลเนื้อผ้า", icon: Layers, badge: null, menuKey: null, adminOnly: true },
    ],
  },
  {
    groupLabel: "ส่วนของลูกค้า",
    items: [
      { href: "/track", label: "ติดตามสถานะ (ลูกค้า)", icon: Search, badge: null, menuKey: null, adminOnly: false },
    ],
  },
  {
    groupLabel: "จัดการพนักงาน",
    items: [
      { href: "/admin/employees", label: "จัดการพนักงาน", icon: Users, badge: null, menuKey: null, adminOnly: true },
      { href: "/admin/cutters", label: "จัดการช่างตัด", icon: Scissors, badge: null, menuKey: null, adminOnly: true },
      { href: "/admin/sewers", label: "จัดการช่างเย็บ", icon: Layers, badge: null, menuKey: null, adminOnly: true },
    ],
  },
];

export function Sidebar() {
  const pathname = usePathname();
  const { user, logout } = useAuth();
  const [collapsed, setCollapsed] = useState(() => {
    if (typeof window === "undefined") return false;
    return localStorage.getItem("winx-sidebar-collapsed") === "1";
  });
  const toggleCollapsed = () => setCollapsed((v) => {
    localStorage.setItem("winx-sidebar-collapsed", v ? "0" : "1");
    return !v;
  });

  const [slipCount, setSlipCount] = useState(0);
  const [designWaitCount, setDesignWaitCount] = useState(0);
  const [productionWaitCount, setProductionWaitCount] = useState(0);
  const [prodTableNewCount, setProdTableNewCount] = useState(0);

  const isPublic = pathname.startsWith("/cut/") || pathname.startsWith("/pay/") || pathname.startsWith("/address/") || pathname === "/track" || pathname === "/login" || pathname.endsWith("/print");

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
        .then((orders: { type: string; designStatus?: string; productionStatus?: string; hasProductionTable?: boolean; designPackage?: string }[]) => {
          setDesignWaitCount(orders.filter(
            (o) => (o.type === "design" || o.type === "design_produce" || (o.type === "produce" && o.designPackage)) &&
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

  const filterItem = ({ menuKey, adminOnly }: NavItem) => {
    if (!user) return false;
    if (adminOnly) return user.role === "admin";
    if (menuKey === null) return true;
    return canAccess(user, menuKey);
  };

  const visibleGroups = navGroups
    .map((g) => ({ ...g, items: g.items.filter(filterItem) }))
    .filter((g) => g.items.length > 0);

  if (isPublic) return null;

  return (
    <aside className={cn(
      "sticky top-0 hidden h-screen shrink-0 flex-col border-r border-border bg-surface print:hidden transition-[width] duration-200",
      "min-[720px]:flex",
      collapsed ? "w-14 min-[720px]:w-14" : "w-14 min-[720px]:w-64"
    )}>
      {/* Logo */}
      <div className="flex items-center gap-2 px-3 py-4 min-[720px]:px-3">
        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-accent text-accent-foreground font-black text-lg">
          W
        </div>
        {!collapsed && (
          <div className="hidden flex-1 leading-tight min-[720px]:block">
            <div className="font-bold tracking-wide">WINX STUDIO</div>
            <div className="text-[11px] uppercase tracking-[0.18em] text-muted-2">Back Office</div>
          </div>
        )}
        <button
          onClick={toggleCollapsed}
          title={collapsed ? "ขยายเมนู" : "ย่อเมนู"}
          className="hidden min-[720px]:flex shrink-0 rounded-lg p-1.5 text-muted hover:bg-surface-2 hover:text-foreground"
        >
          {collapsed ? <PanelLeftOpen className="h-4 w-4" /> : <PanelLeftClose className="h-4 w-4" />}
        </button>
      </div>

      {/* Nav */}
      <nav className="flex-1 overflow-y-auto px-1.5 py-2 min-[720px]:px-3">
        {visibleGroups.map((group, gi) => (
          <div key={group.groupLabel} className={gi > 0 ? "mt-4" : ""}>
            {!collapsed && (
              <div className="hidden min-[720px]:block px-3 pb-1 pt-0.5 text-[10px] font-semibold uppercase tracking-widest text-muted-2">
                {group.groupLabel}
              </div>
            )}
            <div className="space-y-0.5">
              {group.items.map(({ href, label, icon: Icon, badge }) => {
                const active = href === "/" ? pathname === "/" : pathname.startsWith(href);
                const showBadge = badge === "orders" && slipCount > 0;
                const showDesignBadge = badge === "design" && designWaitCount > 0;
                const showProductionBadge = badge === "production" && productionWaitCount > 0;
                const showProdTableBadge = badge === "prod-table" && prodTableNewCount > 0;
                const hasBadge = showBadge || showDesignBadge || showProductionBadge || showProdTableBadge;
                const badgeCount = showBadge ? slipCount : showDesignBadge ? designWaitCount : showProductionBadge ? productionWaitCount : prodTableNewCount;
                const badgeColor = showBadge || showProdTableBadge ? "bg-yellow-400 text-black" : "bg-accent text-accent-foreground";
                return (
                  <Link
                    key={href}
                    href={href}
                    title={label}
                    target={href === "/track" ? "_blank" : undefined}
                    rel={href === "/track" ? "noopener noreferrer" : undefined}
                    className={cn(
                      "relative flex items-center gap-3 rounded-[var(--radius-md)] px-2.5 py-2.5 text-sm transition-colors min-[720px]:px-3",
                      active ? "bg-accent-soft text-accent font-medium" : "text-muted hover:bg-surface-2 hover:text-foreground"
                    )}
                  >
                    <Icon className="h-[18px] w-[18px] shrink-0" />
                    {/* dot badge when collapsed */}
                    {collapsed && hasBadge && (
                      <span className="absolute top-1.5 right-1.5 h-2 w-2 rounded-full bg-yellow-400" />
                    )}
                    {!collapsed && <span className="hidden min-[720px]:inline flex-1">{label}</span>}
                    {!collapsed && hasBadge && (
                      <span className={cn("hidden min-[720px]:flex ml-auto h-5 min-w-5 items-center justify-center rounded-full px-1.5 text-[10px] font-bold", badgeColor)}>
                        {badgeCount}
                      </span>
                    )}
                  </Link>
                );
              })}
            </div>
          </div>
        ))}
      </nav>

      {/* Version */}
      {!collapsed && (
        <div className="hidden min-[720px]:block px-4 pb-2 pt-3">
          <div className="text-[11px] text-muted-2">WINX STUDIO</div>
          <div className="text-[11px] text-muted-2">Looking good at every stage</div>
          <div className="mt-0.5 text-[11px] font-medium text-accent">Beta 1.3.5</div>
        </div>
      )}

      {/* Footer: user info + logout + collapse toggle */}
      <div className="border-t border-border px-3 py-3">
        <div className="hidden min-[720px]:flex items-center justify-between gap-2">
          {!collapsed && (
            <div className="min-w-0">
              <div className="truncate text-sm font-medium">{user?.name ?? "—"}</div>
              <div className="text-[11px] text-muted-2">{user?.role === "admin" ? "Admin" : "พนักงาน"}</div>
            </div>
          )}
          <button onClick={logout} title="ออกจากระบบ" className={cn("rounded-lg p-1.5 text-muted hover:bg-surface-2 hover:text-foreground", collapsed && "mx-auto")}>
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
