import React from 'react';
import {ExpoRoot} from 'expo-router';

const routerRequire = require as NodeRequire & {
  context: (path: string) => any;
};

export default function App() {
  return <ExpoRoot context={routerRequire.context('./app')} />;
}
