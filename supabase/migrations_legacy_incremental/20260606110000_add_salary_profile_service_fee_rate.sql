-- 服务费比例会直接影响月度薪资金额，必须进入 salary_profiles 生效档案。
-- 不能只保存在 employees：员工后续改比例时，历史工资条需要继续解释当次核算使用的比例。
alter table public.salary_profiles
  add column if not exists service_fee_rate numeric not null default 0;

alter table public.salary_profiles
  add constraint salary_profiles_service_fee_rate_non_negative
  check (service_fee_rate >= 0) not valid;

-- 旧档案按员工当前比例回填一次；后续由 ensureSalaryProfileForEmployee 在员工保存时维护新快照。
update public.salary_profiles sp
set service_fee_rate = coalesce(e.service_fee_rate, 0),
    updated_at = now()
from public.employees e
where sp.employee_id = e.id
  and sp.owner_user_id = e.owner_user_id
  and coalesce(sp.service_fee_rate, 0) = 0
  and coalesce(e.service_fee_rate, 0) > 0;

alter table public.salary_profiles validate constraint salary_profiles_service_fee_rate_non_negative;
