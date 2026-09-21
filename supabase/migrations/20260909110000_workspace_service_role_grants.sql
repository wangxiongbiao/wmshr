alter table public.workspace_accounts enable row level security;
alter table public.workspace_members enable row level security;
alter table public.workspace_nodes enable row level security;

revoke all on table public.workspace_accounts from anon, authenticated;
revoke all on table public.workspace_members from anon, authenticated;
revoke all on table public.workspace_nodes from anon, authenticated;
revoke all on table public.employee_permission_audits from anon, authenticated;

grant select, insert, update, delete on table public.workspace_accounts to service_role;
grant select, insert, update, delete on table public.workspace_members to service_role;
grant select, insert, update, delete on table public.workspace_nodes to service_role;
grant select, insert, update, delete on table public.employee_permission_audits to service_role;
grant usage, select on sequence public.employee_permission_audits_id_seq to service_role;
