/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { Upload, Trash2, UserX, UserRoundMinus } from "lucide-react";
import {
  AppConfig,
  AttendanceRecord,
  AttendanceRule,
  AttendanceRuleFormData,
  AttendanceRuleRelatedEmployee,
  Employee,
  EmployeeStatus,
  EmployeeUpsertPayload,
  SalaryType
} from "../types";
import { calculateShiftStandardHours, cn, EMPLOYEE_STATUS_META, SALARY_TYPE_LABELS, formatCompensation } from "../lib/utils";
import { type ChangeEvent, type FormEvent, type ReactNode, useEffect, useMemo, useState } from "react";
import { ROLE_OPTIONS } from "../constants";
import { ModalShell } from "./ModalShell";

interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  children: ReactNode;
  title: string;
  className?: string;
  bodyClassName?: string;
  footer?: ReactNode;
}

function Modal({ isOpen, onClose, children, title, className, bodyClassName, footer }: ModalProps) {
  return (
    <ModalShell
      isOpen={isOpen}
      onClose={onClose}
      title={title}
      className={cn("fade-in", className)}
      bodyClassName={bodyClassName}
      footer={footer}
    >
      {children}
    </ModalShell>
  );
}

interface EmployeeFormState {
  name: string;
  nickname: string;
  gender: Employee["gender"];
  country: Employee["country"];
  role: string;
  dept: string;
  hourlyRate?: number;
  baseMonthlyWage?: number;
  attendanceBonus?: number;
  socialSecurity?: number;
  currency: Employee["currency"];
  joinDate: string;
  photo: string | null;
}

const DEFAULT_EMPLOYEE_FORM: EmployeeFormState = {
  name: "",
  nickname: "",
  gender: "female",
  country: "MM",
  role: "拣货员",
  dept: "",
  hourlyRate: undefined,
  baseMonthlyWage: undefined,
  attendanceBonus: 0,
  socialSecurity: 0,
  currency: "THB",
  joinDate: new Date().toISOString().split("T")[0],
  photo: null
};

function normalizeEmployeeToForm(employee: Employee): EmployeeFormState {
  return {
    name: employee.name,
    nickname: employee.nickname || "",
    gender: employee.gender,
    country: employee.country,
    role: employee.role,
    dept: employee.dept,
    hourlyRate: employee.salaryType === "hourly" ? employee.hourlyRate ?? undefined : undefined,
    baseMonthlyWage: employee.salaryType === "fixed" ? employee.fixedSalary ?? undefined : undefined,
    attendanceBonus: employee.attendanceBonus,
    socialSecurity: employee.socialSecurity,
    currency: employee.currency,
    joinDate: employee.joinDate,
    photo: employee.photo
  };
}

function FieldLabel({ children }: { children: ReactNode }) {
  return <label className="block text-xs font-medium text-slate-500 mb-1 uppercase">{children}</label>;
}

interface EmployeeModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (payload: EmployeeUpsertPayload) => void;
  employee: Employee | null;
  saving?: boolean;
}

