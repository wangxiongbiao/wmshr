-- 考勤规则名称必须按账号隔离唯一，不能全局唯一；否则新账号初始化相同默认规则名会被旧账号/全局数据阻塞。
-- 初始化接口依赖每个 owner_user_id 都能创建“白班仓储规则/晚班拣货规则”，如需改名策略先检查 apps/admin/server/index.js 的 bootstrapWorkspaceData。
alter table public.attendance_rules
  drop constraint if exists attendance_rules_name_key;

create unique index if not exists attendance_rules_owner_name_unique
  on public.attendance_rules (owner_user_id, name)
  where owner_user_id is not null;
