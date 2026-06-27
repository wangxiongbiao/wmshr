import React, {useCallback, useMemo, useRef, useState} from 'react';
import {Modal, NativeScrollEvent, NativeSyntheticEvent, Pressable, StyleSheet, Text, TextInput, View} from 'react-native';
import {Ionicons} from '@expo/vector-icons';
import {Calendar, type DateData} from 'react-native-calendars';
import {useFocusEffect} from 'expo-router';
import {useTranslation} from 'react-i18next';
import {useAuth} from '../../../application/providers/AuthProvider';
import {useToast} from '../../../application/providers/ToastProvider';
import {
  fetchAttendanceRecords,
  fetchLeaveHistory,
  fetchLeaveSummary,
  submitLeaveRequest,
} from '../services/attendanceApi';
import {AttendanceRecord, LeaveApprovalStatus, LeaveRecord, LeaveRequestPayload, LeaveSummary, LeaveType} from '../types';
import {ScreenContainer} from '../../../shared/components/ScreenContainer';
import {colors} from '../../../shared/constants/colors';
import {sharedStyles} from '../../../shared/constants/styles';

const PAGE_SIZE = 7;
const END_REACHED_THRESHOLD = 120;
type AttendanceTab = 'records' | 'leave';

function getRecordMeta(item: AttendanceRecord, t: (value: string) => string) {
  const normalizedHours = String(item.hours || '').trim();
  const isIncomplete = item.checkInTime === '--:--'
    || item.checkOutTime === '--:--'
    || normalizedHours === '未完整'
    || normalizedHours === '--'
    || normalizedHours === '';
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

function normalizeDateInput(value: string) {
  return value.replace(/\./g, '-').replace(/\//g, '-').trim();
}

function parseDateValue(value: string) {
  const normalized = normalizeDateInput(value);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(normalized)) {
    return null;
  }
  const parsed = new Date(`${normalized}T00:00:00Z`);
  return Number.isNaN(parsed.getTime()) ? null : {normalized, parsed};
}

function calculateLeaveDays(startDate: string, endDate: string) {
  const start = parseDateValue(startDate);
  const end = parseDateValue(endDate);
  if (!start || !end) {
    return 0;
  }
  const diffTime = end.parsed.getTime() - start.parsed.getTime();
  if (diffTime < 0) {
    return 0;
  }
  return Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1;
}

function formatDateForInput(date: Date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function getPickerDate(value: string) {
  const parsed = parseDateValue(value);
  if (!parsed) {
    return new Date();
  }
  const [year, month, day] = parsed.normalized.split('-').map(Number);
  return new Date(year, (month || 1) - 1, day || 1);
}

function createEmptyForm(): LeaveRequestPayload {
  const today = formatDateForInput(new Date());
  return {
    type: 'personal',
    // 请假表单默认预设当天，避免每次打开都从空日期开始，移动端也能直接基于当天微调起止日期。
    startDate: today,
    endDate: today,
    reason: '',
  };
}

function getLeaveTypeLabel(type: LeaveType, t: (value: string) => string) {
  switch (type) {
    case 'personal':
      return t('事假');
    case 'sick':
      return t('病假');
    case 'annual':
      return t('年假');
    case 'special':
      return t('特殊假/其它');
    default:
      return t('请假');
  }
}

function getLeaveStatusLabel(status: LeaveApprovalStatus, t: (value: string) => string) {
  switch (status) {
    case 'approved':
      return t('已批准');
    case 'pending':
      return t('单待审');
    case 'rejected':
      return t('已拒绝');
    default:
      return t('处理中');
  }
}

function getLeaveStatusStyle(status: LeaveApprovalStatus) {
  if (status === 'approved') {
    return {badge: styles.badgeDone, text: styles.badgeDoneText};
  }
  if (status === 'rejected') {
    return {badge: styles.badgeIncomplete, text: styles.badgeIncompleteText};
  }
  return {badge: styles.badgeOvertime, text: styles.badgeOvertimeText};
}

export function AttendanceListScreen() {
  const { t } = useTranslation('app');
  const {employee, session} = useAuth();
  const {showToast} = useToast();
  const [activeTab, setActiveTab] = useState<AttendanceTab>('records');
  const [records, setRecords] = useState<AttendanceRecord[]>([]);
  const [hasFetchedOnce, setHasFetchedOnce] = useState(false);
  const [isFetchingMore, setIsFetchingMore] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const [errorText, setErrorText] = useState<string | null>(null);
  const [leaveSummary, setLeaveSummary] = useState<LeaveSummary>({monthUsedDays: 0, pendingCount: 0});
  const [leaveHistory, setLeaveHistory] = useState<LeaveRecord[]>([]);
  const [isLeaveFormVisible, setIsLeaveFormVisible] = useState(false);
  const [leaveForm, setLeaveForm] = useState<LeaveRequestPayload>(createEmptyForm());
  const [isSubmittingLeave, setIsSubmittingLeave] = useState(false);
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
      // 打卡记录保留分页；请假管理切到独立视图后，滚动触底逻辑仍只服务 records tab，避免两套列表互相串扰。
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

  const loadLeaveData = useCallback(async () => {
    if (!session?.accessToken) {
      return;
    }
    try {
      const [summary, history] = await Promise.all([
        fetchLeaveSummary(session.accessToken),
        fetchLeaveHistory(session.accessToken),
      ]);
      setLeaveSummary(summary);
      setLeaveHistory(history);
    } catch (error) {
      const message = error instanceof Error ? error.message : t('请假记录加载失败');
      showToast(message);
    }
  }, [session?.accessToken, showToast, t]);

  useFocusEffect(
    useCallback(() => {
      canTriggerAutoLoadRef.current = true;
      void loadRecords({append: false, offset: 0, showErrorToast: false});
      void loadLeaveData();
    }, [loadLeaveData, loadRecords]),
  );

  const tryAutoLoadMore = useCallback(() => {
    if (activeTab !== 'records' || isFetchingMore || !hasMore || records.length === 0 || !hasFetchedOnce || errorText) {
      return;
    }
    canTriggerAutoLoadRef.current = false;
    void loadRecords({append: true, offset: records.length, showErrorToast: true});
  }, [activeTab, errorText, hasFetchedOnce, hasMore, isFetchingMore, loadRecords, records.length]);

  const handleScroll = useCallback((event: NativeSyntheticEvent<NativeScrollEvent>) => {
    if (!canTriggerAutoLoadRef.current || activeTab !== 'records') {
      return;
    }
    const {layoutMeasurement, contentOffset, contentSize} = event.nativeEvent;
    const distanceToBottom = contentSize.height - (layoutMeasurement.height + contentOffset.y);
    if (distanceToBottom <= END_REACHED_THRESHOLD) {
      tryAutoLoadMore();
    }
  }, [activeTab, tryAutoLoadMore]);

  const scrollProps = useMemo(() => ({
    onMomentumScrollBegin: () => {
      canTriggerAutoLoadRef.current = true;
    },
    onScroll: handleScroll,
    scrollEventThrottle: 16,
  }), [handleScroll]);

  const attendanceSummary = useMemo(() => {
    const totalHours = records.reduce((sum, item) => sum + (typeof item.workedHours === 'number' ? item.workedHours : getHoursNumber(item.hours)), 0);
    const overtimeCount = records.filter(item => item.type === 'overtime').length;
    const completeCount = records.filter(item => item.checkInTime !== '--:--' && item.checkOutTime !== '--:--').length;
    return {
      totalHours: totalHours > 0 ? totalHours.toFixed(1) : '0.0',
      overtimeCount: String(overtimeCount),
      completeCount: String(completeCount),
    };
  }, [records]);

  const leaveActionLabel = activeTab === 'leave' ? (isLeaveFormVisible ? t('取消') : t('提交请假申请')) : null;
  const leaveDurationDays = useMemo(() => calculateLeaveDays(leaveForm.startDate, leaveForm.endDate), [leaveForm.endDate, leaveForm.startDate]);

  const resetLeaveForm = useCallback(() => {
    setLeaveForm(createEmptyForm());
  }, []);

  const handleToggleLeaveForm = useCallback(() => {
    setIsLeaveFormVisible((prev) => {
      const nextVisible = !prev;
      if (!nextVisible) {
        resetLeaveForm();
      }
      return nextVisible;
    });
  }, [resetLeaveForm]);

  const handleSubmitLeave = useCallback(async () => {
    if (!session?.accessToken) {
      return;
    }
    const start = parseDateValue(leaveForm.startDate);
    const end = parseDateValue(leaveForm.endDate);
    if (!start || !end) {
      showToast(t('请按 YYYY-MM-DD 输入开始和结束日期'));
      return;
    }
    if (end.parsed.getTime() < start.parsed.getTime()) {
      showToast(t('结束日期不能早于开始日期'));
      return;
    }
    if (!leaveForm.reason.trim()) {
      showToast(t('请输入请假原因'));
      return;
    }

    setIsSubmittingLeave(true);
    try {
      // 移动端请假流程已接真实后端接口；这里仅覆盖下载新版本的界面表现，不回退到 demo 里的本地存储假数据流。
      await submitLeaveRequest(session.accessToken, {
        ...leaveForm,
        startDate: start.normalized,
        endDate: end.normalized,
        reason: leaveForm.reason.trim(),
      });
      await loadLeaveData();
      setIsLeaveFormVisible(false);
      resetLeaveForm();
      showToast(t('请假申请已提交'));
    } catch (error) {
      showToast(error instanceof Error ? error.message : t('请假申请提交失败'));
    } finally {
      setIsSubmittingLeave(false);
    }
  }, [leaveForm, loadLeaveData, resetLeaveForm, session?.accessToken, showToast, t]);

  return (
    <ScreenContainer scrollProps={scrollProps}>
      <View style={styles.headerRow}>
        <View style={[sharedStyles.screenTitle, styles.headerTitleBlock]}>
          <Text style={[sharedStyles.title, styles.headerTitleText]}>{t('考勤请假')}</Text>
          <Text style={[sharedStyles.muted, styles.headerSubtitleText]}>{employee?.dept ?? t('最近 31 天打卡明细')}</Text>
        </View>
        {leaveActionLabel ? (
          <Pressable style={({pressed}) => [styles.headerActionButton, pressed && styles.headerActionButtonPressed]} onPress={handleToggleLeaveForm}>
            <Text
              style={styles.headerActionButtonText}
              numberOfLines={1}
              adjustsFontSizeToFit
              minimumFontScale={0.8}
            >
              {leaveActionLabel}
            </Text>
          </Pressable>
        ) : null}
      </View>

      <View style={styles.segmentWrap}>
        <SegmentButton
          active={activeTab === 'records'}
          label={t('考勤记录')}
          onPress={() => setActiveTab('records')}
        />
        <SegmentButton
          active={activeTab === 'leave'}
          label={t('请假管理')}
          onPress={() => setActiveTab('leave')}
        />
      </View>

      {activeTab === 'records' ? (
        <>
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
            <StatCard label={t('累计工时')} value={attendanceSummary.totalHours} unit="h" />
            <StatCard label={t('加班次数')} value={attendanceSummary.overtimeCount} unit="d" />
            <StatCard label={t('完整记录')} value={attendanceSummary.completeCount} unit="p" />
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
                  <MetricPill icon="time-outline" text={t('工时 {{hours}}', {hours: meta.label === t('未完整') ? t('未完整') : item.hours})} />
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
        </>
      ) : (
        <>
          <View style={styles.leaveStatsCard}>
            <View style={styles.leaveStatBlock}>
              <Text style={styles.leaveStatLabel}>{t('本月已请假')}</Text>
              <Text style={styles.leaveStatValue}>{leaveSummary.monthUsedDays}<Text style={styles.leaveStatUnit}>{t('天')}</Text></Text>
            </View>
            <View style={styles.leaveDivider} />
            <View style={styles.leaveStatBlock}>
              <Text style={styles.leaveStatLabel}>{t('审批状态')}</Text>
              <Text style={[styles.leaveStatValue, styles.leavePendingValue]}>{leaveSummary.pendingCount}<Text style={styles.leaveStatUnit}>{t('单待审')}</Text></Text>
            </View>
          </View>

          {isLeaveFormVisible ? (
            <View style={styles.leaveFormCard}>
              {/* 请假区视觉直接对齐下载新版本：顶部统计 + 展开申请卡 + 历史卡片，接口和状态流继续走当前移动端。 */}
              <View style={styles.leaveFormTitleRow}>
                <View style={styles.formTitleDot} />
                <Text style={styles.leaveFormTitle}>{t('提交请假申请')}</Text>
              </View>

              <Text style={styles.formSectionLabel}>{t('请假类别')}</Text>
              <View style={styles.leaveTypeRow}>
                {(['personal', 'sick', 'annual', 'special'] as LeaveType[]).map((type) => (
                  <LeaveTypeChip
                    key={type}
                    active={leaveForm.type === type}
                    label={getLeaveTypeLabel(type, t)}
                    onPress={() => setLeaveForm((prev) => ({...prev, type}))}
                  />
                ))}
              </View>

              <View style={styles.dateRow}>
                <View style={styles.dateColumn}>
                  <Text style={styles.formSectionLabel}>{t('开始日期')}</Text>
                  <DateInput
                    title={t('选择日期')}
                    placeholder={t('选择日期')}
                    value={leaveForm.startDate}
                    onChangeText={(value) => setLeaveForm((prev) => ({...prev, startDate: value}))}
                  />
                </View>
                <View style={styles.dateColumn}>
                  <Text style={styles.formSectionLabel}>{t('结束日期')}</Text>
                  <DateInput
                    title={t('选择日期')}
                    placeholder={t('选择日期')}
                    value={leaveForm.endDate}
                    onChangeText={(value) => setLeaveForm((prev) => ({...prev, endDate: value}))}
                  />
                </View>
              </View>

              {leaveDurationDays > 0 ? (
                <Text style={styles.durationHint}>{t('请假时长：')}<Text style={styles.durationHintStrong}>{leaveDurationDays}</Text> {t('天')}</Text>
              ) : null}

              <Text style={styles.formSectionLabel}>{t('请假原因')}</Text>
              <TextInput
                multiline
                placeholder={t('请输入具体的请假事由（例如：突发感冒就医、家中有事处理等）...')}
                placeholderTextColor={colors.textMuted}
                style={styles.reasonInput}
                textAlignVertical="top"
                value={leaveForm.reason}
                onChangeText={(value) => setLeaveForm((prev) => ({...prev, reason: value}))}
              />

              <View style={styles.formButtonRow}>
                <Pressable
                  style={({pressed}) => [styles.formCancelButton, pressed && styles.recordCardPressed]}
                  onPress={() => {
                    setIsLeaveFormVisible(false);
                    resetLeaveForm();
                  }}
                >
                  <Text style={styles.formCancelText}>{t('取消')}</Text>
                </Pressable>
                <Pressable
                  style={({pressed}) => [styles.formSubmitButton, pressed && styles.headerActionButtonPressed, isSubmittingLeave && styles.formSubmitButtonDisabled]}
                  onPress={() => {
                    if (!isSubmittingLeave) {
                      void handleSubmitLeave();
                    }
                  }}
                >
                  <Text style={styles.formSubmitText}>{isSubmittingLeave ? t('提交中...') : t('提交申请')}</Text>
                </Pressable>
              </View>
            </View>
          ) : null}

          <Text style={styles.historyHeading}>{t('请假历史记录')}</Text>
          {leaveHistory.map((item) => {
            const statusStyle = getLeaveStatusStyle(item.status);
            return (
              <View key={item.id} style={styles.leaveHistoryCard}>
                <View style={styles.recordTopRow}>
                  <View style={styles.leaveHistoryMetaRow}>
                    <View style={[styles.recordBadge, styles.leaveTypeBadge]}>
                      <Text style={[styles.recordBadgeText, styles.badgeDoneText]}>{getLeaveTypeLabel(item.type, t)}</Text>
                    </View>
                    <Text style={styles.leaveDurationText}>{item.durationDays} {t('天')}</Text>
                  </View>
                  <View style={[styles.recordBadge, statusStyle.badge]}>
                    <Text style={[styles.recordBadgeText, statusStyle.text]}>{getLeaveStatusLabel(item.status, t)}</Text>
                  </View>
                </View>
                <Text style={styles.leaveDateRange}>{item.startDate} {t('至')} {item.endDate}</Text>
                <View style={styles.leaveReasonCard}>
                  <Text style={styles.leaveReasonText}>{item.reason}</Text>
                </View>
              </View>
            );
          })}
          {leaveHistory.length === 0 ? (
            <View style={styles.placeholderCard}>
              <View style={styles.placeholderIcon}>
                <Ionicons name="document-text-outline" size={24} color={colors.primary} />
              </View>
              <Text style={styles.placeholderTitle}>{t('暂无请假记录')}</Text>
              <Text style={styles.placeholderDetail}>{t('提交请假申请后，这里会展示历史记录和审批状态。')}</Text>
            </View>
          ) : null}
        </>
      )}
    </ScreenContainer>
  );
}

function SegmentButton({active, label, onPress}: {active: boolean; label: string; onPress: () => void}) {
  return (
    <Pressable style={({pressed}) => [styles.segmentButton, active && styles.segmentButtonActive, pressed && styles.recordCardPressed]} onPress={onPress}>
      <Text
        style={[styles.segmentButtonText, active && styles.segmentButtonTextActive]}
        numberOfLines={1}
        adjustsFontSizeToFit
        minimumFontScale={0.8}
      >
        {label}
      </Text>
    </Pressable>
  );
}

function LeaveTypeChip({active, label, onPress}: {active: boolean; label: string; onPress: () => void}) {
  return (
    <Pressable style={({pressed}) => [styles.leaveTypeChip, active && styles.leaveTypeChipActive, pressed && styles.recordCardPressed]} onPress={onPress}>
      <Text style={[styles.leaveTypeChipText, active && styles.leaveTypeChipTextActive]}>{label}</Text>
    </Pressable>
  );
}

function DateInput({
  value,
  onChangeText,
  placeholder,
  title,
}: {
  value: string;
  onChangeText: (value: string) => void;
  placeholder: string;
  title: string;
}) {
  const [isPickerVisible, setIsPickerVisible] = useState(false);
  const selectedDate = value || formatDateForInput(new Date());

  const handleDayPress = useCallback((day: DateData) => {
    onChangeText(day.dateString);
    setIsPickerVisible(false);
  }, [onChangeText]);

  return (
    <View>
      <Pressable style={({pressed}) => [styles.dateInputWrap, pressed && styles.recordCardPressed]} onPress={() => setIsPickerVisible(true)}>
        <Text style={value ? styles.dateInputValue : styles.dateInputPlaceholder}>{value || placeholder}</Text>
        <Ionicons name="calendar-outline" size={20} color={colors.text} />
      </Pressable>
      <Modal transparent animationType="fade" visible={isPickerVisible} onRequestClose={() => setIsPickerVisible(false)}>
        <View style={styles.calendarOverlay}>
          <Pressable style={styles.calendarBackdrop} onPress={() => setIsPickerVisible(false)} />
          <View style={styles.calendarCard}>
            <View style={styles.calendarHeader}>
              <Text style={styles.calendarTitle}>{title}</Text>
              <Pressable style={({pressed}) => [styles.calendarCloseButton, pressed && styles.recordCardPressed]} onPress={() => setIsPickerVisible(false)}>
                <Ionicons name="close" size={18} color={colors.text} />
              </Pressable>
            </View>
            {/* 开始日期和结束日期都改成点击字段后打开同款日历面板，避免继续混用手输或平台默认控件，保持请假流程一致。 */}
            <Calendar
              current={selectedDate}
              markedDates={{
                [selectedDate]: {
                  selected: true,
                  selectedColor: colors.primary,
                },
              }}
              onDayPress={handleDayPress}
              theme={{
                todayTextColor: colors.primary,
                arrowColor: colors.primary,
                selectedDayBackgroundColor: colors.primary,
                selectedDayTextColor: colors.white,
                textDayFontWeight: '700',
                textMonthFontWeight: '900',
                textDayHeaderFontWeight: '800',
              }}
            />
          </View>
        </View>
      </Modal>
    </View>
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
  // 顶部布局要优先保住右侧“提交请假申请”动作按钮的点击面积和位置；多语言变长时由左侧标题块占剩余宽度并自然换行，而不是把按钮挤走或把整行拆成两层。
  headerRow: {flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between', gap: 16},
  headerTitleBlock: {flex: 1, minWidth: 0},
  headerTitleText: {flexShrink: 1},
  headerSubtitleText: {flexShrink: 1},
  headerActionButton: {width: 136, flexShrink: 0, minHeight: 56, borderRadius: 20, paddingHorizontal: 12, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.primary, shadowColor: colors.primary, shadowOpacity: 0.24, shadowRadius: 16, shadowOffset: {width: 0, height: 8}, elevation: 4},
  headerActionButtonPressed: {opacity: 0.86},
  headerActionButtonText: {fontSize: 15, fontWeight: '900', color: colors.white, textAlign: 'center'},
  segmentWrap: {marginBottom: 18, flexDirection: 'row', gap: 12, backgroundColor: '#edf2f7', borderRadius: 22, padding: 6, borderWidth: 1, borderColor: '#e2e8f0'},
  segmentButton: {flex: 1, minWidth: 0, minHeight: 52, borderRadius: 18, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 12},
  segmentButtonActive: {backgroundColor: colors.white, shadowColor: colors.text, shadowOpacity: 0.06, shadowRadius: 12, shadowOffset: {width: 0, height: 4}, elevation: 2},
  segmentButtonText: {fontSize: 15, fontWeight: '800', color: colors.textSubtle, textAlign: 'center', flexShrink: 1},
  segmentButtonTextActive: {color: colors.text},
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
  leaveStatsCard: {marginTop: 8, flexDirection: 'row', alignItems: 'stretch', backgroundColor: colors.white, borderRadius: 28, paddingHorizontal: 22, paddingVertical: 24, borderWidth: 1, borderColor: '#edf2ff', shadowColor: colors.text, shadowOpacity: 0.03, shadowRadius: 20, shadowOffset: {width: 0, height: 8}, elevation: 3},
  leaveStatBlock: {flex: 1, alignItems: 'center', justifyContent: 'center'},
  leaveStatLabel: {fontSize: 14, color: '#94a3b8', fontWeight: '800'},
  leaveStatValue: {marginTop: 10, fontSize: 42, lineHeight: 46, color: colors.text, fontWeight: '900'},
  leavePendingValue: {color: '#f59e0b'},
  leaveStatUnit: {fontSize: 16, color: '#94a3b8', fontWeight: '800'},
  leaveDivider: {width: 1, marginHorizontal: 12, backgroundColor: '#e2e8f0'},
  leaveFormCard: {marginTop: 22, backgroundColor: colors.white, borderRadius: 28, padding: 20, borderWidth: 1, borderColor: '#dbeafe', shadowColor: colors.text, shadowOpacity: 0.03, shadowRadius: 20, shadowOffset: {width: 0, height: 8}, elevation: 3},
  leaveFormTitleRow: {flexDirection: 'row', alignItems: 'center', gap: 12},
  formTitleDot: {width: 10, height: 24, borderRadius: 999, backgroundColor: colors.primary},
  leaveFormTitle: {fontSize: 17, color: colors.text, fontWeight: '900'},
  formSectionLabel: {marginTop: 18, marginBottom: 10, fontSize: 14, color: '#94a3b8', fontWeight: '800'},
  leaveTypeRow: {flexDirection: 'row', flexWrap: 'wrap', gap: 12},
  leaveTypeChip: {minWidth: 96, minHeight: 48, paddingHorizontal: 18, borderRadius: 18, borderWidth: 1, borderColor: '#dbe3ef', backgroundColor: colors.white, alignItems: 'center', justifyContent: 'center'},
  leaveTypeChipActive: {backgroundColor: colors.primary, borderColor: colors.primary},
  leaveTypeChipText: {fontSize: 15, fontWeight: '800', color: colors.textSubtle},
  leaveTypeChipTextActive: {color: colors.white},
  dateRow: {marginTop: 4, flexDirection: 'row', gap: 14},
  dateColumn: {flex: 1},
  dateInputWrap: {minHeight: 68, borderRadius: 18, borderWidth: 1, borderColor: '#dbe3ef', backgroundColor: colors.white, paddingHorizontal: 18, flexDirection: 'row', alignItems: 'center', gap: 12},
  dateInput: {flex: 1, fontSize: 17, color: colors.text, fontWeight: '800'},
  dateInputValue: {flex: 1, fontSize: 17, color: colors.text, fontWeight: '800'},
  dateInputPlaceholder: {flex: 1, fontSize: 17, color: colors.textMuted, fontWeight: '700'},
  calendarOverlay: {flex: 1, justifyContent: 'center', paddingHorizontal: 20},
  calendarBackdrop: {position: 'absolute', top: 0, right: 0, bottom: 0, left: 0, backgroundColor: 'rgba(15, 23, 42, 0.32)'},
  calendarCard: {borderRadius: 28, backgroundColor: colors.white, padding: 18, shadowColor: colors.text, shadowOpacity: 0.12, shadowRadius: 24, shadowOffset: {width: 0, height: 12}, elevation: 8},
  calendarHeader: {marginBottom: 12, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between'},
  calendarTitle: {fontSize: 17, fontWeight: '900', color: colors.text},
  calendarCloseButton: {width: 36, height: 36, borderRadius: 18, alignItems: 'center', justifyContent: 'center', backgroundColor: '#eef2f7'},
  durationHint: {marginTop: 14, textAlign: 'right', fontSize: 13, color: colors.primary, fontWeight: '900'},
  durationHintStrong: {fontSize: 18, color: colors.primary, fontWeight: '900'},
  reasonInput: {marginTop: 2, minHeight: 132, borderRadius: 22, borderWidth: 1, borderColor: '#dbe3ef', backgroundColor: '#f8fafc', paddingHorizontal: 18, paddingVertical: 18, fontSize: 15, lineHeight: 24, color: colors.text, fontWeight: '600'},
  formButtonRow: {marginTop: 20, flexDirection: 'row', gap: 18},
  formCancelButton: {flex: 1, minHeight: 56, borderRadius: 20, alignItems: 'center', justifyContent: 'center', backgroundColor: '#eef2f7'},
  formCancelText: {fontSize: 16, fontWeight: '900', color: colors.textSubtle},
  formSubmitButton: {flex: 1, minHeight: 56, borderRadius: 20, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.primary, shadowColor: colors.primary, shadowOpacity: 0.24, shadowRadius: 16, shadowOffset: {width: 0, height: 8}, elevation: 4},
  formSubmitButtonDisabled: {opacity: 0.72},
  formSubmitText: {fontSize: 16, fontWeight: '900', color: colors.white},
  historyHeading: {marginTop: 22, marginBottom: 6, fontSize: 13, color: '#94a3b8', fontWeight: '900', letterSpacing: 1.1, textTransform: 'uppercase'},
  leaveHistoryCard: {marginTop: 16, backgroundColor: colors.white, borderRadius: 28, padding: 20, borderWidth: 1, borderColor: '#f1f5f9', shadowColor: colors.text, shadowOpacity: 0.03, shadowRadius: 20, shadowOffset: {width: 0, height: 8}, elevation: 3},
  leaveHistoryMetaRow: {flexDirection: 'row', alignItems: 'center', gap: 12},
  leaveTypeBadge: {backgroundColor: '#ecfdf5'},
  leaveDurationText: {fontSize: 17, fontWeight: '900', color: colors.text},
  leaveDateRange: {marginTop: 18, fontSize: 15, color: colors.textSubtle, fontWeight: '700'},
  leaveReasonCard: {marginTop: 18, borderRadius: 18, backgroundColor: '#f8fafc', paddingHorizontal: 18, paddingVertical: 16, borderWidth: 1, borderColor: '#eef2ff'},
  leaveReasonText: {fontSize: 15, lineHeight: 25, color: colors.text, fontWeight: '700'},
  badgeDone: {backgroundColor: '#ecfdf5'},
  badgeDoneText: {color: colors.success},
  badgeOvertime: {backgroundColor: '#fff7ed'},
  badgeOvertimeText: {color: colors.warning},
  badgeIncomplete: {backgroundColor: '#fee2e2'},
  badgeIncompleteText: {color: '#b91c1c'},
});
