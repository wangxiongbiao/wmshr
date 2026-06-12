import React from 'react';
import {ActivityIndicator, View} from 'react-native';
import {Redirect, Stack} from 'expo-router';
import {useAuth} from '../../src/application/providers/AuthProvider';
import {colors} from '../../src/shared/constants/colors';

export default function ProtectedLayout() {
  const {loading, session} = useAuth();

  if (loading) {
    return (
      <View style={{flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.background}}>
        <ActivityIndicator color={colors.primary} />
      </View>
    );
  }

  if (!session) {
    return <Redirect href="/login" />;
  }

  return (
    <Stack screenOptions={{headerShown: false}}>
      <Stack.Screen name="(tabs)" />
    </Stack>
  );
}
