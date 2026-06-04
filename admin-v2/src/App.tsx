/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState, useMemo } from "react";
import { Sidebar } from "./components/Sidebar";
import { Header } from "./components/Header";
import { Dashboard } from "./components/Dashboard";
import { EmployeeList } from "./components/EmployeeList";
import { AttendanceTable } from "./components/AttendanceTable";
import { PayrollTable } from "./components/PayrollTable";
import { SopManager } from "./components/SopManager";
import { EmployeeModal, DeleteModal, SettingsModal, AttendanceAdjustmentModal } from "./components/Modals";
import { TabId, Employee, AttendanceRecord, AppConfig } from "./types";
import { INITIAL_EMPLOYEES, INITIAL_ATTENDANCE, INITIAL_CONFIG } from "./constants";
import { motion, AnimatePresence } from "motion/react";
import { CheckCircle } from "lucide-react";

export default function App() {
  const [activeTab, setActiveTab] = useState<TabId>('attendance');
  const [employees, setEmployees] = useState<Employee[]>(INITIAL_EMPLOYEES);
  const [attendance, setAttendance] = useState<AttendanceRecord[]>(INITIAL_ATTENDANCE);
  const [config, setConfig] = useState<AppConfig>(INITIAL_CONFIG);
  const [selectedAttIds, setSelectedAttIds] = useState<Set<string>>(new Set());

  // Modal States
  const [isEmployeeModalOpen, setIsEmployeeModalOpen] = useState(false);
  const [editingEmployee, setEditingEmployee] = useState<Employee | null>(null);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [deletingEmployee, setDeletingEmployee] = useState<Employee | null>(null);
  const [isSettingsModalOpen, setIsSettingsModalOpen] = useState(false);
  const [isAttAdjustModalOpen, setIsAttAdjustModalOpen] = useState(false);
  const [editingRecord, setEditingRecord] = useState<AttendanceRecord | null>(null);

  // Toast
  const [toasts, setToasts] = useState<{ id: number; msg: string }[]>([]);

  const addToast = (msg: string) => {
    const id = Date.now();
    setToasts(prev => [...prev, { id, msg }]);
    setTimeout(() => {
      setToasts(prev => prev.filter(t => t.id !== id));
    }, 3000);
  };

  // Handlers
  const handleSaveEmployee = (data: Partial<Employee>) => {
    if (editingEmployee) {
      setEmployees(prev => prev.map(e => e.id === editingEmployee.id ? { ...e, ...data } as Employee : e));
      addToast('员工档案已更新');
    } else {
      const newId = Math.max(0, ...employees.map(e => e.id)) + 1;
      setEmployees(prev => [...prev, { ...data, id: newId } as Employee]);
      addToast('新员工已添加成功');
    }
    setIsEmployeeModalOpen(false);
  };

  const handleConfirmDelete = () => {
    if (deletingEmployee) {
      setEmployees(prev => prev.filter(e => e.id !== deletingEmployee.id));
      addToast('员工已删除');
      setIsDeleteModalOpen(false);
      setDeletingEmployee(null);
    }
  };

  const handleSaveRecord = (data: Partial<AttendanceRecord>) => {
    if (editingRecord) {
      if (editingRecord.id.startsWith('new-')) {
        const newRecord: AttendanceRecord = {
          id: `att-${Date.now()}`,
          empId: editingRecord.empId,
          date: editingRecord.date,
          inTime: data.inTime || '08:30',
          outTime: data.outTime || '17:30',
          type: data.type || 'normal',
          note: data.note || ''
        };
        setAttendance(prev => [...prev, newRecord]);
        addToast('新增并调整考勤成功');
      } else {
        setAttendance(prev => prev.map(r => r.id === editingRecord.id ? { ...r, ...data } as AttendanceRecord : r));
        addToast('考勤记录已更新');
      }
    }
    setIsAttAdjustModalOpen(false);
  };

  const pageTitle = useMemo(() => {
    const titles: Record<TabId, string> = {
      dashboard: '数据看板',
      employees: '员工管理',
      attendance: '考勤计算',
      payroll: '薪资核算',
      sop: 'SOP管理'
    };
    return titles[activeTab];
  }, [activeTab]);

  return (
    <div className="text-slate-700 h-screen flex overflow-hidden font-sans antialiased">
      <Sidebar activeTab={activeTab} onTabChange={setActiveTab} />
      
      <main className="flex-1 flex flex-col min-w-0 overflow-hidden bg-[#f8fafc] relative">
        <Header title={pageTitle} />
        
        <div className="flex-1 overflow-y-auto p-6 scroll-smooth relative">
          <AnimatePresence mode="wait">
            <motion.div
              key={activeTab}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.2 }}
            >
              {activeTab === 'dashboard' && (
                <Dashboard
                  employees={employees}
                  attendance={attendance}
                  config={config}
                  onOpenSettings={() => setIsSettingsModalOpen(true)}
                  onNav={(id) => setActiveTab(id)}
                />
              )}
              {activeTab === 'employees' && (
                <EmployeeList
                  employees={employees}
                  onAddEmployee={() => { setEditingEmployee(null); setIsEmployeeModalOpen(true); }}
                  onEditEmployee={(emp) => { setEditingEmployee(emp); setIsEmployeeModalOpen(true); }}
                  onDeleteEmployee={(emp) => { setDeletingEmployee(emp); setIsDeleteModalOpen(true); }}
                />
              )}
              {activeTab === 'attendance' && (
                <AttendanceTable
                  employees={employees}
                  attendance={attendance}
                  config={config}
                  selectedIds={selectedAttIds}
                  onSelect={(id, checked) => {
                    const next = new Set(selectedAttIds);
                    if (checked) next.add(id); else next.delete(id);
                    setSelectedAttIds(next);
                  }}
                  onSelectAll={(ids) => {
                    setSelectedAttIds(new Set(ids));
                  }}
                  onOpenSettings={() => setIsSettingsModalOpen(true)}
                  onEditRecord={(id, empId, date) => {
                    if (id) {
                      const rec = attendance.find(r => r.id === id);
                      if (rec) {
                        setEditingRecord(rec);
                        setIsAttAdjustModalOpen(true);
                      }
                    } else if (empId && date) {
                      const emp = employees.find(e => e.id === empId);
                      const isLeave = emp?.status === '休假';
                      const newTempRecord: AttendanceRecord = {
                        id: `new-${empId}-${date}`,
                        empId: empId,
                        date: date,
                        inTime: isLeave ? '08:30' : '08:30',
                        outTime: isLeave ? '17:30' : '17:30',
                        type: isLeave ? 'leave' : 'absent',
                        note: ''
                      };
                      setEditingRecord(newTempRecord);
                      setIsAttAdjustModalOpen(true);
                    }
                  }}
                />
              )}
              {activeTab === 'payroll' && (
                <PayrollTable
                  employees={employees}
                  attendance={attendance}
                  config={config}
                />
              )}
              {activeTab === 'sop' && (
                <SopManager
                  employees={employees}
                  addToast={addToast}
                />
              )}
            </motion.div>
          </AnimatePresence>
        </div>
      </main>

      {/* Modals */}
      <EmployeeModal
        isOpen={isEmployeeModalOpen}
        onClose={() => setIsEmployeeModalOpen(false)}
        onSave={handleSaveEmployee}
        employee={editingEmployee}
      />
      
      <DeleteModal
        isOpen={isDeleteModalOpen}
        onClose={() => setIsDeleteModalOpen(false)}
        onConfirm={handleConfirmDelete}
        employeeName={deletingEmployee?.name || ""}
      />

      <SettingsModal
        isOpen={isSettingsModalOpen}
        onClose={() => setIsSettingsModalOpen(false)}
        config={config}
        onSave={(cfg) => { setConfig(cfg); setIsSettingsModalOpen(false); addToast('考勤规则已保存'); }}
        onReset={() => { setConfig(INITIAL_CONFIG); addToast('已恢复默认规则'); }}
      />

      <AttendanceAdjustmentModal
        isOpen={isAttAdjustModalOpen}
        onClose={() => setIsAttAdjustModalOpen(false)}
        record={editingRecord}
        onSave={handleSaveRecord}
        employees={employees}
      />

      {/* Toasts */}
      <div className="fixed top-4 right-4 z-[60] flex flex-col gap-2 pointer-events-none">
        <AnimatePresence>
          {toasts.map(t => (
            <motion.div
              key={t.id}
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, scale: 0.9 }}
              className="pointer-events-auto px-4 py-3 rounded-lg shadow-lg text-sm font-medium text-white bg-slate-800 flex items-center gap-2"
            >
              <CheckCircle className="w-4 h-4 text-green-400" /> {t.msg}
            </motion.div>
          ))}
        </AnimatePresence>
      </div>
    </div>
  );
}
