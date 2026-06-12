import React, {PropsWithChildren} from 'react';
import {ScrollView, ScrollViewProps, StyleSheet} from 'react-native';
import {SafeAreaView, useSafeAreaInsets} from 'react-native-safe-area-context';
import {colors} from '../constants/colors';

type Props = PropsWithChildren<{
  scrollProps?: Omit<ScrollViewProps, 'contentContainerStyle' | 'showsVerticalScrollIndicator'>;
}>;

export function ScreenContainer({children, scrollProps}: Props) {
  const insets = useSafeAreaInsets();
  const bottomContentPadding = 112 + Math.max(insets.bottom, 10);

  return (
    <SafeAreaView edges={['top', 'left', 'right']} style={styles.safeArea}>
      {/* 页面级自动分页依赖 ScrollView 的 onScroll / onMomentumScrollBegin；容器统一透传，避免每个页面复制一份壳层。 */}
      {/* TabBar 已经吃掉了底部安全区，这里只保留内容和 Tab 的视觉间距，避免页面容器再次叠一层底部 inset。 */}
      <ScrollView contentContainerStyle={[styles.content, {paddingBottom: bottomContentPadding}]} showsVerticalScrollIndicator={false} {...scrollProps}>
        {children}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {flex: 1, backgroundColor: colors.background},
  content: {padding: 20},
});
