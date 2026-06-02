"use client";

import { useState } from "react";
import { PageHeader, Button, Badge } from "@/components/ui";
import { CUSTOMER_TYPE_LABEL, type Order } from "@/lib/types";
import { ArrowLeft, FileSpreadsheet, Loader2, CheckCircle2, AlertCircle, Upload } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";

const inputCls =
  "w-full rounded-[var(--radius-md)] border border-border bg-surface-2 px-3 py-2 text-sm text-foreground placeholder:text-muted-2 focus:border-accent focus:outline-none transition-colors";

type ImportRow = Partial<Order>;

export default function ImportSheetsPage() {
  const router = useRouter();
  const [url, setUrl] = useState("");
  const [fetching, setFetching] = useState(false);
  const [rows, setRows] = useState<ImportRow[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [importing, setImporting] = useState(false);
  const [done, setDone] = useState(false);
  const [importedCount, setImportedCount] = useState(0);

  async function handleFetch(e: React.FormEvent) {
    e.preventDefault();
    setFetching(true);
    setError(null);
    setRows(null);

    const res = await fetch(`/api/import/sheets?url=${encodeURIComponent(url)}`);
    const data = await res.json();

    if (!res.ok || data.error) {
      setError(data.error ?? "เกิดข้อผิดพลาด");
    } else {
      setRows(data.rows);
    }
    setFetching(false);
  }

  async function handleImport() {
    if (!rows?.length) return;
    setImporting(true);
    let count = 0;

    for (const row of rows) {
      const res = await fetch("/api/orders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(row),
      });
      if (res.ok) count++;
    }

    setImportedCount(count);
    setImporting(false);
    setDone(true);
  }

  if (done) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4 text-center">
        <div className="flex h-16 w-16 items-center justify-center rounded-full bg-accent-soft">
          <CheckCircle2 className="h-8 w-8 text-accent" />
        </div>
        <h2 className="text-xl font-bold">นำเข้าสำเร็จ</h2>
        <p className="text-muted">สร้าง {importedCount} ออเดอร์เรียบร้อยแล้ว</p>
        <div className="flex gap-2 mt-2">
          <Button variant="secondary" onClick={() => { setDone(false); setRows(null); setUrl(""); }}>
            นำเข้าเพิ่มเติม
          </Button>
          <Button onClick={() => router.push("/orders")}>
            ดูรายการออเดอร์
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div>
      <PageHeader
        title="นำเข้าจาก Google Sheets"
        subtitle="วาง URL ของ Google Sheets สาธารณะเพื่อนำเข้าออเดอร์"
        action={
          <Link href="/orders">
            <Button variant="secondary">
              <ArrowLeft className="h-4 w-4" />
              กลับ
            </Button>
          </Link>
        }
      />

      <div className="p-8 max-w-4xl">
        {/* Step 1: URL input */}
        <div className="rounded-[var(--radius-lg)] border border-border bg-surface p-6 mb-6">
          <div className="flex items-center gap-3 mb-4">
            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-accent text-black text-sm font-bold">1</div>
            <h2 className="font-semibold">วาง URL ของ Google Sheets</h2>
          </div>

          <form onSubmit={handleFetch} className="flex gap-3">
            <input
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              placeholder="https://docs.google.com/spreadsheets/d/..."
              className={inputCls}
              required
            />
            <Button type="submit" disabled={fetching || !url.trim()}>
              {fetching ? <Loader2 className="h-4 w-4 animate-spin" /> : <FileSpreadsheet className="h-4 w-4" />}
              {fetching ? "กำลังดึง…" : "ดึงข้อมูล"}
            </Button>
          </form>

          {/* hint */}
          <p className="mt-3 text-xs text-muted">
            Sheet ต้องแชร์เป็น <span className="text-foreground font-medium">"Anyone with the link"</span> และหัวคอลัมน์ต้องตรงกับตารางสั่งผลิต
          </p>
        </div>

        {/* Error */}
        {error && (
          <div className="flex items-center gap-2 rounded-[var(--radius-md)] border border-danger/30 bg-danger/10 px-4 py-3 text-sm text-danger mb-6">
            <AlertCircle className="h-4 w-4 shrink-0" />
            {error}
          </div>
        )}

        {/* Step 2: Preview */}
        {rows !== null && (
          <div className="rounded-[var(--radius-lg)] border border-border bg-surface p-6">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-3">
                <div className="flex h-8 w-8 items-center justify-center rounded-full bg-accent text-black text-sm font-bold">2</div>
                <h2 className="font-semibold">
                  ตรวจสอบข้อมูล{" "}
                  <span className="text-muted font-normal">({rows.length} รายการ)</span>
                </h2>
              </div>
              <Button onClick={handleImport} disabled={importing || rows.length === 0}>
                {importing ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />}
                {importing ? `กำลังนำเข้า…` : `นำเข้า ${rows.length} ออเดอร์`}
              </Button>
            </div>

            {rows.length === 0 ? (
              <p className="text-sm text-muted text-center py-8">ไม่พบข้อมูลในช่อง "ชื่อทีม" — ตรวจสอบหัวคอลัมน์ใน Sheet</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm border-collapse">
                  <thead>
                    <tr className="border-b border-border text-left text-xs text-muted">
                      <th className="py-2 pr-4 font-medium">ชื่อทีม</th>
                      <th className="py-2 pr-4 font-medium">ประเภท</th>
                      <th className="py-2 pr-4 font-medium">ประเภทเสื้อ</th>
                      <th className="py-2 pr-4 font-medium">ผ้า</th>
                      <th className="py-2 pr-4 font-medium">คอ</th>
                      <th className="py-2 pr-4 font-medium">จำนวน</th>
                      <th className="py-2 pr-4 font-medium">ราคาผลิต</th>
                      <th className="py-2 pr-4 font-medium">ค่าจัดส่ง</th>
                      <th className="py-2 font-medium">มัดจำ</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {rows.map((r, i) => (
                      <tr key={i} className="hover:bg-surface-2">
                        <td className="py-2.5 pr-4 font-medium">{r.teamName ?? "—"}</td>
                        <td className="py-2.5 pr-4">
                          <Badge tone={r.type === "design" ? "info" : r.type === "produce" ? "purple" : "accent"}>
                            {r.type ? CUSTOMER_TYPE_LABEL[r.type] : "—"}
                          </Badge>
                        </td>
                        <td className="py-2.5 pr-4 text-muted">{r.shirtType ?? <span className="text-muted-2">—</span>}</td>
                        <td className="py-2.5 pr-4 text-muted">{r.fabricType ?? <span className="text-muted-2">—</span>}</td>
                        <td className="py-2.5 pr-4 text-muted">{r.collarType ?? <span className="text-muted-2">—</span>}</td>
                        <td className="py-2.5 pr-4">{r.quantity ?? <span className="text-muted-2">—</span>}</td>
                        <td className="py-2.5 pr-4">{r.productionPrice != null ? `฿${r.productionPrice.toLocaleString()}` : <span className="text-muted-2">—</span>}</td>
                        <td className="py-2.5 pr-4">{r.shipping != null ? `฿${r.shipping.toLocaleString()}` : <span className="text-muted-2">—</span>}</td>
                        <td className="py-2.5">{r.deposit != null ? `฿${r.deposit.toLocaleString()}` : "฿0"}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
