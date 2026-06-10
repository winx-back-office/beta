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
  Scissors,
  Shirt,
  Layers,
  Search,
  Users,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useAuth } from "@/context/auth-context";
import { canAccess } from "@/lib/auth";

const nav = [
  { href: "/", label: "ภาพรวม", icon: LayoutDashboard, menuKey: null as null | string, adminOnly: false },
  { href: "/orders", label: "ออเดอร์", icon: ClipboardList, menuKey: "orders", adminOnly: false },
  { href: "/queue/design", label: "ออกแบบ", icon: Palette, menuKey: "queue", adminOnly: false },
  { href: "/queue/production", label: "ผลิต", icon: Factory, menuKey: "queue", adminOnly: false },
  { href: "/production-tables", label: "ตารางผลิต", icon: TableProperties, menuKey: "production-tables", adminOnly: false },
  { href: "/cutting-jobs", label: "ใบตัด", icon: Scissors, menuKey: "cutting-jobs", adminOnly: false },
  { href: "/shirt-styles", label: "ทรงเสื้อ", icon: Shirt, menuKey: null, adminOnly: true },
  { href: "/fabrics", label: "เนื้อผ้า", icon: Layers, menuKey: null, adminOnly: true },
  { href: "/track", label: "ติดตาม", icon: Search, menuKey: null, adminOnly: false },
  { href: "/admin/employees", label: "พนักงาน", icon: Users, menuKey: null, adminOnly: true },
];

export function BottomNav() {
  const pathname = usePathname();
  const { user } = useAuth();
  const [slipCount, setSlipCount] = useState(0);

  const isPublic = pathname.startsWith("/cut/") || pathname.startsWith("/pay/") || pathname === "/track" || pathname === "/login";
  if (isPublic) return null;

  useEffect(() => {
    if (!user) return;
    fetch("/api/payment-requests", { cache: "no-store" })
      .then((r) => r.json())
      .then((data: { status: string }[]) =>
        setSlipCount(data.filter((pr) => pr.status === "slip_uploaded").length)
      )
      .catch(() => {});
  }, [user]);

  const visibleNav = nav.filter(({ menuKey, adminOnly }) => {
    if (!user) return false;
    if (adminOnly) return user.role === "admin";
    if (menuKey === null) return true;
    return canAccess(user, menuKey);
  });

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-40 flex min-[720px]:hidden border-t border-border bg-surface/95 backdrop-blur-sm">
      <div className="flex w-full overflow-x-auto scrollbar-none">
        {visibleNav.map(({ href, label, icon: Icon }) => {
          const active = href === "/" ? pathname === "/" : pathname.startsWith(href);
          const hasBadge = href === "/orders" && slipCount > 0;
          return (
            <Link
              key={href}
              href={href}
              target={href === "/track" ? "_blank" : undefined}
              rel={href === "/track" ? "noopener noreferrer" : undefined}
              className={cn(
                "relative flex flex-1 min-w-[60px] flex-col items-center gap-1 px-2 py-2.5 text-[10px] transition-colors",
                active ? "text-accent" : "text-muted"
              )}
            >
              <div className="relative">
                <Icon className="h-5 w-5 shrink-0" />
                {hasBadge && (
                  <span className="absolute -right-1 -top-1 flex h-3.5 w-3.5 items-center justify-center rounded-full bg-yellow-400 text-[8px] font-bold text-black">
                    {slipCount}
                  </span>
                )}
              </div>
              <span className="leading-none">{label}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
