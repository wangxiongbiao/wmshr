const REQUEST_TIMEOUT_MS = 30_000;

/** 服务端返回的业务错误（含 HTTP 状态码），message 可直接展示给操作员 */
export class ApiError extends Error {
  constructor(public status: number, message: string) {
    super(message);
    this.name = "ApiError";
  }
}

/** 调用 v4 管理端接口：自动携带登录凭证、JSON 编解码与超时 */
export async function apiRequest<T>(path: string, init: { method?: string; body?: unknown } = {}): Promise<T> {
  let response: Response;
  try {
    response = await fetch(`/api/v4/admin${path}`, {
      method: init.method ?? "GET",
      headers: {
        ...(init.body !== undefined ? { "Content-Type": "application/json" } : {}),
        Authorization: `Bearer ${localStorage.getItem("wms_admin_token") || ""}`,
      },
      body: init.body !== undefined ? JSON.stringify(init.body) : undefined,
      signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
    });
  } catch (error) {
    throw new ApiError(0, error instanceof DOMException && error.name === "TimeoutError" ? "请求超时，请稍后重试" : "网络连接失败，请检查网络后重试");
  }
  if (response.status === 204) return undefined as T;
  const data = await response.json().catch(() => ({}));
  if (!response.ok) throw new ApiError(response.status, data.error || `请求失败（${response.status}）`);
  return data as T;
}
