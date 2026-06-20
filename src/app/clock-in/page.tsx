"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import QRCode from "qrcode";

interface LogEntry {
  id: string;
  type: "in" | "out";
  timestamp: string;
  employees: { name: string } | null;
}

function useNow() {
  const [now, setNow] = useState(new Date());
  useEffect(() => {
    const t = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(t);
  }, []);
  return now;
}

function pad(n: number) {
  return String(n).padStart(2, "0");
}

function formatTime(date: Date) {
  return `${pad(date.getHours())}:${pad(date.getMinutes())}:${pad(date.getSeconds())}`;
}

function formatLogTime(iso: string) {
  const d = new Date(iso);
  return `${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

const AVATARS = [
  "bg-amber-900 text-amber-300",
  "bg-indigo-900 text-indigo-300",
  "bg-teal-900 text-teal-300",
  "bg-rose-900 text-rose-300",
  "bg-violet-900 text-violet-300",
];

export default function ClockInPage() {
  const now = useNow();
  const [qrDataUrl, setQrDataUrl] = useState<string>("");
  const [remaining, setRemaining] = useState(30);
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [todayCount, setTodayCount] = useState(0);
  const tokenRef = useRef<string>("");

  const fetchToken = useCallback(async () => {
    try {
      const res = await fetch("/api/timeclock/token");
      const { token, remaining: rem } = await res.json();
      tokenRef.current = token;
      setRemaining(rem);
      const origin = window.location.origin;
      const url = await QRCode.toDataURL(`${origin}/checkin/${token}`, {
        width: 280,
        margin: 2,
        color: { dark: "#0F172A", light: "#FFFFFF" },
        errorCorrectionLevel: "M",
      });
      setQrDataUrl(url);
    } catch {
      // retry on next tick
    }
  }, []);

  const fetchLogs = useCallback(async () => {
    try {
      const res = await fetch("/api/timeclock/logs");
      const { logs: data } = await res.json();
      setLogs(data ?? []);
      const inCount = (data ?? []).filter((l: LogEntry) => l.type === "in").length;
      setTodayCount(inCount);
    } catch {
      // silent
    }
  }, []);

  // ดึง token ครั้งแรก และ refresh ทุก 30 วิ
  useEffect(() => {
    fetchToken();
    fetchLogs();
    const tokenInterval = setInterval(fetchToken, 30_000);
    const logsInterval = setInterval(fetchLogs, 5_000);
    return () => {
      clearInterval(tokenInterval);
      clearInterval(logsInterval);
    };
  }, [fetchToken, fetchLogs]);

  // countdown ทุกวินาที
  useEffect(() => {
    const t = setInterval(() => {
      setRemaining((r) => {
        if (r <= 1) {
          fetchToken();
          return 30;
        }
        return r - 1;
      });
    }, 1_000);
    return () => clearInterval(t);
  }, [fetchToken]);

  const pct = Math.round((remaining / 30) * 100);

  const dateStr = now.toLocaleDateString("th-TH", {
    weekday: "long", year: "numeric", month: "long", day: "numeric",
  });

  return (
    <div className="min-h-screen bg-[#0A0F1E] flex flex-col select-none">
      {/* Header */}
      <header className="flex items-center justify-between px-8 py-4 border-b border-[#1E293B]">
        <div className="flex items-center gap-3">
          <div className="w-2.5 h-2.5 rounded-full bg-amber-500" />
          <span className="text-white font-medium tracking-wide">WINX Studio — ระบบลงเวลา</span>
        </div>
        <div className="text-right">
          <p className="text-white font-mono text-2xl font-medium tabular-nums">
            {formatTime(now)}
          </p>
          <p className="text-slate-500 text-xs mt-0.5">{dateStr}</p>
        </div>
      </header>

      {/* Body */}
      <main className="flex flex-1 overflow-hidden">
        {/* QR Section */}
        <div className="flex-1 flex flex-col items-center justify-center gap-6 p-8">
          <p className="text-slate-500 text-xs tracking-[3px] uppercase">สแกน QR เพื่อลงเวลา</p>

          {/* QR Frame */}
          <div className="rounded-2xl bg-white p-4 shadow-[0_0_60px_rgba(217,119,6,0.15)]">
            {qrDataUrl ? (
              <img src={qrDataUrl} alt="QR Code สำหรับลงเวลา" width={220} height={220} />
            ) : (
              <div className="w-[220px] h-[220px] flex items-center justify-center">
                <div className="w-8 h-8 border-2 border-amber-500 border-t-transparent rounded-full animate-spin" />
              </div>
            )}
          </div>

          {/* Countdown */}
          <div className="flex flex-col items-center gap-2 w-[220px]">
            <div className="w-full h-1 bg-[#1E293B] rounded-full overflow-hidden">
              <div
                className="h-full bg-amber-500 rounded-full transition-all duration-1000 ease-linear"
                style={{ width: `${pct}%` }}
              />
            </div>
            <p className="text-slate-500 text-xs">
              เปลี่ยน QR ใน{" "}
              <span className="text-amber-400 font-medium tabular-nums">{remaining}</span>{" "}
              วินาที
            </p>
          </div>

          <p className="text-slate-700 text-xs text-center max-w-[220px]">
            เปิดกล้องมือถือสแกน QR นี้เพื่อเช็คอิน/เช็คเอาท์
          </p>
        </div>

        {/* Sidebar — recent check-ins */}
        <aside className="w-72 border-l border-[#1E293B] bg-[#0D1628] flex flex-col p-5">
          <p className="text-slate-600 text-[10px] tracking-[2px] uppercase mb-4">ลงเวลาล่าสุด</p>
          <div className="flex flex-col gap-2 overflow-y-auto flex-1">
            {logs.length === 0 && (
              <p className="text-slate-700 text-xs text-center mt-8">ยังไม่มีรายการวันนี้</p>
            )}
            {logs.map((log, i) => {
              const initials = log.employees?.name?.slice(0, 2) ?? "?";
              const colorClass = AVATARS[i % AVATARS.length];
              return (
                <div
                  key={log.id}
                  className="flex items-center gap-2.5 bg-[#0F172A] rounded-xl border border-[#1E293B] px-3 py-2.5"
                >
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-medium shrink-0 ${colorClass}`}>
                    {initials}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-slate-200 text-xs font-medium truncate">
                      {log.employees?.name ?? "—"}
                    </p>
                    <p className="text-slate-600 text-[10px]">{formatLogTime(log.timestamp)}</p>
                  </div>
                  <span className={`text-[9px] px-2 py-0.5 rounded-full ${
                    log.type === "in"
                      ? "bg-emerald-950 text-emerald-400"
                      : "bg-indigo-950 text-indigo-400"
                  }`}>
                    {log.type === "in" ? "เข้า" : "ออก"}
                  </span>
                </div>
              );
            })}
          </div>
        </aside>
      </main>

      {/* Footer */}
      <footer className="flex items-center justify-between px-8 py-3 border-t border-[#1E293B]">
        <div className="flex items-center gap-5">
          <div className="flex items-center gap-2 text-xs text-slate-600">
            <div className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
            วันนี้เข้างาน{" "}
            <span className="text-slate-300 ml-1 font-medium">{todayCount} คน</span>
          </div>
        </div>
        <p className="text-slate-700 text-xs">GPS เปิดใช้งาน · รัศมี 100 เมตร</p>
      </footer>
    </div>
  );
}
