import React from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  ArrowLeft,
  ShieldCheck,
  Sun,
  Moon,
  Search,
  X,
  UserPlus,
  Loader2,
  CheckCircle,
  History,
  Check,
  RefreshCw,
  Camera
} from 'lucide-react';
import { Employee, AttendanceRecord } from '../types';

interface BiometricTerminalProps {
  isFaceAttendanceOpen: boolean;
  setIsFaceAttendanceOpen: (open: boolean) => void;
  faceAttendanceTab: 'scan' | 'batch';
  setFaceAttendanceTab: (tab: 'scan' | 'batch') => void;
  faceScanMode: 'in' | 'out';
  setFaceScanMode: (mode: 'in' | 'out') => void;
  faceScanResult: any;
  setFaceScanResult: (result: any) => void;
  faceSelectedEmpId: string;
  setFaceSelectedEmpId: (id: string) => void;
  empSearchQuery: string;
  setEmpSearchQuery: (q: string) => void;
  employees: Employee[];
  triggerFaceRecognitionPunch: () => void;
  isFaceScanning: boolean;
  simulatedDate: string;
  faceScanHistory: any[];
  attendanceStatusFilter: 'all' | 'not_punched' | 'punched';
  setAttendanceStatusFilter: (filter: 'all' | 'not_punched' | 'punched') => void;
  batchTimeSource: 'shift' | 'current' | 'custom';
  setBatchTimeSource: (source: 'shift' | 'current' | 'custom') => void;
  batchCustomTime: string;
  setBatchCustomTime: (time: string) => void;
  config: any;
  handleBatchPunch: (type: 'in' | 'out', time?: string) => void;
  attendance: AttendanceRecord[];
  selectedDeptFilter: string;
  setSelectedDeptFilter: (val: string) => void;
  batchSelectedIds: number[];
  setBatchSelectedIds: React.Dispatch<React.SetStateAction<number[]>> | ((val: any) => void);
  handleDirectPunch: (empId: number, mode: 'in' | 'out', customTime?: string) => void;
  handleResetPunch: (empId: number) => void;
  getSimulatedInTime: () => string;
}

