import React, {useCallback, useMemo, useRef, useState} from 'react';
import {NativeScrollEvent, NativeSyntheticEvent, Pressable, StyleSheet, Text, View} from 'react-native';
import {Ionicons} from '@expo/vector-icons';
import {useFocusEffect} from 'expo-router';
import {useTranslation} from 'react-i18next';
import {useAuth} from '../../../application/providers/AuthProvider';
import {useToast} from '../../../application/providers/ToastProvider';
import {fetchAttendanceRecords} from '../services/attendanceApi';
import {AttendanceRecord} from '../types';
import {ScreenContainer} from '../../../shared/components/ScreenContainer';
import {colors} from '../../../shared/constants/colors';
import {sharedStyles} from '../../../shared/constants/styles';

const PAGE_SIZE = 7;
const END_REACHED_THRESHOLD = 120;

function getRecordMeta(item: AttendanceRecord, t: (value: string) => string) {
  const isIncomplete = item.checkInTime === '--:--' || item.checkOutTime === '--:--' || item.hours === t('未完整');
  if (isIncomplete) {
    return {label: t('未完整'), badgeStyle: styles.badgeIncomplete, textStyle: styles.badgeIncompleteText};
  }
  if (item.type === 'overtime') {
    return {label: t('加班'), badgeStyle: styles.badgeOvertime, textStyle: styles.badgeOvertimeText};
  }
  return {label: t('常规'), badgeStyle: styles.badgeDone, textStyle: styles.badgeDoneText};
}

function getHoursNumber(hours: string) {
  const parsed = Number.parseFloat(hours.replace(/[^0-9.]/g, ''));
  return Number.isFinite(parsed) ? parsed : 0;
}