export function EmployeeModal({
  isOpen,
  onClose,
  onSave,
  employee,
  saving = false
}: EmployeeModalProps) {
  const [formData, setFormData] = useState<EmployeeFormState>(DEFAULT_EMPLOYEE_FORM);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!isOpen) {
      return;
    }

    if (employee) {
      setFormData(normalizeEmployeeToForm(employee));
      setError("");
      return;
    }

    setFormData({
      ...DEFAULT_EMPLOYEE_FORM,
      joinDate: new Date().toISOString().split("T")[0]
    });
    setError("");
  }, [employee, isOpen]);

  const handleChange = (e: ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;

    setFormData((prev) => {
      const next = { ...prev };
      if (name === "hourlyRate" || name === "baseMonthlyWage" || name === "attendanceBonus" || name === "socialSecurity") {
        next[name] = value === "" ? undefined : Number(value);
        return next;
      }
      return { ...next, [name]: value };
    });
    setError("");
  };

  const handlePhotoUpload = (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // v2 员工弹窗只把头像作为员工档案的一部分保存；限制类型和大小，避免非图片或过大 base64 写入员工表。
    if (!file.type.startsWith("image/")) {
      setError("请上传图片文件");
      return;
    }
    if (file.size > 1024 * 1024) {
      setError("头像图片不能超过 1MB");
      return;
    }

    const reader = new FileReader();
    reader.onload = (ev) => {
      setFormData((prev) => ({ ...prev, photo: ev.target?.result as string }));
    };
    reader.readAsDataURL(file);
  };

  const validateAndSubmit = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError("");

    const hasBaseWage = formData.baseMonthlyWage !== undefined && formData.baseMonthlyWage > 0;
    const hasHourlyRate = formData.hourlyRate !== undefined && formData.hourlyRate > 0;
    const amountFields = [formData.hourlyRate, formData.baseMonthlyWage, formData.attendanceBonus, formData.socialSecurity];
    if (amountFields.some((value) => value !== undefined && value < 0)) {
      setError("金额不能小于 0");
      return;
    }
    if (!hasBaseWage && !hasHourlyRate) {
      setError("请至少输入“时薪”或“基础工资（为月工资）”其中的一项！");
      return;
    }

    const salaryType = hasBaseWage ? "fixed" : "hourly";

    // 员工管理界面完全按 v2 原型展示；phone/status/salaryEffectiveStartDate 是现有后端契约需要的隐藏字段，不允许重新显示到 v2 弹窗里。
    onSave({
      name: formData.name.trim(),
      nickname: formData.nickname.trim(),
      gender: formData.gender,
      country: formData.country,
      phone: employee?.phone || "未填写",
      role: formData.role.trim(),
      dept: formData.dept.trim(),
      joinDate: formData.joinDate,
      status: employee?.status || "active",
      salaryType,
      hourlyRate: salaryType === "hourly" ? formData.hourlyRate ?? null : null,
      fixedSalary: salaryType === "fixed" ? formData.baseMonthlyWage ?? null : null,
      // 全勤奖、社保金是员工固定档案字段：前端允许空输入，但保存时统一归零，避免后端薪资计算拿到 undefined。
      attendanceBonus: formData.attendanceBonus ?? 0,
      socialSecurity: formData.socialSecurity ?? 0,
      salaryEffectiveStartDate: formData.joinDate,
      currency: formData.currency,
      photo: formData.photo
    });
  };

  const employeeFormId = "employee-upsert-form";

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={employee ? "编辑员工档案" : "新增员工档案"}
      className="max-w-2xl"
      bodyClassName="flex-1 min-h-0 overflow-y-auto"
      footer={(
        // 新增/编辑弹窗必须保持 Header / Body / Footer 三段式；按钮放在固定 Footer，避免 Body 内容变长时滚动消失。
        <div className="flex w-full justify-end gap-3">
          <button type="button" onClick={onClose} className="px-4 py-2 text-sm font-medium text-slate-500 hover:bg-slate-100 rounded-lg transition">取消</button>
          <button type="submit" form={employeeFormId} disabled={saving} className="px-6 py-2 text-sm font-medium text-white bg-brand-600 hover:bg-brand-700 rounded-lg shadow-md transition disabled:opacity-60">
            {saving ? "保存中..." : "保存员工档案"}
          </button>
        </div>
      )}
    >
      <form id={employeeFormId} onSubmit={validateAndSubmit} className="space-y-5">
        {error ? (
          <div className="p-3 text-sm text-red-600 bg-red-50 rounded-lg border border-red-200">
            {error}
          </div>
        ) : null}
        <div className="flex items-start gap-6">
          <div className="flex flex-col items-center flex-shrink-0">
            <label className="w-24 h-24 rounded-full bg-slate-100 border-2 border-dashed border-slate-300 flex items-center justify-center overflow-hidden cursor-pointer hover:border-brand-400 hover:bg-brand-50 transition group relative">
              {formData.photo ? (
                <img src={formData.photo} className="w-full h-full object-cover" alt="" />
              ) : (
                <div className="text-slate-400 group-hover:text-brand-500 transition">
                  <Upload className="w-8 h-8" />
                </div>
              )}
              <input type="file" className="hidden" accept="image/*" onChange={handlePhotoUpload} />
            </label>
            <span className="mt-2 text-[10px] text-slate-400">点击上传照片</span>
            {formData.photo ? (
              <button type="button" onClick={() => setFormData((prev) => ({ ...prev, photo: null }))} className="text-xs text-red-500 hover:text-red-700 font-medium mt-1">移除</button>
            ) : null}
          </div>
          <div className="flex-1 grid grid-cols-2 gap-4">
            <div>
              <FieldLabel>姓名</FieldLabel>
              <input type="text" name="name" value={formData.name} onChange={handleChange} required className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-brand-500 focus:border-transparent outline-none text-sm" placeholder="请输入员工姓名" />
            </div>
            <div>
              <FieldLabel>昵称</FieldLabel>
              <input type="text" name="nickname" value={formData.nickname} onChange={handleChange} className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-brand-500 focus:border-transparent outline-none text-sm" placeholder="可选，如：阿明" />
            </div>
            <div>
              <FieldLabel>性别</FieldLabel>
              <select name="gender" value={formData.gender} onChange={handleChange} className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-brand-500 outline-none text-sm bg-white">
                <option value="female">女</option>
                <option value="male">男</option>
              </select>
            </div>
            <div>
              <FieldLabel>来源国家</FieldLabel>
              <select name="country" value={formData.country} onChange={handleChange} className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-brand-500 outline-none text-sm bg-white">
                <option value="MM">缅甸</option>
                <option value="TH">泰国</option>
                <option value="CN">中国</option>
                <option value="VN">越南</option>
                <option value="KH">柬埔寨</option>
              </select>
            </div>
          </div>
        </div>
        <div className="grid grid-cols-2 gap-4 border-t border-slate-100 pt-4">
          <div>
            <FieldLabel>职位</FieldLabel>
            <select name="role" value={formData.role} onChange={handleChange} className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-brand-500 outline-none text-sm bg-white">
              {['拣货员', '打包员', '叉车工', '质检员', '组长', '仓管员'].map((role) => <option key={role}>{role}</option>)}
            </select>
          </div>
          <div>
            <FieldLabel>所属区域</FieldLabel>
            <input type="text" name="dept" value={formData.dept} onChange={handleChange} className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-brand-500 outline-none text-sm" placeholder="如：A区-入库" />
          </div>
          <div>
            <FieldLabel>时薪 (不输则根据基础薪资折算)</FieldLabel>
            <input type="number" name="hourlyRate" step="0.5" min="0" value={formData.hourlyRate ?? ""} onChange={handleChange} className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-brand-500 outline-none text-sm" placeholder="如: 300" />
          </div>
          <div>
            <FieldLabel>基础工资（为月工资，如果不输，则按时薪计）</FieldLabel>
            <input type="number" name="baseMonthlyWage" step="100" min="0" value={formData.baseMonthlyWage ?? ""} onChange={handleChange} className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-brand-500 outline-none text-sm" placeholder="如: 60000" />
          </div>
          <div>
            <FieldLabel>全勤奖</FieldLabel>
            <input type="number" name="attendanceBonus" step="100" min="0" value={formData.attendanceBonus ?? ""} onChange={handleChange} className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-brand-500 outline-none text-sm" placeholder="如: 1000" />
          </div>
          <div>
            <FieldLabel>社保金</FieldLabel>
            <input type="number" name="socialSecurity" step="100" min="0" value={formData.socialSecurity ?? ""} onChange={handleChange} className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-brand-500 outline-none text-sm" placeholder="如: 800" />
          </div>
          <div>
            <FieldLabel>工资币种</FieldLabel>
            <select name="currency" value={formData.currency} onChange={handleChange} className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-brand-500 outline-none text-sm bg-white">
              <option value="THB">泰铢 (฿ THB)</option>
              <option value="USD">美金 ($ USD)</option>
              <option value="MYR">马币 (RM MYR)</option>
              <option value="IDR">印尼盾 (Rp IDR)</option>
            </select>
          </div>
          <div>
            <FieldLabel>入职日期</FieldLabel>
            <input type="date" name="joinDate" value={formData.joinDate} onChange={handleChange} required className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-brand-500 outline-none text-sm" />
          </div>
        </div>
      </form>
    </Modal>
  );
}

