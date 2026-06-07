import {httpClient} from '../../../shared/api/httpClient';
import {SopDocument} from '../types';

function authHeaders(accessToken: string) {
  // SOP 列表、详情、阅读确认都由后端按员工 token 过滤可见范围；前端不得提交 employeeId 以免形成越权入口。
  return {Authorization: `Bearer ${accessToken}`};
}

export async function fetchSopDocuments(accessToken: string, {keyword = '', limit = 10, offset = 0}: {keyword?: string; limit?: number; offset?: number} = {}): Promise<SopDocument[]> {
  const params = new URLSearchParams();
  if (keyword.trim()) {
    params.set('keyword', keyword.trim());
  }
  params.set('limit', String(limit));
  params.set('offset', String(offset));
  return httpClient<SopDocument[]>(`/api/mobile/sops?${params.toString()}`, {
    headers: authHeaders(accessToken),
  });
}

export async function fetchSopDocument(accessToken: string, sopId: string): Promise<SopDocument> {
  return httpClient<SopDocument>(`/api/mobile/sops/${sopId}`, {
    headers: authHeaders(accessToken),
  });
}

export async function confirmSopRead(accessToken: string, sopId: string): Promise<SopDocument> {
  return httpClient<SopDocument>(`/api/mobile/sops/${sopId}/read`, {
    method: 'POST',
    headers: authHeaders(accessToken),
  });
}
