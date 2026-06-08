import {env} from '../config/env';

type JsonObject = Record<string, unknown>;
type DesktopResponse = {
  ok: boolean;
  status: number;
  statusText: string;
  headers: Record<string, string>;
  contentType: string;
  text: string;
};

declare global {
  var __WMSHR_DESKTOP_API__:
    | {
        request(request: {
          url: string;
          method?: string;
          headers?: Record<string, string>;
          body?: string;
        }): Promise<DesktopResponse>;
      }
    | undefined;
}

export async function httpClient<T>(path: string, init?: RequestInit): Promise<T> {
  const baseUrl = env.apiBaseUrl.replace(/\/$/, '');
  const requestPath = path.startsWith('/') ? path : `/${path}`;
  const url = `${baseUrl}${requestPath}`;

  if (!baseUrl) {
    throw new Error('Mobile API URL is not configured');
  }

  const headers = {
    'Content-Type': 'application/json',
    ...(init?.headers || {}),
  } as Record<string, string>;

  if (globalThis.__WMSHR_DESKTOP_API__) {
    const response = await globalThis.__WMSHR_DESKTOP_API__.request({
      url,
      method: init?.method || 'GET',
      headers,
      body: typeof init?.body === 'string' ? init.body : undefined,
    });
    const payload = response.text ? await Promise.resolve().then(() => JSON.parse(response.text) as JsonObject).catch(() => null) : null;

    if (!response.ok) {
      throw new Error(String(payload?.error || response.statusText || 'Request failed'));
    }

    return payload as T;
  }

  const response = await fetch(url, {
    ...init,
    headers,
  });

  const payload = await response.json().catch(() => null) as JsonObject | null;

  if (!response.ok) {
    throw new Error(String(payload?.error || 'Request failed'));
  }

  return payload as T;
}
