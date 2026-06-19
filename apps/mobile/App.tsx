import React from 'react';
import {ExpoRoot} from 'expo-router';
import {installMobileDebugLogger, mobileDebugLog} from './src/shared/debug/mobileDebugLogger';

const routerRequire = require as NodeRequire & {
  context: (path: string) => any;
};

// 调试日志必须在 ExpoRoot 挂载前尽早安装；否则启动初期的环境、更新检查和路由错误会直接丢失，无法从真机回溯。
installMobileDebugLogger();

export default function App() {
  mobileDebugLog('app_component_render');
  return <ExpoRoot context={routerRequire.context('./app')} />;
}
