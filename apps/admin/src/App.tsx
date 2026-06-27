/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useEffect, useMemo, useRef, useState } from "react";
import { tAdmin } from "./lib/i18nText";
import { useTranslation } from "react-i18next";
import { normalizeLanguage } from "@wmshr/i18n";
import { useLocation, useNavigate } from "react-router-dom";
import { Sidebar } from "./components/Sidebar";
import { Header } from "./components/Header";
import { Dashboard } from "./components/Dashboard";
import { EmployeeList } from "./components/EmployeeList";
import { AttendanceRuleList } from "./components/AttendanceRuleList";
import { AttendanceTable } from "./components/AttendanceTable";
import { PayrollTable } from "./components/PayrollTable";
import { SopManager } from "./components/SopManager";
import { CustomerManager } from "./components/CustomerManager";
import { GoodsManager } from "./components/GoodsManager";
import { ExpenseManager } from "./components/ExpenseManager";
import { LeaveRequestTable } from "./components/LeaveRequestTable";
import {
  EmployeeModal,
  EmployeeAppAccountModal,
  AttendanceRuleModal,
  AttendanceRuleRelatedEmployeesModal,
  AttendanceRuleToggleModal
} from "./components/Modals";
import {
  TabId,
  Employee,
  AttendanceRule,
  AttendanceRuleFormData,
  AttendanceRuleOption,
  AttendanceRuleRelatedEmployee,
  EmployeeAppAccountResponse,
  EmployeeUpsertPayload,
  Customer,
  GoodsRecord,
  ExpenseRecord,
  ExpenseModuleSnapshot
} from "./types";
import { INITIAL_EMPLOYEES } from "./constants";
import { motion } from "motion/react";
import { CheckCircle, Sparkles } from "lucide-react";
import {
  createAttendanceRule,
  createEmployee,
  disableAttendanceRule,
  enableAttendanceRule,
  fetchAttendanceRuleDetail,
  fetchAttendanceRuleOptions,
  fetchAttendanceRuleRelatedEmployees,
  fetchAttendanceRules,
  fetchCustomers,
  fetchEmployeeAppAccount,
  fetchEmployeeDetail,
  fetchEmployees,
  fetchGoodsSnapshot,
  fetchExpenseSnapshot,
  fetchWorkspaceBootstrapStatus,
  initializeWorkspace,
  resetEmployeeAppPassword,
  saveCustomersSnapshot,
  saveGoodsSnapshot,
  saveExpenseSnapshot,
  searchEmployees,
  updateAttendanceRule,
  updateEmployee,
  updateEmployeeAppAccountStatus,
  updateEmployeeStatus,
  hideEmployee
} from "./lib/api";
import { AuthScreen } from "./components/AuthScreen";
import { useDialog } from "./components/DialogProvider";
import { ADMIN_TABS, buildAdminRoute, parseAdminRoute } from "./lib/adminRoute";
import { GOOGLE_POPUP_QUERY_KEY, GOOGLE_POPUP_QUERY_VALUE } from "../../../packages/shared/src/google-auth";
import { useAdminAuth } from "./lib/useAdminAuth";

function getWorkspaceBootstrapStorageKey(userId?: string) {
  return userId ? `wmshr-admin-workspace-bootstrapped:${userId}` : "";
}

function readWorkspaceBootstrapFlag(userId?: string) {
  const storageKey = getWorkspaceBootstrapStorageKey(userId);
  if (!storageKey) {
    return true;
  }

  try {
    const storedValue = window.localStorage.getItem(storageKey);
    return storedValue === "1";
  } catch {
    return true;
  }
}

function writeWorkspaceBootstrapFlag(userId?: string) {
  const storageKey = getWorkspaceBootstrapStorageKey(userId);
  if (!storageKey) {
    return;
  }

  try {
    window.localStorage.setItem(storageKey, "1");
  } catch {
    // 本地体验标记写失败时保持静默；不要影响真实初始化流程。
  }
}

const ADMIN_DEV_LAST_CAUSE_KEY = "wmshr-admin-dev-last-cause";
const ADMIN_DEV_ROUTE_COUNT_KEY = "wmshr-admin-dev-route-normalize-count";

function writeAdminDevCause(cause: string) {
  if (!import.meta.env.DEV) {
    return;
  }

  try {
    window.sessionStorage.setItem(ADMIN_DEV_LAST_CAUSE_KEY, cause);
  } catch {
    // 调试探针写失败不影响真实登录流程；本地缺少这份辅助信息时最多回退为肉眼观察。
  }
}

function bumpAdminDevCounter(storageKey: string) {
  if (!import.meta.env.DEV) {
    return;
  }

  try {
    const next = Number(window.sessionStorage.getItem(storageKey) || "0") + 1;
    window.sessionStorage.setItem(storageKey, String(next));
  } catch {
    // sessionStorage 不可用时保持静默；不要让排查辅助逻辑反过来制造登录问题。
  }
}

