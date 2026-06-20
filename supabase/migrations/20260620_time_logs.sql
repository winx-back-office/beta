-- time_logs: บันทึกการลงเวลาเข้า-ออกของพนักงาน
create table if not exists time_logs (
  id          uuid primary key default gen_random_uuid(),
  employee_id uuid not null references employees(id) on delete cascade,
  type        text not null check (type in ('in', 'out')),
  timestamp   timestamptz not null default now(),
  lat         double precision,
  lng         double precision,
  gps_distance_m integer,
  token_window bigint not null,
  created_at  timestamptz not null default now()
);

create index if not exists time_logs_employee_id_idx on time_logs(employee_id);
create index if not exists time_logs_timestamp_idx   on time_logs(timestamp desc);

-- timeclock_settings: ตั้งค่าระบบลงเวลา (origin lat/lng, radius)
create table if not exists timeclock_settings (
  id        int primary key default 1 check (id = 1),
  lat       double precision not null default 0,
  lng       double precision not null default 0,
  radius_m  integer not null default 100,
  updated_at timestamptz not null default now()
);

insert into timeclock_settings (id, lat, lng, radius_m)
values (1, 0, 0, 100)
on conflict (id) do nothing;
