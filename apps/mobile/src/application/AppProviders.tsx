import 'react-native-gesture-handler';
import React, {PropsWithChildren, useEffect, useState} from 'react';
import {ActivityIndicator, StatusBar, View} from 'react-native';
import {SafeAreaProvider} from 'react-native-safe-area-context';
import {AuthProvider} from './providers/AuthProvider';
import {ToastProvider} from './providers/ToastProvider';
import {colors} from '../shared/constants/colors';
import {mobileI18nReady} from './i18n';
import {AppUpdateGate} from '../features/app-update/components/AppUpdateGate';
import {mobileDebugLog} from '../shared/debug/mobileDebugLogger';

export function AppProviders({children}: PropsWithChildren) {
  const [ready, setReady] = useState(false);

  useEffect(() => {
    mobileDebugLog('app_providers_effect_start');
    let mounted = true;
    mobileI18nReady.finally(() => {
      mobileDebugLog('app_providers_i18n_ready');
      if (mounted) {
        setReady(true);
      }
    });
    return () => {
      mounted = false;
    };
  }, []);

  if (!ready) {
    mobileDebugLog('app_providers_waiting_for_ready');
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
          <StatusBar barStyle="dark-content" />
          <AppUpdateGate>
            {/*
              原生启动默认先进入 expo-router 的 /，后续 login / protected 页面都会直接使用
              useAuth()、useToast() 和 i18n。根层必须一次性挂好这些 Provider，否则会出现
              首页修好后跳转仍白屏，或在真正进入业务页时抛上下文缺失错误。
            */}
            {children}
          </AppUpdateGate>
        </ToastProvider>
      </AuthProvider>
    </SafeAreaProvider>
  );
}
