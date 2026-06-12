/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { Copy, RefreshCw, ToggleLeft, ToggleRight, Upload, Trash2, UserRoundMinus } from "lucide-react";
import { tAdmin } from "../lib/i18nText";
import {
  AppConfig,
  AttendanceRecord,
  AttendanceRule,
  AttendanceRuleFormData,
  AttendanceRuleRelatedEmployee,
  Employee,
  EmployeeAppAccountResponse,
  EmployeeStatus,
  EmployeeUpsertPayload,
  SalaryType
} from "../types";
import { calculateShiftStandardHours, cn, formatCompensation, getEmployeeStatusMeta, getSalaryTypeLabel } from "../lib/utils";
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
  status: EmployeeStatus;
  role: string;
  dept: string;
  isDispatchPersonnel: boolean;
  hourlyRate?: number;
  baseMonthlyWage?: number;
  attendanceBonus?: number;
  socialSecurity?: number;
  mealAllowance?: number;
  serviceFeeRate?: number;
  currency: Employee["currency"];
  joinDate: string;
  photo: string | null;
}

const TODAY_DATE_KEY = new Date().toISOString().split("T")[0];

const DEFAULT_EMPLOYEE_FORM: EmployeeFormState = {
  name: "",
  nickname: "",
  gender: "female",
  country: "MM",
  status: "active",
  role: tAdmin("拣货员"),
  dept: "",
  isDispatchPersonnel: false,
  hourlyRate: undefined,
  baseMonthlyWage: undefined,
  attendanceBonus: 0,
  socialSecurity: 0,
  mealAllowance: 0,
  serviceFeeRate: 0,
  currency: "THB",
  joinDate: TODAY_DATE_KEY,
  photo: null
};

function normalizeEmployeeToForm(employee: Employee): EmployeeFormState {
  return {
    name: employee.name,
    nickname: employee.nickname || "",
    gender: employee.gender,
    country: employee.country,
    status: employee.status,
    role: employee.role,
    dept: employee.dept,
    isDispatchPersonnel: employee.isDispatchPersonnel ?? false,
    hourlyRate: employee.salaryType === "hourly" ? employee.hourlyRate ?? undefined : undefined,
    baseMonthlyWage: employee.salaryType === "fixed" ? employee.fixedSalary ?? undefined : undefined,
    attendanceBonus: employee.attendanceBonus,
    socialSecurity: employee.socialSecurity,
    mealAllowance: employee.mealAllowance,
    serviceFeeRate: employee.serviceFeeRate,
    currency: employee.currency,
    joinDate: employee.joinDate,
    photo: employee.photo
  };
}

function FieldLabel({ children }: { children: ReactNode }) {
  return <label className="block text-xs font-medium text-slate-500 mb-1 uppercase">{children}</label>;
}

const MAX_AVATAR_UPLOAD_BYTES = 5 * 1024 * 1024;
const MAX_AVATAR_EDGE = 160;
const AVATAR_EXPORT_QUALITY = 0.72;
const MIN_AVATAR_EXPORT_QUALITY = 0.28;
const AVATAR_TARGET_BYTES = 8 * 1024;

async function loadImageFromFile(file: File) {
  const objectUrl = URL.createObjectURL(file);
  try {
    const image = new Image();
    image.decoding = "async";
    const loaded = new Promise<HTMLImageElement>((resolve, reject) => {
      image.onload = () => resolve(image);
      image.onerror = () => reject(new Error(tAdmin("头像图片读取失败，请重试")));
    });
    image.src = objectUrl;
    return await loaded;
  } finally {
    URL.revokeObjectURL(objectUrl);
  }
}

