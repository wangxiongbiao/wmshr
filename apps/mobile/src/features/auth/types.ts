export interface EmployeeProfile {
  // 后端 mapEmployeeRow 返回数字 id；移动端保持同一契约，避免后续带 token 调员工接口时再做字符串/数字转换。
  id: number;
  employeeNo: string;
  name: string;
  nickname?: string;
  gender?: string;
  country?: string;
  phone?: string;
  role: string;
  dept: string;
  photo?: string | null;
  status: 'active' | 'on_leave' | 'probation' | 'disabled' | 'resigned';
}

export interface MobileLoginResponse {
  token: string;
  expiresAt: string;
  employee: EmployeeProfile;
}
