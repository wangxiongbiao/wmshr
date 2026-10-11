-- Migration: 20261015120000_add_employee_requires_attendance.sql
-- Purpose: Add requires_attendance boolean column to workspace_employees table (default true)

ALTER TABLE public.workspace_employees
ADD COLUMN IF NOT EXISTS requires_attendance boolean NOT NULL DEFAULT true;

COMMENT ON COLUMN public.workspace_employees.requires_attendance IS '是否需要考勤打卡，默认都需要 (true)';