async function compressAvatarFile(file: File) {
  const image = await loadImageFromFile(file);
  const longestEdge = Math.max(image.width, image.height);
  const scale = longestEdge > MAX_AVATAR_EDGE ? MAX_AVATAR_EDGE / longestEdge : 1;
  const targetWidth = Math.max(1, Math.round(image.width * scale));
  const targetHeight = Math.max(1, Math.round(image.height * scale));
  const canvas = document.createElement("canvas");
  canvas.width = targetWidth;
  canvas.height = targetHeight;

  const context = canvas.getContext("2d");
  if (!context) {
    throw new Error(tAdmin("当前浏览器不支持头像压缩，请更换浏览器后重试"));
  }

  // JPEG 压缩体积最稳定；先铺白底，避免透明 PNG 转出后出现黑底。
  context.fillStyle = "#ffffff";
  context.fillRect(0, 0, targetWidth, targetHeight);
  context.drawImage(image, 0, 0, targetWidth, targetHeight);

  let quality = AVATAR_EXPORT_QUALITY;
  let dataUrl = canvas.toDataURL("image/jpeg", quality);

  while (quality > MIN_AVATAR_EXPORT_QUALITY && dataUrl.length * 0.75 > AVATAR_TARGET_BYTES) {
    quality -= 0.06;
    dataUrl = canvas.toDataURL("image/jpeg", quality);
  }

  return dataUrl;
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
      joinDate: TODAY_DATE_KEY
    });
    setError("");
  }, [employee, isOpen]);

  const handleChange = (e: ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;

    setFormData((prev) => {
      const next = { ...prev };
      if (name === "country") {
        return {
          ...next,
          country: value as Employee["country"]
        };
      }
      if (name === "hourlyRate" || name === "baseMonthlyWage" || name === "attendanceBonus" || name === "socialSecurity" || name === "mealAllowance" || name === "serviceFeeRate") {
        next[name] = value === "" ? undefined : Number(value);
        return next;
      }
      return { ...next, [name]: value };
    });
    setError("");
  };

  const handlePhotoUpload = async (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) {
      return;
    }

    // 员工头像保存到 employees.photo 前先压缩，避免原图 base64 直接写库，把列表接口重新拖回 MB 级。
    if (!file.type.startsWith("image/")) {
      setError(tAdmin("请上传图片文件"));
      return;
    }
    if (file.size > MAX_AVATAR_UPLOAD_BYTES) {
      setError(tAdmin("头像原图不能超过 5MB"));
      return;
    }

    try {
      setError("");
      const compressedPhoto = await compressAvatarFile(file);
      setFormData((prev) => ({ ...prev, photo: compressedPhoto }));
    } catch (nextError) {
      setError(nextError instanceof Error ? nextError.message : tAdmin("头像处理失败，请重试"));
    } finally {
      e.target.value = "";
    }
  };

  const validateAndSubmit = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError("");

    const hasBaseWage = formData.baseMonthlyWage !== undefined && formData.baseMonthlyWage > 0;
    const hasHourlyRate = formData.hourlyRate !== undefined && formData.hourlyRate > 0;
    const amountFields = [formData.hourlyRate, formData.baseMonthlyWage, formData.attendanceBonus, formData.socialSecurity, formData.mealAllowance, formData.serviceFeeRate];
    if (amountFields.some((value) => value !== undefined && value < 0)) {
      setError(tAdmin("金额不能小于 0"));
      return;
    }
    if (!hasBaseWage && !hasHourlyRate) {
      setError(tAdmin("请至少输入“时薪”或“基础工资（为月工资）”其中的一项！"));
      return;
    }

    const salaryType = hasBaseWage ? "fixed" : "hourly";

    // 员工管理界面完全按 v2 原型展示；phone/status/salaryEffectiveStartDate 是现有后端契约需要的隐藏字段，不允许重新显示到 v2 弹窗里。
    onSave({
      name: formData.name.trim(),
      nickname: formData.nickname.trim(),
      gender: formData.gender,
      country: formData.country,
      phone: employee?.phone || tAdmin("未填写"),
      role: formData.role.trim(),
      dept: formData.dept.trim(),
      joinDate: formData.joinDate,
      status: formData.status,
      isDispatchPersonnel: formData.isDispatchPersonnel,
      salaryType,
      hourlyRate: salaryType === "hourly" ? formData.hourlyRate ?? null : null,
      fixedSalary: salaryType === "fixed" ? formData.baseMonthlyWage ?? null : null,
      // 全勤奖、社保金、餐补和服务费比例都是员工固定档案字段：前端允许空输入，但保存时统一归零，避免后端考勤/薪资计算拿到 undefined。
      attendanceBonus: formData.attendanceBonus ?? 0,
      socialSecurity: formData.socialSecurity ?? 0,
      mealAllowance: formData.mealAllowance ?? 0,
      serviceFeeRate: formData.serviceFeeRate ?? 0,
      salaryEffectiveStartDate: formData.joinDate,
      currency: formData.currency,
      photo: employee
        ? (formData.photo === employee.photo ? undefined : formData.photo)
        : formData.photo
    });
  };

  const employeeFormId = "employee-upsert-form";

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={employee ? tAdmin("编辑员工档案") : tAdmin("新增员工档案")}
      className="max-w-2xl"
      bodyClassName="flex-1 min-h-0 overflow-y-auto"
      footer={(
        // 新增/编辑弹窗必须保持 Header / Body / Footer 三段式；按钮放在固定 Footer，避免 Body 内容变长时滚动消失。
        <div className="flex w-full justify-end gap-3">
          <button type="button" onClick={onClose} className="px-4 py-2 text-sm font-medium text-slate-500 hover:bg-slate-100 rounded-lg transition">{tAdmin("取消")}</button>
          <button type="submit" form={employeeFormId} disabled={saving} className="px-6 py-2 text-sm font-medium text-white bg-brand-600 hover:bg-brand-700 rounded-lg shadow-md transition disabled:opacity-60">
            {saving ? tAdmin("保存中...") : tAdmin("保存员工档案")}
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
            <span className="mt-2 text-[10px] text-slate-400">{tAdmin("点击上传照片")}</span>
            {formData.photo ? (
              <button type="button" onClick={() => setFormData((prev) => ({ ...prev, photo: null }))} className="text-xs text-red-500 hover:text-red-700 font-medium mt-1">{tAdmin("移除")}</button>
            ) : null}
          </div>
          <div className="flex-1 grid grid-cols-2 gap-4">
            <div>
              <FieldLabel>{tAdmin("姓名")}</FieldLabel>
              <input type="text" name="name" value={formData.name} onChange={handleChange} required className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-brand-500 focus:border-transparent outline-none text-sm" placeholder={tAdmin("请输入员工姓名")} />
            </div>
            <div>
              <FieldLabel>{tAdmin("昵称")}</FieldLabel>
              <input type="text" name="nickname" value={formData.nickname} onChange={handleChange} className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-brand-500 focus:border-transparent outline-none text-sm" placeholder={tAdmin("可选，如：阿明")} />
            </div>
            <div>
              <FieldLabel>{tAdmin("性别")}</FieldLabel>
              <select name="gender" value={formData.gender} onChange={handleChange} className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-brand-500 outline-none text-sm bg-white">
                <option value="female">{tAdmin("女")}</option>
                <option value="male">{tAdmin("男")}</option>
              </select>
            </div>
            <div>
              <FieldLabel>{tAdmin("来源国家")}</FieldLabel>
              <select name="country" value={formData.country} onChange={handleChange} className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-brand-500 outline-none text-sm bg-white">
                <option value="MM">{tAdmin("缅甸")}</option>
                <option value="TH">{tAdmin("泰国")}</option>
                <option value="CN">{tAdmin("中国")}</option>
                <option value="VN">{tAdmin("越南")}</option>
                <option value="KH">{tAdmin("柬埔寨")}</option>
              </select>
            </div>
            <div>
              <FieldLabel>{tAdmin("员工状态")}</FieldLabel>
              <select name="status" value={formData.status} onChange={handleChange} className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-brand-500 outline-none text-sm bg-white">
                <option value="active">{tAdmin("在职")}</option>
                <option value="probation">{tAdmin("试用")}</option>
                <option value="on_leave">{tAdmin("休假")}</option>
                <option value="resigned">{tAdmin("离职")}</option>
              </select>
            </div>
          </div>
        </div>
        <div className="grid grid-cols-2 gap-4 border-t border-slate-100 pt-4">
          <div className="col-span-2 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm leading-6 text-amber-800">
            {tAdmin("提醒：是否派遣人员、时薪、基础工资、全勤奖、社保金、餐补、服务费比例这些字段都会影响薪资核算。保存后不会马上生效，需要重新执行薪资核算，系统处理也需要一点时间。")}
          </div>
          <div>
            <FieldLabel>{tAdmin("职位")}</FieldLabel>
            <select name="role" value={formData.role} onChange={handleChange} className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-brand-500 outline-none text-sm bg-white">
              {[tAdmin("拣货员"), tAdmin("打包员"), tAdmin("叉车工"), tAdmin("质检员"), tAdmin("组长"), tAdmin("仓管员")].map((role) => <option key={role}>{role}</option>)}
            </select>
          </div>
          <div>
            <FieldLabel>{tAdmin("所属区域")}</FieldLabel>
            <input type="text" name="dept" value={formData.dept} onChange={handleChange} className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-brand-500 outline-none text-sm" placeholder={tAdmin("如：A区-入库")} />
          </div>
          <div>
            <FieldLabel>{tAdmin("是否派遣人员")}</FieldLabel>
            <div className="flex items-center gap-6 rounded-lg border border-slate-300 bg-white px-3 py-2">
              <label className={cn(
                "flex items-center gap-2 text-sm transition",
                !formData.isDispatchPersonnel
                  ? "text-brand-700"
                  : "text-slate-700"
              )}>
                <input
                  type="radio"
                  name="isDispatchPersonnel"
                  checked={!formData.isDispatchPersonnel}
                  onChange={() => setFormData((prev) => ({ ...prev, isDispatchPersonnel: false }))}
                  className="h-4 w-4 accent-brand-600"
                />
                <span className="leading-tight">{tAdmin("否")}</span>
              </label>
              <label className={cn(
                "flex items-center gap-2 text-sm transition",
                formData.isDispatchPersonnel
                  ? "text-brand-700"
                  : "text-slate-700"
              )}>
                <input
                  type="radio"
                  name="isDispatchPersonnel"
                  checked={formData.isDispatchPersonnel}
                  onChange={() => setFormData((prev) => ({ ...prev, isDispatchPersonnel: true }))}
                  className="h-4 w-4 accent-brand-600"
                />
                <span className="leading-tight">{tAdmin("是")}</span>
              </label>
            </div>
          </div>
          <div>
            <FieldLabel>{tAdmin("时薪 (不输则根据基础薪资折算)")}</FieldLabel>
            <input type="number" name="hourlyRate" step="0.5" min="0" value={formData.hourlyRate ?? ""} onChange={handleChange} className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-brand-500 outline-none text-sm" placeholder={tAdmin("如: 300")} />
          </div>
          <div>
            <FieldLabel>{tAdmin("基础工资（为月工资，如果不输，则按时薪计）")}</FieldLabel>
            <input type="number" name="baseMonthlyWage" step="100" min="0" value={formData.baseMonthlyWage ?? ""} onChange={handleChange} className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-brand-500 outline-none text-sm" placeholder={tAdmin("如: 60000")} />
          </div>
          <div>
            <FieldLabel>{tAdmin("全勤奖")}</FieldLabel>
            <input type="number" name="attendanceBonus" step="100" min="0" value={formData.attendanceBonus ?? ""} onChange={handleChange} className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-brand-500 outline-none text-sm" placeholder={tAdmin("如: 1000")} />
          </div>
          <div>
            <FieldLabel>{tAdmin("社保金")}</FieldLabel>
            <input
              type="number"
              name="socialSecurity"
              step="100"
              min="0"
              value={formData.socialSecurity ?? ""}
              onChange={handleChange}
              className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-brand-500 outline-none text-sm"
              placeholder={tAdmin("如: 800")}
            />
            <p className="mt-1 text-xs leading-5 text-amber-600">
              {tAdmin("派遣人员会按考勤天数计算社保，且这里输入的是每日社保金额；非派遣人员按这里输入的月固定社保金计算。")}
            </p>
          </div>
          <div>
            <FieldLabel>{tAdmin("餐补费用")}</FieldLabel>
            <input type="number" name="mealAllowance" step="10" min="0" value={formData.mealAllowance ?? ""} onChange={handleChange} className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-brand-500 outline-none text-sm" placeholder={tAdmin("如: 50")} />
          </div>
          <div>
            <FieldLabel>{tAdmin("服务费比例")}</FieldLabel>
            <input type="number" name="serviceFeeRate" step="0.1" min="0" value={formData.serviceFeeRate ?? ""} onChange={handleChange} className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-brand-500 outline-none text-sm" placeholder={tAdmin("如: 10")} />
          </div>
          <div>
            <FieldLabel>{tAdmin("工资币种")}</FieldLabel>
            <select name="currency" value={formData.currency} onChange={handleChange} className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-brand-500 outline-none text-sm bg-white">
              <option value="THB">{tAdmin("泰铢 (฿ THB)")}</option>
              <option value="USD">{tAdmin("美金 ($ USD)")}</option>
              <option value="MYR">{tAdmin("马币 (RM MYR)")}</option>
              <option value="IDR">{tAdmin("印尼盾 (Rp IDR)")}</option>
            </select>
          </div>
          <div>
            <FieldLabel>{tAdmin("入职日期")}</FieldLabel>
            <input type="date" name="joinDate" max={TODAY_DATE_KEY} value={formData.joinDate} onChange={handleChange} required className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-brand-500 outline-none text-sm" />
          </div>
        </div>
      </form>
    </Modal>
  );
}

