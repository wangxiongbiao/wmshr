create table if not exists public.admin_goods_snapshots (
  owner_user_id uuid primary key references auth.users(id) on delete cascade,
  snapshot jsonb not null default '[]'::jsonb,
  updated_at timestamptz not null default now()
);

create table if not exists public.admin_expense_snapshots (
  owner_user_id uuid primary key references auth.users(id) on delete cascade,
  expenses jsonb not null default '[]'::jsonb,
  categories jsonb not null default '[]'::jsonb,
  updated_at timestamptz not null default now()
);

create index if not exists admin_goods_snapshots_updated_at_idx
  on public.admin_goods_snapshots (updated_at desc);

create index if not exists admin_expense_snapshots_updated_at_idx
  on public.admin_expense_snapshots (updated_at desc);

comment on table public.admin_goods_snapshots is
  'Admin v3 goods 模块的账号级快照存储；在保持原型 UI 整表回写交互的前提下，用服务端持久化替代 localStorage。';

comment on table public.admin_expense_snapshots is
  'Admin v3 expenses 模块的账号级快照存储；同时保存费用记录列表与自定义类别，避免分开保存造成历史记录与类别配置错位。';
