import React, {useCallback, useMemo, useRef, useState} from 'react';
import {NativeScrollEvent, NativeSyntheticEvent, Pressable, StyleSheet, Text, View} from 'react-native';
import {Ionicons} from '@expo/vector-icons';
import {useFocusEffect, useRouter} from 'expo-router';
import {useTranslation} from 'react-i18next';
import {useAuth} from '../../../application/providers/AuthProvider';
import {useToast} from '../../../application/providers/ToastProvider';
import {fetchSopDocuments} from '../services/sopApi';
import {SopDocument} from '../types';
import {ScreenContainer} from '../../../shared/components/ScreenContainer';
import {colors} from '../../../shared/constants/colors';
import {sharedStyles} from '../../../shared/constants/styles';

const PAGE_SIZE = 10;
const END_REACHED_THRESHOLD = 120;

function formatSopMeta(version: string, updatedAt: string, t: (value: string) => string) {
  const normalizedVersion = version.trim().toUpperCase();
  const compactDate = updatedAt.trim().slice(5, 10);
  return `${normalizedVersion} · ${t('更新')} ${compactDate}`;
}

export function SopListScreen() {
  const { t } = useTranslation('app');
  const router = useRouter();
  const {session} = useAuth();
  const {showToast} = useToast();
  const [documents, setDocuments] = useState<SopDocument[]>([]);
  const [hasFetchedOnce, setHasFetchedOnce] = useState(false);
  const [isFetchingMore, setIsFetchingMore] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const [errorText, setErrorText] = useState<string | null>(null);
  const canTriggerAutoLoadRef = useRef(true);

  const loadDocuments = useCallback(async ({append, offset, showErrorToast = false}: {append: boolean; offset: number; showErrorToast?: boolean}) => {
    if (!session?.accessToken) {
      return;
    }

    if (append) {
      setIsFetchingMore(true);
    } else {
      setErrorText(null);
    }

    try {
      // SOP 按分页追加，首屏不再单独显示 loading 卡片；详情返回后重新进列表时仍会自动回流最新已读状态。
      const nextDocuments = await fetchSopDocuments(session.accessToken, {limit: PAGE_SIZE, offset});
      setDocuments(prev => (append ? [...prev, ...nextDocuments] : nextDocuments));
      setHasMore(nextDocuments.length === PAGE_SIZE);
      setHasFetchedOnce(true);
      setErrorText(null);
    } catch (error) {
      const message = error instanceof Error ? error.message : t('SOP 列表加载失败');
      setErrorText(message);
      if (showErrorToast || append) {
        showToast(message);
      }
    } finally {
      setIsFetchingMore(false);
    }
  }, [session?.accessToken, showToast, t]);

  useFocusEffect(
    useCallback(() => {
      canTriggerAutoLoadRef.current = true;
      void loadDocuments({append: false, offset: 0, showErrorToast: false});
    }, [loadDocuments]),
  );

  const tryAutoLoadMore = useCallback(() => {
    if (isFetchingMore || !hasMore || documents.length === 0 || !hasFetchedOnce || errorText) {
      return;
    }
    canTriggerAutoLoadRef.current = false;
    void loadDocuments({append: true, offset: documents.length, showErrorToast: true});
  }, [documents.length, errorText, hasFetchedOnce, hasMore, isFetchingMore, loadDocuments]);

  const handleScroll = useCallback((event: NativeSyntheticEvent<NativeScrollEvent>) => {
    if (!canTriggerAutoLoadRef.current) {
      return;
    }
    const {layoutMeasurement, contentOffset, contentSize} = event.nativeEvent;
    const distanceToBottom = contentSize.height - (layoutMeasurement.height + contentOffset.y);
    // 自动分页必须只在“确实接近底部”时触发，并配合 momentum 锁，避免一次快速滚动重复打出多页请求。
    if (distanceToBottom <= END_REACHED_THRESHOLD) {
      tryAutoLoadMore();
    }
  }, [tryAutoLoadMore]);

  const scrollProps = useMemo(() => ({
    onMomentumScrollBegin: () => {
      canTriggerAutoLoadRef.current = true;
    },
    onScroll: handleScroll,
    scrollEventThrottle: 16,
  }), [handleScroll]);

  return (
    <ScreenContainer scrollProps={scrollProps}>
      <View style={styles.screenTitle}>
        <Text style={styles.screenTitleText}>{t('SOP 文件')}</Text>
        <Text style={styles.screenSubtitleText}>{t('仓库作业标准流程')}</Text>
      </View>

      <View style={styles.documentList}>
        {documents.map(item => {
          const isRead = item.readStatus === 'read';
          const metaText = formatSopMeta(item.version, item.updatedAt, t);
          return (
            <Pressable
              key={item.id}
              onPress={() => {
                router.push({pathname: '/sop/[sopId]', params: {sopId: item.id}});
              }}
              style={({pressed}) => [styles.documentCard, pressed && styles.documentCardPressed]}
            >
              <View style={[styles.documentIconWrap, isRead ? styles.documentIconWrapRead : styles.documentIconWrapUnread]}>
                <Ionicons name="document-text-outline" size={24} color={isRead ? '#97A8C1' : '#2B66F6'} />
              </View>
              {/* Web 上不要再用 Link asChild 当根节点：它会把根元素变成 anchor，导致卡片根节点丢失 row/fill 样式，视觉上退化成竖排普通列表。 */}
              <View style={styles.documentCopy}>
                <Text style={styles.documentTitle} numberOfLines={1} ellipsizeMode="tail">{item.title}</Text>
                <Text style={styles.documentMeta} numberOfLines={1}>{metaText}</Text>
              </View>
              <View style={styles.documentStatus}>
                {isRead ? <Ionicons name="chevron-forward" size={18} color="#CAD8EE" /> : <View style={styles.unreadDot} />}
              </View>
            </Pressable>
          );
        })}
      </View>

      {hasFetchedOnce && documents.length === 0 ? (
        <View style={styles.placeholderCard}>
          <Text style={sharedStyles.cardTitle}>{errorText ? t('SOP 列表暂时加载失败') : t('暂无可查看的 SOP')}</Text>
          <Text style={sharedStyles.muted}>{errorText ?? t('当后台发布并指派 SOP 后，这里会展示你可查看的标准流程。')}</Text>
          {errorText ? (
            <Pressable style={styles.retryButton} onPress={() => void loadDocuments({append: false, offset: 0, showErrorToast: true})}>
              <Text style={styles.retryButtonText}>{t('重新加载')}</Text>
            </Pressable>
          ) : null}
        </View>
      ) : null}

      {documents.length > 0 && isFetchingMore ? (
        <View style={styles.autoLoadHint}>
          <Text style={styles.autoLoadHintText}>{t('正在加载更多 SOP...')}</Text>
        </View>
      ) : null}
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  screenTitle: {marginBottom: 10, paddingTop: 2},
  screenTitleText: {fontSize: 18, lineHeight: 22, color: '#52627D', fontWeight: '800', letterSpacing: -0.2},
  screenSubtitleText: {marginTop: 2, fontSize: 11, lineHeight: 14, color: '#9AA8BF', fontWeight: '600'},
  documentList: {paddingTop: 6},
  documentCard: {width: '100%', minHeight: 110, backgroundColor: colors.white, borderRadius: 31, paddingVertical: 22, paddingHorizontal: 18, marginBottom: 22, flexDirection: 'row', alignItems: 'center', alignSelf: 'stretch', shadowColor: '#0F172A', shadowOpacity: 0.065, shadowRadius: 16, shadowOffset: {width: 0, height: 6}, elevation: 4, borderWidth: 1, borderColor: '#EEF2F7'},
  documentCardPressed: {opacity: 0.92},
  documentIconWrap: {width: 50, height: 50, borderRadius: 17, alignItems: 'center', justifyContent: 'center', borderWidth: 1, marginRight: 18, flexShrink: 0},
  documentIconWrapUnread: {backgroundColor: '#EEF5FF', borderColor: '#D9E7FF'},
  documentIconWrapRead: {backgroundColor: '#FAFBFD', borderColor: '#EEF2F7'},
  documentCopy: {flex: 1, minWidth: 0, paddingRight: 12, justifyContent: 'center'},
  documentTitle: {fontSize: 18, lineHeight: 24, color: '#23324D', fontWeight: '900', letterSpacing: -0.2},
  documentMeta: {marginTop: 8, fontSize: 12, lineHeight: 16, color: '#8FA3C0', fontWeight: '800', letterSpacing: 0.35},
  documentStatus: {width: 28, flexShrink: 0, alignItems: 'center', justifyContent: 'center', marginLeft: 10},
  unreadDot: {width: 15, height: 15, borderRadius: 999, backgroundColor: '#FF2D55', shadowColor: '#FF2D55', shadowOpacity: 0.2, shadowRadius: 10, shadowOffset: {width: 0, height: 3}, elevation: 2},
  placeholderCard: {backgroundColor: colors.white, borderRadius: 22, padding: 18, alignItems: 'center', gap: 10},
  retryButton: {marginTop: 6, height: 44, minWidth: 120, borderRadius: 16, backgroundColor: colors.primary, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 16},
  retryButtonText: {color: colors.white, fontSize: 15, fontWeight: '900'},
  autoLoadHint: {marginTop: 6, alignItems: 'center', justifyContent: 'center'},
  autoLoadHintText: {color: colors.textMuted, fontSize: 13, fontWeight: '700'},
});
