import {httpClient} from '../../../shared/api/httpClient';
import {EmployeeProfile, MobileLoginResponse} from '../types';

export type MobileLoginPayload = {
  account: string;
  password: string;
};

export async function loginEmployeeApp(payload: MobileLoginPayload): Promise<MobileLoginResponse> {
  // 员工端第一版使用 Express 自定义登录接口，不直连 Supabase Auth，避免和后台 Google 管理员账号体系混用。
  return httpClient<MobileLoginResponse>('/api/mobile/auth/login', {
    method: 'POST',
    body: JSON.stringify({
      account: payload.account.trim(),
      password: payload.password,
    }),
  });
}

export async function fetchCurrentEmployee(employee: EmployeeProfile | null): Promise<EmployeeProfile> {
  // 第一版还没有“当前员工资料”独立接口；登录成功返回的 employee 是 session 期间的资料来源，避免继续保留 mock 员工。
  if (!employee) {
    throw new Error('请先登录员工账号');
  }
  return employee;
}
