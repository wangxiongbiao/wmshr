-- Migration: Add support for daily_wage, overtime rules and multipliers on workspace_employees
alter table public.workspace_employees
  add column if not exists daily_wage numeric(12,2),
  add column if not exists ot_rule_type text default 'fixed' check (ot_rule_type in ('fixed', 'multiplier')),
  add column if not exists ot_base_rate numeric(12,2),
  add column if not exists ot_multiplier_workday numeric(6,2) default 1.5,
  add column if not exists ot_multiplier_weekend numeric(6,2) default 2.0,
  add column if not exists ot_multiplier_holiday numeric(6,2) default 3.0;
