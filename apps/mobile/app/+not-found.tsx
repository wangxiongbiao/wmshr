import React from 'react';
import {Redirect} from 'expo-router';
import {useAuth} from '../src/application/providers/AuthProvider';

export default function NotFoundRoute() {
  const {session} = useAuth();

  return <Redirect href={session ? '/home' : '/login'} />;
}
