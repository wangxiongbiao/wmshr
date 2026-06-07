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
      const location = await Location.getCurrentPositionAsync({accuracy: Location.Accuracy.Balanced});
      if (!Number.isFinite(location.coords.latitude) || !Number.isFinite(location.coords.longitude)) {
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
        clientTime: new Date().toISOString(),
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
          <Text style={sharedStyles.overline}>{t('下午好')}</Text>
          <Text style={sharedStyles.title}>{employee?.name ?? t('员工')}</Text>
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
      {displayStatus.status !== 'checked_out' ? (
        <View style={[styles.descriptionCard, requiresDescription && styles.descriptionRequiredCard]}>
          <Text style={sharedStyles.cardTitle}>{requiresDescription ? t('打卡说明（必填）') : t('打卡说明')}</Text>
          <Text style={[sharedStyles.muted, requiresDescription && styles.requiredText]}>{requiresDescription ? t('上班时间打卡必须填写打卡说明。') : t('非上班时间说明可选。')}</Text>
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
  descriptionCard: {marginTop: 14, padding: 16, borderRadius: 22, backgroundColor: colors.white, gap: 8},
  descriptionRequiredCard: {borderWidth: 1, borderColor: colors.warning},
  requiredText: {color: colors.warning, fontWeight: '800'},
  input: {minHeight: 76, padding: 12, borderRadius: 16, borderWidth: 1, borderColor: colors.border, color: colors.text, textAlignVertical: 'top'},
  inputRequired: {borderColor: colors.warning},
});
