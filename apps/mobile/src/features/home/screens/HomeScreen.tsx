import React, {useCallback, useEffect, useMemo, useState} from 'react';
import * as Location from 'expo-location';
import {useFocusEffect} from 'expo-router';
import {Alert, Platform, Pressable, StyleSheet, Text, Vibration, View} from 'react-native';
import {Ionicons} from '@expo/vector-icons';
import {useTranslation} from 'react-i18next';
import {useAuth} from '../../../application/providers/AuthProvider';
import {useToast} from '../../../application/providers/ToastProvider';
import {fetchMobileHomeSummary, fetchTodayAttendanceStatus, submitAttendanceCheckIn} from '../../attendance/services/attendanceApi';
import {MobileHomeSummary, TodayAttendanceStatus} from '../../attendance/types';
import {ScreenContainer} from '../../../shared/components/ScreenContainer';
import {formatDateLabel, formatFullTime} from '../../../shared/utils/date';
import {sharedStyles} from '../../../shared/constants/styles';
import {colors} from '../../../shared/constants/colors';
import {CheckInCard, CheckInPhase} from '../components/CheckInCard';

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
  const [currentTime, setCurrentTime] = useState(new Date());
  const [todayStatus, setTodayStatus] = useState<TodayAttendanceStatus | null>(null);
  const [homeSummary, setHomeSummary] = useState<MobileHomeSummary | null>(null);
  const [todayStatusError, setTodayStatusError] = useState<string | null>(null);
  const [phase, setPhase] = useState<CheckInPhase>('idle');
  const [helperText, setHelperText] = useState<string | null>(null);

  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

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

  const formattedDate = useMemo(() => formatDateLabel(currentTime), [currentTime]);
  const displayStatus = todayStatus ?? FALLBACK_STATUS;
  const isBusy = phase === 'requesting_permission' || phase === 'locating' || phase === 'reverse_geocoding' || phase === 'submitting';
  const statusHint = todayStatus ? getStatusHint(todayStatus, t) : t('打卡界面已准备好，今日状态同步后会自动刷新。');
  const displayHelperText = todayStatus ? helperText : (todayStatusError ?? t('正在同步今日打卡状态，请稍候。'));
  const headerText = getHeaderText(todayStatus, t);
  const monthHours = useMemo(() => String(homeSummary?.monthHours ?? 0), [homeSummary?.monthHours]);
  const attendanceDays = useMemo(() => String(homeSummary?.attendanceDays ?? 0), [homeSummary?.attendanceDays]);
  const pendingSops = useMemo(() => String(homeSummary?.pendingSopCount ?? 0), [homeSummary?.pendingSopCount]);

  const handleCheckIn = async () => {
    if (!todayStatus || !session?.accessToken || isBusy) {
      showToast(todayStatusError ?? t('今日状态同步中，请稍后再试。'));
      return;
    }

    if (todayStatus.status === 'checked_out') {
      showToast(t('今日打卡已完成'));
      return;
    }

    try {
      setHelperText(null);
      setPhase('requesting_permission');
      const permission = await Location.requestForegroundPermissionsAsync();
      if (permission.status !== Location.PermissionStatus.GRANTED) {
        throw new Error(t('定位失败，不能打卡。请重试定位；如果一直失败，请重启 App 后再试。'));
      }

      setPhase('locating');
      const providerStatus = Platform.OS === 'android' ? await Location.getProviderStatusAsync().catch(() => null) : null;
      let location = null;

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

      if (!location || !Number.isFinite(location.coords.latitude) || !Number.isFinite(location.coords.longitude)) {
        throw new Error(t('定位失败，不能打卡。请重试定位；如果一直失败，请重启 App 后再试。'));
      }

      setPhase('reverse_geocoding');
      const [address] = await Location.reverseGeocodeAsync(location.coords).catch(error => {
        // 地址反查失败不阻断打卡：已按需求保留坐标提交，并记录失败原因帮助后续排查地图/系统服务问题。
        console.warn('[mobile-attendance] reverse geocode failed; submit with coordinates only', {message: error instanceof Error ? error.message : String(error)});
        return [];
      });
      const locationName = address ? [address.city, address.district, address.street].filter(Boolean).join(' ') : '';

      setPhase('submitting');
      const action = todayStatus.status === 'not_checked_in' ? 'check_in' : 'check_out';
      const nextStatus = await submitAttendanceCheckIn(session.accessToken, {
        type: action,
        latitude: location.coords.latitude,
        longitude: location.coords.longitude,
        accuracy: location.coords.accuracy ?? 0,
        locationName,
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

  return (
    <ScreenContainer>
      <View style={sharedStyles.header}>
        <View>
          <Text style={sharedStyles.overline}>{headerText.eyebrow}</Text>
          <Text style={sharedStyles.title}>{headerText.title}</Text>
          <Text style={sharedStyles.muted}>{employee?.dept ?? employee?.name ?? t('员工')}</Text>
        </View>
        <View style={sharedStyles.avatarSmall}><Text style={sharedStyles.avatarText}>{employee?.name?.[0] ?? 'E'}</Text></View>
      </View>

      <CheckInCard
        currentTime={formatFullTime(currentTime)}
        currentDate={formattedDate}
        status={displayStatus}
        onCheckIn={handleCheckIn}
        phase={phase}
        disabled={isBusy || !todayStatus}
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
          <Text style={styles.noticeTitle}>{t('系统通知')}</Text>
          <Pressable onPress={() => showToast(t('通知列表即将开放'))}>
            <Text style={styles.noticeAction}>{t('查看全部')}</Text>
          </Pressable>
        </View>

        <NoticeRow
          icon="notifications-outline"
          iconColor={colors.primary}
          iconBackground="#eff6ff"
          title={t('仓库消防演练通知')}
          detail={t('本周五下午 14:00 全员参与，请提前 10 分钟到 A 区集合。')}
        />
        <NoticeRow
          icon="checkmark-circle-outline"
          iconColor={colors.success}
          iconBackground="#ecfdf5"
          title={t('4 月工资条已生成')}
          detail={t('请前往个人中心查看详情。')}
        />
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
}: {
  icon: keyof typeof Ionicons.glyphMap;
  iconColor: string;
  iconBackground: string;
  title: string;
  detail: string;
}) {
  return (
    <Pressable style={({pressed}) => [styles.noticeRow, pressed && styles.noticeRowPressed]}>
      <View style={[styles.noticeIconWrap, {backgroundColor: iconBackground}]}>
        <Ionicons name={icon} size={18} color={iconColor} />
      </View>
      <View style={styles.noticeCopy}>
        <Text style={styles.noticeRowTitle}>{title}</Text>
        <Text style={styles.noticeRowDetail} numberOfLines={2}>{detail}</Text>
      </View>
      <Ionicons name="chevron-forward" size={16} color={colors.textMuted} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  statsGrid: {marginTop: 16, flexDirection: 'row', gap: 12},
  statCard: {flex: 1, minHeight: 94, paddingHorizontal: 14, paddingVertical: 18, borderRadius: 24, backgroundColor: colors.white, alignItems: 'center', justifyContent: 'center', shadowColor: colors.text, shadowOpacity: 0.03, shadowRadius: 16, shadowOffset: {width: 0, height: 6}, elevation: 2, borderWidth: 1, borderColor: '#f8fafc'},
  statLabel: {fontSize: 10, color: colors.textMuted, fontWeight: '900', letterSpacing: 1.2, textTransform: 'uppercase'},
  statValue: {marginTop: 8, fontSize: 24, lineHeight: 28, color: colors.text, fontWeight: '900'},
  statUnit: {fontSize: 11, color: colors.textMuted, fontWeight: '800'},
  noticeCard: {marginTop: 16, padding: 20, borderRadius: 28, backgroundColor: colors.white, shadowColor: colors.text, shadowOpacity: 0.03, shadowRadius: 20, shadowOffset: {width: 0, height: 8}, elevation: 3, borderWidth: 1, borderColor: '#f1f5f9'},
  noticeHeader: {flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10},
  noticeTitle: {fontSize: 13, color: colors.text, fontWeight: '900', letterSpacing: 1.4, textTransform: 'uppercase'},
  noticeAction: {fontSize: 11, color: colors.primary, fontWeight: '900', letterSpacing: 1},
  noticeRow: {flexDirection: 'row', alignItems: 'center', gap: 14, paddingVertical: 12},
  noticeRowPressed: {opacity: 0.72},
  noticeIconWrap: {width: 40, height: 40, borderRadius: 14, alignItems: 'center', justifyContent: 'center'},
  noticeCopy: {flex: 1},
  noticeRowTitle: {fontSize: 14, color: colors.text, fontWeight: '800'},
  noticeRowDetail: {marginTop: 2, fontSize: 12, lineHeight: 18, color: colors.textSubtle, fontWeight: '600'},
});
