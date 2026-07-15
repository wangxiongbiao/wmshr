create table if not exists public.attendance_config (
  owner_user_id uuid primary key references auth.users (id) on delete cascade,
  start_shift time not null default '08:30',
  end_shift time not null default '17:30',
  break_start time not null default '12:00',
  break_end time not null default '13:00',
  standard_hours numeric(6,2) not null default 8,
  ot_hourly_fee numeric(12,2) not null default 50,
  created_at timestamptz not null default timezone('utc'::text, now()),
  updated_at timestamptz not null default timezone('utc'::text, now())
);

-- v2 考勤计算页直接展示费用结果，费用由服务端按全局 attendance_config 生成；旧结果表保留规则字段为 null 仅用于分阶段兼容。
alter table public.attendance_calculation_results
  add column if not exists work_pay numeric(12,2) not null default 0,
  add column if not exists overtime_pay numeric(12,2) not null default 0,
  add column if not exists total_pay numeric(12,2) not null default 0;

alter table public.attendance_config enable row level security;

revoke all on table public.attendance_config from anon, authenticated;
grant all on table public.attendance_config to service_role;

insert into public.attendance_config (
  owner_user_id,
  start_shift,
  end_shift,
  break_start,
  break_end,
  standard_hours,
  ot_hourly_fee
)
select distinct
  owner_user_id,
  -- 旧 attendance_rules 的时间字段在部分环境里是 text；先转 text 再转 time，避免远程迁移因 text/time coalesce 类型不一致中断。
  coalesce(nullif(start_shift::text, '')::time, '08:30'::time),
  coalesce(nullif(end_shift::text, '')::time, '17:30'::time),
  coalesce(nullif(break_start::text, '')::time, '12:00'::time),
  coalesce(nullif(break_end::text, '')::time, '13:00'::time),
  coalesce(standard_hours, 8),
  coalesce(ot_hourly_fee, 50)
from public.attendance_rules
where owner_user_id is not null
  and is_active = true
on conflict (owner_user_id) do nothing;

insert into public.attendance_config (owner_user_id)
select distinct owner_user_id
from public.employees
where owner_user_id is not null
on conflict (owner_user_id) do nothing;
