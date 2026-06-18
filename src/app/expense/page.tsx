"use client";

import { useEffect, useState, useMemo } from "react";
import { Scissors, Wallet, Download, ChevronDown, ChevronUp } from "lucide-react";
import type { CuttingJob } from "@/app/api/cutting-jobs/route";
import { cn } from "@/lib/utils";

// ---- Types ----

interface JobEntry {
  jobId: string;
  token: string;
  teamName: string;
  orderId: string;
  pieces: number;   // patternPieces for cutters, quantity for sewers
  quantity: number; // number of shirts (for ชิ้น/ตัว)
  completedAt: string | null;
}

interface WorkerSummary {
  name: string;
  jobs: JobEntry[];
}

// ---- Helpers ----

function getMonthKey(date: Date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
}

function thaiMonthLabel(key: string) {
  const [y, m] = key.split("-");
  const monthNames = ["ม.ค.", "ก.พ.", "มี.ค.", "เม.ย.", "พ.ค.", "มิ.ย.", "ก.ค.", "ส.ค.", "ก.ย.", "ต.ค.", "พ.ย.", "ธ.ค."];
  return `${monthNames[parseInt(m) - 1]} ${parseInt(y) + 543}`;
}

function initials(name: string) {
  const parts = name.trim().split(/\s+/);
  if (parts.length >= 2) return parts[0][0] + parts[1][0];
  return name.slice(0, 2);
}

const AVATAR_COLORS = [
  "bg-blue-500/20 text-blue-300",
  "bg-emerald-500/20 text-emerald-300",
  "bg-amber-500/20 text-amber-300",
  "bg-purple-500/20 text-purple-300",
  "bg-rose-500/20 text-rose-300",
  "bg-cyan-500/20 text-cyan-300",
];

// ---- Per-job rate storage ----

function jobRateKey(tab: "cut" | "sew", jobId: string) {
  return `winx-expense-jobrate-${tab}-${jobId}`;
}

function getJobRate(tab: "cut" | "sew", jobId: string, defaultVal: number) {
  if (typeof window === "undefined") return defaultVal;
  const v = localStorage.getItem(jobRateKey(tab, jobId));
  return v !== null ? parseInt(v) : defaultVal;
}

function saveJobRate(tab: "cut" | "sew", jobId: string, val: number) {
  localStorage.setItem(jobRateKey(tab, jobId), String(val));
}

// ---- Per-job paid storage ----

function jobPaidKey(tab: "cut" | "sew", jobId: string) {
  return `winx-expense-paid-${tab}-${jobId}`;
}

function getJobPaid(tab: "cut" | "sew", jobId: string) {
  if (typeof window === "undefined") return false;
  return localStorage.getItem(jobPaidKey(tab, jobId)) === "1";
}

function saveJobPaid(tab: "cut" | "sew", jobId: string, val: boolean) {
  if (val) localStorage.setItem(jobPaidKey(tab, jobId), "1");
  else localStorage.removeItem(jobPaidKey(tab, jobId));
}

// ---- Job Row with own rate ----

