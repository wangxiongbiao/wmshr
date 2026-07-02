import React, {useCallback, useEffect, useMemo, useState} from 'react';
import * as Location from 'expo-location';
import {useFocusEffect, useRouter} from 'expo-router';
import {Alert, Platform, Pressable, StyleSheet, Text, Vibration, View} from 'react-native';
import {Ionicons} from '@expo/vector-icons';
import {useTranslation} from 'react-i18next';
import {useAuth} from '../../../application/providers/AuthProvider';
import {useToast} from '../../../application/providers/ToastProvider';
import {fetchMobileHomeSummary, fetchTodayAttendanceStatus, markEmployeeNotificationRead, submitAttendanceCheckIn, syncAttendanceLocation} from '../../attendance/services/attendanceApi';
import {MobileHomeSummary, TodayAttendanceStatus} from '../../attendance/types';
import {ScreenContainer} from '../../../shared/components/ScreenContainer';
import {sharedStyles} from '../../../shared/constants/styles';
import {colors} from '../../../shared/constants/colors';
import {CheckInCard, CheckInPhase} from '../components/CheckInCard';
import {localizeNotificationCopy} from '../utils/notifications';

const FALLBACK_STATUS: TodayAttendanceStatus = {
  date: '',
  status: 'not_checked_in',
  checkInTime: null,
  checkOutTime: null,
  locationName: null,
  locationAccuracy: null,
  canCheckIn: false,
  canCheckOut: false,
};

function getStatusHint(status: TodayAttendanceStatus, t: (value: string) => string) {
  if (status.status === 'not_checked_in') {
    return t('当前还未打卡；确认定位成功后即可开始上班打卡。');
  }
  if (status.status === 'checked_in') {
    return t('你已完成上班打卡；下班前请返回此页完成下班打卡。');
  }
  return t('今天的上下班打卡都已完成。');
}

function isAndroidLocationServicesInvalid(error: unknown) {
  const message = error instanceof Error ? error.message : String(error);
  return Platform.OS === 'android' && (message.includes('LocationServices.API') || message.includes('SERVICE_INVALID'));
}

function getHeaderText(status: TodayAttendanceStatus | null, t: (value: string) => string) {
  if (!status) {
    return {eyebrow: t('今日任务'), title: t('准备同步打卡状态')};
  }
  if (status.status === 'not_checked_in') {
    return {eyebrow: t('今日任务'), title: t('先完成上班打卡')};
  }
  if (status.status === 'checked_in') {
    return {eyebrow: t('当前进度'), title: t('今天已开始工作')};
  }
  return {eyebrow: t('当前进度'), title: t('今天的打卡已完成')};
}

