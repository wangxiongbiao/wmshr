import React, {PropsWithChildren} from 'react';
import {ScrollView, ScrollViewProps, StyleSheet} from 'react-native';
import {SafeAreaView, useSafeAreaInsets} from 'react-native-safe-area-context';
import {colors} from '../constants/colors';

type Props = PropsWithChildren<{
  scrollProps?: Omit<ScrollViewProps, 'contentContainerStyle' | 'showsVerticalScrollIndicator'>;
}>;

export function ScreenContainer({children, scrollProps}: Props) {
  const insets = useSafeAreaInsets();

  return (
    <SafeAreaView style={styles.safeArea}>
      {/* 页面级自动分页依赖 ScrollView 的 onScroll / onMomentumScrollBegin；容器统一透传，避免每个页面复制一份壳层。 */}
      {/* 页面内容底部留白要跟随真实设备 inset 增长，否则底部卡片/按钮会被手势条或三键导航栏顶住。 */}
      <ScrollView contentContainerStyle={[styles.content, {paddingBottom: 112 + insets.bottom}]} showsVerticalScrollIndicator={false} {...scrollProps}>
        {children}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {flex: 1, backgroundColor: colors.background},
  content: {padding: 20},
});
