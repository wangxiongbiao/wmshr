alter table public.employees
  add column if not exists overtime_hourly_fee numeric(12,2),
  add column if not exists overtime_rule_enabled boolean;

comment on column public.employees.overtime_hourly_fee is '员工级加班费基数；为空时回退账号级 attendance_config.ot_hourly_fee。';
comment on column public.employees.overtime_rule_enabled is '员工级是否启用倍率规则；为空时回退账号级 attendance_config.overtime_rule_enabled。';
