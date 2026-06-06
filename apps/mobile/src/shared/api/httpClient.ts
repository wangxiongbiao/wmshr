import {env} from '../config/env';

type JsonObject = Record<string, unknown>;

export async function httpClient<T>(path: string, init?: RequestInit): Promise<T> {
  const baseUrl = env.apiBaseUrl.replace(/\/$/, '');
  const requestPath = path.startsWith('/') ? path : `/${path}`;

  if (!baseUrl) {
    throw new Error('Mobile API URL is not configured');
  }

  const response = await fetch(`${baseUrl}${requestPath}`, {
    ...init,
    headers: {
      'Content-Type': 'application/json',
      ...(init?.headers || {}),
    },
  });

  const payload = await response.json().catch(() => null) as JsonObject | null;

  if (!response.ok) {
    throw new Error(String(payload?.error || 'Request failed'));
  }

  return payload as T;
}
