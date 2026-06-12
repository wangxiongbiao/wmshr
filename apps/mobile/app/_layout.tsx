import React from 'react';
import {Stack} from 'expo-router';
import {AppProviders} from '../src/application/AppProviders';

export default function RootLayout() {
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
