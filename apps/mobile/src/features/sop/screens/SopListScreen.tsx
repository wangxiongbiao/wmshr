import React, {useCallback, useMemo, useRef, useState} from 'react';
import {NativeScrollEvent, NativeSyntheticEvent, Pressable, StyleSheet, Text, View} from 'react-native';
import {Ionicons} from '@expo/vector-icons';
import {Link, useFocusEffect} from 'expo-router';
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

export function SopListScreen() {
  const { t } = useTranslation('app');
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
      <View style={sharedStyles.screenTitle}>
        <Text style={sharedStyles.title}>{t('SOP 文件')}</Text>
        <Text style={sharedStyles.muted}>{t('仓库作业标准流程')}</Text>
      </View>

      {documents.map(item => {
        const isRead = item.readStatus === 'read';
        return (
          <Link key={item.id} href={{pathname: '/sop/[sopId]', params: {sopId: item.id}}} push asChild>
            <Pressable style={({pressed}) => [styles.documentCard, pressed && styles.documentCardPressed]}>
              <View style={[styles.documentIconWrap, isRead ? styles.documentIconWrapRead : styles.documentIconWrapUnread]}>
                <Ionicons name="document-text-outline" size={28} color={isRead ? colors.textMuted : colors.primary} />
              </View>
              <View style={styles.documentCopy}>
                <Text style={styles.documentTitle} numberOfLines={2}>{item.title}</Text>
                <Text style={styles.documentMeta}>{item.version} · {t('更新')} {item.updatedAt}</Text>
              </View>
              {/* 参考最新列表稿：未读只保留右侧红点，已读才展示进入箭头，避免状态文案重复占一整行。 */}
              {isRead ? <Ionicons name="chevron-forward" size={20} color="#cbd5e1" /> : <View style={styles.unreadDot} />}
            </Pressable>
          </Link>
        );
      })}

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
  documentCard: {backgroundColor: colors.white, borderRadius: 30, paddingVertical: 22, paddingHorizontal: 18, marginBottom: 18, flexDirection: 'row', alignItems: 'center', gap: 16, shadowColor: colors.text, shadowOpacity: 0.05, shadowRadius: 18, shadowOffset: {width: 0, height: 8}, elevation: 3, borderWidth: 1, borderColor: '#eef2f7'},
  documentCardPressed: {opacity: 0.84},
  documentIconWrap: {width: 52, height: 52, borderRadius: 18, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: '#dbeafe'},
  documentIconWrapUnread: {backgroundColor: '#eff6ff'},
  documentIconWrapRead: {backgroundColor: '#f8fafc', borderColor: '#e2e8f0'},
  documentCopy: {flex: 1},
  documentTitle: {fontSize: 18, lineHeight: 24, color: colors.text, fontWeight: '900'},
  documentMeta: {marginTop: 8, fontSize: 14, color: colors.textMuted, fontWeight: '700', letterSpacing: 0.2},
  unreadDot: {width: 14, height: 14, borderRadius: 999, backgroundColor: '#ff2d55', shadowColor: '#ff2d55', shadowOpacity: 0.28, shadowRadius: 8, shadowOffset: {width: 0, height: 4}, elevation: 2},
  placeholderCard: {backgroundColor: colors.white, borderRadius: 22, padding: 18, alignItems: 'center', gap: 10},
  retryButton: {marginTop: 6, height: 44, minWidth: 120, borderRadius: 16, backgroundColor: colors.primary, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 16},
  retryButtonText: {color: colors.white, fontSize: 15, fontWeight: '900'},
  autoLoadHint: {marginTop: 6, alignItems: 'center', justifyContent: 'center'},
  autoLoadHintText: {color: colors.textMuted, fontSize: 13, fontWeight: '700'},
});