interface EmployeeAppAccountModalProps {
  isOpen: boolean;
  onClose: () => void;
  employee: Employee | null;
  accountResponse: EmployeeAppAccountResponse | null;
  loading?: boolean;
  actionLoading?: boolean;
  onResetPassword: () => void;
  onToggleStatus: () => void;
  onCopyCredential: () => void;
}

export function EmployeeAppAccountModal({
  isOpen,
  onClose,
  employee,
  accountResponse,
  loading = false,
  actionLoading = false,
  onResetPassword,
  onToggleStatus,
  onCopyCredential
}: EmployeeAppAccountModalProps) {
  const account = accountResponse?.account;
  const isDisabled = account?.status === "disabled";

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={tAdmin("员工 App 账号管理")}
      className="max-w-lg"
      footer={(
        <div className="flex w-full justify-end gap-3">
          <button type="button" onClick={onClose} className="px-4 py-2 text-sm font-medium text-slate-500 hover:bg-slate-100 rounded-lg transition">{tAdmin("关闭")}</button>
        </div>
      )}
    >
      {loading ? (
        <div className="py-10 text-center text-sm text-slate-500">{tAdmin("正在加载员工 App 账号...")}</div>
      ) : !employee || !accountResponse || !account ? (
        <div className="py-10 text-center text-sm text-red-500">{tAdmin("账号信息加载失败，请关闭后重试。")}</div>
      ) : (
        <div className="space-y-5">
          <div className="rounded-xl border border-slate-200 bg-slate-50 p-4 text-sm">
            <div className="grid grid-cols-[88px_1fr] gap-y-3">
              <span className="text-slate-500">{tAdmin("姓名")}</span>
              <span className="font-semibold text-slate-800">{employee.name}</span>
              <span className="text-slate-500">{tAdmin("App 账号")}</span>
              <span className="font-mono font-semibold text-brand-700">{account.account}</span>
              <span className="text-slate-500">{tAdmin("默认密码")}</span>
              <span className="font-mono font-semibold text-slate-800">{accountResponse.defaultPassword}</span>
              <span className="text-slate-500">{tAdmin("账号状态")}</span>
              <span className={cn("font-semibold", isDisabled ? "text-amber-600" : "text-green-600")}>{isDisabled ? tAdmin("已停用") : tAdmin("可登录")}</span>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <button
              type="button"
              onClick={onCopyCredential}
              className="flex items-center justify-center gap-2 rounded-lg border border-brand-200 bg-brand-50 px-3 py-2 text-sm font-medium text-brand-700 hover:bg-brand-100"
            >
              <Copy className="w-4 h-4" />{tAdmin("复制账号密码")}</button>
            <button
              type="button"
              onClick={onResetPassword}
              disabled={actionLoading}
              className="flex items-center justify-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-60"
            >
              <RefreshCw className="w-4 h-4" />{tAdmin("重置密码")}</button>
            <button
              type="button"
              onClick={onToggleStatus}
              disabled={actionLoading}
              className={cn(
                "flex items-center justify-center gap-2 rounded-lg border px-3 py-2 text-sm font-medium disabled:opacity-60",
                isDisabled ? "border-green-200 bg-green-50 text-green-700 hover:bg-green-100" : "border-amber-200 bg-amber-50 text-amber-700 hover:bg-amber-100"
              )}
            >
              {isDisabled ? <ToggleRight className="w-4 h-4" /> : <ToggleLeft className="w-4 h-4" />}
              {isDisabled ? tAdmin("启用") : tAdmin("停用")}
            </button>
          </div>

          <p className="text-xs leading-5 text-slate-500">{tAdmin("第一版员工端登录只使用这里的 App 账号和默认/重置密码；后台 Google 管理员账号不与员工账号混用。")}</p>
        </div>
      )}
    </Modal>
  );
}

