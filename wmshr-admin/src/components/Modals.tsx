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
  AttendanceRuleOption,
  AttendanceRuleRelatedEmployee,
  Employee,
  EmployeeAttendanceRuleHistory,
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

interface EmployeeFormState extends EmployeeUpsertPayload {
  employeeNo: string;
}

const DEFAULT_EMPLOYEE_FORM: EmployeeFormState = {
  employeeNo: "系统自动生成",
  name: "",
  gender: "female",
  country: "MM",
  phone: "",
  role: "拣货员",
  dept: "",
  joinDate: new Date().toISOString().split("T")[0],
  status: "active",
  attendanceRuleId: 0,
  ruleEffectiveStartDate: new Date().toISOString().split("T")[0],
  salaryType: "hourly",
  hourlyRate: 300,
  fixedSalary: null,
  salaryEffectiveStartDate: new Date().toISOString().split("T")[0],
  currency: "THB",
  photo: null
};

function normalizeEmployeeToForm(employee: Employee): EmployeeFormState {
  const today = new Date().toISOString().split("T")[0];
  return {
    employeeNo: employee.employeeNo,
    name: employee.name,
    gender: employee.gender,
    country: employee.country,
    phone: employee.phone,
    role: employee.role,
    dept: employee.dept,
    joinDate: employee.joinDate,
    status: employee.status,
    attendanceRuleId: employee.attendanceRuleId,
    ruleEffectiveStartDate: today,
    salaryType: employee.salaryType,
    hourlyRate: employee.hourlyRate,
    fixedSalary: employee.fixedSalary,
    salaryEffectiveStartDate: new Date().toISOString().split("T")[0],
    currency: employee.currency,
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
  attendanceRules: AttendanceRuleOption[];
  ruleHistory: EmployeeAttendanceRuleHistory[];
  saving?: boolean;
}

export function EmployeeModal({
  isOpen,
  onClose,
  onSave,
  employee,
  attendanceRules,
  ruleHistory,
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

    const nextDefaultRuleId = attendanceRules[0]?.id || 0;
    const today = new Date().toISOString().split("T")[0];
    setFormData({
      ...DEFAULT_EMPLOYEE_FORM,
      joinDate: today,
      ruleEffectiveStartDate: today,
      attendanceRuleId: nextDefaultRuleId
    });
    setError("");
  }, [attendanceRules, employee, isOpen]);

  const selectedRuleChanged = employee ? employee.attendanceRuleId !== formData.attendanceRuleId : false;

  const handleChange = (
    e: ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>
  ) => {
    const { name, value } = e.target;

    setFormData((prev) => {
      const next = { ...prev } as EmployeeFormState;

      if (name === "attendanceRuleId") {
        next.attendanceRuleId = Number(value);
      } else if (name === "hourlyRate") {
        next.hourlyRate = value === "" ? null : Number(value);
      } else if (name === "fixedSalary") {
        next.fixedSalary = value === "" ? null : Number(value);
      } else if (name === "salaryType") {
        next.salaryType = value as SalaryType;
        if (value === "fixed") {
          next.hourlyRate = null;
          next.fixedSalary = next.fixedSalary ?? 0;
        } else {
          next.fixedSalary = null;
          next.hourlyRate = next.hourlyRate ?? 0;
        }
      } else if (name === "joinDate") {
        next.joinDate = value;
        if (!employee) {
          next.ruleEffectiveStartDate = value;
          next.salaryEffectiveStartDate = value;
        }
      } else {
        (next as unknown as Record<string, string>)[name] = value;
      }

      return next;
    });
  };

  const handlePhotoUpload = (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (ev) => {
      setFormData((prev) => ({ ...prev, photo: ev.target?.result as string }));
    };
    reader.readAsDataURL(file);
  };

  const validateAndSubmit = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError("");

    if (!formData.name.trim()) {
      setError("姓名不能为空");
      return;
    }

    if (!formData.phone.trim()) {
      setError("手机号不能为空");
      return;
    }

    if (!formData.dept.trim()) {
      setError("部门/区域不能为空");
      return;
    }

    if (!formData.attendanceRuleId) {
      setError("请选择当前考勤规则");
      return;
    }

    if (!formData.ruleEffectiveStartDate) {
      setError("请填写规则生效日期");
      return;
    }

    if (formData.ruleEffectiveStartDate < formData.joinDate) {
      setError("规则生效日期不能早于入职日期");
      return;
    }

    if (formData.salaryType === "hourly" && (formData.hourlyRate === null || formData.hourlyRate < 0)) {
      setError("请选择时薪并填写有效金额");
      return;
    }

    if (formData.salaryType === "fixed" && (formData.fixedSalary === null || formData.fixedSalary < 0)) {
      setError("请选择固定工资并填写有效金额");
      return;
    }

    if (!formData.salaryEffectiveStartDate) {
      setError("请填写薪资生效日期");
      return;
    }

    if (formData.salaryEffectiveStartDate < formData.joinDate) {
      setError("薪资生效日期不能早于入职日期");
      return;
    }

    onSave({
      name: formData.name.trim(),
      gender: formData.gender,
      country: formData.country,
      phone: formData.phone.trim(),
      role: formData.role.trim(),
      dept: formData.dept.trim(),
      joinDate: formData.joinDate,
      status: formData.status,
      attendanceRuleId: formData.attendanceRuleId,
      ruleEffectiveStartDate: formData.ruleEffectiveStartDate,
      salaryType: formData.salaryType,
      hourlyRate: formData.salaryType === "hourly" ? formData.hourlyRate : null,
      fixedSalary: formData.salaryType === "fixed" ? formData.fixedSalary : null,
      salaryEffectiveStartDate: formData.salaryEffectiveStartDate,
      currency: formData.currency,
      photo: formData.photo
    });
  };

  const currentRuleName = useMemo(() => attendanceRules.find((rule) => rule.id === formData.attendanceRuleId)?.name || "未匹配规则", [attendanceRules, formData.attendanceRuleId]);
  const salaryChanged = employee
    ? employee.salaryType !== formData.salaryType ||
      employee.hourlyRate !== formData.hourlyRate ||
      employee.fixedSalary !== formData.fixedSalary ||
      employee.currency !== formData.currency
    : false;

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={employee ? "编辑员工档案" : "新增员工档案"}
      className="max-w-5xl"
      bodyClassName="flex-1 min-h-0 p-0"
    >
      <form onSubmit={validateAndSubmit} className="flex max-h-[78vh] min-h-0 flex-col">
        <div className="flex-1 overflow-y-auto px-6 pt-6 pb-3">
          <div className="grid grid-cols-1 xl:grid-cols-[minmax(0,1fr)_280px] gap-6">
            <div className="space-y-6">
            <section>
              <h4 className="text-sm font-semibold text-slate-800 mb-3">基础信息</h4>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="md:col-span-2 flex items-start gap-5">
                  <div className="flex flex-col items-center">
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
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 flex-1">
                    <div>
                      <FieldLabel>员工编号</FieldLabel>
                      <input value={formData.employeeNo} disabled className="w-full px-3 py-2 border border-slate-200 rounded-lg bg-slate-50 text-sm text-slate-500" />
                    </div>
                    <div>
                      <FieldLabel>姓名</FieldLabel>
                      <input name="name" value={formData.name} onChange={handleChange} required className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-brand-500 outline-none" />
                    </div>
                    <div>
                      <FieldLabel>性别</FieldLabel>
                      <select name="gender" value={formData.gender} onChange={handleChange} className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm bg-white focus:ring-2 focus:ring-brand-500 outline-none">
                        <option value="female">女</option>
                        <option value="male">男</option>
                      </select>
                    </div>
                    <div>
                      <FieldLabel>国家/地区</FieldLabel>
                      <select name="country" value={formData.country} onChange={handleChange} className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm bg-white focus:ring-2 focus:ring-brand-500 outline-none">
                        <option value="MM">缅甸</option>
                        <option value="TH">泰国</option>
                        <option value="CN">中国</option>
                        <option value="VN">越南</option>
                        <option value="KH">柬埔寨</option>
                      </select>
                    </div>
                    <div>
                      <FieldLabel>手机号</FieldLabel>
                      <input name="phone" value={formData.phone} onChange={handleChange} required className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-brand-500 outline-none" placeholder="+66 8xxxxxxxx" />
                    </div>
                    <div>
                      <FieldLabel>岗位</FieldLabel>
                      <select name="role" value={formData.role} onChange={handleChange} className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm bg-white focus:ring-2 focus:ring-brand-500 outline-none">
                        {ROLE_OPTIONS.map((role) => (
                          <option key={role} value={role}>{role}</option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <FieldLabel>部门/区域</FieldLabel>
                      <input name="dept" value={formData.dept} onChange={handleChange} required className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-brand-500 outline-none" placeholder="如：A区入库" />
                    </div>
                    <div>
                      <FieldLabel>入职日期</FieldLabel>
                      <input type="date" name="joinDate" value={formData.joinDate} onChange={handleChange} required className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-brand-500 outline-none" />
                    </div>
                    <div className="md:col-span-2">
                      <FieldLabel>员工状态</FieldLabel>
                      <div className="grid grid-cols-2 md:grid-cols-5 gap-2">
                        {(["active", "probation", "on_leave", "disabled", "resigned"] as EmployeeStatus[]).map((item) => (
                          <label key={item} className={cn(
                            "px-3 py-2 rounded-lg border text-sm cursor-pointer transition text-center",
                            formData.status === item ? "border-brand-500 bg-brand-50 text-brand-700" : "border-slate-200 text-slate-600 hover:bg-slate-50"
                          )}>
                            <input type="radio" name="status" value={item} checked={formData.status === item} onChange={handleChange} className="hidden" />
                            {EMPLOYEE_STATUS_META[item].label}
                          </label>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </section>

            <section className="border-t border-slate-100 pt-5">
              <h4 className="text-sm font-semibold text-slate-800 mb-3">考勤规则</h4>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <FieldLabel>当前考勤规则</FieldLabel>
                  <select name="attendanceRuleId" value={formData.attendanceRuleId} onChange={handleChange} className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm bg-white focus:ring-2 focus:ring-brand-500 outline-none">
                    <option value={0}>请选择考勤规则</option>
                    {attendanceRules.map((rule) => (
                      <option key={rule.id} value={rule.id}>{rule.name}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <FieldLabel>规则生效日期</FieldLabel>
                  <input type="date" name="ruleEffectiveStartDate" value={formData.ruleEffectiveStartDate} onChange={handleChange} required className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-brand-500 outline-none" />
                </div>
              </div>
              {selectedRuleChanged && (
                <div className="mt-3 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
                  修改考勤规则会生成新的规则历史，不会影响历史考勤和历史薪资。
                </div>
              )}
            </section>

            <section className="border-t border-slate-100 pt-5">
              <h4 className="text-sm font-semibold text-slate-800 mb-3">薪资信息</h4>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="md:col-span-2">
                  <FieldLabel>计薪方式</FieldLabel>
                  <div className="grid grid-cols-2 gap-2">
                    {(["hourly", "fixed"] as SalaryType[]).map((type) => (
                      <label key={type} className={cn(
                        "px-3 py-2 rounded-lg border text-sm cursor-pointer transition text-center",
                        formData.salaryType === type ? "border-brand-500 bg-brand-50 text-brand-700" : "border-slate-200 text-slate-600 hover:bg-slate-50"
                      )}>
                        <input type="radio" name="salaryType" value={type} checked={formData.salaryType === type} onChange={handleChange} className="hidden" />
                        {SALARY_TYPE_LABELS[type]}
                      </label>
                    ))}
                  </div>
                </div>

                {formData.salaryType === "hourly" ? (
                  <div>
                    <FieldLabel>时薪金额</FieldLabel>
                    <input type="number" name="hourlyRate" min={0} step="0.01" value={formData.hourlyRate ?? ""} onChange={handleChange} className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-brand-500 outline-none" />
                  </div>
                ) : (
                  <div>
                    <FieldLabel>固定工资金额</FieldLabel>
                    <input type="number" name="fixedSalary" min={0} step="0.01" value={formData.fixedSalary ?? ""} onChange={handleChange} className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-brand-500 outline-none" />
                  </div>
                )}

                <div>
                  <FieldLabel>币种</FieldLabel>
                  <select name="currency" value={formData.currency} onChange={handleChange} className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm bg-white focus:ring-2 focus:ring-brand-500 outline-none">
                    <option value="THB">泰铢 (THB)</option>
                    <option value="USD">美元 (USD)</option>
                    <option value="MYR">马币 (MYR)</option>
                    <option value="IDR">印尼盾 (IDR)</option>
                  </select>
                </div>

                <div>
                  <FieldLabel>薪资生效日期</FieldLabel>
                  <input type="date" name="salaryEffectiveStartDate" value={formData.salaryEffectiveStartDate} onChange={handleChange} required className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-brand-500 outline-none" />
                </div>
              </div>
              {salaryChanged ? (
                <div className="mt-3 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
                  薪资变更会从该生效日期生成新的薪资档案，历史月份仍按原薪资档案核算。
                </div>
              ) : null}
            </section>
            </div>

            <aside className="space-y-4">
              <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
                <h4 className="text-sm font-semibold text-slate-800 mb-3">当前摘要</h4>
                <div className="space-y-2 text-sm text-slate-600">
                  <div className="flex justify-between gap-3">
                    <span>规则</span>
                    <span className="font-medium text-slate-800 text-right">{currentRuleName}</span>
                  </div>
                  <div className="flex justify-between gap-3">
                    <span>计薪方式</span>
                    <span className="font-medium text-slate-800">{SALARY_TYPE_LABELS[formData.salaryType]}</span>
                  </div>
                  <div className="flex justify-between gap-3">
                    <span>薪资口径</span>
                    <span className="font-medium text-slate-800 text-right">{formatCompensation(formData as Employee)}</span>
                  </div>
                </div>
              </div>

              <div className="rounded-xl border border-slate-200 bg-white p-4">
                <h4 className="text-sm font-semibold text-slate-800 mb-3">规则历史</h4>
                {ruleHistory.length === 0 ? (
                  <p className="text-sm text-slate-400">保存后会在这里展示该员工的规则变更历史。</p>
                ) : (
                  <div className="space-y-3">
                    {ruleHistory.map((history) => (
                      <div key={history.id} className="rounded-lg border border-slate-100 bg-slate-50 p-3">
                        <div className="text-sm font-medium text-slate-800">{history.attendanceRuleName || `规则 #${history.attendanceRuleId}`}</div>
                        <div className="mt-1 text-xs text-slate-500">
                          {history.effectiveStartDate} 至 {history.effectiveEndDate || "长期有效"}
                        </div>
                        <div className="mt-1 text-xs text-slate-400">
                          操作时间 {history.createdAt}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </aside>
          </div>
        </div>

        <div className="flex-shrink-0 border-t border-slate-200 bg-[linear-gradient(180deg,rgba(255,255,255,0.94)_0%,rgba(248,250,252,0.99)_100%)] px-6 pt-4 pb-5 shadow-[0_-12px_32px_rgba(15,23,42,0.06)]">
          {error ? (
            <div className="mb-4 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
              {error}
            </div>
          ) : null}

          <div className="flex items-center justify-end gap-3">
          <button type="button" onClick={onClose} className="px-4 py-2 text-sm font-medium text-slate-500 hover:bg-slate-100 rounded-lg transition">
            取消
          </button>
          <button type="submit" disabled={saving} className="px-6 py-2 text-sm font-medium text-white bg-brand-600 hover:bg-brand-700 rounded-lg shadow-md transition disabled:opacity-60">
            {saving ? "保存中..." : "保存员工档案"}
          </button>
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
            ? `停用后，${employee?.name || "该员工"} 不会参与新的考勤和薪资核算，但历史考勤、历史薪资和规则历史会继续保留。`
            : `离职后，${employee?.name || "该员工"} 不会参与新的考勤和薪资核算，但仍可在历史考勤和历史薪资中查询。`}
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
