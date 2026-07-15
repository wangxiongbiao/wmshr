alter table public.employees
  add column if not exists is_dispatch_personnel boolean not null default false;

comment on column public.employees.is_dispatch_personnel is '是否派遣人员：派遣人员社保按考勤天数计算，employees.social_security 作为每日金额；非派遣人员按月固定社保金计算。';
