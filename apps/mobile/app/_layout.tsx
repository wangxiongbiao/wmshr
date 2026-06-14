import React from 'react';
import {Stack} from 'expo-router';
import {AppProviders} from '../src/application/AppProviders';
import {mobileDebugLog} from '../src/shared/debug/mobileDebugLogger';

export default function RootLayout() {
  mobileDebugLog('root_layout_render');
  return (
    <AppProviders>
      <Stack screenOptions={{headerShown: false}}>
        <Stack.Screen name="index" />
        <Stack.Screen name="login" />
        <Stack.Screen name="(protected)" />
      </Stack>
    </AppProviders>
  );
}
