import React from 'react';
import {Redirect} from 'expo-router';
import {LoginScreen} from '../src/features/auth/screens/LoginScreen';
import {useAuth} from '../src/application/providers/AuthProvider';

export default function LoginRoute() {
  const {session} = useAuth();

  if (session) {
    return <Redirect href="/home" />;
  }

  return <LoginScreen />;
}
