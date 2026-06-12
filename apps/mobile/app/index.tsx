import React from 'react';
import {ActivityIndicator, View} from 'react-native';
import {Redirect} from 'expo-router';
import {useAuth} from '../src/application/providers/AuthProvider';
import {colors} from '../src/shared/constants/colors';

export default function IndexScreen() {
  const {loading, session} = useAuth();

  if (loading) {
    return (
      <View style={{flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.background}}>
        <ActivityIndicator color={colors.primary} />
      </View>
    );
  }

  return <Redirect href={session ? '/home' : '/login'} />;
}
