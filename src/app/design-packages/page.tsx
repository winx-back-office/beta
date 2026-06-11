"use client";

import { Crown, Clock, Palette, RotateCcw, Tag, Box, FileText, MessageCircle } from "lucide-react";

interface Package {
  id: string;
  name: string;
  tagline: string;
  price: number | null;
  priceLabel?: string;
  days: string;
  designs: string;
  revisions: string;
  sponsors: string;
  formats: string[];
  channels: string[];
  note?: string;
  highlight?: boolean;
  color: string;
}

const packages: Package[] = [
  {
    id: "jersey-one",
    name: "JERSEY ONE",
    tagline: "ทีมทั่วไป และสตรีมเมอร์",
    price: null,
    priceLabel: "FREE",
    days: "3–5 วัน",
    designs: "ออกแบบ 1 แบบ",
    revisions: "แก้ไข 2 ครั้ง",
    sponsors: "สปอนเซอร์ไม่จำกัด",
    formats: ["JPG", "PNG"],
    channels: [],
    note: "ผลิตขั้นต่ำ 10 ตัว มัดจำ 70% ก่อนเริ่มงาน",
    color: "#a855f7",
  },
  {
    id: "player",
    name: "PLAYER",
    tagline: "ทีมทั่วไป และสตรีมเมอร์",
    price: 1690,
    days: "3 วัน / รุ่น",
    designs: "ออกแบบ 1 แบบ",
    revisions: "แก้ไข 3 ครั้ง",
    sponsors: "สปอนเซอร์ไม่จำกัด",
    formats: ["AI", "JPG", "PNG"],
    channels: ["Facebook", "TikTok"],
    highlight: true,
    color: "#3b82f6",
  },
  {
    id: "pro-player",
    name: "PRO PLAYER",
    tagline: "นักกีฬามืออาชีพ สตรีมเมอร์มืออาชีพ",
    price: 2990,
    days: "3 วัน / รุ่น",
    designs: "ออกแบบ 2 แบบ",
    revisions: "แก้ไข 3 ครั้ง / แบบ",
    sponsors: "สปอนเซอร์ไม่จำกัด",
    formats: ["AI", "JPG", "PNG"],
    channels: ["Facebook", "TikTok", "Discord"],
    color: "#f97316",
  },
  {
    id: "pro-league",
    name: "PRO LEAGUE",
    tagline: "สิ่งกีฬาอีสปอร์ต ทีมที่เปลี่ยนเสื้อทุก SS",
    price: 3990,
    days: "3 วัน / รุ่น",
    designs: "ออกแบบ 3 รุ่น",
    revisions: "แก้ไข 3 ครั้ง / แบบ",
    sponsors: "สปอนเซอร์ไม่จำกัด",
    formats: ["AI", "JPG", "PNG"],
    channels: ["Facebook", "TikTok", "Discord"],
    color: "#22c55e",
  },
  {
    id: "quick",
    name: "QUICK DESIGN",
    tagline: "ออกแบบเร่งด่วน ภายใน 2–3 วัน",
    price: 1000,
    days: "1–3 วัน",
    designs: "แพคเกจเสริม",
    revisions: "—",
    sponsors: "—",
    formats: [],
    channels: [],
    note: "สำหรับทีมที่ต้องการงานด่วน ไม่รวมงานออกแบบ",
    color: "#14b8a6",
  },
];

function formatPrice(pkg: Package) {
  if (pkg.priceLabel) return pkg.priceLabel;
  if (pkg.price === null) return "FREE";
  return pkg.price.toLocaleString("th-TH");
}

export default function DesignPackagesPage() {
  return (
    <div className="min-h-screen">
      <div className="border-b border-border bg-surface px-4 py-4 min-[720px]:px-8">
        <div className="flex items-center gap-2">
          <Crown className="h-5 w-5 text-accent" />
          <div>
            <h1 className="text-xl font-bold">แพคเกจออกแบบ</h1>
            <p className="text-xs text-muted-2 mt-0.5">ราคาและรายละเอียดแพคเกจออกแบบ WINX STUDIO</p>
          </div>
        </div>
      </div>

      <div className="px-4 py-6 min-[720px]:px-8">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-5">
          {packages.map((pkg) => (
            <div
              key={pkg.id}
              className="relative rounded-[var(--radius-lg)] border bg-surface p-5 flex flex-col gap-3"
              style={{ borderColor: pkg.highlight ? pkg.color : undefined }}
            >
              {pkg.highlight && (
                <div
                  className="absolute -top-3 left-4 rounded-full px-3 py-0.5 text-[11px] font-bold"
                  style={{ background: pkg.color, color: "#000" }}
                >
                  ยอดนิยม 🔥
                </div>
              )}

              {/* Name */}
              <div>
                <div className="text-lg font-black tracking-wide" style={{ color: pkg.color }}>
                  {pkg.name}
                </div>
                <div className="text-xs text-muted mt-0.5">{pkg.tagline}</div>
              </div>

              {/* Price */}
              <div
                className="text-2xl font-black"
                style={{ color: pkg.priceLabel === "FREE" ? pkg.color : pkg.color }}
              >
                {formatPrice(pkg)}
                {pkg.price !== null && (
                  <span className="text-sm font-normal text-muted ml-1">บาท</span>
                )}
              </div>

              <div className="border-t border-border" />

              {/* Details */}
              <div className="flex flex-col gap-1.5 text-xs text-muted flex-1">
                {[
                  { icon: Clock, label: pkg.days },
                  { icon: Palette, label: pkg.designs, bold: true },
                  pkg.revisions !== "—" ? { icon: RotateCcw, label: pkg.revisions, accent: true } : null,
                  pkg.sponsors !== "—" ? { icon: Tag, label: pkg.sponsors } : null,
                  { icon: Box, label: "Realistic Jersey 3D" },
                  pkg.formats.length > 0 ? { icon: FileText, label: pkg.formats.join(", ") } : null,
                ].filter(Boolean).map((item, i) => {
                  const Icon = item!.icon;
                  return (
                    <div key={i} className="flex items-center gap-2">
                      <Icon className="h-3.5 w-3.5 shrink-0" style={{ color: pkg.color }} />
                      <span
                        className={item!.bold ? "text-foreground font-medium" : ""}
                        style={item!.accent ? { color: pkg.color, fontWeight: 500 } : undefined}
                      >
                        {item!.label}
                      </span>
                    </div>
                  );
                })}
              </div>

              {pkg.note && (
                <div className="rounded-md bg-surface-2 px-3 py-2 text-[11px] text-muted-2 leading-relaxed">
                  {pkg.note}
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
