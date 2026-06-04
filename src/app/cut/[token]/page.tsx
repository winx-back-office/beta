import { notFound } from "next/navigation";
import { createClient } from "@supabase/supabase-js";
import type { CuttingJob } from "@/app/api/cutting-jobs/route";
import { ClaimForm } from "./claim-form";

async function getJobByToken(token: string): Promise<CuttingJob | null> {
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );
  const { data } = await supabase
    .from("cutting_jobs")
    .select("*")
    .eq("token", token)
    .single();
  if (!data) return null;
  return {
    id: data.id,
    orderId: data.order_id,
    teamName: data.team_name,
    shirtType: data.shirt_type,
    collarType: data.collar_type,
    quantity: data.quantity,
    patternPieces: data.pattern_pieces,
    token: data.token,
    status: data.status,
    cutterId: data.cutter_id,
    cutterName: data.cutter_name,
    startedAt: data.started_at,
    completedAt: data.completed_at,
    createdAt: data.created_at,
    note: data.note,
  };
}

function formatDateTime(iso: string | null) {
  if (!iso) return "-";
  return new Date(iso).toLocaleString("th-TH", {
    day: "2-digit", month: "short", year: "numeric",
    hour: "2-digit", minute: "2-digit",
  });
}

export default async function CutPage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const job = await getJobByToken(token);
  if (!job) notFound();

  return (
    <div className="min-h-screen bg-[#0f1117] text-white">
      {/* Header */}
      <div className="border-b border-white/10 bg-[#15171e] px-6 py-4 flex items-center gap-3">
        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-[#6366f1] font-black text-lg">W</div>
        <div>
          <div className="font-bold tracking-wide text-sm">WINX STUDIO</div>
          <div className="text-[10px] uppercase tracking-widest text-white/40">ใบงานตัดแพทเทิร์น</div>
        </div>
      </div>

      <div className="mx-auto max-w-md px-4 py-8 space-y-4">
        {/* Job details card */}
        <div className="rounded-2xl border border-white/10 bg-white/5 px-6 py-5 space-y-5">
          <div>
            <div className="text-xs text-white/40 uppercase tracking-widest mb-1">รหัสใบงาน</div>
            <div className="font-bold text-lg">{job.id}</div>
          </div>

          <div className="grid grid-cols-2 gap-4 text-sm border-t border-white/10 pt-4">
            <div>
              <div className="text-xs text-white/40 mb-1">ชื่อทีม</div>
              <div className="font-medium">{job.teamName}</div>
            </div>
            <div>
              <div className="text-xs text-white/40 mb-1">ทรงเสื้อ</div>
              <div className="font-medium">{job.shirtType}</div>
            </div>
            <div className="col-span-2">
              <div className="text-xs text-white/40 mb-1">ประเภทคอ</div>
              <div className="font-medium">{job.collarType}</div>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4 border-t border-white/10 pt-4">
            <div className="text-center rounded-xl bg-white/10 p-4">
              <div className="text-xs text-white/40 mb-1">จำนวนตัว</div>
              <div className="text-4xl font-black">{job.quantity}</div>
              <div className="text-xs text-white/40 mt-1">ตัว</div>
            </div>
            <div className="text-center rounded-xl bg-[#6366f1]/20 border border-[#6366f1]/30 p-4">
              <div className="text-xs text-[#a5b4fc] mb-1">ชิ้นแพทเทิร์น</div>
              <div className="text-4xl font-black text-[#818cf8]">{job.patternPieces}</div>
              <div className="text-xs text-[#a5b4fc] mt-1">ชิ้น</div>
            </div>
          </div>

          {job.note && (
            <div className="border-t border-white/10 pt-4 text-sm">
              <div className="text-xs text-white/40 mb-1">หมายเหตุ</div>
              <div className="text-white/80">{job.note}</div>
            </div>
          )}
        </div>

        {/* Status section */}
        {job.status === "cutting" && (
          <div className="rounded-2xl border border-yellow-500/30 bg-yellow-500/10 px-6 py-5 text-center">
            <div className="text-3xl mb-2">✂️</div>
            <div className="text-lg font-bold text-yellow-300">กำลังดำเนินการ</div>
            <div className="text-sm text-yellow-200/70 mt-1">โดย {job.cutterName}</div>
            <div className="text-xs text-white/40 mt-2">รับงานเมื่อ {formatDateTime(job.startedAt)}</div>
          </div>
        )}

        {job.status === "done" && (
          <div className="rounded-2xl border border-green-500/30 bg-green-500/10 px-6 py-5 text-center">
            <div className="text-3xl mb-2">✅</div>
            <div className="text-lg font-bold text-green-300">ตัดเสร็จแล้ว</div>
            {job.cutterName && (
              <div className="text-sm text-green-200/70 mt-1">โดย {job.cutterName}</div>
            )}
            {job.completedAt && (
              <div className="text-xs text-white/40 mt-2">เสร็จเมื่อ {formatDateTime(job.completedAt)}</div>
            )}
          </div>
        )}

        {job.status === "pending" && (
          <ClaimForm jobId={job.id} />
        )}
      </div>
    </div>
  );
}
