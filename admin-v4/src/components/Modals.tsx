/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { X, Upload, Trash2, Shield, Key, Lock, Info, UserMinus, Loader2, AlertCircle, History, Sparkles, ArrowRight, Calendar, FileText, CheckCircle2 } from "lucide-react";
import { AppConfig, Employee, AttendanceRecord, CurrencyCode, CountryCode, Gender, EmployeeStatus } from "../types";
import { cn, formatDate, getNowDateStr, getCurrencyForCountry, normalizeSalaryValue } from "../lib/utils";
import React, { useState, useEffect, useRef } from "react";
import { getTranslation, Language } from "../lib/i18n";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "./ui/dialog";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { Label } from "./ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "./ui/select";
import { DatePicker } from "./ui/date-picker";
import { TimePicker } from "./ui/time-picker";


interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  children: React.ReactNode;
  title: string;
  className?: string;
  footer?: React.ReactNode;
  headerClassName?: string;
  titleClassName?: string;
  closeButtonClassName?: string;
}

function Modal({ 
  isOpen, 
  onClose, 
  children, 
  title, 
  className, 
  footer,
  headerClassName,
  titleClassName,
}: ModalProps) {
  return (
    <Dialog open={isOpen} onOpenChange={(open) => { if (!open) onClose(); }}>
      <DialogContent className={cn("max-w-2xl max-h-[90vh] p-0 flex flex-col gap-0 overflow-hidden sm:rounded-2xl", className)}>
        <DialogHeader className={cn("bg-slate-50 px-6 py-4 border-b border-slate-100 flex flex-row items-center justify-between space-y-0", headerClassName)}>
          <DialogTitle className={cn("text-lg font-bold text-slate-800 pr-8", titleClassName)}>{title}</DialogTitle>
        </DialogHeader>
        <div className="overflow-y-auto p-6 flex-1">
          {children}
        </div>
        {footer && (
          <DialogFooter className="px-6 py-3.5 border-t border-slate-100 bg-slate-50 flex flex-row justify-end gap-3 flex-shrink-0">
            {footer}
          </DialogFooter>
        )}
      </DialogContent>
    </Dialog>
  );
}

// --- Employee Modals (Delegated to components/employee) ---
export { EmployeeModal } from "./employee/components/EmployeeModal";
export { SalaryChangeConfirmModal, type SalaryDiffItem } from "./employee/components/SalaryChangeConfirmModal";
export type { EmployeeModalProps } from "./employee/types";

