import React, {useState} from 'react';
import {Ionicons} from '@expo/vector-icons';
import {Pressable, StyleSheet, Text, View} from 'react-native';
import {useTranslation} from 'react-i18next';
import {normalizeLanguage, SupportedLanguageCode} from '@wmshr/i18n';
import {LocalizedLocationName, TodayAttendanceStatus} from '../../attendance/types';
import {colors} from '../../../shared/constants/colors';

export type CheckInPhase = 'idle' | 'requesting_permission' | 'locating' | 'reverse_geocoding' | 'submitting' | 'success' | 'failed';

type Props = {
  status: TodayAttendanceStatus;
  onCheckIn: () => void;
  phase?: CheckInPhase;
  disabled?: boolean;
  helperText?: string | null;
  statusHint?: string | null;
  warningText?: string | null;
};

type Translate = (value: string, options?: Record<string, unknown>) => string;
type LocationNameValue = TodayAttendanceStatus['locationName'];

const LOCATION_PREFIX_PATTERN = /^(?:位置|location|lokasi|ตำแหน่ง|ubicación|localização)\s*[:：]\s*/i;

function getButtonText(status: TodayAttendanceStatus, phase: CheckInPhase, t: Translate) {
  if (phase === 'requesting_permission') return t('请求定位权限...');
  if (phase === 'locating') return t('正在定位...');
  if (phase === 'reverse_geocoding') return t('正在获取地址...');
  if (phase === 'submitting') return t('正在提交...');
  if (phase === 'failed') return t('重试打卡');
  if (status.status === 'not_checked_in') return t('上班打卡');
  if (status.status === 'checked_in') return t('下班打卡');
  return t('今日已完成');
}

function parseLocationName(value: string) {
  const normalized = value.trim();
  if (!normalized) {
    return null;
  }

  if (!normalized.startsWith('{')) {
    return normalized;
  }

  try {
    return JSON.parse(normalized) as LocalizedLocationName;
  } catch {
    return normalized;
  }
}

function pickLocalizedLocationName(value: LocationNameValue, language: string) {
  if (!value) {
    return null;
  }

  const parsedValue = typeof value === 'string' ? parseLocationName(value) : value;
  if (!parsedValue) {
    return null;
  }

  if (typeof parsedValue === 'string') {
    return parsedValue;
  }

  const normalizedLanguage = normalizeLanguage(language) as SupportedLanguageCode;
  return parsedValue[normalizedLanguage]
    || parsedValue.default
    || parsedValue.name
    || parsedValue.label
    || parsedValue.zh
    || parsedValue.en
    || Object.values(parsedValue).find(item => typeof item === 'string' && item.trim().length > 0)
    || null;
}

function formatLocationDisplay(value: LocationNameValue, language: string, t: Translate) {
  const pickedLocation = pickLocalizedLocationName(value, language);
  if (!pickedLocation) {
    return t('未知地点');
  }

  const location = pickedLocation.trim();
  const locationWithoutPrefix = location.replace(LOCATION_PREFIX_PATTERN, '').trim();
  if (locationWithoutPrefix !== location) {
    return t('位置：{{location}}', {location: locationWithoutPrefix});
  }

  return location;
}

export function CheckInCard({status, onCheckIn, phase = 'idle', disabled = false, helperText = null, statusHint = null, warningText = null}: Props) {
  const { t, i18n } = useTranslation('app');
  const buttonText = getButtonText(status, phase, t);
  const gpsText = formatLocationDisplay(status.locationName, i18n.language, t);
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
      <View style={styles.timeGrid}>
        <TimeBox label={t('上班时间')} value={status.checkInTime ?? '--:--'} active={Boolean(status.checkInTime)} />
        <TimeBox label={t('下班时间')} value={status.checkOutTime ?? '--:--'} active={Boolean(status.checkOutTime)} />
      </View>

      <View style={styles.flowCard}>
        <FlowStepRow
          complete={isCheckedIn}
          expanded={expandedKey === 'check_in'}
          label={checkInLabel}
          locationName={gpsText}
          onPress={() => toggleExpanded('check_in')}
          showDetails={expandedKey === 'check_in'}
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
        />
      </View>

      <View style={styles.locationRow}>
        <Ionicons name="location-outline" size={18} color={colors.primary} />
        <Text style={styles.locationText}>{gpsText}</Text>
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
}: {
  complete: boolean;
  expanded: boolean;
  label: string;
  locationName: string;
  onPress: () => void;
  showDetails: boolean;
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
          <Text style={styles.flowDetailText}>{locationName}</Text>
        </View>
      ) : null}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  clockCard: {backgroundColor: colors.white, borderRadius: 32, padding: 24, shadowColor: colors.text, shadowOpacity: 0.05, shadowRadius: 28, shadowOffset: {width: 0, height: 14}, elevation: 5, borderWidth: 1, borderColor: 'rgba(241,245,249,0.9)'},
  timeGrid: {flexDirection: 'row', gap: 14},
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
