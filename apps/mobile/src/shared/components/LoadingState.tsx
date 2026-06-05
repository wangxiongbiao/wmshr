import React from 'react';
import {ActivityIndicator, StyleSheet, View} from 'react-native';
import {AppText} from './AppText';
import {colors} from '../constants/colors';

type Props = {
  message?: string;
};

export function LoadingState({message = '加载中'}: Props) {
  return (
    <View style={styles.container}>
      <ActivityIndicator color={colors.primary} />
      <AppText variant="muted">{message}</AppText>
    </View>
  );
}

const styles = StyleSheet.create({
  // LoadingState 保持无业务副作用；数据请求、重试和错误展示必须由 feature 层负责。
  container: {alignItems: 'center', justifyContent: 'center', padding: 28, gap: 10},
});
