import React from 'react';
import {ActivityIndicator, StyleSheet, View} from 'react-native';
import {useTranslation} from 'react-i18next';
import {AppText} from './AppText';
import {colors} from '../constants/colors';

type Props = {
  message?: string;
};

export function LoadingState({message}: Props) {
  const { t } = useTranslation('app');
  const resolvedMessage = message ?? t('加载中');

  return (
    <View style={styles.container}>
      <ActivityIndicator color={colors.primary} />
      <AppText variant="muted">{resolvedMessage}</AppText>
    </View>
  );
}

const styles = StyleSheet.create({
  // LoadingState 保持无业务副作用；数据请求、重试和错误展示必须由 feature 层负责。
  container: {alignItems: 'center', justifyContent: 'center', padding: 28, gap: 10},
});
