/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState, useMemo, useEffect, useRef } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { Sidebar } from "./components/Sidebar";
import { Header } from "./components/Header";
import { Dashboard } from "./components/Dashboard";
import { EmployeeList } from "./components/EmployeeList";
import { AttendanceTable } from "./components/AttendanceTable";
import { LeaveTable } from "./components/LeaveTable";
import { PayrollTable } from "./components/PayrollTable";
import { SopManager } from "./components/SopManager";
import { EmployeeApp } from "./components/EmployeeApp";
import { EmployeeModal, DeleteModal, SettingsModal, AttendanceAdjustmentModal } from "./components/Modals";
import { GoodsManager } from "./components/GoodsManager";
import { ExpenseManager } from "./components/ExpenseManager";
import { CustomerManager } from "./components/CustomerManager";
import { ProductManager } from "./components/ProductManager";
import { OrderManager } from "./components/OrderManager";
import { InvoiceManager } from "./components/InvoiceManager";
import { ExpressManager } from "./components/ExpressManager";
import { Login, CONTINENTS } from "./components/Login";
import { TabId, Employee, AttendanceRecord, AppConfig, GoodsRecord, Customer, Product, CustomerOrder, HolidayRecord, LeaveRequest, AdminUser } from "./types";
import { createEmployee, fetchEmployeePermissions, fetchEmployees, resignEmployee, resetEmployeePassword, updateEmployee } from "./lib/employeeApi";
import { createAttendanceRecord, updateAttendanceRecord, updateAttendanceConfig, fetchAttendanceConfig, fetchAttendanceRecords, fetchLeaveRequests, fetchHolidays, updateHolidays } from "./lib/attendanceApi";
import { INITIAL_CONFIG, INITIAL_EMPLOYEES, INITIAL_ATTENDANCE } from "./constants";
import { motion, AnimatePresence } from "motion/react";
import { AlertCircle, CheckCircle, Info, Loader2 } from "lucide-react";
import { getCurrencyForCountry } from "./lib/utils";
import { getTranslation, Language } from "./lib/i18n";
import { parseAdminRoute, buildAdminRoute, DEFAULT_ADMIN_TAB } from "./lib/adminRoute";
import { frontendStore } from "./lib/frontendStore";
import { isGooglePopupCallback, parseOAuthHash, GOOGLE_AUTH_MESSAGE_TYPE, publishGoogleAuthResult } from "./lib/googleAuth";

