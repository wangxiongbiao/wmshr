/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from "react";
import { Eye, Edit, Copy, Check, History, ChevronDown, ChevronUp, Loader2 } from "lucide-react";
import { Employee, SalaryChangeLog } from "../../../types";
import { Language, getTranslation } from "../../../lib/i18n";
import { fetchEmployeeSalaryHistory } from "../../../lib/employeeApi";
import {
  cn,
  formatCurrency,
  formatDate,
  COUNTRY_FLAGS,
  COUNTRY_NAMES,
  WAREHOUSE_FLAGS,
  WAREHOUSE_NAMES,
} from "../../../lib/utils";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "../../ui/dialog";
import { Button } from "../../ui/button";

export interface EmployeeDetailModalProps {
  employee: Employee | null;
  isOpen: boolean;
  onClose: () => void;
  onEditEmployee?: (emp: Employee) => Promise<void> | void;
  hasPermission?: (permId: string) => boolean;
  reloadKey?: number;
  lang?: Language;
}

export function EmployeeDetailModal({
  employee,
  isOpen,
  onClose,
  onEditEmployee,
  hasPermission = () => true,
  reloadKey = 0,
  lang = "zh-CN",
}: EmployeeDetailModalProps) {
  const [copiedField, setCopiedField] = useState<"username" | null>(null);
  const [salaryLogs, setSalaryLogs] = useState<SalaryChangeLog[]>([]);
  const [isLoadingSalaryLogs, setIsLoadingSalaryLogs] = useState(false);
  const [isSalaryLogsExpanded, setIsSalaryLogsExpanded] = useState(false);

  useEffect(() => {
    if (employee?.id && isOpen) {
      setIsLoadingSalaryLogs(true);
      fetchEmployeeSalaryHistory(employee.id)
        .then((logs) => setSalaryLogs(logs))
        .catch(() => setSalaryLogs([]))
        .finally(() => setIsLoadingSalaryLogs(false));
    } else {
      setSalaryLogs([]);
    }
  }, [employee?.id, isOpen, reloadKey]);

  const copyToClipboard = async (text: string, field: "username") => {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedField(field);
      setTimeout(() => setCopiedField(null), 2000);
    } catch {
      const textarea = document.createElement("textarea");
      textarea.value = text;
      document.body.appendChild(textarea);
      textarea.select();
      try {
        document.execCommand("copy");
        setCopiedField(field);
        setTimeout(() => setCopiedField(null), 2000);
      } catch (e) {
        console.error(e);
      }
      document.body.removeChild(textarea);
    }
  };

  if (!employee) return null;

  return (
    <Dialog open={isOpen} onOpenChange={(open) => { if (!open) onClose(); }}>
      <DialogContent className="max-w-2xl max-h-[90vh] p-0 flex flex-col sm:rounded-2xl overflow-hidden">
        <DialogHeader className="bg-gradient-to-r from-blue-600 to-indigo-600 text-white px-6 py-5 flex flex-row justify-between items-center space-y-0">
          <DialogTitle className="font-bold text-base text-white flex items-center gap-3 tracking-tight">
            <Eye className="w-5 h-5 text-blue-100" />
            {lang === "en" ? "Employee Profile Details" : lang === "th" ? "รายละเอียดโปรไฟล์พนักงาน" : lang === "zh-TW" ? "員工檔案詳情" : "员工档案详情"}
          </DialogTitle>
        </DialogHeader>

        {/* Profile Brief Area */}
        <div className="p-6 bg-slate-50/50 border-b border-slate-100 flex flex-col sm:flex-row items-center gap-5">
          <div className="w-20 h-20 rounded-full bg-slate-200 border-4 border-white overflow-hidden shadow-sm flex-shrink-0 flex items-center justify-center">
            {employee.photo ? (
              <img src={employee.photo} className="w-full h-full object-cover" alt="" />
            ) : (
              <div className="w-full h-full flex items-center justify-center text-slate-400 bg-slate-100 text-2xl font-black">
                {employee.name.charAt(0)}
              </div>
            )}
          </div>
          <div className="text-center sm:text-left space-y-1.5">
            <div className="flex items-center justify-center sm:justify-start gap-2.5 flex-wrap">
              <h4 className="text-xl font-black text-slate-800 tracking-tight">{employee.name}</h4>
              <span className="text-lg" title={COUNTRY_NAMES[employee.country]}>
                {COUNTRY_FLAGS[employee.country]}
              </span>
              <span className="text-xs text-slate-500 bg-slate-200/60 px-2 py-0.5 rounded-full font-semibold">
                {COUNTRY_NAMES[employee.country] || employee.country}
              </span>
              {employee.warehouseCode && (
                <span className="text-xs font-bold text-brand-700 bg-brand-50 border border-brand-200 px-2.5 py-0.5 rounded-full">
                  {WAREHOUSE_FLAGS[employee.warehouseCode] || "🏢"} {WAREHOUSE_NAMES[employee.warehouseCode] || `${employee.warehouseCode} 仓`}
                </span>
              )}
            </div>
            <div className="flex items-center justify-center sm:justify-start gap-2 flex-wrap">
              <span className={cn(
                "text-xs px-2.5 py-0.5 rounded-full font-semibold",
                employee.gender === "female" ? "text-pink-600 bg-pink-50" : "text-blue-600 bg-blue-50"
              )}>
                {employee.gender === "female"
                  ? (lang === "en" ? "Female" : lang === "th" ? "หญิง" : "女")
                  : (lang === "en" ? "Male" : lang === "th" ? "ชาย" : "男")}
              </span>
              <span className={cn(
                "text-xs px-2.5 py-0.5 rounded-full font-bold",
                employee.status === "在职" ? "bg-green-100 text-green-700" : employee.status === "离职" ? "bg-rose-100 text-rose-700 border border-rose-200" : employee.status === "试用" ? "bg-amber-100 text-amber-700 border border-amber-200" : "bg-blue-100 text-blue-700"
              )}>
                {employee.status === "在职"
                  ? (lang === "en" ? "Active" : lang === "th" ? "ทำงานอยู่" : "在职")
                  : employee.status === "离职"
                    ? (lang === "en" ? "Resigned" : lang === "th" ? "ลาออก" : "离职")
                    : employee.status === "试用"
                      ? (lang === "en" ? "Probation" : lang === "th" ? "ทดลองงาน" : "试用")
                      : (lang === "en" ? "On Leave" : lang === "th" ? "ลาหยุด" : "休假")
                }
              </span>
            </div>
          </div>
        </div>

        {/* Main Fields Grid */}
        <div className="p-6 overflow-y-auto space-y-6 flex-1 scrollbar-thin">
          {/* 1. Base Information */}
          <div className="space-y-3">
            <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider flex items-center gap-2">
              <span className="w-1.5 h-1.5 rounded-full bg-brand-500"></span>
              {lang === "en" ? "Basic Information" : lang === "th" ? "ข้อมูลพื้นฐาน" : "基本信息"}
            </h4>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 bg-slate-50/30 p-4 rounded-xl border border-slate-100 text-xs">
              <div>
                <span className="text-slate-400 font-medium block">{getTranslation("emp_role", lang)}</span>
                <span className="font-bold text-slate-800 text-sm block mt-1">{employee.role}</span>
              </div>
              <div>
                <span className="text-slate-400 font-medium block">{getTranslation("emp_dept", lang)}</span>
                <span className="font-bold text-slate-800 text-sm block mt-1">{employee.dept || "-"}</span>
              </div>
              <div>
                <span className="text-slate-400 font-medium block">{getTranslation("emp_join_date", lang)}</span>
                <span className="font-bold text-slate-800 text-sm block mt-1 font-mono tabular-nums">{formatDate(employee.joinDate)}</span>
              </div>
              <div>
                <span className="text-slate-400 font-medium block">
                  {lang === "en" ? "Attendance Punch" : lang === "th" ? "การลงเวลาเข้างาน" : lang === "zh-TW" ? "考勤打卡" : "考勤打卡"}
                </span>
                <span className="font-bold text-sm block mt-1">
                  {employee.requiresAttendance !== false ? (
                    <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200/60">
                      {lang === "en" ? "Required" : lang === "th" ? "ต้องลงเวลา" : lang === "zh-TW" ? "需要打卡" : "需要打卡"}
                    </span>
                  ) : (
                    <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold bg-amber-50 text-amber-700 border border-amber-200/60">
                      {lang === "en" ? "Exempt" : lang === "th" ? "ไม่ต้องลงเวลา" : lang === "zh-TW" ? "免打卡" : "免打卡"}
                    </span>
                  )}
                </span>
              </div>
              <div>
                <span className="text-slate-400 font-medium block">{getTranslation("emp_source_type", lang)}</span>
                <span className="font-bold text-slate-800 text-sm block mt-1">
                  {employee.sourceType === "劳务派遣"
                    ? (employee.dispatchCommissionRate !== undefined && employee.dispatchCommissionRate > 0
                        ? (lang === "en" ? `Dispatch (${employee.dispatchCommissionRate}%)` : `派遣 (佣${employee.dispatchCommissionRate}%)`)
                        : (lang === "en" ? "Dispatch" : "劳务派遣")
                      )
                    : getTranslation("emp_source_direct", lang)
                  }
                </span>
              </div>
            </div>
          </div>

          {/* 2. Salary & Allowances */}
          <div className="space-y-3">
            <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider flex items-center gap-2">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
              {lang === "en" ? "Compensation & Benefits" : lang === "th" ? "ค่าตอบแทนและสวัสดิการ" : "薪资与福利"}
            </h4>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 bg-slate-50/30 p-4 rounded-xl border border-slate-100 text-xs">
              <div>
                <span className="text-slate-400 font-medium block">{getTranslation("emp_wage_type", lang)}</span>
                <span className="font-bold text-brand-600 text-sm block mt-1">
                  {employee.baseMonthlyWage !== undefined && employee.baseMonthlyWage > 0
                    ? `${formatCurrency(employee.baseMonthlyWage, employee.currency)}/月`
                    : employee.dailyWage !== undefined && employee.dailyWage > 0 && employee.hourlyRate !== undefined && employee.hourlyRate > 0
                      ? `${formatCurrency(employee.dailyWage, employee.currency)}/天 (${formatCurrency(employee.hourlyRate, employee.currency)}/时)`
                      : employee.dailyWage !== undefined && employee.dailyWage > 0
                        ? `${formatCurrency(employee.dailyWage, employee.currency)}/天`
                        : employee.hourlyRate !== undefined && employee.hourlyRate > 0
                          ? `${formatCurrency(employee.hourlyRate, employee.currency)}/时`
                          : "-"
                  }
                </span>
              </div>
              <div>
                <span className="text-slate-400 font-medium block">{getTranslation("emp_hourly_rate", lang)}</span>
                <span className="font-bold text-slate-800 text-sm block mt-1 font-mono">
                  {employee.baseMonthlyWage !== undefined && employee.baseMonthlyWage > 0 ? (
                    <span>{formatCurrency((employee.baseMonthlyWage / 30) / 8, employee.currency)}</span>
                  ) : employee.hourlyRate !== undefined && employee.hourlyRate > 0 ? (
                    <span>{formatCurrency(employee.hourlyRate, employee.currency)}</span>
                  ) : employee.dailyWage !== undefined && employee.dailyWage > 0 ? (
                    <span>{formatCurrency(employee.dailyWage / 8, employee.currency)}</span>
                  ) : (
                    "-"
                  )}
                </span>
              </div>
              <div>
                <span className="text-slate-400 font-medium block">{getTranslation("emp_attendance_bonus", lang)}</span>
                <span className="font-bold text-emerald-600 text-sm block mt-1 font-mono">
                  {employee.attendanceBonus !== undefined && employee.attendanceBonus > 0
                    ? formatCurrency(employee.attendanceBonus, employee.currency)
                    : "-"}
                </span>
              </div>
              <div>
                <span className="text-slate-400 font-medium block">{getTranslation("emp_social_security", lang)}</span>
                <span className="font-bold text-rose-600 text-sm block mt-1 font-mono">
                  {employee.socialSecurity !== undefined && employee.socialSecurity > 0
                    ? formatCurrency(employee.socialSecurity, employee.currency)
                    : "-"}
                </span>
              </div>
              <div>
                <span className="text-slate-400 font-medium block">
                  {lang === "en" ? "Meal Allowance (Daily)" : lang === "th" ? "ค่าอาหารรายวัน" : "每日餐费补贴"}
                </span>
                <span className="font-bold text-amber-600 text-sm block mt-1 font-mono">
                  {employee.mealAllowanceDaily !== undefined && employee.mealAllowanceDaily > 0
                    ? formatCurrency(employee.mealAllowanceDaily, employee.currency)
                    : "-"}
                </span>
              </div>
              <div>
                <span className="text-slate-400 font-medium block">
                  {lang === "en" ? "License Fee" : lang === "th" ? "ค่าใบอนุญาต" : "证书/技能补贴"}
                </span>
                <span className="font-bold text-sky-600 text-sm block mt-1 font-mono">
                  {employee.licenseFee !== undefined && employee.licenseFee > 0
                    ? formatCurrency(employee.licenseFee, employee.currency)
                    : "-"}
                </span>
              </div>
              <div>
                <span className="text-slate-400 font-medium block">
                  {lang === "en" ? "Tax Rate" : lang === "th" ? "อัตราภาษี" : "个人所得税比例"}
                </span>
                <span className="font-bold text-indigo-600 text-sm block mt-1 font-mono">
                  {employee.taxRate !== undefined && employee.taxRate !== null
                    ? `${employee.taxRate}%`
                    : "5%"}
                </span>
              </div>
            </div>
          </div>

          {/* 2.5 薪酬与规则调整履历 */}
          <div className="space-y-3">
            <div
              onClick={() => setIsSalaryLogsExpanded(!isSalaryLogsExpanded)}
              className="flex items-center justify-between p-3 bg-amber-50/50 hover:bg-amber-50 rounded-xl border border-amber-200/60 cursor-pointer transition-colors"
            >
              <div className="flex items-center gap-2">
                <History className="w-4 h-4 text-amber-600" />
                <span className="text-xs font-bold text-slate-800">
                  {getTranslation("emp_salary_history_title", lang)}
                </span>
                {salaryLogs.length > 0 && (
                  <span className="text-[10px] font-bold px-1.5 py-0.2 bg-amber-200/70 text-amber-900 rounded-full">
                    {salaryLogs.length}
                  </span>
                )}
              </div>
              <div className="flex items-center gap-1.5 text-xs text-slate-400 font-medium">
                <span>{isSalaryLogsExpanded ? (lang === "en" ? "Collapse" : "收起") : (lang === "en" ? "Expand" : "展开查看")}</span>
                {isSalaryLogsExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
              </div>
            </div>

            {isSalaryLogsExpanded && (
              <div className="bg-slate-50/50 border border-slate-200/60 rounded-xl p-3.5 space-y-3 text-xs animate-fade-in">
                {isLoadingSalaryLogs ? (
                  <div className="flex items-center justify-center py-6 text-slate-400 gap-2">
                    <Loader2 className="w-4 h-4 animate-spin text-amber-500" />
                    <span>加载调整记录中...</span>
                  </div>
                ) : salaryLogs.length === 0 ? (
                  <div className="text-center py-6 text-slate-400">
                    {getTranslation("emp_salary_history_empty", lang)}
                  </div>
                ) : (
                  <div className="space-y-3">
                    {salaryLogs.map((log) => (
                      <div key={log.id} className="bg-white p-3 rounded-lg border border-slate-200/70 shadow-2xs space-y-2">
                        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-100 pb-2">
                          <div className="flex items-center gap-2">
                            <span className="font-bold text-slate-800 font-mono text-[11px] bg-slate-100 px-2 py-0.5 rounded">
                              {log.effective_date} 生效
                            </span>
                            {log.change_reason && (
                              <span className="text-[11px] font-semibold text-amber-800 bg-amber-100/80 px-2 py-0.5 rounded-full border border-amber-200">
                                {log.change_reason}
                              </span>
                            )}
                          </div>
                          <span className="text-[10px] text-slate-400">
                            操作人: <strong className="text-slate-600 font-medium">{log.operator_name || "管理员"}</strong> · {formatDate(log.created_at)}
                          </span>
                        </div>

                        {/* 变动项对比徽章 */}
                        <div className="space-y-1.5 pt-1">
                          {Array.isArray(log.changed_fields) && log.changed_fields.length > 0 ? (
                            log.changed_fields.map((diff, i) => (
                              <div key={i} className="flex items-center gap-2 text-[11px] flex-wrap">
                                <span className="text-slate-500 font-medium min-w-20">{diff.label || diff.field}:</span>
                                <span className="line-through text-slate-400 bg-slate-50 px-1.5 py-0.5 rounded border border-slate-200">
                                  {diff.from === null || diff.from === undefined ? "未设置" : String(diff.from)}
                                </span>
                                <span className="text-slate-400">➔</span>
                                <span className="font-bold text-emerald-700 bg-emerald-50 px-1.5 py-0.5 rounded border border-emerald-200">
                                  {diff.to === null || diff.to === undefined ? "清空/跟随默认" : String(diff.to)}
                                </span>
                              </div>
                            ))
                          ) : (
                            <span className="text-slate-400 text-[11px]">常规信息保存快照</span>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>

          {/* 3. Bank & Document Details */}
          <div className="space-y-3">
            <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider flex items-center gap-2">
              <span className="w-1.5 h-1.5 rounded-full bg-violet-500"></span>
              {lang === "en" ? "Bank & Identification" : lang === "th" ? "ธนาคารและเอกสารประจำตัว" : "银行与证件信息"}
            </h4>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 bg-slate-50/30 p-4 rounded-xl border border-slate-100 text-xs">
              <div>
                <span className="text-slate-400 font-medium block">{getTranslation("emp_bank_name", lang)}</span>
                <span className="font-bold text-slate-800 text-sm block mt-1">
                  {employee.bankName || <span className="text-slate-400 font-normal">{getTranslation("emp_unbound", lang)}</span>}
                </span>
              </div>
              <div>
                <span className="text-slate-400 font-medium block">{getTranslation("emp_bank_card", lang)}</span>
                <span className="font-bold text-slate-800 text-sm block mt-1 font-mono">
                  {employee.bankCardNumber ? (
                    employee.bankCardNumber.replace(/(\d{4})(?=\d)/g, "$1 ")
                  ) : (
                    <span className="text-slate-400 font-normal">{getTranslation("emp_unbound_card", lang)}</span>
                  )}
                </span>
              </div>
              <div>
                <span className="text-slate-400 font-medium block">
                  {lang === "en" ? "IC Card / ID Card" : lang === "th" ? "หมายเลขบัตรประชาชน / IC Card" : "身份证号 / IC Card"}
                </span>
                <span className="font-bold text-slate-800 text-sm block mt-1 font-mono">
                  {employee.idCard || <span className="text-slate-400 font-normal">-</span>}
                </span>
              </div>
            </div>
          </div>

          {/* 4. Account Detail */}
          {hasPermission("employees_reset_pwd") && (
            <div className="space-y-3">
              <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider flex items-center gap-2">
                <span className="w-1.5 h-1.5 rounded-full bg-indigo-500"></span>
                {lang === "en" ? "App Access Account" : lang === "th" ? "บัญชีเข้าใช้งานแอป" : "APP 登录账号"}
              </h4>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 bg-slate-50/30 p-4 rounded-xl border border-slate-100 text-xs">
                <div className="flex items-center justify-between gap-3 bg-white p-3 rounded-lg border border-slate-100">
                  <div>
                    <span className="text-slate-400 font-medium block">APP 登录账号</span>
                    <span className="font-mono text-sm font-black text-brand-700 block mt-0.5">
                      {employee.username || `emp${employee.id}`}
                    </span>
                  </div>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    onClick={() => copyToClipboard(employee.username || `emp${employee.id}`, "username")}
                    className="h-7 w-7 hover:bg-slate-100 text-slate-500 rounded-lg transition cursor-pointer border border-slate-200 p-0"
                    title="复制账号"
                  >
                    {copiedField === "username" ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                  </Button>
                </div>

                <div className="flex items-center rounded-lg border border-slate-100 bg-white p-3 text-xs font-medium text-slate-500">
                  密码不可查看；请从账号管理入口执行安全重置。
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <DialogFooter className="bg-slate-50 px-6 py-4.5 border-t border-slate-100 flex flex-row justify-between items-center sm:justify-between">
          {hasPermission("employees_edit") ? (
            <Button
              variant="outline"
              onClick={() => {
                const emp = employee;
                onClose();
                onEditEmployee?.(emp);
              }}
              className="bg-blue-50 hover:bg-blue-100 text-blue-700 rounded-xl text-xs font-bold border-blue-200 flex items-center gap-1.5"
            >
              <Edit className="w-3.5 h-3.5" />
              <span>编辑此员工</span>
            </Button>
          ) : (
            <div />
          )}
          <Button
            variant="outline"
            onClick={onClose}
            className="rounded-xl px-6 text-xs font-bold text-slate-700"
          >
            {lang === "en" ? "Close" : lang === "th" ? "ปิด" : "关闭"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
