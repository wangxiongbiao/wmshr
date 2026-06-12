import React from 'react';
import {Stack} from 'expo-router';

export default function SopStackLayout() {
  return (
    <Stack screenOptions={{headerShown: false}}>
      <Stack.Screen name="index" />
      <Stack.Screen name="[sopId]" options={{presentation: 'card'}} />
    </Stack>
  );
}
