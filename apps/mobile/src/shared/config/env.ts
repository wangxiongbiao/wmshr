type RuntimeConfig = {
  apiBaseUrl?: string;
  appEnv?: string;
};

declare global {
  var __WMSHR_RUNTIME_CONFIG__: RuntimeConfig | undefined;
}

const runtimeConfig = globalThis.__WMSHR_RUNTIME_CONFIG__ ?? {};
// React Native 原生环境里 `window` 可能存在，但 `window.location` 并不存在；
// 这里必须先判空 location，避免 release 包在 env 初始化阶段就因读取 `.search` 崩溃。
const webLocation = typeof window !== 'undefined' ? window.location : undefined;
const webLocationSearch = webLocation?.search ?? '';
const webSearchParams = webLocationSearch ? new URLSearchParams(webLocationSearch) : null;
const queryAppEnv = webSearchParams?.get('appEnv') || '';
const queryApiBaseUrl = webSearchParams?.get('apiBaseUrl') || '';

function isPrivateIpv4Host(hostname: string) {
  const parts = hostname.split('.').map((part) => Number(part));
  if (parts.length !== 4 || parts.some((part) => Number.isNaN(part) || part < 0 || part > 255)) {
    return false;
  }
  return parts[0] === 10
    || (parts[0] === 172 && parts[1] >= 16 && parts[1] <= 31)
    || (parts[0] === 192 && parts[1] === 168);
}

function shouldUseCurrentWebHost(hostname: string) {
  return hostname === 'localhost'
    || hostname === '127.0.0.1'
    || isPrivateIpv4Host(hostname)
    || hostname.endsWith('.ts.net');
}

function resolveDefaultApiBaseUrl() {
  if (queryApiBaseUrl) {
    return queryApiBaseUrl;
  }
  if (runtimeConfig.apiBaseUrl) {
    return runtimeConfig.apiBaseUrl;
  }
  if (webLocation?.hostname && shouldUseCurrentWebHost(webLocation.hostname)) {
    // mobile web 从本机局域网 IP / localhost / Tailscale 域名打开时，要优先命中当前设备对应的 8788；
    // 即使 .env 里还保留线上 EXPO_PUBLIC_API_BASE_URL，也不能覆盖这个联调入口，否则页面会跨到错误后端并表现成网络异常。
    return `${webLocation.protocol}//${webLocation.hostname}:8788`;
  }
  if (process.env.EXPO_PUBLIC_API_BASE_URL) {
    return process.env.EXPO_PUBLIC_API_BASE_URL;
  }
  // 非 web 环境（如 Expo Go）没有可复用的当前 hostname，保留历史局域网默认值作为最后兜底。
  return 'http://172.16.11.231:8788';
}

export const env = {
  apiBaseUrl: resolveDefaultApiBaseUrl(),
  appEnv: queryAppEnv || runtimeConfig.appEnv || process.env.EXPO_PUBLIC_APP_ENV || 'local',
};

export type AppEnv = typeof env;

// env 是移动端配置层唯一入口；页面和 service 不应直接读取 process.env，后续接真实后端时只在这里收口变量名和默认值。
export function hasApiBaseUrl() {
  return env.apiBaseUrl.trim().length > 0;
}
