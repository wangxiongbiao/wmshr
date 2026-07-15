create table if not exists public.employee_notifications (
  id bigserial primary key,
  owner_user_id uuid not null references auth.users (id) on delete cascade,
  employee_id bigint not null references public.employees(id) on delete cascade,
  type text not null check (type in ('payroll_confirmed')),
  title text not null,
  content text not null default '',
  biz_id bigint,
  biz_month text,
  read_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (owner_user_id, employee_id, type, biz_id)
);

create index if not exists idx_employee_notifications_owner_employee_created
  on public.employee_notifications(owner_user_id, employee_id, created_at desc);

create index if not exists idx_employee_notifications_owner_employee_unread
  on public.employee_notifications(owner_user_id, employee_id, read_at, created_at desc);

create index if not exists idx_employee_notifications_owner_biz
  on public.employee_notifications(owner_user_id, type, biz_id);

alter table public.employee_notifications enable row level security;

revoke all on table public.employee_notifications from anon, authenticated;
grant all on table public.employee_notifications to service_role;
grant usage, select on sequence public.employee_notifications_id_seq to service_role;
