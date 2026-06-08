type RuntimeConfig = {
  apiBaseUrl?: string;
  appEnv?: string;
};

declare global {
  var __WMSHR_RUNTIME_CONFIG__: RuntimeConfig | undefined;
}

const runtimeConfig = globalThis.__WMSHR_RUNTIME_CONFIG__ ?? {};

export const env = {
  // Expo Go 运行在手机上时不能访问电脑的 127.0.0.1；默认使用当前开发机局域网 IP，生产/其他网络可用 EXPO_PUBLIC_API_BASE_URL 覆盖。
  apiBaseUrl: runtimeConfig.apiBaseUrl ?? process.env.EXPO_PUBLIC_API_BASE_URL ?? 'http://172.16.11.231:8788',
  appEnv: runtimeConfig.appEnv ?? process.env.EXPO_PUBLIC_APP_ENV ?? 'local',
};

export type AppEnv = typeof env;

// env 是移动端配置层唯一入口；页面和 service 不应直接读取 process.env，后续接真实后端时只在这里收口变量名和默认值。
export function hasApiBaseUrl() {
  return env.apiBaseUrl.trim().length > 0;
}