export function StatusActionModal({
  isOpen,
  onClose,
  onConfirm,
  employee,
  targetStatus,
  loading = false
}: {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  employee: Employee | null;
  targetStatus: "disabled" | "resigned";
  loading?: boolean;
}) {
  const isDisable = targetStatus === "disabled";

  return (
    <div className={cn("fixed inset-0 bg-black/40 backdrop-blur-sm z-50 flex items-center justify-center p-4", !isOpen && "hidden")}>
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-sm fade-in p-6 text-center">
        <div className={cn(
          "w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4",
          isDisable ? "bg-amber-100 text-amber-600" : "bg-rose-100 text-rose-600"
        )}>
          {isDisable ? <UserX className="w-8 h-8" /> : <UserRoundMinus className="w-8 h-8" />}
        </div>
        <h3 className="text-lg font-bold text-slate-800 mb-2">{isDisable ? "确认停用该员工？" : "确认将该员工标记为离职？"}</h3>
        <p className="text-sm text-slate-500 mb-6">
          {isDisable
            ? `停用后，${employee?.name || "该员工"} 不会参与新的考勤和薪资核算，历史考勤和薪资记录仍可查询。`
            : `离职后，${employee?.name || "该员工"} 不会参与新的考勤和薪资核算，历史考勤和薪资记录仍可查询。`}
        </p>
        <div className="flex gap-3 justify-center">
          <button onClick={onClose} className="px-4 py-2 text-sm font-medium text-slate-600 hover:bg-slate-100 rounded-lg transition">
            取消
          </button>
          <button onClick={onConfirm} disabled={loading} className={cn(
            "px-4 py-2 text-sm font-medium text-white rounded-lg shadow-md transition disabled:opacity-60",
            isDisable ? "bg-amber-600 hover:bg-amber-700" : "bg-rose-600 hover:bg-rose-700"
          )}>
            {loading ? "处理中..." : isDisable ? "确认停用" : "确认离职"}
          </button>
        </div>
      </div>
    </div>
  );
}

