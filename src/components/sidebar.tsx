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
  { href: "/queue/design", label: "คิวออกแบบ", icon: Palette, badge: null },
  { href: "/queue/production", label: "คิวผลิต", icon: Factory, badge: null },
  { href: "/production-tables", label: "ตารางสั่งผลิต", icon: TableProperties, badge: null },
  { href: "/cutting-jobs", label: "ใบงานตัด", icon: Scissors, badge: null },
  { href: "/shirt-styles", label: "ข้อมูลทรงเสื้อ", icon: Shirt, badge: null },
  { href: "/fabrics", label: "ข้อมูลเนื้อผ้า", icon: Layers, badge: null },
  { href: "/track", label: "ติดตามสถานะ (ลูกค้า)", icon: Search, badge: null },
];

export function Sidebar() {
  const pathname = usePathname();

  if (pathname.startsWith("/cut/") || pathname.startsWith("/pay/")) return null;
  const [slipCount, setSlipCount] = useState(0);

  useEffect(() => {
    const fetchSlips = () =>
      fetch("/api/payment-requests", { cache: "no-store" })
        .then((r) => r.json())
        .then((data: { status: string }[]) => {
          setSlipCount(data.filter((pr) => pr.status === "slip_uploaded").length);
        })
        .catch(() => {});

    fetchSlips();
    const interval = setInterval(fetchSlips, 30_000);
    return () => clearInterval(interval);
  }, []);

  return (
    <aside className="sticky top-0 flex h-screen w-14 shrink-0 flex-col border-r border-border bg-surface min-[480px]:w-64">
      {/* Logo */}
      <div className="flex items-center gap-2 px-3 py-6 min-[480px]:px-6">
        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-accent text-accent-foreground font-black text-lg">
          W
        </div>
        <div className="hidden leading-tight min-[480px]:block">
          <div className="font-bold tracking-wide">WINX STUDIO</div>
          <div className="text-[11px] uppercase tracking-[0.18em] text-muted-2">
            Back Office
          </div>
        </div>
      </div>

      {/* Nav */}
      <nav className="flex-1 space-y-1 px-1.5 py-2 min-[480px]:px-3">
        {nav.map(({ href, label, icon: Icon, badge }) => {
          const active =
            href === "/" ? pathname === "/" : pathname.startsWith(href);
          const showBadge = badge === "orders" && slipCount > 0;
          return (
            <Link
              key={href}
              href={href}
              title={label}
              className={cn(
                "flex items-center gap-3 rounded-[var(--radius-md)] px-2.5 py-2.5 text-sm transition-colors min-[480px]:px-3",
                active
                  ? "bg-accent-soft text-accent font-medium"
                  : "text-muted hover:bg-surface-2 hover:text-foreground"
              )}
            >
              <Icon className="h-[18px] w-[18px] shrink-0" />
              <span className="hidden min-[480px]:inline flex-1">{label}</span>
              {showBadge && (
                <span className="hidden min-[480px]:flex ml-auto h-5 min-w-5 items-center justify-center rounded-full bg-yellow-400 px-1.5 text-[10px] font-bold text-black">
                  {slipCount}
                </span>
              )}
            </Link>
          );
        })}
      </nav>

      {/* Footer */}
      <div className="hidden border-t border-border px-6 py-4 min-[480px]:block">
        <div className="text-[11px] text-muted-2">WINX 3.0 · Looking good at every stage</div>
        <div className="mt-1 text-[11px] font-medium text-accent">Beta 1.2</div>
      </div>
    </aside>
  );
}
