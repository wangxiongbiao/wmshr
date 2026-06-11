alter table public.attendance_config
  add column if not exists overtime_rule_enabled boolean not null default false,
  add column if not exists holiday_dates date[] not null default '{}';

comment on column public.attendance_config.overtime_rule_enabled is '是否启用加班倍率规则：关闭时统一按 ot_hourly_fee，开启时按工作日/周末/节假日倍率计算。';
comment on column public.attendance_config.holiday_dates is '账号级手工维护的法定节假日日期列表，用于加班 3 倍判定。';
