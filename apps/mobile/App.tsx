import 'react-native-gesture-handler';
import React, {useEffect, useState} from 'react';
import {ActivityIndicator, StatusBar, View} from 'react-native';
import {AuthProvider} from './src/application/providers/AuthProvider';
import {ToastProvider} from './src/application/providers/ToastProvider';
import {AppNavigator} from './src/application/AppNavigator';
import {colors} from './src/shared/constants/colors';
import {mobileI18nReady} from './src/application/i18n';
import {SafeAreaProvider} from 'react-native-safe-area-context';
import {AppUpdateGate} from './src/features/app-update/components/AppUpdateGate';

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
    <SafeAreaProvider>
      <AuthProvider>
        <ToastProvider>
          {/* SafeAreaProvider 必须放在导航外层，供 Tab 和页面容器共享同一份设备 inset；否则部分安卓导航栏/底部手势区机会继续沿用写死高度。 */}
          {/* App.tsx 只保留全局挂载顺序：手势运行时、登录态、Toast、全局版本守卫、导航；在线更新必须在导航外拦截，避免用户先进入页面再被强更弹回。 */}
          <StatusBar barStyle="dark-content" />
          <AppUpdateGate>
            <AppNavigator />
          </AppUpdateGate>
        </ToastProvider>
      </AuthProvider>
    </SafeAreaProvider>
  );
}
