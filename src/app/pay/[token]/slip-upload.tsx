"use client";

import { useState, useRef } from "react";

export function SlipUpload({ token }: { token: string }) {
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const onFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0] ?? null;
    setFile(f);
    if (f) {
      const reader = new FileReader();
      reader.onload = (ev) => setPreview(ev.target?.result as string);
      reader.readAsDataURL(f);
    } else {
      setPreview(null);
    }
  };

  const onSubmit = async () => {
    if (!file) return;
    setUploading(true);
    setError(null);
    try {
      const fd = new FormData();
      fd.append("slip", file);
      const res = await fetch(`/api/payment-requests/${token}/slip`, {
        method: "POST",
        body: fd,
      });
      if (!res.ok) throw new Error("อัปโหลดไม่สำเร็จ");
      setSuccess(true);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setUploading(false);
    }
  };

  if (success) {
    return (
      <div className="rounded-2xl border border-green-500/40 bg-green-500/10 px-6 py-8 text-center">
        <div className="text-4xl mb-3">✅</div>
        <div className="text-lg font-semibold text-green-400">ส่งหลักฐานเรียบร้อยแล้ว</div>
        <div className="mt-1 text-sm text-white/60">รอทีมงานตรวจสอบ</div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div
        className="relative cursor-pointer rounded-2xl border-2 border-dashed border-white/20 bg-white/5 p-6 text-center transition-colors hover:border-white/40 hover:bg-white/10"
        onClick={() => inputRef.current?.click()}
      >
        {preview ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={preview} alt="slip preview" className="mx-auto max-h-64 rounded-lg object-contain" />
        ) : (
          <div className="flex flex-col items-center gap-3 text-white/50">
            <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="text-white/50">
              <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
              <polyline points="17 8 12 3 7 8"/>
              <line x1="12" y1="3" x2="12" y2="15"/>
            </svg>
            <div className="text-sm">แตะเพื่ออัปโหลดสลิป</div>
          </div>
        )}
        <input
          ref={inputRef}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={onFileChange}
        />
      </div>

      {error && (
        <div className="rounded-xl bg-red-500/20 px-4 py-3 text-sm text-red-300">{error}</div>
      )}

      <button
        onClick={onSubmit}
        disabled={!file || uploading}
        className="w-full rounded-2xl bg-green-500 py-3.5 text-base font-bold text-white transition-opacity disabled:opacity-40 hover:bg-green-400"
      >
        {uploading ? "กำลังส่ง…" : "ยืนยันการโอน"}
      </button>
    </div>
  );
}