function JobRow({
  job,
  tab,
  defaultRate,
  onRateChange,
}: {
  job: JobEntry;
  tab: "cut" | "sew";
  defaultRate: number;
  onRateChange: () => void;
}) {
  const unit = tab === "cut" ? "ชิ้น" : "ตัว";
  const [rate, setRate] = useState(() => getJobRate(tab, job.jobId, defaultRate));
  const [paid, setPaid] = useState(() => getJobPaid(tab, job.jobId));
  const pay = job.pieces * rate;
  const piecesPerUnit = job.quantity > 0 ? Math.round((job.pieces / job.quantity) * 10) / 10 : "-";

  return (
    <div className={cn(
      "flex items-center gap-3 px-4 py-3 border-b border-border last:border-b-0 transition-opacity",
      paid && "opacity-40"
    )}>
      {/* Job name */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap">
          <a
            href={`/cut/${job.token}`}
            target="_blank"
            rel="noopener noreferrer"
            className={cn(
              "text-sm font-medium hover:text-accent hover:underline transition-colors",
              paid && "line-through text-muted"
            )}
          >
            {job.teamName}
          </a>
          <span className="rounded-md bg-accent/10 border border-accent/20 px-1.5 py-0.5 text-[10px] font-mono text-accent">
            {job.jobId}
          </span>
        </div>
        {/* Stats chips */}
        <div className="flex items-center gap-1.5 mt-1 flex-wrap">
          {tab === "cut" && (
            <span className="rounded-md bg-surface-2 px-1.5 py-0.5 text-[10px] text-muted tabular-nums">
              {piecesPerUnit} ชิ้น/ตัว
            </span>
          )}
          <span className="rounded-md bg-surface-2 px-1.5 py-0.5 text-[10px] text-muted tabular-nums">
            {job.quantity} ตัว
          </span>
          <span className="rounded-md bg-surface-2 px-1.5 py-0.5 text-[10px] text-muted tabular-nums">
            {job.pieces} {unit}
          </span>
        </div>
      </div>

      {/* Rate input */}
      <div className="flex items-center gap-1 shrink-0">
        <span className="text-xs text-muted-2">฿</span>
        <input
          type="number"
          min={0}
          step={1}
          value={rate}
          onChange={(e) => {
            const v = parseInt(e.target.value) || 0;
            setRate(v);
            saveJobRate(tab, job.jobId, v);
            onRateChange();
          }}
          className="w-14 rounded border border-border bg-surface-2 px-1.5 py-1 text-center text-xs"
        />
        <span className="text-xs text-muted-2">/{unit}</span>
      </div>

      {/* Total */}
      <div className="w-20 text-right shrink-0">
        <span className="text-sm font-semibold tabular-nums">฿{pay.toLocaleString()}</span>
      </div>

      {/* Paid button */}
      <button
        onClick={() => { const next = !paid; setPaid(next); saveJobPaid(tab, job.jobId, next); }}
        className={cn(
          "shrink-0 flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-medium border transition-colors whitespace-nowrap",
          paid
            ? "bg-emerald-500/15 text-emerald-400 border-emerald-500/30"
            : "bg-surface text-muted-2 border-border hover:border-emerald-500/40 hover:text-emerald-400"
        )}
      >
        {paid ? "✓ จ่ายแล้ว" : "จ่ายแล้ว"}
      </button>
    </div>
  );
}

// ---- Worker Card ----

function WorkerCard({ worker, tab, colorIndex }: { worker: WorkerSummary; tab: "cut" | "sew"; colorIndex: number }) {
  const unit = tab === "cut" ? "ชิ้น" : "ตัว";
  const defaultRate = tab === "cut" ? 1 : 50;
  const [expanded, setExpanded] = useState(false);
  const [tick, setTick] = useState(0);

  const totalPieces = worker.jobs.reduce((s, j) => s + j.pieces, 0);
  const totalPay = worker.jobs.reduce((s, j) => s + j.pieces * getJobRate(tab, j.jobId, defaultRate), 0);
  const color = AVATAR_COLORS[colorIndex % AVATAR_COLORS.length];

  return (
    <div className="rounded-xl border border-border bg-surface overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between gap-3 px-4 py-3">
        <div className="flex items-center gap-3 min-w-0">
          <div className={cn("flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-sm font-semibold", color)}>
            {initials(worker.name)}
          </div>
          <div className="min-w-0">
            <div className="font-medium text-sm">{worker.name}</div>
            <div className="text-xs text-muted-2">{totalPieces} {unit} · {worker.jobs.length} งาน</div>
          </div>
        </div>
        <div className="flex items-center gap-3 shrink-0">
          <div className="text-right">
            <div className="text-base font-semibold">฿{totalPay.toLocaleString()}</div>
          </div>
          <button
            onClick={() => setExpanded((v) => !v)}
            className="rounded-lg p-1.5 text-muted hover:bg-surface-2"
          >
            {expanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
          </button>
        </div>
      </div>

      {/* Expanded job list */}
      {expanded && (
        <div className="border-t border-border">
          <div className="flex items-center gap-3 px-4 py-2 text-[10px] font-semibold uppercase tracking-widest text-muted-2 border-b border-border bg-surface-2/50">
            <span className="flex-1">งาน</span>
            <span className="w-32 text-right">ราคา/{unit}</span>
            <span className="w-20 text-right">ค่า{tab === "cut" ? "ตัด" : "เย็บ"}</span>
            <span className="w-16 text-right">สถานะ</span>
          </div>
          {worker.jobs.map((j) => (
            <JobRow
              key={j.jobId}
              job={j}
              tab={tab}
              defaultRate={defaultRate}
              onRateChange={() => setTick((t) => t + 1)}
            />
          ))}
          <div className="flex items-center justify-between px-4 py-2 text-sm font-semibold bg-surface-2">
            <span>รวม</span>
            <div className="flex gap-6">
              <span>{totalPieces} {unit}</span>
              <span>฿{totalPay.toLocaleString()}</span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ---- Main Page ----

export default function ExpensePage() {
  const [jobs, setJobs] = useState<CuttingJob[]>([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<"cut" | "sew">("cut");
  const [tick, setTick] = useState(0);

  const now = new Date();
  const [selectedMonth, setSelectedMonth] = useState(getMonthKey(now));

  useEffect(() => {
    fetch("/api/cutting-jobs")
      .then((r) => r.json())
      .then((data: CuttingJob[]) => { setJobs(data); setLoading(false); })
      .catch(() => setLoading(false));
  }, []);

  const availableMonths = useMemo(() => {
    const keys = new Set<string>();
    keys.add(getMonthKey(now));
    jobs.forEach((j) => {
      const d = j.completedAt ?? j.sewingCompletedAt ?? j.createdAt;
      if (d) keys.add(getMonthKey(new Date(d)));
    });
    return Array.from(keys).sort((a, b) => b.localeCompare(a));
  }, [jobs]);

  const monthJobs = useMemo(() => {
    return jobs.filter((j) => {
      const d = tab === "cut" ? (j.completedAt ?? j.createdAt) : (j.sewingCompletedAt ?? j.createdAt);
      return getMonthKey(new Date(d)) === selectedMonth;
    });
  }, [jobs, selectedMonth, tab]);

  const cutterMap = useMemo(() => {
    const map = new Map<string, WorkerSummary>();
    jobs.filter((j) => {
      const d = j.completedAt ?? j.createdAt;
      return getMonthKey(new Date(d)) === selectedMonth && j.cutterName;
    }).forEach((j) => {
      const name = j.cutterName!;
      if (!map.has(name)) map.set(name, { name, jobs: [] });
      map.get(name)!.jobs.push({ jobId: j.id, token: j.token, teamName: j.teamName, orderId: j.orderId, pieces: j.patternPieces, quantity: j.quantity, completedAt: j.completedAt });
    });
    return map;
  }, [jobs, selectedMonth]);

  const sewerMap = useMemo(() => {
    const map = new Map<string, WorkerSummary>();
    jobs.filter((j) => {
      const d = j.sewingCompletedAt ?? j.createdAt;
      return getMonthKey(new Date(d)) === selectedMonth && j.sewerName;
    }).forEach((j) => {
      const name = j.sewerName!;
      if (!map.has(name)) map.set(name, { name, jobs: [] });
      map.get(name)!.jobs.push({ jobId: j.id, token: j.token, teamName: j.teamName, orderId: j.orderId, pieces: j.quantity, quantity: j.quantity, completedAt: j.sewingCompletedAt });
    });
    return map;
  }, [jobs, selectedMonth]);

  const cutters = Array.from(cutterMap.values());
  const sewers = Array.from(sewerMap.values());
  const workers = tab === "cut" ? cutters : sewers;

  const cutTotal = cutters.reduce((s, w) => s + w.jobs.reduce((ss, j) => ss + j.pieces * getJobRate("cut", j.jobId, 1), 0), 0);
  const sewTotal = sewers.reduce((s, w) => s + w.jobs.reduce((ss, j) => ss + j.pieces * getJobRate("sew", j.jobId, 50), 0), 0);

  function exportCSV() {
    const rows: string[][] = [["ประเภท", "ช่าง", "งาน", "จำนวน", "ราคา/หน่วย", "รวม"]];
    cutters.forEach((w) => w.jobs.forEach((j) => {
      const r = getJobRate("cut", j.jobId, 1);
      rows.push(["ช่างตัด", w.name, j.teamName, String(j.pieces), String(r), String(j.pieces * r)]);
    }));
    sewers.forEach((w) => w.jobs.forEach((j) => {
      const r = getJobRate("sew", j.jobId, 50);
      rows.push(["ช่างเย็บ", w.name, j.teamName, String(j.pieces), String(r), String(j.pieces * r)]);
    }));
    const csv = rows.map((r) => r.map((c) => `"${c}"`).join(",")).join("\n");
    const blob = new Blob(["﻿" + csv], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `รายจ่ายช่างตัดเย็บ-${selectedMonth}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <div className="flex flex-col gap-6 px-4 py-6 max-w-3xl mx-auto">
      <div className="flex items-start justify-between gap-3 flex-wrap">
        <div>
          <h1 className="text-xl font-semibold">รายจ่ายช่างตัดเย็บ</h1>
          <p className="text-sm text-muted-2 mt-0.5">คำนวณค่าแรงช่างรายคน</p>
        </div>
        <div className="flex items-center gap-2">
          <select
            value={selectedMonth}
            onChange={(e) => setSelectedMonth(e.target.value)}
            className="rounded-lg border border-border bg-surface px-3 py-1.5 text-sm"
          >
            {availableMonths.map((k) => (
              <option key={k} value={k}>{thaiMonthLabel(k)}</option>
            ))}
          </select>
          <button
            onClick={exportCSV}
            className="flex items-center gap-1.5 rounded-lg border border-border px-3 py-1.5 text-sm hover:bg-surface-2"
          >
            <Download className="h-4 w-4" />
            ส่งออก CSV
          </button>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div className="rounded-xl border border-border bg-surface p-4">
          <div className="flex items-center gap-2 text-xs text-muted-2 mb-2">
            <Scissors className="h-3.5 w-3.5" /> รวมค่าตัด
          </div>
          <div className="text-2xl font-semibold">฿{cutTotal.toLocaleString()}</div>
          <div className="text-xs text-muted-2 mt-1">{cutters.length} ช่าง</div>
        </div>
        <div className="rounded-xl border border-border bg-surface p-4">
          <div className="flex items-center gap-2 text-xs text-muted-2 mb-2">
            <Wallet className="h-3.5 w-3.5" /> รวมค่าเย็บ
          </div>
          <div className="text-2xl font-semibold">฿{sewTotal.toLocaleString()}</div>
          <div className="text-xs text-muted-2 mt-1">{sewers.length} ช่าง</div>
        </div>
      </div>

      <div className="flex border-b border-border gap-1">
        <button
          onClick={() => setTab("cut")}
          className={cn(
            "flex items-center gap-1.5 px-4 py-2.5 text-sm border-b-2 -mb-px transition-colors",
            tab === "cut" ? "border-accent text-accent font-medium" : "border-transparent text-muted hover:text-foreground"
          )}
        >
          <Scissors className="h-4 w-4" />
          ช่างตัด
          {cutters.length > 0 && <span className="ml-1 rounded-full bg-surface-2 px-1.5 py-0.5 text-[10px]">{cutters.length}</span>}
        </button>
        <button
          onClick={() => setTab("sew")}
          className={cn(
            "flex items-center gap-1.5 px-4 py-2.5 text-sm border-b-2 -mb-px transition-colors",
            tab === "sew" ? "border-accent text-accent font-medium" : "border-transparent text-muted hover:text-foreground"
          )}
        >
          <Wallet className="h-4 w-4" />
          ช่างเย็บ
          {sewers.length > 0 && <span className="ml-1 rounded-full bg-surface-2 px-1.5 py-0.5 text-[10px]">{sewers.length}</span>}
        </button>
      </div>

      {loading ? (
        <div className="text-center py-12 text-muted">กำลังโหลด...</div>
      ) : workers.length === 0 ? (
        <div className="text-center py-12 text-muted">ไม่มีข้อมูล{tab === "cut" ? "ช่างตัด" : "ช่างเย็บ"}ในเดือนนี้</div>
      ) : (
        <div className="flex flex-col gap-3">
          {workers.map((w, i) => (
            <WorkerCard key={w.name} worker={w} tab={tab} colorIndex={i} />
          ))}
        </div>
      )}
    </div>
  );
}
