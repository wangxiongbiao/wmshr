-- 全勤奖和社保金属于员工固定档案字段；员工新增/编辑直接维护，薪资计算按固定加项/扣项读取。
-- 若后续把薪资档案拆得更细，先同步检查 apps/admin/server/index.js 中员工保存与 calculateMonthlyPayroll 的字段来源。
alter table public.employees
  add column if not exists attendance_bonus numeric not null default 0,
  add column if not exists social_security numeric not null default 0;

alter table public.employees
  add constraint employees_attendance_bonus_non_negative check (attendance_bonus >= 0) not valid,
  add constraint employees_social_security_non_negative check (social_security >= 0) not valid;

alter table public.employees validate constraint employees_attendance_bonus_non_negative;
alter table public.employees validate constraint employees_social_security_non_negative;
