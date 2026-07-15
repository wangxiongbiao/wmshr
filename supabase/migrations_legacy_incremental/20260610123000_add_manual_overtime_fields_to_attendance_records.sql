alter table public.attendance_records
  add column if not exists manual_overtime_hourly_fee numeric(12,2),
  add column if not exists manual_overtime_use_rule boolean;

comment on column public.attendance_records.manual_overtime_hourly_fee is '人工调整该条考勤时单独填写的加班时薪基数，按员工薪资币种存储；为空时回退系统默认规则。';
comment on column public.attendance_records.manual_overtime_use_rule is '人工调整该条考勤时是否启用倍率规则；为空时回退系统全局开关。';
