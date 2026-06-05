import React from 'react';
import {Ionicons} from '@expo/vector-icons';
import {Pressable, StyleSheet, Text, View} from 'react-native';
import {TodayAttendanceStatus} from '../../attendance/types';
import {colors} from '../../../shared/constants/colors';
import {sharedStyles} from '../../../shared/constants/styles';

type Props = {
  currentTime: string;
  currentDate: string;
  status: TodayAttendanceStatus;
  onCheckIn: () => void;
};

export function CheckInCard({currentTime, currentDate, status, onCheckIn}: Props) {
  const statusText = status.status === 'checked_in' ? '在勤中' : status.status === 'checked_out' ? '已完成' : '未打卡';
  const buttonText = status.status === 'not_checked_in' ? '上班打卡' : status.status === 'checked_in' ? '下班打卡' : '重置演示';
  const gpsText = `${status.locationName ?? '未知地点'} · 精度 ${status.locationAccuracy ?? '--'}m`;

  return (
    <View style={styles.clockCard}>
      <View style={styles.clockHeader}>
        <View>
          <Text style={sharedStyles.overline}>系统时间</Text>
          <Text style={styles.clock}>{currentTime}</Text>
          <Text style={sharedStyles.muted}>{currentDate}</Text>
        </View>
        <View style={[styles.statusPill, status.status === 'checked_in' && styles.statusPillActive]}>
          <Text style={[styles.statusText, status.status === 'checked_in' && styles.statusTextActive]}>{statusText}</Text>
        </View>
      </View>

      <View style={styles.timeGrid}>
        <TimeBox label="上班时间" value={status.checkInTime ?? '--:--'} active={Boolean(status.checkInTime)} />
        <TimeBox label="下班时间" value={status.checkOutTime ?? '--:--'} active={Boolean(status.checkOutTime)} />
      </View>

      <View style={styles.locationRow}>
        <Ionicons name="location-outline" size={18} color={colors.primary} />
        <Text style={styles.locationText}>{gpsText}</Text>
      </View>

      <Pressable style={({pressed}) => [styles.primaryButton, pressed && styles.buttonPressed]} onPress={onCheckIn}>
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
  statusText: {fontSize: 11, color: colors.textMuted, fontWeight: '900'},
  statusTextActive: {color: colors.success},
  timeGrid: {flexDirection: 'row', gap: 12, marginTop: 22},
  timeBox: {flex: 1, backgroundColor: colors.background, borderRadius: 20, padding: 16, alignItems: 'center'},
  timeLabel: {fontSize: 10, color: colors.textMuted, fontWeight: '900'},
  timeValue: {fontSize: 25, color: colors.text, fontWeight: '900', marginTop: 8},
  inactiveText: {color: '#cbd5e1'},
  locationRow: {flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 18, padding: 12, backgroundColor: '#eff6ff', borderRadius: 18},
  locationText: {color: '#1d4ed8', fontWeight: '700'},
  primaryButton: {marginTop: 18, height: 58, borderRadius: 22, backgroundColor: colors.primary, alignItems: 'center', justifyContent: 'center', flexDirection: 'row', gap: 10},
  buttonPressed: {opacity: 0.82},
  primaryButtonText: {color: colors.white, fontWeight: '900', fontSize: 17},
});
