update public.employees
set status = 'resigned'
where status = 'disabled';

alter table public.employees
drop constraint if exists employees_status_check;

alter table public.employees
add constraint employees_status_check
check (status = any (array['active'::text, 'on_leave'::text, 'probation'::text, 'resigned'::text]));

drop index if exists idx_employees_owner_active_list;

create index if not exists idx_employees_owner_active_list
  on public.employees(owner_user_id, id)
  where status <> 'resigned';