export function StatusActionModal({
  isOpen,
  onClose,
  onConfirm,
  employee,
  loading = false
}: {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  employee: Employee | null;
  loading?: boolean;
}) {
  return (
    <div className={cn("fixed inset-0 bg-black/40 backdrop-blur-sm z-50 flex items-center justify-center p-4", !isOpen && "hidden")}>
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-sm fade-in p-6 text-center">
        <div className="w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4 bg-rose-100 text-rose-600">
          <UserRoundMinus className="w-8 h-8" />
        </div>
        <h3 className="text-lg font-bold text-slate-800 mb-2">{tAdmin("确认将该员工标记为离职？")}</h3>
        <p className="text-sm text-slate-500 mb-6">
          {tAdmin("离职后，{{name}} 不会参与新的考勤和薪资核算，历史考勤和薪资记录仍可查询。", { name: employee?.name || tAdmin("该员工") })}
        </p>
        <div className="flex gap-3 justify-center">
          <button onClick={onClose} className="px-4 py-2 text-sm font-medium text-slate-600 hover:bg-slate-100 rounded-lg transition">{tAdmin("取消")}</button>
          <button onClick={onConfirm} disabled={loading} className="px-4 py-2 text-sm font-medium text-white rounded-lg shadow-md transition disabled:opacity-60 bg-rose-600 hover:bg-rose-700">
            {loading ? tAdmin("处理中...") : tAdmin("确认离职")}
          </button>
        </div>
      </div>
    </div>
  );
}

