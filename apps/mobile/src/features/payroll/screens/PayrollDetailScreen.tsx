import React, {useCallback, useMemo, useState} from 'react';
import {ActivityIndicator, Pressable, StyleSheet, Text, View} from 'react-native';
import {useFocusEffect, useLocalSearchParams} from 'expo-router';
import {useTranslation} from 'react-i18next';
import {InnerScreenHeader} from '../../../shared/components/InnerScreenHeader';
import {ScreenContainer} from '../../../shared/components/ScreenContainer';
import {colors} from '../../../shared/constants/colors';
import {sharedStyles} from '../../../shared/constants/styles';
import {useAuth} from '../../../application/providers/AuthProvider';
import {useToast} from '../../../application/providers/ToastProvider';
import {fetchMobilePayrollResultDetail} from '../services/payrollApi';
import {MobilePayrollResultDetail} from '../types';
import {buildAttendanceSummaryHint, localizePayrollReason} from '../utils/reasons';

function formatMoney(value: number, currency: string) {
  const amount = Number(value || 0);
  return `${currency} ${amount.toFixed(2)}`;
}

function formatHours(value: number) {
  return `${Number(value || 0).toFixed(1)}h`;
}

function formatDateTimeLabel(value: string | null) {
  if (!value) {
    return '--';
  }
  return String(value).replace('T', ' ').slice(0, 16);
}