export function HomeScreen() {
  const { t } = useTranslation('app');
  const {employee, session} = useAuth();
  const {showToast} = useToast();
  const router = useRouter();
  const [todayStatus, setTodayStatus] = useState<TodayAttendanceStatus | null>(null);
  const [homeSummary, setHomeSummary] = useState<MobileHomeSummary | null>(null);
  const [todayStatusError, setTodayStatusError] = useState<string | null>(null);
  const [phase, setPhase] = useState<CheckInPhase>('idle');
  const [helperText, setHelperText] = useState<string | null>(null);

  const loadTodayStatus = useCallback(async (showErrorToast = false) => {
    if (!session?.accessToken) {
      return;
    }

    try {
      // 首页按你的要求始终直出打卡界面，不再切换到独立 loading 卡片；真实状态回来后只覆盖当前卡片内容。
      const status = await fetchTodayAttendanceStatus(session.accessToken);
      setTodayStatus(status);
      setTodayStatusError(null);
    } catch (error) {
      const message = error instanceof Error ? error.message : t('今日打卡状态加载失败');
      setTodayStatusError(message);
      if (showErrorToast) {
        showToast(message);
      }
    }
  }, [session?.accessToken, showToast, t]);

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
    void loadTodayStatus(false);
    void loadHomeSummary();
  }, [loadHomeSummary, loadTodayStatus]);

  useFocusEffect(
    useCallback(() => {
      void loadTodayStatus(false);
      void loadHomeSummary();
    }, [loadHomeSummary, loadTodayStatus]),
  );

  const displayStatus = todayStatus ?? FALLBACK_STATUS;
  const isBusy = phase === 'requesting_permission' || phase === 'locating' || phase === 'reverse_geocoding' || phase === 'submitting';
  const statusHint = todayStatus ? getStatusHint(todayStatus, t) : t('打卡界面已准备好，今日状态同步后会自动刷新。');
  const displayHelperText = todayStatus ? helperText : (todayStatusError ?? t('正在同步今日打卡状态，请稍候。'));
  const headerText = getHeaderText(todayStatus, t);
  const monthHours = useMemo(() => String(homeSummary?.monthHours ?? 0), [homeSummary?.monthHours]);
  const attendanceDays = useMemo(() => String(homeSummary?.attendanceDays ?? 0), [homeSummary?.attendanceDays]);
  const pendingSops = useMemo(() => String(homeSummary?.pendingSopCount ?? 0), [homeSummary?.pendingSopCount]);
  const notifications = homeSummary?.notifications || [];

  const handleCheckIn = async () => {
    if (!session?.accessToken || isBusy) {
      showToast(todayStatusError ?? t('今日状态同步中，请稍后再试。'));
      return;
    }

    if (!todayStatus) {
      await loadTodayStatus(true);
      showToast(todayStatusError ?? t('今日状态已重新同步，请再点一次打卡。'));
      return;
    }

    if (todayStatus.status === 'checked_out') {
      showToast(t('今日打卡已完成'));
      return;
    }

    try {
      setHelperText(null);
      setPhase('requesting_permission');
      const currentPermission = await Location.getForegroundPermissionsAsync();
      const permission = currentPermission.status === Location.PermissionStatus.GRANTED
        ? currentPermission
        : await Location.requestForegroundPermissionsAsync();
      if (permission.status !== Location.PermissionStatus.GRANTED) {
        throw new Error(t('定位失败，不能打卡。请重试定位；如果一直失败，请重启 App 后再试。'));
      }

      setPhase('locating');
      const providerStatus = Platform.OS === 'android' ? await Location.getProviderStatusAsync().catch(() => null) : null;
      let location = await Location.getLastKnownPositionAsync({maxAge: 10 * 60 * 1000, requiredAccuracy: 1500}).catch(() => null);

      if (!location) {
        try {
          location = await Location.getCurrentPositionAsync({accuracy: Location.Accuracy.Balanced, mayShowUserSettingsDialog: false});
        } catch (error) {
          if (!isAndroidLocationServicesInvalid(error)) {
            throw error;
          }

          // 某些安卓真机/ROM 缺少可用的 Google LocationServices 时，expo-location 的 fused current location 会直接报 SERVICE_INVALID；
          // 这里回退到系统原生 last known provider，优先保住打卡闭环，而不是把整条流程卡死在 Google 定位实现上。
          location = await Location.getLastKnownPositionAsync({maxAge: 15 * 60 * 1000, requiredAccuracy: 3000});
          if (!location) {
            if (providerStatus?.gpsAvailable || providerStatus?.networkAvailable) {
              throw new Error(t('当前设备实时定位服务不可用，且暂时没有可复用的位置缓存。请先在系统地图中完成一次定位后再重试打卡。'));
            }
            throw new Error(t('当前设备未提供可用定位服务，请先在系统设置中打开定位后再重试打卡。'));
          }
        }
      }

      if (!location || !Number.isFinite(location.coords.latitude) || !Number.isFinite(location.coords.longitude)) {
        throw new Error(t('定位失败，不能打卡。请重试定位；如果一直失败，请重启 App 后再试。'));
      }

      setPhase('submitting');
      const action = todayStatus.status === 'not_checked_in' ? 'check_in' : 'check_out';
      const reverseGeocodeTask = Location.reverseGeocodeAsync(location.coords)
        .then((addresses) => {
          const [address] = addresses || [];
          return address ? [address.city, address.district, address.street].filter(Boolean).join(' ') : '';
        })
        .catch(error => {
          // 地址反查改成提交后的异步补偿，不再阻塞打卡成功返回；失败时只记日志，不影响主流程。
          console.warn('[mobile-attendance] reverse geocode failed; skip async location sync', {message: error instanceof Error ? error.message : String(error)});
          return '';
        });
      const nextStatus = await submitAttendanceCheckIn(session.accessToken, {
        type: action,
        latitude: location.coords.latitude,
        longitude: location.coords.longitude,
        accuracy: location.coords.accuracy ?? 0,
        locationName: '',
        deviceId: `${Platform.OS}:${Platform.Version}`,
        // 服务端现在会用固定业务时区作为唯一判定时间源；这里保留客户端时间与时区，只用于排查跨时区打卡问题，不参与允许/不允许判定。
        clientTime: new Date().toISOString(),
        timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone,
        timezoneOffsetMinutes: new Date().getTimezoneOffset(),
      });

      setTodayStatus(nextStatus);
      setPhase('success');
      setHelperText(null);
      setTodayStatusError(null);
      // 成功结果必须强反馈：弹窗让员工确认最终状态，震动用于移动端即时触觉反馈。
      Vibration.vibrate(Platform.OS === 'ios' ? 400 : [0, 180, 80, 180]);
      Alert.alert(t('打卡成功'), nextStatus.status === 'checked_in' ? t('上班打卡成功') : t('下班打卡成功'));
      showToast(nextStatus.status === 'checked_in' ? t('上班打卡成功') : t('下班打卡成功'));
      void reverseGeocodeTask.then((resolvedLocationName) => {
        if (!resolvedLocationName || !session?.accessToken) {
          return;
        }
        void syncAttendanceLocation(session.accessToken, {locationName: resolvedLocationName})
          .then((syncedStatus) => {
            setTodayStatus(currentStatus => currentStatus ? {...currentStatus, locationName: syncedStatus.locationName} : syncedStatus);
          })
          .catch(error => {
            console.warn('[mobile-attendance] async location sync failed', {message: error instanceof Error ? error.message : String(error)});
          });
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : t('打卡失败');
      // 失败日志只记录非敏感排障信息；后端契约尚未包含 appVersion/deviceInfo 字段，避免擅自扩展接口导致请求被拒。
      console.warn('[mobile-attendance] punch failed', {
        action: todayStatus.status === 'not_checked_in' ? 'check_in' : 'check_out',
        message,
        platform: Platform.OS,
        osVersion: Platform.Version,
        phase,
      });
      setPhase('failed');
      setHelperText(message === t('定位失败，不能打卡。请重试定位；如果一直失败，请重启 App 后再试。') ? t('定位失败，不能打卡。请重试定位；如果一直失败，请重启 App 后再试。') : message);
      showToast(message);
    }
  };

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
          <Text style={sharedStyles.overline}>{headerText.eyebrow}</Text>
          <Text style={sharedStyles.title}>{headerText.title}</Text>
          <Text style={sharedStyles.muted}>{employee?.dept ?? employee?.name ?? t('员工')}</Text>
        </View>
      </View>

      <CheckInCard
        status={displayStatus}
        onCheckIn={handleCheckIn}
        phase={phase}
        disabled={isBusy || displayStatus.status === 'checked_out'}
        helperText={displayHelperText}
        statusHint={statusHint}
        warningText={todayStatus?.warning ?? null}
      />

      <View style={styles.statsGrid}>
        <StatCard label={t('本月工时')} value={String(monthHours)} unit="h" />
        <StatCard label={t('出勤天数')} value={String(attendanceDays)} unit="d" />
        <StatCard label={t('待办SOP')} value={String(pendingSops)} unit="p" />
      </View>

      <View style={styles.noticeCard}>
        <View style={styles.noticeHeader}>
          {/* 首页通知头需要兼容英文等更长词条：左侧标题可收缩，右侧入口保持短文案，避免 unread badge 与 action 文案互相挤压。 */}
          <View style={styles.noticeTitleWrap}>
            <Text style={styles.noticeTitle} numberOfLines={1}>{t('系统通知')}</Text>
            {homeSummary?.unreadNotificationCount ? (
              <View style={styles.noticeBadge}>
                <Text style={styles.noticeBadgeText}>{homeSummary.unreadNotificationCount}</Text>
              </View>
            ) : null}
          </View>
          <Pressable onPress={() => router.push('/notifications')} style={styles.noticeActionWrap}>
            <Text style={styles.noticeAction} numberOfLines={1}>{t('查看全部')}</Text>
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
      <Text style={styles.statLabel} numberOfLines={2}>{label}</Text>
      <Text style={styles.statValue} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.72}>
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
          <Text style={styles.noticeRowTitle} numberOfLines={1}>{title}</Text>
          {unread ? <View style={styles.noticeUnreadDot} /> : null}
        </View>
        <Text style={styles.noticeRowDetail} numberOfLines={2}>{detail}</Text>
      </View>
      <Ionicons name="chevron-forward" size={16} color={colors.textMuted} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  statsGrid: {marginTop: 16, flexDirection: 'row', gap: 12},
  // 首页统计卡在中英文切换时都保持三列，因此标题默认允许两行并取消全大写/大字距，优先保证小屏上的可读性。
  statCard: {flex: 1, minHeight: 94, paddingHorizontal: 14, paddingVertical: 18, borderRadius: 16, backgroundColor: colors.white, alignItems: 'center', justifyContent: 'center', shadowColor: colors.text, shadowOpacity: 0.03, shadowRadius: 16, shadowOffset: {width: 0, height: 6}, elevation: 2, borderWidth: 1, borderColor: '#f8fafc'},
  statLabel: {fontSize: 10, lineHeight: 13, color: colors.textMuted, fontWeight: '900', textAlign: 'center', flexShrink: 1},
  statValue: {width: '100%', marginTop: 8, fontSize: 20, lineHeight: 24, color: colors.text, fontWeight: '900', textAlign: 'center', includeFontPadding: false},
  statUnit: {fontSize: 10, color: colors.textMuted, fontWeight: '800'},
  noticeCard: {marginTop: 16, padding: 20, borderRadius: 16, backgroundColor: colors.white, shadowColor: colors.text, shadowOpacity: 0.03, shadowRadius: 20, shadowOffset: {width: 0, height: 8}, elevation: 3, borderWidth: 1, borderColor: '#f1f5f9'},
  noticeHeader: {flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12, marginBottom: 10},
  noticeTitleWrap: {flexDirection: 'row', alignItems: 'center', gap: 8, flex: 1, minWidth: 0},
  noticeTitle: {fontSize: 13, lineHeight: 17, color: colors.text, fontWeight: '900', flexShrink: 1},
  noticeActionWrap: {flexShrink: 0, maxWidth: 88},
  noticeAction: {fontSize: 11, color: colors.primary, fontWeight: '900', textAlign: 'right'},
  noticeBadge: {minWidth: 20, height: 20, borderRadius: 16, paddingHorizontal: 6, backgroundColor: '#dbeafe', alignItems: 'center', justifyContent: 'center', flexShrink: 0},
  noticeBadgeText: {fontSize: 11, color: colors.primary, fontWeight: '900'},
  noticeRow: {flexDirection: 'row', alignItems: 'center', gap: 14, paddingVertical: 12},
  noticeRowPressed: {opacity: 0.72},
  noticeIconWrap: {width: 40, height: 40, borderRadius: 16, alignItems: 'center', justifyContent: 'center', flexShrink: 0},
  noticeCopy: {flex: 1, minWidth: 0},
  noticeRowTitleWrap: {flexDirection: 'row', alignItems: 'center', gap: 8, minWidth: 0},
  noticeRowTitle: {fontSize: 14, lineHeight: 18, color: colors.text, fontWeight: '800', flexShrink: 1},
  noticeRowDetail: {marginTop: 2, fontSize: 12, lineHeight: 18, color: colors.textSubtle, fontWeight: '600'},
  noticeUnreadDot: {width: 8, height: 8, borderRadius: 16, backgroundColor: colors.primary, flexShrink: 0},
});