const DEFAULT_ATTENDANCE_RULE_FORM: AttendanceRuleFormData = {
  name: "",
  isActive: true,
  effectiveStartDate: new Date().toISOString().split("T")[0],
  effectiveEndDate: null,
  startShift: "08:30",
  endShift: "17:30",
  breakStart: "12:00",
  breakEnd: "13:00",
  standardHours: 8,
  overtimeEnabled: true,
  otHourlyFee: 50
};

type AttendanceRuleFormState = Omit<AttendanceRuleFormData, "otHourlyFee"> & {
  otHourlyFee: number | "";
};

function normalizeAttendanceRuleToForm(rule: AttendanceRule): AttendanceRuleFormData {
  return {
    name: rule.name,
    isActive: rule.isActive,
    effectiveStartDate: rule.effectiveStartDate,
    effectiveEndDate: rule.effectiveEndDate,
    startShift: rule.startShift,
    endShift: rule.endShift,
    breakStart: rule.breakStart,
    breakEnd: rule.breakEnd,
    standardHours: rule.standardHours,
    overtimeEnabled: rule.overtimeEnabled,
    otHourlyFee: rule.otHourlyFee
  };
}

export function AttendanceRuleModal({
  isOpen,
  onClose,
  onSave,
  rule,
  saving = false
}: {
  isOpen: boolean;
  onClose: () => void;
  onSave: (payload: AttendanceRuleFormData) => void;
  rule: AttendanceRule | null;
  saving?: boolean;
}) {
  const [formData, setFormData] = useState<AttendanceRuleFormState>(DEFAULT_ATTENDANCE_RULE_FORM);
  const [error, setError] = useState("");
  const computedStandardHours = useMemo(() => {
    return calculateShiftStandardHours({
      startShift: formData.startShift,
      endShift: formData.endShift,
      breakStart: formData.breakStart,
      breakEnd: formData.breakEnd
    });
  }, [formData.breakEnd, formData.breakStart, formData.endShift, formData.startShift]);

  useEffect(() => {
    if (!isOpen) {
      return;
    }

    if (rule) {
      setFormData(normalizeAttendanceRuleToForm(rule));
    } else {
      setFormData({
        ...DEFAULT_ATTENDANCE_RULE_FORM,
        effectiveStartDate: new Date().toISOString().split("T")[0],
        standardHours: calculateShiftStandardHours(DEFAULT_ATTENDANCE_RULE_FORM)
      });
    }
    setError("");
  }, [isOpen, rule]);

  const handleChange = (event: ChangeEvent<HTMLInputElement>) => {
    const { name, value, type, checked } = event.target;
    setFormData((prev) => {
      if (type === "checkbox") {
        return { ...prev, [name]: checked };
      }

      if (name === "otHourlyFee") {
        return { ...prev, otHourlyFee: value === "" ? "" : Number(value) };
      }

      if (name === "effectiveEndDate") {
        return { ...prev, effectiveEndDate: value || null };
      }

      return { ...prev, [name]: value };
    });
  };

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError("");

    if (!formData.name.trim()) {
      setError("规则名称不能为空");
      return;
    }

    if (!formData.effectiveStartDate) {
      setError("生效开始日期不能为空");
      return;
    }

    if (formData.effectiveEndDate && formData.effectiveEndDate < formData.effectiveStartDate) {
      setError("生效结束日期不能早于生效开始日期");
      return;
    }

    if (!formData.startShift || !formData.endShift || !formData.breakStart || !formData.breakEnd) {
      setError("请完整填写班次和休息时间");
      return;
    }

    if (computedStandardHours <= 0) {
      setError("标准工时必须大于 0，请检查班次和休息时间");
      return;
    }

    const otHourlyFee = formData.otHourlyFee === "" ? null : Number(formData.otHourlyFee);
    if (formData.overtimeEnabled && (otHourlyFee === null || Number.isNaN(otHourlyFee) || otHourlyFee < 0)) {
      setError("启用加班时，请填写大于等于 0 的加班费标准");
      return;
    }

    onSave({
      ...formData,
      standardHours: computedStandardHours,
      name: formData.name.trim(),
      otHourlyFee: otHourlyFee ?? 0
    });
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={rule ? "编辑考勤规则" : "新增考勤规则"}
      className="max-w-4xl"
      bodyClassName="flex-1 min-h-0 p-0"
      footer={(
        <div className="space-y-3">
          {error ? (
            <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>
          ) : null}
          <div className="flex justify-end gap-3">
            <button type="button" onClick={onClose} className="rounded-lg px-4 py-2 text-sm font-medium text-slate-500 transition hover:bg-slate-100">
              取消
            </button>
            <button
              type="submit"
              form="attendance-rule-form"
              disabled={saving}
              className="rounded-lg bg-brand-600 px-6 py-2 text-sm font-medium text-white shadow-md transition hover:bg-brand-700 disabled:opacity-60"
            >
              {saving ? "保存中..." : "保存规则"}
            </button>
          </div>
        </div>
      )}
    >
      <form id="attendance-rule-form" onSubmit={handleSubmit} className="flex max-h-[calc(90vh-162px)] min-h-0 flex-col">
        <div className="flex-1 overflow-y-auto px-6 py-6">
          <div className="grid grid-cols-1 gap-6 xl:grid-cols-[minmax(0,1fr)_280px]">
            <div className="space-y-6">
              <section>
                <h4 className="mb-3 text-sm font-semibold text-slate-800">基础信息</h4>
                <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                  <div>
                    <FieldLabel>规则名称</FieldLabel>
                    <input
                      name="name"
                      value={formData.name}
                      onChange={handleChange}
                      className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-brand-500"
                    />
                  </div>
                  <div>
                    <FieldLabel>是否启用</FieldLabel>
                    <label className="flex items-center gap-3 rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-700">
                      <input
                        type="checkbox"
                        name="isActive"
                        checked={formData.isActive}
                        onChange={handleChange}
                        className="h-4 w-4 accent-brand-600"
                      />
                      允许新员工选择该规则
                    </label>
                  </div>
                  <div>
                    <FieldLabel>生效开始日期</FieldLabel>
                    <input
                      type="date"
                      name="effectiveStartDate"
                      value={formData.effectiveStartDate}
                      onChange={handleChange}
                      className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-brand-500"
                    />
                  </div>
                  <div>
                    <FieldLabel>生效结束日期</FieldLabel>
                    <input
                      type="date"
                      name="effectiveEndDate"
                      value={formData.effectiveEndDate || ""}
                      onChange={handleChange}
                      className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-brand-500"
                    />
                  </div>
                </div>
              </section>

              <section className="border-t border-slate-100 pt-5">
                <h4 className="mb-3 text-sm font-semibold text-slate-800">班次时间</h4>
                <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                  <div>
                    <FieldLabel>上班时间</FieldLabel>
                    <input type="time" name="startShift" value={formData.startShift} onChange={handleChange} className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-brand-500" />
                  </div>
                  <div>
                    <FieldLabel>下班时间</FieldLabel>
                    <input type="time" name="endShift" value={formData.endShift} onChange={handleChange} className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-brand-500" />
                  </div>
                  <div>
                    <FieldLabel>休息开始时间</FieldLabel>
                    <input type="time" name="breakStart" value={formData.breakStart} onChange={handleChange} className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-brand-500" />
                  </div>
                  <div>
                    <FieldLabel>休息结束时间</FieldLabel>
                    <input type="time" name="breakEnd" value={formData.breakEnd} onChange={handleChange} className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-brand-500" />
                  </div>
                  <div>
                    <FieldLabel>标准工时</FieldLabel>
                    <div className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-700">
                      <div className="font-semibold text-slate-800">{computedStandardHours.toFixed(2)} 小时</div>
                      <div className="mt-1 text-xs text-slate-500">根据班次时间自动计算，不需要手动填写</div>
                    </div>
                  </div>
                </div>
              </section>

              <section className="border-t border-slate-100 pt-5">
                <h4 className="mb-3 text-sm font-semibold text-slate-800">加班规则</h4>
                <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                  <div>
                    <FieldLabel>是否启用加班</FieldLabel>
                    <label className="flex items-center gap-3 rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-700">
                      <input
                        type="checkbox"
                        name="overtimeEnabled"
                        checked={formData.overtimeEnabled}
                        onChange={handleChange}
                        className="h-4 w-4 accent-brand-600"
                      />
                      启用加班计算
                    </label>
                  </div>
                  <div>
                    <FieldLabel>加班费标准 (THB / 小时)</FieldLabel>
                    <div className="flex items-center rounded-lg border border-slate-300 bg-white focus-within:ring-2 focus-within:ring-brand-500">
                      <span className="border-r border-slate-200 px-3 text-sm font-medium text-slate-500">฿</span>
                      <input
                        type="number"
                        min={0}
                        step="0.01"
                        name="otHourlyFee"
                        value={formData.otHourlyFee}
                        onChange={handleChange}
                        disabled={!formData.overtimeEnabled}
                        className="w-full rounded-r-lg px-3 py-2 text-sm outline-none disabled:bg-slate-50 disabled:text-slate-400"
                      />
                      <span className="px-3 text-xs text-slate-500">/ 小时</span>
                    </div>
                  </div>
                </div>
                <div className="mt-3 rounded-lg border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-600">
                  加班计量说明：按 0.5 小时为最小单位，向下取整。
                </div>
              </section>
            </div>

            <aside className="space-y-4">
              <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
                <h4 className="mb-3 text-sm font-semibold text-slate-800">保存影响</h4>
                <p className="text-sm leading-6 text-slate-600">
                  如果该规则已被员工引用，保存修改后，关联员工后续考勤计算将按新规则执行。如重新计算历史考勤，历史结果也可能变化。
                </p>
              </div>
            </aside>
          </div>
        </div>
      </form>
    </Modal>
  );
}

