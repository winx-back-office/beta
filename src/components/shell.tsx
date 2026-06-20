"use client";

import { usePathname } from "next/navigation";
import { Sidebar } from "@/components/sidebar";
import { BottomNav } from "@/components/bottom-nav";

const STANDALONE_PATHS = ["/clock-in", "/checkin"];

export function Shell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const isStandalone = STANDALONE_PATHS.some((p) => pathname.startsWith(p));

  if (isStandalone) {
    return <>{children}</>;
  }

  return (
    <div className="flex min-h-screen">
      <Sidebar />
      <main className="flex-1 min-w-0 pb-16 min-[720px]:pb-0 print:pb-0">{children}</main>
      <BottomNav />
    </div>
  );
}
