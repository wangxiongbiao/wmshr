-- 考勤底稿预生成需要把当天未完成流程落到计算结果表，pending/checked_in 是过程态，不参与历史正式缺勤判断。
-- 约束只扩展 status 允许值，不改变既有 attendance_records 原始记录类型，避免打卡记录表承担底稿状态职责。
do $$
declare
  constraint_name text;
begin
  select c.conname into constraint_name
  from pg_constraint c
  join pg_class t on t.oid = c.conrelid
  join pg_namespace n on n.oid = t.relnamespace
  where n.nspname = 'public'
    and t.relname = 'attendance_calculation_results'
    and c.contype = 'c'
    and pg_get_constraintdef(c.oid) like '%status%normal%'
  limit 1;

  if constraint_name is not null then
    execute format('alter table public.attendance_calculation_results drop constraint %I', constraint_name);
  end if;
end $$;

alter table public.attendance_calculation_results
  drop constraint if exists attendance_calculation_results_status_check,
  add constraint attendance_calculation_results_status_check
  -- 兼容历史 v1 结果中的 late/early/overtime，避免迁移验证因为旧数据失败；v2 新流程只主动写入 pending/checked_in/normal/leave/sick_leave/absent/manual_adjusted/exception。
  check (status in ('pending', 'checked_in', 'normal', 'late', 'early', 'leave', 'sick_leave', 'absent', 'overtime', 'manual_adjusted', 'exception')) not valid;

alter table public.attendance_calculation_results validate constraint attendance_calculation_results_status_check;

-- 自动任务需要可观察地知道哪些结果是底稿、哪些已经正式结算；字段不参与前端展示，只服务幂等补跑和后续排查。
alter table public.attendance_calculation_results
  add column if not exists calculation_phase text not null default 'settled',
  add column if not exists generated_by text not null default 'calculation',
  add column if not exists settled_at timestamptz;

alter table public.attendance_calculation_results
  drop constraint if exists attendance_calculation_results_phase_check,
  add constraint attendance_calculation_results_phase_check
  check (calculation_phase in ('draft', 'settled')) not valid;

alter table public.attendance_calculation_results validate constraint attendance_calculation_results_phase_check;

alter table public.attendance_calculation_results
  drop constraint if exists attendance_calculation_results_generated_by_check,
  add constraint attendance_calculation_results_generated_by_check
  check (generated_by in ('calculation', 'draft_job', 'settlement_job', 'manual_recalculate')) not valid;

alter table public.attendance_calculation_results validate constraint attendance_calculation_results_generated_by_check;