export default function App() {
  const location = useLocation();
  const navigate = useNavigate();

  // 1. 路由与状态机：以 URL 为单一真理来源 (/:lang/:tab)，保持与生产系统路由架构一致
  const parsedRoute = useMemo(() => {
    return parseAdminRoute(location.pathname);
  }, [location.pathname]);

  const activeTab: TabId = parsedRoute.tab;
  const lang: Language = parsedRoute.language;

  // 路由缓存 (Keep-Alive): 记录已访问过的 Tab，常驻挂载并以 CSS 切换显隐，避免页面切换时被销毁冷启动
  const [visitedTabs, setVisitedTabs] = useState<TabId[]>(() => [activeTab]);

  useEffect(() => {
    if (activeTab && (activeTab as string) !== "login") {
      setVisitedTabs(prev => (prev.includes(activeTab) ? prev : [...prev, activeTab]));
    }
  }, [activeTab]);

  // 0. Google OAuth 弹窗回调处理
  useEffect(() => {
    if (isGooglePopupCallback()) {
      const hashParams = parseOAuthHash(window.location.hash);
      const searchParams = new URLSearchParams(window.location.search);
      const error = hashParams.error || searchParams.get("error_description") || searchParams.get("error");
      
      const attemptId = searchParams.get("attempt") || undefined;
      window.history.replaceState({}, document.title, window.location.pathname);
      if (error) {
          publishGoogleAuthResult({
            type: GOOGLE_AUTH_MESSAGE_TYPE,
            status: "error",
            error: String(error),
            attemptId
          });
        } else if (hashParams.accessToken) {
          publishGoogleAuthResult({
            type: GOOGLE_AUTH_MESSAGE_TYPE,
            status: "success",
            accessToken: hashParams.accessToken,
            attemptId
          });
        } else {
          publishGoogleAuthResult({ type: GOOGLE_AUTH_MESSAGE_TYPE, status: "error", error: "Google 授权未返回有效凭据", attemptId });
        }
        window.close();
    }
  }, []);


  useEffect(() => {
    if (!parsedRoute.isCanonical) {
      navigate(parsedRoute.canonicalPath, { replace: true });
    }
  }, [parsedRoute.isCanonical, parsedRoute.canonicalPath, navigate]);

  const handleTabChange = (nextTab: TabId) => {
    navigate(buildAdminRoute(lang, nextTab));
  };

  const handleLanguageChange = (nextLang: Language) => {
    navigate(buildAdminRoute(nextLang, activeTab));
  };

  // 2. 鉴权与安全架构：支持管理员常驻登录与安全退出
  const [adminUser, setAdminUser] = useState<AdminUser | null>(() => {
    const token = localStorage.getItem("wms_admin_token");
    return token ? frontendStore.getAdminUser() : null;
  });
  const [authChecking, setAuthChecking] = useState(() => Boolean(localStorage.getItem("wms_admin_token") && !frontendStore.getAdminUser()));
  const [toasts, setToasts] = useState<{ id: number; msg: string; kind: "success" | "error" | "info" }[]>([]);

  const addToast = (msg: string, kind: "success" | "error" | "info" = "success") => {
    const id = Date.now() + Math.random();
    setToasts(prev => [...prev, { id, msg, kind }]);
    window.setTimeout(() => {
      setToasts(prev => prev.filter(toast => toast.id !== id));
    }, 4000);
  };

  useEffect(() => {
    const token = localStorage.getItem("wms_admin_token");
    if (!token || isGooglePopupCallback()) { setAuthChecking(false); return; }
    void fetch("/api/v4/admin/auth/me", { headers: { Authorization: `Bearer ${token}` } })
      .then(async response => {
        if (response.status === 401) {
          localStorage.removeItem("wms_admin_token");
          frontendStore.setAdminUser(null);
          setAdminUser(null);
          addToast("登录凭证已失效，请重新登录", "error");
          return;
        }
        const data = await response.json().catch(() => ({}));
        if (!response.ok) throw new Error(data.error || "获取管理员信息失败");
        setAdminUser(data.user);
        frontendStore.setAdminUser(data.user);
      })
      .catch((reason) => {
        // 网络抖动时不踢出用户，保留本地持久化登录态
        console.warn("[admin-v4] 后台鉴权校验网络异常，保留常驻会话:", reason);
      })
      .finally(() => setAuthChecking(false));
  }, []);

  const handleLoginSuccess = (user: AdminUser) => {
    setAdminUser(user);
    frontendStore.setAdminUser(user);
    
    if (user.country) {
      const newCurrency = getCurrencyForCountry(user.country);
      setConfig(prev => {
        const nextCfg = { ...prev, currency: newCurrency };
        frontendStore.saveConfig(nextCfg);
        return nextCfg;
      });
    }
    
    navigate(buildAdminRoute(lang, "dashboard"));
  };

  const handleLogout = () => {
    setVisitedTabs([DEFAULT_ADMIN_TAB]);
    setAdminUser(null);
    frontendStore.setAdminUser(null);
    localStorage.removeItem("wms_admin_token");
    sessionStorage.removeItem("wms_pre_auth");
    sessionStorage.removeItem("wms_pre_auth_user");
    navigate(buildAdminRoute(lang, "login" as any));
  };

  const handleSelectCountry = async (country: typeof CONTINENTS[number]["countries"][number]): Promise<boolean> => {
    const token = localStorage.getItem("wms_admin_token");
    if (!adminUser || !token) {
      addToast("登录状态已失效，请重新登录", "error");
      return false;
    }
    const countryStr = `${country.flag} ${country.name}`;
    const currency = getCurrencyForCountry(countryStr);
    const controller = new AbortController();
    const timeout = window.setTimeout(() => controller.abort(), 20_000);
    try {
      const response = await fetch("/api/v4/admin/auth/switch-country", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ countryCode: country.code, countryName: countryStr, currency }),
        signal: controller.signal
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) throw Object.assign(new Error(data.error || "切换海外仓失败"), { status: response.status });
      localStorage.setItem("wms_admin_token", data.accessToken);
      setVisitedTabs([activeTab]);
      setAdminUser(data.user);
      frontendStore.setAdminUser(data.user);
      setEmployeeReloadKey(k => k + 1);
      setConfig(prev => {
        const nextCfg = { ...prev, currency: data.user.currency || currency };
        frontendStore.saveConfig(nextCfg);
        return nextCfg;
      });
      addToast(`已切换至 ${countryStr}`, "success");
      return true;
    } catch (reason) {
      const message = reason instanceof Error && reason.name === "AbortError"
        ? "切换请求超时，请检查网络后重试"
        : (reason instanceof Error ? reason.message : "切换海外仓失败");
      addToast(message, "error");
      if ((reason as { status?: number })?.status === 401) handleLogout();
      return false;
    } finally {
      window.clearTimeout(timeout);
    }
  };

  const hasPermission = (permId: string): boolean => {
    if (!adminUser) return false;
    const perms = adminUser.permissions || [];
    return perms.includes("*") || perms.includes("all") || perms.includes(permId);
  };

  const tabPermissions: Partial<Record<TabId, string>> = {
    dashboard: "dashboard_view", employees: "employees_view", attendance: "attendance_view",
    leave_requests: "leave_view", payroll: "payroll_view", goods: "goods_view",
    expenses: "expenses_view", invoices: "expenses_view", express: "expenses_view",
    customers: "customers_view", products: "products_view", orders: "orders_view",
    sop: "sop_view", sop_training: "sop_view", sop_catering: "sop_view", employee_app: "dashboard_view"
  };
  const activePermission = tabPermissions[activeTab];
  const canAccessActiveTab = !activePermission || hasPermission(activePermission);

  useEffect(() => {
    if (adminUser && (activeTab as string) === "login") {
      navigate(buildAdminRoute(lang, "dashboard"), { replace: true });
      return;
    }
    if (adminUser && !canAccessActiveTab) {
      addToast("无权访问该页面", "error");
      navigate(buildAdminRoute(lang, "dashboard"), { replace: true });
    }
  }, [adminUser, activeTab, canAccessActiveTab, lang, navigate]);

  // 员工档案以服务端为准；其他尚未迁移模块暂时保留原型本地数据。
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [employeesLoading, setEmployeesLoading] = useState(false);
  const [employeeReloadKey, setEmployeeReloadKey] = useState(0);

  const [attendance, setAttendance] = useState<AttendanceRecord[]>(() => frontendStore.getAttendance());
  const [goods, setGoods] = useState<GoodsRecord[]>(() => frontendStore.getGoods());
  const [config, setConfig] = useState<AppConfig>(() => frontendStore.getConfig());
  const [holidays, setHolidays] = useState<HolidayRecord[]>(() => frontendStore.getHolidays());
  const [leaveRequests, setLeaveRequests] = useState<LeaveRequest[]>(() => frontendStore.getLeaveRequests());
  const [customers, setCustomers] = useState<Customer[]>(() => frontendStore.getCustomers());
  const [products, setProducts] = useState<Product[]>(() => frontendStore.getProducts());
  const [orders, setOrders] = useState<CustomerOrder[]>(() => frontendStore.getOrders());

  const [selectedAttIds, setSelectedAttIds] = useState<Set<string>>(new Set());

  const reloadEmployees = async (options?: { silent?: boolean }) => {
    const silent = options?.silent ?? false;
    if (!silent) setEmployeesLoading(true);
    try {
      const warehouse = adminUser?.countryCode || "TH";
      const [active, resigned, attRecords, leaves, cloudConfig, cloudHolidays] = await Promise.all([
        fetchEmployees("active", "", 1, 50, warehouse),
        fetchEmployees("resigned", "", 1, 50, warehouse),
        fetchAttendanceRecords({ warehouseCode: warehouse }).catch(() => [] as AttendanceRecord[]),
        fetchLeaveRequests(warehouse).catch(() => [] as LeaveRequest[]),
        fetchAttendanceConfig(warehouse).catch(() => null),
        fetchHolidays(warehouse).catch(() => [] as HolidayRecord[])
      ]);
      setEmployees([...active.items, ...resigned.items]);
      setEmployeeReloadKey(k => k + 1);
      if (Array.isArray(attRecords)) {
        setAttendance(attRecords);
        frontendStore.saveAttendance(attRecords);
      }
      if (Array.isArray(leaves)) {
        setLeaveRequests(leaves);
        frontendStore.saveLeaveRequests(leaves);
      }
      if (cloudConfig) {
        const mergedConfig = { ...INITIAL_CONFIG, ...cloudConfig };
        setConfig(mergedConfig);
        frontendStore.saveConfig(mergedConfig);
      }
      if (Array.isArray(cloudHolidays) && (cloudHolidays.length > 0 || cloudConfig)) {
        setHolidays(cloudHolidays);
        frontendStore.saveHolidays(cloudHolidays);
      }
    } catch (error) {
      if (!silent) {
        addToast(error instanceof Error ? error.message : "员工列表加载失败");
      }
    } finally {
      if (!silent) {
        setEmployeesLoading(false);
      }
    }
  };

  const handleUpdateHolidays = async (newHolidays: HolidayRecord[]) => {
    setHolidays(newHolidays);
    frontendStore.saveHolidays(newHolidays);
    try {
      const warehouse = adminUser?.countryCode || "TH";
      const saved = await updateHolidays(newHolidays, warehouse);
      if (Array.isArray(saved)) {
        setHolidays(saved);
        frontendStore.saveHolidays(saved);
      }
      addToast(lang === "zh-CN" ? "假期设置已保存至云端" : "Holidays saved to cloud", "success");
    } catch (err) {
      console.error("Failed to update holidays in cloud:", err);
      addToast(err instanceof Error ? err.message : "假期保存失败", "error");
    }
  };

  useEffect(() => {
    if (adminUser) void reloadEmployees();
  }, [adminUser]);

  const lastTabSwitchRef = useRef<number>(0);
  const prevTabRef = useRef<TabId>(activeTab);

  // 路由缓存模式下的 Tab 切入静默热拉取 (SWR 模式，0 阻断、0 按钮旋转、0 Toast)
  useEffect(() => {
    if (!adminUser || activeTab === "login") return;

    if (prevTabRef.current !== activeTab) {
      prevTabRef.current = activeTab;

      const now = Date.now();
      // 2 秒防连击冷却锁，避免极速切 Tab 重复触发无谓网络请求
      if (now - lastTabSwitchRef.current < 2000) {
        return;
      }
      lastTabSwitchRef.current = now;

      const businessTabs: TabId[] = ["dashboard", "employees", "attendance", "payroll", "leave_requests"];
      if (businessTabs.includes(activeTab)) {
        void reloadEmployees({ silent: true });
      }
    }
  }, [activeTab, adminUser]);
  useEffect(() => { frontendStore.saveAttendance(attendance); }, [attendance]);
  useEffect(() => { frontendStore.saveGoods(goods); }, [goods]);
  useEffect(() => { frontendStore.saveConfig(config); }, [config]);
  useEffect(() => { frontendStore.saveHolidays(holidays); }, [holidays]);
  useEffect(() => { frontendStore.saveLeaveRequests(leaveRequests); }, [leaveRequests]);

  // 自动清洗历史遗留的测试请假数据与无效员工记录
  useEffect(() => {
    setLeaveRequests(prev => {
      const cleaned = prev.filter(l => {
        const isLegacyMock = l.id === "leave-1" || l.id === "leave-2" || 
          (typeof l.reason === "string" && (l.reason.includes("家里有些急事") || l.reason.includes("身体不适发烧")));
        return !isLegacyMock;
      });
      if (cleaned.length !== prev.length) {
        frontendStore.saveLeaveRequests(cleaned);
        return cleaned;
      }
      return prev;
    });
  }, []);

  const employeesWithSettlementCurrency = useMemo(() => {
    return employees.map(emp => ({
      ...emp,
      currency: config.currency
    }));
  }, [employees, config.currency]);

  const handleUpdateCustomers = (newList: Customer[]) => {
    setCustomers(newList);
    frontendStore.saveCustomers(newList);
  };

  const handleUpdateProducts = (newList: Product[]) => {
    setProducts(newList);
    frontendStore.saveProducts(newList);
  };

  const handleUpdateOrders = (newList: CustomerOrder[]) => {
    setOrders(newList);
    frontendStore.saveOrders(newList);
  };

  // 弹窗状态
  const [isEmployeeModalOpen, setIsEmployeeModalOpen] = useState(false);
  const [editingEmployee, setEditingEmployee] = useState<Employee | null>(null);
  const [isPermissionsLoading, setIsPermissionsLoading] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [deletingEmployee, setDeletingEmployee] = useState<Employee | null>(null);
  const [isSettingsModalOpen, setIsSettingsModalOpen] = useState(false);
  const [isAttAdjustModalOpen, setIsAttAdjustModalOpen] = useState(false);
  const [editingRecord, setEditingRecord] = useState<AttendanceRecord | null>(null);

  // 动作处理函数
  const handleSaveEmployee = async (data: Partial<Employee>) => {
    try {
      const saved = editingEmployee
        ? await updateEmployee({ ...editingEmployee, ...data })
        : await createEmployee(data);

      setEmployees(prev => editingEmployee ? prev.map(e => e.id === saved.id ? saved : e) : [...prev, saved]);
      setEmployeeReloadKey(k => k + 1);
      addToast(editingEmployee ? "员工档案已更新" : "新员工已添加成功");
      setIsEmployeeModalOpen(false);
    } catch (error) {
      addToast(error instanceof Error ? error.message : "员工档案保存失败", "error");
      throw error;
    }
  };

  const handleConfirmDelete = async () => {
    if (deletingEmployee) {
      try {
        const resigned = await resignEmployee(deletingEmployee.id);
        setEmployees(prev => prev.map(e => e.id === resigned.id ? resigned : e));
        setEmployeeReloadKey(k => k + 1);
        addToast("员工已转为离职，历史记录已保留");
        setIsDeleteModalOpen(false);
        setDeletingEmployee(null);
      } catch (error) {
        addToast(error instanceof Error ? error.message : "员工离职操作失败", "error");
        throw error;
      }
    }
  };

  const handleSaveRecord = async (data: Partial<AttendanceRecord>, isAdjustment = false) => {
    if (editingRecord) {
      try {
        const isAbsentOrLeave = data.type === "absent" || data.type === "leave";
        if (!editingRecord.id || editingRecord.id.startsWith("new-")) {
          const empId = Number(data.empId || editingRecord.empId);
          const date = data.date || editingRecord.date;
          const res = await createAttendanceRecord({
            employeeId: empId,
            date,
            inTime: isAbsentOrLeave ? (data.inTime || undefined) : (data.inTime || "08:30"),
            outTime: isAbsentOrLeave ? (data.outTime || undefined) : (data.outTime || "17:30"),
            type: data.type || "normal",
            note: data.note || "",
            isAdjustment: Boolean(isAdjustment || editingRecord.id.startsWith("new-"))
          });

          const realId = res?.record?.id ? String(res.record.id) : `att-${Date.now()}`;
          const newRecord: AttendanceRecord = {
            id: realId,
            empId,
            date,
            inTime: data.inTime || "",
            outTime: data.outTime || "",
            type: data.type || "normal",
            note: data.note || ""
          };
          const next = [newRecord, ...attendance.filter(r => !(r.empId === empId && r.date === date))];
          setAttendance(next);
          frontendStore.saveAttendance(next);
          addToast(isAdjustment ? "考勤记录调整成功" : "考勤记录补录成功");
        } else {
          const numId = Number(editingRecord.id);
          if (!isNaN(numId)) {
            await updateAttendanceRecord(numId, {
              inTime: isAbsentOrLeave ? (data.inTime || undefined) : (data.inTime || "08:30"),
              outTime: isAbsentOrLeave ? (data.outTime || undefined) : (data.outTime || "17:30"),
              type: data.type || "normal",
              note: data.note || ""
            });
          }
          const updatedRecord = { ...editingRecord, ...data } as AttendanceRecord;
          const exists = attendance.some(r => String(r.id) === String(editingRecord.id) || (Number(r.empId) === Number(editingRecord.empId) && r.date === editingRecord.date));
          const next = exists
            ? attendance.map(r => (String(r.id) === String(editingRecord.id) || (Number(r.empId) === Number(editingRecord.empId) && r.date === editingRecord.date)) ? { ...r, ...data } : r)
            : [updatedRecord, ...attendance];
          setAttendance(next);
          frontendStore.saveAttendance(next);
          addToast("考勤记录调整成功");
        }
        setIsAttAdjustModalOpen(false);
      } catch (error) {
        addToast(error instanceof Error ? error.message : "考勤记录保存失败", "error");
        throw error;
      }
    }
  };

  const pageTitle = useMemo(() => {
    return getTranslation(`title_${activeTab}`, lang);
  }, [activeTab, lang]);

  const toastViewport = (
    <div className="fixed top-4 right-4 z-[100] flex flex-col gap-2 pointer-events-none">
      <AnimatePresence>
        {toasts.map(toast => {
          const Icon = toast.kind === "error" ? AlertCircle : toast.kind === "info" ? Info : CheckCircle;
          const color = toast.kind === "error" ? "bg-rose-600" : toast.kind === "info" ? "bg-sky-600" : "bg-emerald-600";
          return (
            <motion.div
              key={toast.id}
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, scale: 0.9 }}
              className={`pointer-events-auto max-w-sm px-4 py-3 rounded-lg shadow-lg text-sm font-medium text-white ${color} flex items-start gap-2`}
            >
              <Icon className="w-4 h-4 mt-0.5 shrink-0" /> {toast.msg}
            </motion.div>
          );
        })}
      </AnimatePresence>
    </div>
  );

  if (authChecking) return (
    <div className="min-h-screen bg-slate-950 text-slate-200 flex flex-col items-center justify-center gap-3">
      <Loader2 className="w-7 h-7 animate-spin text-brand-400" />
      <p className="text-sm font-semibold">正在验证登录状态…</p>
      {toastViewport}
    </div>
  );
  if (!adminUser || (activeTab as string) === "login") {
    return <><Login onLoginSuccess={handleLoginSuccess} addToast={addToast} />{toastViewport}</>;
  }
  if (!canAccessActiveTab) return <>{toastViewport}</>;

  const renderTabContent = (tab: TabId) => {
    switch (tab) {
      case "dashboard":
        return (
          <Dashboard
            employees={employeesWithSettlementCurrency}
            attendance={attendance}
            config={config}
            leaveRequests={leaveRequests}
            loading={employeesLoading}
            onOpenSettings={() => setIsSettingsModalOpen(true)}
            onNav={handleTabChange}
            onRefresh={reloadEmployees}
            addToast={addToast}
          />
        );
      case "employees":
        return (
          <EmployeeList
            employees={employeesWithSettlementCurrency}
            reloadKey={employeeReloadKey}
            currentWarehouseCode={adminUser?.countryCode || "TH"}
            loadEmployees={fetchEmployees}
            onAddEmployee={() => {
              setEditingEmployee(null);
              setIsPermissionsLoading(false);
              setIsEmployeeModalOpen(true);
            }}
            onEditEmployee={(emp) => {
              // 立即弹出编辑窗口，0延迟呈现员工主体信息
              setEditingEmployee(emp);
              setIsEmployeeModalOpen(true);

              if (hasPermission("employees_permissions")) {
                setIsPermissionsLoading(true);
                fetchEmployeePermissions(emp.id)
                  .then((access) => {
                    if (access?.assignable) {
                      setEditingEmployee(prev => (prev && prev.id === emp.id ? { ...prev, permissions: access.permissions } : prev));
                    }
                  })
                  .catch((error) => {
                    console.warn("Background fetch permissions failed:", error);
                  })
                  .finally(() => {
                    setIsPermissionsLoading(false);
                  });
              } else {
                setIsPermissionsLoading(false);
              }
            }}
            onDeleteEmployee={(emp) => { setDeletingEmployee(emp); setIsDeleteModalOpen(true); }}
            onUpdateEmployeePassword={async (empId, newPass) => {
              try {
                await resetEmployeePassword(empId, newPass);
                addToast(`员工密码已重置：${newPass}（请立即安全交付）`);
              } catch (error) {
                addToast(error instanceof Error ? error.message : "密码重置失败", "error");
                throw error;
              }
            }}
            loading={employeesLoading}
            holidays={holidays}
            onUpdateHolidays={handleUpdateHolidays}
            onOpenSettings={() => setIsSettingsModalOpen(true)}
            onRefresh={reloadEmployees}
            hasPermission={hasPermission}
            lang={lang}
            addToast={addToast}
          />
        );
      case "attendance":
        return (
          <AttendanceTable
            employees={employeesWithSettlementCurrency}
            attendance={attendance}
            config={config}
            selectedIds={selectedAttIds}
            warehouseCode={adminUser?.countryCode || "TH"}
            onSelect={(id, checked) => {
              const next = new Set(selectedAttIds);
              if (checked) next.add(id); else next.delete(id);
              setSelectedAttIds(next);
            }}
            onSelectAll={(ids) => {
              setSelectedAttIds(new Set(ids));
            }}
            onEditRecord={(id, empId, date, recFromTable) => {
              if (recFromTable) {
                setEditingRecord(recFromTable);
                setIsAttAdjustModalOpen(true);
                return;
              }
              if (id) {
                const rec = attendance.find(r => String(r.id) === String(id));
                if (rec) {
                  setEditingRecord(rec);
                  setIsAttAdjustModalOpen(true);
                  return;
                }
              }
              if (empId && date) {
                const emp = employees.find(e => e.id === empId);
                const isLeave = emp?.status === "休假";
                const existing = attendance.find(r => Number(r.empId) === Number(empId) && r.date === date);
                const newTempRecord: AttendanceRecord = existing || {
                  id: `new-${empId}-${date}`,
                  empId: empId,
                  date: date,
                  inTime: isLeave ? "08:30" : "08:30",
                  outTime: isLeave ? "17:30" : "17:30",
                  type: isLeave ? "leave" : "normal",
                  note: ""
                };
                setEditingRecord(newTempRecord);
                setIsAttAdjustModalOpen(true);
                return;
              }
              const defaultEmpId = employees[0]?.id || 0;
              const defaultDate = new Date().toISOString().split("T")[0];
              const newTempRecord: AttendanceRecord = {
                id: `new-manual`,
                empId: defaultEmpId,
                date: defaultDate,
                inTime: "08:30",
                outTime: "17:30",
                type: "normal",
                note: ""
              };
              setEditingRecord(newTempRecord);
              setIsAttAdjustModalOpen(true);
            }}
            holidays={holidays}
            leaveRequests={leaveRequests}
            onUpdateLeaveRequests={setLeaveRequests}
            hasPermission={hasPermission}
            onRefresh={reloadEmployees}
            addToast={addToast}
          />
        );
      case "payroll":
        return (
          <PayrollTable
            employees={employeesWithSettlementCurrency}
            attendance={attendance}
            config={config}
            holidays={holidays}
            loading={employeesLoading}
            hasPermission={hasPermission}
            lang={lang}
            onRefresh={reloadEmployees}
            addToast={addToast}
          />
        );
      case "sop":
      case "sop_training":
        return (
          <SopManager
            employees={employeesWithSettlementCurrency}
            addToast={addToast}
            category="training"
          />
        );
      case "sop_catering":
        return (
          <SopManager
            employees={employeesWithSettlementCurrency}
            addToast={addToast}
            category="catering"
          />
        );
      case "goods":
        return (
          <GoodsManager
            employees={employeesWithSettlementCurrency}
            goods={goods}
            onUpdateGoods={setGoods}
            addToast={addToast}
          />
        );
      case "expenses":
        return (
          <ExpenseManager
            employees={employeesWithSettlementCurrency}
            addToast={addToast}
            attendance={attendance}
            config={config}
            holidays={holidays}
            loading={employeesLoading}
            onRefresh={reloadEmployees}
          />
        );
      case "invoices":
        return (
          <InvoiceManager
            customers={customers}
            addToast={addToast}
            lang={lang}
            warehouseCode={adminUser?.countryCode || "TH"}
          />
        );
      case "express":
        return (
          <ExpressManager
            customers={customers}
            addToast={addToast}
            lang={lang}
          />
        );
      case "customers":
        return (
          <CustomerManager
            customers={customers}
            onUpdateCustomers={handleUpdateCustomers}
            addToast={addToast}
            lang={lang}
          />
        );
      case "products":
        return (
          <ProductManager
            products={products}
            onUpdateProducts={handleUpdateProducts}
            customers={customers}
            goodsList={goods}
            addToast={addToast}
          />
        );
      case "orders":
        return (
          <OrderManager
            orders={orders}
            onUpdateOrders={handleUpdateOrders}
            products={products}
            onUpdateProducts={handleUpdateProducts}
            customers={customers}
            addToast={addToast}
          />
        );
      case "employee_app":
        return (
          <EmployeeApp
            employees={employeesWithSettlementCurrency}
            onUpdateEmployees={setEmployees}
            attendance={attendance}
            config={config}
            onUpdateAttendance={setAttendance}
            addToast={addToast}
            onNavigateToTab={handleTabChange}
            holidays={holidays}
            leaveRequests={leaveRequests}
            onUpdateLeaveRequests={setLeaveRequests}
          />
        );
      case "leave_requests":
        return (
          <LeaveTable
            employees={employeesWithSettlementCurrency}
            leaveRequests={leaveRequests}
            onUpdateLeaveRequests={setLeaveRequests}
            hasPermission={hasPermission}
            addToast={addToast}
            warehouseCode={adminUser?.countryCode || "TH"}
            onRefreshAttendance={reloadEmployees}
            onRefresh={reloadEmployees}
          />
        );
      default:
        return null;
    }
  };

  return (
    <div className="text-slate-700 h-screen flex overflow-hidden font-sans antialiased">
      <Sidebar 
        activeTab={activeTab} 
        onTabChange={handleTabChange} 
        adminUser={adminUser}
        hasPermission={hasPermission}
        lang={lang}
      />
      
      <main className="flex-1 flex flex-col min-w-0 overflow-hidden bg-[#f8fafc] relative">
        <Header 
          title={pageTitle} 
          adminUser={adminUser}
          onSelectCountry={handleSelectCountry}
          onLogout={handleLogout}
          lang={lang}
          onLanguageChange={handleLanguageChange}
        />
        
        <div className="flex-1 min-h-0 relative">
          {visitedTabs.map((tab) => {
            const perm = tabPermissions[tab];
            if (perm && !hasPermission(perm)) return null;
            const isTabActive = tab === activeTab;
            return (
              <motion.div
                key={tab}
                className={`absolute inset-0 overflow-y-auto p-4 scroll-smooth ${isTabActive ? "block" : "hidden"}`}
                initial={false}
                animate={{ opacity: isTabActive ? 1 : 0 }}
                transition={{ duration: 0.15 }}
                aria-hidden={!isTabActive}
              >
                {renderTabContent(tab)}
              </motion.div>
            );
          })}
        </div>
      </main>

      {/* 模态框组件 */}
      <EmployeeModal
        isOpen={isEmployeeModalOpen}
        onClose={() => setIsEmployeeModalOpen(false)}
        onSave={handleSaveEmployee}
        employee={editingEmployee}
        canManagePermissions={hasPermission("employees_permissions")}
        isPermissionsLoading={isPermissionsLoading}
        defaultWarehouseCode={adminUser?.countryCode || "TH"}
        lang={lang}
      />
      
      <DeleteModal
        isOpen={isDeleteModalOpen}
        onClose={() => setIsDeleteModalOpen(false)}
        onConfirm={handleConfirmDelete}
        employeeName={deletingEmployee?.name || ""}
        lang={lang}
      />

      <SettingsModal
        isOpen={isSettingsModalOpen}
        onClose={() => setIsSettingsModalOpen(false)}
        config={config}
        onSave={async (cfg) => {
          try {
            const warehouse = adminUser?.countryCode || "TH";
            const updated = await updateAttendanceConfig({
              startShift: cfg.startShift,
              endShift: cfg.endShift,
              breakStart: cfg.breakStart,
              breakEnd: cfg.breakEnd,
              standardHours: cfg.standardHours,
              otHourlyFee: cfg.otHourlyFee,
              currency: cfg.currency,
              companyAddress: cfg.companyAddress || "",
              companyLat: cfg.companyLat || 0,
              companyLng: cfg.companyLng || 0
            }, warehouse);
            const nextConfig = { ...INITIAL_CONFIG, ...cfg, ...updated };
            setConfig(nextConfig);
            frontendStore.saveConfig(nextConfig);
            setIsSettingsModalOpen(false);
            addToast(lang === "zh-CN" ? "考勤与薪酬规则已保存至云端" : "Settings saved to cloud", "success");
          } catch (err) {
            console.error("Save attendance config failed:", err);
            addToast(err instanceof Error ? err.message : "考勤规则保存失败", "error");
          }
        }}
        onReset={async () => {
          try {
            const warehouse = adminUser?.countryCode || "TH";
            const updated = await updateAttendanceConfig({
              startShift: INITIAL_CONFIG.startShift,
              endShift: INITIAL_CONFIG.endShift,
              breakStart: INITIAL_CONFIG.breakStart,
              breakEnd: INITIAL_CONFIG.breakEnd,
              standardHours: INITIAL_CONFIG.standardHours,
              otHourlyFee: INITIAL_CONFIG.otHourlyFee,
              currency: INITIAL_CONFIG.currency,
              companyAddress: INITIAL_CONFIG.companyAddress || "",
              companyLat: INITIAL_CONFIG.companyLat || 0,
              companyLng: INITIAL_CONFIG.companyLng || 0
            }, warehouse);
            const nextConfig = { ...INITIAL_CONFIG, ...updated };
            setConfig(nextConfig);
            frontendStore.saveConfig(nextConfig);
            addToast(lang === "zh-CN" ? "已恢复默认规则并同步云端" : "Reset to default settings", "success");
          } catch (err) {
            console.error("Reset attendance config failed:", err);
            addToast(err instanceof Error ? err.message : "重置规则失败", "error");
          }
        }}
        lang={lang}
      />

      <AttendanceAdjustmentModal
        isOpen={isAttAdjustModalOpen}
        onClose={() => setIsAttAdjustModalOpen(false)}
        record={editingRecord}
        onSave={handleSaveRecord}
        employees={employeesWithSettlementCurrency}
        existingRecords={attendance}
        lang={lang}
      />

      {toastViewport}
    </div>
  );
}
