import React, {useCallback, useState} from 'react';
import {useFocusEffect} from '@react-navigation/native';
import {Pressable, StyleSheet, Text, View} from 'react-native';
import {useTranslation} from 'react-i18next';
import {useAuth} from '../../../application/providers/AuthProvider';
import {useToast} from '../../../application/providers/ToastProvider';
import {fetchAttendanceRecords} from '../services/attendanceApi';
import {AttendanceRecord} from '../types';
import {ScreenContainer} from '../../../shared/components/ScreenContainer';
import {colors} from '../../../shared/constants/colors';
import {sharedStyles} from '../../../shared/constants/styles';

const PAGE_SIZE = 7;

function getRecordMeta(item: AttendanceRecord, t: (value: string) => string) {
  const isIncomplete = item.checkInTime === '--:--' || item.checkOutTime === '--:--' || item.hours === t('未完整');
  if (isIncomplete) {
    return {label: t('记录未完整'), badgeStyle: styles.badgeIncomplete, textStyle: styles.badgeIncompleteText};
  }
  if (item.type === 'overtime') {
    return {label: t('加班记录'), badgeStyle: sharedStyles.badgeWarn, textStyle: sharedStyles.badgeWarnText};
  }
  return {label: t('已完成'), badgeStyle: styles.badgeDone, textStyle: styles.badgeDoneText};
}

export function AttendanceListScreen() {
  const { t } = useTranslation('app');
  const {session} = useAuth();
  const {showToast} = useToast();
  const [records, setRecords] = useState<AttendanceRecord[]>([]);
  const [hasFetchedOnce, setHasFetchedOnce] = useState(false);
  const [isFetchingMore, setIsFetchingMore] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const [errorText, setErrorText] = useState<string | null>(null);

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
      void loadRecords({append: false, offset: 0, showErrorToast: false});
    }, [loadRecords]),
  );

  return (
    <ScreenContainer>
      <View style={sharedStyles.screenTitle}>
        <Text style={sharedStyles.title}>{t('考勤记录')}</Text>
        <Text style={sharedStyles.muted}>{t('最近 31 天打卡明细')}</Text>
      </View>

      <View style={styles.summaryCard}>
        <Text style={sharedStyles.cardTitle}>{t('列表页直接查看')}</Text>
        <Text style={sharedStyles.muted}>{t('无需进入详情页，也可直接查看每天的上下班时间、记录状态和备注说明。')}</Text>
      </View>

      {records.map(item => {
        const meta = getRecordMeta(item, t);
        return (
          <View key={item.id} style={[sharedStyles.listCard, styles.recordCard]}>
            <View style={sharedStyles.flexOne}>
              <View style={styles.recordHeaderRow}>
                <Text style={sharedStyles.cardTitle}>{item.date}</Text>
                <View style={[sharedStyles.badge, meta.badgeStyle]}>
                  <Text style={[sharedStyles.badgeText, meta.textStyle]}>{meta.label}</Text>
                </View>
              </View>
              <Text style={styles.timeRangeText}>{t('上班 {{checkIn}} · 下班 {{checkOut}}', {checkIn: item.checkInTime, checkOut: item.checkOutTime})}</Text>
              <Text style={styles.hoursText}>{t('记录结果：{{hours}}', {hours: item.hours})}</Text>
              {item.note ? <Text style={styles.noteText}>{t('备注：{{note}}', {note: item.note})}</Text> : <Text style={styles.notePlaceholder}>{t('备注：无')}</Text>}
            </View>
          </View>
        );
      })}

      {hasFetchedOnce && records.length === 0 ? (
        <View style={styles.placeholderCard}>
          <Text style={sharedStyles.cardTitle}>{errorText ? t('考勤记录暂时加载失败') : t('暂无考勤记录')}</Text>
          <Text style={sharedStyles.muted}>{errorText ?? t('当你完成上班或下班打卡后，这里会显示最近 31 天的考勤明细。')}</Text>
          {errorText ? (
            <Pressable style={styles.retryButton} onPress={() => void loadRecords({append: false, offset: 0, showErrorToast: true})}>
              <Text style={styles.retryButtonText}>{t('重新加载')}</Text>
            </Pressable>
          ) : null}
        </View>
      ) : null}

      {records.length > 0 && hasMore ? (
        <Pressable style={styles.loadMoreButton} disabled={isFetchingMore} onPress={() => void loadRecords({append: true, offset: records.length, showErrorToast: true})}>
          <Text style={styles.loadMoreText}>{isFetchingMore ? t('继续加载中...') : t('加载更多')}</Text>
        </Pressable>
      ) : null}
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  summaryCard: {backgroundColor: '#eff6ff', borderRadius: 22, padding: 16, marginBottom: 12},
  placeholderCard: {backgroundColor: colors.white, borderRadius: 22, padding: 18, alignItems: 'center', gap: 10},
  retryButton: {marginTop: 6, height: 44, minWidth: 120, borderRadius: 16, backgroundColor: colors.primary, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 16},
  retryButtonText: {color: colors.white, fontSize: 15, fontWeight: '900'},
  loadMoreButton: {marginTop: 4, height: 44, borderRadius: 16, backgroundColor: colors.white, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: colors.border},
  loadMoreText: {color: colors.primary, fontSize: 14, fontWeight: '900'},
  recordCard: {alignItems: 'flex-start'},
  recordHeaderRow: {flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', gap: 12},
  timeRangeText: {fontSize: 14, color: colors.text, fontWeight: '800', marginTop: 8},
  hoursText: {fontSize: 13, color: colors.textSubtle, marginTop: 6},
  noteText: {fontSize: 13, color: colors.textSubtle, marginTop: 6, lineHeight: 18},
  notePlaceholder: {fontSize: 13, color: colors.textMuted, marginTop: 6},
  badgeDone: {backgroundColor: '#dcfce7'},
  badgeDoneText: {color: colors.success},
  badgeIncomplete: {backgroundColor: '#fee2e2'},
  badgeIncompleteText: {color: '#b91c1c'},
});
