import React, {useCallback, useEffect, useMemo, useState} from 'react';
import * as Location from 'expo-location';
import {useFocusEffect} from '@react-navigation/native';
import {Alert, Platform, StyleSheet, Text, TextInput, Vibration, View} from 'react-native';
import {useTranslation} from 'react-i18next';
import {useAuth} from '../../../application/providers/AuthProvider';
import {useToast} from '../../../application/providers/ToastProvider';
import {fetchTodayAttendanceStatus, submitAttendanceCheckIn} from '../../attendance/services/attendanceApi';
import {TodayAttendanceStatus} from '../../attendance/types';
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
    return status.requiresDescriptionInWorkTime
      ? t('当前还未打卡；请先填写打卡说明，再开始上班打卡。')
      : t('当前还未打卡；确认定位成功后即可开始上班打卡。');
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
  const [todayStatusError, setTodayStatusError] = useState<string | null>(null);
  const [description, setDescription] = useState('');
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

  useEffect(() => {
    void loadTodayStatus(false);
  }, [loadTodayStatus]);

  useFocusEffect(
    useCallback(() => {
      void loadTodayStatus(false);
    }, [loadTodayStatus]),
  );

  const formattedDate = useMemo(() => formatDateLabel(currentTime), [currentTime]);
  const displayStatus = todayStatus ?? FALLBACK_STATUS;
  const requiresDescription = Boolean(displayStatus.requiresDescriptionInWorkTime && displayStatus.status !== 'checked_out');
  const isBusy = phase === 'requesting_permission' || phase === 'locating' || phase === 'reverse_geocoding' || phase === 'submitting';
  const statusHint = todayStatus ? getStatusHint(todayStatus, t) : t('打卡界面已准备好，今日状态同步后会自动刷新。');
  const displayHelperText = todayStatus ? helperText : (todayStatusError ?? t('正在同步今日打卡状态，请稍候。'));
  const headerText = getHeaderText(todayStatus, t);
  const summaryItems = [
    {
      label: t('说明'),
      value: displayStatus.status === 'checked_out'
        ? t('已结束')
        : requiresDescription ? t('必填') : t('可选'),
    },
    {
      label: t('定位'),
      value: todayStatus ? t('已就绪') : t('同步中'),
    },
    {
      label: t('状态'),
      value: displayStatus.status === 'not_checked_in' ? t('待上班') : displayStatus.status === 'checked_in' ? t('待下班') : t('已完成'),
    },
  ];

  const handleCheckIn = async () => {
    if (!todayStatus || !session?.accessToken || isBusy) {
      showToast(todayStatusError ?? t('今日状态同步中，请稍后再试。'));
      return;
    }

    if (todayStatus.status === 'checked_out') {
      showToast(t('今日打卡已完成'));
      return;
    }

    const trimmedDescription = description.trim();
    if (requiresDescription && !trimmedDescription) {
      // 后端已经有同一条强校验；前端先拦截是为了给员工明确、即时的上班时间说明要求，避免进入定位后才被接口拒绝。
      setPhase('description_required');
      setHelperText(t('上班时间打卡必须填写打卡说明。'));
      showToast(t('上班时间打卡必须填写打卡说明。'));
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
        description: trimmedDescription,
        deviceId: `${Platform.OS}:${Platform.Version}`,
        // 服务端现在会用固定业务时区作为唯一判定时间源；这里保留客户端时间与时区，只用于排查跨时区打卡问题，不参与允许/不允许判定。
        clientTime: new Date().toISOString(),
        timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone,
        timezoneOffsetMinutes: new Date().getTimezoneOffset(),
      });

      setTodayStatus(nextStatus);
      setDescription('');
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
        requiresDescription,
        hasDescription: Boolean(trimmedDescription),
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
          <Text style={sharedStyles.muted}>{employee?.name ?? t('员工')}</Text>
        </View>
        <View style={sharedStyles.avatarSmall}><Text style={sharedStyles.avatarText}>{employee?.name?.[0] ?? 'E'}</Text></View>
      </View>

      <View style={styles.summaryStrip}>
        {summaryItems.map(item => (
          <View key={item.label} style={styles.summaryItem}>
            <Text style={styles.summaryLabel}>{item.label}</Text>
            <Text style={styles.summaryValue}>{item.value}</Text>
          </View>
        ))}
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
      {displayStatus.status !== 'checked_out' ? (
        <View style={[styles.descriptionCard, requiresDescription && styles.descriptionRequiredCard]}>
          <View style={styles.descriptionHeader}>
            <View>
              <Text style={sharedStyles.cardTitle}>{requiresDescription ? t('打卡说明（必填）') : t('打卡说明')}</Text>
              <Text style={[sharedStyles.muted, requiresDescription && styles.requiredText]}>{requiresDescription ? t('上班时间打卡必须填写打卡说明。') : t('非上班时间说明可选。')}</Text>
            </View>
            <View style={[styles.requirementBadge, requiresDescription ? styles.requirementBadgeWarn : styles.requirementBadgeNeutral]}>
              <Text style={[styles.requirementBadgeText, requiresDescription ? styles.requirementBadgeTextWarn : styles.requirementBadgeTextNeutral]}>
                {requiresDescription ? t('必填') : t('可选')}
              </Text>
            </View>
          </View>
          <View style={styles.descriptionTips}>
            <Text style={styles.tipText}>{t('例如：外出盘点后返回')}</Text>
            <Text style={styles.tipDot}>·</Text>
            <Text style={styles.tipText}>{t('临时会议')}</Text>
            <Text style={styles.tipDot}>·</Text>
            <Text style={styles.tipText}>{t('门店支援')}</Text>
          </View>
          <TextInput
            value={description}
            onChangeText={value => {
              setDescription(value);
              if (phase === 'description_required' && value.trim()) {
                setPhase('idle');
                setHelperText(null);
              }
            }}
            placeholder={t('例如：外出盘点后返回、临时会议等')}
            style={[styles.input, requiresDescription && !description.trim() && styles.inputRequired]}
            multiline
          />
        </View>
      ) : null}
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  summaryStrip: {marginTop: 4, marginBottom: 16, flexDirection: 'row', gap: 12},
  summaryItem: {flex: 1, minHeight: 82, padding: 16, borderRadius: 24, backgroundColor: colors.white, justifyContent: 'space-between', shadowColor: colors.text, shadowOpacity: 0.03, shadowRadius: 16, shadowOffset: {width: 0, height: 6}, elevation: 2, borderWidth: 1, borderColor: '#f8fafc'},
  summaryLabel: {fontSize: 12, color: colors.textMuted, fontWeight: '800'},
  summaryValue: {fontSize: 16, lineHeight: 22, color: colors.text, fontWeight: '900'},
  descriptionCard: {marginTop: 16, padding: 20, borderRadius: 28, backgroundColor: colors.white, gap: 12, shadowColor: colors.text, shadowOpacity: 0.03, shadowRadius: 20, shadowOffset: {width: 0, height: 8}, elevation: 3, borderWidth: 1, borderColor: '#f1f5f9'},
  descriptionRequiredCard: {borderColor: '#fed7aa', backgroundColor: '#fffcf5'},
  descriptionHeader: {flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: 12},
  requirementBadge: {minWidth: 56, height: 32, paddingHorizontal: 12, borderRadius: 999, alignItems: 'center', justifyContent: 'center'},
  requirementBadgeWarn: {backgroundColor: '#ffedd5'},
  requirementBadgeNeutral: {backgroundColor: '#eff6ff'},
  requirementBadgeText: {fontSize: 12, fontWeight: '900'},
  requirementBadgeTextWarn: {color: colors.warning},
  requirementBadgeTextNeutral: {color: colors.primary},
  descriptionTips: {flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', gap: 8, marginTop: 4},
  tipText: {fontSize: 13, lineHeight: 20, color: colors.textSubtle, fontWeight: '700'},
  tipDot: {fontSize: 13, color: colors.textMuted, fontWeight: '900'},
  requiredText: {color: colors.warning, fontWeight: '800'},
  input: {minHeight: 100, padding: 16, borderRadius: 20, borderWidth: 1, borderColor: colors.border, color: colors.text, textAlignVertical: 'top', backgroundColor: '#f8fafc', fontSize: 15, lineHeight: 22},
  inputRequired: {borderColor: colors.warning, backgroundColor: colors.white},
});
