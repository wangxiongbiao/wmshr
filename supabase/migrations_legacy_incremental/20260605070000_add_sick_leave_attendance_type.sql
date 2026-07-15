-- Allow the admin attendance module to save and display sick leave as its own attendance type.
-- The DO blocks first remove any previous enum-like CHECK constraints on these text columns so this migration works
-- whether the original schema created named checks or left the columns unconstrained.
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
    and pg_get_constraintdef(c.oid) like '%type%normal%leave%overtime%'
  limit 1;

  if constraint_name is not null then
    execute format('alter table public.attendance_records drop constraint %I', constraint_name);
  end if;
end $$;

alter table public.attendance_records
  add constraint attendance_records_type_check
  check (type in ('normal', 'late', 'early', 'absent', 'leave', 'sick_leave', 'overtime')) not valid;

alter table public.attendance_records validate constraint attendance_records_type_check;

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
    and pg_get_constraintdef(c.oid) like '%status%normal%leave%exception%'
  limit 1;

  if constraint_name is not null then
    execute format('alter table public.attendance_calculation_results drop constraint %I', constraint_name);
  end if;
end $$;

alter table public.attendance_calculation_results
  add constraint attendance_calculation_results_status_check
  check (status in ('normal', 'leave', 'sick_leave', 'absent', 'manual_adjusted', 'exception')) not valid;

alter table public.attendance_calculation_results validate constraint attendance_calculation_results_status_check;
