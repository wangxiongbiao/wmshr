import React, {PropsWithChildren, ReactNode} from 'react';
import {ScrollView, ScrollViewProps, StyleSheet, View} from 'react-native';
import {SafeAreaView, useSafeAreaInsets} from 'react-native-safe-area-context';
import {colors} from '../constants/colors';

type Props = PropsWithChildren<{
  header?: ReactNode;
  scrollProps?: Omit<ScrollViewProps, 'contentContainerStyle' | 'showsVerticalScrollIndicator'>;
  withBottomSafeArea?: boolean;
}>;

export function ScreenContainer({children, header, scrollProps, withBottomSafeArea = false}: Props) {
  const insets = useSafeAreaInsets();
  const bottomContentPadding = withBottomSafeArea
    ? 24 + Math.max(insets.bottom, 12)
    : 112 + Math.max(insets.bottom, 10);

  return (
    <SafeAreaView edges={withBottomSafeArea ? ['top', 'right', 'bottom', 'left'] : ['top', 'left', 'right']} style={styles.safeArea}>
      {header ? <View style={styles.headerSlot}>{header}</View> : null}
      {/* 页面级自动分页依赖 ScrollView 的 onScroll / onMomentumScrollBegin；容器统一透传，避免每个页面复制一份壳层。 */}
      {/* TabBar 已经吃掉了底部安全区，这里只保留内容和 Tab 的视觉间距，避免页面容器再次叠一层底部 inset。 */}
      <ScrollView
        contentContainerStyle={[styles.content, {paddingBottom: bottomContentPadding}]}
        contentInsetAdjustmentBehavior="automatic"
        showsVerticalScrollIndicator={false}
        {...scrollProps}
      >
        {children}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {flex: 1, backgroundColor: colors.background},
  headerSlot: {
    paddingHorizontal: 20,
    paddingTop: 8,
    paddingBottom: 0,
    backgroundColor: colors.background,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: 'rgba(148, 163, 184, 0.18)',
  },
  content: {padding: 20},
});
