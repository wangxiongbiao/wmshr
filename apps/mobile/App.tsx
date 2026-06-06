import 'react-native-gesture-handler';
import React, {useEffect, useState} from 'react';
import {ActivityIndicator, StatusBar, View} from 'react-native';
import {AuthProvider} from './src/application/providers/AuthProvider';
import {ToastProvider} from './src/application/providers/ToastProvider';
import {AppNavigator} from './src/application/AppNavigator';
import {colors} from './src/shared/constants/colors';
import {mobileI18nReady} from './src/application/i18n';

export default function App() {
  const [ready, setReady] = useState(false);

  useEffect(() => {
    let mounted = true;
    mobileI18nReady.finally(() => {
      if (mounted) {
        setReady(true);
      }
    });
    return () => {
      mounted = false;
    };
  }, []);

  if (!ready) {
    return (
      <View style={{flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.background}}>
        <ActivityIndicator color={colors.primary} />
      </View>
    );
  }

  return (
    <AuthProvider>
      <ToastProvider>
        {/* App.tsx 只保留全局挂载顺序：手势运行时、登录态、Toast、导航；国际化初始化必须在进入页面前完成，避免首屏先闪中文再切语言。 */}
        <StatusBar barStyle="dark-content" />
        <AppNavigator />
      </ToastProvider>
    </AuthProvider>
  );
}
