-- ============================================================
-- WINX — Sewing Phase Migration
-- รันใน Supabase Dashboard → SQL Editor → New query → Run
-- ============================================================

-- ===== 1. ตาราง sewers (ช่างเย็บ) =====
create table if not exists sewers (
  id         uuid primary key default gen_random_uuid(),
  name       text not null,
  pin        text not null unique,
  active     boolean not null default true,
  created_at timestamptz not null default now()
);

alter table sewers enable row level security;
drop policy if exists "public sewers" on sewers;
create policy "public sewers" on sewers for all using (true) with check (true);

-- ===== 2. เพิ่ม sewing fields ใน cutting_jobs =====
alter table cutting_jobs
  add column if not exists sewing_status     text not null default 'pending',
  add column if not exists sewer_id          uuid references sewers(id),
  add column if not exists sewer_name        text,
  add column if not exists sewing_started_at timestamptz,
  add column if not exists sewing_completed_at timestamptz;

-- ===== 3. อัปเดต status ของ cutting_jobs ที่ done แล้ว → cut_done =====
-- (เพื่อให้ flow ใหม่: pending → cutting → cut_done → sewing → done)
update cutting_jobs set status = 'cut_done' where status = 'done';
