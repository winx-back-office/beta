import { NextResponse, type NextRequest } from "next/server";
import fs from "fs";
import path from "path";
import type { CuttingJob } from "../route";

const JOBS_PATH = path.join(process.cwd(), "src/data/cutting-jobs.json");

function readJobs(): CuttingJob[] {
  try { return JSON.parse(fs.readFileSync(JOBS_PATH, "utf-8")); } catch { return []; }
}

function writeJobs(jobs: CuttingJob[]) {
  fs.writeFileSync(JOBS_PATH, JSON.stringify(jobs, null, 2), "utf-8");
}

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const jobs = readJobs();
  const job = jobs.find((j) => j.id === id);
  if (!job) return NextResponse.json({ error: "not found" }, { status: 404 });
  return NextResponse.json(job);
}

export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const body = await req.json();
  const jobs = readJobs();
  const idx = jobs.findIndex((j) => j.id === id);
  if (idx === -1) return NextResponse.json({ error: "not found" }, { status: 404 });
  jobs[idx] = { ...jobs[idx], ...body };
  writeJobs(jobs);
  return NextResponse.json({ ok: true, job: jobs[idx] });
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const jobs = readJobs();
  const filtered = jobs.filter((j) => j.id !== id);
  if (filtered.length === jobs.length) return NextResponse.json({ error: "not found" }, { status: 404 });
  writeJobs(filtered);
  return NextResponse.json({ ok: true });
}
