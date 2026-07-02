import React, {PropsWithChildren} from 'react';
import {StyleSheet, View, ViewStyle} from 'react-native';
import {colors} from '../constants/colors';

type Props = PropsWithChildren<{
  style?: ViewStyle;
}>;

export function AppCard({children, style}: Props) {
  return <View style={[styles.card, style]}>{children}</View>;
}

const styles = StyleSheet.create({
  // AppCard 只沉淀通用卡片容器样式；业务字段、点击行为和数据状态必须留在 feature 组件内，避免 shared 层反向了解业务。
  card: {
    backgroundColor: colors.surface,
    borderRadius: 16,
    padding: 18,
    shadowColor: colors.text,
    shadowOpacity: 0.05,
    shadowRadius: 12,
    shadowOffset: {width: 0, height: 6},
    elevation: 2,
  },
});
