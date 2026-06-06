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

export async function fetchCurrentEmployee(accessToken: string): Promise<EmployeeProfile> {
  const response = await httpClient<{employee: EmployeeProfile}>('/api/mobile/auth/me', {
    headers: {Authorization: `Bearer ${accessToken}`},
  });
  return response.employee;
}
