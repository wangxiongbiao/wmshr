/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { X, Upload, Trash2 } from "lucide-react";
import { AppConfig, Employee, AttendanceRecord, CurrencyCode, CountryCode } from "../types";
import { cn } from "../lib/utils";
import React, { useState, useEffect } from "react";

interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  children: React.ReactNode;
  title: string;
  className?: string;
}

function Modal({ isOpen, onClose, children, title, className }: ModalProps) {
  if (!isOpen) return null;
  return (
    <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className={cn("bg-white rounded-xl shadow-2xl w-full fade-in overflow-hidden max-h-[90vh] flex flex-col", className)}>
        <div className="bg-slate-50 px-6 py-4 border-b border-slate-100 flex justify-between items-center flex-shrink-0">
          <h3 className="text-lg font-bold text-slate-800">{title}</h3>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600 transition">
            <X className="w-5 h-5" />
          </button>
        </div>
        <div className="overflow-y-auto p-6">
          {children}
        </div>
      </div>
    </div>
  );
}

// --- Employee Modal ---
interface EmployeeModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (emp: Partial<Employee>) => void;
  employee: Employee | null;
}

export function EmployeeModal({ isOpen, onClose, onSave, employee }: EmployeeModalProps) {
  const [formData, setFormData] = useState<Partial<Employee>>({
    name: '', gender: 'female', country: 'MM', role: '拣货员', dept: '', hourlyRate: undefined, baseMonthlyWage: undefined, attendanceBonus: undefined, socialSecurity: undefined, currency: 'THB', joinDate: new Date().toISOString().split('T')[0], status: '在职', photo: null
  });
  const [errorMsg, setErrorMsg] = useState("");

  useEffect(() => {
    setErrorMsg("");
    if (isOpen) {
      if (employee) {
        setFormData(employee);
      } else {
        setFormData({
          name: '', gender: 'female', country: 'MM', role: '拣货员', dept: '', hourlyRate: undefined, baseMonthlyWage: undefined, attendanceBonus: undefined, socialSecurity: undefined, currency: 'THB', joinDate: new Date().toISOString().split('T')[0], status: '在职', photo: null
        });
      }
    }
  }, [employee, isOpen]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | React.SelectElement>) => {
    const { name, value } = e.target;
    let finalValue: any = value;
    if (name === 'hourlyRate' || name === 'baseMonthlyWage' || name === 'attendanceBonus' || name === 'socialSecurity') {
      finalValue = value === "" ? undefined : parseFloat(value);
      if (finalValue !== undefined && isNaN(finalValue)) {
        finalValue = undefined;
      }
    }
    setErrorMsg("");
    setFormData(prev => ({ 
      ...prev, 
      [name]: finalValue
    }));
  };

  const handlePhotoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (ev) => {
        setFormData(prev => ({ ...prev, photo: ev.target?.result as string }));
      };
      reader.readAsDataURL(file);
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={employee ? "编辑员工档案" : "新增员工档案"} className="max-w-2xl">
      <form onSubmit={(e) => {
        e.preventDefault();
        const hasBaseWage = formData.baseMonthlyWage !== undefined && formData.baseMonthlyWage !== null && formData.baseMonthlyWage > 0;
        const hasHourlyRate = formData.hourlyRate !== undefined && formData.hourlyRate !== null && formData.hourlyRate > 0;
        if (!hasBaseWage && !hasHourlyRate) {
          setErrorMsg("请至少输入“时薪”或“基础工资（为月工资）”其中的一项！");
          return;
        }
        onSave(formData);
      }} className="space-y-5">
        {errorMsg && (
          <div className="p-3 text-sm text-red-600 bg-red-50 rounded-lg border border-red-200">
            {errorMsg}
          </div>
        )}
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
            {formData.photo && (
              <button type="button" onClick={() => setFormData(prev => ({ ...prev, photo: null }))} className="text-xs text-red-500 hover:text-red-700 font-medium mt-1">移除</button>
            )}
          </div>
          <div className="flex-1 grid grid-cols-2 gap-4">
            <div className="col-span-2">
              <label className="block text-xs font-medium text-slate-500 mb-1 uppercase">姓名</label>
              <input type="text" name="name" value={formData.name || ''} onChange={handleChange} required className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-brand-500 focus:border-transparent outline-none text-sm" placeholder="请输入员工姓名" />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-500 mb-1 uppercase">性别</label>
              <select name="gender" value={formData.gender} onChange={handleChange} className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-brand-500 outline-none text-sm bg-white">
                <option value="female">女</option>
                <option value="male">男</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-500 mb-1 uppercase">来源国家</label>
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
            <label className="block text-xs font-medium text-slate-500 mb-1 uppercase">职位</label>
            <select name="role" value={formData.role} onChange={handleChange} className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-brand-500 outline-none text-sm bg-white">
              {['拣货员', '打包员', '叉车工', '质检员', '组长', '仓管员'].map(r => <option key={r}>{r}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-500 mb-1 uppercase">所属区域</label>
            <input type="text" name="dept" value={formData.dept || ''} onChange={handleChange} className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-brand-500 outline-none text-sm" placeholder="如：A区-入库" />
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-500 mb-1 uppercase">时薪 (不输则根据基础薪资折算)</label>
            <input type="number" name="hourlyRate" step="0.5" value={formData.hourlyRate !== undefined ? formData.hourlyRate : ''} onChange={handleChange} className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-brand-500 outline-none text-sm" placeholder="如: 300" />
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-500 mb-1 uppercase">基础工资（为月工资，如果不输，则按时薪计）</label>
            <input type="number" name="baseMonthlyWage" step="100" value={formData.baseMonthlyWage !== undefined ? formData.baseMonthlyWage : ''} onChange={handleChange} className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-brand-500 outline-none text-sm" placeholder="如: 60000" />
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-500 mb-1 uppercase">全勤奖</label>
            <input type="number" name="attendanceBonus" step="1" value={formData.attendanceBonus !== undefined ? formData.attendanceBonus : ''} onChange={handleChange} className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-brand-500 outline-none text-sm" placeholder="如: 1000" />
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-500 mb-1 uppercase">社保</label>
            <input type="number" name="socialSecurity" step="1" value={formData.socialSecurity !== undefined ? formData.socialSecurity : ''} onChange={handleChange} className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-brand-500 outline-none text-sm" placeholder="如: 750" />
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-500 mb-1 uppercase">工资币种</label>
            <select name="currency" value={formData.currency} onChange={handleChange} className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-brand-500 outline-none text-sm bg-white">
              <option value="THB">泰铢 (฿ THB)</option>
              <option value="USD">美金 ($ USD)</option>
              <option value="MYR">马币 (RM MYR)</option>
              <option value="IDR">印尼盾 (Rp IDR)</option>
            </select>
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-500 mb-1 uppercase">入职日期</label>
            <input type="date" name="joinDate" value={formData.joinDate} onChange={handleChange} required className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-brand-500 outline-none text-sm" />
          </div>
        </div>
        <div className="flex justify-end gap-3 pt-2 border-t border-slate-100">
          <button type="button" onClick={onClose} className="px-4 py-2 text-sm font-medium text-slate-500 hover:bg-slate-100 rounded-lg transition">取消</button>
          <button type="submit" className="px-6 py-2 text-sm font-medium text-white bg-brand-600 hover:bg-brand-700 rounded-lg shadow-md transition">保存员工档案</button>
        </div>
      </form>
    </Modal>
  );
}

// --- Delete Modal ---
export function DeleteModal({ isOpen, onClose, onConfirm, employeeName }: { isOpen: boolean, onClose: () => void, onConfirm: () => void, employeeName: string }) {
  return (
    <div className={cn("fixed inset-0 bg-black/40 backdrop-blur-sm z-50 flex items-center justify-center p-4", !isOpen && "hidden")}>
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-sm fade-in p-6 text-center">
        <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center text-red-500 mx-auto mb-4">
          <Trash2 className="w-8 h-8" />
        </div>
        <h3 className="text-lg font-bold text-slate-800 mb-2">确认删除员工?</h3>
        <p className="text-sm text-slate-500 mb-6">此操作将永久删除员工 {employeeName} 的档案，无法恢复。</p>
        <div className="flex gap-3 justify-center">
          <button onClick={onClose} className="px-4 py-2 text-sm font-medium text-slate-600 hover:bg-slate-100 rounded-lg transition">取消</button>
          <button onClick={onConfirm} className="px-4 py-2 text-sm font-medium text-white bg-red-600 hover:bg-red-700 rounded-lg shadow-md transition">确认删除</button>
        </div>
      </div>
    </div>
  );
}

// --- Settings Modal ---
export function SettingsModal({ isOpen, onClose, onSave, onReset, config }: { isOpen: boolean, onClose: () => void, onSave: (cfg: AppConfig) => void, onReset: () => void, config: AppConfig }) {
  const [formData, setFormData] = useState<AppConfig>(config);

  useEffect(() => {
    setFormData(config);
  }, [config, isOpen]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: (name === 'otHourlyFee' || name === 'standardHours' || name === 'overtimeMultiplier' || name === 'taxRate' || name === 'dailyBreakMinutes') ? parseFloat(value) : value }));
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="考勤与加班规则设置" className="max-w-lg">
      <form onSubmit={(e) => { e.preventDefault(); onSave(formData); }} className="space-y-5">
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
        <div className="flex justify-end gap-3 pt-2 border-t border-slate-100">
          <button type="button" onClick={onReset} className="px-4 py-2 text-sm font-medium text-slate-500 hover:bg-slate-100 rounded-lg transition">恢复默认</button>
          <button type="submit" className="px-6 py-2 text-sm font-medium text-white bg-brand-600 hover:bg-brand-700 rounded-lg shadow-md transition">保存规则</button>
        </div>
      </form>
    </Modal>
  );
}

// --- Attendance Adjustment Modal ---
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

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | React.SelectElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const emp = employees.find(e => e.id === record?.empId);

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="调整考勤记录" className="max-w-lg">
      <form onSubmit={(e) => { e.preventDefault(); onSave(formData); }} className="space-y-5">
        {emp && (
          <div className="bg-slate-50 border border-slate-100 rounded-xl p-3 flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-slate-200 flex items-center justify-center text-slate-600 font-bold overflow-hidden border border-slate-200 shadow-sm flex-shrink-0">
              {emp.photo ? (
                <img src={emp.photo} className="w-full h-full object-cover" alt={emp.name} />
              ) : (
                <span className="text-sm">{emp.name.charAt(0)}</span>
              )}
            </div>
            <div>
              <div className="text-[11px] text-slate-400 font-medium">考勤当事人</div>
              <div className="text-sm font-bold text-slate-800">
                {emp.name}
                <span className="text-xs font-normal text-slate-500 ml-2">({emp.dept} · {emp.role})</span>
              </div>
            </div>
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
