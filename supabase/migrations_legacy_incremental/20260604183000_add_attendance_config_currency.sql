-- 考勤 v2 的加班费标准默认按泰铢录入，但允许账号级全局规则切换币种。
-- 个人考勤结果仍按员工薪资币种展示；服务端计算时会把全局规则币种换算到员工币种。
alter table public.attendance_config
  add column if not exists currency text not null default 'THB';

alter table public.attendance_config
  add constraint attendance_config_currency_check
  check (currency in ('THB', 'USD', 'MYR', 'IDR'));
