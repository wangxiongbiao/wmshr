import {httpClient} from '../../../shared/api/httpClient';
import {MobilePayrollResultDetail} from '../types';

function authHeaders(accessToken: string) {
  return {Authorization: `Bearer ${accessToken}`};
}

export async function fetchMobilePayrollResultDetail(accessToken: string, payrollResultId: number): Promise<MobilePayrollResultDetail> {
  return httpClient<MobilePayrollResultDetail>(`/api/mobile/payroll-results/${payrollResultId}`, {
    headers: authHeaders(accessToken),
  });
}
