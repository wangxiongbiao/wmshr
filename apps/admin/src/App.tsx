/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useEffect, useMemo, useRef, useState } from "react";
import { tAdmin } from "./lib/i18nText";
import { useTranslation } from "react-i18next";
import { Sidebar } from "./components/Sidebar";
import { Header } from "./components/Header";
import { Dashboard } from "./components/Dashboard";
import { EmployeeList } from "./components/EmployeeList";
import { AttendanceRuleList } from "./components/AttendanceRuleList";
import { AttendanceTable } from "./components/AttendanceTable";
import { PayrollTable } from "./components/PayrollTable";
import { SopManager } from "./components/SopManager";
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
  EmployeeUpsertPayload
} from "./types";
import { INITIAL_EMPLOYEES } from "./constants";
import { motion, AnimatePresence } from "motion/react";
import { CheckCircle, Sparkles } from "lucide-react";
import {
  createAttendanceRule,
  createEmployee,
  disableAttendanceRule,
  ensureWorkspaceBootstrap,
  enableAttendanceRule,
  fetchAttendanceRuleDetail,
  fetchAttendanceRuleRelatedEmployees,
  fetchAttendanceRules,
  fetchEmployeeAppAccount,
  fetchEmployeeDetail,
  fetchEmployees,
  initializeWorkspace,
  resetEmployeeAppPassword,
  updateAttendanceRule,
  updateEmployee,
  updateEmployeeAppAccountStatus,
  updateEmployeeStatus
} from "./lib/api";
import { AuthScreen } from "./components/AuthScreen";
import { useDialog } from "./components/DialogProvider";
import { supabase } from "./lib/supabase";
import type { Session } from "@supabase/supabase-js";
import {
  buildGooglePopupCallbackUrl,
  closePopupWindow,
  GOOGLE_AUTH_MESSAGE_TYPE,
  GOOGLE_POPUP_NAME,
  GOOGLE_POPUP_POLL_MS,
  GOOGLE_POPUP_QUERY_KEY,
  GOOGLE_POPUP_QUERY_VALUE,
  logGoogleAuth,
  openCenteredPopup,
  type GoogleAuthPopupMessage
} from "../../../packages/shared/src/google-auth";