export function DeleteModal({ 
  isOpen, 
  onClose, 
  onConfirm, 
  employeeName, 
  isResigned = false, 
  lang = "zh-CN" 
}: { 
  isOpen: boolean; 
  onClose: () => void; 
  onConfirm: () => Promise<void> | void; 
  employeeName: string; 
  isResigned?: boolean; 
  lang?: Language; 
}) {
  const [isDeleting, setIsDeleting] = useState(false);

  useEffect(() => {
    if (isOpen) setIsDeleting(false);
  }, [isOpen]);

  const handleConfirm = async () => {
    if (isDeleting) return;
    try {
      setIsDeleting(true);
      await onConfirm();
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => { if (!open && !isDeleting) onClose(); }}>
      <DialogContent className="max-w-md p-6 text-center sm:rounded-2xl">
        <DialogHeader className="flex flex-col items-center">
          <div className={cn(
            "w-14 h-14 rounded-full flex items-center justify-center mx-auto mb-3",
            isResigned ? "bg-rose-100 text-rose-600" : "bg-amber-100 text-amber-600"
          )}>
            {isResigned ? <Trash2 className="w-7 h-7" /> : <UserMinus className="w-7 h-7" />}
          </div>
          <DialogTitle className="text-base font-bold text-slate-800 text-center">
            {isResigned ? `确认删除员工【${employeeName}】？` : `确认将员工【${employeeName}】办理离职？`}
          </DialogTitle>
        </DialogHeader>
        <DialogFooter className="flex flex-row gap-3 justify-center sm:justify-center pt-2">
          <Button 
            type="button" 
            variant="outline"
            onClick={onClose} 
            disabled={isDeleting}
            className="rounded-xl px-5 h-9 text-xs"
          >
            {lang === 'en' ? "Cancel" : lang === 'th' ? "ยกเลิก" : lang === 'zh-TW' ? "取消" : "取消"}
          </Button>
          <Button 
            type="button" 
            onClick={handleConfirm} 
            disabled={isDeleting}
            className={cn(
              "rounded-xl px-5 h-9 text-xs font-bold text-white shadow-md flex items-center justify-center gap-2",
              isResigned 
                ? "bg-rose-600 hover:bg-rose-700" 
                : "bg-amber-600 hover:bg-amber-700"
            )}
          >
            {isDeleting && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
            {isDeleting 
              ? (lang === 'en' ? "Processing..." : lang === 'th' ? "กำลังดำเนินการ..." : "处理中...") 
              : (isResigned ? "确认删除" : "确认离职")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// --- Settings Modal ---
export function SettingsModal({ isOpen, onClose, onSave, onReset, config, lang = "zh-CN" }: { isOpen: boolean, onClose: () => void, onSave: (cfg: AppConfig) => Promise<void> | void, onReset: () => Promise<void> | void, config: AppConfig, lang?: Language }) {
  const [formData, setFormData] = useState<AppConfig>(config);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    setFormData(config);
  }, [config, isOpen]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isSubmitting) return;
    setIsSubmitting(true);
    try {
      await onSave(formData);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ 
      ...prev, 
      [name]: (name === 'otHourlyFee' || name === 'standardHours' || name === 'overtimeMultiplier' || name === 'taxRate' || name === 'dailyBreakMinutes' || name === 'companyLat' || name === 'companyLng') ? parseFloat(value) : value 
    }));
  };

  const handleSelectQuickLocation = (name: string, lat: number, lng: number) => {
    setFormData(prev => ({
      ...prev,
      companyAddress: name,
      companyLat: lat,
      companyLng: lng
    }));
  };

  return (
    <Modal 
      isOpen={isOpen} 
      onClose={onClose} 
      title={lang === 'en' ? "Attendance Settings" : lang === 'th' ? "ตั้งค่าการลงเวลา" : lang === 'zh-TW' ? "考勤設置" : "考勤设置"} 
      className="max-w-lg"
      headerClassName="bg-gradient-to-r from-brand-600 to-brand-700 text-white px-6 py-4.5 border-b border-brand-700/50"
      titleClassName="font-bold text-base tracking-tight text-white"
      closeButtonClassName="text-white/80 hover:text-white hover:bg-white/10 p-1.5 rounded-lg transition cursor-pointer"
    >
      <form onSubmit={handleSubmit} className="space-y-5">
        <div className="grid grid-cols-2 gap-4">
          <div className="bg-blue-50/70 p-3.5 rounded-xl border border-blue-100">
            <Label className="block text-xs font-semibold text-blue-800 mb-2 uppercase">
              {lang === 'en' ? "Shift Start" : lang === 'th' ? "เวลาเริ่มงาน" : lang === 'zh-TW' ? "上班時間" : "上班时间"}
            </Label>
            <TimePicker name="startShift" value={formData.startShift} onChange={handleChange} required className="bg-white border-blue-200 text-slate-700 font-mono text-center" />
          </div>
          <div className="bg-blue-50/70 p-3.5 rounded-xl border border-blue-100">
            <Label className="block text-xs font-semibold text-blue-800 mb-2 uppercase">
              {lang === 'en' ? "Shift End" : lang === 'th' ? "เวลาเลิกงาน" : lang === 'zh-TW' ? "下班時間" : "下班时间"}
            </Label>
            <TimePicker name="endShift" value={formData.endShift} onChange={handleChange} required className="bg-white border-blue-200 text-slate-700 font-mono text-center" />
          </div>
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div className="bg-amber-50/70 p-3.5 rounded-xl border border-amber-100">
            <Label className="block text-xs font-semibold text-amber-800 mb-2 uppercase">
              {lang === 'en' ? "Break Start" : lang === 'th' ? "เริ่มพักกลางวัน" : lang === 'zh-TW' ? "午休開始" : "午休开始"}
            </Label>
            <TimePicker name="breakStart" value={formData.breakStart} onChange={handleChange} required className="bg-white border-amber-200 text-slate-700 font-mono text-center" />
          </div>
          <div className="bg-amber-50/70 p-3.5 rounded-xl border border-amber-100">
            <Label className="block text-xs font-semibold text-amber-800 mb-2 uppercase">
              {lang === 'en' ? "Break End" : lang === 'th' ? "สิ้นสุดพักกลางวัน" : lang === 'zh-TW' ? "午休結束" : "午休结束"}
            </Label>
            <TimePicker name="breakEnd" value={formData.breakEnd} onChange={handleChange} required className="bg-white border-amber-200 text-slate-700 font-mono text-center" />
          </div>
        </div>
        <div className="bg-green-50 p-3 rounded-lg border border-green-100 hidden">
          <label className="block text-xs font-semibold text-green-800 mb-2 uppercase">加班费标准 (泰铢/小时)</label>
          <div className="flex items-center gap-2">
            <span className="text-lg font-bold text-green-700">฿</span>
            <input type="number" name="otHourlyFee" step="0.01" min="0" value={formData.otHourlyFee} onChange={handleChange} className="w-full px-3 py-2 bg-white border border-green-200 rounded-md text-slate-700 focus:ring-2 focus:ring-green-500 outline-none font-mono text-lg" />
            <span className="text-sm text-slate-500 whitespace-nowrap">/ 小时</span>
          </div>
        </div>

        {/* 公司地理位置设置 */}
        <div className="border-t border-slate-100 pt-4 space-y-3">
          <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wide flex items-center gap-1.5">
            <span className="w-1.5 h-3.5 bg-brand-500 rounded-full"></span>
            {lang === 'en' ? "📍 Company Worksite" : lang === 'th' ? "📍 ที่ตั้งสำนักงาน" : lang === 'zh-TW' ? "📍 公司辦公點" : "📍 公司办公点"}
          </h4>
          
          <div>
            <label className="block text-xs font-medium text-slate-500 mb-1">
              {lang === 'en' ? "Company Address" : lang === 'th' ? "ที่อยู่บริษัท" : lang === 'zh-TW' ? "公司地址" : "公司地址"}
            </label>
            <input 
              type="text" 
              name="companyAddress" 
              value={formData.companyAddress || ""} 
              onChange={(e) => setFormData(prev => ({ ...prev, companyAddress: e.target.value }))}
              required 
              className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-brand-500 outline-none" 
              placeholder={lang === 'en' ? "e.g. Yangon Logistics Hub" : lang === 'th' ? "เช่น ศูนย์กระจายสินค้ากรุงเทพฯ" : lang === 'zh-TW' ? "例如：仰光物流中心" : "例如：仰光物流中心"} 
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-slate-500 mb-1">
                {lang === 'en' ? "Longitude" : lang === 'th' ? "ลองจิจูด" : lang === 'zh-TW' ? "公司經度" : "公司经度"} (Longitude)
              </label>
              <input 
                type="number" 
                step="0.000001" 
                name="companyLng" 
                value={formData.companyLng !== undefined ? formData.companyLng : ""} 
                onChange={handleChange}
                required 
                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-brand-500 outline-none font-mono" 
                placeholder="例如：100.717390" 
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-500 mb-1">
                {lang === 'en' ? "Latitude" : lang === 'th' ? "ละติจูด" : lang === 'zh-TW' ? "公司緯度" : "公司纬度"} (Latitude)
              </label>
              <input 
                type="number" 
                step="0.000001" 
                name="companyLat" 
                value={formData.companyLat !== undefined ? formData.companyLat : ""} 
                onChange={handleChange}
                required 
                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-brand-500 outline-none font-mono" 
                placeholder="例如：13.578230" 
              />
            </div>
          </div>

          <div className="hidden">
            <label className="block text-[11px] text-slate-400 mb-1.5">快捷定位参考：</label>
            <div className="flex flex-wrap gap-1.5">
              <button
                type="button"
                onClick={() => handleSelectQuickLocation("仰光物流中心", 16.8661, 96.1951)}
                className="px-2.5 py-1 text-xs border border-slate-200 rounded-md hover:bg-slate-50 text-slate-600 transition cursor-pointer"
              >
                🇲🇲 仰光仓 (16.8661, 96.1951)
              </button>
              <button
                type="button"
                onClick={() => handleSelectQuickLocation("曼谷智能仓", 13.7563, 100.5018)}
                className="px-2.5 py-1 text-xs border border-slate-200 rounded-md hover:bg-slate-50 text-slate-600 transition cursor-pointer"
              >
                🇹🇭 曼谷仓 (13.7563, 100.5018)
              </button>
              <button
                type="button"
                onClick={() => handleSelectQuickLocation("广州运营总部", 23.1291, 113.2644)}
                className="px-2.5 py-1 text-xs border border-slate-200 rounded-md hover:bg-slate-50 text-slate-600 transition cursor-pointer"
              >
                🇨🇳 广州总部 (23.1291, 113.2644)
              </button>
            </div>
            <p className="mt-1.5 text-[10px] text-slate-400">
              提示：员工打卡时，系统将计算其设备位置与此地点的距离，若超出 <b>800米</b> 将自动标记为“异地打卡（偏离超过800米）”。
            </p>
          </div>
        </div>

        <div className="flex justify-end gap-3 pt-2 border-t border-slate-100">
          <button type="button" onClick={onReset} className="hidden px-4 py-2 text-sm font-medium text-slate-500 hover:bg-slate-100 rounded-lg transition">恢复默认</button>
          <button type="submit" disabled={isSubmitting} className="px-6 py-2.5 bg-brand-600 hover:bg-brand-700 text-white rounded-xl text-xs font-black transition cursor-pointer shadow-xs disabled:opacity-50">
            {isSubmitting ? (lang === 'en' ? "Saving..." : "保存中...") : (lang === 'en' ? "Save Settings" : lang === 'th' ? "บันทึกการตั้งค่า" : lang === 'zh-TW' ? "保存設置" : "保存设置")}
          </button>
        </div>
      </form>
    </Modal>
  );
}

