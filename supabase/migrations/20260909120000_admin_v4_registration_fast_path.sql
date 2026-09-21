-- Atomic and idempotent bootstrap for a newly confirmed Admin V4 Auth user.
-- This RPC is deliberately service_role-only; the application obtains p_owner_user_id
-- exclusively from Supabase Auth's signUp response.

create index if not exists idx_workspace_accounts_active_owner_id
  on public.workspace_accounts (owner_user_id, id)
  where status = 'active';

create or replace function public.bootstrap_admin_v4_tenant(
  p_owner_user_id uuid,
  p_email text,
  p_display_name text,
  p_registration_mode text,
  p_password_hash text default null
)
returns table (
  account_id uuid,
  owner_user_id uuid,
  account text,
  display_name text,
  role_name text,
  permissions jsonb,
  allowed_warehouses text[]
)
language plpgsql
security definer
set search_path = public, auth, pg_temp
as $$
declare
  v_email text := lower(btrim(coalesce(p_email, '')));
  v_display_name text := nullif(btrim(coalesce(p_display_name, '')), '');
  v_mode text := lower(btrim(coalesce(p_registration_mode, '')));
  v_linked_owner uuid;
  v_account_id uuid;
  v_now timestamptz := timezone('utc'::text, now());
begin
  if p_owner_user_id is null then
    raise exception using errcode = '22023', message = 'owner user id is required';
  end if;
  if v_email !~ '^[^[:space:]@]+@[^[:space:]@]+\.[^[:space:]@]+$' then
    raise exception using errcode = '22023', message = 'a valid email is required';
  end if;
  if v_mode not in ('email', 'google') then
    raise exception using errcode = '22023', message = 'registration mode is invalid';
  end if;
  if not exists (select 1 from auth.users where id = p_owner_user_id) then
    raise exception using errcode = '23503', message = 'owner auth user does not exist';
  end if;

  -- Serialize same-email registration and refuse to repoint a canonical owner.
  select email_link.owner_user_id into v_linked_owner
  from public.admin_owner_email_links as email_link
  where email_link.email = v_email
  for update;
  if found and v_linked_owner <> p_owner_user_id then
    raise exception using errcode = '23505', message = 'email already belongs to another workspace owner';
  end if;

  select identity_link.owner_user_id into v_linked_owner
  from public.admin_owner_identity_links as identity_link
  where identity_link.auth_user_id = p_owner_user_id
  for update;
  if found and v_linked_owner <> p_owner_user_id then
    raise exception using errcode = '23505', message = 'auth user already belongs to another workspace owner';
  end if;

  insert into public.admin_owner_email_links (
    email, owner_user_id, created_by_auth_user_id, updated_at
  ) values (
    v_email, p_owner_user_id, p_owner_user_id, v_now
  ) on conflict on constraint admin_owner_email_links_pkey do update
    set updated_at = excluded.updated_at;

  insert into public.admin_owner_identity_links (
    auth_user_id, owner_user_id, email, provider, providers, last_seen_at, updated_at
  ) values (
    p_owner_user_id, p_owner_user_id, v_email, v_mode, array[v_mode], v_now, v_now
  ) on conflict on constraint admin_owner_identity_links_pkey do update
    set provider = excluded.provider,
        providers = excluded.providers,
        last_seen_at = excluded.last_seen_at,
        updated_at = excluded.updated_at;

  insert into public.workspace_bootstrap_states (
    owner_user_id, bootstrap_mode, bootstrap_source, status, registration_mode,
    bootstrapped_by_email, last_error, updated_at
  ) values (
    p_owner_user_id, 'tenant_init', 'auto', 'pending', v_mode,
    v_email, null, v_now
  ) on conflict on constraint workspace_bootstrap_states_pkey do update
    set bootstrap_mode = 'tenant_init',
        bootstrap_source = 'auto',
        registration_mode = excluded.registration_mode,
        bootstrapped_by_email = excluded.bootstrapped_by_email,
        last_error = null,
        updated_at = excluded.updated_at;

  insert into public.workspace_accounts (
    owner_user_id, employee_id, account, password_hash, account_type, status, updated_at
  ) values (
    p_owner_user_id, null, v_email, p_password_hash, 'superadmin', 'active', v_now
  ) on conflict on constraint workspace_accounts_owner_user_id_account_key do update
    set password_hash = coalesce(public.workspace_accounts.password_hash, excluded.password_hash),
        account_type = 'superadmin',
        status = 'active',
        updated_at = excluded.updated_at
  returning id into v_account_id;

  insert into public.workspace_members (
    owner_user_id, account_id, display_name, role_name, permissions, allowed_warehouses, updated_at
  ) values (
    p_owner_user_id, v_account_id, coalesce(v_display_name, v_email), '超级管理员',
    '["*"]'::jsonb, array['*']::text[], v_now
  ) on conflict on constraint workspace_members_owner_user_id_account_id_key do update
    set display_name = excluded.display_name,
        role_name = '超级管理员',
        permissions = '["*"]'::jsonb,
        allowed_warehouses = array['*']::text[],
        updated_at = excluded.updated_at;

  insert into public.workspace_nodes (
    owner_user_id, continent, country_name, country_code, flag_emoji, currency
  ) values
    (p_owner_user_id, 'Asia', '韩国', 'KR', '🇰🇷', 'KRW'),
    (p_owner_user_id, 'Asia', '日本', 'JP', '🇯🇵', 'JPY'),
    (p_owner_user_id, 'Asia', '中国香港', 'HK', '🇭🇰', 'HKD'),
    (p_owner_user_id, 'Asia', '中国澳门', 'MO', '🇲🇴', 'MOP'),
    (p_owner_user_id, 'Asia', '马来西亚', 'MY', '🇲🇾', 'MYR'),
    (p_owner_user_id, 'Asia', '新加坡', 'SG', '🇸🇬', 'SGD'),
    (p_owner_user_id, 'Asia', '泰国', 'TH', '🇹🇭', 'THB'),
    (p_owner_user_id, 'Asia', '越南', 'VN', '🇻🇳', 'VND'),
    (p_owner_user_id, 'Asia', '文莱', 'BN', '🇧🇳', 'BND'),
    (p_owner_user_id, 'Asia', '印度尼西亚', 'ID', '🇮🇩', 'IDR'),
    (p_owner_user_id, 'Asia', '菲律宾', 'PH', '🇵🇭', 'PHP'),
    (p_owner_user_id, 'Europe', '英国', 'GB', '🇬🇧', 'GBP'),
    (p_owner_user_id, 'Europe', '法国', 'FR', '🇫🇷', 'EUR'),
    (p_owner_user_id, 'Europe', '德国', 'DE', '🇩🇪', 'EUR'),
    (p_owner_user_id, 'Americas', '美国', 'US', '🇺🇸', 'USD'),
    (p_owner_user_id, 'Africa', '埃及', 'EG', '🇪🇬', 'EGP'),
    (p_owner_user_id, 'Middle East', '阿曼', 'OM', '🇴🇲', 'OMR'),
    (p_owner_user_id, 'Middle East', '迪拜 (阿联酋)', 'AE', '🇦🇪', 'AED')
  on conflict on constraint workspace_nodes_owner_user_id_country_code_key do nothing;

  insert into public.attendance_config (owner_user_id, currency, updated_at)
  values (p_owner_user_id, 'THB', v_now)
  on conflict on constraint attendance_config_pkey do update set updated_at = excluded.updated_at;

  update public.workspace_bootstrap_states
  set status = 'complete', completed_at = v_now, last_error = null, updated_at = v_now
  where workspace_bootstrap_states.owner_user_id = p_owner_user_id;

  return query
  select a.id, a.owner_user_id, a.account, m.display_name, m.role_name,
         m.permissions, m.allowed_warehouses
  from public.workspace_accounts a
  join public.workspace_members m
    on m.owner_user_id = a.owner_user_id and m.account_id = a.id
  where a.id = v_account_id and a.owner_user_id = p_owner_user_id;
end;
$$;

revoke all on function public.bootstrap_admin_v4_tenant(uuid, text, text, text, text)
  from public, anon, authenticated;
grant execute on function public.bootstrap_admin_v4_tenant(uuid, text, text, text, text)
  to service_role;
