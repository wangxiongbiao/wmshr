create table if not exists public.customer_accounts (
  id bigserial primary key,
  owner_user_id uuid not null references auth.users (id) on delete cascade,
  customer_code text not null,
  name text not null,
  contact text not null default '',
  currency text not null default 'CNY',
  available_limit numeric(14,2) not null default 0,
  credit_limit numeric(14,2) not null default 0,
  billing_template text not null default '',
  status text not null default 'enabled' check (status in ('enabled', 'disabled')),
  shops jsonb not null default '[]'::jsonb,
  credit_logs jsonb not null default '[]'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (owner_user_id, customer_code)
);

-- 客户管理是按账号隔离的业务台账；查询、排序和唯一约束都把 owner_user_id 置前，避免分享环境下跨账号误扫/误判重名。
create index if not exists idx_customer_accounts_owner_status_updated
  on public.customer_accounts(owner_user_id, status, updated_at desc);
create index if not exists idx_customer_accounts_owner_name
  on public.customer_accounts(owner_user_id, name);

alter table public.customer_accounts enable row level security;

-- 当前后台统一经 server/index.js 用 service role 显式按 owner_user_id 过滤，先关闭客户端直接访问，避免绕过后端校验和快照写入规范。
revoke all on table public.customer_accounts from anon, authenticated;
