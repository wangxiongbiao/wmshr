import {TFunction} from 'i18next';
import {
  MobileAttendanceSummary,
  MobilePayrollExceptionDetail,
  MobilePayrollReasonCode,
  MobilePayrollReasonData,
  MobilePayrollResult,
} from '../types';

function formatHours(value: number) {
  return `${Number(value || 0).toFixed(1)}h`;
}

function normalizeHoursValue(value: number | string | null | undefined) {
  if (typeof value === 'number' && Number.isFinite(value)) {
    return formatHours(value);
  }

  const trimmed = String(value || '').trim();
  if (!trimmed) {
    return '';
  }
  if (/^\d+(\.\d+)?$/.test(trimmed)) {
    return formatHours(Number(trimmed));
  }
  if (/^\d+(\.\d+)?h$/i.test(trimmed)) {
    return `${Number(trimmed.slice(0, -1)).toFixed(1)}h`;
  }
  return trimmed;
}

function normalizeFeeValue(value: number | string | null | undefined) {
  if (typeof value === 'number' && Number.isFinite(value)) {
    return String(value);
  }

  return String(value || '').trim();
}

function buildReasonFromCode(
  code: MobilePayrollReasonCode,
  data: MobilePayrollReasonData | null | undefined,
  t: TFunction<'app'>,
) {
  switch (code) {
    case 'attendance_exception_summary': {
      const count = Number(data?.count || 0);
      const hours = normalizeHoursValue(data?.hours);
      if (count > 0 && hours) {
        return t('异常考勤 {{count}} 条，已按 {{hours}} 工时参与核算。', {count, hours});
      }
      return t('存在异常考勤数据，已按当前薪资规则参与核算。');
    }
    case 'attendance_exception_zeroed': {
      const count = Number(data?.count || 0);
      const hours = normalizeHoursValue(data?.hours);
      const fee = normalizeFeeValue(data?.fee);
      if (count > 0 && hours && fee) {
        return t('异常考勤 {{count}} 条，已按 {{hours}} 工时 / {{fee}} 费用计入薪资。', {count, hours, fee});
      }
      return t('存在异常考勤数据，已按当前薪资规则参与核算。');
    }
    case 'attendance_exception':
      return t('考勤异常');
    case 'late':
      return t('迟到');
    case 'early':
      return t('早退');
    case 'missing_punch':
      return t('缺卡');
    case 'missing_check_in':
      return t('上班未打卡');
    case 'missing_check_out':
      return t('下班未打卡');
    case 'missing_check_in_out':
      return t('上下班未打卡');
    default:
      return null;
  }
}

function buildReasonFromLegacyText(value: string, t: TFunction<'app'>) {
  const exceptionSummaryMatch = value.match(
    /异常考勤\s*(\d+)\s*条[，,]\s*(?:已|已经)?\s*按\s*([0-9.]+(?:h)?)(?:\s*(?:工时|小时))?\s*(?:参与(?:薪资)?核算|计算)。?/,
  );
  if (exceptionSummaryMatch) {
    return t('异常考勤 {{count}} 条，已按 {{hours}} 工时参与核算。', {
      count: Number(exceptionSummaryMatch[1]),
      hours: normalizeHoursValue(exceptionSummaryMatch[2]),
    });
  }

  const exceptionZeroedMatch = value.match(
    /异常考勤\s*(\d+)\s*条[，,]\s*(?:已|已经)?\s*按\s*([0-9.]+(?:h)?)(?:\s*(?:工时|小时))?\s*\/\s*([0-9.]+)\s*费用计入薪资。?/,
  );
  if (exceptionZeroedMatch) {
    return t('异常考勤 {{count}} 条，已按 {{hours}} 工时 / {{fee}} 费用计入薪资。', {
      count: Number(exceptionZeroedMatch[1]),
      hours: normalizeHoursValue(exceptionZeroedMatch[2]),
      fee: normalizeFeeValue(exceptionZeroedMatch[3]),
    });
  }

  switch (value) {
    case '迟到':
    case '早退':
    case '异常':
    case '考勤异常':
    case '异常考勤明细':
    case '未打卡':
    case '缺卡':
    case '上班未打卡':
    case '下班未打卡':
    case '上下班未打卡':
    case '存在异常考勤数据，已按当前薪资规则参与核算。':
    case '暂无具体异常明细，请先重新结算当月考勤。':
      return t(value);
    default:
      return value;
  }
}

export function localizePayrollReason(
  input: {
    text?: string | null;
    code?: MobilePayrollReasonCode | null;
    data?: MobilePayrollReasonData | null;
  },
  t: TFunction<'app'>,
) {
  if (input.code) {
    const byCode = buildReasonFromCode(input.code, input.data, t);
    if (byCode) {
      return byCode;
    }
  }

  if (input.text) {
    return buildReasonFromLegacyText(input.text, t);
  }

  return '';
}

export function buildAttendanceSummaryHint(
  attendanceSummary: MobileAttendanceSummary | null | undefined,
  exceptionDetails: MobilePayrollExceptionDetail[] | null | undefined,
  result: MobilePayrollResult | null | undefined,
  t: TFunction<'app'>,
) {
  const structuredReason = localizePayrollReason({
    code: attendanceSummary?.blockedReasonCode || result?.blockedReasonCode || null,
    data: attendanceSummary?.blockedReasonData || result?.blockedReasonData || null,
  }, t);
  if (structuredReason) {
    return structuredReason;
  }

  const count = attendanceSummary?.exceptionCount || exceptionDetails?.length || 0;
  if (count <= 0) {
    return '';
  }

  const hours = normalizeHoursValue(attendanceSummary?.totalValidHours ?? result?.validHours ?? 0);
  return t('异常考勤 {{count}} 条，已按 {{hours}} 工时参与核算。', {count, hours});
}
