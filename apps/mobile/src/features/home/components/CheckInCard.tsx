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

function getFlowSteps(status: TodayAttendanceStatus, t: (value: string) => string) {
  const isCheckedIn = status.status === 'checked_in' || status.status === 'checked_out';
  const isCheckedOut = status.status === 'checked_out';
  return [
    {label: t('填写说明'), complete: !status.requiresDescriptionInWorkTime || isCheckedIn},
    {label: t('上班打卡'), complete: isCheckedIn},
    {label: t('下班打卡'), complete: isCheckedOut},
  ];
}

function getActionMeta(status: TodayAttendanceStatus, phase: CheckInPhase, t: (value: string) => string) {
  if (phase === 'requesting_permission') {
    return {title: t('正在确认定位权限'), detail: t('请允许 App 使用定位，随后会自动继续。'), icon: 'shield-checkmark-outline' as const};
  }
  if (phase === 'locating') {
    return {title: t('正在获取当前位置'), detail: t('请保持设备稳定，避免切到后台。'), icon: 'locate-outline' as const};
  }
  if (phase === 'reverse_geocoding') {
    return {title: t('正在识别地址信息'), detail: t('坐标已获取，正在补全可读地址。'), icon: 'map-outline' as const};
  }
  if (phase === 'submitting') {
    return {title: t('正在提交打卡记录'), detail: t('请稍候，提交成功后会立即刷新今日状态。'), icon: 'cloud-upload-outline' as const};
  }
  if (status.status === 'not_checked_in') {
    return {title: t('准备开始今天的工作'), detail: t('确认当前位置无误后，完成上班打卡。'), icon: 'sunny-outline' as const};
  }
  if (status.status === 'checked_in') {
    return {title: t('你已完成上班打卡'), detail: t('结束工作前回到这里，完成下班打卡。'), icon: 'briefcase-outline' as const};
  }
  return {title: t('今日打卡已完成'), detail: t('上下班记录都已提交，当前无需额外操作。'), icon: 'checkmark-done-outline' as const};
}

