"use client";

import { useEffect, useState } from "react";

const PRESETS = [
  { label: "375", w: 375, h: 812 },
  { label: "720", w: 720, h: 900 },
  { label: "1280", w: 1280, h: 800 },
];

export function ViewportBadge() {
  const [width, setWidth] = useState(0);

  useEffect(() => {
    const update = () => setWidth(window.innerWidth);
    update();
    window.addEventListener("resize", update);
    return () => window.removeEventListener("resize", update);
  }, []);

  if (width === 0) return null;

  const breakpoint =
    width < 480 ? "xs"
    : width < 720 ? "sm"
    : width < 1024 ? "md"
    : "lg";

  const openPreset = (w: number, h: number) => {
    window.open(window.location.href, "_blank", `width=${w},height=${h},left=100,top=100`);
  };

  return (
    <div className="viewport-badge fixed top-2 left-1/2 -translate-x-1/2 z-[9999] flex items-center gap-1 text-[10px] font-mono text-muted-2" style={{ pointerEvents: "none" }}>
      <span>{width}px</span>
      <span className="text-accent font-semibold">{breakpoint}</span>
      {PRESETS.map((p) => (
        <button
          key={p.label}
          onClick={() => openPreset(p.w, p.h)}
          className="rounded px-1 text-muted-2 hover:text-foreground transition-colors"
          title={`เปิด popup ${p.w}×${p.h}`}
          style={{ pointerEvents: "auto" }}
        >
          {p.label}
        </button>
      ))}
    </div>
  );
}
