-- 员工 App 账号独立于后台 Google 管理员账号；owner_user_id 继续沿用现有后台租户隔离，employee_id 绑定员工档案。
-- 密码只保存服务端哈希，不保存明文；Admin 一键复制仅复制固定初始/重置密码 Aa123456。
create table if not exists public.employee_app_accounts (
  id bigserial primary key,
  owner_user_id uuid not null references auth.users (id) on delete cascade,
  employee_id bigint not null references public.employees(id) on delete cascade,
  account text not null,
  password_hash text not null,
  status text not null default 'active' check (status in ('active', 'disabled')),
  password_updated_at timestamptz not null default now(),
  last_login_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (owner_user_id, employee_id),
  unique (owner_user_id, account)
);

create index if not exists idx_employee_app_accounts_owner_account
  on public.employee_app_accounts(owner_user_id, account);

create index if not exists idx_employee_app_accounts_employee
  on public.employee_app_accounts(owner_user_id, employee_id);

alter table public.employee_app_accounts enable row level security;

-- 当前后台和移动端登录接口都经 Express service role 访问；不开放客户端直连，避免员工账号绕过后端校验。
revoke all on table public.employee_app_accounts from anon, authenticated;
grant all on table public.employee_app_accounts to service_role;
grant usage, select on sequence public.employee_app_accounts_id_seq to service_role;
