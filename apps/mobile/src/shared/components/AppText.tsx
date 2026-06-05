import React, {PropsWithChildren} from 'react';
import {Text, TextStyle} from 'react-native';
import {colors} from '../constants/colors';

type Props = PropsWithChildren<{
  variant?: 'title' | 'subtitle' | 'body' | 'muted';
  style?: TextStyle;
}>;

const variantStyles: Record<NonNullable<Props['variant']>, TextStyle> = {
  title: {fontSize: 24, lineHeight: 30, fontWeight: '900', color: colors.text},
  subtitle: {fontSize: 16, lineHeight: 22, fontWeight: '800', color: colors.text},
  body: {fontSize: 14, lineHeight: 20, fontWeight: '600', color: colors.textSubtle},
  muted: {fontSize: 13, lineHeight: 18, fontWeight: '600', color: colors.textMuted},
};

export function AppText({children, variant = 'body', style}: Props) {
  // 只统一移动端基础字号/颜色，不在 shared 层绑定具体业务文案层级；复杂排版仍由对应 screen/component 控制。
  return <Text style={[variantStyles[variant], style]}>{children}</Text>;
}
