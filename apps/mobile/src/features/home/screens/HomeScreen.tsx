import React, {useCallback, useEffect, useMemo, useState} from 'react';
import {useFocusEffect, useRouter} from 'expo-router';
import {Pressable, StyleSheet, Text, View} from 'react-native';
import {Ionicons} from '@expo/vector-icons';
import {useTranslation} from 'react-i18next';
import {useAuth} from '../../../application/providers/AuthProvider';
import {useToast} from '../../../application/providers/ToastProvider';
import {fetchMobileHomeSummary, markEmployeeNotificationRead} from '../../attendance/services/attendanceApi';
import {MobileHomeSummary} from '../../attendance/types';
import {ScreenContainer} from '../../../shared/components/ScreenContainer';
import {sharedStyles} from '../../../shared/constants/styles';
import {colors} from '../../../shared/constants/colors';
import {localizeNotificationCopy} from '../utils/notifications';

export function HomeScreen() {
  const { t } = useTranslation('app');
  const {employee, session} = useAuth();
  const {showToast} = useToast();
  const router = useRouter();
  const [homeSummary, setHomeSummary] = useState<MobileHomeSummary | null>(null);

  const loadHomeSummary = useCallback(async () => {
    if (!session?.accessToken) {
      return;
    }

    try {
      const summary = await fetchMobileHomeSummary(session.accessToken);
      setHomeSummary(summary);
    } catch (error) {
      console.warn('[mobile-home] summary load failed', {
        message: error instanceof Error ? error.message : String(error),
      });
    }
  }, [session?.accessToken]);

  useEffect(() => {
    void loadHomeSummary();
  }, [loadHomeSummary]);

  useFocusEffect(
    useCallback(() => {
      void loadHomeSummary();
    }, [loadHomeSummary]),
  );

  const monthHours = useMemo(() => String(homeSummary?.monthHours ?? 0), [homeSummary?.monthHours]);
  const attendanceDays = useMemo(() => String(homeSummary?.attendanceDays ?? 0), [homeSummary?.attendanceDays]);
  const pendingSops = useMemo(() => String(homeSummary?.pendingSopCount ?? 0), [homeSummary?.pendingSopCount]);
  const notifications = homeSummary?.notifications || [];

  const handleNotificationPress = useCallback(async (notificationId: number, readAt: string | null, bizId: number | null) => {
    if (!session?.accessToken) {
      return;
    }

    try {
      if (!readAt) {
        const nextNotification = await markEmployeeNotificationRead(session.accessToken, notificationId);
        setHomeSummary((currentSummary) => {
          if (!currentSummary) {
            return currentSummary;
          }
          const nextNotifications = currentSummary.notifications.map((item) => (
            item.id === nextNotification.id ? nextNotification : item
          ));
          return {
            ...currentSummary,
            notifications: nextNotifications,
            unreadNotificationCount: nextNotifications.filter((item) => !item.readAt).length,
          };
        });
      }

      if (bizId) {
        router.push({pathname: '/payroll/[payrollId]', params: {payrollId: String(bizId)}});
      }
    } catch (error) {
      showToast(error instanceof Error ? error.message : t('通知状态更新失败'));
    }
  }, [router, session?.accessToken, showToast, t]);

  return (
    <ScreenContainer>
      <View style={sharedStyles.header}>
        <View>
          <Text style={sharedStyles.overline}>{t('首页')}</Text>
          <Text style={sharedStyles.title}>{employee?.name ?? employee?.dept ?? t('员工')}</Text>
          <Text style={sharedStyles.muted}>{employee?.dept ?? t('系统通知')}</Text>
        </View>
      </View>

      {/* 首页只保留概览和通知；打卡主流程已经收口到考勤 tab，避免同一进度在两个入口重复展示。 */}
      <View style={styles.statsGrid}>
        <StatCard label={t('本月工时')} value={String(monthHours)} unit="h" />
        <StatCard label={t('出勤天数')} value={String(attendanceDays)} unit="d" />
        <StatCard label={t('待办SOP')} value={String(pendingSops)} unit="p" />
      </View>

      <View style={styles.noticeCard}>
        <View style={styles.noticeHeader}>
          <View style={styles.noticeTitleWrap}>
            <Text style={styles.noticeTitle}>{t('系统通知')}</Text>
            {homeSummary?.unreadNotificationCount ? (
              <View style={styles.noticeBadge}>
                <Text style={styles.noticeBadgeText}>{homeSummary.unreadNotificationCount}</Text>
              </View>
            ) : null}
          </View>
          <Pressable onPress={() => router.push('/notifications')}>
            <Text style={styles.noticeAction}>{t('查看全部')}</Text>
          </Pressable>
        </View>

        {notifications.length > 0 ? notifications.map((item) => (
          (() => {
            const copy = localizeNotificationCopy(item, t);
            return (
          <NoticeRow
            key={item.id}
            icon="receipt-outline"
            iconColor={item.readAt ? colors.textMuted : colors.primary}
            iconBackground={item.readAt ? '#f8fafc' : '#eff6ff'}
            title={copy.title}
            detail={copy.content}
            unread={!item.readAt}
            onPress={() => void handleNotificationPress(item.id, item.readAt, item.bizId)}
          />
            );
          })()
        )) : (
          <NoticeRow
            icon="notifications-outline"
            iconColor={colors.textMuted}
            iconBackground="#f8fafc"
            title={t('暂无通知')}
            detail={t('当前还没有新的系统通知。')}
          />
        )}
      </View>
    </ScreenContainer>
  );
}

