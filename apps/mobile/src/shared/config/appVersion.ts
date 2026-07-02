import Constants from 'expo-constants';

const APP_JSON_VERSION = String((require('../../../app.json') as {expo?: {version?: string}}).expo?.version || '').trim();

/**
 * App 内“当前版本”必须优先读取 Expo 原生运行时配置，而不是直接读取 JS bundle 里的 app.json。
 * 本地/官网 release 曾出现过 Android manifest 已是 0.1.28、但增量构建复用了旧 index.android.bundle
 * 导致 require(app.json) 仍返回 0.1.26 的情况；Constants.expoConfig 来自 APK 内 assets/app.config，
 * 能跟原生构建产物一起更新。app.json 只作为开发/异常环境兜底。
 */
export function getLocalAppVersion(fallback = '') {
  return String(Constants.expoConfig?.version || '').trim()
    || APP_JSON_VERSION
    || fallback;
}
