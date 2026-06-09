create index if not exists idx_attendance_calc_results_owner_date_desc
  on public.attendance_calculation_results (owner_user_id, date desc);

create index if not exists idx_attendance_calc_results_owner_employee_date
  on public.attendance_calculation_results (owner_user_id, employee_id, date desc);