export function PayrollDetailScreen() {
  const {t} = useTranslation('app');
  const params = useLocalSearchParams<{payrollId?: string | string[]}>();
  const payrollId = Array.isArray(params.payrollId) ? params.payrollId[0] : params.payrollId;
  const {session} = useAuth();
  const {showToast} = useToast();
  const [detail, setDetail] = useState<MobilePayrollResultDetail | null>(null);
  const [loading, setLoading] = useState(false);
  const [errorText, setErrorText] = useState<string | null>(null);

  const loadDetail = useCallback(async (showErrorToast = false) => {
    if (!session?.accessToken || !payrollId) {
      return;
    }

    setLoading(true);
    setErrorText(null);
    try {
      const nextDetail = await fetchMobilePayrollResultDetail(session.accessToken, Number(payrollId));
      setDetail(nextDetail);
      setErrorText(null);
    } catch (error) {
      const message = error instanceof Error ? error.message : t('工资条详情加载失败');
      setErrorText(message);
      if (showErrorToast) {
        showToast(message);
      }
    } finally {
      setLoading(false);
    }
  }, [payrollId, session?.accessToken, showToast, t]);

  useFocusEffect(
    useCallback(() => {
      void loadDetail(false);
    }, [loadDetail]),
  );

  const result = detail?.result || null;
  const currency = result?.currency || detail?.employee?.currency || 'THB';
  const adjustmentSummary = useMemo(() => {
    const items = detail?.adjustmentItems || [];
    return {
      allowance: items.filter((item) => item.type === 'allowance'),
      deduction: items.filter((item) => item.type === 'deduction'),
      other: items.filter((item) => item.type === 'other'),
    };
  }, [detail?.adjustmentItems]);
  const attendanceSummaryHint = useMemo(() => {
    return buildAttendanceSummaryHint(detail?.attendanceSummary, detail?.exceptionDetails, result, t);
  }, [detail?.attendanceSummary, detail?.exceptionDetails, result, t]);
  const localizePayrollText = useCallback((value: string | null | undefined) => localizePayrollReason({text: value}, t), [t]);

  return (
    <ScreenContainer header={<InnerScreenHeader title={t('工资条详情')} fallbackHref="/home" />} withBottomSafeArea>
      {loading && !detail ? (
        <View style={styles.placeholderCard}>
          <ActivityIndicator color={colors.primary} />
          <Text style={sharedStyles.cardTitle}>{t('正在加载工资条详情...')}</Text>
          <Text style={sharedStyles.muted}>{t('请稍候，系统正在同步本月工资条数据。')}</Text>
        </View>
      ) : errorText ? (
        <View style={styles.placeholderCard}>
          <Text style={sharedStyles.cardTitle}>{t('工资条详情暂时加载失败')}</Text>
          <Text style={sharedStyles.muted}>{errorText}</Text>
          <Pressable style={styles.retryButton} onPress={() => void loadDetail(true)}>
            <Text style={styles.retryButtonText}>{t('重新加载')}</Text>
          </Pressable>
        </View>
      ) : result ? (
        <>
          <View style={styles.heroCard}>
            <Text style={styles.heroOverline}>{result.yearMonth}</Text>
            <Text style={styles.heroTitle}>{result.employeeName}</Text>
            <Text style={styles.heroSubtitle}>{detail?.employee?.dept || result.employeeDept} · {detail?.employee?.role || result.employeeRole}</Text>
            <Text style={styles.netPayLabel}>{t('实发工资')}</Text>
            <Text style={styles.netPayValue}>{formatMoney(result.netPay, currency)}</Text>
            <Text style={styles.heroHint}>{t('确认发放时间')} {formatDateTimeLabel(result.confirmedAt)}</Text>
          </View>

          <View style={styles.metricsGrid}>
            <MetricCard label={t('有效出勤')} value={`${result.effectiveAttendanceDays}d`} />
            <MetricCard label={t('有效工时')} value={formatHours(result.validHours)} />
            <MetricCard label={t('加班工时')} value={formatHours(result.overtimePayHours)} />
          </View>

          <View style={styles.sectionCard}>
            <Text style={styles.sectionTitle}>{t('工资构成')}</Text>
            <LineItem label={result.salaryType === 'fixed' ? t('基础工资') : t('标准工时工资')} value={formatMoney(result.salaryType === 'fixed' ? (result.fixedSalary || 0) : result.hourlyPay, currency)} />
            <LineItem label={t('加班费')} value={formatMoney(result.overtimePay, currency)} positive />
            <LineItem label={t('餐补')} value={formatMoney(result.mealAllowanceTotal, currency)} positive suffix={`${result.mealAllowanceDayUnits}d`} />
            <LineItem label={t('全勤奖')} value={formatMoney(result.attendanceBonusAmount, currency)} positive />
            <LineItem label={t('服务费')} value={formatMoney(result.serviceFeeAmount, currency)} positive suffix={`${detail?.salaryProfile?.serviceFeeRate ?? detail?.employee?.serviceFeeRate ?? 0}%`} />
            {adjustmentSummary.allowance.map((item) => (
              <LineItem key={item.id} label={item.name} value={formatMoney(item.amount, currency)} positive suffix={item.note || undefined} />
            ))}
            {adjustmentSummary.other.map((item) => (
              <LineItem key={item.id} label={item.name} value={formatMoney(item.amount, currency)} positive suffix={item.note || undefined} />
            ))}
          </View>

          <View style={styles.sectionCard}>
            <Text style={styles.sectionTitle}>{t('扣款项目')}</Text>
            <LineItem label={t('社保扣款')} value={formatMoney(result.socialSecurityAmount, currency)} negative />
            {adjustmentSummary.deduction.map((item) => (
              <LineItem key={item.id} label={item.name} value={formatMoney(item.amount, currency)} negative suffix={item.note || undefined} />
            ))}
            <LineItem label={t('合计扣款')} value={formatMoney(result.totalDeduction, currency)} negative strong />
          </View>

          <View style={styles.sectionCard}>
            <Text style={styles.sectionTitle}>{t('核算说明')}</Text>
            <LineItem label={t('标准工时')} value={formatHours(result.standardHours)} />
            <LineItem label={t('每日标准工时')} value={formatHours(detail?.dailyStandardHours || 0)} />
            <LineItem label={t('计算时间')} value={formatDateTimeLabel(result.calculatedAt)} />
            {attendanceSummaryHint ? (
              <Text style={styles.summaryHint}>{attendanceSummaryHint}</Text>
            ) : null}
            {detail?.attendanceSummary?.blockedReason || result.blockedReason ? (
              <Text style={styles.blockedReason}>{localizePayrollReason({
                text: detail?.attendanceSummary?.blockedReason || result.blockedReason,
                code: detail?.attendanceSummary?.blockedReasonCode || result.blockedReasonCode || null,
                data: detail?.attendanceSummary?.blockedReasonData || result.blockedReasonData || null,
              }, t)}</Text>
            ) : null}
          </View>

          {detail?.exceptionDetails?.length ? (
            <View style={styles.sectionCard}>
              <Text style={styles.sectionTitle}>{t('异常说明')}</Text>
              {detail.exceptionDetails.map((item) => (
                <View key={`${item.date}-${item.reason}`} style={styles.exceptionRow}>
                  <Text style={styles.exceptionDate}>{item.date}</Text>
                  <Text style={styles.exceptionStatus}>{localizePayrollReason({
                    text: item.statusLabel || item.status,
                    code: item.statusCode || null,
                  }, t)}</Text>
                  <Text style={styles.exceptionReason}>{localizePayrollReason({
                    text: item.reason,
                    code: item.reasonCode || null,
                    data: item.reasonData || null,
                  }, t)}</Text>
                </View>
              ))}
            </View>
          ) : null}
        </>
      ) : null}
    </ScreenContainer>
  );
}

