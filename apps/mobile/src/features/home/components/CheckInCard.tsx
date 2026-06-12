import React, {useState} from 'react';
import {Ionicons} from '@expo/vector-icons';
import {Pressable, StyleSheet, Text, View} from 'react-native';
import {useTranslation} from 'react-i18next';
import {TodayAttendanceStatus} from '../../attendance/types';
import {colors} from '../../../shared/constants/colors';

export type CheckInPhase = 'idle' | 'requesting_permission' | 'locating' | 'reverse_geocoding' | 'submitting' | 'success' | 'failed';

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
    return {title: t('准备开始今天的工作'), detail: t('确认当前位置无误后，直接完成上班打卡。'), icon: 'sunny-outline' as const};
  }
  if (status.status === 'checked_in') {
    return {title: t('你已完成上班打卡'), detail: t('结束工作前回到这里，完成下班打卡。'), icon: 'briefcase-outline' as const};
  }
  return {title: t('今日打卡已完成'), detail: t('上下班记录都已提交，当前无需额外操作。'), icon: 'checkmark-done-outline' as const};
}

export function CheckInCard({currentTime, currentDate, status, onCheckIn, phase = 'idle', disabled = false, helperText = null, statusHint = null, warningText = null}: Props) {
  const { t } = useTranslation('app');
  const buttonText = getButtonText(status, phase, t);
  const actionMeta = getActionMeta(status, phase, t);
  const gpsText = status.locationName ?? t('未知地点');
  const isDisabled = disabled || status.status === 'checked_out';
  const [expandedKey, setExpandedKey] = useState<'check_in' | 'check_out' | null>(null);
  const isCheckedIn = status.status === 'checked_in' || status.status === 'checked_out';
  const isCheckedOut = status.status === 'checked_out';
  const checkInLabel = status.checkInTime ? `${t('上班打卡')} ${status.checkInTime}` : t('上班打卡');
  const checkOutLabel = status.checkOutTime ? `${t('下班打卡')} ${status.checkOutTime}` : t('下班打卡');
  const toggleExpanded = (key: 'check_in' | 'check_out') => {
    setExpandedKey(current => current === key ? null : key);
  };

  return (
    <View style={styles.clockCard}>
      <View style={styles.topBand}>
        <View style={styles.clockBlock}>
          <Text style={styles.clockLabel}>{t('系统时间')}</Text>
          <Text style={styles.clock}>{currentTime}</Text>
          <Text style={styles.clockDate}>{currentDate}</Text>
        </View>
      </View>

      <View style={styles.timeGrid}>
        <TimeBox label={t('上班时间')} value={status.checkInTime ?? '--:--'} active={Boolean(status.checkInTime)} />
        <TimeBox label={t('下班时间')} value={status.checkOutTime ?? '--:--'} active={Boolean(status.checkOutTime)} />
      </View>

      <View style={styles.actionCard}>
        <View style={styles.actionIconWrap}>
          <Ionicons name={actionMeta.icon} size={20} color={colors.primary} />
        </View>
        <View style={styles.actionCopy}>
          <Text style={styles.actionTitle}>{actionMeta.title}</Text>
          <Text style={styles.actionDetail}>{actionMeta.detail}</Text>
        </View>
      </View>

      <View style={styles.flowCard}>
        <FlowStepRow
          complete={isCheckedIn}
          expanded={expandedKey === 'check_in'}
          label={checkInLabel}
          locationName={gpsText}
          onPress={() => toggleExpanded('check_in')}
          showDetails={expandedKey === 'check_in'}
          timeValue={status.checkInTime ?? '--:--'}
          title={t('上班打卡')}
        />
        <View style={styles.flowItemStatic}>
          <View style={[styles.flowIcon, isCheckedIn && !isCheckedOut && styles.flowIconDone]}>
            <Ionicons name={isCheckedIn && !isCheckedOut ? 'checkmark' : 'ellipse-outline'} size={14} color={isCheckedIn && !isCheckedOut ? colors.white : colors.primary} />
          </View>
          <Text style={[styles.flowLabel, isCheckedIn && !isCheckedOut && styles.flowLabelDone]}>{t('工作中')}</Text>
        </View>
        <FlowStepRow
          complete={isCheckedOut}
          expanded={expandedKey === 'check_out'}
          label={checkOutLabel}
          locationName={gpsText}
          onPress={() => toggleExpanded('check_out')}
          showDetails={expandedKey === 'check_out'}
          timeValue={status.checkOutTime ?? '--:--'}
          title={t('下班打卡')}
        />
      </View>

      <View style={styles.locationRow}>
        <Ionicons name="location-outline" size={18} color={colors.primary} />
        <Text style={styles.locationText}>{t('位置：{{location}}', {location: gpsText})}</Text>
      </View>

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

function FlowStepRow({
  complete,
  expanded,
  label,
  locationName,
  onPress,
  showDetails,
  timeValue,
  title,
}: {
  complete: boolean;
  expanded: boolean;
  label: string;
  locationName: string;
  onPress: () => void;
  showDetails: boolean;
  timeValue: string;
  title: string;
}) {
  return (
    <Pressable style={({pressed}) => [styles.flowRowPressable, pressed && styles.flowRowPressed]} onPress={onPress}>
      <View style={styles.flowRowHeader}>
        <View style={styles.flowItemMain}>
          <View style={[styles.flowIcon, complete && styles.flowIconDone]}>
            <Ionicons name={complete ? 'checkmark' : 'ellipse-outline'} size={14} color={complete ? colors.white : colors.primary} />
          </View>
          <Text style={[styles.flowLabel, complete && styles.flowLabelDone]}>{label}</Text>
        </View>
        <Ionicons name={expanded ? 'chevron-up' : 'chevron-down'} size={18} color={colors.textMuted} />
      </View>
      {showDetails ? (
        <View style={styles.flowDetails}>
          <Text style={styles.flowDetailText}>打卡位置：{locationName}</Text>
        </View>
      ) : null}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  clockCard: {backgroundColor: colors.white, borderRadius: 32, padding: 24, shadowColor: colors.text, shadowOpacity: 0.05, shadowRadius: 28, shadowOffset: {width: 0, height: 14}, elevation: 5, borderWidth: 1, borderColor: 'rgba(241,245,249,0.9)'},
  topBand: {flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', gap: 12},
  clockBlock: {flex: 1, minWidth: 0},
  clockLabel: {fontSize: 11, color: colors.textMuted, fontWeight: '900', letterSpacing: 1.8, textTransform: 'uppercase'},
  clock: {fontSize: 42, color: colors.text, fontWeight: '900', marginTop: 6, letterSpacing: -1.2},
  clockDate: {fontSize: 13, color: colors.textSubtle, fontWeight: '700', marginTop: 4},
  actionCard: {marginTop: 20, borderRadius: 24, backgroundColor: '#f8fafc', padding: 18, flexDirection: 'row', gap: 14, alignItems: 'flex-start', borderWidth: 1, borderColor: '#eef2ff'},
  actionIconWrap: {width: 36, height: 36, borderRadius: 14, backgroundColor: '#eff6ff', alignItems: 'center', justifyContent: 'center'},
  actionCopy: {flex: 1},
  actionTitle: {fontSize: 15, lineHeight: 20, color: colors.text, fontWeight: '900'},
  actionDetail: {marginTop: 4, fontSize: 12, lineHeight: 18, color: colors.textSubtle, fontWeight: '600'},
  timeGrid: {flexDirection: 'row', gap: 14, marginTop: 24},
  timeBox: {flex: 1, backgroundColor: '#f8fafc', borderRadius: 24, padding: 18, alignItems: 'center', borderWidth: 1, borderColor: '#f1f5f9'},
  timeLabel: {fontSize: 11, color: colors.textMuted, fontWeight: '800', textTransform: 'uppercase', letterSpacing: 0.5},
  timeValue: {fontSize: 26, color: colors.text, fontWeight: '900', marginTop: 8, letterSpacing: -0.5},
  inactiveText: {color: '#cbd5e1'},
  flowCard: {marginTop: 20, padding: 16, borderRadius: 24, backgroundColor: '#fbfdff', gap: 12, borderWidth: 1, borderColor: '#eff6ff'},
  flowRowPressable: {borderRadius: 18, paddingHorizontal: 4, paddingVertical: 2},
  flowRowPressed: {opacity: 0.82},
  flowRowHeader: {flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 12},
  flowItemMain: {flex: 1, flexDirection: 'row', alignItems: 'center', gap: 12},
  flowItemStatic: {flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 4},
  flowIcon: {width: 24, height: 24, borderRadius: 999, borderWidth: 1, borderColor: '#bfdbfe', alignItems: 'center', justifyContent: 'center', backgroundColor: colors.white},
  flowIconDone: {borderColor: colors.primary, backgroundColor: colors.primary},
  flowLabel: {fontSize: 14, lineHeight: 20, color: colors.textSubtle, fontWeight: '700'},
  flowLabelDone: {color: colors.text},
  flowDetails: {marginLeft: 36, marginTop: 10, gap: 6, paddingTop: 10, borderTopWidth: 1, borderTopColor: '#e2e8f0'},
  flowDetailText: {fontSize: 12, lineHeight: 18, color: colors.textSubtle, fontWeight: '700'},
  locationRow: {flexDirection: 'row', alignItems: 'center', gap: 10, marginTop: 20, padding: 14, backgroundColor: '#eff6ff', borderRadius: 20},
  locationText: {color: '#1d4ed8', fontWeight: '700', flex: 1, fontSize: 13},
  primaryButton: {marginTop: 22, height: 60, borderRadius: 24, backgroundColor: colors.primary, alignItems: 'center', justifyContent: 'center', flexDirection: 'row', gap: 12, shadowColor: colors.primary, shadowOpacity: 0.25, shadowRadius: 16, shadowOffset: {width: 0, height: 8}, elevation: 4},
  buttonPressed: {opacity: 0.85},
  buttonDisabled: {backgroundColor: colors.textMuted, shadowOpacity: 0},
  primaryButtonText: {color: colors.white, fontWeight: '900', fontSize: 18, letterSpacing: 0.5},
});
