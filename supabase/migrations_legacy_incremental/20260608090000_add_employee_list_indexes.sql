create index if not exists idx_employees_owner_id
  on public.employees(owner_user_id, id);

create index if not exists idx_employees_owner_status_id
  on public.employees(owner_user_id, status, id);

create index if not exists idx_employees_owner_role
  on public.employees(owner_user_id, role);