export default function App() {
  const { t, i18n } = useTranslation(["admin", "auth"]);
  const { confirm } = useDialog();
  const location = useLocation();
  const navigate = useNavigate();
  const searchParams = useMemo(() => new URLSearchParams(location.search), [location.search]);
  const isGooglePopupCallback =
    searchParams.get(GOOGLE_POPUP_QUERY_KEY) === GOOGLE_POPUP_QUERY_VALUE && Boolean(window.opener);
  const routeState = useMemo(() => parseAdminRoute(location.pathname), [location.pathname]);
  const activeTab = routeState.tab;
  const currentLanguage = routeState.language;
  const [visitedTabs, setVisitedTabs] = useState<TabId[]>(() => [activeTab]);

  // 员工管理、考勤计算、薪资核算按 v2 可见界面顺序恢复；旧后台兼容字段只留在接口层处理。
  const {
    session,
    authLoading,
    googleSigningIn,
    emailAuthLoading,
    authError,
    handleEmailAuth,
    handleGoogleLogin,
    handleSignOut,
  } = useAdminAuth({
    canonicalPath: routeState.canonicalPath,
    isGooglePopupCallback,
    tAdmin,
  });
  const [employees, setEmployees] = useState<Employee[]>(INITIAL_EMPLOYEES);
  // customers/goods/expenses 三个 v3 模块现在统一走账号级服务端快照；壳层只保留 keep-alive 与 optimistic 回写，不再依赖浏览器本地存储，避免多设备与多标签页状态漂移。
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [goods, setGoods] = useState<GoodsRecord[]>([]);
  const [expenses, setExpenses] = useState<ExpenseRecord[]>([]);
  const [expenseCategories, setExpenseCategories] = useState<string[]>([]);
  const [customersLoading, setCustomersLoading] = useState(false);
  const [goodsLoading, setGoodsLoading] = useState(false);
  const [expensesLoading, setExpensesLoading] = useState(false);
  const [attendanceRuleList, setAttendanceRuleList] = useState<AttendanceRule[]>([]);
  const [employeesLoading, setEmployeesLoading] = useState(false);
  const [attendanceRulesLoading, setAttendanceRulesLoading] = useState(false);
  const [employeeSaving, setEmployeeSaving] = useState(false);
  const [attendanceRuleSaving, setAttendanceRuleSaving] = useState(false);
  const [attendanceRuleToggleSaving, setAttendanceRuleToggleSaving] = useState(false);
  const [relatedEmployeesLoading, setRelatedEmployeesLoading] = useState(false);
  const [workspaceBootstrapping, setWorkspaceBootstrapping] = useState(false);
  const [workspaceBootstrapChecking, setWorkspaceBootstrapChecking] = useState(false);
  const [workspaceBootstrapDismissed, setWorkspaceBootstrapDismissed] = useState(true);
  const [globalLoadingMessage, setGlobalLoadingMessage] = useState("");
  const [employeeListReloadKey, setEmployeeListReloadKey] = useState(0);
  const bootstrapCheckedSessionRef = useRef<string | null>(null);
  const employeeDetailRequestIdRef = useRef(0);
  const customersLoadedRef = useRef(false);
  const goodsLoadedRef = useRef(false);
  const expensesLoadedRef = useRef(false);

  // Modal States
  const [isEmployeeModalOpen, setIsEmployeeModalOpen] = useState(false);
  const [editingEmployee, setEditingEmployee] = useState<Employee | null>(null);
  const [isEmployeeAppAccountModalOpen, setIsEmployeeAppAccountModalOpen] = useState(false);
  const [selectedEmployeeForAppAccount, setSelectedEmployeeForAppAccount] = useState<Employee | null>(null);
  const [employeeAppAccountResponse, setEmployeeAppAccountResponse] = useState<EmployeeAppAccountResponse | null>(null);
  const [employeeAppAccountLoading, setEmployeeAppAccountLoading] = useState(false);
  const [employeeAppAccountActionLoading, setEmployeeAppAccountActionLoading] = useState(false);
  const [isAttendanceRuleModalOpen, setIsAttendanceRuleModalOpen] = useState(false);
  const [editingAttendanceRule, setEditingAttendanceRule] = useState<AttendanceRule | null>(null);
  const [isRelatedEmployeesModalOpen, setIsRelatedEmployeesModalOpen] = useState(false);
  const [selectedRuleForEmployees, setSelectedRuleForEmployees] = useState<AttendanceRule | null>(null);
  const [relatedEmployees, setRelatedEmployees] = useState<AttendanceRuleRelatedEmployee[]>([]);
  const [isAttendanceRuleToggleModalOpen, setIsAttendanceRuleToggleModalOpen] = useState(false);
  const [toggleTargetRule, setToggleTargetRule] = useState<AttendanceRule | null>(null);

  // Toast
  const [toasts, setToasts] = useState<{ id: number; msg: string }[]>([]);

  const addToast = (msg: string) => {
    const id = Date.now();
    setToasts(prev => [...prev, { id, msg }]);
    setTimeout(() => {
      setToasts(prev => prev.filter(t => t.id !== id));
    }, 3000);
  };

  useEffect(() => {
    if (isGooglePopupCallback) {
      writeAdminDevCause("popup-callback-screen");
      return;
    }

    if (location.pathname === "/") {
      const detectedLanguage = normalizeLanguage(i18n.resolvedLanguage || i18n.language);
      const targetPath = buildAdminRoute(detectedLanguage, activeTab);
      bumpAdminDevCounter(ADMIN_DEV_ROUTE_COUNT_KEY);
      writeAdminDevCause(`route-root-redirect:${location.pathname}->${targetPath}`);
      navigate(targetPath, { replace: true });
      return;
    }

    if (location.pathname !== routeState.canonicalPath) {
      // 所有非法/不完整 admin 路径都统一 replace 到规范 URL，避免页面状态和 URL 分叉。
      bumpAdminDevCounter(ADMIN_DEV_ROUTE_COUNT_KEY);
      writeAdminDevCause(`route-canonicalize:${location.pathname}->${routeState.canonicalPath}`);
      navigate({ pathname: routeState.canonicalPath, search: location.search, hash: location.hash }, { replace: true });
      return;
    }

    writeAdminDevCause(`route-stable:${routeState.canonicalPath}`);
  }, [activeTab, i18n.language, i18n.resolvedLanguage, isGooglePopupCallback, location.hash, location.pathname, location.search, navigate, routeState.canonicalPath]);

  useEffect(() => {
    if (isGooglePopupCallback) {
      return;
    }

    if ((i18n.resolvedLanguage || i18n.language) !== currentLanguage) {
      // 当路由 lang 变化时强制同步 i18n，确保刷新、分享链接和页面内切语言都以 URL 为准。
      void i18n.changeLanguage(currentLanguage);
    }
  }, [currentLanguage, i18n, isGooglePopupCallback]);

  const navigateToTab = (tab: TabId) => {
    navigate(buildAdminRoute(currentLanguage, tab));
  };

  const loadCustomersModuleData = async () => {
    setCustomersLoading(true);
    try {
      const customerRows = await fetchCustomers();
      setCustomers(customerRows);
      customersLoadedRef.current = true;
    } catch (error) {
      addToast(error instanceof Error ? error.message : tAdmin("客户模块数据加载失败"));
    } finally {
      setCustomersLoading(false);
    }
  };

  const loadGoodsModuleData = async () => {
    setGoodsLoading(true);
    try {
      const goodsRows = await fetchGoodsSnapshot();
      setGoods(goodsRows);
      goodsLoadedRef.current = true;
    } catch (error) {
      addToast(error instanceof Error ? error.message : tAdmin("入库模块数据加载失败"));
    } finally {
      setGoodsLoading(false);
    }
  };

  const loadExpensesModuleData = async () => {
    setExpensesLoading(true);
    try {
      const snapshot = await fetchExpenseSnapshot();
      setExpenses(snapshot.expenses);
      setExpenseCategories(snapshot.categories);
      expensesLoadedRef.current = true;
    } catch (error) {
      addToast(error instanceof Error ? error.message : tAdmin("费用模块数据加载失败"));
    } finally {
      setExpensesLoading(false);
    }
  };

  const handleUpdateCustomers = (updatedCustomers: Customer[]) => {
    // 继续沿用 v3 CustomerManager 的“整表回写”交互，但实际持久化已经切到服务端快照，避免为接入现阶段重写大量页面内部状态机。
    const previousCustomers = customers;
    setCustomers(updatedCustomers);
    void saveCustomersSnapshot(updatedCustomers)
      .then((savedCustomers) => {
        setCustomers(savedCustomers);
        customersLoadedRef.current = true;
      })
      .catch((error) => {
        setCustomers(previousCustomers);
        addToast(error instanceof Error ? error.message : tAdmin("客户数据保存失败"));
      });
  };

  const handleUpdateGoods = (updatedGoods: GoodsRecord[]) => {
    const previousGoods = goods;
    setGoods(updatedGoods);
    void saveGoodsSnapshot(updatedGoods)
      .then((savedGoods) => {
        setGoods(savedGoods);
        goodsLoadedRef.current = true;
      })
      .catch((error) => {
        setGoods(previousGoods);
        addToast(error instanceof Error ? error.message : tAdmin("入库数据保存失败"));
      });
  };

  const handleUpdateExpenseModule = (snapshot: ExpenseModuleSnapshot) => {
    const previousSnapshot: ExpenseModuleSnapshot = { expenses, categories: expenseCategories };
    setExpenses(snapshot.expenses);
    setExpenseCategories(snapshot.categories);
    void saveExpenseSnapshot(snapshot)
      .then((savedSnapshot) => {
        setExpenses(savedSnapshot.expenses);
        setExpenseCategories(savedSnapshot.categories);
        expensesLoadedRef.current = true;
      })
      .catch((error) => {
        setExpenses(previousSnapshot.expenses);
        setExpenseCategories(previousSnapshot.categories);
        addToast(error instanceof Error ? error.message : tAdmin("费用数据保存失败"));
      });
  };

  const handleLanguageRouteChange = (language: ReturnType<typeof normalizeLanguage>) => {
    navigate(buildAdminRoute(language, activeTab));
  };

  const renderModulePage = (tab: TabId, isActive: boolean) => {
    switch (tab) {
      case "dashboard":
        return (
          <Dashboard
            isActive={isActive}
            onOpenSettings={() => navigateToTab("attendance")}
            onNav={navigateToTab}
          />
        );
      case "employees":
        return (
          <EmployeeList
            loading={employeesLoading}
            reloadKey={employeeListReloadKey}
            onAddEmployee={openCreateEmployee}
            onEditEmployee={(employee) => void openEditEmployee(employee)}
            onManageAppAccount={(employee) => void openEmployeeAppAccountModal(employee)}
            onDeleteEmployee={(employee) => void handleDeleteEmployee(employee)}
          />
        );
      case "attendance":
        return <AttendanceTable isActive={isActive} />;
      case "leave":
        return <LeaveRequestTable isActive={isActive} />;
      case "payroll":
        return <PayrollTable isActive={isActive} />;
      case "sop":
        return (
          // SOP 页面需要保留编辑态、检索词和已展开详情，因此切页时必须缓存页面实例，只在重新激活时后台刷新列表数据。
          <SopManager employees={employees} addToast={addToast} isActive={isActive} />
        );
      case "customers":
        return (
          <CustomerManager
            customers={customers}
            onUpdateCustomers={handleUpdateCustomers}
            addToast={addToast}
          />
        );
      case "goods":
        return (
          <GoodsManager
            employees={employees}
            goods={goods}
            onUpdateGoods={handleUpdateGoods}
            addToast={addToast}
          />
        );
      case "expenses":
        return (
          <ExpenseManager
            employees={employees}
            expenses={expenses}
            categories={expenseCategories}
            onUpdateExpenseModule={handleUpdateExpenseModule}
            addToast={addToast}
          />
        );
      default:
        return null;
    }
  };

  useEffect(() => {
    const sessionUserId = session?.user?.id || null;

    if (!sessionUserId) {
      setEmployees([]);
      setCustomers([]);
      setGoods([]);
      setExpenses([]);
      setExpenseCategories([]);
      customersLoadedRef.current = false;
      goodsLoadedRef.current = false;
      expensesLoadedRef.current = false;
      setAttendanceRuleList([]);
      setWorkspaceBootstrapChecking(false);
      setWorkspaceBootstrapDismissed(true);
      bootstrapCheckedSessionRef.current = null;
      return;
    }

    if (bootstrapCheckedSessionRef.current === sessionUserId) {
      return;
    }

    bootstrapCheckedSessionRef.current = sessionUserId;
    setWorkspaceBootstrapDismissed(readWorkspaceBootstrapFlag(sessionUserId));
    setWorkspaceBootstrapChecking(false);
  }, [session?.user?.id]);

  useEffect(() => {
    const sessionUserId = session?.user?.id;
    if (!session?.access_token || !sessionUserId) {
      return;
    }

    let cancelled = false;
    setWorkspaceBootstrapChecking(true);

    void fetchWorkspaceBootstrapStatus()
      .then((status) => {
        if (cancelled) return;

        if (status.ready) {
          writeWorkspaceBootstrapFlag(sessionUserId);
          setWorkspaceBootstrapDismissed(true);
          return;
        }

        // 登录后只检查空间是否已初始化，不自动创建默认员工/规则；新账号必须由用户点击“一键初始化”后才写入初始化数据。
        setWorkspaceBootstrapDismissed(readWorkspaceBootstrapFlag(sessionUserId));
      })
      .catch((error) => {
        if (cancelled) return;
        setWorkspaceBootstrapDismissed(false);
        addToast(error instanceof Error ? error.message : tAdmin("后台空间初始化检查失败"));
      })
      .finally(() => {
        if (!cancelled) {
          setWorkspaceBootstrapChecking(false);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [session?.access_token, session?.user?.id]);

  useEffect(() => {
    // 一级模块缓存只保留已经真正访问过的页面实例，避免首次进入后台时把 5 个模块全部冷启动挂载。
    setVisitedTabs((prev) => (prev.includes(activeTab) ? prev : [...prev, activeTab]));
  }, [activeTab]);

  useEffect(() => {
    if (!session?.access_token) {
      return;
    }

    if (activeTab === "customers" && !customersLoadedRef.current) {
      void loadCustomersModuleData();
    }
    if (activeTab === "goods" && !goodsLoadedRef.current) {
      void loadGoodsModuleData();
    }
    if (activeTab === "expenses" && !expensesLoadedRef.current) {
      void loadExpensesModuleData();
    }
  }, [activeTab, session?.access_token]);

  useEffect(() => {
    if (!session?.access_token) {
      return;
    }

    // 员工主数据在 SOP、入库管理、费用管理三个入口都会作为下游选择源使用；这些页面首次进入时统一预取，避免 v3 UI 迁入后表单出现空员工下拉。
    if (activeTab === "sop" || activeTab === "goods" || activeTab === "expenses") {
      void loadEmployeeModuleData();
    }
  }, [activeTab, session?.access_token]);

  const loadEmployeeModuleData = async () => {
    setEmployeesLoading(true);
    try {
      const employeeRows = await fetchEmployees();
      setEmployees(employeeRows);
    } catch (error) {
      addToast(error instanceof Error ? error.message : tAdmin("员工模块数据加载失败"));
    } finally {
      setEmployeesLoading(false);
    }
  };

  const loadAttendanceRuleModuleData = async () => {
    setAttendanceRulesLoading(true);
    try {
      const rules = await fetchAttendanceRules();
      setAttendanceRuleList(rules);
    } catch (error) {
      addToast(error instanceof Error ? error.message : tAdmin("考勤规则模块数据加载失败"));
    } finally {
      setAttendanceRulesLoading(false);
    }
  };

  const handleSignOutAndResetWorkspace = async () => {
    await handleSignOut();
    setEmployees([]);
    setAttendanceRuleList([]);
    setWorkspaceBootstrapDismissed(true);
  };
  const handleBootstrapWorkspace = async () => {
    setWorkspaceBootstrapping(true);
    try {
      const result = await initializeWorkspace();
      writeWorkspaceBootstrapFlag(session?.user?.id);
      setWorkspaceBootstrapDismissed(true);
      navigateToTab("attendance");
      addToast(result.message || tAdmin("已为当前账号初始化后台业务数据"));
    } catch (error) {
      addToast(error instanceof Error ? error.message : tAdmin("初始化后台失败"));
    } finally {
      setWorkspaceBootstrapping(false);
    }
  };

  const handleDismissWorkspaceBootstrap = () => {
    writeWorkspaceBootstrapFlag(session?.user?.id);
    setWorkspaceBootstrapDismissed(true);
  };

  const openCreateEmployee = () => {
    setEditingEmployee(null);
    setIsEmployeeModalOpen(true);
  };

  const openEditEmployee = async (employee: Employee) => {
    const requestId = ++employeeDetailRequestIdRef.current;
    // 员工列表已经带齐 v2 弹窗必需字段；先用当前行数据秒开弹窗，再后台静默校正，避免每次编辑都阻塞在详情接口。
    setEditingEmployee(employee);
    setIsEmployeeModalOpen(true);
    try {
      const detail = await fetchEmployeeDetail(employee.id);
      if (requestId !== employeeDetailRequestIdRef.current) {
        return;
      }
      setEditingEmployee(detail.employee);
    } catch (error) {
      if (requestId !== employeeDetailRequestIdRef.current) {
        return;
      }
      addToast(error instanceof Error ? error.message : tAdmin("员工详情加载失败"));
    }
  };

  const openEmployeeAppAccountModal = async (employee: Employee) => {
    setSelectedEmployeeForAppAccount(employee);
    setEmployeeAppAccountResponse(null);
    setIsEmployeeAppAccountModalOpen(true);
    setEmployeeAppAccountLoading(true);
    try {
      const response = await fetchEmployeeAppAccount(employee.id);
      setEmployeeAppAccountResponse(response);
    } catch (error) {
      addToast(error instanceof Error ? error.message : tAdmin("员工 App 账号加载失败"));
    } finally {
      setEmployeeAppAccountLoading(false);
    }
  };

  const handleResetEmployeeAppPassword = async () => {
    if (!selectedEmployeeForAppAccount) {
      return;
    }

    setEmployeeAppAccountActionLoading(true);
    try {
      const response = await resetEmployeeAppPassword(selectedEmployeeForAppAccount.id);
      setEmployeeAppAccountResponse(response);
      addToast(tAdmin("员工 App 密码已重置为 Aa123456"));
    } catch (error) {
      addToast(error instanceof Error ? error.message : tAdmin("重置员工 App 密码失败"));
    } finally {
      setEmployeeAppAccountActionLoading(false);
    }
  };

  const handleToggleEmployeeAppAccountStatus = async () => {
    if (!selectedEmployeeForAppAccount || !employeeAppAccountResponse?.account) {
      return;
    }

    setEmployeeAppAccountActionLoading(true);
    try {
      const nextStatus = employeeAppAccountResponse.account.status === "disabled" ? "active" : "disabled";
      const response = await updateEmployeeAppAccountStatus(selectedEmployeeForAppAccount.id, nextStatus);
      setEmployeeAppAccountResponse(response);
      addToast(nextStatus === "active" ? tAdmin("员工 App 账号已启用") : tAdmin("员工 App 账号已停用"));
    } catch (error) {
      addToast(error instanceof Error ? error.message : tAdmin("员工 App 账号状态更新失败"));
    } finally {
      setEmployeeAppAccountActionLoading(false);
    }
  };

  const handleCopyEmployeeAppCredential = async () => {
    if (!employeeAppAccountResponse?.account) {
      return;
    }

    const message = tAdmin("姓名：{{name}}\nApp账号：{{account}}\n密码：{{password}}", {
      name: selectedEmployeeForAppAccount?.name || employeeAppAccountResponse.account.employeeName,
      account: employeeAppAccountResponse.account.account,
      password: employeeAppAccountResponse.defaultPassword,
    });
    try {
      await navigator.clipboard.writeText(message);
      addToast(tAdmin("已复制员工 App 账号密码"));
    } catch {
      addToast(tAdmin("复制失败，请手动复制弹窗中的账号和密码"));
    }
  };

  const handleSaveEmployee = async (payload: EmployeeUpsertPayload) => {
    setEmployeeSaving(true);
    try {
      const detail = editingEmployee
        ? await updateEmployee(editingEmployee.id, payload)
        : await createEmployee(payload);

      setEmployees((prev) => {
        const next = prev.filter((item) => item.id !== detail.employee.id);
        next.push(detail.employee);
        return next.sort((a, b) => a.id - b.id);
      });
      setEmployeeListReloadKey((prev) => prev + 1);
      setEditingEmployee(detail.employee);
      setIsEmployeeModalOpen(false);
      addToast(editingEmployee ? tAdmin("员工档案已更新") : tAdmin("新员工已添加成功"));
    } catch (error) {
      addToast(error instanceof Error ? error.message : tAdmin("员工保存失败"));
    } finally {
      setEmployeeSaving(false);
    }
  };

  const handleDeleteEmployee = async (employee: Employee) => {
    const isResignedEmployee = employee.status === "resigned";
    const confirmed = await confirm(
      isResignedEmployee
        ? {
            title: tAdmin("确认删除已离职员工?"),
            message: tAdmin("删除后，员工 {{name}} 的数据库记录会保留，但后台所有列表、筛选和关联选择中都不再显示。是否继续？", { name: employee.name }),
            confirmText: tAdmin("确认删除"),
            cancelText: tAdmin("取消"),
            tone: "danger"
          }
        : {
            title: tAdmin("确认将员工标记为离职?"),
            message: tAdmin("离职后，员工 {{name}} 不会参与新的考勤和薪资核算，历史考勤和薪资记录仍可查询。是否继续？", { name: employee.name }),
            confirmText: tAdmin("确认离职"),
            cancelText: tAdmin("取消"),
            tone: "warning"
          }
    );

    if (!confirmed) {
      return;
    }

    try {
      if (isResignedEmployee) {
        // 已离职员工执行的是软隐藏删除：数据库保留、业务入口消失；这里本地先移除卡片，再依赖统一 is_deleted 过滤保证其他页面同步不可见。
        await hideEmployee(employee.id);
        setEmployees((prev) => prev.filter((item) => item.id !== employee.id));
        setEmployeeListReloadKey((prev) => prev + 1);
        addToast(tAdmin("已离职员工已删除隐藏"));
        return;
      }

      // 在职员工的按钮语义改为“离职”，不再伪装成物理删除，避免用户误以为会直接删库。
      await updateEmployeeStatus(employee.id, "resigned");
      setEmployees((prev) => prev.filter((item) => item.id !== employee.id));
      setEmployeeListReloadKey((prev) => prev + 1);
      addToast(tAdmin("员工已标记为离职"));
    } catch (error) {
      addToast(error instanceof Error ? error.message : (isResignedEmployee ? tAdmin("员工删除失败") : tAdmin("员工离职失败")));
    }
  };

  const syncAttendanceRuleIntoState = (rule: AttendanceRule) => {
    setAttendanceRuleList((prev) => {
      const next = prev.filter((item) => item.id !== rule.id);
      next.push(rule);
      return next.sort((a, b) => a.id - b.id);
    });
  };

  const openCreateAttendanceRule = () => {
    setEditingAttendanceRule(null);
    setIsAttendanceRuleModalOpen(true);
  };

  const openEditAttendanceRule = async (rule: AttendanceRule) => {
    setGlobalLoadingMessage(tAdmin("正在加载考勤规则..."));
    try {
      const detail = await fetchAttendanceRuleDetail(rule.id);
      setEditingAttendanceRule(detail.rule);
      setIsAttendanceRuleModalOpen(true);
    } catch (error) {
      addToast(error instanceof Error ? error.message : tAdmin("考勤规则详情加载失败"));
    } finally {
      setGlobalLoadingMessage("");
    }
  };

  const handleSaveAttendanceRule = async (payload: AttendanceRuleFormData) => {
    if (editingAttendanceRule?.relatedEmployeeCount) {
      const confirmed = await confirm({
        title: tAdmin("确认更新已被引用的规则"),
        message:
          tAdmin("该考勤规则已被员工引用。保存修改后，关联员工后续考勤计算将按新规则执行；如重新计算历史考勤，历史结果也可能变化。是否继续保存？"),
        confirmText: tAdmin("继续保存"),
        cancelText: tAdmin("先不修改"),
        tone: "warning"
      });
      if (!confirmed) {
        return;
      }
    }

    setAttendanceRuleSaving(true);
    try {
      const detail = editingAttendanceRule
        ? await updateAttendanceRule(editingAttendanceRule.id, payload)
        : await createAttendanceRule(payload);

      syncAttendanceRuleIntoState(detail.rule);
      setIsAttendanceRuleModalOpen(false);
      setEditingAttendanceRule(null);
      addToast(editingAttendanceRule ? tAdmin("考勤规则已更新") : tAdmin("考勤规则已创建"));
    } catch (error) {
      addToast(error instanceof Error ? error.message : tAdmin("考勤规则保存失败"));
    } finally {
      setAttendanceRuleSaving(false);
    }
  };

  const openRelatedEmployeesModal = async (rule: AttendanceRule) => {
    setSelectedRuleForEmployees(rule);
    setIsRelatedEmployeesModalOpen(true);
    setRelatedEmployeesLoading(true);
    try {
      const rows = await fetchAttendanceRuleRelatedEmployees(rule.id);
      setRelatedEmployees(rows);
    } catch (error) {
      setRelatedEmployees([]);
      addToast(error instanceof Error ? error.message : tAdmin("关联员工加载失败"));
    } finally {
      setRelatedEmployeesLoading(false);
    }
  };

  const openAttendanceRuleToggleModal = (rule: AttendanceRule) => {
    setToggleTargetRule(rule);
    setIsAttendanceRuleToggleModalOpen(true);
  };

  const handleConfirmAttendanceRuleToggle = async () => {
    if (!toggleTargetRule) {
      return;
    }

    setAttendanceRuleToggleSaving(true);
    try {
      const detail = toggleTargetRule.isActive
        ? await disableAttendanceRule(toggleTargetRule.id)
        : await enableAttendanceRule(toggleTargetRule.id);

      syncAttendanceRuleIntoState(detail.rule);
      setIsAttendanceRuleToggleModalOpen(false);
      setToggleTargetRule(null);
      addToast(detail.rule.isActive ? tAdmin("考勤规则已启用") : tAdmin("考勤规则已停用"));
    } catch (error) {
      addToast(error instanceof Error ? error.message : tAdmin("考勤规则状态更新失败"));
    } finally {
      setAttendanceRuleToggleSaving(false);
    }
  };

  const pageTitle = useMemo(() => {
    const titles: Record<TabId, string> = {
      // Header 改成“分组 · 子项”后，页面上下文能和树形导航保持一致；用户从分享链接或刷新直接进入二级页时，也能立刻知道自己位于哪个业务域。
      dashboard: t('员工管理 · 数据看板'),
      employees: t('员工管理 · 员工列表'),
      attendance: t('员工管理 · 考勤计算'),
      leave: t('员工管理 · 请假管理'),
      payroll: t('员工管理 · 薪资核算'),
      sop: t('流程管理 · SOP管理'),
      customers: t('客户管理 · 客户列表'),
      goods: t('仓储管理 · 入库管理'),
      expenses: t('财务管理 · 费用管理')
    };
    return titles[activeTab];
  }, [activeTab, t]);

  const showWorkspaceBootstrapCard =
    Boolean(session?.access_token) &&
    !workspaceBootstrapChecking &&
    !workspaceBootstrapDismissed &&
    !employeesLoading &&
    !attendanceRulesLoading &&
    employees.length === 0 &&
    attendanceRuleList.length === 0;

  if (isGooglePopupCallback) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#f8fafc] text-slate-500 text-sm">{t("正在打开 Google 授权...")}</div>
    );
  }

  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#f8fafc] text-slate-500 text-sm">{t("加载中")}</div>
    );
  }

  if (!session) {
    return (
      <AuthScreen
        currentLanguage={currentLanguage}
        loading={googleSigningIn}
        emailLoading={emailAuthLoading}
        onGoogleLogin={handleGoogleLogin}
        onEmailAuth={handleEmailAuth}
        onLanguageChange={handleLanguageRouteChange}
        error={authError}
      />
    );
  }

  return (
    <div className="text-slate-700 h-screen flex overflow-hidden font-sans antialiased">
      <Sidebar activeTab={activeTab} onTabChange={navigateToTab} />

      <main className="flex-1 flex flex-col min-w-0 overflow-hidden bg-[#f8fafc] relative">
        <Header
          title={pageTitle}
          currentLanguage={currentLanguage}
          onLanguageChange={handleLanguageRouteChange}
          userEmail={session.user.email}
          onSignOut={handleSignOutAndResetWorkspace}
        />

        <div className="flex-1 overflow-y-auto p-6 scroll-smooth relative">
          {showWorkspaceBootstrapCard && (
            <div className="mb-6 rounded-2xl border border-brand-200 bg-[linear-gradient(135deg,rgba(37,99,235,0.08),rgba(14,165,233,0.04))] p-6">
              <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
                <div className="max-w-2xl">
                  <div className="flex items-center gap-2 text-brand-700 mb-2">
                    <Sparkles className="w-5 h-5" />
                    <span className="text-sm font-semibold">{tAdmin("首次进入当前账号后台")}</span>
                  </div>
                  <h3 className="text-xl font-bold text-slate-900">{tAdmin("一键初始化当前管理员账号的独立后台数据")}</h3>
                  <p className="mt-2 text-sm text-slate-600 leading-6">{tAdmin("初始化后会为当前账号创建默认考勤规则、员工资料、当月考勤记录和薪酬数据。它们只属于你当前登录的管理员账号，不会和其他账号共享。")}</p>
                </div>
                <div className="flex flex-wrap items-center gap-3">
                  <button
                    onClick={handleDismissWorkspaceBootstrap}
                    className="px-4 py-2.5 rounded-lg border border-slate-300 bg-white text-sm text-slate-700 hover:bg-slate-50"
                  >{tAdmin("以后不再提醒")}</button>
                  <button
                    onClick={() => void handleBootstrapWorkspace()}
                    disabled={workspaceBootstrapping}
                    className="px-5 py-2.5 rounded-lg bg-brand-600 text-white text-sm font-medium hover:bg-brand-700 disabled:opacity-60"
                  >
                    {workspaceBootstrapping ? tAdmin("正在初始化...") : tAdmin("立即初始化当前后台")}
                  </button>
                </div>
              </div>
            </div>
          )}
          <div className="relative h-full min-h-0">
            {ADMIN_TABS.filter((tab) => visitedTabs.includes(tab)).map((tab) => {
              const isTabActive = tab === activeTab;

              return (
                <motion.div
                  key={tab}
                  // keep-alive 容器通过“已访问即常驻挂载”保留一级模块实例；切页只隐藏未激活页面，避免返回时重新冷启动。
                  className={`absolute inset-0 min-h-0 ${isTabActive ? "block" : "hidden"}`}
                  initial={false}
                  animate={{ opacity: isTabActive ? 1 : 0, y: isTabActive ? 0 : 8 }}
                  transition={{ duration: 0.18 }}
                  aria-hidden={!isTabActive}
                >
                  {renderModulePage(tab, isTabActive)}
                </motion.div>
              );
            })}
          </div>
        </div>
      </main>

      {/* Modals */}
      <EmployeeModal
        isOpen={isEmployeeModalOpen}
        onClose={() => setIsEmployeeModalOpen(false)}
        onSave={handleSaveEmployee}
        employee={editingEmployee}
        saving={employeeSaving}
      />

      <EmployeeAppAccountModal
        isOpen={isEmployeeAppAccountModalOpen}
        onClose={() => setIsEmployeeAppAccountModalOpen(false)}
        employee={selectedEmployeeForAppAccount}
        accountResponse={employeeAppAccountResponse}
        loading={employeeAppAccountLoading}
        actionLoading={employeeAppAccountActionLoading}
        onResetPassword={() => void handleResetEmployeeAppPassword()}
        onToggleStatus={() => void handleToggleEmployeeAppAccountStatus()}
        onCopyCredential={() => void handleCopyEmployeeAppCredential()}
      />

      <AttendanceRuleModal
        isOpen={isAttendanceRuleModalOpen}
        onClose={() => setIsAttendanceRuleModalOpen(false)}
        onSave={handleSaveAttendanceRule}
        rule={editingAttendanceRule}
        saving={attendanceRuleSaving}
      />

      <AttendanceRuleRelatedEmployeesModal
        isOpen={isRelatedEmployeesModalOpen}
        onClose={() => setIsRelatedEmployeesModalOpen(false)}
        ruleName={selectedRuleForEmployees?.name || tAdmin("考勤规则")}
        employees={relatedEmployees}
        loading={relatedEmployeesLoading}
      />

      <AttendanceRuleToggleModal
        isOpen={isAttendanceRuleToggleModalOpen}
        onClose={() => setIsAttendanceRuleToggleModalOpen(false)}
        onConfirm={handleConfirmAttendanceRuleToggle}
        rule={toggleTargetRule}
        loading={attendanceRuleToggleSaving}
      />

      {globalLoadingMessage ? (
        <div className="fixed inset-0 z-[75] flex items-center justify-center bg-slate-950/35 backdrop-blur-sm">
          <div className="rounded-3xl border border-white/70 bg-white px-8 py-6 shadow-[0_24px_80px_rgba(15,23,42,0.18)]">
            <div className="flex items-center gap-4">
              <div className="h-10 w-10 animate-spin rounded-full border-4 border-slate-200 border-t-brand-600" />
              <div>
                <div className="text-sm font-semibold text-slate-800">{globalLoadingMessage}</div>
                <div className="mt-1 text-xs text-slate-500">{tAdmin("请稍候，正在准备弹窗内容")}</div>
              </div>
            </div>
          </div>
        </div>
      ) : null}

      {/* Toasts */}
      <div className="fixed top-4 right-4 z-[60] flex flex-col gap-2 pointer-events-none">
        {toasts.map(t => (
          <motion.div
            key={t.id}
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            className="pointer-events-auto px-4 py-3 rounded-lg shadow-lg text-sm font-medium text-white bg-slate-800 flex items-center gap-2"
          >
            <CheckCircle className="w-4 h-4 text-green-400" /> {t.msg}
          </motion.div>
        ))}
      </div>
    </div>
  );
}
