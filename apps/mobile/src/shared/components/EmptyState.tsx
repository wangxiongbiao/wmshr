import React from 'react';
import {Ionicons} from '@expo/vector-icons';
import {StyleSheet, View} from 'react-native';
import {AppText} from './AppText';
import {colors} from '../constants/colors';

type Props = {
  title: string;
  description?: string;
  icon?: keyof typeof Ionicons.glyphMap;
};

export function EmptyState({title, description, icon = 'file-tray-outline'}: Props) {
  return (
    <View style={styles.container}>
      <View style={styles.iconWrap}>
        <Ionicons name={icon} size={30} color={colors.textMuted} />
      </View>
      <AppText variant="subtitle" style={styles.title}>{title}</AppText>
      {description ? <AppText variant="muted" style={styles.description}>{description}</AppText> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  // EmptyState 只表达“无数据”通用形态；具体空态原因和下一步动作由调用方传入，避免共享组件写死业务流程。
  container: {alignItems: 'center', justifyContent: 'center', padding: 28, gap: 10},
  iconWrap: {width: 58, height: 58, borderRadius: 24, alignItems: 'center', justifyContent: 'center', backgroundColor: '#f1f5f9'},
  title: {textAlign: 'center'},
  description: {textAlign: 'center'},
});
