import {EmployeeProfile} from '../types';

export async function fetchCurrentEmployee(): Promise<EmployeeProfile> {
  // 第一阶段 API 先保持 mock 契约；真实登录接入时，页面仍调用本 service，不直接耦合 Supabase/Admin API。
  return {
    id: 'emp-demo-thin-thin-aung',
    employeeNo: 'EMP-0001',
    name: 'Thin Thin Aung',
    role: '拣货员',
    dept: 'A区入库',
    country: 'MM',
    status: 'active',
  };
}
