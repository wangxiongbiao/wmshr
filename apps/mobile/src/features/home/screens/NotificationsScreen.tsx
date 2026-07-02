import React, {useCallback, useMemo, useState} from 'react';
import {ActivityIndicator, Pressable, StyleSheet, Text, View} from 'react-native';
import {useFocusEffect, useRouter} from 'expo-router';
import {Ionicons} from '@expo/vector-icons';
import {useTranslation} from 'react-i18next';
import {useAuth} from '../../../application/providers/AuthProvider';
import {useToast} from '../../../application/providers/ToastProvider';
import {fetchEmployeeNotifications, markEmployeeNotificationRead} from '../../attendance/services/attendanceApi';
import {EmployeeNotification} from '../../attendance/types';
import {InnerScreenHeader} from '../../../shared/components/InnerScreenHeader';
import {ScreenContainer} from '../../../shared/components/ScreenContainer';
import {colors} from '../../../shared/constants/colors';
import {sharedStyles} from '../../../shared/constants/styles';
import {EmptyState} from '../../../shared/components/EmptyState';
import {localizeNotificationCopy} from '../utils/notifications';

const PAGE_SIZE = 20;

function formatCreatedAt(value: string | null) {
  if (!value) {
    return '';
  }
  return String(value).replace('T', ' ').slice(0, 16);
}