function MetricCard({label, value}: {label: string; value: string}) {
  return (
    <View style={styles.metricCard}>
      <Text style={styles.metricLabel}>{label}</Text>
      <Text style={styles.metricValue}>{value}</Text>
    </View>
  );
}

function LineItem({
  label,
  value,
  suffix,
  positive = false,
  negative = false,
  strong = false,
}: {
  label: string;
  value: string;
  suffix?: string;
  positive?: boolean;
  negative?: boolean;
  strong?: boolean;
}) {
  return (
    <View style={styles.lineItem}>
      <View style={styles.lineItemLabelWrap}>
        <Text style={[styles.lineItemLabel, strong && styles.lineItemStrong]}>{label}</Text>
        {suffix ? <Text style={styles.lineItemSuffix}>{suffix}</Text> : null}
      </View>
      <Text style={[
        styles.lineItemValue,
        positive && styles.lineItemPositive,
        negative && styles.lineItemNegative,
        strong && styles.lineItemStrong,
      ]}>
        {value}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  placeholderCard: {marginTop: 16, backgroundColor: colors.white, borderRadius: 22, padding: 18, alignItems: 'center', gap: 10},
  retryButton: {marginTop: 8, minWidth: 120, height: 44, borderRadius: 16, backgroundColor: colors.primary, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 16},
  retryButtonText: {color: colors.white, fontWeight: '900'},
  heroCard: {backgroundColor: colors.white, borderRadius: 28, padding: 22, borderWidth: 1, borderColor: '#dbeafe'},
  heroOverline: {fontSize: 12, color: colors.primary, fontWeight: '900', letterSpacing: 1.2, textTransform: 'uppercase'},
  heroTitle: {marginTop: 10, fontSize: 24, color: colors.text, fontWeight: '900'},
  heroSubtitle: {marginTop: 4, fontSize: 14, color: colors.textSubtle, fontWeight: '700'},
  netPayLabel: {marginTop: 20, fontSize: 13, color: colors.textMuted, fontWeight: '800'},
  netPayValue: {marginTop: 6, fontSize: 30, color: colors.primary, fontWeight: '900'},
  heroHint: {marginTop: 8, fontSize: 12, color: colors.textSubtle, fontWeight: '700'},
  metricsGrid: {marginTop: 16, flexDirection: 'row', gap: 12},
  metricCard: {flex: 1, minHeight: 92, backgroundColor: colors.white, borderRadius: 22, padding: 14, alignItems: 'center', justifyContent: 'center'},
  metricLabel: {fontSize: 11, color: colors.textMuted, fontWeight: '900'},
  metricValue: {marginTop: 10, fontSize: 22, color: colors.text, fontWeight: '900'},
  sectionCard: {marginTop: 16, backgroundColor: colors.white, borderRadius: 24, padding: 18},
  sectionTitle: {fontSize: 16, color: colors.text, fontWeight: '900', marginBottom: 8},
  lineItem: {paddingVertical: 10, flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: '#e2e8f0'},
  lineItemLabelWrap: {flex: 1, gap: 4},
  lineItemLabel: {fontSize: 14, color: colors.text, fontWeight: '700'},
  lineItemSuffix: {fontSize: 11, color: colors.textSubtle, fontWeight: '600'},
  lineItemValue: {fontSize: 14, color: colors.text, fontWeight: '800'},
  lineItemPositive: {color: colors.success},
  lineItemNegative: {color: colors.warning},
  lineItemStrong: {fontWeight: '900'},
  summaryHint: {marginTop: 12, fontSize: 13, lineHeight: 20, color: colors.textSubtle, fontWeight: '700'},
  blockedReason: {marginTop: 12, fontSize: 13, lineHeight: 20, color: colors.warning, fontWeight: '700'},
  exceptionRow: {paddingVertical: 10, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: '#e2e8f0'},
  exceptionDate: {fontSize: 13, color: colors.text, fontWeight: '800'},
  exceptionStatus: {marginTop: 4, fontSize: 12, color: colors.warning, fontWeight: '800'},
  exceptionReason: {marginTop: 4, fontSize: 12, lineHeight: 18, color: colors.textSubtle, fontWeight: '600'},
});
