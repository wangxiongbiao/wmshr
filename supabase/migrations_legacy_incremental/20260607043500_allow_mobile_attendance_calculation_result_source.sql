-- Employee App punch-in already writes attendance_records.source = 'mobile';
-- daily recalculation copies record.source into attendance_calculation_results.source,
-- so this CHECK must allow the same value set or the mobile punch flow will fail after the raw record write succeeds.
-- 历史导入/设备打卡结果已经可能保留 device；修复时必须保留旧值，避免 validate 被存量数据拦住。
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
    and pg_get_constraintdef(c.oid) like '%source%'
  limit 1;

  if constraint_name is not null then
    execute format('alter table public.attendance_calculation_results drop constraint %I', constraint_name);
  end if;
end $$;

alter table public.attendance_calculation_results
  add constraint attendance_calculation_results_source_check
  check (source in ('manual', 'import', 'system', 'device', 'mobile')) not valid;

alter table public.attendance_calculation_results validate constraint attendance_calculation_results_source_check;
