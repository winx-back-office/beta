"use client";

import { useState, useEffect, useCallback } from "react";
import { useParams } from "next/navigation";
import { CheckCircle, MapPin, ArrowLeft, Fingerprint, Delete } from "lucide-react";

type Step = "pin" | "gps" | "success" | "error";

interface Result {
  type: "in" | "out";
  employee: string;
  timestamp: string;
}

function pad(n: number) {
  return String(n).padStart(2, "0");
}
function formatTime(d: Date) {
  return `${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`;
}

const MAX_ATTEMPTS = 3;
const LOCKOUT_SECONDS = 30;

export default function CheckinPage() {
  const { token } = useParams<{ token: string }>();
  const [step, setStep] = useState<Step>("pin");
  const [pin, setPin] = useState<number[]>([]);
  const [errorMsg, setErrorMsg] = useState("");
  const [attempts, setAttempts] = useState(0);
  const [lockedUntil, setLockedUntil] = useState<Date | null>(null);
  const [lockCountdown, setLockCountdown] = useState(0);
  const [coords, setCoords] = useState<{ lat: number; lng: number } | null>(null);
  const [gpsStatus, setGpsStatus] = useState<"checking" | "ok" | "denied">("checking");
  const [distanceM, setDistanceM] = useState<number | null>(null);
  const [result, setResult] = useState<Result | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [now, setNow] = useState(new Date());

  useEffect(() => {
    const t = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(t);
  }, []);

  // lockout countdown
  useEffect(() => {
    if (!lockedUntil) return;
    const t = setInterval(() => {
      const diff = Math.ceil((lockedUntil.getTime() - Date.now()) / 1000);
      if (diff <= 0) {
        setLockedUntil(null);
        setLockCountdown(0);
        setAttempts(0);
        setPin([]);
        setErrorMsg("");
      } else {
        setLockCountdown(diff);
      }
    }, 1000);
    return () => clearInterval(t);
  }, [lockedUntil]);

  const pressKey = (n: number) => {
    if (lockedUntil || pin.length >= 6) return;
    setErrorMsg("");
    const next = [...pin, n];
    setPin(next);
    if (next.length >= 4) {
      verifyPin(next);
    }
  };

  const deleteKey = () => {
    if (lockedUntil) return;
    setPin((p) => p.slice(0, -1));
    setErrorMsg("");
  };

  const verifyPin = useCallback(async (digits: number[]) => {
    const pinStr = digits.join("");
    // เรียก GPS พร้อมกันเลย (ไม่รอ step แยก)
    let lat: number | undefined;
    let lng: number | undefined;
    try {
      const pos = await new Promise<GeolocationPosition>((res, rej) =>
        navigator.geolocation.getCurrentPosition(res, rej, { timeout: 5000 })
      );
      lat = pos.coords.latitude;
      lng = pos.coords.longitude;
      setCoords({ lat, lng });
    } catch {
      // GPS optional — server ยังรับได้ถ้า origin ไม่ได้ตั้งค่า
    }

    setStep("gps");
    setSubmitting(true);

    const res = await fetch("/api/timeclock/checkin", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ token, pin: pinStr, lat, lng }),
    });
    const data = await res.json();
    setSubmitting(false);

    if (!res.ok) {
      if (res.status === 401) {
        const newAttempts = attempts + 1;
        setAttempts(newAttempts);
        if (newAttempts >= MAX_ATTEMPTS) {
          const lockUntil = new Date(Date.now() + LOCKOUT_SECONDS * 1000);
          setLockedUntil(lockUntil);
          setLockCountdown(LOCKOUT_SECONDS);
          setErrorMsg(`ลองผิดเกิน ${MAX_ATTEMPTS} ครั้ง ล็อค ${LOCKOUT_SECONDS} วินาที`);
        } else {
          setErrorMsg(`PIN ไม่ถูกต้อง เหลือ ${MAX_ATTEMPTS - newAttempts} ครั้ง`);
        }
        setPin([]);
        setStep("pin");
      } else if (res.status === 403) {
        setGpsStatus("denied");
        setDistanceM(null);
        setErrorMsg(data.error ?? "อยู่นอกพื้นที่ทำงาน");
        setStep("error");
      } else {
        setErrorMsg(data.error ?? "เกิดข้อผิดพลาด");
        setPin([]);
        setStep("pin");
      }
      return;
    }

    setGpsStatus("ok");
    setResult({ type: data.type, employee: data.employee, timestamp: new Date().toISOString() });
    setStep("success");
  }, [token, attempts]);

  // GPS status เพื่อแสดง UI ขณะรอ
  useEffect(() => {
    if (step !== "gps") return;
    navigator.geolocation?.getCurrentPosition(
      (pos) => {
        setCoords({ lat: pos.coords.latitude, lng: pos.coords.longitude });
        setGpsStatus("ok");
      },
      () => setGpsStatus("denied"),
      { timeout: 5000 }
    );
  }, [step]);

  const progressDots = ["pin", "gps", "success"].map((s, i) => {
    const idx = ["pin", "gps", "success", "error"].indexOf(step);
    return idx > i ? "done" : idx === i ? "active" : "idle";
  });

  // ===== Render helpers =====

  const PinDots = () => (
    <div className="flex gap-3 justify-center my-4">
      {Array.from({ length: Math.max(pin.length, 4) }, (_, i) => (
        <div
          key={i}
          className={`w-3.5 h-3.5 rounded-full border transition-all duration-150 ${
            i < pin.length
              ? "bg-amber-500 border-amber-500"
              : "border-slate-700 bg-transparent"
          }`}
        />
      ))}
    </div>
  );

  const Numpad = () => (
    <div className="grid grid-cols-3 gap-3">
      {[1,2,3,4,5,6,7,8,9].map((n) => (
        <button
          key={n}
          onClick={() => pressKey(n)}
          disabled={!!lockedUntil}
          className="h-14 rounded-xl bg-[#0D1628] border border-[#1E293B] text-slate-200 text-lg font-medium
            active:scale-95 active:bg-[#1E293B] transition-all disabled:opacity-40 disabled:cursor-not-allowed"
        >
          {n}
        </button>
      ))}
      <div />
      <button
        onClick={() => pressKey(0)}
        disabled={!!lockedUntil}
        className="h-14 rounded-xl bg-[#0D1628] border border-[#1E293B] text-slate-200 text-lg font-medium
          active:scale-95 active:bg-[#1E293B] transition-all disabled:opacity-40 disabled:cursor-not-allowed"
      >
        0
      </button>
      <button
        onClick={deleteKey}
        disabled={!!lockedUntil}
        className="h-14 rounded-xl bg-[#0D1628] border border-[#1E293B] text-slate-500
          active:scale-95 active:bg-[#1E293B] transition-all flex items-center justify-center
          disabled:opacity-40 disabled:cursor-not-allowed"
        aria-label="ลบ"
      >
        <Delete className="w-5 h-5" />
      </button>
    </div>
  );

  const Progress = () => (
    <div className="flex gap-1.5 justify-center mb-5">
      {progressDots.map((s, i) => (
        <div
          key={i}
          className={`h-1 w-6 rounded-full transition-all duration-300 ${
            s === "done" ? "bg-amber-500" : s === "active" ? "bg-amber-400" : "bg-[#1E293B]"
          }`}
        />
      ))}
    </div>
  );

  // ===== Step: PIN =====
  if (step === "pin") {
    return (
      <div className="min-h-dvh bg-[#0A0F1E] flex flex-col p-5">
        <div className="flex items-center justify-between mb-5">
          <button
            onClick={() => history.back()}
            className="w-9 h-9 rounded-xl bg-[#1E293B] flex items-center justify-center text-slate-400"
            aria-label="ย้อนกลับ"
          >
            <ArrowLeft className="w-4 h-4" />
          </button>
          <span className="text-slate-200 text-sm font-medium">ยืนยันตัวตน</span>
          <span className="text-slate-600 text-xs">1/3</span>
        </div>

        <Progress />

        {/* QR badge */}
        <div className="bg-[#0D1628] border border-[#1E293B] rounded-xl p-3 flex items-center gap-3 mb-6">
          <div className="w-10 h-10 rounded-lg bg-amber-950 flex items-center justify-center shrink-0">
            <Fingerprint className="w-5 h-5 text-amber-400" />
          </div>
          <div>
            <p className="text-slate-200 text-xs font-medium">QR สแกนสำเร็จ</p>
            <p className="text-slate-600 text-[10px]">{formatTime(now)} · WINX Studio</p>
          </div>
        </div>

        <p className="text-slate-500 text-xs text-center mb-1">กรอก PIN ของคุณ</p>
        <PinDots />

        {errorMsg && (
          <p className="text-red-400 text-xs text-center mb-3">
            {lockedUntil ? `${errorMsg} (${lockCountdown} วิ)` : errorMsg}
          </p>
        )}
        {!errorMsg && <div className="mb-3 h-4" />}

        <Numpad />
      </div>
    );
  }

  // ===== Step: GPS / Submitting =====
  if (step === "gps") {
    return (
      <div className="min-h-dvh bg-[#0A0F1E] flex flex-col p-5">
        <div className="flex items-center justify-between mb-5">
          <div className="w-9 h-9" />
          <span className="text-slate-200 text-sm font-medium">ตรวจสอบตำแหน่ง</span>
          <span className="text-slate-600 text-xs">2/3</span>
        </div>

        <Progress />

        <div className="flex-1 flex flex-col items-center justify-center gap-6">
          <div className="w-20 h-20 rounded-full border-2 border-amber-500/30 flex items-center justify-center">
            <div className="w-14 h-14 rounded-full border-2 border-amber-500/50 flex items-center justify-center">
              {submitting ? (
                <div className="w-6 h-6 border-2 border-amber-500 border-t-transparent rounded-full animate-spin" />
              ) : (
                <MapPin className="w-6 h-6 text-amber-400" />
              )}
            </div>
          </div>
          <div className="text-center">
            <p className="text-slate-200 text-sm font-medium mb-1">
              {submitting ? "กำลังบันทึก..." : "ตรวจสอบ GPS"}
            </p>
            <p className="text-slate-600 text-xs">
              {coords
                ? `${coords.lat.toFixed(5)}, ${coords.lng.toFixed(5)}`
                : "กำลังหาตำแหน่ง..."}
            </p>
          </div>
        </div>
      </div>
    );
  }

  // ===== Step: Success =====
  if (step === "success" && result) {
    const ts = new Date(result.timestamp);
    const isIn = result.type === "in";
    return (
      <div className="min-h-dvh bg-[#0A0F1E] flex flex-col p-5">
        <div className="flex items-center justify-between mb-5">
          <div className="w-9 h-9" />
          <span className="text-slate-200 text-sm font-medium">
            {isIn ? "เข้างานสำเร็จ" : "ออกงานสำเร็จ"}
          </span>
          <span className="text-slate-600 text-xs">3/3</span>
        </div>

        <Progress />

        <div className="flex-1 flex flex-col items-center justify-center gap-4">
          <div className="w-18 h-18 rounded-full border-2 border-emerald-600 bg-emerald-950 flex items-center justify-center w-20 h-20">
            <CheckCircle className="w-9 h-9 text-emerald-400" />
          </div>

          <div className="text-center">
            <p className="text-slate-200 text-base font-medium">{result.employee}</p>
            <p className="text-amber-400 text-3xl font-semibold tabular-nums mt-3">
              {formatTime(ts)}
            </p>
            <p className="text-slate-600 text-xs mt-1">
              {ts.toLocaleDateString("th-TH", { weekday: "long", year: "numeric", month: "long", day: "numeric" })}
            </p>
          </div>

          <div className="w-full bg-[#0D1628] border border-[#1E293B] rounded-xl p-4 mt-2">
            <div className="flex justify-between text-xs py-1.5">
              <span className="text-slate-500">ประเภท</span>
              <span className={isIn ? "text-emerald-400" : "text-indigo-400"}>
                {isIn ? "เข้างาน" : "ออกงาน"}
              </span>
            </div>
            {coords && (
              <div className="flex justify-between text-xs py-1.5">
                <span className="text-slate-500 flex items-center gap-1">
                  <MapPin className="w-3 h-3" /> GPS
                </span>
                <span className="text-slate-300 font-mono">
                  {distanceM !== null ? `${distanceM} ม.` : "บันทึกแล้ว"}
                </span>
              </div>
            )}
          </div>
        </div>

        <button
          onClick={() => window.close()}
          className="w-full py-3 rounded-xl border border-[#1E293B] text-slate-600 text-sm mt-4"
        >
          ปิดหน้าต่าง
        </button>
      </div>
    );
  }

  // ===== Step: Error (GPS out of range) =====
  if (step === "error") {
    return (
      <div className="min-h-dvh bg-[#0A0F1E] flex flex-col p-5">
        <div className="flex items-center justify-between mb-5">
          <button
            onClick={() => { setStep("pin"); setPin([]); setErrorMsg(""); }}
            className="w-9 h-9 rounded-xl bg-[#1E293B] flex items-center justify-center text-slate-400"
            aria-label="ย้อนกลับ"
          >
            <ArrowLeft className="w-4 h-4" />
          </button>
          <span className="text-slate-200 text-sm font-medium">ไม่สามารถลงเวลาได้</span>
          <div className="w-9" />
        </div>

        <div className="flex-1 flex flex-col items-center justify-center gap-5">
          <div className="w-20 h-20 rounded-full border-2 border-red-700 bg-red-950 flex items-center justify-center">
            <MapPin className="w-9 h-9 text-red-400" />
          </div>
          <div className="text-center">
            <p className="text-slate-200 text-sm font-medium mb-2">อยู่นอกพื้นที่ทำงาน</p>
            <p className="text-slate-500 text-xs max-w-xs">{errorMsg}</p>
          </div>
        </div>

        <button
          onClick={() => { setStep("pin"); setPin([]); setErrorMsg(""); }}
          className="w-full py-3 rounded-xl bg-amber-600 text-white text-sm font-medium mt-4"
        >
          ลองอีกครั้ง
        </button>
      </div>
    );
  }

  return null;
}
