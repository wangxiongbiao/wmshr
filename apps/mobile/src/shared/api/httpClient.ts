export async function httpClient<T>(_path: string, _init?: RequestInit): Promise<T> {
  // 统一 HTTP 入口先占位，后续接 Admin API/Supabase 时在这里补 token、错误归一化和基础 URL。
  throw new Error('httpClient is not wired yet');
}
