create table if not exists public.leave_requests (
  id bigserial primary key,
  owner_user_id uuid not null references auth.users (id) on delete cascade,
  employee_id bigint not null references public.employees(id) on delete cascade,
  type text not null check (type in ('personal', 'sick', 'annual', 'special')),
  start_date date not null,
  end_date date not null,
  duration_days integer not null check (duration_days > 0),
  reason text not null,
  status text not null default 'pending' check (status in ('pending', 'approved', 'rejected')),
  submitted_at timestamptz not null default now(),
  approved_at timestamptz,
  rejected_at timestamptz,
  approver_user_id uuid references auth.users (id) on delete set null,
  approval_note text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (end_date >= start_date)
);

create index if not exists idx_leave_requests_owner_employee_created
  on public.leave_requests(owner_user_id, employee_id, created_at desc);

create index if not exists idx_leave_requests_owner_status_created
  on public.leave_requests(owner_user_id, status, created_at desc);

create index if not exists idx_leave_requests_owner_employee_start_end
  on public.leave_requests(owner_user_id, employee_id, start_date, end_date);

alter table public.attendance_records
  add column if not exists leave_request_id bigint references public.leave_requests(id) on delete set null;

create index if not exists idx_attendance_records_leave_request_id
  on public.attendance_records(leave_request_id);

comment on table public.leave_requests is '员工端请假申请主表：保存 pending/approved/rejected 审批态，批准后再回写正式考勤链路。';
comment on column public.leave_requests.type is '员工端请假类型，必须与移动端 LeaveType 契约保持一致。';
comment on column public.leave_requests.duration_days is '请假天数由后端统一按含首尾日计算，避免信任前端提交值。';
comment on column public.leave_requests.approval_note is '后台审批备注；批准和驳回都复用该字段承接最后一次审批说明。';
comment on column public.attendance_records.leave_request_id is '该条考勤记录若来自已批准请假，则回挂到对应 leave_requests，便于重算和回溯。';

alter table public.leave_requests enable row level security;

revoke all on table public.leave_requests from anon, authenticated;
grant all on table public.leave_requests to service_role;
grant usage, select on sequence public.leave_requests_id_seq to service_role;
