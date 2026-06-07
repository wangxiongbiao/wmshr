import React from 'react';
import {Ionicons} from '@expo/vector-icons';
import {Pressable, StyleSheet, Text, View} from 'react-native';
import {useTranslation} from 'react-i18next';
import {TodayAttendanceStatus} from '../../attendance/types';
import {colors} from '../../../shared/constants/colors';
import {sharedStyles} from '../../../shared/constants/styles';

export type CheckInPhase = 'idle' | 'description_required' | 'requesting_permission' | 'locating' | 'reverse_geocoding' | 'submitting' | 'success' | 'failed';

type Props = {
  currentTime: string;
  currentDate: string;
  status: TodayAttendanceStatus;
  onCheckIn: () => void;
  phase?: CheckInPhase;
  disabled?: boolean;
  helperText?: string | null;
  statusHint?: string | null;
  warningText?: string | null;
};

function getButtonText(status: TodayAttendanceStatus, phase: CheckInPhase, t: (value: string) => string) {
  if (phase === 'requesting_permission') return t('请求定位权限...');
  if (phase === 'locating') return t('正在定位...');
  if (phase === 'reverse_geocoding') return t('正在获取地址...');
  if (phase === 'submitting') return t('正在提交...');
  if (phase === 'failed') return t('重试打卡');
  if (status.status === 'not_checked_in') return t('上班打卡');
  if (status.status === 'checked_in') return t('下班打卡');
  return t('今日已完成');
}

function getStatusMeta(status: TodayAttendanceStatus, t: (value: string) => string) {
  if (status.status === 'checked_in') {
    return {label: t('在勤中'), pillStyle: styles.statusPillActive, textStyle: styles.statusTextActive};
  }
  if (status.status === 'checked_out') {
    return {label: t('已完成'), pillStyle: styles.statusPillDone, textStyle: styles.statusTextDone};
  }
  return {label: t('未打卡'), pillStyle: null, textStyle: null};
}

export function CheckInCard({currentTime, currentDate, status, onCheckIn, phase = 'idle', disabled = false, helperText = null, statusHint = null, warningText = null}: Props) {
  const { t } = useTranslation('app');
  const {label: statusText, pillStyle, textStyle} = getStatusMeta(status, t);
  const buttonText = getButtonText(status, phase, t);
  const gpsText = `${status.locationName ?? t('未知地点')} · ${t('精度 {{value}}m', { value: status.locationAccuracy ?? '--' })}`;
  const isDisabled = disabled || status.status === 'checked_out';

  return (
    <View style={styles.clockCard}>
      <View style={styles.clockHeader}>
        <View>
          <Text style={sharedStyles.overline}>{t('系统时间')}</Text>
          <Text style={styles.clock}>{currentTime}</Text>
          <Text style={sharedStyles.muted}>{currentDate}</Text>
        </View>
        <View style={[styles.statusPill, pillStyle]}>
          <Text style={[styles.statusText, textStyle]}>{statusText}</Text>
        </View>
      </View>

      <View style={styles.timeGrid}>
        <TimeBox label={t('上班时间')} value={status.checkInTime ?? '--:--'} active={Boolean(status.checkInTime)} />
        <TimeBox label={t('下班时间')} value={status.checkOutTime ?? '--:--'} active={Boolean(status.checkOutTime)} />
      </View>

      {/* 首页必须直接告诉员工“当前状态下下一步该做什么”，避免只看到时间和按钮却不知道自己是在上班前还是下班前。 */}
      {statusHint ? <Text style={styles.statusHint}>{statusHint}</Text> : null}

      <View style={styles.locationRow}>
        <Ionicons name="location-outline" size={18} color={colors.primary} />
        <Text style={styles.locationText}>{gpsText}</Text>
      </View>

      {/* 后端返回的 warning 代表业务态提醒；与本地 helperText 分开展示，避免被打卡过程中的临时提示覆盖掉。 */}
      {warningText ? (
        <View style={styles.warningBox}>
          <Ionicons name="alert-circle-outline" size={18} color={colors.warning} />
          <Text style={styles.warningText}>{warningText}</Text>
        </View>
      ) : null}

      {helperText ? <Text style={styles.helperText}>{helperText}</Text> : null}

      <Pressable disabled={isDisabled} style={({pressed}) => [styles.primaryButton, isDisabled && styles.buttonDisabled, pressed && styles.buttonPressed]} onPress={onCheckIn}>
        <Ionicons name="finger-print-outline" size={22} color={colors.white} />
        <Text style={styles.primaryButtonText}>{buttonText}</Text>
      </Pressable>
    </View>
  );
}

function TimeBox({label, value, active}: {label: string; value: string; active: boolean}) {
  return (
    <View style={styles.timeBox}>
      <Text style={styles.timeLabel}>{label}</Text>
      <Text style={[styles.timeValue, !active && styles.inactiveText]}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  clockCard: {backgroundColor: colors.white, borderRadius: 32, padding: 22, shadowColor: colors.text, shadowOpacity: 0.08, shadowRadius: 18, shadowOffset: {width: 0, height: 10}, elevation: 4},
  clockHeader: {flexDirection: 'row', justifyContent: 'space-between', gap: 12},
  clock: {fontSize: 40, color: colors.text, fontWeight: '900', letterSpacing: -1.6, marginTop: 6},
  statusPill: {height: 32, borderRadius: 999, backgroundColor: colors.border, paddingHorizontal: 12, alignItems: 'center', justifyContent: 'center'},
  statusPillActive: {backgroundColor: '#dcfce7'},
  statusPillDone: {backgroundColor: '#dbeafe'},
  statusText: {fontSize: 11, color: colors.textMuted, fontWeight: '900'},
  statusTextActive: {color: colors.success},
  statusTextDone: {color: colors.primary},
  timeGrid: {flexDirection: 'row', gap: 12, marginTop: 22},
  timeBox: {flex: 1, backgroundColor: colors.background, borderRadius: 20, padding: 16, alignItems: 'center'},
  timeLabel: {fontSize: 10, color: colors.textMuted, fontWeight: '900'},
  timeValue: {fontSize: 25, color: colors.text, fontWeight: '900', marginTop: 8},
  inactiveText: {color: '#cbd5e1'},
  statusHint: {marginTop: 16, color: colors.text, fontSize: 13, fontWeight: '800', lineHeight: 20},
  locationRow: {flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 18, padding: 12, backgroundColor: '#eff6ff', borderRadius: 18},
  locationText: {color: '#1d4ed8', fontWeight: '700', flex: 1},
  warningBox: {marginTop: 12, flexDirection: 'row', alignItems: 'flex-start', gap: 8, padding: 12, borderRadius: 18, backgroundColor: '#fff7ed'},
  warningText: {color: colors.warning, fontSize: 12, fontWeight: '800', lineHeight: 18, flex: 1},
  helperText: {marginTop: 10, color: colors.textMuted, fontSize: 12, fontWeight: '700', lineHeight: 18},
  primaryButton: {marginTop: 18, height: 58, borderRadius: 22, backgroundColor: colors.primary, alignItems: 'center', justifyContent: 'center', flexDirection: 'row', gap: 10},
  buttonPressed: {opacity: 0.82},
  buttonDisabled: {backgroundColor: colors.textMuted},
  primaryButtonText: {color: colors.white, fontWeight: '900', fontSize: 17},
});
