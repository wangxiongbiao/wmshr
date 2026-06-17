/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { Search, Plus, Edit, Trash2 } from "lucide-react";
import { Employee } from "../types";
import { cn, formatCurrency, COUNTRY_FLAGS, COUNTRY_NAMES } from "../lib/utils";
import { useState } from "react";

interface EmployeeListProps {
  employees: Employee[];
  onAddEmployee: () => void;
  onEditEmployee: (emp: Employee) => void;
  onDeleteEmployee: (emp: Employee) => void;
}

export function EmployeeList({ employees, onAddEmployee, onEditEmployee, onDeleteEmployee }: EmployeeListProps) {
  const [query, setSearchQuery] = useState("");

  const filteredEmployees = employees.filter(emp => 
    emp.name.toLowerCase().includes(query.toLowerCase()) ||
    emp.role.toLowerCase().includes(query.toLowerCase()) ||
    emp.dept.toLowerCase().includes(query.toLowerCase())
  );

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-6 gap-4">
        <div className="relative w-full sm:w-72">
          <input
            type="text"
            value={query}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="搜索姓名、职位或区域..."
            className="w-full pl-10 pr-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-brand-500 focus:border-transparent outline-none text-sm bg-white"
          />
          <Search className="w-5 h-5 absolute left-3 top-2.5 text-slate-400" />
        </div>
        <button
          onClick={onAddEmployee}
          className="bg-brand-600 hover:bg-brand-700 text-white px-4 py-2 rounded-lg text-sm font-medium shadow-md transition flex items-center gap-2"
        >
          <Plus className="w-4 h-4" /> 新增员工
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
        {filteredEmployees.map(emp => (
          <div key={emp.id} className="glass-panel rounded-xl p-5 hover:shadow-md transition-all duration-300 flex flex-col relative group">
            <div className="absolute top-4 right-4 opacity-0 group-hover:opacity-100 transition-opacity flex gap-2 z-10">
              <button
                onClick={() => onEditEmployee(emp)}
                className="p-1.5 bg-white rounded-lg shadow-sm border border-slate-200 hover:bg-slate-50 text-slate-600"
                title="编辑"
              >
                <Edit className="w-4 h-4" />
              </button>
              <button
                onClick={() => onDeleteEmployee(emp)}
                className="p-1.5 bg-white rounded-lg shadow-sm border border-red-200 hover:bg-red-50 text-red-500"
                title="删除"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
            <div className="flex items-start gap-4 mb-4">
              <div className="w-16 h-16 rounded-full bg-slate-100 border-2 border-slate-200 overflow-hidden flex-shrink-0 flex items-center justify-center">
                {emp.photo ? (
                  <img src={emp.photo} className="w-full h-full object-cover" alt={emp.name} />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-slate-400 bg-slate-50 text-lg font-bold">
                    {emp.name.charAt(0)}
                  </div>
                )}
              </div>
              <div className="flex-1 min-w-0 pr-8">
                <h3 className="text-base font-bold text-slate-800 truncate">{emp.name}</h3>
                <div className="flex items-center gap-2 mt-1 flex-wrap">
                  <span className="text-lg" title={COUNTRY_NAMES[emp.country]}>{COUNTRY_FLAGS[emp.country]}</span>
                  <span className="text-[10px] text-slate-500 bg-slate-100 px-2 py-0.5 rounded-full">{COUNTRY_NAMES[emp.country]}</span>
                  <span className={cn(
                    "text-[10px] px-2 py-0.5 rounded-full",
                    emp.gender === 'female' ? 'text-pink-600 bg-pink-50' : 'text-blue-600 bg-blue-50'
                  )}>
                    {emp.gender === 'female' ? '女' : '男'}
                  </span>
                  <span className={cn(
                    "text-[10px] px-2 py-0.5 rounded-full",
                    emp.status === '在职' ? 'bg-green-100 text-green-700' : 'bg-blue-100 text-blue-700'
                  )}>
                    {emp.status}
                  </span>
                </div>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3 mb-2 text-sm border-t border-slate-100 pt-3">
              <div>
                <p className="text-[10px] text-slate-400 uppercase tracking-wide">职位</p>
                <p className="font-medium text-slate-700 truncate">{emp.role}</p>
              </div>
              <div>
                <p className="text-[10px] text-slate-400 uppercase tracking-wide">区域</p>
                <p className="font-medium text-slate-700 truncate">{emp.dept || '-'}</p>
              </div>
              <div>
                <p className="text-[10px] text-slate-400 uppercase tracking-wide">时薪</p>
                <p className="font-semibold text-slate-700">
                  {emp.baseMonthlyWage !== undefined && emp.baseMonthlyWage > 0 ? (
                    <span title="由基础月工资换算：(月薪/30)/8 小时 font-mono">
                      {formatCurrency((emp.baseMonthlyWage / 30) / 8, emp.currency)} <span className="text-[9px] text-slate-400 font-normal">(折算)</span>
                    </span>
                  ) : (
                    emp.hourlyRate !== undefined && emp.hourlyRate > 0 ? formatCurrency(emp.hourlyRate, emp.currency) : '-'
                  )}
                </p>
              </div>
              <div>
                <p className="text-[10px] text-slate-400 uppercase tracking-wide">基础工资 (月薪)</p>
                <p className="font-semibold text-brand-600 font-mono">
                  {emp.baseMonthlyWage !== undefined && emp.baseMonthlyWage > 0 
                    ? formatCurrency(emp.baseMonthlyWage, emp.currency) 
                    : <span className="text-xs text-slate-400 font-normal">无 (按时薪计算)</span>}
                </p>
              </div>
              <div>
                <p className="text-[10px] text-slate-400 uppercase tracking-wide">全勤奖</p>
                <p className="font-semibold text-emerald-600 font-mono">
                  {emp.attendanceBonus !== undefined && emp.attendanceBonus > 0 
                    ? formatCurrency(emp.attendanceBonus, emp.currency) 
                    : <span className="text-xs text-slate-450 font-normal">-</span>}
                </p>
              </div>
              <div>
                <p className="text-[10px] text-slate-400 uppercase tracking-wide">社保</p>
                <p className="font-semibold text-rose-600 font-mono">
                  {emp.socialSecurity !== undefined && emp.socialSecurity > 0 
                    ? formatCurrency(emp.socialSecurity, emp.currency) 
                    : <span className="text-xs text-slate-450 font-normal">-</span>}
                </p>
              </div>
              <div>
                <p className="text-[10px] text-slate-400 uppercase tracking-wide">币种</p>
                <p className="font-medium text-slate-700">{emp.currency}</p>
              </div>
              <div>
                <p className="text-[10px] text-slate-400 uppercase tracking-wide">入职</p>
                <p className="font-medium text-slate-700">{emp.joinDate}</p>
              </div>
            </div>
          </div>
        ))}
      </div>
      <div className="mt-6 text-center text-sm text-slate-400">共 {employees.length} 名员工</div>
    </div>
  );
}
