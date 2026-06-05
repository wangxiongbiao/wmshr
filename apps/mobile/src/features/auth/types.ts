export interface EmployeeProfile {
  id: string;
  employeeNo: string;
  name: string;
  nickname?: string;
  gender?: string;
  country?: string;
  phone?: string;
  role: string;
  dept: string;
  status: 'active' | 'on_leave' | 'probation' | 'disabled' | 'resigned';
}