function StatCard({label, value, unit}: {label: string; value: string; unit: string}) {
  return (
    <View style={styles.statCard}>
      <Text style={styles.statLabel}>{label}</Text>
      <Text style={styles.statValue}>
        {value}
        <Text style={styles.statUnit}>{unit}</Text>
      </Text>
    </View>
  );
}

function NoticeRow({
  icon,
  iconColor,
  iconBackground,
  title,
  detail,
  unread = false,
  onPress,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  iconColor: string;
  iconBackground: string;
  title: string;
  detail: string;
  unread?: boolean;
  onPress?: () => void;
}) {
  return (
    <Pressable style={({pressed}) => [styles.noticeRow, pressed && styles.noticeRowPressed]} onPress={onPress}>
      <View style={[styles.noticeIconWrap, {backgroundColor: iconBackground}]}>
        <Ionicons name={icon} size={18} color={iconColor} />
      </View>
      <View style={styles.noticeCopy}>
        <View style={styles.noticeRowTitleWrap}>
          <Text style={styles.noticeRowTitle}>{title}</Text>
          {unread ? <View style={styles.noticeUnreadDot} /> : null}
        </View>
        <Text style={styles.noticeRowDetail} numberOfLines={2}>{detail}</Text>
      </View>
      <Ionicons name="chevron-forward" size={16} color={colors.textMuted} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  statsGrid: {flexDirection: 'row', gap: 12},
  statCard: {flex: 1, minHeight: 94, paddingHorizontal: 14, paddingVertical: 18, borderRadius: 24, backgroundColor: colors.white, alignItems: 'center', justifyContent: 'center', shadowColor: colors.text, shadowOpacity: 0.03, shadowRadius: 16, shadowOffset: {width: 0, height: 6}, elevation: 2, borderWidth: 1, borderColor: '#f8fafc'},
  statLabel: {fontSize: 10, color: colors.textMuted, fontWeight: '900', letterSpacing: 1.2, textTransform: 'uppercase'},
  statValue: {marginTop: 8, fontSize: 24, lineHeight: 28, color: colors.text, fontWeight: '900'},
  statUnit: {fontSize: 11, color: colors.textMuted, fontWeight: '800'},
  noticeCard: {marginTop: 16, padding: 20, borderRadius: 28, backgroundColor: colors.white, shadowColor: colors.text, shadowOpacity: 0.03, shadowRadius: 20, shadowOffset: {width: 0, height: 8}, elevation: 3, borderWidth: 1, borderColor: '#f1f5f9'},
  noticeHeader: {flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10},
  noticeTitleWrap: {flexDirection: 'row', alignItems: 'center', gap: 8},
  noticeTitle: {fontSize: 13, color: colors.text, fontWeight: '900', letterSpacing: 1.4, textTransform: 'uppercase'},
  noticeAction: {fontSize: 11, color: colors.primary, fontWeight: '900', letterSpacing: 1},
  noticeBadge: {minWidth: 20, height: 20, borderRadius: 999, paddingHorizontal: 6, backgroundColor: '#dbeafe', alignItems: 'center', justifyContent: 'center'},
  noticeBadgeText: {fontSize: 11, color: colors.primary, fontWeight: '900'},
  noticeRow: {flexDirection: 'row', alignItems: 'center', gap: 14, paddingVertical: 12},
  noticeRowPressed: {opacity: 0.72},
  noticeIconWrap: {width: 40, height: 40, borderRadius: 14, alignItems: 'center', justifyContent: 'center'},
  noticeCopy: {flex: 1},
  noticeRowTitleWrap: {flexDirection: 'row', alignItems: 'center', gap: 8},
  noticeRowTitle: {fontSize: 14, color: colors.text, fontWeight: '800'},
  noticeRowDetail: {marginTop: 2, fontSize: 12, lineHeight: 18, color: colors.textSubtle, fontWeight: '600'},
  noticeUnreadDot: {width: 8, height: 8, borderRadius: 999, backgroundColor: colors.primary},
});
