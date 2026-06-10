"use client";

import { useState, useCallback, useEffect } from "react";
import { useRouter } from "next/navigation";
import { setSession, getSession } from "@/lib/auth";
import { Delete } from "lucide-react";
import { cn } from "@/lib/utils";

const PIN_LENGTH = 6;

export default function LoginPage() {
  const [pin, setPin] = useState("");
  const [error, setError] = useState("");
  const [shake, setShake] = useState(false);
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  useEffect(() => {
    if (getSession()) router.replace("/");
  }, [router]);

  const submit = useCallback(async (fullPin: string) => {
    setLoading(true);
    setError("");
    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ pin: fullPin }),
      });
      const json = await res.json();
      if (!res.ok) {
        setError(json.error ?? "PIN ไม่ถูกต้อง");
        setShake(true);
        setPin("");
        setTimeout(() => setShake(false), 500);
      } else {
        setSession(json.user);
        router.replace("/");
      }
    } catch {
      setError("เกิดข้อผิดพลาด กรุณาลองใหม่");
      setPin("");
    } finally {
      setLoading(false);
    }
  }, [router]);

  const press = useCallback((digit: string) => {
    if (loading) return;
    setError("");
    setPin((prev) => {
      const next = prev.length < PIN_LENGTH ? prev + digit : prev;
      if (next.length === PIN_LENGTH) {
        setTimeout(() => submit(next), 80);
      }
      return next;
    });
  }, [loading, submit]);

  const del = useCallback(() => {
    if (loading) return;
    setError("");
    setPin((prev) => prev.slice(0, -1));
  }, [loading]);

  const keys = ["1","2","3","4","5","6","7","8","9","","0","⌫"];

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-background px-4">
      {/* Logo */}
      <div className="mb-10 flex flex-col items-center gap-3">
        <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-accent text-accent-foreground font-black text-2xl shadow-lg">
          W
        </div>
        <div className="text-center">
          <div className="text-lg font-bold tracking-wide">WINX STUDIO</div>
          <div className="text-xs uppercase tracking-[0.18em] text-muted-2">Back Office</div>
        </div>
      </div>

      {/* PIN dots */}
      <div className={cn("mb-2 flex gap-3", shake && "animate-shake")}>
        {Array.from({ length: PIN_LENGTH }).map((_, i) => (
          <div
            key={i}
            className={cn(
              "h-3.5 w-3.5 rounded-full border-2 transition-all duration-150",
              i < pin.length
                ? "border-accent bg-accent scale-110"
                : "border-border bg-transparent"
            )}
          />
        ))}
      </div>

      {/* Error */}
      <div className="mb-6 h-5 text-center text-sm text-red-500">
        {error}
      </div>

      {/* Keypad */}
      <div className="grid grid-cols-3 gap-3 w-64">
        {keys.map((k, i) => {
          if (k === "") return <div key={i} />;
          return (
            <button
              key={i}
              onClick={() => k === "⌫" ? del() : press(k)}
              disabled={loading}
              className={cn(
                "flex h-16 w-full items-center justify-center rounded-2xl text-xl font-semibold transition-all duration-100 select-none active:scale-95",
                k === "⌫"
                  ? "text-muted hover:bg-surface-2"
                  : "bg-surface border border-border hover:bg-surface-2 hover:border-accent/40 shadow-sm"
              )}
            >
              {k === "⌫" ? <Delete className="h-5 w-5" /> : k}
            </button>
          );
        })}
      </div>

      <p className="mt-10 text-xs text-muted-2">ใส่ PIN 6 หลักเพื่อเข้าใช้งาน</p>
    </div>
  );
}
