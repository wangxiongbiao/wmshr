create table if not exists public.mobile_app_releases (
  platform text primary key check (platform in ('android')),
  version text not null,
  content text not null,
  url text not null,
  created_at timestamptz not null default timezone('utc'::text, now()),
  updated_at timestamptz not null default timezone('utc'::text, now())
);

alter table public.mobile_app_releases enable row level security;

revoke all on table public.mobile_app_releases from anon, authenticated;
grant all on table public.mobile_app_releases to service_role;

-- 门户下载区和移动端在线更新都只需要“当前最新 Android 包”这一条记录；先固定为单平台单行，避免现在就过度扩成历史版本或灰度策略。
