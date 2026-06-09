create index if not exists idx_employees_owner_active_list
  on public.employees(owner_user_id, id)
  where status <> 'disabled' and status <> 'resigned';
