-- ============================================================
-- WINX Back Office — Supabase Schema
-- รันไฟล์นี้ใน Supabase Dashboard → SQL Editor → New query → Run
-- ============================================================

-- ===== ออเดอร์ =====
create table if not exists orders (
  id              text primary key,            -- รหัสเฉพาะ เช่น WNX-2501
  type            text not null,               -- design | design_produce | produce
  team_name       text not null,
  start_date      date not null,
  delivery_date   date,                            -- วันจัดส่งสินค้า (optional)
  access_code     text not null,               -- รหัสให้ลูกค้าเข้าดู/แก้
  -- กลุ่มออกแบบ
  design_package          text,
  design_package_price    numeric,
  -- กลุ่มผลิต
  shirt_type      text,
  fabric_type     text,
  production_price numeric,
  cost            jsonb,                        -- {fabric,paper,ink,cut,sew,other}
  shipping        numeric,
  deposit         numeric not null default 0,
  has_production_table boolean not null default false,
  created_at      timestamptz not null default now()
);

-- ===== meta ของตารางผลิต (1 ต่อ 1 ออเดอร์) =====
create table if not exists production_meta (
  order_id   text primary key references orders(id) on delete cascade,
  fabric     text,
  collar     text default 'คอกลม',
  image_url  text,                              -- data URL หรือ storage URL
  updated_at timestamptz not null default now()
);

-- ===== รายชื่อผู้เล่นในตารางผลิต =====
create table if not exists production_players (
  id         uuid primary key default gen_random_uuid(),
  order_id   text not null references orders(id) on delete cascade,
  position   int  not null default 0,           -- ลำดับแถว
  name       text default '',
  size       text default '',
  number     text default '',
  checked    boolean default false,
  note       text default '',
  updated_at timestamptz not null default now()
);

create index if not exists idx_players_order on production_players(order_id, position);

-- ===== Realtime =====
alter publication supabase_realtime add table production_players;
alter publication supabase_realtime add table production_meta;

-- ===== RLS (เปิดให้อ่าน/เขียนได้ทั้งหมดสำหรับช่วงทดสอบ) =====
-- หมายเหตุ: ตอน production ควรจำกัดสิทธิ์ด้วย access_code / auth
alter table orders enable row level security;
alter table production_meta enable row level security;
alter table production_players enable row level security;

drop policy if exists "public orders" on orders;
create policy "public orders" on orders for all using (true) with check (true);

drop policy if exists "public meta" on production_meta;
create policy "public meta" on production_meta for all using (true) with check (true);

drop policy if exists "public players" on production_players;
create policy "public players" on production_players for all using (true) with check (true);

-- ============================================================
-- Seed — ข้อมูลตัวอย่าง (ตรงกับ mock เดิม)
-- ============================================================
insert into orders (id, type, team_name, start_date, access_code, design_package, design_package_price, shirt_type, fabric_type, production_price, cost, shipping, deposit, has_production_table) values
('WNX-2501','design_produce','TOMKHOM FC','2026-01-08','TOMKHOM01',null,null,'เสื้อแขนสั้น','ผ้าเรียบ 140 แกรม',12000,'{"fabric":3200,"paper":600,"ink":800,"cut":700,"sew":1500,"other":400}',150,6000,true),
('WNX-2502','design','VYCE Jersey','2026-01-12','VYCE02','แพคเกจ Premium (เสื้อ + กางเกง)',3500,null,null,null,null,null,1500,false),
('WNX-2503','produce','EGAT JACKET','2026-01-15','EGAT03',null,null,'แจ็คเก็ต','ผ้าไมโครพีช',18500,'{"fabric":5400,"paper":900,"ink":1100,"cut":1200,"sew":2800,"other":600}',250,9000,true),
('WNX-2504','design_produce','JONES500','2026-01-20','JONES04',null,null,'เสื้อแขนสั้น','ผ้าจูติ',9800,'{"fabric":2600,"paper":500,"ink":650,"cut":600,"sew":1300,"other":300}',150,0,false),
('WNX-2505','design','XBIO Esports','2026-01-22','XBIO05','แพคเกจ Standard (เสื้ออย่างเดียว)',2000,null,null,null,null,null,2000,false),
('WNX-2506','produce','YVES Running','2026-01-25','YVES06',null,null,'เสื้อกล้าม','ผ้าเรียบ 140 แกรม',7200,'{"fabric":1900,"paper":400,"ink":500,"cut":450,"sew":950,"other":200}',100,3600,false)
on conflict (id) do nothing;