function getOAuthErrorFromCurrentUrl() {
  const searchParams = new URLSearchParams(window.location.search);
  const hashParams = new URLSearchParams(window.location.hash.replace(/^#/, ""));

  return searchParams.get("error_description")
    ?? hashParams.get("error_description")
    ?? searchParams.get("error")
    ?? hashParams.get("error")
    ?? "";
}

export default function App() {
  const { t } = useTranslation(["admin", "auth"]);
  const { confirm } = useDialog();
  const searchParams = new URLSearchParams(window.location.search);
  const isGooglePopupCallback =
    searchParams.get(GOOGLE_POPUP_QUERY_KEY) === GOOGLE_POPUP_QUERY_VALUE && Boolean(window.opener);

  // 员工管理、考勤计算、薪资核算按 v2 可见界面顺序恢复；旧后台兼容字段只留在接口层处理。
  const [activeTab, setActiveTab] = useState<TabId>('dashboard');
  const [session, setSession] = useState<Session | null>(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [googleSigningIn, setGoogleSigningIn] = useState(false);
  const [authError, setAuthError] = useState("");
  const [employees, setEmployees] = useState<Employee[]>(INITIAL_EMPLOYEES);
  const [attendanceRuleList, setAttendanceRuleList] = useState<AttendanceRule[]>([]);
  const [employeesLoading, setEmployeesLoading] = useState(false);
  const [attendanceRulesLoading, setAttendanceRulesLoading] = useState(false);
  const [employeeSaving, setEmployeeSaving] = useState(false);
  const [attendanceRuleSaving, setAttendanceRuleSaving] = useState(false);
  const [attendanceRuleToggleSaving, setAttendanceRuleToggleSaving] = useState(false);
  const [relatedEmployeesLoading, setRelatedEmployeesLoading] = useState(false);
  const [workspaceBootstrapping, setWorkspaceBootstrapping] = useState(false);
  const [workspaceBootstrapChecking, setWorkspaceBootstrapChecking] = useState(false);
  const [workspaceBootstrapDismissed, setWorkspaceBootstrapDismissed] = useState(false);
  const [globalLoadingMessage, setGlobalLoadingMessage] = useState("");
  const bootstrapCheckedSessionRef = useRef<string | null>(null);
  const popupPollTimerRef = useRef<number | null>(null);
  const popupWindowRef = useRef<Window | null>(null);
  const popupResolvedRef = useRef(false);

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

  const clearPopupPollTimer = () => {
    if (popupPollTimerRef.current !== null) {
      window.clearInterval(popupPollTimerRef.current);
      popupPollTimerRef.current = null;
    }
  };

  const clearPopupWindow = () => {
    closePopupWindow(popupWindowRef.current);
    popupWindowRef.current = null;
  };

  const closeCurrentPopupWindow = () => {
    window.open("", "_self");
    window.close();
  };

  const postPopupResultToOpener = (message: GoogleAuthPopupMessage) => {
    if (!window.opener) {
      return;
    }

    window.opener.postMessage(message, window.location.origin);
  };

  useEffect(() => {
    let mounted = true;

    logGoogleAuth("admin", "Bootstrapping admin auth state", {
      href: window.location.href,
      isGooglePopupCallback,
      hasOpener: Boolean(window.opener)
    });

    void supabase.auth.getSession().then(({ data, error }) => {
      if (!mounted) return;

      logGoogleAuth("admin", "getSession resolved", {
        hasSession: Boolean(data.session),
        isGooglePopupCallback,
        error: error?.message
      });

      if (isGooglePopupCallback) {
        if (data.session) {
          logGoogleAuth("admin", "Popup callback has session, notifying opener");
          postPopupResultToOpener({ type: GOOGLE_AUTH_MESSAGE_TYPE, status: "success" });
          closeCurrentPopupWindow();
          return;
        }

        const popupError = getOAuthErrorFromCurrentUrl();
        if (error || popupError) {
          const message = error?.message || popupError || tAdmin("Google 登录失败");
          logGoogleAuth("admin", "Popup callback contains oauth error", { error: message });
          postPopupResultToOpener({
            type: GOOGLE_AUTH_MESSAGE_TYPE,
            status: "error",
            error: message,
          });
          closeCurrentPopupWindow();
          return;
        }

        logGoogleAuth("admin", "Popup callback has no session yet, waiting for auth state change");
        setAuthLoading(false);
        return;
      }

      if (error) {
        logGoogleAuth("admin", "getSession returned error", { error: error.message });
        setAuthError(error.message);
      }

      setSession(data.session);
      setAuthLoading(false);
    });

    const { data: listener } = supabase.auth.onAuthStateChange((_event, nextSession) => {
      logGoogleAuth("admin", "onAuthStateChange fired", {
        event: _event,
        hasSession: Boolean(nextSession),
        isGooglePopupCallback
      });

      if (isGooglePopupCallback && nextSession) {
        logGoogleAuth("admin", "Popup callback received session from auth state change");
        postPopupResultToOpener({ type: GOOGLE_AUTH_MESSAGE_TYPE, status: "success" });
        closeCurrentPopupWindow();
        return;
      }

      if (isGooglePopupCallback) {
        return;
      }

      if (nextSession?.access_token) {
        popupResolvedRef.current = true;
        clearPopupPollTimer();
        clearPopupWindow();
      }

      setSession(nextSession);
      setAuthError("");
      setGoogleSigningIn(false);
      setAuthLoading(false);
    });

    return () => {
      mounted = false;
      clearPopupPollTimer();
      clearPopupWindow();
      listener.subscription.unsubscribe();
    };
  }, [isGooglePopupCallback]);

  useEffect(() => {
    if (isGooglePopupCallback) {
      return;
    }

    const handleMessage = (event: MessageEvent<GoogleAuthPopupMessage>) => {
      if (event.origin !== window.location.origin) {
        return;
      }

      if (event.data?.type !== GOOGLE_AUTH_MESSAGE_TYPE) {
        return;
      }

      popupResolvedRef.current = true;
      clearPopupPollTimer();

      if (event.data.status === "success") {
        clearPopupWindow();
        void supabase.auth.getSession().then(({ data, error }) => {
          if (error) {
            setGoogleSigningIn(false);
            setAuthError(error.message);
            return;
          }

          setSession(data.session);
          setAuthError("");
          setGoogleSigningIn(false);
        });
        return;
      }

      clearPopupWindow();
      setGoogleSigningIn(false);
      setAuthError(event.data.error || tAdmin("Google 登录失败，请重试。"));
    };

    window.addEventListener("message", handleMessage);

    return () => {
      window.removeEventListener("message", handleMessage);
    };
  }, [isGooglePopupCallback]);

  useEffect(() => {
    if (!session?.access_token) {
      setEmployees([]);
      setAttendanceRuleList([]);
      setWorkspaceBootstrapChecking(false);
      setWorkspaceBootstrapDismissed(false);
      bootstrapCheckedSessionRef.current = null;
      return;
    }

    if (bootstrapCheckedSessionRef.current === session.access_token) {
      return;
    }

    bootstrapCheckedSessionRef.current = session.access_token;
    void prepareWorkspaceForSession();
  }, [session?.access_token]);

  const prepareWorkspaceForSession = async () => {
    setWorkspaceBootstrapChecking(true);
    try {
      const result = await ensureWorkspaceBootstrap();
      if (result.created) {
        setWorkspaceBootstrapDismissed(true);
        addToast(result.message || tAdmin("已自动初始化当前账号的业务数据"));
      }
    } catch (error) {
      addToast(error instanceof Error ? error.message : tAdmin("后台初始化检查失败"));
    } finally {
      await Promise.all([
        loadEmployeeModuleData(),
        loadAttendanceRuleModuleData()
      ]);
      setWorkspaceBootstrapChecking(false);
    }
  };

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

  const handleGoogleLogin = async () => {
    setGoogleSigningIn(true);
    setAuthError("");

    popupResolvedRef.current = false;
    clearPopupPollTimer();

    const redirectTo = buildGooglePopupCallbackUrl(window.location.origin);
    logGoogleAuth("admin", "Starting same-origin Google popup login", { redirectTo });

    const { data, error } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: {
        redirectTo,
        skipBrowserRedirect: true,
      }
    });

    if (error) {
      setGoogleSigningIn(false);
      setAuthError(error.message);
      return;
    }

    if (!data?.url) {
      setGoogleSigningIn(false);
      setAuthError(tAdmin("未获取到 Google 登录地址，请稍后重试。"));
      return;
    }

    const popup = openCenteredPopup(data.url, GOOGLE_POPUP_NAME);

    if (!popup) {
      setGoogleSigningIn(false);
      setAuthError(tAdmin("浏览器拦截了登录弹窗，请允许弹窗后重试。"));
      return;
    }

    popupWindowRef.current = popup;
    popup.focus();

    popupPollTimerRef.current = window.setInterval(() => {
      let popupClosed = false;

      try {
        popupClosed = popup.closed;
      } catch {
        // OAuth middle pages can temporarily block `closed` through COOP.
        return;
      }

      if (!popupClosed) {
        return;
      }

      clearPopupPollTimer();
      popupWindowRef.current = null;

      if (!popupResolvedRef.current) {
        setGoogleSigningIn(false);
        setAuthError(tAdmin("你已关闭 Google 登录弹窗，请重试。"));
      }
    }, GOOGLE_POPUP_POLL_MS);
  };

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    setSession(null);
    setEmployees([]);
    setAttendanceRuleList([]);
    setWorkspaceBootstrapDismissed(false);
  };

  const handleBootstrapWorkspace = async () => {
    setWorkspaceBootstrapping(true);
    try {
      const result = await initializeWorkspace();
      await Promise.all([
        loadEmployeeModuleData(),
        loadAttendanceRuleModuleData()
      ]);
      setWorkspaceBootstrapDismissed(true);
      setActiveTab("attendance");
      addToast(result.message || tAdmin("已为当前账号初始化后台业务数据"));
    } catch (error) {
      addToast(error instanceof Error ? error.message : tAdmin("初始化后台失败"));
    } finally {
      setWorkspaceBootstrapping(false);
    }
  };

  const openCreateEmployee = () => {
    setEditingEmployee(null);
    setIsEmployeeModalOpen(true);
  };

  const openEditEmployee = async (employee: Employee) => {
    setGlobalLoadingMessage(tAdmin("正在加载员工档案..."));
    try {
      const detail = await fetchEmployeeDetail(employee.id);
      setEditingEmployee(detail.employee);
      setIsEmployeeModalOpen(true);
    } catch (error) {
      addToast(error instanceof Error ? error.message : tAdmin("员工详情加载失败"));
    } finally {
      setGlobalLoadingMessage("");
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
    const confirmed = await confirm({
      title: tAdmin("确认删除员工?"),
      message: tAdmin("此操作会将员工 {{name}} 从 v2 员工列表中移除，后续仍可在后台数据中保留离职记录。是否继续？", { name: employee.name }),
      confirmText: tAdmin("确认删除"),
      cancelText: tAdmin("取消"),
      tone: "danger"
    });

    if (!confirmed) {
      return;
    }

    try {
      // 当前后端没有物理删除接口；v2 删除入口只负责让员工退出当前员工列表，因此沿用状态接口标记为离职，避免误删历史考勤/薪资记录。
      await updateEmployeeStatus(employee.id, "resigned");
      setEmployees((prev) => prev.filter((item) => item.id !== employee.id));
      addToast(tAdmin("员工已从当前列表移除"));
    } catch (error) {
      addToast(error instanceof Error ? error.message : tAdmin("员工删除失败"));
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
      dashboard: t('数据看板'),
      employees: t('员工管理'),
      attendance: t('考勤计算'),
      payroll: t('薪资核算'),
      sop: t('SOP管理')
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
    return <AuthScreen loading={googleSigningIn} onGoogleLogin={handleGoogleLogin} error={authError} />;
  }

  return (
    <div className="text-slate-700 h-screen flex overflow-hidden font-sans antialiased">
      <Sidebar activeTab={activeTab} onTabChange={setActiveTab} />

      <main className="flex-1 flex flex-col min-w-0 overflow-hidden bg-[#f8fafc] relative">
        <Header title={pageTitle} userEmail={session.user.email} onSignOut={handleSignOut} />

        <div className="flex-1 overflow-y-auto p-6 scroll-smooth relative">
          {showWorkspaceBootstrapCard && (
            <div className="mb-6 rounded-2xl border border-brand-200 bg-[linear-gradient(135deg,rgba(37,99,235,0.08),rgba(14,165,233,0.04))] p-6">
              <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
                <div className="max-w-2xl">
                  <div className="flex items-center gap-2 text-brand-700 mb-2">
                    <Sparkles className="w-5 h-5" />
                    <span className="text-sm font-semibold">{tAdmin("首次进入当前账号后台")}</span>
                  </div>
                  <h3 className="text-xl font-bold text-slate-900">{tAdmin("一键初始化当前 Google 账号的独立后台数据")}</h3>
                  <p className="mt-2 text-sm text-slate-600 leading-6">{tAdmin("初始化后会为当前账号创建默认考勤规则、员工资料、当月考勤记录和薪酬数据。它们只属于你当前登录的 Google 账号，不会和其他账号共享。")}</p>
                </div>
                <div className="flex flex-wrap items-center gap-3">
                  <button
                    onClick={() => setWorkspaceBootstrapDismissed(true)}
                    className="px-4 py-2.5 rounded-lg border border-slate-300 bg-white text-sm text-slate-700 hover:bg-slate-50"
                  >{tAdmin("稍后手动创建")}</button>
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
          <AnimatePresence mode="wait">
            <motion.div
              key={activeTab}
              // 业务页需要拿到主内容区高度；员工列表内部按 Header / Content 分层，只有 Content 滚动。
              className="h-full min-h-0"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.2 }}
            >
              {/* 各业务模块先以 v2 可见界面为准挂载，再按界面重写/对接接口，避免旧后台字段反向污染 UI。 */}
              {activeTab === 'dashboard' && (
                <Dashboard
                  onOpenSettings={() => setActiveTab('attendance')}
                  onNav={setActiveTab}
                />
              )}
              {activeTab === 'employees' && (
                <EmployeeList
                  employees={employees}
                  loading={employeesLoading}
                  onAddEmployee={openCreateEmployee}
                  onEditEmployee={(employee) => void openEditEmployee(employee)}
                  onManageAppAccount={(employee) => void openEmployeeAppAccountModal(employee)}
                  onDeleteEmployee={(employee) => void handleDeleteEmployee(employee)}
                />
              )}
              {activeTab === 'attendance' && (
                <AttendanceTable employees={employees} />
              )}
              {activeTab === 'payroll' && (
                <PayrollTable employees={employees} />
              )}
              {activeTab === 'sop' && (
                // SOP 先按 v2 可见模块原样挂载，当前版本仍使用组件内 localStorage；后续按迁移方案替换为 owner_user_id 隔离的真实接口。
                <SopManager employees={employees} addToast={addToast} />
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
