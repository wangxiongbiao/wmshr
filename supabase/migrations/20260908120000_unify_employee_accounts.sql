alter table public.workspace_accounts
  add column if not exists password_updated_at timestamptz not null default timezone('utc'::text, now());

insert into public.workspace_accounts (
  owner_user_id,
  employee_id,
  account,
  password_hash,
  account_type,
  status,
  password_updated_at,
  last_login_at,
  created_at,
  updated_at
)
select
  owner_user_id,
  employee_id,
  account,
  password_hash,
  'employee',
  status,
  password_updated_at,
  last_login_at,
  created_at,
  updated_at
from public.employee_app_accounts
on conflict do nothing;

-- Verification after deployment:
-- select count(*) from public.employee_app_accounts;
-- select count(*) from public.workspace_accounts where account_type = 'employee';
-- select old.owner_user_id, old.employee_id, old.account
-- from public.employee_app_accounts old
-- left join public.workspace_accounts next
--   on next.owner_user_id = old.owner_user_id and next.employee_id = old.employee_id
-- where next.id is null;
