-- 员工端登录接口只输入 account/password，不先选择租户。
-- 因此 account 必须全局唯一；租户数据隔离仍由 owner_user_id + employee_id 绑定和后端 token 复查保证。
-- 该约束防止不同 owner 下重复的 wms0001 账号导致登录入口无法判断租户。
create unique index if not exists employee_app_accounts_account_global_unique
  on public.employee_app_accounts(account);
