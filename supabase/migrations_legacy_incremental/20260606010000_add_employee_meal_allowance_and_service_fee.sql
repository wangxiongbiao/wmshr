-- 餐补费用和服务费比例属于员工固定档案字段；考勤和薪资计算只读取这里，避免不同模块各自维护同一口径。
alter table public.employees
  add column if not exists meal_allowance numeric not null default 0,
  add column if not exists service_fee_rate numeric not null default 0;

alter table public.employees
  add constraint employees_meal_allowance_non_negative check (meal_allowance >= 0) not valid,
  add constraint employees_service_fee_rate_non_negative check (service_fee_rate >= 0) not valid;

alter table public.employees validate constraint employees_meal_allowance_non_negative;
alter table public.employees validate constraint employees_service_fee_rate_non_negative;

-- 每日考勤结果沉淀当日实际餐补金额；只有正常出勤会在后端计算中写入非 0，列表和导出都直接展示该结果。
alter table public.attendance_calculation_results
  add column if not exists meal_allowance_amount numeric not null default 0;

alter table public.attendance_calculation_results
  add constraint attendance_calculation_results_meal_allowance_amount_non_negative
  check (meal_allowance_amount >= 0) not valid;

alter table public.attendance_calculation_results validate constraint attendance_calculation_results_meal_allowance_amount_non_negative;

-- 薪资结果必须保存计算后的服务费金额；列表、工资单、审批/确认接口都读取该沉淀值，避免历史工资随员工比例修改而漂移。
alter table public.monthly_payroll_results
  add column if not exists service_fee_amount numeric not null default 0;

alter table public.monthly_payroll_results
  add constraint monthly_payroll_results_service_fee_amount_non_negative
  check (service_fee_amount >= 0) not valid;

alter table public.monthly_payroll_results validate constraint monthly_payroll_results_service_fee_amount_non_negative;
