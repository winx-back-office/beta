import { notFound } from "next/navigation";
import { createClient } from "@supabase/supabase-js";
import type { CuttingJob } from "@/app/api/cutting-jobs/route";
import { ClaimForm } from "./claim-form";
import { DoneButton } from "./done-button";

async function getJobByToken(token: string): Promise<CuttingJob | null> {
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false } }
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
    printedAt: data.printed_at,
    sewingStatus: data.sewing_status ?? "pending",
    sewerId: data.sewer_id,
    sewerName: data.sewer_name,
    sewingStartedAt: data.sewing_started_at,
    sewingCompletedAt: data.sewing_completed_at,
    createdAt: data.created_at,
    note: data.note,
    cutterNote: data.cutter_note ?? "",
  };
}

function formatDateTime(iso: string | null) {
  if (!iso) return "-";
  return new Date(iso).toLocaleString("th-TH", {
    day: "2-digit", month: "short", year: "numeric",
    hour: "2-digit", minute: "2-digit",
  });
}

// Progress bar showing both phases
function PhaseProgress({ status }: { status: CuttingJob["status"] }) {
  const phases = [
    { key: "cutting", label: "ตัด", icon: "✂️" },
    { key: "sewing", label: "เย็บ", icon: "🪡" },
  ];
  const cutDone = status === "cut_done" || status === "sewing" || status === "done";
  const sewDone = status === "done";
  const isCutting = status === "cutting";
  const isSewing = status === "sewing";

  return (
    <div className="rounded-2xl border border-white/10 bg-white/5 px-6 py-4">
      <div className="flex items-center gap-2">
        {phases.map((p, i) => {
          const isDone = p.key === "cutting" ? cutDone : sewDone;
          const isActive = p.key === "cutting" ? isCutting : isSewing;
          return (
            <div key={p.key} className="flex items-center gap-2 flex-1">
              <div className={`flex flex-col items-center flex-1 ${i > 0 ? "" : ""}`}>
                <div className={`h-8 w-8 rounded-full flex items-center justify-center text-sm font-bold border-2 transition-all ${
                  isDone ? "bg-green-500 border-green-500 text-white" :
                  isActive ? "bg-[#6366f1] border-[#6366f1] text-white animate-pulse" :
                  "bg-white/10 border-white/20 text-white/40"
                }`}>
                  {isDone ? "✓" : p.icon}
                </div>
                <div className={`mt-1 text-xs ${isDone ? "text-green-400" : isActive ? "text-[#818cf8]" : "text-white/30"}`}>
                  {p.label}
                </div>
              </div>
              {i < phases.length - 1 && (
                <div className={`h-0.5 flex-1 mb-4 rounded ${cutDone ? "bg-green-500" : "bg-white/10"}`} />
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
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
          <div className="text-[10px] uppercase tracking-widest text-white/40">ใบงานตัด & เย็บ</div>
        </div>
      </div>

      <div className="mx-auto max-w-md px-4 py-8 space-y-4">
        {/* Phase progress */}
        <PhaseProgress status={job.status} />

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

          <div className="grid grid-cols-3 gap-3 border-t border-white/10 pt-4">
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
            <div className="text-center rounded-xl bg-emerald-500/15 border border-emerald-500/25 p-4">
              <div className="text-xs text-emerald-300/70 mb-1">ชิ้นต่อตัว</div>
              <div className="text-4xl font-black text-emerald-300">
                {job.quantity > 0 ? Math.round((job.patternPieces / job.quantity) * 10) / 10 : "-"}
              </div>
              <div className="text-xs text-emerald-300/70 mt-1">ชิ้น/ตัว</div>
            </div>
          </div>

          {job.note && (
            <div className="border-t border-white/10 pt-4 text-sm">
              <div className="text-xs text-white/40 mb-1">หมายเหตุ</div>
              <div className="text-white/80">{job.note}</div>
            </div>
          )}

          {/* Cutting summary (when cut done) */}
          {(job.status === "cut_done" || job.status === "sewing" || job.status === "done") && (
            <div className="border-t border-white/10 pt-4 text-xs text-white/40 space-y-1">
              <div>✂️ ตัดโดย: <span className="text-white/70">{job.cutterName ?? "-"}</span></div>
              <div>เสร็จเมื่อ: <span className="text-white/70">{formatDateTime(job.completedAt)}</span></div>
            </div>
          )}
        </div>

        {/* ===== CUTTING PHASE ===== */}
        {job.status === "pending" && (
          <ClaimForm jobId={job.id} phase="cutting" />
        )}

        {job.status === "cutting" && (
          <div className="space-y-3">
            <div className="rounded-2xl border border-yellow-500/30 bg-yellow-500/10 px-6 py-5 text-center">
              <div className="text-3xl mb-2">✂️</div>
              <div className="text-lg font-bold text-yellow-300">กำลังตัด</div>
              <div className="text-sm text-yellow-200/70 mt-1">โดย {job.cutterName}</div>
              <div className="text-xs text-white/40 mt-2">รับงานเมื่อ {formatDateTime(job.startedAt)}</div>
            </div>
            <DoneButton jobId={job.id} phase="cutting" defaultQuantity={job.quantity} defaultPatternPieces={job.patternPieces} />
          </div>
        )}

        {/* ===== SEWING PHASE ===== */}
        {job.status === "cut_done" && (
          <div className="space-y-3">
            <div className="rounded-2xl border border-blue-500/30 bg-blue-500/10 px-6 py-5 text-center">
              <div className="text-3xl mb-2">🪡</div>
              <div className="text-lg font-bold text-blue-300">รอช่างเย็บรับงาน</div>
              <div className="text-sm text-blue-200/60 mt-1">ตัดเสร็จแล้ว — รอขั้นตอนเย็บ</div>

            </div>
            <ClaimForm jobId={job.id} phase="sewing" />
          </div>
        )}

        {job.status === "sewing" && (
          <div className="space-y-3">
            <div className="rounded-2xl border border-purple-500/30 bg-purple-500/10 px-6 py-5 text-center">
              <div className="text-3xl mb-2">🪡</div>
              <div className="text-lg font-bold text-purple-300">กำลังเย็บ</div>
              <div className="text-sm text-purple-200/70 mt-1">โดย {job.sewerName}</div>
              <div className="text-xs text-white/40 mt-2">รับงานเมื่อ {formatDateTime(job.sewingStartedAt)}</div>
            </div>
            <DoneButton jobId={job.id} phase="sewing" defaultQuantity={job.quantity} defaultPatternPieces={job.patternPieces} />
          </div>
        )}

        {/* ===== ALL DONE ===== */}
        {job.status === "done" && (
          <div className="rounded-2xl border border-green-500/30 bg-green-500/10 px-6 py-8 text-center space-y-2">
            <div className="text-4xl">✅</div>
            <div className="text-xl font-bold text-green-300">งานเสร็จสมบูรณ์</div>
            <div className="text-sm text-white/50 space-y-1">
              <div>✂️ ตัดโดย {job.cutterName} · {formatDateTime(job.completedAt)}</div>
              <div>🪡 เย็บโดย {job.sewerName} · {formatDateTime(job.sewingCompletedAt)}</div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