export const BiometricTerminal: React.FC<BiometricTerminalProps> = ({
  isFaceAttendanceOpen,
  setIsFaceAttendanceOpen,
  faceAttendanceTab,
  setFaceAttendanceTab,
  faceScanMode,
  setFaceScanMode,
  faceScanResult,
  setFaceScanResult,
  faceSelectedEmpId,
  setFaceSelectedEmpId,
  empSearchQuery,
  setEmpSearchQuery,
  employees,
  triggerFaceRecognitionPunch,
  isFaceScanning,
  simulatedDate,
  faceScanHistory,
  attendanceStatusFilter,
  setAttendanceStatusFilter,
  batchTimeSource,
  setBatchTimeSource,
  batchCustomTime,
  setBatchCustomTime,
  config,
  handleBatchPunch,
  attendance,
  selectedDeptFilter,
  setSelectedDeptFilter,
  batchSelectedIds,
  setBatchSelectedIds,
  handleDirectPunch,
  handleResetPunch,
  getSimulatedInTime
}) => {
  return (
    <motion.div
      initial={{ opacity: 0, y: 50 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: 50 }}
      className="absolute inset-0 bg-slate-50 z-50 flex flex-col font-sans"
    >
      {/* Header */}
      <div className="bg-white px-4 py-3 border-b border-slate-200/80 flex items-center justify-between shadow-3xs">
        <button
          type="button"
          onClick={() => setIsFaceAttendanceOpen(false)}
          className="flex items-center gap-1 text-slate-600 hover:text-slate-800 font-bold text-xs cursor-pointer transition"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>返回</span>
        </button>
        <h4 className="text-xs font-black text-slate-800 tracking-wide flex items-center gap-1.5">
          <ShieldCheck className="w-4 h-4 text-brand-600" />
          智能考勤终端
        </h4>
        <div className="w-10" />
      </div>



      {/* Content Area */}
      <div className="flex-1 overflow-y-auto bg-slate-50">
        {faceAttendanceTab === 'scan' ? (
          <div className="p-4 space-y-4">
            {/* Top header return bar */}
            <div className="flex items-center justify-between bg-white p-2.5 px-3.5 rounded-xl border border-slate-200/80 shadow-3xs">
              <span className="text-xs font-black text-slate-800 flex items-center gap-1.5">
                <Camera className="w-4 h-4 text-brand-600" />
                人脸识别考勤终端
              </span>
              <button
                type="button"
                onClick={() => {
                  setFaceAttendanceTab('batch');
                  setFaceScanResult(null);
                }}
                className="text-[10px] font-extrabold text-slate-600 hover:text-brand-600 bg-slate-100 hover:bg-brand-50 px-2.5 py-1 rounded-lg transition cursor-pointer"
              >
                返回名册考勤
              </button>
            </div>

            {/* Mode selector buttons */}
            <div className="grid grid-cols-2 gap-2.5">
              <button
                type="button"
                onClick={() => {
                  setFaceScanMode("in");
                  setFaceScanResult(null);
                }}
                className={`py-2 rounded-xl border text-xs font-bold flex items-center justify-center gap-1.5 transition-all duration-200 cursor-pointer ${
                  faceScanMode === "in"
                    ? "bg-emerald-500 border-emerald-600 text-white font-extrabold shadow-3xs"
                    : "bg-white border-slate-200 text-slate-600 hover:bg-slate-50"
                }`}
              >
                <Sun className={`w-3.5 h-3.5 ${faceScanMode === 'in' ? 'text-white' : 'text-emerald-500'}`} />
                <span>录入上班卡</span>
              </button>
              <button
                type="button"
                onClick={() => {
                  setFaceScanMode("out");
                  setFaceScanResult(null);
                }}
                className={`py-2 rounded-xl border text-xs font-bold flex items-center justify-center gap-1.5 transition-all duration-200 cursor-pointer ${
                  faceScanMode === "out"
                    ? "bg-brand-600 border-brand-700 text-white font-extrabold shadow-3xs"
                    : "bg-white border-slate-200 text-slate-600 hover:bg-slate-50"
                }`}
              >
                <Moon className={`w-3.5 h-3.5 ${faceScanMode === 'out' ? 'text-white' : 'text-brand-500'}`} />
                <span>录入下班卡</span>
              </button>
            </div>

            {/* Selection/Verification Container */}
            <div className="bg-white border border-slate-200 p-4 rounded-2xl space-y-3.5 shadow-3xs text-left">
              <div className="flex items-center justify-between">
                <label className="text-[10px] font-black text-slate-400 tracking-wider uppercase">
                  选择比对员工
                </label>
                <span className="text-[9px] text-brand-600 font-bold bg-brand-50 px-1.5 py-0.2 rounded-full">
                  快速检索
                </span>
              </div>

              {/* Search input */}
              <div className="relative">
                <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400" />
                <input
                  type="text"
                  value={empSearchQuery}
                  onChange={(e) => setEmpSearchQuery(e.target.value)}
                  placeholder="搜索员工姓名或职位..."
                  className="w-full pl-8 pr-8 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-800 outline-none focus:bg-white focus:border-brand-500 transition"
                />
                {empSearchQuery && (
                  <button
                    type="button"
                    onClick={() => setEmpSearchQuery("")}
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 cursor-pointer"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>

              {/* Slider list of employees */}
              <div className="flex gap-2 overflow-x-auto py-1 px-0.5 max-h-[96px] scrollbar-none">
                <button
                  type="button"
                  onClick={() => {
                    setFaceSelectedEmpId("unknown");
                    setFaceScanResult(null);
                  }}
                  className={`p-2 rounded-xl border flex flex-col items-center justify-center shrink-0 w-20 text-center gap-1 transition-all ${
                    faceSelectedEmpId === "unknown"
                      ? "bg-amber-50 border-amber-300 ring-2 ring-amber-400/20"
                      : "bg-slate-50 border-slate-150 hover:bg-slate-100"
                  }`}
                >
                  <div className="w-8 h-8 rounded-full bg-amber-100 border border-amber-200 flex items-center justify-center">
                    <UserPlus className="w-4 h-4 text-amber-700" />
                  </div>
                  <span className="text-[9px] font-black text-amber-800 block truncate w-full">未匹配兼职</span>
                </button>

                {employees
                  .filter(e => e.status !== "离职" && (
                    empSearchQuery ? (
                      e.name.toLowerCase().includes(empSearchQuery.toLowerCase()) ||
                      e.role.toLowerCase().includes(empSearchQuery.toLowerCase())
                    ) : true
                  ))
                  .map(emp => {
                    const isSelected = faceSelectedEmpId === emp.id.toString();
                    return (
                      <button
                        key={emp.id}
                        type="button"
                        onClick={() => {
                          setFaceSelectedEmpId(emp.id.toString());
                          setFaceScanResult(null);
                        }}
                        className={`p-2 rounded-xl border flex flex-col items-center justify-center shrink-0 w-20 text-center gap-1 transition-all ${
                          isSelected
                            ? "bg-brand-50 border-brand-300 ring-2 ring-brand-500/10 scale-95"
                            : "bg-slate-50 border-slate-150 hover:bg-slate-100"
                        }`}
                      >
                        <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-xs text-white shadow-3xs ${
                          isSelected ? "bg-brand-600" : "bg-slate-400"
                        }`}>
                          {emp.name.charAt(0)}
                        </div>
                        <span className={`text-[9px] block truncate w-full font-bold ${
                          isSelected ? "text-brand-800 font-extrabold" : "text-slate-700"
                        }`}>{emp.name}</span>
                      </button>
                    );
                  })
                }
              </div>

              {/* Status Feedback banner */}
              <div className="p-2.5 bg-slate-50 rounded-xl border border-slate-150 text-[10px] text-slate-500 leading-relaxed font-semibold">
                {faceSelectedEmpId === "unknown" ? (
                  <span className="text-amber-700">
                    ⚠️ 比对结果：判定为<strong>外部临时兼职工</strong>（直接录入生成临时档案）
                  </span>
                ) : (
                  <span className="text-slate-600">
                    🟢 比对成功：已锁定员工 <strong>{employees.find(e => e.id.toString() === faceSelectedEmpId)?.name}</strong>
                  </span>
                )}
              </div>
            </div>

            {/* Action button */}
            <button
              type="button"
              disabled={isFaceScanning}
              onClick={triggerFaceRecognitionPunch}
              className="w-full py-2.5 rounded-xl bg-brand-600 hover:bg-brand-700 disabled:bg-slate-200 disabled:text-slate-400 text-white font-black text-xs shadow-xs active:scale-98 transition flex items-center justify-center gap-1.5 cursor-pointer"
            >
              {isFaceScanning ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 animate-spin text-white" />
                  <span>处理中...</span>
                </>
              ) : (
                <>
                  <CheckCircle className="w-3.5 h-3.5" />
                  <span>确定录入</span>
                </>
              )}
            </button>

            {/* Scan Success Box */}
            {faceScanResult && (
              <div className="bg-emerald-50 border border-emerald-200 p-3.5 rounded-2xl space-y-2.5 text-left shadow-3xs animate-in zoom-in-95 duration-150">
                <div className="flex items-center gap-1.5 text-emerald-800 font-black text-xs">
                  <CheckCircle className="w-4 h-4 text-emerald-600" />
                  <span>打卡录入成功</span>
                </div>

                <div className="flex items-center gap-3 bg-white p-2.5 rounded-xl border border-slate-100">
                  <div className="w-8 h-8 rounded-full bg-brand-600 text-white flex items-center justify-center font-bold text-xs shadow-3xs">
                    {faceScanResult.emp.name.charAt(0)}
                  </div>
                  <div>
                    <h4 className="text-xs font-black text-slate-800 flex items-center gap-1.5">
                      {faceScanResult.emp.name}
                      {faceScanResult.isNewTemp && (
                        <span className="px-1 py-0.2 bg-amber-50 border border-amber-200 text-amber-700 text-[8px] font-bold rounded">
                          临时兼职
                        </span>
                      )}
                    </h4>
                    <p className="text-[9px] text-slate-500 mt-0.5 font-semibold">
                      {faceScanResult.emp.dept} · {faceScanResult.emp.role}
                    </p>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-2 text-[9px] bg-slate-100/50 p-2 rounded-xl border border-slate-150">
                  <div>
                    <span className="text-slate-400 font-bold block">录入时间</span>
                    <span className="text-slate-700 font-extrabold font-mono mt-0.5 block">
                      {faceScanResult.punchTime}
                    </span>
                  </div>
                  <div>
                    <span className="text-slate-400 font-bold block">考勤结果</span>
                    <span className={`font-black mt-0.5 inline-flex items-center gap-1 ${
                      faceScanResult.punchMode === "in" ? "text-emerald-700" : "text-brand-700"
                    }`}>
                      {faceScanResult.punchMode === "in" ? "上班" : "下班"}
                      <span className="text-[8px] px-1 py-0.2 bg-white border border-slate-200 rounded text-slate-600 font-bold">
                        {faceScanResult.status}
                      </span>
                    </span>
                  </div>
                </div>
              </div>
            )}

            {/* History List */}
            <div className="space-y-2 text-left">
              <h5 className="text-[10px] font-black text-slate-400 tracking-wider uppercase flex items-center gap-1">
                <History className="w-3.5 h-3.5 text-slate-400" />
                今日记录 ({faceScanHistory.length})
              </h5>
              
              {faceScanHistory.length === 0 ? (
                <div className="border border-slate-150 bg-white rounded-2xl p-6 text-center text-slate-400 text-xs font-semibold">
                  暂无今日打卡记录
                </div>
              ) : (
                <div className="space-y-1.5 max-h-[150px] overflow-y-auto pr-1">
                  {faceScanHistory.map((hist, idx) => (
                    <div key={idx} className="bg-white border border-slate-150 p-2.5 rounded-xl flex items-center justify-between text-xs hover:border-slate-200 transition shadow-3xs">
                      <div className="flex items-center gap-2">
                        <span className={`w-1.5 h-1.5 rounded-full ${hist.punchMode === 'in' ? 'bg-emerald-500 animate-pulse' : 'bg-brand-500 animate-pulse'}`} />
                        <div>
                          <span className="text-slate-800 font-bold">{hist.emp.name}</span>
                          <span className="text-slate-400 text-[10px] ml-1 font-semibold">({hist.emp.role})</span>
                        </div>
                      </div>
                      <div className="flex items-center gap-1.5 font-mono">
                        <span className="text-slate-500 text-[11px] font-bold">{hist.punchTime}</span>
                        <span className={`px-1.5 py-0.5 rounded text-[10px] font-black ${
                          hist.punchMode === 'in' ? 'bg-emerald-50 text-emerald-700 border border-emerald-100' : 'bg-brand-50 text-brand-700 border border-brand-100'
                        }`}>
                          {hist.punchMode === 'in' ? '上班' : '下班'}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        ) : (
          /* Batch check list */
          <div className="p-4 space-y-4 animate-in fade-in duration-200">
            {/* Quick status counters */}
            <div className="grid grid-cols-3 gap-2">
              <div 
                onClick={() => setAttendanceStatusFilter('all')}
                className={`p-2 rounded-xl text-center cursor-pointer transition-all border ${
                  attendanceStatusFilter === 'all'
                    ? "bg-slate-800 border-slate-800 text-white shadow-3xs"
                    : "bg-white border-slate-200 text-slate-700 hover:border-slate-300"
                }`}
              >
                <span className={`text-[8.5px] font-bold block uppercase tracking-wider ${attendanceStatusFilter === 'all' ? 'text-slate-300' : 'text-slate-400'}`}>总人数</span>
                <span className="text-xs font-black mt-0.5 block font-sans">
                  {employees.filter(e => e.status !== "离职").length} <span className="text-[9px] font-normal">人</span>
                </span>
              </div>
              <div 
                onClick={() => setAttendanceStatusFilter('punched')}
                className={`p-2 rounded-xl text-center cursor-pointer transition-all border ${
                  attendanceStatusFilter === 'punched'
                    ? "bg-emerald-600 border-emerald-600 text-white shadow-3xs"
                    : "bg-white border-slate-200 text-emerald-600 hover:border-slate-300"
                }`}
              >
                <span className={`text-[8.5px] font-bold block uppercase tracking-wider ${attendanceStatusFilter === 'punched' ? 'text-emerald-100' : 'text-emerald-500'}`}>已到工</span>
                <span className="text-xs font-black mt-0.5 block font-sans">
                  {employees.filter(e => e.status !== "离职" && attendance.some(a => a.empId === e.id && a.date === simulatedDate && a.inTime)).length} <span className="text-[9px] font-normal">人</span>
                </span>
              </div>
              <div 
                onClick={() => setAttendanceStatusFilter('not_punched')}
                className={`p-2 rounded-xl text-center cursor-pointer transition-all border ${
                  attendanceStatusFilter === 'not_punched'
                    ? "bg-rose-600 border-rose-600 text-white shadow-3xs"
                    : "bg-white border-slate-200 text-rose-600 hover:border-slate-300"
                }`}
              >
                <span className={`text-[8.5px] font-bold block uppercase tracking-wider ${attendanceStatusFilter === 'not_punched' ? 'text-rose-100' : 'text-slate-400'}`}>未到工</span>
                <span className="text-xs font-black mt-0.5 block font-sans">
                  {employees.filter(e => e.status !== "离职").length - employees.filter(e => e.status !== "离职" && attendance.some(a => a.empId === e.id && a.date === simulatedDate && a.inTime)).length} <span className="text-[9px] font-normal">人</span>
                </span>
              </div>
            </div>

            {/* 【批量考勤】 - 人脸识别打卡入口按钮 */}
            <button
              type="button"
              onClick={() => {
                setFaceAttendanceTab('scan');
                setFaceScanResult(null);
              }}
              className="w-full py-2.5 px-4 bg-brand-600 hover:bg-brand-700 active:scale-98 text-white rounded-xl text-xs font-black shadow-3xs flex items-center justify-center gap-2 transition cursor-pointer"
            >
              <Camera className="w-4 h-4 text-emerald-300 animate-pulse" />
              <span>批量考勤</span>
            </button>

            {/* Filter and search layout */}
            <div className="bg-white border border-slate-200 p-3 rounded-2xl shadow-3xs space-y-2 text-left">
              <div className="relative">
                <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400" />
                <input
                  type="text"
                  value={empSearchQuery}
                  onChange={(e) => setEmpSearchQuery(e.target.value)}
                  placeholder="搜索姓名、职位或ID..."
                  className="w-full pl-8 pr-8 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-800 outline-none focus:bg-white focus:border-brand-500 transition"
                />
                {empSearchQuery && (
                  <button
                    type="button"
                    onClick={() => setEmpSearchQuery("")}
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 cursor-pointer"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>

              {/* Department lists */}
              <div className="flex gap-1.5 overflow-x-auto py-0.5 scrollbar-none">
                {[
                  { key: "all", label: "全部" },
                  { key: "仓储部", label: "仓储部" },
                  { key: "运输部", label: "运输部" },
                  { key: "厨房部", label: "厨房部" },
                  { key: "其它", label: "其它" }
                ].map((tab) => {
                  const activeEmps = employees.filter(e => e.status !== "离职");
                  const getDeptCount = (key: string) => {
                    if (key === "all") return activeEmps.length;
                    if (key === "其它") return activeEmps.filter(e => e.dept !== "仓储部" && e.dept !== "运输部" && e.dept !== "厨房部").length;
                    return activeEmps.filter(e => e.dept === key).length;
                  };
                  const count = getDeptCount(tab.key);
                  const isActive = selectedDeptFilter === tab.key;
                  
                  return (
                    <button
                      key={tab.key}
                      type="button"
                      onClick={() => setSelectedDeptFilter(tab.key)}
                      className={`px-2 py-0.8 text-[10px] font-black rounded-lg transition-all shrink-0 cursor-pointer flex items-center gap-1 ${
                        isActive
                          ? "bg-slate-800 text-white shadow-3xs"
                          : "bg-slate-100 text-slate-500 hover:bg-slate-200"
                      }`}
                    >
                      <span>{tab.label}</span>
                      <span className={`px-1 rounded-full text-[8px] font-mono leading-none ${
                        isActive ? "bg-slate-700 text-slate-200" : "bg-slate-200 text-slate-600"
                      }`}>{count}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* List checklist action selectors */}
            <div className="flex items-center justify-between px-1 text-left">
              <div className="flex items-center gap-1.5">
                <div 
                  onClick={() => {
                    const filtered = employees.filter(e => {
                      if (e.status === "离职") return false;
                      let matchesDept = false;
                      if (selectedDeptFilter === "all") {
                        matchesDept = true;
                      } else if (selectedDeptFilter === "其它") {
                        matchesDept = e.dept !== "仓储部" && e.dept !== "运输部" && e.dept !== "厨房部";
                      } else {
                        matchesDept = e.dept === selectedDeptFilter;
                      }
                      const matchesSearch = empSearchQuery ? (
                        e.name.toLowerCase().includes(empSearchQuery.toLowerCase()) ||
                        e.role.toLowerCase().includes(empSearchQuery.toLowerCase()) ||
                        e.id.toString().includes(empSearchQuery)
                      ) : true;
                      const todayPunch = attendance.find(a => a.empId === e.id && a.date === simulatedDate);
                      let matchesStatus = true;
                      if (attendanceStatusFilter === "punched") {
                        matchesStatus = !!todayPunch?.inTime;
                      } else if (attendanceStatusFilter === "not_punched") {
                        matchesStatus = !todayPunch?.inTime;
                      }
                      return matchesDept && matchesSearch && matchesStatus;
                    });
                    const isAll = filtered.length > 0 && filtered.every(e => batchSelectedIds.includes(e.id));
                    if (isAll) {
                      setBatchSelectedIds(prev => prev.filter(id => !filtered.some(f => f.id === id)));
                    } else {
                      const newSelected = [...batchSelectedIds];
                      filtered.forEach(f => {
                        if (!newSelected.includes(f.id)) newSelected.push(f.id);
                      });
                      setBatchSelectedIds(newSelected);
                    }
                  }}
                  className={`w-4 h-4 rounded border flex items-center justify-center transition-all cursor-pointer ${
                    employees.filter(e => {
                      if (e.status === "离职") return false;
                      let matchesDept = false;
                      if (selectedDeptFilter === "all") {
                        matchesDept = true;
                      } else if (selectedDeptFilter === "其它") {
                        matchesDept = e.dept !== "仓储部" && e.dept !== "运输部" && e.dept !== "厨房部";
                      } else {
                        matchesDept = e.dept === selectedDeptFilter;
                      }
                      const matchesSearch = empSearchQuery ? (
                        e.name.toLowerCase().includes(empSearchQuery.toLowerCase()) ||
                        e.role.toLowerCase().includes(empSearchQuery.toLowerCase()) ||
                        e.id.toString().includes(empSearchQuery)
                      ) : true;
                      const todayPunch = attendance.find(a => a.empId === e.id && a.date === simulatedDate);
                      let matchesStatus = true;
                      if (attendanceStatusFilter === "punched") {
                        matchesStatus = !!todayPunch?.inTime;
                      } else if (attendanceStatusFilter === "not_punched") {
                        matchesStatus = !todayPunch?.inTime;
                      }
                      return matchesDept && matchesSearch && matchesStatus;
                    }).length > 0 && employees.filter(e => {
                      if (e.status === "离职") return false;
                      let matchesDept = false;
                      if (selectedDeptFilter === "all") {
                        matchesDept = true;
                      } else if (selectedDeptFilter === "其它") {
                        matchesDept = e.dept !== "仓储部" && e.dept !== "运输部" && e.dept !== "厨房部";
                      } else {
                        matchesDept = e.dept === selectedDeptFilter;
                      }
                      const matchesSearch = empSearchQuery ? (
                        e.name.toLowerCase().includes(empSearchQuery.toLowerCase()) ||
                        e.role.toLowerCase().includes(empSearchQuery.toLowerCase()) ||
                        e.id.toString().includes(empSearchQuery)
                      ) : true;
                      const todayPunch = attendance.find(a => a.empId === e.id && a.date === simulatedDate);
                      let matchesStatus = true;
                      if (attendanceStatusFilter === "punched") {
                        matchesStatus = !!todayPunch?.inTime;
                      } else if (attendanceStatusFilter === "not_punched") {
                        matchesStatus = !todayPunch?.inTime;
                      }
                      return matchesDept && matchesSearch && matchesStatus;
                    }).every(e => batchSelectedIds.includes(e.id))
                      ? "bg-brand-600 border-brand-600 text-white"
                      : "border-slate-300 bg-white"
                  }`}
                >
                  {employees.filter(e => {
                    if (e.status === "离职") return false;
                    let matchesDept = false;
                    if (selectedDeptFilter === "all") {
                      matchesDept = true;
                    } else if (selectedDeptFilter === "其它") {
                      matchesDept = e.dept !== "仓储部" && e.dept !== "运输部" && e.dept !== "厨房部";
                    } else {
                      matchesDept = e.dept === selectedDeptFilter;
                    }
                    const matchesSearch = empSearchQuery ? (
                      e.name.toLowerCase().includes(empSearchQuery.toLowerCase()) ||
                      e.role.toLowerCase().includes(empSearchQuery.toLowerCase()) ||
                      e.id.toString().includes(empSearchQuery)
                    ) : true;
                    const todayPunch = attendance.find(a => a.empId === e.id && a.date === simulatedDate);
                    let matchesStatus = true;
                    if (attendanceStatusFilter === "punched") {
                      matchesStatus = !!todayPunch?.inTime;
                    } else if (attendanceStatusFilter === "not_punched") {
                      matchesStatus = !todayPunch?.inTime;
                    }
                    return matchesDept && matchesSearch && matchesStatus;
                  }).length > 0 && employees.filter(e => {
                    if (e.status === "离职") return false;
                    let matchesDept = false;
                    if (selectedDeptFilter === "all") {
                      matchesDept = true;
                    } else if (selectedDeptFilter === "其它") {
                      matchesDept = e.dept !== "仓储部" && e.dept !== "运输部" && e.dept !== "厨房部";
                    } else {
                      matchesDept = e.dept === selectedDeptFilter;
                    }
                    const matchesSearch = empSearchQuery ? (
                      e.name.toLowerCase().includes(empSearchQuery.toLowerCase()) ||
                      e.role.toLowerCase().includes(empSearchQuery.toLowerCase()) ||
                      e.id.toString().includes(empSearchQuery)
                    ) : true;
                    const todayPunch = attendance.find(a => a.empId === e.id && a.date === simulatedDate);
                    let matchesStatus = true;
                    if (attendanceStatusFilter === "punched") {
                      matchesStatus = !!todayPunch?.inTime;
                    } else if (attendanceStatusFilter === "not_punched") {
                      matchesStatus = !todayPunch?.inTime;
                    }
                    return matchesDept && matchesSearch && matchesStatus;
                  }).every(e => batchSelectedIds.includes(e.id)) && <Check className="w-3 h-3 stroke-[3]" />}
                </div>
                <span className="text-[10px] font-black text-slate-500">全选</span>
              </div>
              <span className="text-[9.5px] text-slate-400 font-semibold">
                可多选打卡，或在右侧单人打卡
              </span>
            </div>

            {/* Employee lists */}
            <div className="space-y-2 pb-24">
              {employees
                .filter(e => {
                  if (e.status === "离职") return false;
                  let matchesDept = false;
                  if (selectedDeptFilter === "all") {
                    matchesDept = true;
                  } else if (selectedDeptFilter === "其它") {
                    matchesDept = e.dept !== "仓储部" && e.dept !== "运输部" && e.dept !== "厨房部";
                  } else {
                    matchesDept = e.dept === selectedDeptFilter;
                  }
                  const matchesSearch = empSearchQuery ? (
                    e.name.toLowerCase().includes(empSearchQuery.toLowerCase()) ||
                    e.role.toLowerCase().includes(empSearchQuery.toLowerCase()) ||
                    e.id.toString().includes(empSearchQuery)
                  ) : true;
                  
                  const todayPunch = attendance.find(a => a.empId === e.id && a.date === simulatedDate);
                  let matchesStatus = true;
                  if (attendanceStatusFilter === "punched") {
                    matchesStatus = !!todayPunch?.inTime;
                  } else if (attendanceStatusFilter === "not_punched") {
                    matchesStatus = !todayPunch?.inTime;
                  }
                  
                  return matchesDept && matchesSearch && matchesStatus;
                })
                .map((emp) => {
                  const todayPunch = attendance.find(a => a.empId === emp.id && a.date === simulatedDate);
                  const isSelected = batchSelectedIds.includes(emp.id);
                  const isCompleted = todayPunch?.inTime && todayPunch?.outTime;
                  const isCheckedIn = todayPunch?.inTime && !todayPunch?.outTime;
                  
                  const leftBarColor = isCompleted
                    ? "bg-emerald-500"
                    : isCheckedIn
                      ? "bg-amber-500"
                      : "bg-slate-300";

                  const avatarGradients = [
                    "from-emerald-400 to-teal-500",
                    "from-blue-400 to-indigo-500",
                    "from-purple-400 to-violet-500",
                    "from-amber-400 to-orange-500",
                    "from-rose-400 to-pink-500"
                  ];
                  const gradient = avatarGradients[emp.id % avatarGradients.length];
                  
                  const punchInTime = batchTimeSource === 'shift' ? config.startShift : batchTimeSource === 'custom' ? batchCustomTime : undefined;
                  const punchOutTime = batchTimeSource === 'shift' ? config.endShift : batchTimeSource === 'custom' ? batchCustomTime : undefined;

                  return (
                    <div 
                      key={emp.id} 
                      onClick={() => {
                        if (isSelected) {
                          setBatchSelectedIds(prev => prev.filter(id => id !== emp.id));
                        } else {
                          setBatchSelectedIds(prev => [...prev, emp.id]);
                        }
                      }}
                      className={`bg-white border rounded-xl flex items-center justify-between gap-2.5 shadow-3xs transition-all relative overflow-hidden pl-1 pr-3 py-2.5 select-none cursor-pointer ${
                        isSelected 
                          ? "border-brand-300 bg-brand-50/10" 
                          : "border-slate-200 hover:border-slate-250"
                      }`}
                    >
                      {/* Status indicator line */}
                      <div className={`absolute left-0 top-0 bottom-0 w-1 ${leftBarColor}`} />

                      {/* Select state checkbox */}
                      <div 
                        onClick={(e) => {
                          e.stopPropagation();
                          if (isSelected) {
                            setBatchSelectedIds(prev => prev.filter(id => id !== emp.id));
                          } else {
                            setBatchSelectedIds(prev => [...prev, emp.id]);
                          }
                        }}
                        className={`w-4.5 h-4.5 ml-1.5 rounded-full border flex items-center justify-center transition-all cursor-pointer shrink-0 ${
                          isSelected
                            ? "bg-brand-600 border-brand-600 text-white"
                            : "border-slate-300 bg-white hover:border-slate-400"
                        }`}
                      >
                        {isSelected && <Check className="w-3 h-3 stroke-[3]" />}
                      </div>

                      {/* Photo Avatar Initializer */}
                      <div className={`w-8 h-8 rounded-full bg-gradient-to-tr ${gradient} text-white flex items-center justify-center text-xs font-black shrink-0 uppercase shadow-3xs`}>
                        {emp.name.charAt(0)}
                      </div>

                      {/* Information panel */}
                      <div className="flex-1 min-w-0 text-left">
                        <div className="flex items-center gap-1">
                          <span className="text-xs font-black text-slate-800 truncate">{emp.name}</span>
                          <span className="text-[8px] font-bold text-slate-400 shrink-0">#{emp.id}</span>
                        </div>
                        <div className="text-[9.5px] text-slate-400 font-semibold truncate">
                          {emp.dept} · {emp.role}
                        </div>
                        
                        {/* Time badges */}
                        <div className="mt-0.5 flex flex-wrap gap-1">
                          {todayPunch?.inTime ? (
                            <span className="inline-flex items-center gap-0.5 px-1 py-0.2 rounded bg-emerald-50 border border-emerald-100 text-emerald-700 text-[8.5px] font-extrabold font-mono leading-none">
                              签到 {todayPunch.inTime}
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-0.5 px-1 py-0.2 rounded bg-slate-50 border border-slate-150 text-slate-400 text-[8.5px] font-bold font-mono leading-none">
                              未签到
                            </span>
                          )}
                          {todayPunch?.outTime ? (
                            <span className="inline-flex items-center gap-0.5 px-1 py-0.2 rounded bg-indigo-50 border border-indigo-100 text-indigo-700 text-[8.5px] font-extrabold font-mono leading-none">
                              签退 {todayPunch.outTime}
                            </span>
                          ) : (
                            todayPunch?.inTime ? (
                              <span className="inline-flex items-center gap-0.5 px-1 py-0.2 rounded bg-amber-50 border border-amber-100 text-amber-600 text-[8.5px] font-bold font-mono leading-none">
                                未签退
                              </span>
                            ) : null
                          )}
                        </div>
                      </div>

                      {/* Action trigger button */}
                      <div className="shrink-0" onClick={(e) => e.stopPropagation()}>
                        {!todayPunch?.inTime ? (
                          <button
                            type="button"
                            onClick={() => handleDirectPunch(emp.id, "in", punchInTime)}
                            className="px-2.5 py-1 rounded-lg text-[10px] font-black bg-emerald-50 border border-emerald-200 text-emerald-700 hover:bg-emerald-100 active:scale-95 transition-all cursor-pointer flex items-center gap-0.5"
                          >
                            <Sun className="w-3 h-3 text-emerald-600" />
                            <span>上班</span>
                          </button>
                        ) : !todayPunch?.outTime ? (
                          <button
                            type="button"
                            onClick={() => handleDirectPunch(emp.id, "out", punchOutTime)}
                            className="px-2.5 py-1 rounded-lg text-[10px] font-black bg-indigo-50 border border-indigo-200 text-indigo-700 hover:bg-indigo-100 active:scale-95 transition-all cursor-pointer flex items-center gap-0.5"
                          >
                            <Moon className="w-3 h-3 text-indigo-600" />
                            <span>下班</span>
                          </button>
                        ) : (
                          <div className="flex items-center gap-1">
                            <span className="inline-flex items-center gap-0.5 px-1.5 py-0.8 rounded-lg bg-slate-100 text-slate-400 text-[9px] font-black leading-none shrink-0 select-none">
                              已完工
                            </span>
                            <button
                              type="button"
                              onClick={() => handleResetPunch(emp.id)}
                              title="重置"
                              className="w-5 h-5 rounded-full border border-slate-200 bg-white flex items-center justify-center hover:bg-slate-50 hover:border-slate-300 text-slate-400 hover:text-slate-600 active:scale-90 transition cursor-pointer shrink-0"
                            >
                              <RefreshCw className="w-2.5 h-2.5" />
                            </button>
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })
              }
              
              {employees.filter(e => {
                if (e.status === "离职") return false;
                let matchesDept = false;
                if (selectedDeptFilter === "all") {
                  matchesDept = true;
                } else if (selectedDeptFilter === "其它") {
                  matchesDept = e.dept !== "仓储部" && e.dept !== "运输部" && e.dept !== "厨房部";
                } else {
                  matchesDept = e.dept === selectedDeptFilter;
                }
                const matchesSearch = empSearchQuery ? (
                  e.name.toLowerCase().includes(empSearchQuery.toLowerCase()) ||
                  e.role.toLowerCase().includes(empSearchQuery.toLowerCase()) ||
                  e.id.toString().includes(empSearchQuery)
                ) : true;
                
                const todayPunch = attendance.find(a => a.empId === e.id && a.date === simulatedDate);
                let matchesStatus = true;
                if (attendanceStatusFilter === "punched") {
                  matchesStatus = !!todayPunch?.inTime;
                } else if (attendanceStatusFilter === "not_punched") {
                  matchesStatus = !todayPunch?.inTime;
                }
                
                return matchesDept && matchesSearch && matchesStatus;
              }).length === 0 && (
                <div className="border border-slate-150 bg-white rounded-xl py-12 px-4 text-center text-slate-400 text-xs font-semibold">
                  未找到符合条件人员
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* FLOATING ACTION BOARD */}
      {faceAttendanceTab === 'batch' && batchSelectedIds.length > 0 && (
        <div className="absolute bottom-4 left-4 right-4 bg-white/95 backdrop-blur-md border border-slate-200/80 rounded-2xl p-3 z-40 shadow-lg animate-in slide-in-from-bottom duration-250 text-slate-800">
          <div className="space-y-2.5">
            <div className="flex justify-between items-center px-1">
              <div>
                <span className="text-[9px] font-bold text-slate-400 block tracking-wider uppercase leading-none">批量打卡</span>
                <span className="text-[11.5px] font-black text-slate-800 mt-1 block">
                  已选择 <strong className="text-brand-600 font-extrabold font-mono text-sm">{batchSelectedIds.length}</strong> 人
                </span>
              </div>
              <button 
                type="button"
                onClick={() => setBatchSelectedIds([])}
                className="text-[10px] font-black text-slate-500 hover:text-slate-800 transition px-2 py-0.8 rounded bg-slate-100 hover:bg-slate-200 active:scale-95 cursor-pointer leading-none"
              >
                重置
              </button>
            </div>

            {/* Retroactive presets */}
            <div className="bg-slate-50 rounded-xl p-2 border border-slate-150 space-y-1.5 text-left">
              <span className="text-[9px] font-bold text-slate-400 block tracking-wide px-1">工时选择</span>
              <div className="grid grid-cols-3 gap-1">
                <button
                  type="button"
                  onClick={() => setBatchTimeSource('shift')}
                  className={`px-1 py-1 rounded-lg text-[9.5px] font-black border transition-all text-center cursor-pointer ${
                    batchTimeSource === 'shift'
                      ? "bg-slate-800 text-white border-slate-800 shadow-3xs"
                      : "bg-white text-slate-500 border-slate-200 hover:text-slate-700"
                  }`}
                >
                  按班次
                </button>
                <button
                  type="button"
                  onClick={() => setBatchTimeSource('current')}
                  className={`px-1 py-1 rounded-lg text-[9.5px] font-black border transition-all text-center cursor-pointer ${
                    batchTimeSource === 'current'
                      ? "bg-slate-800 text-white border-slate-800 shadow-3xs"
                      : "bg-white text-slate-500 border-slate-200 hover:text-slate-700"
                  }`}
                >
                  按当前
                </button>
                <button
                  type="button"
                  onClick={() => setBatchTimeSource('custom')}
                  className={`px-1 py-1 rounded-lg text-[9.5px] font-black border transition-all text-center cursor-pointer ${
                    batchTimeSource === 'custom'
                      ? "bg-slate-800 text-white border-slate-800 shadow-3xs"
                      : "bg-white text-slate-500 border-slate-200 hover:text-slate-700"
                  }`}
                >
                  自定义
                </button>
              </div>

              <div className="px-1 text-[9px] font-bold text-slate-500">
                {batchTimeSource === 'shift' && (
                  <span>签到时间为 <strong className="text-emerald-600">{config.startShift}</strong>，签退为 <strong className="text-indigo-600">{config.endShift}</strong></span>
                )}
                {batchTimeSource === 'current' && (
                  <span>工时记录为当前虚拟时间：<strong className="text-amber-600 font-mono">{getSimulatedInTime()}</strong></span>
                )}
                {batchTimeSource === 'custom' && (
                  <div className="flex items-center gap-2 mt-1">
                    <span>指定：</span>
                    <input
                      type="time"
                      value={batchCustomTime}
                      onChange={(e) => setBatchCustomTime(e.target.value)}
                      className="bg-white border border-slate-200 rounded px-1.5 py-0.5 text-[10px] text-slate-800 font-mono font-black focus:outline-none focus:border-brand-500"
                    />
                  </div>
                )}
              </div>
            </div>

            {/* Action Buttons */}
            <div className="grid grid-cols-2 gap-2 border-t border-slate-100 pt-2.5">
              <button
                type="button"
                onClick={() => {
                  const punchInTime = batchTimeSource === 'shift' ? config.startShift : batchTimeSource === 'custom' ? batchCustomTime : undefined;
                  handleBatchPunch('in', punchInTime);
                }}
                className="py-2 bg-emerald-600 hover:bg-emerald-500 active:scale-98 text-white font-black text-xs rounded-xl shadow-xs transition-all flex items-center justify-center gap-1 cursor-pointer animate-in zoom-in-95 duration-100"
              >
                <Sun className="w-3.5 h-3.5 text-emerald-200" />
                <span>上班签到</span>
              </button>
              <button
                type="button"
                onClick={() => {
                  const punchOutTime = batchTimeSource === 'shift' ? config.endShift : batchTimeSource === 'custom' ? batchCustomTime : undefined;
                  handleBatchPunch('out', punchOutTime);
                }}
                className="py-2 bg-indigo-600 hover:bg-indigo-500 active:scale-98 text-white font-black text-xs rounded-xl shadow-xs transition-all flex items-center justify-center gap-1 cursor-pointer animate-in zoom-in-95 duration-100"
              >
                <Moon className="w-3.5 h-3.5 text-indigo-200" />
                <span>下班签退</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </motion.div>
  );
};