export function NotificationsScreen() {
  const {t} = useTranslation('app');
  const {session} = useAuth();
  const {showToast} = useToast();
  const router = useRouter();
  const [items, setItems] = useState<EmployeeNotification[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [errorText, setErrorText] = useState<string | null>(null);

  const loadNotifications = useCallback(async ({offset = 0, append = false, showErrorToast = false}: {offset?: number; append?: boolean; showErrorToast?: boolean} = {}) => {
    if (!session?.accessToken) {
      return;
    }

    if (append) {
      setLoadingMore(true);
    } else {
      setLoading(true);
      setErrorText(null);
    }

    try {
      const result = await fetchEmployeeNotifications(session.accessToken, {limit: PAGE_SIZE, offset});
      setItems((current) => append ? [...current, ...result.items] : result.items);
      setTotal(result.total);
      setErrorText(null);
    } catch (error) {
      const message = error instanceof Error ? error.message : t('通知列表加载失败');
      setErrorText(message);
      if (showErrorToast) {
        showToast(message);
      }
    } finally {
      setLoading(false);
      setLoadingMore(false);
    }
  }, [session?.accessToken, showToast, t]);

  useFocusEffect(
    useCallback(() => {
      void loadNotifications({offset: 0, append: false, showErrorToast: false});
    }, [loadNotifications]),
  );

  const hasMore = useMemo(() => items.length < total, [items.length, total]);

  const handleNotificationPress = useCallback(async (item: EmployeeNotification) => {
    if (!session?.accessToken) {
      return;
    }

    try {
      if (!item.readAt) {
        const nextNotification = await markEmployeeNotificationRead(session.accessToken, item.id);
        setItems((current) => current.map((currentItem) => (
          currentItem.id === nextNotification.id ? nextNotification : currentItem
        )));
      }

      if (item.bizId) {
        router.push({pathname: '/payroll/[payrollId]', params: {payrollId: String(item.bizId)}});
      }
    } catch (error) {
      showToast(error instanceof Error ? error.message : t('通知状态更新失败'));
    }
  }, [router, session?.accessToken, showToast, t]);

  return (
    <ScreenContainer header={<InnerScreenHeader title={t('全部通知')} fallbackHref="/home" />} withBottomSafeArea>
      {loading && items.length === 0 ? (
        <View style={styles.placeholderCard}>
          <ActivityIndicator color={colors.primary} />
          <Text style={sharedStyles.cardTitle}>{t('正在加载通知...')}</Text>
        </View>
      ) : errorText && items.length === 0 ? (
        <View style={styles.placeholderCard}>
          <Text style={sharedStyles.cardTitle}>{t('通知列表暂时加载失败')}</Text>
          <Text style={sharedStyles.muted}>{errorText}</Text>
          <Pressable style={styles.retryButton} onPress={() => void loadNotifications({showErrorToast: true})}>
            <Text style={styles.retryButtonText}>{t('重新加载')}</Text>
          </Pressable>
        </View>
      ) : items.length === 0 ? (
        <EmptyState title={t('暂无通知')} description={t('当前还没有新的系统通知。')} icon="notifications-outline" />
      ) : (
        <>
          <View style={styles.listCard}>
            {items.map((item, index) => (
              (() => {
                const copy = localizeNotificationCopy(item, t);
                return (
              <Pressable
                key={item.id}
                style={({pressed}) => [styles.row, index !== items.length - 1 && styles.rowBorder, pressed && styles.rowPressed]}
                onPress={() => void handleNotificationPress(item)}
              >
                <View style={[styles.iconWrap, item.readAt ? styles.iconWrapRead : styles.iconWrapUnread]}>
                  <Ionicons name="receipt-outline" size={18} color={item.readAt ? colors.textMuted : colors.primary} />
                </View>
                <View style={styles.copy}>
                  <View style={styles.titleRow}>
                    <Text style={styles.title} numberOfLines={1}>{copy.title}</Text>
                    {!item.readAt ? <View style={styles.unreadDot} /> : null}
                  </View>
                  <Text style={styles.detail} numberOfLines={2}>{copy.content}</Text>
                  <Text style={styles.meta} numberOfLines={1}>{formatCreatedAt(item.createdAt)}</Text>
                </View>
                <Ionicons name="chevron-forward" size={16} color={colors.textMuted} />
              </Pressable>
                );
              })()
            ))}
          </View>

          {hasMore ? (
            <Pressable style={({pressed}) => [styles.loadMoreButton, pressed && styles.loadMoreButtonPressed]} onPress={() => void loadNotifications({offset: items.length, append: true, showErrorToast: true})}>
              {loadingMore ? <ActivityIndicator color={colors.primary} /> : <Text style={styles.loadMoreText}>{t('加载更多')}</Text>}
            </Pressable>
          ) : null}
        </>
      )}
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  placeholderCard: {marginTop: 16, backgroundColor: colors.white, borderRadius: 16, padding: 18, alignItems: 'center', gap: 10},
  retryButton: {marginTop: 8, minWidth: 120, height: 44, borderRadius: 16, backgroundColor: colors.primary, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 16},
  retryButtonText: {color: colors.white, fontWeight: '900'},
  listCard: {marginTop: 16, backgroundColor: colors.white, borderRadius: 16, paddingHorizontal: 18},
  // 通知页正文和工资条通知属于天然长文案：列表项统一改为顶部对齐，并限制标题/正文/时间的展示行数，避免小屏多语言下整行被撑乱。
  row: {flexDirection: 'row', alignItems: 'flex-start', gap: 14, paddingVertical: 16},
  rowBorder: {borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: '#e2e8f0'},
  rowPressed: {opacity: 0.78},
  iconWrap: {width: 42, height: 42, borderRadius: 16, alignItems: 'center', justifyContent: 'center', flexShrink: 0},
  iconWrapUnread: {backgroundColor: '#eff6ff'},
  iconWrapRead: {backgroundColor: '#f8fafc'},
  copy: {flex: 1, minWidth: 0},
  titleRow: {flexDirection: 'row', alignItems: 'center', gap: 8, minWidth: 0},
  title: {fontSize: 14, lineHeight: 18, color: colors.text, fontWeight: '800', flexShrink: 1},
  unreadDot: {width: 8, height: 8, borderRadius: 16, backgroundColor: colors.primary, flexShrink: 0, marginTop: 5},
  detail: {marginTop: 4, fontSize: 12, lineHeight: 18, color: colors.textSubtle, fontWeight: '600'},
  meta: {marginTop: 6, fontSize: 11, lineHeight: 15, color: colors.textMuted, fontWeight: '700'},
  loadMoreButton: {marginTop: 16, minHeight: 48, borderRadius: 16, backgroundColor: colors.white, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: '#dbeafe', paddingHorizontal: 16, paddingVertical: 12},
  loadMoreButtonPressed: {opacity: 0.82},
  loadMoreText: {fontSize: 14, color: colors.primary, fontWeight: '900', textAlign: 'center'},
});