export function CheckInCard({currentTime, currentDate, status, onCheckIn, phase = 'idle', disabled = false, helperText = null, statusHint = null, warningText = null}: Props) {
  const { t } = useTranslation('app');
  const {label: statusText, pillStyle, textStyle} = getStatusMeta(status, t);
  const buttonText = getButtonText(status, phase, t);
  const actionMeta = getActionMeta(status, phase, t);
  const flowSteps = getFlowSteps(status, t);
  const gpsText = `${status.locationName ?? t('未知地点')} · ${t('精度 {{value}}m', { value: status.locationAccuracy ?? '--' })}`;
  const isDisabled = disabled || status.status === 'checked_out';

  return (
    <View style={styles.clockCard}>
      <View style={styles.topBand}>
        <View style={styles.liveBadge}>
          <View style={styles.liveDot} />
          <Text style={styles.liveBadgeText}>{t('今日打卡')}</Text>
        </View>
        <View style={[styles.statusPill, pillStyle]}>
          <Text style={[styles.statusText, textStyle]}>{statusText}</Text>
        </View>
      </View>

      <View style={styles.clockHeader}>
        <View style={styles.clockBlock}>
          <Text style={sharedStyles.overline}>{t('系统时间')}</Text>
          <Text style={styles.clock}>{currentTime}</Text>
          <Text style={sharedStyles.muted}>{currentDate}</Text>
        </View>
        <View style={styles.actionSummary}>
          <View style={styles.actionIconWrap}>
            <Ionicons name={actionMeta.icon} size={20} color={colors.primary} />
          </View>
          <Text style={styles.actionTitle}>{actionMeta.title}</Text>
          <Text style={styles.actionDetail}>{actionMeta.detail}</Text>
        </View>
      </View>

      <View style={styles.timeGrid}>
        <TimeBox label={t('上班时间')} value={status.checkInTime ?? '--:--'} active={Boolean(status.checkInTime)} />
        <TimeBox label={t('下班时间')} value={status.checkOutTime ?? '--:--'} active={Boolean(status.checkOutTime)} />
      </View>

      <View style={styles.flowCard}>
        {flowSteps.map(step => (
          <View key={step.label} style={styles.flowItem}>
            <View style={[styles.flowIcon, step.complete && styles.flowIconDone]}>
              <Ionicons name={step.complete ? 'checkmark' : 'ellipse-outline'} size={14} color={step.complete ? colors.white : colors.primary} />
            </View>
            <Text style={[styles.flowLabel, step.complete && styles.flowLabelDone]}>{step.label}</Text>
          </View>
        ))}
      </View>

      {/* 首页必须直接告诉员工“当前状态下下一步该做什么”，避免只看到时间和按钮却不知道自己是在上班前还是下班前。 */}
      {statusHint ? (
        <View style={styles.statusHintBox}>
          <Ionicons name="information-circle-outline" size={18} color={colors.primary} />
          <Text style={styles.statusHint}>{statusHint}</Text>
        </View>
      ) : null}

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
  clockCard: {backgroundColor: colors.white, borderRadius: 36, padding: 24, shadowColor: colors.text, shadowOpacity: 0.04, shadowRadius: 32, shadowOffset: {width: 0, height: 16}, elevation: 5, borderWidth: 1, borderColor: 'rgba(241,245,249,0.8)'},
  topBand: {flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: 12},
  liveBadge: {height: 28, paddingHorizontal: 14, borderRadius: 999, backgroundColor: '#eff6ff', flexDirection: 'row', alignItems: 'center', gap: 8},
  liveDot: {width: 8, height: 8, borderRadius: 999, backgroundColor: colors.primary},
  liveBadgeText: {fontSize: 12, fontWeight: '800', color: colors.primary},
  clockHeader: {marginTop: 20, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'stretch', gap: 12},
  clockBlock: {flex: 1, minWidth: 0},
  clock: {fontSize: 44, color: colors.text, fontWeight: '900', marginTop: 4, letterSpacing: -1},
  actionSummary: {width: 142, backgroundColor: '#f8fafc', borderRadius: 24, padding: 16, justifyContent: 'space-between', borderWidth: 1, borderColor: 'rgba(255,255,255,0.5)'},
  actionIconWrap: {width: 36, height: 36, borderRadius: 14, backgroundColor: '#eff6ff', alignItems: 'center', justifyContent: 'center'},
  actionTitle: {marginTop: 16, fontSize: 15, lineHeight: 20, color: colors.text, fontWeight: '900'},
  actionDetail: {marginTop: 6, fontSize: 12, lineHeight: 18, color: colors.textSubtle, fontWeight: '600'},
  statusPill: {height: 30, borderRadius: 999, backgroundColor: colors.border, paddingHorizontal: 12, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: 'rgba(255,255,255,0.6)'},
  statusPillActive: {backgroundColor: '#dcfce7', borderColor: '#bbf7d0'},
  statusPillDone: {backgroundColor: '#dbeafe', borderColor: '#bfdbfe'},
  statusText: {fontSize: 12, color: colors.textMuted, fontWeight: '800'},
  statusTextActive: {color: colors.success},
  statusTextDone: {color: colors.primary},
  timeGrid: {flexDirection: 'row', gap: 14, marginTop: 24},
  timeBox: {flex: 1, backgroundColor: '#f8fafc', borderRadius: 24, padding: 18, alignItems: 'center', borderWidth: 1, borderColor: '#f1f5f9'},
  timeLabel: {fontSize: 11, color: colors.textMuted, fontWeight: '800', textTransform: 'uppercase', letterSpacing: 0.5},
  timeValue: {fontSize: 26, color: colors.text, fontWeight: '900', marginTop: 8, letterSpacing: -0.5},
  inactiveText: {color: '#cbd5e1'},
  flowCard: {marginTop: 20, padding: 16, borderRadius: 24, backgroundColor: '#fbfdff', gap: 12, borderWidth: 1, borderColor: '#eff6ff'},
  flowItem: {flexDirection: 'row', alignItems: 'center', gap: 12},
  flowIcon: {width: 24, height: 24, borderRadius: 999, borderWidth: 1, borderColor: '#bfdbfe', alignItems: 'center', justifyContent: 'center', backgroundColor: colors.white},
  flowIconDone: {borderColor: colors.primary, backgroundColor: colors.primary},
  flowLabel: {fontSize: 14, lineHeight: 20, color: colors.textSubtle, fontWeight: '700'},
  flowLabelDone: {color: colors.text},
  statusHintBox: {marginTop: 18, flexDirection: 'row', alignItems: 'flex-start', gap: 10, padding: 14, borderRadius: 20, backgroundColor: '#eff6ff'},
  statusHint: {flex: 1, color: colors.text, fontSize: 13, fontWeight: '700', lineHeight: 20},
  locationRow: {flexDirection: 'row', alignItems: 'center', gap: 10, marginTop: 20, padding: 14, backgroundColor: '#eff6ff', borderRadius: 20},
  locationText: {color: '#1d4ed8', fontWeight: '700', flex: 1, fontSize: 13},
  warningBox: {marginTop: 14, flexDirection: 'row', alignItems: 'flex-start', gap: 10, padding: 14, borderRadius: 20, backgroundColor: '#fff7ed'},
  warningText: {color: colors.warning, fontSize: 13, fontWeight: '800', lineHeight: 20, flex: 1},
  helperText: {marginTop: 12, color: colors.textMuted, fontSize: 13, fontWeight: '700', lineHeight: 18},
  primaryButton: {marginTop: 22, height: 60, borderRadius: 24, backgroundColor: colors.primary, alignItems: 'center', justifyContent: 'center', flexDirection: 'row', gap: 12, shadowColor: colors.primary, shadowOpacity: 0.25, shadowRadius: 16, shadowOffset: {width: 0, height: 8}, elevation: 4},
  buttonPressed: {opacity: 0.85},
  buttonDisabled: {backgroundColor: colors.textMuted, shadowOpacity: 0},
  primaryButtonText: {color: colors.white, fontWeight: '900', fontSize: 18, letterSpacing: 0.5},
});
