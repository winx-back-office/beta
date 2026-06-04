import { NextResponse, type NextRequest } from "next/server";
import fs from "fs";
import path from "path";
import type { CuttingJob } from "../../route";

const JOBS_PATH = path.join(process.cwd(), "src/data/cutting-jobs.json");
const CUTTERS_PATH = path.join(process.cwd(), "src/data/cutters.json");

interface Cutter {
  id: string;
  name: string;
  pin: string;
  active: boolean;
}

function readJobs(): CuttingJob[] {
  try { return JSON.parse(fs.readFileSync(JOBS_PATH, "utf-8")); } catch { return []; }
}

function writeJobs(jobs: CuttingJob[]) {
  fs.writeFileSync(JOBS_PATH, JSON.stringify(jobs, null, 2), "utf-8");
}

function readCutters(): Cutter[] {
  try { return JSON.parse(fs.readFileSync(CUTTERS_PATH, "utf-8")); } catch { return []; }
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const { pin } = await req.json();

  const cutters = readCutters();
  const cutter = cutters.find((c) => c.pin === pin && c.active);
  if (!cutter) {
    return NextResponse.json({ error: "PIN ไม่ถูกต้อง" }, { status: 400 });
  }

  const jobs = readJobs();
  const idx = jobs.findIndex((j) => j.id === id);
  if (idx === -1) return NextResponse.json({ error: "not found" }, { status: 404 });

  jobs[idx] = {
    ...jobs[idx],
    status: "cutting",
    cutterId: cutter.id,
    cutterName: cutter.name,
    startedAt: new Date().toISOString(),
  };
  writeJobs(jobs);

  return NextResponse.json({ success: true, cutterName: cutter.name });
}
