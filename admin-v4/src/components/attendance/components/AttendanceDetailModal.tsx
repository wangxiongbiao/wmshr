import { useEffect } from "react";
import { X, MapPin } from "lucide-react";
import type { AppConfig } from "../../../types";
import { cn, formatCurrency } from "../../../lib/utils";
import { Button } from "../../ui/button";
import { Badge } from "../../ui/badge";
import { ATTENDANCE_TYPE_CLASSES } from "../constants";
import type { AttendanceDetailRecord } from "../types";

interface AttendanceDetailModalProps {
  detailRecord: AttendanceDetailRecord | null;
  config: AppConfig;
  onClose: () => void;
}

export function AttendanceDetailModal({
  detailRecord,
  config,
  onClose
}: AttendanceDetailModalProps) {
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        onClose();
      }
    };
    if (detailRecord) {
      window.addEventListener("keydown", handleKeyDown);
    }
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [detailRecord, onClose]);

  if (!detailRecord) return null;

  const { emp, rec, date, details, shiftPay, otPay, mealAllowance, dailySocialSecurity, dailyServiceFee, totalPay } = detailRecord;

  return (
    <div
      onClick={onClose}
      className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs z-50 flex items-center justify-center p-4 cursor-pointer"
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="bg-white rounded-xl shadow-2xl max-w-2xl w-full overflow-hidden border border-slate-100 transform scale-100 transition-all flex flex-col cursor-default max-h-[90vh] overflow-y-auto"
      >
        {/* Modal Header */}
        <div className="bg-brand-600 text-white p-5 flex justify-between items-center">
          <div>
            <h3 className="text-base font-bold">考勤明细详情</h3>
            <p className="text-xs text-brand-100 mt-0.5">日期：{date}</p>
          </div>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={onClose}
            className="text-white/80 hover:text-white hover:bg-white/10 h-8 w-8 p-0 rounded-lg"
          >
            <X className="w-5 h-5" />
          </Button>
        </div>

        {/* Modal Body */}
        <div className="p-6 space-y-5 overflow-y-auto max-h-[75vh]">
          {/* Employee Info Block */}
          <div className="flex items-center gap-3.5 bg-slate-50 p-3 rounded-lg border border-slate-100">
            <div className="w-11 h-11 rounded-full bg-slate-200 flex items-center justify-center text-slate-600 font-bold overflow-hidden border border-slate-200 shadow-xs flex-shrink-0">
              {emp.photo ? (
                <img src={emp.photo} className="w-full h-full object-cover" alt="" />
              ) : (
                emp.name.charAt(0)
              )}
            </div>
            <div>
              <div className="text-sm font-bold text-slate-900 flex items-center gap-2">
                <span>{emp.name}</span>
                <span className="text-xs font-mono text-slate-400 font-normal">#{emp.id}</span>
              </div>
              <div className="text-xs text-slate-500 mt-0.5">
                {emp.dept || "未分配部门"} · {emp.role || "普通员工"} · {emp.country}
              </div>
            </div>
          </div>

          {/* Status & Hours Grid */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
            <div className="p-3 bg-slate-50 rounded-lg border border-slate-100 text-center">
              <span className="text-[11px] text-slate-400 block mb-1">考勤类型</span>
              <span className={cn(
                "px-2 py-0.5 rounded text-xs font-bold inline-block",
                rec ? (ATTENDANCE_TYPE_CLASSES[rec.type] || "bg-slate-100 text-slate-700") : (emp.requiresAttendance === false ? "bg-sky-50 text-sky-700 border border-sky-100" : "bg-red-50 text-red-600")
              )}>
                {rec ? (rec.type === "exempt_present" ? "免打卡" : rec.type) : (emp.requiresAttendance === false ? "免打卡" : "缺勤")}
              </span>
            </div>
            <div className="p-3 bg-slate-50 rounded-lg border border-slate-100 text-center">
              <span className="text-[11px] text-slate-400 block mb-1">上班 / 下班</span>
              <span className="text-xs font-bold font-mono text-slate-700">
                {rec?.inTime || "-"} / {rec?.outTime || "-"}
              </span>
            </div>
            <div className="p-3 bg-slate-50 rounded-lg border border-slate-100 text-center">
              <span className="text-[11px] text-slate-400 block mb-1">有效工时</span>
              <span className="text-xs font-bold font-mono text-slate-700">
                {details.valid ? `${details.valid.toFixed(2)}h` : "-"}
              </span>
            </div>
            <div className="p-3 bg-slate-50 rounded-lg border border-slate-100 text-center">
              <span className="text-[11px] text-slate-400 block mb-1">加班工时</span>
              <span className="text-xs font-bold font-mono text-amber-600">
                {details.ot ? `${details.ot.toFixed(2)}h` : "-"}
              </span>
            </div>
          </div>

          {/* Financial Calculations list */}
          <div>
            <div className="text-xs font-bold text-slate-700 mb-2 flex items-center justify-between">
              <span>费用核算明细 (币种: {emp.currency})</span>
              <span className="text-[11px] text-slate-400 font-normal">系统实时计算</span>
            </div>
            <div className="bg-slate-50 rounded-lg border border-slate-100 divide-y divide-slate-100 text-xs">
              <div className="px-4 py-3 flex justify-between items-center">
                <span className="text-slate-500 font-medium">常规工时费用 (今日班次薪资)</span>
                <span className="font-mono font-bold text-slate-700">
                  {formatCurrency(shiftPay, emp.currency)}
                </span>
              </div>
              <div className="px-4 py-3 flex justify-between items-center">
                <span className="text-slate-500 font-medium">加班费用</span>
                <span className="font-mono font-bold text-amber-600">
                  + {formatCurrency(otPay, emp.currency)}
                </span>
              </div>
              <div className="px-4 py-3 flex justify-between items-center">
                <span className="text-slate-500 font-medium">餐补费用</span>
                <span className="font-mono font-bold text-amber-600">
                  + {formatCurrency(mealAllowance, emp.currency)}
                </span>
              </div>
              <div className="px-4 py-3 flex justify-between items-center">
                <span className="text-slate-500 font-medium">社保费用 (每日拆算扣款)</span>
                <span className="font-mono font-bold text-red-500">
                  - {formatCurrency(dailySocialSecurity, emp.currency)}
                </span>
              </div>
              <div className="px-4 py-3 flex justify-between items-center">
                <span className="text-slate-500 font-medium">
                  {emp.sourceType === "劳务派遣"
                    ? `派遣服务费 (${emp.dispatchCommissionRate ?? 0}%)`
                    : "派遣服务费 (自招员工无抽佣)"
                  }
                </span>
                <span className="font-mono font-bold text-purple-600">
                  + {formatCurrency(dailyServiceFee, emp.currency)}
                </span>
              </div>
              <div className="px-4 py-3 bg-brand-50/50 flex justify-between items-center text-sm font-bold">
                <span className="text-brand-900">当日总费用</span>
                <span className="font-mono text-brand-600 text-base">
                  {formatCurrency(totalPay, emp.currency)}
                </span>
              </div>
            </div>
          </div>

          {/* 地理定位核验 */}
          {rec && (rec.inLat != null || rec.outLat != null) && (
            <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 space-y-3">
              <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wide flex items-center gap-1.5">
                <MapPin className="w-4 h-4 text-brand-600" />
                📍 移动端考勤打卡地理定位核验 (Geo-fencing Verification)
              </h4>
              <div className="text-[11px] text-slate-500 bg-white px-3 py-1.5 rounded-lg border border-slate-100 flex justify-between items-center">
                <span>公司预设办公地点：<b>{config.companyAddress || "默认仓区"}</b></span>
                <span className="font-mono text-slate-400">({config.companyLat != null ? Number(config.companyLat).toFixed(4) : "-"}, {config.companyLng != null ? Number(config.companyLng).toFixed(4) : "-"})</span>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                {rec.inLat != null && (
                  <div className={cn(
                    "p-3.5 rounded-lg border bg-white flex flex-col gap-1.5",
                    rec.inDeviated ? "border-red-200 shadow-xs shadow-red-50/50" : "border-emerald-200 shadow-xs shadow-emerald-50/50"
                  )}>
                    <div className="flex justify-between items-center">
                      <span className="text-xs font-bold text-slate-700">🌅 上班打卡定位</span>
                      {rec.inDeviated ? (
                        <Badge variant="destructive" className="px-1.5 py-0 text-[10px] font-bold">异地打卡</Badge>
                      ) : (
                        <Badge variant="success" className="px-1.5 py-0 text-[10px] font-bold">公司范围内</Badge>
                      )}
                    </div>
                    <div className="text-xs font-semibold text-slate-500">
                      打卡距离：
                      <span className={cn(
                        "text-sm font-bold font-mono",
                        rec.inDeviated ? "text-red-600" : "text-emerald-600"
                      )}>
                        {rec.inDistance} 米
                      </span>
                    </div>
                    <div className="text-[10px] text-slate-400 font-mono mt-1">
                      坐标: {Number(rec.inLat).toFixed(6)}, {rec.inLng != null ? Number(rec.inLng).toFixed(6) : "-"}
                    </div>
                    <div className="text-[10px] text-slate-400 mt-1">
                      {rec.inDeviated ? "⚠️ 员工打卡位置超出公司规定范围（限制 800 米），需向考勤组核实。" : "✅ 符合考勤地理围栏，确认在公司。"}
                    </div>
                  </div>
                )}
                {rec.outLat != null && (
                  <div className={cn(
                    "p-3.5 rounded-lg border bg-white flex flex-col gap-1.5",
                    rec.outDeviated ? "border-red-200 shadow-xs shadow-red-50/50" : "border-emerald-200 shadow-xs shadow-emerald-50/50"
                  )}>
                    <div className="flex justify-between items-center">
                      <span className="text-xs font-bold text-slate-700">🌇 下班打卡定位</span>
                      {rec.outDeviated ? (
                        <Badge variant="destructive" className="px-1.5 py-0 text-[10px] font-bold">异地打卡</Badge>
                      ) : (
                        <Badge variant="success" className="px-1.5 py-0 text-[10px] font-bold">公司范围内</Badge>
                      )}
                    </div>
                    <div className="text-xs font-semibold text-slate-500">
                      打卡距离：
                      <span className={cn(
                        "text-sm font-bold font-mono",
                        rec.outDeviated ? "text-red-600" : "text-emerald-600"
                      )}>
                        {rec.outDistance} 米
                      </span>
                    </div>
                    <div className="text-[10px] text-slate-400 font-mono mt-1">
                      坐标: {Number(rec.outLat).toFixed(6)}, {rec.outLng != null ? Number(rec.outLng).toFixed(6) : "-"}
                    </div>
                    <div className="text-[10px] text-slate-400 mt-1">
                      {rec.outDeviated ? "⚠️ 员工打卡位置超出公司规定范围（限制 800 米），需向考勤组核实。" : "✅ 符合考勤地理围栏，确认在公司。"}
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Note / Remarks */}
          <div className="p-3 bg-amber-50/40 rounded-lg border border-amber-100 text-xs">
            <span className="font-bold text-amber-800 block mb-1">备注说明</span>
            <span className="text-amber-900/80 font-medium">
              {rec?.note || "无特别备注。"}
            </span>
          </div>
        </div>

        {/* Modal Footer */}
        <div className="bg-slate-50 p-3.5 border-t border-slate-100 flex justify-end">
          <Button
            type="button"
            variant="secondary"
            size="sm"
            onClick={onClose}
            className="px-4 font-bold text-xs rounded-lg"
          >
            关闭
          </Button>
        </div>
      </div>
    </div>
  );
}
