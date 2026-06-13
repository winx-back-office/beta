"use client";

import { useEffect, useState } from "react";
import { Card, Badge } from "@/components/ui";
import { Scissors } from "lucide-react";
import Link from "next/link";
import type { CuttingJob } from "@/app/api/cutting-jobs/route";

function formatDateTime(iso: string | null) {
  if (!iso) return "-";
  return new Date(iso).toLocaleString("th-TH", {
    day: "2-digit", month: "short",
    hour: "2-digit", minute: "2-digit",
  });
}

export function CuttingJobCard({ orderId }: { orderId: string }) {
  const [job, setJob] = useState<CuttingJob | null | undefined>(undefined);

  useEffect(() => {
    fetch("/api/cutting-jobs", { cache: "no-store" })
      .then((r) => r.json())
      .then((jobs: CuttingJob[]) => {
        const found = jobs.find((j) => j.orderId === orderId) ?? null;
        setJob(found);
      })
      .catch(() => setJob(null));
  }, [orderId]);

  if (job === undefined) return null;

  return (
    <Card className="p-5">
      <div className="mb-3 flex items-center gap-2 text-sm font-medium">
        <Scissors className="h-4 w-4 text-accent" />
        ใบงานตัดแพทเทิร์น
      </div>

      {!job ? (
        <div className="space-y-3">
          <p className="text-xs text-muted">ยังไม่มีใบงานตัดสำหรับออเดอร์นี้</p>
          <Link
            href="/cutting-jobs"
            className="inline-flex items-center gap-1 rounded-[var(--radius-md)] border border-border px-3 py-1.5 text-xs text-muted hover:bg-surface-2 hover:text-foreground transition-colors"
          >
            สร้างใบงาน →
          </Link>
        </div>
      ) : (
        <div className="space-y-3 text-sm">
          <div className="flex items-center gap-2">
            {job.status === "pending" && <Badge tone="neutral">✂️ รอตัด</Badge>}
            {job.status === "cutting" && <Badge tone="warn">✂️ กำลังตัด</Badge>}
            {job.status === "cut_done" && <Badge tone="info">✅ ตัดเสร็จ</Badge>}
            {job.status === "sewing" && <Badge tone="info">🪡 กำลังเย็บ</Badge>}
            {job.status === "done" && <Badge tone="success">✅ เสร็จสมบูรณ์</Badge>}
            <span className="text-xs text-muted font-mono">{job.id}</span>
          </div>

          <div className="grid grid-cols-2 gap-2 text-xs">
            <div>
              <div className="text-muted-2">จำนวนตัว</div>
              <div className="font-semibold text-base">{job.quantity}</div>
            </div>
            <div>
              <div className="text-muted-2">ชิ้นแพทเทิร์น</div>
              <div className="font-semibold text-base text-accent">{job.patternPieces}</div>
            </div>
          </div>

          {job.status === "cutting" && job.cutterName && (
            <div className="text-xs">
              <span className="text-muted">ช่าง: </span>
              <span className="font-medium">{job.cutterName}</span>
              <span className="text-muted ml-2">รับงาน {formatDateTime(job.startedAt)}</span>
            </div>
          )}

          {job.status === "done" && (
            <div className="text-xs space-y-0.5">
              {job.cutterName && (
                <div><span className="text-muted">ช่าง: </span><span className="font-medium">{job.cutterName}</span></div>
              )}
              {job.completedAt && (
                <div><span className="text-muted">ส่งงาน: </span>{formatDateTime(job.completedAt)}</div>
              )}
            </div>
          )}

          {job.printedAt && (
            <div className="text-xs text-muted">
              พิมพ์ใบตัด: {formatDateTime(job.printedAt)}
            </div>
          )}

          <Link
            href={`/cut/${job.token}`}
            target="_blank"
            className="inline-flex items-center gap-1 text-xs text-accent hover:underline"
          >
            เปิด QR ↗
          </Link>
        </div>
      )}
    </Card>
  );
}
