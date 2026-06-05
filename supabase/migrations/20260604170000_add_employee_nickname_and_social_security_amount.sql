-- 员工昵称用于 v2 员工卡片展示；保持非空默认值，兼容历史员工记录和现有前端空字符串处理。
alter table public.employees
  add column if not exists nickname text not null default '';

-- 薪资结果需要单独沉淀本月实际社保扣款，避免把泰国固定社保与缅甸按天社保混入 total_deduction 后无法核对。
alter table public.monthly_payroll_results
  add column if not exists social_security_amount numeric not null default 0;

alter table public.monthly_payroll_results
  add constraint monthly_payroll_results_social_security_amount_non_negative
  check (social_security_amount >= 0) not valid;

alter table public.monthly_payroll_results validate constraint monthly_payroll_results_social_security_amount_non_negative;