export function AttendanceListScreen() {
  const { t } = useTranslation('app');
  const {employee, session} = useAuth();
  const {showToast} = useToast();
  const [records, setRecords] = useState<AttendanceRecord[]>([]);
  const [hasFetchedOnce, setHasFetchedOnce] = useState(false);
  const [isFetchingMore, setIsFetchingMore] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const [errorText, setErrorText] = useState<string | null>(null);
  const canTriggerAutoLoadRef = useRef(true);

  const loadRecords = useCallback(async ({append, offset, showErrorToast = false}: {append: boolean; offset: number; showErrorToast?: boolean}) => {
    if (!session?.accessToken) {
      return;
    }

    if (append) {
      setIsFetchingMore(true);
    } else {
      setErrorText(null);
    }

    try {
      // 列表页改成分页加载：首屏直接保留当前界面，后续按页追加，避免每次切页都切回显式 loading 卡片。
      const nextRecords = await fetchAttendanceRecords(session.accessToken, {limit: PAGE_SIZE, offset});
      setRecords(prev => (append ? [...prev, ...nextRecords] : nextRecords));
      setHasMore(nextRecords.length === PAGE_SIZE);
      setHasFetchedOnce(true);
      setErrorText(null);
    } catch (error) {
      const message = error instanceof Error ? error.message : t('考勤记录加载失败');
      setErrorText(message);
      if (showErrorToast || append) {
        showToast(message);
      }
    } finally {
      setIsFetchingMore(false);
    }
  }, [session?.accessToken, showToast, t]);

  useFocusEffect(
    useCallback(() => {
      canTriggerAutoLoadRef.current = true;
      void loadRecords({append: false, offset: 0, showErrorToast: false});
    }, [loadRecords]),
  );

  const tryAutoLoadMore = useCallback(() => {
    if (isFetchingMore || !hasMore || records.length === 0 || !hasFetchedOnce || errorText) {
      return;
    }
    canTriggerAutoLoadRef.current = false;
    void loadRecords({append: true, offset: records.length, showErrorToast: true});
  }, [errorText, hasFetchedOnce, hasMore, isFetchingMore, loadRecords, records.length]);

  const handleScroll = useCallback((event: NativeSyntheticEvent<NativeScrollEvent>) => {
    if (!canTriggerAutoLoadRef.current) {
      return;
    }
    const {layoutMeasurement, contentOffset, contentSize} = event.nativeEvent;
    const distanceToBottom = contentSize.height - (layoutMeasurement.height + contentOffset.y);
    // 自动分页必须只在“确实接近底部”时触发，并配合 momentum 锁，避免一次快速滚动重复打出多页请求。
    if (distanceToBottom <= END_REACHED_THRESHOLD) {
      tryAutoLoadMore();
    }
  }, [tryAutoLoadMore]);

  const scrollProps = useMemo(() => ({
    onMomentumScrollBegin: () => {
      canTriggerAutoLoadRef.current = true;
    },
    onScroll: handleScroll,
    scrollEventThrottle: 16,
  }), [handleScroll]);

  const summary = useMemo(() => {
    const totalHours = records.reduce((sum, item) => sum + (typeof item.workedHours === 'number' ? item.workedHours : getHoursNumber(item.hours)), 0);
    const overtimeCount = records.filter(item => item.type === 'overtime').length;
    const completeCount = records.filter(item => item.checkInTime !== '--:--' && item.checkOutTime !== '--:--').length;
    return {
      totalHours: totalHours > 0 ? totalHours.toFixed(1) : '0.0',
      overtimeCount: String(overtimeCount),
      completeCount: String(completeCount),
    };
  }, [records]);

  return (
    <ScreenContainer scrollProps={scrollProps}>
      <View style={sharedStyles.screenTitle}>
        <Text style={sharedStyles.overline}>{t('打卡流水')}</Text>
        <Text style={sharedStyles.title}>{t('考勤记录')}</Text>
        <Text style={sharedStyles.muted}>{employee?.dept ?? t('最近 31 天打卡明细')}</Text>
      </View>

      <View style={styles.heroCard}>
        <View style={styles.heroHeader}>
          <View style={styles.heroIconWrap}>
            <Ionicons name="calendar-outline" size={18} color={colors.primary} />
          </View>
          <View style={styles.heroCopy}>
            <Text style={styles.heroTitle}>{t('最近打卡总览')}</Text>
            <Text style={styles.heroDetail}>{t('列表页直接查看每天的上下班时间、工时和记录状态。')}</Text>
          </View>
        </View>
      </View>

      <View style={styles.statsGrid}>
        <StatCard label={t('累计工时')} value={summary.totalHours} unit="h" />
        <StatCard label={t('加班次数')} value={summary.overtimeCount} unit="d" />
        <StatCard label={t('完整记录')} value={summary.completeCount} unit="p" />
      </View>

      {records.map(item => {
        const meta = getRecordMeta(item, t);
        return (
          <Pressable key={item.id} style={({pressed}) => [styles.recordCard, pressed && styles.recordCardPressed]}>
            <View style={styles.recordTopRow}>
              <View>
                <Text style={styles.recordDate}>{item.date}</Text>
                <Text style={styles.recordTimeRange}>{item.checkInTime} - {item.checkOutTime}</Text>
              </View>
              <View style={[styles.recordBadge, meta.badgeStyle]}>
                <Text style={[styles.recordBadgeText, meta.textStyle]}>{meta.label}</Text>
              </View>
            </View>

            <View style={styles.recordMetrics}>
              <MetricPill icon="time-outline" text={t('工时 {{hours}}', {hours: item.hours})} />
              <MetricPill icon="log-in-outline" text={t('上班 {{time}}', {time: item.checkInTime})} />
              <MetricPill icon="log-out-outline" text={t('下班 {{time}}', {time: item.checkOutTime})} />
            </View>
          </Pressable>
        );
      })}

      {hasFetchedOnce && records.length === 0 ? (
        <View style={styles.placeholderCard}>
          <View style={styles.placeholderIcon}>
            <Ionicons name={errorText ? 'alert-circle-outline' : 'calendar-clear-outline'} size={24} color={errorText ? colors.warning : colors.primary} />
          </View>
          <Text style={styles.placeholderTitle}>{errorText ? t('考勤记录暂时加载失败') : t('暂无考勤记录')}</Text>
          <Text style={styles.placeholderDetail}>{errorText ?? t('当你完成上班或下班打卡后，这里会显示最近 31 天的考勤明细。')}</Text>
          {errorText ? (
            <Pressable style={styles.retryButton} onPress={() => void loadRecords({append: false, offset: 0, showErrorToast: true})}>
              <Text style={styles.retryButtonText}>{t('重新加载')}</Text>
            </Pressable>
          ) : null}
        </View>
      ) : null}

      {records.length > 0 && isFetchingMore ? (
        <View style={styles.autoLoadHint}>
          <View style={styles.autoLoadDot} />
          <Text style={styles.autoLoadHintText}>{t('正在加载更多记录...')}</Text>
        </View>
      ) : null}
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

function MetricPill({icon, text}: {icon: keyof typeof Ionicons.glyphMap; text: string}) {
  return (
    <View style={styles.metricPill}>
      <Ionicons name={icon} size={14} color={colors.textSubtle} />
      <Text style={styles.metricText}>{text}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  heroCard: {backgroundColor: colors.white, borderRadius: 28, padding: 20, borderWidth: 1, borderColor: '#eef2ff', shadowColor: colors.text, shadowOpacity: 0.03, shadowRadius: 20, shadowOffset: {width: 0, height: 8}, elevation: 3},
  heroHeader: {flexDirection: 'row', alignItems: 'flex-start', gap: 14},
  heroIconWrap: {width: 42, height: 42, borderRadius: 16, backgroundColor: '#eff6ff', alignItems: 'center', justifyContent: 'center'},
  heroCopy: {flex: 1},
  heroTitle: {fontSize: 16, color: colors.text, fontWeight: '900'},
  heroDetail: {marginTop: 4, fontSize: 13, lineHeight: 19, color: colors.textSubtle, fontWeight: '600'},
  statsGrid: {marginTop: 16, flexDirection: 'row', gap: 12},
  statCard: {flex: 1, minHeight: 94, paddingHorizontal: 14, paddingVertical: 18, borderRadius: 24, backgroundColor: colors.white, alignItems: 'center', justifyContent: 'center', shadowColor: colors.text, shadowOpacity: 0.03, shadowRadius: 16, shadowOffset: {width: 0, height: 6}, elevation: 2, borderWidth: 1, borderColor: '#f8fafc'},
  statLabel: {fontSize: 10, color: colors.textMuted, fontWeight: '900', letterSpacing: 1.2, textTransform: 'uppercase'},
  statValue: {marginTop: 8, fontSize: 24, lineHeight: 28, color: colors.text, fontWeight: '900'},
  statUnit: {fontSize: 11, color: colors.textMuted, fontWeight: '800'},
  placeholderCard: {marginTop: 16, backgroundColor: colors.white, borderRadius: 28, padding: 24, alignItems: 'center', gap: 10, borderWidth: 1, borderColor: '#eef2ff'},
  placeholderIcon: {width: 52, height: 52, borderRadius: 18, backgroundColor: '#f8fafc', alignItems: 'center', justifyContent: 'center'},
  placeholderTitle: {fontSize: 18, color: colors.text, fontWeight: '900'},
  placeholderDetail: {fontSize: 13, lineHeight: 20, color: colors.textSubtle, textAlign: 'center'},
  retryButton: {marginTop: 8, height: 46, minWidth: 132, borderRadius: 18, backgroundColor: colors.primary, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 18},
  retryButtonText: {color: colors.white, fontSize: 15, fontWeight: '900'},
  autoLoadHint: {marginTop: 8, alignItems: 'center', justifyContent: 'center', flexDirection: 'row', gap: 8},
  autoLoadDot: {width: 8, height: 8, borderRadius: 999, backgroundColor: colors.primary},
  autoLoadHintText: {color: colors.textMuted, fontSize: 13, fontWeight: '700'},
  recordCard: {marginTop: 16, backgroundColor: colors.white, borderRadius: 28, padding: 20, borderWidth: 1, borderColor: '#f1f5f9', shadowColor: colors.text, shadowOpacity: 0.03, shadowRadius: 20, shadowOffset: {width: 0, height: 8}, elevation: 3},
  recordCardPressed: {opacity: 0.84},
  recordTopRow: {flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', gap: 12},
  recordDate: {fontSize: 17, color: colors.text, fontWeight: '900'},
  recordTimeRange: {marginTop: 6, fontSize: 13, color: colors.textSubtle, fontWeight: '700'},
  recordBadge: {minHeight: 30, borderRadius: 999, paddingHorizontal: 12, paddingVertical: 6, alignItems: 'center', justifyContent: 'center'},
  recordBadgeText: {fontSize: 11, fontWeight: '900', letterSpacing: 0.4},
  recordMetrics: {marginTop: 16, flexDirection: 'row', flexWrap: 'wrap', gap: 10},
  metricPill: {flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 12, paddingVertical: 9, borderRadius: 16, backgroundColor: '#f8fafc', borderWidth: 1, borderColor: '#eef2ff'},
  metricText: {fontSize: 12, color: colors.textSubtle, fontWeight: '700'},
  badgeDone: {backgroundColor: '#ecfdf5'},
  badgeDoneText: {color: colors.success},
  badgeOvertime: {backgroundColor: '#fff7ed'},
  badgeOvertimeText: {color: colors.warning},
  badgeIncomplete: {backgroundColor: '#fee2e2'},
  badgeIncompleteText: {color: '#b91c1c'},
});
