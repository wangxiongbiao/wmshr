-- Mobile punch-in writes attendance_records.source = 'mobile'; keep the enum-like CHECK in sync with the employee App flow.
-- Drop only the existing source CHECK on attendance_records, then recreate it with the new allowed value so older databases and fresh migrations behave the same.
-- 历史导入/设备打卡已经写入过 device；迁移必须保留该旧值，否则 validate 会被存量打卡记录阻断。
do $$
declare
  constraint_name text;
begin
  select c.conname into constraint_name
  from pg_constraint c
  join pg_class t on t.oid = c.conrelid
  join pg_namespace n on n.oid = t.relnamespace
  where n.nspname = 'public'
    and t.relname = 'attendance_records'
    and c.contype = 'c'
    and pg_get_constraintdef(c.oid) like '%source%'
  limit 1;

  if constraint_name is not null then
    execute format('alter table public.attendance_records drop constraint %I', constraint_name);
  end if;
end $$;

alter table public.attendance_records
  add constraint attendance_records_source_check
  check (source in ('manual', 'import', 'system', 'device', 'mobile')) not valid;

alter table public.attendance_records validate constraint attendance_records_source_check;
