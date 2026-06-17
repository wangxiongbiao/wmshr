import React from 'react';
import {ActivityIndicator, StyleSheet, View} from 'react-native';
import {Redirect} from 'expo-router';
import {useAuth} from '../src/application/providers/AuthProvider';
import {colors} from '../src/shared/constants/colors';

export default function IndexScreen() {
  const {loading, session} = useAuth();

  if (loading) {
    return (
      <View style={styles.screen}>
        <ActivityIndicator color={colors.primary} />
      </View>
    );
  }

  // 原生启动默认先落到 /；这里必须立刻按登录态分发到 /login 或 /home，
  // 不能再返回占位空白页，否则用户看到的就是“应用启动成功但整屏纯白”。
  return <Redirect href={session ? '/home' : '/login'} />;
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.background,
  },
});