// --- Attendance Adjustment Modal ---
export function AttendanceAdjustmentModal({ 
  isOpen, 
  onClose, 
  onSave, 
  record, 
  employees, 
  existingRecords = [],
  lang = "zh-CN",
  defaultStartShift = "08:30",
  defaultEndShift = "17:30"
}: { 
  isOpen: boolean, 
  onClose: () => void, 
  onSave: (rec: Partial<AttendanceRecord>, isAdjustment?: boolean) => Promise<void> | void, 
  record: AttendanceRecord | null,
  employees: Employee[],
  existingRecords?: AttendanceRecord[],
  lang?: Language,
  defaultStartShift?: string,
  defaultEndShift?: string
}) {
  const [formData, setFormData] = useState<Partial<AttendanceRecord>>({
    date: '', type: 'normal', inTime: defaultStartShift, outTime: defaultEndShift, note: ''
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [autoFilledForDate, setAutoFilledForDate] = useState<string | null>(null);

  useEffect(() => {
    if (record) {
      setFormData(record);
      setAutoFilledForDate(null);
    }
  }, [record, isOpen]);

  const isManual = record?.id === 'new-manual';
  const emp = employees.find(e => e.id === Number(formData.empId || record?.empId));

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData(prev => {
      const next = { ...prev, [name]: value };
      if (name === "type") {
        if (value === "absent" || value === "leave") {
          next.inTime = "";
          next.outTime = "";
        } else if (!prev.inTime && !prev.outTime) {
          next.inTime = defaultStartShift;
          next.outTime = defaultEndShift;
        }
      }
      return next;
    });
  };

  // Anti-collision check: only in manual add mode when selecting an employee and date that already has a record
  const matchedExisting = React.useMemo(() => {
    if (!isManual || !formData.empId || !formData.date) return null;
    return (existingRecords || []).find(r => 
      Number(r.empId) === Number(formData.empId) && 
      r.date === formData.date && 
      String(r.id) !== String(record?.id)
    );
  }, [isManual, existingRecords, formData.empId, formData.date, record?.id]);

  // When conflict detected in manual add mode, auto-fill existing record data
  useEffect(() => {
    if (isManual && matchedExisting) {
      const conflictKey = String(matchedExisting.empId) + "_" + matchedExisting.date;
      if (autoFilledForDate !== conflictKey) {
        setFormData(prev => ({
          ...prev,
          inTime: matchedExisting.inTime || prev.inTime,
          outTime: matchedExisting.outTime || prev.outTime,
          type: matchedExisting.type || prev.type,
          note: prev.note || (matchedExisting.note ? "[调整] 原备注: " + matchedExisting.note : "")
        }));
        setAutoFilledForDate(conflictKey);
      }
    }
  }, [isManual, matchedExisting, autoFilledForDate]);

  // 仅在职员工可新增考勤
  const activeEmployees = React.useMemo(() => {
    const list = employees.filter(e => e.status === '在职' || (e.status as any) === 'active' || e.status === '试用' || (e.status as any) === 'probation');
    if (list.length > 0) return list;
    return employees.filter(e => e.status !== '离职' && (e.status as any) !== 'resigned');
  }, [employees]);

  useEffect(() => {
    if (isManual && activeEmployees.length > 0 && (!formData.empId || !activeEmployees.some(e => e.id === Number(formData.empId)))) {
      setFormData(prev => ({ ...prev, empId: activeEmployees[0].id }));
    }
  }, [isManual, activeEmployees, formData.empId]);

  // Lifecycle boundary validations
  const todayStr = React.useMemo(() => new Date().toISOString().slice(0, 10), []);
  const isFutureDate = Boolean(formData.date && formData.date > todayStr && formData.type !== 'leave');
  const normalizedFormDate = React.useMemo(() => formatDate(formData.date, ""), [formData.date]);
  const normalizedEmpJoinDate = React.useMemo(() => emp?.joinDate ? formatDate(emp.joinDate, "") : "", [emp?.joinDate]);
  const isBeforeJoinDate = Boolean(normalizedEmpJoinDate && normalizedFormDate && normalizedFormDate < normalizedEmpJoinDate);
  const isResignedEmp = emp?.status === '离职' || (emp?.status as any) === 'resigned';

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isFutureDate) {
      alert("无法为未来日期录入出勤打卡事实（仅请假类型允许预先录入）");
      return;
    }
    if (isBeforeJoinDate) {
      alert("考勤日期（" + formData.date + "）早于员工入职日期（" + (emp?.joinDate || "") + "）");
      return;
    }
    if (isResignedEmp && isManual) {
      alert("该员工已离职，无法新增考勤记录");
      return;
    }

    try {
      setIsSubmitting(true);
      const isAdjustment = Boolean(!isManual || matchedExisting);
      await onSave(formData, isAdjustment);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Modal 
      isOpen={isOpen} 
      onClose={onClose} 
      title={isManual
        ? (matchedExisting
            ? "检测到已有记录 · 考勤调整"
            : (lang === 'en' ? "Add Attendance" : lang === 'th' ? "เพิ่มบันทึกเวลา" : lang === 'zh-TW' ? "手動新增考勤" : "手动新增考勤"))
        : (lang === 'en' ? "Adjust Attendance" : lang === 'th' ? "ปรับปรุงประวัติการเข้างาน" : lang === 'zh-TW' ? "調整考勤記錄" : "调整考勤记录")
      } 
      className="max-w-lg"
    >
      <form onSubmit={handleSubmit} className="space-y-5">
        {isManual && matchedExisting && (
          <div className="bg-amber-50 border border-amber-200 text-amber-800 rounded-xl p-3 text-xs flex items-start gap-2.5 shadow-2xs">
            <AlertCircle className="w-4 h-4 text-amber-600 flex-shrink-0 mt-0.5" />
            <div>
              <div className="font-bold text-amber-900">
                该员工在 {formData.date} 已有考勤记录
              </div>
              <div className="mt-1 text-amber-700 leading-relaxed">
                原打卡：{matchedExisting.inTime || "未打卡"} ~ {matchedExisting.outTime || "未打卡"}（类型：{matchedExisting.type}）。已为您自动切换至【考勤调整】模式并载入数据，保存时将记录变更。
              </div>
            </div>
          </div>
        )}

        {isBeforeJoinDate && (
          <div className="bg-rose-50 border border-rose-200 text-rose-800 rounded-xl p-2.5 text-xs flex items-center gap-2">
            <AlertCircle className="w-4 h-4 text-rose-600 flex-shrink-0" />
            <span>所选日期（{formData.date}）早于员工入职日期（{emp?.joinDate}），无法录入。</span>
          </div>
        )}

        {isFutureDate && (
          <div className="bg-rose-50 border border-rose-200 text-rose-800 rounded-xl p-2.5 text-xs flex items-center gap-2">
            <AlertCircle className="w-4 h-4 text-rose-600 flex-shrink-0" />
            <span>客观出勤打卡不能晚于今天（{todayStr}）。</span>
          </div>
        )}

        {isResignedEmp && isManual && (
          <div className="bg-rose-50 border border-rose-200 text-rose-800 rounded-xl p-2.5 text-xs flex items-center gap-2">
            <AlertCircle className="w-4 h-4 text-rose-600 flex-shrink-0" />
            <span>该员工已离职，无法新增考勤。</span>
          </div>
        )}

        {emp && !isManual ? (
          <div className="bg-slate-50 border border-slate-100 rounded-xl p-3 flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-slate-200 flex items-center justify-center text-slate-600 font-bold overflow-hidden border border-slate-200 shadow-sm flex-shrink-0">
              {emp.photo ? (
                <img src={emp.photo} className="w-full h-full object-cover" alt={emp.name} />
              ) : (
                <span className="text-sm">{emp.name.charAt(0)}</span>
              )}
            </div>
            <div>
              <div className="text-[11px] text-slate-400 font-medium">
                {lang === 'en' ? "Target Employee" : lang === 'th' ? "พนักงานเป้าหมาย" : lang === 'zh-TW' ? "考勤當事人" : "考勤当事人"}
              </div>
              <div className="text-sm font-bold text-slate-800">
                {emp.name}
                <span className="text-xs font-normal text-slate-500 ml-2">({emp.dept} · {emp.role})</span>
              </div>
            </div>
          </div>
        ) : (
          <div className="space-y-1">
            <div className="flex items-center justify-between">
              <label className="block text-xs font-semibold text-slate-500 uppercase">
                {lang === 'en' ? "Select Employee" : lang === 'th' ? "เลือกพนักงาน" : lang === 'zh-TW' ? "選擇員工" : "选择员工"} <span className="text-red-500">*</span>
              </label>
              <span className="text-[10px] text-slate-400">仅限在职员工 ({activeEmployees.length}人)</span>
            </div>
            <select
              name="empId"
              value={formData.empId || ''}
              onChange={(e) => setFormData(prev => ({ ...prev, empId: Number(e.target.value) }))}
              required
              className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm bg-white focus:ring-2 focus:ring-brand-500 outline-none text-slate-800 font-medium"
            >
              <option value="">{activeEmployees.length > 0 ? (lang === 'en' ? "-- Select Active Employee --" : lang === 'th' ? "-- เลือกพนักงาน --" : lang === 'zh-TW' ? "-- 請選擇在職員工 --" : "-- 请选择在职员工 --") : (lang === 'en' ? "-- No Active Employees --" : "-- 无在职员工 --")}</option>
              {activeEmployees.map((e) => (
                <option key={e.id} value={e.id}>
                  {e.name} ({e.dept || '无区域'} · {e.role || '无职位'})
                </option>
              ))}
            </select>
          </div>
        )}
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-medium text-slate-500 mb-1 uppercase">
              {lang === 'en' ? "Date" : lang === 'th' ? "วันที่" : lang === 'zh-TW' ? "日期" : "日期"}
            </label>
            <DatePicker name="date" value={formData.date} onChange={handleChange} required className="bg-white" />
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-500 mb-1 uppercase">
              {lang === 'en' ? "Attendance Type" : lang === 'th' ? "ประเภทการเข้างาน" : lang === 'zh-TW' ? "考勤類型" : "考勤类型"}
            </label>
            <select name="type" value={formData.type} onChange={handleChange} className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-brand-500 outline-none text-sm bg-white">
              <option value="normal">{lang === 'en' ? "Normal" : lang === 'th' ? "ปกติ" : lang === 'zh-TW' ? "正常" : "正常"}</option>
              <option value="late">{lang === 'en' ? "Late" : lang === 'th' ? "สาย" : lang === 'zh-TW' ? "遲到" : "迟到"}</option>
              <option value="early">{lang === 'en' ? "Early Leave" : lang === 'th' ? "กลับก่อนเวลา" : lang === 'zh-TW' ? "早退" : "早退"}</option>
              <option value="absent">{lang === 'en' ? "Absent" : lang === 'th' ? "ขาดงาน" : lang === 'zh-TW' ? "缺勤" : "缺勤"}</option>
              <option value="leave">{lang === 'en' ? "On Leave" : lang === 'th' ? "ลาหยุด" : lang === 'zh-TW' ? "假期" : "假期"}</option>
              <option value="sick_leave">{lang === 'en' ? "Sick Leave" : lang === 'th' ? "ลาป่วย" : lang === 'zh-TW' ? "病假" : "病假"}</option>
              <option value="overtime">{lang === 'en' ? "Overtime" : lang === 'th' ? "ล่วงเวลา" : lang === 'zh-TW' ? "加班" : "加班"}</option>
              <option value="manual_adjusted">{lang === 'en' ? "Manual Adjusted" : lang === 'th' ? "ปรับปรุงด้วยตนเอง" : lang === 'zh-TW' ? "人工調整" : "人工调整"}</option>
            </select>
          </div>
        </div>
        {(() => {
          const isTimeRequired = formData.type !== "absent" && formData.type !== "leave" && formData.type !== "sick_leave";
          return (
            <div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium text-slate-500 mb-1 uppercase">
                    {lang === 'en' ? "Punch In" : lang === 'th' ? "เวลาเข้างาน" : lang === 'zh-TW' ? "上班時間" : "上班时间"}
                    {isTimeRequired && <span className="text-red-500 ml-0.5">*</span>}
                  </label>
                  <TimePicker 
                    name="inTime" 
                    value={formData.inTime || ""} 
                    onChange={handleChange} 
                    required={isTimeRequired} 
                    disabled={!isTimeRequired} 
                    className={cn("bg-white font-mono text-center", !isTimeRequired && "bg-slate-100 text-slate-400 cursor-not-allowed border-slate-200")} 
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-500 mb-1 uppercase">
                    {lang === 'en' ? "Punch Out" : lang === 'th' ? "เวลาเลิกงาน" : lang === 'zh-TW' ? "下班時間" : "下班时间"}
                    {isTimeRequired && <span className="text-red-500 ml-0.5">*</span>}
                  </label>
                  <TimePicker 
                    name="outTime" 
                    value={formData.outTime || ""} 
                    onChange={handleChange} 
                    required={isTimeRequired} 
                    disabled={!isTimeRequired} 
                    className={cn("bg-white font-mono text-center", !isTimeRequired && "bg-slate-100 text-slate-400 cursor-not-allowed border-slate-200")} 
                  />
                </div>
              </div>
              {!isTimeRequired && (
                <div className="text-[11px] text-slate-400 mt-1">缺勤、假期与病假类型无需记录打卡时间</div>
              )}
            </div>
          );
        })()}
        <div>
          <label className="block text-xs font-medium text-slate-500 mb-1 uppercase">
            {lang === 'en' ? "Adjustment Note" : lang === 'th' ? "หมายเหตุการปรับปรุง" : lang === 'zh-TW' ? "調整備註" : "调整备注"}
          </label>
          <textarea name="note" rows={2} value={formData.note} onChange={handleChange} className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-brand-500 outline-none text-sm resize-none" placeholder={lang === 'en' ? "e.g. Device failure or missed punch..." : lang === 'th' ? "เช่น อุปกรณ์ขัดข้องหรือลืมลงเวลา..." : lang === 'zh-TW' ? "如：設備故障或忘記打卡..." : "如：设备故障或忘记打卡..."}></textarea>
        </div>
        <div className="flex justify-end gap-3 pt-2 border-t border-slate-100">
          <button type="button" onClick={onClose} className="px-4 py-2 text-sm font-medium text-slate-500 hover:bg-slate-100 rounded-lg transition">
            {lang === 'en' ? "Cancel" : lang === 'th' ? "ยกเลิก" : lang === 'zh-TW' ? "取消" : "取消"}
          </button>
          <button 
            type="submit" 
            disabled={isSubmitting || isFutureDate || isBeforeJoinDate || (isResignedEmp && isManual)}
            className={cn(
              "px-6 py-2 text-sm font-medium text-white bg-brand-600 hover:bg-brand-700 rounded-lg shadow-md transition flex items-center gap-2 cursor-pointer",
              (isSubmitting || isFutureDate || isBeforeJoinDate || (isResignedEmp && isManual)) && "opacity-50 cursor-not-allowed"
            )}
          >
            {isSubmitting && <Loader2 className="w-4 h-4 animate-spin" />}
            {isManual && matchedExisting
              ? "保存调整"
              : isManual 
                ? (lang === 'en' ? "Add Attendance" : lang === 'th' ? "เพิ่มบันทึก" : lang === 'zh-TW' ? "確認並新增" : "确认并新增")
                : (lang === 'en' ? "Save Adjustments" : lang === 'th' ? "บันทึกการปรับปรุง" : lang === 'zh-TW' ? "保存調整" : "保存调整")
            }
          </button>
        </div>
      </form>
    </Modal>
  );
}
