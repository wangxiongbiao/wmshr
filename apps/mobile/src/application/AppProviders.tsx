import 'react-native-gesture-handler';
import React, {PropsWithChildren, useEffect, useState} from 'react';
import {ActivityIndicator, StatusBar, View} from 'react-native';
import {SafeAreaProvider} from 'react-native-safe-area-context';
import {AuthProvider} from './providers/AuthProvider';
import {ToastProvider} from './providers/ToastProvider';
import {colors} from '../shared/constants/colors';
import {mobileI18nReady} from './i18n';
import {AppUpdateGate} from '../features/app-update/components/AppUpdateGate';

export function AppProviders({children}: PropsWithChildren) {
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
          <StatusBar barStyle="dark-content" />
          <AppUpdateGate>
            {children}
          </AppUpdateGate>
        </ToastProvider>
      </AuthProvider>
    </SafeAreaProvider>
  );
}
