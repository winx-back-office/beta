"use client";

import { useEffect, useRef, useState } from "react";
import { useParams } from "next/navigation";

interface AddressResult {
  district: string;
  amphoe: string;
  province: string;
  zipcode: string;
}

export default function CustomerAddressPage() {
  const { id } = useParams<{ id: string }>();

  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [address1, setAddress1] = useState("");
  const [district, setDistrict] = useState(""); // ตำบล/แขวง
  const [amphoe, setAmphoe] = useState("");     // อำเภอ/เขต
  const [province, setProvince] = useState(""); // จังหวัด
  const [postal, setPostal] = useState("");

  const [suggestions, setSuggestions] = useState<AddressResult[]>([]);
  const [showSug, setShowSug] = useState(false);
  const [loading, setLoading] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState("");
  const [teamName, setTeamName] = useState("");

  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const sugRef = useRef<HTMLDivElement>(null);

  // load order team name for display
  useEffect(() => {
    fetch(`/api/orders/${id}`)
      .then(r => r.json())
      .then(o => { if (o.teamName) setTeamName(o.teamName); })
      .catch(() => {});
  }, [id]);

  // close suggestions on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (sugRef.current && !sugRef.current.contains(e.target as Node)) {
        setShowSug(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const searchAddress = (q: string) => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    if (q.length < 2) { setSuggestions([]); setShowSug(false); return; }
    debounceRef.current = setTimeout(async () => {
      const res = await fetch(`/api/thai-address?q=${encodeURIComponent(q)}`);
      const data = await res.json();
      setSuggestions(data);
      setShowSug(data.length > 0);
    }, 250);
  };

  const selectSuggestion = (s: AddressResult) => {
    setDistrict(s.district);
    setAmphoe(s.amphoe);
    setProvince(s.province);
    setPostal(s.zipcode);
    setSuggestions([]);
    setShowSug(false);
  };

  const handleSubmit = async () => {
    if (!name.trim()) { setError("กรุณากรอกชื่อผู้รับ"); return; }
    if (!phone.trim()) { setError("กรุณากรอกเบอร์โทร"); return; }
    if (!address1.trim()) { setError("กรุณากรอกที่อยู่บรรทัด 1"); return; }
    if (!district.trim() || !province.trim()) { setError("กรุณาเลือกตำบล/แขวง และจังหวัด"); return; }
    setError("");
    setLoading(true);
    try {
      const address2 = [district, amphoe, province].filter(Boolean).join(" ");
      const res = await fetch(`/api/orders/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          deliveryAddress: { name, phone, address1, address2, postal },
        }),
      });
      if (!res.ok) throw new Error();
      setSubmitted(true);
    } catch {
      setError("เกิดข้อผิดพลาด กรุณาลองใหม่");
    } finally {
      setLoading(false);
    }
  };

  if (submitted) {
    return (
      <div className="min-h-screen bg-[#0f1117] text-white flex items-center justify-center p-4">
        <div className="w-full max-w-md text-center space-y-4">
          <div className="text-5xl">✅</div>
          <div className="text-xl font-bold text-green-300">ส่งที่อยู่เรียบร้อยแล้ว!</div>
          <div className="text-sm text-white/50">ทีมงาน WINX STUDIO ได้รับที่อยู่ของคุณแล้ว</div>
          {teamName && <div className="text-xs text-white/30">ออเดอร์: {teamName}</div>}
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#0f1117] text-white">
      {/* Header */}
      <div className="border-b border-white/10 bg-[#15171e] px-6 py-4 flex items-center gap-3">
        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-[#6366f1] font-black text-lg">W</div>
        <div>
          <div className="font-bold tracking-wide text-sm">WINX STUDIO</div>
          <div className="text-[10px] uppercase tracking-widest text-white/40">กรอกที่อยู่จัดส่ง</div>
        </div>
      </div>

      <div className="mx-auto max-w-md px-4 py-8 space-y-5">
        {teamName && (
          <div className="rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-white/60">
            ออเดอร์: <span className="text-white font-semibold">{teamName}</span>
          </div>
        )}

        <div className="rounded-2xl border border-white/10 bg-white/5 px-5 py-5 space-y-4">
          {/* ชื่อผู้รับ */}
          <Field label="ชื่อ-นามสกุลผู้รับ *">
            <input
              className="w-full rounded-xl bg-white/10 border border-white/10 px-4 py-3 text-sm text-white placeholder:text-white/30 focus:outline-none focus:border-[#818cf8]"
              placeholder="ชื่อ นามสกุล"
              value={name}
              onChange={e => setName(e.target.value)}
            />
          </Field>

          {/* เบอร์โทร */}
          <Field label="เบอร์โทรศัพท์ *">
            <input
              type="tel"
              className="w-full rounded-xl bg-white/10 border border-white/10 px-4 py-3 text-sm text-white placeholder:text-white/30 focus:outline-none focus:border-[#818cf8]"
              placeholder="08x-xxx-xxxx"
              value={phone}
              onChange={e => setPhone(e.target.value)}
            />
          </Field>

          {/* บ้านเลขที่ */}
          <Field label="บ้านเลขที่ / ซอย / ถนน *">
            <input
              className="w-full rounded-xl bg-white/10 border border-white/10 px-4 py-3 text-sm text-white placeholder:text-white/30 focus:outline-none focus:border-[#818cf8]"
              placeholder="เช่น 123/4 ซ.สุขุมวิท 5"
              value={address1}
              onChange={e => setAddress1(e.target.value)}
            />
          </Field>

          {/* ตำบล/แขวง — autocomplete */}
          <Field label="ตำบล / แขวง *">
            <div className="relative" ref={sugRef}>
              <input
                className="w-full rounded-xl bg-white/10 border border-white/10 px-4 py-3 text-sm text-white placeholder:text-white/30 focus:outline-none focus:border-[#818cf8]"
                placeholder="พิมพ์ชื่อตำบล/แขวง หรือ อำเภอ"
                value={district}
                onChange={e => {
                  setDistrict(e.target.value);
                  setAmphoe(""); setProvince(""); setPostal("");
                  searchAddress(e.target.value);
                }}
                onFocus={() => suggestions.length > 0 && setShowSug(true)}
                autoComplete="off"
              />
              {showSug && (
                <div className="absolute z-50 mt-1 w-full rounded-xl border border-white/10 bg-[#1e2030] shadow-xl overflow-hidden max-h-60 overflow-y-auto">
                  {suggestions.map((s, i) => (
                    <button
                      key={i}
                      type="button"
                      onMouseDown={() => selectSuggestion(s)}
                      className="w-full text-left px-4 py-3 text-sm hover:bg-white/10 border-b border-white/5 last:border-0"
                    >
                      <span className="text-white font-medium">{s.district}</span>
                      <span className="text-white/50 ml-1">» {s.amphoe} » {s.province}</span>
                      <span className="ml-2 text-[#818cf8] font-mono text-xs">{s.zipcode}</span>
                    </button>
                  ))}
                </div>
              )}
            </div>
          </Field>

          {/* อำเภอ / จังหวัด / รหัสไปรษณีย์ — auto-filled */}
          <div className="grid grid-cols-2 gap-3">
            <Field label="อำเภอ / เขต">
              <input
                className="w-full rounded-xl bg-white/10 border border-white/10 px-4 py-3 text-sm text-white placeholder:text-white/30 focus:outline-none focus:border-[#818cf8]"
                placeholder="กรอกหรือเลือกจากตำบล"
                value={amphoe}
                onChange={e => setAmphoe(e.target.value)}
              />
            </Field>
            <Field label="รหัสไปรษณีย์">
              <input
                className="w-full rounded-xl bg-white/10 border border-white/10 px-4 py-3 text-sm text-white placeholder:text-white/30 focus:outline-none focus:border-[#818cf8]"
                placeholder="5 หลัก"
                value={postal}
                onChange={e => setPostal(e.target.value)}
                maxLength={5}
              />
            </Field>
          </div>

          <Field label="จังหวัด">
            <input
              className="w-full rounded-xl bg-white/10 border border-white/10 px-4 py-3 text-sm text-white placeholder:text-white/30 focus:outline-none focus:border-[#818cf8]"
              placeholder="กรอกหรือเลือกจากตำบล"
              value={province}
              onChange={e => setProvince(e.target.value)}
            />
          </Field>

          {error && (
            <div className="text-sm text-red-400 font-medium">{error}</div>
          )}

          <button
            onClick={handleSubmit}
            disabled={loading}
            className="w-full rounded-xl bg-[#6366f1] py-4 text-base font-bold text-white transition-all active:scale-95 disabled:opacity-40"
          >
            {loading ? "กำลังบันทึก…" : "ยืนยันที่อยู่จัดส่ง →"}
          </button>
        </div>

        <p className="text-center text-xs text-white/25 px-4">
          ข้อมูลที่อยู่จะถูกส่งให้ทีมงาน WINX STUDIO เพื่อใช้ในการจัดส่งสินค้าเท่านั้น
        </p>
      </div>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-1.5">
      <label className="text-xs font-medium text-white/50">{label}</label>
      {children}
    </div>
  );
}
