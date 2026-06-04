import { NextResponse, type NextRequest } from "next/server";
import fs from "fs";
import path from "path";

const JOBS_PATH = path.join(process.cwd(), "src/data/cutting-jobs.json");
const STYLES_PATH = path.join(process.cwd(), "src/data/shirt-styles.json");
const ORDERS_PATH = path.join(process.cwd(), "src/data/orders.json");

export interface CuttingJob {
  id: string;
  orderId: string;
  teamName: string;
  shirtType: string;
  collarType: string;
  quantity: number;
  patternPieces: number;
  token: string;
  status: "pending" | "cutting" | "done";
  cutterId: string | null;
  cutterName: string | null;
  startedAt: string | null;
  completedAt: string | null;
  createdAt: string;
  note: string;
}

function readJobs(): CuttingJob[] {
  try { return JSON.parse(fs.readFileSync(JOBS_PATH, "utf-8")); } catch { return []; }
}

function writeJobs(jobs: CuttingJob[]) {
  fs.writeFileSync(JOBS_PATH, JSON.stringify(jobs, null, 2), "utf-8");
}

function generateId(jobs: CuttingJob[]): string {
  const nums = jobs
    .map((j) => parseInt(j.id.replace("CUT-", "")))
    .filter((n) => !isNaN(n));
  const next = nums.length > 0 ? Math.max(...nums) + 1 : 1;
  return `CUT-${String(next).padStart(3, "0")}`;
}

function getPatternPieces(shirtType: string, collarType: string): number {
  try {
    const styles = JSON.parse(fs.readFileSync(STYLES_PATH, "utf-8")) as {
      name: string;
      collars: { name: string; patternPieces: number }[];
    }[];
    const norm = (s: string) => s.trim().toLowerCase();
    const style = styles.find((s) => norm(s.name) === norm(shirtType));
    if (!style) return 0;
    const collar = style.collars.find((c) => norm(c.name) === norm(collarType));
    return collar?.patternPieces ?? 0;
  } catch { return 0; }
}

export async function GET() {
  return NextResponse.json(readJobs());
}

export async function POST(req: NextRequest) {
  const body = await req.json();
  const { orderId, teamName, shirtType, collarType, quantity, note } = body;

  const jobs = readJobs();
  const collarPieces = getPatternPieces(shirtType, collarType);
  const patternPieces = (quantity ?? 1) * collarPieces;

  const newJob: CuttingJob = {
    id: generateId(jobs),
    orderId,
    teamName,
    shirtType,
    collarType,
    quantity: quantity ?? 1,
    patternPieces,
    token: crypto.randomUUID(),
    status: "pending",
    cutterId: null,
    cutterName: null,
    startedAt: null,
    completedAt: null,
    createdAt: new Date().toISOString(),
    note: note ?? "",
  };

  jobs.unshift(newJob);
  writeJobs(jobs);

  // อัปเดต productionStatus ของออเดอร์ → "pattern_cut" (ตัดแพทเทิร์น)
  try {
    const orders = JSON.parse(fs.readFileSync(ORDERS_PATH, "utf-8")) as { id: string; productionStatus?: string }[];
    const idx = orders.findIndex((o) => o.id === orderId);
    if (idx !== -1) {
      orders[idx] = { ...orders[idx], productionStatus: "pattern_cut" };
      fs.writeFileSync(ORDERS_PATH, JSON.stringify(orders, null, 2), "utf-8");
    }
  } catch { /* ไม่หยุดถ้า orders อัปเดตไม่ได้ */ }

  return NextResponse.json({ ok: true, job: newJob });
}
