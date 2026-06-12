import React from 'react';
import {Stack} from 'expo-router';

export default function AttendanceStackLayout() {
  return (
    <Stack screenOptions={{headerShown: false}}>
      <Stack.Screen name="index" />
    </Stack>
  );
}
