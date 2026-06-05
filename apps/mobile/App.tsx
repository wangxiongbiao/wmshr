import 'react-native-gesture-handler';
import React from 'react';
import {StatusBar} from 'react-native';
import {AuthProvider} from './src/application/providers/AuthProvider';
import {ToastProvider} from './src/application/providers/ToastProvider';
import {AppNavigator} from './src/application/AppNavigator';

export default function App() {
  return (
    <AuthProvider>
      <ToastProvider>
        {/* App.tsx 只保留全局挂载顺序：手势运行时、登录态、Toast、导航；业务页面必须继续放在 features 下维护。 */}
        <StatusBar barStyle="dark-content" />
        <AppNavigator />
      </ToastProvider>
    </AuthProvider>
  );
}
