-- Admin 登录入口从仅 Google 扩展到 Google + Email 后，需要把同邮箱的不同 Supabase auth identity
-- 归并到同一个 canonical owner_user_id。业务表暂时继续沿用 owner_user_id，不引入 workspace/membership 大模型。
create table if not exists public.admin_owner_email_links (
  email text primary key,
  owner_user_id uuid not null references auth.users (id) on delete cascade,
  created_by_auth_user_id uuid references auth.users (id) on delete set null,
  created_at timestamptz not null default timezone('utc'::text, now()),
  updated_at timestamptz not null default timezone('utc'::text, now()),
  constraint admin_owner_email_links_email_normalized check (email = lower(btrim(email)) and position('@' in email) > 1)
);

create table if not exists public.admin_owner_identity_links (
  auth_user_id uuid primary key references auth.users (id) on delete cascade,
  owner_user_id uuid not null references auth.users (id) on delete cascade,
  email text not null references public.admin_owner_email_links (email) on update cascade on delete cascade,
  provider text,
  providers text[] not null default '{}',
  created_at timestamptz not null default timezone('utc'::text, now()),
  updated_at timestamptz not null default timezone('utc'::text, now()),
  last_seen_at timestamptz not null default timezone('utc'::text, now())
);

create index if not exists idx_admin_owner_identity_links_owner
  on public.admin_owner_identity_links (owner_user_id);

create index if not exists idx_admin_owner_identity_links_email
  on public.admin_owner_identity_links (email);

alter table public.admin_owner_email_links enable row level security;
alter table public.admin_owner_identity_links enable row level security;

revoke all on table public.admin_owner_email_links from anon, authenticated;
revoke all on table public.admin_owner_identity_links from anon, authenticated;

grant all on table public.admin_owner_email_links to service_role;
grant all on table public.admin_owner_identity_links to service_role;
