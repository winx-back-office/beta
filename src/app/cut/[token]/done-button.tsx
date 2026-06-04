"use client";

import { useState } from "react";

export function DoneButton({
  jobId,
  defaultQuantity,
  defaultPatternPieces,
}: {
  jobId: string;
  defaultQuantity: number;
  defaultPatternPieces: number;
}) {
  const [quantity, setQuantity] = useState(defaultQuantity);
  const patternPieces = defaultPatternPieces;
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);
  const [selectedIssues, setSelectedIssues] = useState<string[]>([]);
  const [customNote, setCustomNote] = useState("");

  const ISSUES = ["มีงานเสีย", "ผ้าไม่พอ", "แพทเทิร์นหาย", "ตัดผิดไซส์"];

  const toggleIssue = (issue: string) => {
    setSelectedIssues((prev) =>
      prev.includes(issue) ? prev.filter((i) => i !== issue) : [...prev, issue]
    );
  };

  const noteValue = [
    ...selectedIssues,
    ...(customNote.trim() ? [customNote.trim()] : []),
  ].join(", ");

  const markDone = async () => {
    if (!confirm("ยืนยันว่าตัดงานเสร็จแล้วใช่ไหม?")) return;
    setLoading(true);
    try {
      await fetch(`/api/cutting-jobs/${jobId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          status: "done",
          quantity,
          patternPieces,
          completedAt: new Date().toISOString(),
          ...(noteValue ? { cutterNote: noteValue } : {}),
        }),
      });
      setDone(true);
    } catch {
      alert("เกิดข้อผิดพลาด กรุณาลองใหม่");
    } finally {
      setLoading(false);
    }
  };

  if (done) {
    return (
      <div className="rounded-2xl border border-green-500/30 bg-green-500/10 px-6 py-8 text-center space-y-2">
        <div className="text-4xl">✅</div>
        <div className="text-xl font-bold text-green-300">ส่งงานตัดเรียบร้อย!</div>
        <div className="text-sm text-white/50">งานถูกบันทึกเป็น "ตัดเสร็จแล้ว" แล้ว</div>
      </div>
    );
  }

  return (
    <div className="rounded-2xl border border-white/10 bg-white/5 px-5 py-5 space-y-4">
      <div className="text-sm font-semibold text-white/60 text-center">ตรวจสอบก่อนส่งงาน</div>

      {/* จำนวนตัว */}
      <div className="flex flex-col gap-1.5">
        <label className="text-xs text-white/40">จำนวนตัว</label>
        <input
          type="number"
          min={1}
          value={quantity}
          onChange={(e) => setQuantity(Number(e.target.value))}
          className="w-full rounded-xl bg-white/10 border border-white/10 px-3 py-3 text-center text-2xl font-bold text-white focus:outline-none focus:border-[#818cf8]"
        />
      </div>

      {/* ข้อผิดพลาด */}
      <div className="flex flex-col gap-2">
        <label className="text-xs text-white/40">ข้อผิดพลาด (ถ้ามี)</label>
        <div className="flex flex-wrap gap-2">
          {ISSUES.map((issue) => (
            <button
              key={issue}
              type="button"
              onClick={() => toggleIssue(issue)}
              className={`rounded-full px-3 py-1.5 text-xs font-medium transition-all ${
                selectedIssues.includes(issue)
                  ? "bg-red-500/80 text-white"
                  : "bg-white/10 text-white/60 hover:bg-white/20"
              }`}
            >
              {issue}
            </button>
          ))}
        </div>
        <textarea
          value={customNote}
          onChange={(e) => setCustomNote(e.target.value)}
          placeholder="ระบุเหตุผลเพิ่มเติม..."
          rows={2}
          className="w-full rounded-xl bg-white/10 border border-white/10 px-3 py-2 text-sm text-white placeholder:text-white/30 focus:outline-none focus:border-[#818cf8] resize-none"
        />
      </div>

      <button
        onClick={markDone}
        disabled={loading}
        className="w-full rounded-xl bg-green-500 py-4 text-base font-bold text-white transition-all active:scale-95 disabled:opacity-50"
      >
        {loading ? "กำลังบันทึก…" : "✅ ตัดงานเสร็จแล้ว — ส่งงาน"}
      </button>
    </div>
  );
}
