"use client";

import { useState } from "react";

export function ClaimForm({ jobId, phase }: { jobId: string; phase: "cutting" | "sewing" }) {
  const [pin, setPin] = useState("");
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [shake, setShake] = useState(false);

  const isSewing = phase === "sewing";
  const accentColor = isSewing ? "#a855f7" : "#6366f1";
  const accentLight = isSewing ? "#d8b4fe" : "#818cf8";

  const appendDigit = (d: string) => {
    if (pin.length < 4) setPin((p) => p + d);
  };

  const deleteDigit = () => setPin((p) => p.slice(0, -1));

  const submit = async () => {
    if (pin.length !== 4) return;
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/cutting-jobs/${jobId}/claim`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ pin, phase }),
      });
      const data = await res.json();
      if (data.success) {
        setSuccess(data.cutterName ?? data.sewerName);
        setTimeout(() => window.location.reload(), 1000);
      } else {
        setError(data.error ?? "เกิดข้อผิดพลาด");
        setPin("");
        setShake(true);
        setTimeout(() => setShake(false), 600);
      }
    } catch {
      setError("เกิดข้อผิดพลาด กรุณาลองใหม่");
      setPin("");
    } finally {
      setLoading(false);
    }
  };

  if (success) {
    return (
      <div className="rounded-2xl border bg-white/5 px-6 py-8 text-center space-y-3" style={{ borderColor: `${accentColor}50` }}>
        <div className="text-4xl">{isSewing ? "🪡" : "✂️"}</div>
        <div className="text-xl font-bold" style={{ color: accentLight }}>รับงานเรียบร้อย!</div>
        <div className="text-lg font-semibold text-white">{success}</div>
        <div className="text-sm text-white/50">กำลังดำเนินการ{isSewing ? "เย็บ" : "ตัด"}…</div>
      </div>
    );
  }

  const digits = ["1", "2", "3", "4", "5", "6", "7", "8", "9", "", "0", "⌫"];

  return (
    <div className={`rounded-2xl border border-white/10 bg-white/5 px-6 py-6 space-y-5 ${shake ? "animate-shake" : ""}`}>
      <div className="text-center">
        <div className="text-sm font-semibold text-white/60 mb-1">
          {isSewing ? "🪡 ช่างเย็บ" : "✂️ ช่างตัด"} — ใส่ PIN เพื่อรับงาน
        </div>
        <div className="text-xs text-white/30">กรอก 4 หลัก</div>
      </div>

      {/* PIN dots */}
      <div className="flex justify-center gap-4">
        {[0, 1, 2, 3].map((i) => (
          <div
            key={i}
            className="h-4 w-4 rounded-full transition-colors"
            style={{ background: i < pin.length ? accentColor : "rgba(255,255,255,0.2)" }}
          />
        ))}
      </div>

      {error && (
        <div className="text-center text-sm font-medium text-red-400">{error}</div>
      )}

      {/* Number pad */}
      <div className="grid grid-cols-3 gap-3">
        {digits.map((d, i) => (
          <button
            key={i}
            onClick={() => {
              if (d === "⌫") deleteDigit();
              else if (d !== "") appendDigit(d);
            }}
            disabled={d === ""}
            className="h-16 rounded-xl text-xl font-bold transition-all active:scale-95 disabled:invisible bg-white/10 text-white hover:bg-white/20"
          >
            {d}
          </button>
        ))}
      </div>

      <button
        onClick={submit}
        disabled={pin.length !== 4 || loading}
        className="w-full rounded-xl py-4 text-base font-bold text-white transition-all active:scale-95 disabled:opacity-40"
        style={{ background: accentColor }}
      >
        {loading ? "กำลังตรวจสอบ…" : isSewing ? "🪡 รับงานเย็บ" : "✂️ รับงานตัด"}
      </button>

      <style jsx>{`
        @keyframes shake {
          0%, 100% { transform: translateX(0); }
          20% { transform: translateX(-8px); }
          40% { transform: translateX(8px); }
          60% { transform: translateX(-8px); }
          80% { transform: translateX(8px); }
        }
        .animate-shake { animation: shake 0.5s ease-in-out; }
      `}</style>
    </div>
  );
}
