-- Migration: Add tax_rate to workspace_employees and tax_deduction to monthly_payroll_results
-- Default personal income tax rate: 5% (5.00)

alter table public.workspace_employees
  add column if not exists tax_rate numeric(6,2) not null default 5.0;

comment on column public.workspace_employees.tax_rate is '个人所得税扣缴比例(百分比数字，默认 5.0 代表 5%)';

alter table public.monthly_payroll_results
  add column if not exists tax_deduction numeric(12,2) not null default 0;

comment on column public.monthly_payroll_results.tax_deduction is '月度薪资核算时代扣的个人所得税金额';
