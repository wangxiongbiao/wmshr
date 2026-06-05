create table if not exists public.sop_documents (
  id bigserial primary key,
  owner_user_id uuid not null references auth.users (id) on delete cascade,
  title text not null,
  content_html text not null,
  target_type text not null default 'all' check (target_type in ('all', 'specific')),
  creator text not null,
  status text not null default 'published' check (status in ('draft', 'published')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.sop_document_targets (
  id bigserial primary key,
  owner_user_id uuid not null references auth.users (id) on delete cascade,
  sop_id bigint not null references public.sop_documents(id) on delete cascade,
  employee_id bigint not null references public.employees(id) on delete cascade,
  created_at timestamptz not null default now(),
  unique (owner_user_id, sop_id, employee_id)
);

create table if not exists public.sop_assets (
  id bigserial primary key,
  owner_user_id uuid not null references auth.users (id) on delete cascade,
  sop_id bigint not null references public.sop_documents(id) on delete cascade,
  kind text not null check (kind in ('image', 'attachment')),
  name text not null,
  url text not null,
  size_label text not null default '',
  sort_order integer not null default 0,
  created_at timestamptz not null default now()
);

create table if not exists public.sop_reads (
  id bigserial primary key,
  owner_user_id uuid not null references auth.users (id) on delete cascade,
  sop_id bigint not null references public.sop_documents(id) on delete cascade,
  employee_id bigint not null references public.employees(id) on delete cascade,
  read_at timestamptz not null default now(),
  unique (owner_user_id, sop_id, employee_id)
);

-- SOP 管理是账号级内容发布模块；所有索引都把 owner_user_id 放在前面，避免后端 owner 过滤退化成跨账号扫描。
create index if not exists idx_sop_documents_owner_status_created on public.sop_documents(owner_user_id, status, created_at desc);
create index if not exists idx_sop_documents_owner_title on public.sop_documents(owner_user_id, title);
create index if not exists idx_sop_targets_owner_employee on public.sop_document_targets(owner_user_id, employee_id, sop_id);
create index if not exists idx_sop_assets_owner_sop_order on public.sop_assets(owner_user_id, sop_id, kind, sort_order);
create index if not exists idx_sop_reads_owner_sop on public.sop_reads(owner_user_id, sop_id, employee_id);
create index if not exists idx_sop_reads_owner_employee on public.sop_reads(owner_user_id, employee_id, sop_id);

alter table public.sop_documents enable row level security;
alter table public.sop_document_targets enable row level security;
alter table public.sop_assets enable row level security;
alter table public.sop_reads enable row level security;

-- 当前后台 API 统一使用 service role 按 Google 登录用户显式过滤 owner_user_id；先撤销客户端直连权限，避免绕过服务端账号隔离。
revoke all on table public.sop_documents from anon, authenticated;
revoke all on table public.sop_document_targets from anon, authenticated;
revoke all on table public.sop_assets from anon, authenticated;
revoke all on table public.sop_reads from anon, authenticated;
