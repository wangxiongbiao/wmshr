import React from 'react';
import {ExpoRoot} from 'expo-router';
import {mobileDebugLog} from './src/shared/debug/mobileDebugLogger';

const routerRequire = require as NodeRequire & {
  context: (path: string) => any;
};

export default function App() {
  mobileDebugLog('app_component_render');
  return <ExpoRoot context={routerRequire.context('./app')} />;
}
