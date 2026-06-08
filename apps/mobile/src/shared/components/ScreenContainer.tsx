import React, {PropsWithChildren} from 'react';
import {ScrollView, ScrollViewProps, StyleSheet} from 'react-native';
import {SafeAreaView} from 'react-native-safe-area-context';
import {colors} from '../constants/colors';

type Props = PropsWithChildren<{
  scrollProps?: Omit<ScrollViewProps, 'contentContainerStyle' | 'showsVerticalScrollIndicator'>;
}>;

export function ScreenContainer({children, scrollProps}: Props) {
  return (
    <SafeAreaView style={styles.safeArea}>
      {/* 页面级自动分页依赖 ScrollView 的 onScroll / onMomentumScrollBegin；容器统一透传，避免每个页面复制一份壳层。 */}
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false} {...scrollProps}>
        {children}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {flex: 1, backgroundColor: colors.background},
  content: {padding: 20, paddingBottom: 112},
});