export function AttendanceRuleRelatedEmployeesModal({
  isOpen,
  onClose,
  ruleName,
  employees,
  loading = false
}: {
  isOpen: boolean;
  onClose: () => void;
  ruleName: string;
  employees: AttendanceRuleRelatedEmployee[];
  loading?: boolean;
}) {
  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={`关联员工 · ${ruleName}`}
      className="max-w-4xl"
      bodyClassName="max-h-[calc(90vh-162px)] overflow-y-auto"
      footer={(
        <div className="flex justify-end">
          <button onClick={onClose} className="rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-50">
            关闭
          </button>
        </div>
      )}
    >
      {loading ? (
        <div className="py-10 text-center text-sm text-slate-500">正在加载关联员工...</div>
      ) : employees.length === 0 ? (
        <div className="py-10 text-center text-sm text-slate-500">当前没有员工关联此考勤规则。</div>
      ) : (
        <div className="space-y-3">
          {employees.map((employee) => (
            <div key={`${employee.id}-${employee.relationStartDate}`} className="rounded-xl border border-slate-200 bg-slate-50 p-4">
              <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
                <div>
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-sm font-semibold text-slate-800">{employee.name}</span>
                    <span className="text-[10px] px-2 py-0.5 rounded-full bg-white text-slate-600 border border-slate-200">{employee.employeeNo}</span>
                    <span className={cn("text-[10px] px-2 py-0.5 rounded-full", EMPLOYEE_STATUS_META[employee.status].className)}>
                      {EMPLOYEE_STATUS_META[employee.status].label}
                    </span>
                    {employee.isCurrentRelation && (
                      <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-700">当前有效</span>
                    )}
                  </div>
                  <div className="mt-2 text-sm text-slate-500">
                    {employee.dept} · {employee.role}
                  </div>
                </div>
                <div className="text-sm text-slate-500 md:text-right">
                  <div>关联开始：{employee.relationStartDate}</div>
                  <div>关联结束：{employee.relationEndDate || "长期有效"}</div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </Modal>
  );
}

export function AttendanceRuleToggleModal({
  isOpen,
  onClose,
  onConfirm,
  rule,
  loading = false
}: {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  rule: AttendanceRule | null;
  loading?: boolean;
}) {
  const isDisable = Boolean(rule?.isActive);

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={isDisable ? "确认停用该考勤规则？" : "确认启用该考勤规则？"}
      className="max-w-md"
      footer={(
        <div className="flex justify-end gap-3">
          <button onClick={onClose} className="rounded-lg px-4 py-2 text-sm font-medium text-slate-600 transition hover:bg-slate-100">
            取消
          </button>
          <button
            onClick={onConfirm}
            disabled={loading}
            className={cn(
              "rounded-lg px-4 py-2 text-sm font-medium text-white shadow-md transition disabled:opacity-60",
              isDisable ? "bg-amber-600 hover:bg-amber-700" : "bg-emerald-600 hover:bg-emerald-700"
            )}
          >
            {loading ? "处理中..." : isDisable ? "确认停用" : "确认启用"}
          </button>
        </div>
      )}
    >
      <div className="text-sm leading-6 text-slate-500">
          {isDisable
            ? "停用后，该规则不再允许新员工选择或员工新切换到该规则，但已关联员工可继续使用，历史考勤不受影响。是否确认停用？"
            : "启用后，该规则会重新出现在员工管理的可选规则列表中，可用于新员工选择或员工切换规则。"}
      </div>
    </Modal>
  );
}

type NumericAppConfigKey = "otHourlyFee" | "standardHours" | "overtimeMultiplier" | "taxRate" | "dailyBreakMinutes";
type SettingsFormState = Omit<AppConfig, NumericAppConfigKey> & Record<NumericAppConfigKey, number | "">;

const NUMERIC_CONFIG_KEYS: NumericAppConfigKey[] = ["otHourlyFee", "standardHours", "overtimeMultiplier", "taxRate", "dailyBreakMinutes"];

export function SettingsModal({ isOpen, onClose, onSave, onReset, config }: { isOpen: boolean, onClose: () => void, onSave: (cfg: AppConfig) => void, onReset: () => void, config: AppConfig }) {
  const [formData, setFormData] = useState<SettingsFormState>(config);
  const [error, setError] = useState("");

  useEffect(() => {
    setFormData(config);
    setError("");
  }, [config, isOpen]);

  const handleChange = (e: ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    if (NUMERIC_CONFIG_KEYS.includes(name as NumericAppConfigKey)) {
      setFormData(prev => ({ ...prev, [name]: value === "" ? "" : parseFloat(value) }));
      return;
    }

    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError("");

    const numericConfig = NUMERIC_CONFIG_KEYS.reduce((acc, key) => {
      const value = formData[key];
      acc[key] = value === "" ? Number.NaN : Number(value);
      return acc;
    }, {} as Record<NumericAppConfigKey, number>);

    if (NUMERIC_CONFIG_KEYS.some((key) => Number.isNaN(numericConfig[key]) || numericConfig[key] < 0)) {
      setError("请完整填写大于等于 0 的数字配置");
      return;
    }

    onSave({
      ...formData,
      ...numericConfig
    });
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="考勤与加班规则设置" className="max-w-lg">
      <form onSubmit={handleSubmit} className="space-y-5">
        <div className="grid grid-cols-2 gap-4">
          <div className="bg-blue-50 p-3 rounded-lg border border-blue-100">
            <label className="block text-xs font-semibold text-blue-800 mb-2 uppercase">上班时间</label>
            <input type="time" name="startShift" value={formData.startShift} onChange={handleChange} required className="w-full px-3 py-2 bg-white border border-blue-200 rounded-md text-slate-700 focus:ring-2 focus:ring-blue-500 outline-none font-mono text-center" />
          </div>
          <div className="bg-blue-50 p-3 rounded-lg border border-blue-100">
            <label className="block text-xs font-semibold text-blue-800 mb-2 uppercase">下班时间</label>
            <input type="time" name="endShift" value={formData.endShift} onChange={handleChange} required className="w-full px-3 py-2 bg-white border border-blue-200 rounded-md text-slate-700 focus:ring-2 focus:ring-blue-500 outline-none font-mono text-center" />
          </div>
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div className="bg-amber-50 p-3 rounded-lg border border-amber-100">
            <label className="block text-xs font-semibold text-amber-800 mb-2 uppercase">午休开始</label>
            <input type="time" name="breakStart" value={formData.breakStart} onChange={handleChange} required className="w-full px-3 py-2 bg-white border border-amber-200 rounded-md text-slate-700 focus:ring-2 focus:ring-amber-500 outline-none font-mono text-center" />
          </div>
          <div className="bg-amber-50 p-3 rounded-lg border border-amber-100">
            <label className="block text-xs font-semibold text-amber-800 mb-2 uppercase">午休结束</label>
            <input type="time" name="breakEnd" value={formData.breakEnd} onChange={handleChange} required className="w-full px-3 py-2 bg-white border border-amber-200 rounded-md text-slate-700 focus:ring-2 focus:ring-amber-500 outline-none font-mono text-center" />
          </div>
        </div>
        <div className="bg-green-50 p-3 rounded-lg border border-green-100">
          <label className="block text-xs font-semibold text-green-800 mb-2 uppercase">加班费标准 (泰铢/小时)</label>
          <div className="flex items-center gap-2">
            <span className="text-lg font-bold text-green-700">฿</span>
            <input type="number" name="otHourlyFee" step="0.01" min="0" value={formData.otHourlyFee} onChange={handleChange} required className="w-full px-3 py-2 bg-white border border-green-200 rounded-md text-slate-700 focus:ring-2 focus:ring-green-500 outline-none font-mono text-lg" />
            <span className="text-sm text-slate-500 whitespace-nowrap">/ 小时</span>
          </div>
        </div>
        {error ? (
          <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>
        ) : null}
        <div className="flex justify-end gap-3 pt-2 border-t border-slate-100">
          <button type="button" onClick={onReset} className="px-4 py-2 text-sm font-medium text-slate-500 hover:bg-slate-100 rounded-lg transition">恢复默认</button>
          <button type="submit" className="px-6 py-2 text-sm font-medium text-white bg-brand-600 hover:bg-brand-700 rounded-lg shadow-md transition">保存规则</button>
        </div>
      </form>
    </Modal>
  );
}

export function AttendanceAdjustmentModal({ isOpen, onClose, onSave, record, employees }: {
  isOpen: boolean,
  onClose: () => void,
  onSave: (rec: Partial<AttendanceRecord>) => void,
  record: AttendanceRecord | null,
  employees: Employee[]
}) {
  const [formData, setFormData] = useState<Partial<AttendanceRecord>>({
    date: '', type: 'normal', inTime: '08:30', outTime: '17:30', note: ''
  });

  useEffect(() => {
    if (record) {
      setFormData(record);
    }
  }, [record, isOpen]);

  const handleChange = (e: ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const employee = employees.find(e => e.id === record?.employeeId);

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="调整考勤记录" className="max-w-lg">
      <form onSubmit={(e) => { e.preventDefault(); onSave(formData); }} className="space-y-5">
        {employee && (
          <div className="bg-slate-50 rounded-lg p-3 text-sm text-slate-600">
             员工: <span className="font-bold text-slate-800">{employee.name}</span>
          </div>
        )}
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-medium text-slate-500 mb-1 uppercase">日期</label>
            <input type="date" name="date" value={formData.date} onChange={handleChange} required className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-brand-500 outline-none text-sm" />
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-500 mb-1 uppercase">考勤类型</label>
            <select name="type" value={formData.type} onChange={handleChange} className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-brand-500 outline-none text-sm bg-white">
              <option value="normal">正常</option>
              <option value="late">迟到</option>
              <option value="early">早退</option>
              <option value="absent">缺勤</option>
              <option value="leave">假期</option>
              <option value="overtime">加班</option>
            </select>
          </div>
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-medium text-slate-500 mb-1 uppercase">上班时间</label>
            <input type="time" name="inTime" value={formData.inTime} onChange={handleChange} required className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-brand-500 outline-none text-sm font-mono text-center" />
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-500 mb-1 uppercase">下班时间</label>
            <input type="time" name="outTime" value={formData.outTime} onChange={handleChange} required className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-brand-500 outline-none text-sm font-mono text-center" />
          </div>
        </div>
        <div>
          <label className="block text-xs font-medium text-slate-500 mb-1 uppercase">调整备注</label>
          <textarea name="note" rows={2} value={formData.note} onChange={handleChange} className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-brand-500 outline-none text-sm resize-none" placeholder="如：设备故障导致漏打卡..."></textarea>
        </div>
        <div className="flex justify-end gap-3 pt-2 border-t border-slate-100">
          <button type="button" onClick={onClose} className="px-4 py-2 text-sm font-medium text-slate-500 hover:bg-slate-100 rounded-lg transition">取消</button>
          <button type="submit" className="px-6 py-2 text-sm font-medium text-white bg-brand-600 hover:bg-brand-700 rounded-lg shadow-md transition">保存调整</button>
        </div>
      </form>
    </Modal>
  );
}

