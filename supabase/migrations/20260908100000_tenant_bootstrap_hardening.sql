-- Harden tenant bootstrap without introducing a second tenant identifier.
-- auth.users.id remains the canonical owner_user_id for each tenant.

alter table public.workspace_bootstrap_states
  add column if not exists status text not null default 'complete',
  add column if not exists registration_mode text,
  add column if not exists last_error text,
  add column if not exists completed_at timestamptz;

alter table public.workspace_bootstrap_states
  drop constraint if exists workspace_bootstrap_states_bootstrap_mode_check;

alter table public.workspace_bootstrap_states
  add constraint workspace_bootstrap_states_bootstrap_mode_check
  check (bootstrap_mode in ('demo_seed', 'tenant_init'));

alter table public.workspace_bootstrap_states
  drop constraint if exists workspace_bootstrap_states_status_check;

alter table public.workspace_bootstrap_states
  add constraint workspace_bootstrap_states_status_check
  check (status in ('pending', 'complete', 'failed'));

alter table public.workspace_bootstrap_states
  drop constraint if exists workspace_bootstrap_states_registration_mode_check;

alter table public.workspace_bootstrap_states
  add constraint workspace_bootstrap_states_registration_mode_check
  check (registration_mode is null or registration_mode in ('email', 'google'));

-- A composite key lets PostgreSQL prove that a member and its account belong
-- to the same tenant, instead of relying only on application checks.
create unique index if not exists uq_workspace_accounts_owner_id
  on public.workspace_accounts (owner_user_id, id);

alter table public.workspace_accounts
  alter column password_hash drop not null;

alter table public.workspace_accounts
  drop constraint if exists workspace_accounts_password_required_check;

alter table public.workspace_accounts
  add constraint workspace_accounts_password_required_check
  check (account_type = 'superadmin' or password_hash is not null);

create unique index if not exists uq_workspace_accounts_account_global
  on public.workspace_accounts (lower(account));

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'workspace_members_owner_account_fkey'
      and conrelid = 'public.workspace_members'::regclass
  ) then
    alter table public.workspace_members
      add constraint workspace_members_owner_account_fkey
      foreign key (owner_user_id, account_id)
      references public.workspace_accounts (owner_user_id, id)
      on delete cascade;
  end if;
end
$$;