const DEFAULT_ATTENDANCE_RULE_FORM: AttendanceRuleFormData = {
  name: "",
  isActive: true,
  effectiveStartDate: TODAY_DATE_KEY,
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
        effectiveStartDate: TODAY_DATE_KEY,
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
      setError(tAdmin("规则名称不能为空"));
      return;
    }

    if (!formData.effectiveStartDate) {
      setError(tAdmin("生效开始日期不能为空"));
      return;
    }

    if (formData.effectiveEndDate && formData.effectiveEndDate < formData.effectiveStartDate) {
      setError(tAdmin("生效结束日期不能早于生效开始日期"));
      return;
    }

    if (!formData.startShift || !formData.endShift || !formData.breakStart || !formData.breakEnd) {
      setError(tAdmin("请完整填写班次和休息时间"));
      return;
    }

    if (computedStandardHours <= 0) {
      setError(tAdmin("标准工时必须大于 0，请检查班次和休息时间"));
      return;
    }

    const otHourlyFee = formData.otHourlyFee === "" ? null : Number(formData.otHourlyFee);
    if (formData.overtimeEnabled && (otHourlyFee === null || Number.isNaN(otHourlyFee) || otHourlyFee < 0)) {
      setError(tAdmin("启用加班时，请填写大于等于 0 的加班费标准"));
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
      title={rule ? tAdmin("编辑考勤规则") : tAdmin("新增考勤规则")}
      className="max-w-4xl"
      bodyClassName="flex-1 min-h-0 p-0"
      footer={(
        <div className="space-y-3">
          {error ? (
            <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>
          ) : null}
          <div className="flex justify-end gap-3">
            <button type="button" onClick={onClose} className="rounded-lg px-4 py-2 text-sm font-medium text-slate-500 transition hover:bg-slate-100">{tAdmin("取消")}</button>
            <button
              type="submit"
              form="attendance-rule-form"
              disabled={saving}
              className="rounded-lg bg-brand-600 px-6 py-2 text-sm font-medium text-white shadow-md transition hover:bg-brand-700 disabled:opacity-60"
            >
              {saving ? tAdmin("保存中...") : tAdmin("保存规则")}
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
                <h4 className="mb-3 text-sm font-semibold text-slate-800">{tAdmin("基础信息")}</h4>
                <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                  <div>
                    <FieldLabel>{tAdmin("规则名称")}</FieldLabel>
                    <input
                      name="name"
                      value={formData.name}
                      onChange={handleChange}
                      className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-brand-500"
                    />
                  </div>
                  <div>
                    <FieldLabel>{tAdmin("是否启用")}</FieldLabel>
                    <label className="flex items-center gap-3 rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-700">
                      <input
                        type="checkbox"
                        name="isActive"
                        checked={formData.isActive}
                        onChange={handleChange}
                        className="h-4 w-4 accent-brand-600"
                      />{tAdmin("允许新员工选择该规则")}</label>
                  </div>
                  <div>
                    <FieldLabel>{tAdmin("生效开始日期")}</FieldLabel>
                    <input
                      type="date"
                      name="effectiveStartDate"
                      max={TODAY_DATE_KEY}
                      value={formData.effectiveStartDate}
                      onChange={handleChange}
                      className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-brand-500"
                    />
                  </div>
                  <div>
                    <FieldLabel>{tAdmin("生效结束日期")}</FieldLabel>
                    <input
                      type="date"
                      name="effectiveEndDate"
                      max={TODAY_DATE_KEY}
                      value={formData.effectiveEndDate || ""}
                      onChange={handleChange}
                      className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-brand-500"
                    />
                  </div>
                </div>
              </section>

              <section className="border-t border-slate-100 pt-5">
                <h4 className="mb-3 text-sm font-semibold text-slate-800">{tAdmin("班次时间")}</h4>
                <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                  <div>
                    <FieldLabel>{tAdmin("上班时间")}</FieldLabel>
                    <input type="time" name="startShift" value={formData.startShift} onChange={handleChange} className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-brand-500" />
                  </div>
                  <div>
                    <FieldLabel>{tAdmin("下班时间")}</FieldLabel>
                    <input type="time" name="endShift" value={formData.endShift} onChange={handleChange} className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-brand-500" />
                  </div>
                  <div>
                    <FieldLabel>{tAdmin("休息开始时间")}</FieldLabel>
                    <input type="time" name="breakStart" value={formData.breakStart} onChange={handleChange} className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-brand-500" />
                  </div>
                  <div>
                    <FieldLabel>{tAdmin("休息结束时间")}</FieldLabel>
                    <input type="time" name="breakEnd" value={formData.breakEnd} onChange={handleChange} className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-brand-500" />
                  </div>
                  <div>
                    <FieldLabel>{tAdmin("标准工时")}</FieldLabel>
                    <div className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-700">
                      <div className="font-semibold text-slate-800">{tAdmin("{{hours}} 小时", { hours: computedStandardHours.toFixed(2) })}</div>
                      <div className="mt-1 text-xs text-slate-500">{tAdmin("根据班次时间自动计算，不需要手动填写")}</div>
                    </div>
                  </div>
                </div>
              </section>

              <section className="border-t border-slate-100 pt-5">
                <h4 className="mb-3 text-sm font-semibold text-slate-800">{tAdmin("加班规则")}</h4>
                <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                  <div>
                    <FieldLabel>{tAdmin("是否启用加班")}</FieldLabel>
                    <label className="flex items-center gap-3 rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-700">
                      <input
                        type="checkbox"
                        name="overtimeEnabled"
                        checked={formData.overtimeEnabled}
                        onChange={handleChange}
                        className="h-4 w-4 accent-brand-600"
                      />{tAdmin("启用加班计算")}</label>
                  </div>
                  <div>
                    <FieldLabel>{tAdmin("加班费标准 (THB / 小时)")}</FieldLabel>
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
                      <span className="px-3 text-xs text-slate-500">{tAdmin("/ 小时")}</span>
                    </div>
                  </div>
                </div>
                <div className="mt-3 rounded-lg border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-600">{tAdmin("加班计量说明：按 0.5 小时为最小单位，向下取整。")}</div>
              </section>
            </div>

            <aside className="space-y-4">
              <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
                <h4 className="mb-3 text-sm font-semibold text-slate-800">{tAdmin("保存影响")}</h4>
                <p className="text-sm leading-6 text-slate-600">{tAdmin("如果该规则已被员工引用，保存修改后，关联员工后续考勤计算将按新规则执行。如重新计算历史考勤，历史结果也可能变化。")}</p>
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
      title={tAdmin("关联员工 · {{ruleName}}", { ruleName })}
      className="max-w-4xl"
      bodyClassName="max-h-[calc(90vh-162px)] overflow-y-auto"
      footer={(
        <div className="flex justify-end">
          <button onClick={onClose} className="rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-50">{tAdmin("关闭")}</button>
        </div>
      )}
    >
      {loading ? (
        <div className="py-10 text-center text-sm text-slate-500">{tAdmin("正在加载关联员工...")}</div>
      ) : employees.length === 0 ? (
        <div className="py-10 text-center text-sm text-slate-500">{tAdmin("当前没有员工关联此考勤规则。")}</div>
      ) : (
        <div className="space-y-3">
          {employees.map((employee) => (
            <div key={`${employee.id}-${employee.relationStartDate}`} className="rounded-xl border border-slate-200 bg-slate-50 p-4">
              <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
                <div>
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-sm font-semibold text-slate-800">{employee.name}</span>
                    <span className="text-[10px] px-2 py-0.5 rounded-full bg-white text-slate-600 border border-slate-200">{employee.employeeNo}</span>
                    <span className={cn("text-[10px] px-2 py-0.5 rounded-full", getEmployeeStatusMeta(employee.status).className)}>
                      {getEmployeeStatusMeta(employee.status).label}
                    </span>
                    {employee.isCurrentRelation && (
                      <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-700">{tAdmin("当前有效")}</span>
                    )}
                  </div>
                  <div className="mt-2 text-sm text-slate-500">
                    {employee.dept} · {employee.role}
                  </div>
                </div>
                <div className="text-sm text-slate-500 md:text-right">
                  <div>{tAdmin("关联开始：{{date}}", { date: employee.relationStartDate })}</div>
                  <div>{tAdmin("关联结束：{{date}}", { date: employee.relationEndDate || tAdmin("长期有效") })}</div>
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
      title={isDisable ? tAdmin("确认停用该考勤规则？") : tAdmin("确认启用该考勤规则？")}
      className="max-w-md"
      footer={(
        <div className="flex justify-end gap-3">
          <button onClick={onClose} className="rounded-lg px-4 py-2 text-sm font-medium text-slate-600 transition hover:bg-slate-100">{tAdmin("取消")}</button>
          <button
            onClick={onConfirm}
            disabled={loading}
            className={cn(
              "rounded-lg px-4 py-2 text-sm font-medium text-white shadow-md transition disabled:opacity-60",
              isDisable ? "bg-amber-600 hover:bg-amber-700" : "bg-emerald-600 hover:bg-emerald-700"
            )}
          >
            {loading ? tAdmin("处理中...") : isDisable ? tAdmin("确认停用") : tAdmin("确认启用")}
          </button>
        </div>
      )}
    >
      <div className="text-sm leading-6 text-slate-500">
          {isDisable
            ? tAdmin("停用后，该规则不再允许新员工选择或员工新切换到该规则，但已关联员工可继续使用，历史考勤不受影响。是否确认停用？")
            : tAdmin("启用后，该规则会重新出现在员工管理的可选规则列表中，可用于新员工选择或员工切换规则。")}
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
      setError(tAdmin("请完整填写大于等于 0 的数字配置"));
      return;
    }

    onSave({
      ...formData,
      ...numericConfig
    });
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={tAdmin("考勤与加班规则设置")} className="max-w-lg">
      <form onSubmit={handleSubmit} className="space-y-5">
        <div className="grid grid-cols-2 gap-4">
          <div className="bg-blue-50 p-3 rounded-lg border border-blue-100">
            <label className="block text-xs font-semibold text-blue-800 mb-2 uppercase">{tAdmin("上班时间")}</label>
            <input type="time" name="startShift" value={formData.startShift} onChange={handleChange} required className="w-full px-3 py-2 bg-white border border-blue-200 rounded-md text-slate-700 focus:ring-2 focus:ring-blue-500 outline-none font-mono text-center" />
          </div>
          <div className="bg-blue-50 p-3 rounded-lg border border-blue-100">
            <label className="block text-xs font-semibold text-blue-800 mb-2 uppercase">{tAdmin("下班时间")}</label>
            <input type="time" name="endShift" value={formData.endShift} onChange={handleChange} required className="w-full px-3 py-2 bg-white border border-blue-200 rounded-md text-slate-700 focus:ring-2 focus:ring-blue-500 outline-none font-mono text-center" />
          </div>
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div className="bg-amber-50 p-3 rounded-lg border border-amber-100">
            <label className="block text-xs font-semibold text-amber-800 mb-2 uppercase">{tAdmin("午休开始")}</label>
            <input type="time" name="breakStart" value={formData.breakStart} onChange={handleChange} required className="w-full px-3 py-2 bg-white border border-amber-200 rounded-md text-slate-700 focus:ring-2 focus:ring-amber-500 outline-none font-mono text-center" />
          </div>
          <div className="bg-amber-50 p-3 rounded-lg border border-amber-100">
            <label className="block text-xs font-semibold text-amber-800 mb-2 uppercase">{tAdmin("午休结束")}</label>
            <input type="time" name="breakEnd" value={formData.breakEnd} onChange={handleChange} required className="w-full px-3 py-2 bg-white border border-amber-200 rounded-md text-slate-700 focus:ring-2 focus:ring-amber-500 outline-none font-mono text-center" />
          </div>
        </div>
        <div className="bg-green-50 p-3 rounded-lg border border-green-100">
          <label className="block text-xs font-semibold text-green-800 mb-2 uppercase">{tAdmin("加班费标准 (泰铢/小时)")}</label>
          <div className="flex items-center gap-2">
            <span className="text-lg font-bold text-green-700">฿</span>
            <input type="number" name="otHourlyFee" step="0.01" min="0" value={formData.otHourlyFee} onChange={handleChange} required className="w-full px-3 py-2 bg-white border border-green-200 rounded-md text-slate-700 focus:ring-2 focus:ring-green-500 outline-none font-mono text-lg" />
            <span className="text-sm text-slate-500 whitespace-nowrap">{tAdmin("/ 小时")}</span>
          </div>
        </div>
        {error ? (
          <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>
        ) : null}
        <div className="flex justify-end gap-3 pt-2 border-t border-slate-100">
          <button type="button" onClick={onReset} className="px-4 py-2 text-sm font-medium text-slate-500 hover:bg-slate-100 rounded-lg transition">{tAdmin("恢复默认")}</button>
          <button type="submit" className="px-6 py-2 text-sm font-medium text-white bg-brand-600 hover:bg-brand-700 rounded-lg shadow-md transition">{tAdmin("保存规则")}</button>
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
    <Modal isOpen={isOpen} onClose={onClose} title={tAdmin("调整考勤记录")} className="max-w-lg">
      <form onSubmit={(e) => { e.preventDefault(); onSave(formData); }} className="space-y-5">
        {employee && (
          <div className="bg-slate-50 rounded-lg p-3 text-sm text-slate-600">{tAdmin("员工:")}<span className="font-bold text-slate-800">{employee.name}</span>
          </div>
        )}
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-medium text-slate-500 mb-1 uppercase">{tAdmin("日期")}</label>
            <input type="date" name="date" max={TODAY_DATE_KEY} value={formData.date} onChange={handleChange} required className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-brand-500 outline-none text-sm" />
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-500 mb-1 uppercase">{tAdmin("考勤类型")}</label>
            <select name="type" value={formData.type} onChange={handleChange} className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-brand-500 outline-none text-sm bg-white">
              <option value="normal">{tAdmin("正常")}</option>
              <option value="late">{tAdmin("迟到")}</option>
              <option value="early">{tAdmin("早退")}</option>
              <option value="absent">{tAdmin("缺勤")}</option>
              <option value="leave">{tAdmin("假期")}</option>
              <option value="overtime">{tAdmin("加班")}</option>
            </select>
          </div>
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-medium text-slate-500 mb-1 uppercase">{tAdmin("上班时间")}</label>
            <input type="time" name="inTime" value={formData.inTime} onChange={handleChange} required className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-brand-500 outline-none text-sm font-mono text-center" />
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-500 mb-1 uppercase">{tAdmin("下班时间")}</label>
            <input type="time" name="outTime" value={formData.outTime} onChange={handleChange} required className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-brand-500 outline-none text-sm font-mono text-center" />
          </div>
        </div>
        <div>
          <label className="block text-xs font-medium text-slate-500 mb-1 uppercase">{tAdmin("调整备注")}</label>
          <textarea name="note" rows={2} value={formData.note} onChange={handleChange} className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-brand-500 outline-none text-sm resize-none" placeholder={tAdmin("如：设备故障导致漏打卡...")}></textarea>
        </div>
        <div className="flex justify-end gap-3 pt-2 border-t border-slate-100">
          <button type="button" onClick={onClose} className="px-4 py-2 text-sm font-medium text-slate-500 hover:bg-slate-100 rounded-lg transition">{tAdmin("取消")}</button>
          <button type="submit" className="px-6 py-2 text-sm font-medium text-white bg-brand-600 hover:bg-brand-700 rounded-lg shadow-md transition">{tAdmin("保存调整")}</button>
        </div>
      </form>
    </Modal>
  );
}
