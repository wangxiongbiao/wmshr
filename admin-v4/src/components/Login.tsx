import React, { useEffect, useState } from "react";
import { Mail, Lock, User, CheckCircle, ArrowRight, Globe, Compass, ShieldAlert, LogIn } from "lucide-react";
import { AdminUser } from "../types";
import { getCurrencyForCountry } from "../lib/utils";
import { openCenteredPopup, closePopupWindow, buildGooglePopupCallbackUrl, createGoogleAuthAttemptId, parseOAuthHash, GOOGLE_POPUP_NAME, GOOGLE_AUTH_MESSAGE_TYPE, GOOGLE_AUTH_BROADCAST_CHANNEL, GOOGLE_AUTH_STORAGE_EVENT_KEY, type GoogleAuthPopupMessage } from "../lib/googleAuth";
import { motion, AnimatePresence } from "motion/react";

type ToastKind = "success" | "error" | "info";
type AuthRequestError = Error & { status?: number };

interface LoginProps {
  onLoginSuccess: (user: AdminUser) => void;
  addToast: (msg: string, kind?: ToastKind) => void;
}

// Group countries by continent
export const CONTINENTS = [
  {
    name: "亚洲 (Asia)",
    countries: [
      { name: "韩国", englishName: "South Korea", code: "KR", flag: "🇰🇷" },
      { name: "日本", englishName: "Japan", code: "JP", flag: "🇯🇵" },
      { name: "中国香港", englishName: "Hong Kong", code: "HK", flag: "🇭🇰" },
      { name: "中国澳门", englishName: "Macau", code: "MO", flag: "🇲🇴" },
      { name: "马来西亚", englishName: "Malaysia", code: "MY", flag: "🇲🇾" },
      { name: "新加坡", englishName: "Singapore", code: "SG", flag: "🇸🇬" },
      { name: "泰国", englishName: "Thailand", code: "TH", flag: "🇹🇭" },
      { name: "越南", englishName: "Vietnam", code: "VN", flag: "🇻🇳" },
      { name: "缅甸", englishName: "Myanmar", code: "MM", flag: "🇲🇲" },
      { name: "文莱", englishName: "Brunei", code: "BN", flag: "🇧🇳" },
      { name: "印度尼西亚", englishName: "Indonesia", code: "ID", flag: "🇮🇩" },
      { name: "菲律宾", englishName: "Philippines", code: "PH", flag: "🇵🇭" },
    ]
  },
  {
    name: "欧洲 (Europe)",
    countries: [
      { name: "英国", englishName: "United Kingdom", code: "GB", flag: "🇬🇧" },
      { name: "法国", englishName: "France", code: "FR", flag: "🇫🇷" },
      { name: "德国", englishName: "Germany", code: "DE", flag: "🇩🇪" },
    ]
  },
  {
    name: "美洲 (Americas)",
    countries: [
      { name: "美国", englishName: "United States", code: "US", flag: "🇺🇸" },
    ]
  },
  {
    name: "中东与非洲 (Middle East & Africa)",
    countries: [
      { name: "埃及", englishName: "Egypt", code: "EG", flag: "🇪🇬" },
      { name: "阿曼", englishName: "Oman", code: "OM", flag: "🇴🇲" },
      { name: "迪拜 (阿联酋)", englishName: "Dubai (UAE)", code: "AE", flag: "🇦🇪" },
    ]
  }
];

export function Login({ onLoginSuccess, addToast }: LoginProps) {
  const searchParams = new URLSearchParams(typeof window !== "undefined" ? window.location.search : "");
  const recoveryHash = typeof window !== "undefined" ? parseOAuthHash(window.location.hash) : null;
  const hasRecoveryToken = searchParams.get("step") === "reset-password" && recoveryHash?.flowType === "recovery" && Boolean(recoveryHash.accessToken);
  const defaultMode = hasRecoveryToken
    ? "reset_password"
    : (searchParams.get("step") === "country" ? "select_country" : (searchParams.get("step") === "register" ? "register" : "login"));
  const [mode, setMode] = useState<"login" | "register" | "select_country" | "reset_password">(defaultMode);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [selectingCountryCode, setSelectingCountryCode] = useState<string | null>(null);
  const [recoveryToken, setRecoveryToken] = useState<string | null>(hasRecoveryToken ? recoveryHash?.accessToken || null : null);
  const [preAuthToken, setPreAuthToken] = useState<string | null>(() => sessionStorage.getItem("wms_pre_auth"));
  const [tempUser, setTempUser] = useState<AdminUser | null>(() => {
    try { return JSON.parse(sessionStorage.getItem("wms_pre_auth_user") || "null"); } catch { return null; }
  });
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(hasRecoveryToken ? "请输入包含字母和数字的新密码" : null);

  useEffect(() => {
    if (preAuthToken && tempUser && !hasRecoveryToken) setMode("select_country");
  }, []);

  const clearPreAuth = () => {
    sessionStorage.removeItem("wms_pre_auth");
    sessionStorage.removeItem("wms_pre_auth_user");
    setPreAuthToken(null);
    setTempUser(null);
  };
  const returnToLogin = () => {
    clearPreAuth();
    setRecoveryToken(null);
    setPassword("");
    setError(null);
    setNotice(null);
    setMode("login");
    window.history.replaceState({}, document.title, window.location.pathname);
  };
  const showError = (message: string) => { setError(message); setNotice(null); addToast(message, "error"); };
  const acceptPreAuth = (data: { preAuthToken: string; user: AdminUser }) => {
    setPreAuthToken(data.preAuthToken);
    setTempUser(data.user);
    sessionStorage.setItem("wms_pre_auth", data.preAuthToken);
    sessionStorage.setItem("wms_pre_auth_user", JSON.stringify(data.user));
    setMode("select_country");
  };

  const requestJson = async (url: string, init: RequestInit = {}) => {
    const controller = new AbortController();
    const timeout = window.setTimeout(() => controller.abort(), 20_000);
    try {
      const response = await fetch(url, { ...init, signal: controller.signal });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) {
        const requestError = new Error(data.error || data.message || "请求失败，请稍后重试") as AuthRequestError;
        requestError.status = response.status;
        throw requestError;
      }
      return data;
    } catch (reason) {
      if (reason instanceof Error && reason.name === "AbortError") throw new Error("请求超时，请检查网络后重试");
      throw reason;
    } finally {
      window.clearTimeout(timeout);
    }
  };

  // Standard Login Form Submission
  const handleLoginSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) {
      showError("请输入邮箱/账号和密码");
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const data = await requestJson("/api/v4/admin/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ account: email, password })
      });
      acceptPreAuth(data);
      addToast(`认证成功！欢迎回来，${data.user.name}，请选择工作海外仓。`);
    } catch (reason) {
      showError(reason instanceof Error ? reason.message : "登录失败");
    } finally {
      setIsLoading(false);
    }
  };

  // Standard Registration Form Submission
  const handleRegisterSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password || !name) {
      showError("请填写所有必填字段");
      return;
    }

    setIsLoading(true);
    setError(null);
    setNotice(null);
    try {
      const data = await requestJson("/api/v4/admin/auth/register", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ email, password, name }) });
      if (data.requiresEmailConfirmation) {
        setPassword("");
        setMode("login");
        setNotice(data.message);
        addToast(data.message, "info");
        return;
      }
      acceptPreAuth(data);
      addToast("账号注册成功，请选择工作海外仓", "success");
    } catch (reason) {
      showError(reason instanceof Error ? reason.message : "注册失败");
    } finally { setIsLoading(false); }
  };

  const handleForgotPassword = async () => {
    if (!email.includes("@")) { showError("请先输入注册邮箱"); return; }
    setIsLoading(true);
    setError(null);
    setNotice(null);
    try {
      const redirectUrl = new URL(window.location.href);
      redirectUrl.search = "?step=reset-password";
      redirectUrl.hash = "";
      const data = await requestJson("/api/v4/admin/auth/forgot-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, redirectTo: redirectUrl.toString() })
      });
      setNotice(data.message);
      addToast(data.message, "info");
    } catch (reason) {
      showError(reason instanceof Error ? reason.message : "密码重置邮件发送失败");
    } finally { setIsLoading(false); }
  };

  const handleResetPassword = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!recoveryToken) { showError("密码重置链接无效或已过期"); return; }
    setIsLoading(true);
    setError(null);
    try {
      const data = await requestJson("/api/v4/admin/auth/reset-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ accessToken: recoveryToken, password })
      });
      setRecoveryToken(null);
      setPassword("");
      setMode("login");
      setNotice(data.message);
      window.history.replaceState({}, document.title, window.location.pathname);
      addToast(data.message, "success");
    } catch (reason) {
      showError(reason instanceof Error ? reason.message : "密码更新失败");
    } finally { setIsLoading(false); }
  };

  // Google Sign-In trigger
  const handleGoogleLoginClick = async () => {
    if (isLoading) return;
    setIsLoading(true);
    setError(null);
    setNotice(null);
    // 统一使用 login_or_register 模式：已注册自动登录，未注册自动注册开通租户
    const intent = "login_or_register";
    const attemptId = createGoogleAuthAttemptId();
    const popup = openCenteredPopup("about:blank", GOOGLE_POPUP_NAME);
    if (!popup) { setIsLoading(false); showError("浏览器拦截了授权弹窗，请允许弹窗后重试"); return; }
    const callbackUrl = buildGooglePopupCallbackUrl(window.location.origin, attemptId, intent);
    let interval = 0;
    let timeout = 0;
    let channel: BroadcastChannel | null = null;
    let resolved = false;
    const cleanup = () => {
      window.removeEventListener("message", onMessage);
      window.removeEventListener("storage", onStorage);
      if (interval) window.clearInterval(interval);
      if (timeout) window.clearTimeout(timeout);
      channel?.close();
    };
    const finish = async (message: GoogleAuthPopupMessage) => {
      if (resolved || message.type !== GOOGLE_AUTH_MESSAGE_TYPE || message.attemptId !== attemptId) return;
      resolved = true;
      cleanup();
      closePopupWindow(popup);
      if (message.status === "error" || !message.accessToken) {
        setIsLoading(false);
        showError(message.error || "Google 授权失败");
        return;
      }
      try {
        const data = await requestJson("/api/v4/admin/auth/google/complete", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ accessToken: message.accessToken, intent }) });
        acceptPreAuth(data);
        addToast("Google 授权成功，请选择工作海外仓", "success");
      } catch (reason) {
        showError(reason instanceof Error ? reason.message : "Google 授权失败");
      } finally {
        setIsLoading(false);
      }
    };
    function onMessage(event: MessageEvent<GoogleAuthPopupMessage>) { if (event.origin === window.location.origin) void finish(event.data); }
    function onStorage(event: StorageEvent) { if (event.key === GOOGLE_AUTH_STORAGE_EVENT_KEY && event.newValue) { try { void finish(JSON.parse(event.newValue)); } catch {} } }
    try {
      window.addEventListener("message", onMessage);
      window.addEventListener("storage", onStorage);
      if ("BroadcastChannel" in window) { channel = new BroadcastChannel(GOOGLE_AUTH_BROADCAST_CHANNEL); channel.onmessage = event => void finish(event.data); }
      interval = window.setInterval(() => { try { if (popup.closed && !resolved) { resolved = true; cleanup(); setIsLoading(false); showError("你已关闭 Google 授权弹窗，请重试"); } } catch {} }, 500);
      timeout = window.setTimeout(() => { if (!resolved) { resolved = true; cleanup(); closePopupWindow(popup); setIsLoading(false); showError("Google 授权超时，请重试"); } }, 60_000);
      const data = await requestJson(`/api/v4/public/google-auth-url?redirectTo=${encodeURIComponent(callbackUrl)}`, {});
      popup.location.href = data.url;
    } catch (reason) {
      resolved = true;
      cleanup();
      closePopupWindow(popup);
      setIsLoading(false);
      showError(reason instanceof Error ? reason.message : "无法启动 Google 授权");
    }
  };

  const allowedWarehouses = tempUser?.allowedWarehouses || [];
  const visibleContinents = CONTINENTS
    .map(continent => ({
      ...continent,
      countries: continent.countries.filter(country => allowedWarehouses.includes("*") || allowedWarehouses.includes(country.code))
    }))
    .filter(continent => continent.countries.length > 0);

  // Complete country selection & start app
  const handleSelectCountry = async (country: typeof CONTINENTS[0]["countries"][0]) => {
    if (!tempUser || !preAuthToken || selectingCountryCode) return;
    const countryStr = `${country.flag} ${country.name}`;
    const currency = getCurrencyForCountry(countryStr);
    setSelectingCountryCode(country.code);
    setError(null);
    try {
      const data = await requestJson("/api/v4/admin/auth/select-country", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${preAuthToken}`
        },
        body: JSON.stringify({ countryCode: country.code, countryName: countryStr, currency })
      });
      localStorage.setItem("wms_admin_token", data.accessToken);
      clearPreAuth();
      addToast(`已成功接入：${country.flag} ${country.name} (${country.englishName}) 仓库`, "success");
      onLoginSuccess(data.user);
    } catch (reason) {
      const requestError = reason as AuthRequestError;
      if (requestError.status === 401) {
        clearPreAuth();
        setMode("login");
      }
      showError(reason instanceof Error ? reason.message : "选仓失败，请重试");
    } finally {
      setSelectingCountryCode(null);
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 flex flex-col lg:flex-row relative overflow-hidden font-sans">
      
      {/* Decorative Interactive Background Elements */}
      <div className="absolute top-[-10%] left-[-10%] w-[50%] h-[50%] rounded-full bg-brand-500/10 blur-[130px] pointer-events-none" />
      <div className="absolute bottom-[-10%] right-[-10%] w-[50%] h-[50%] rounded-full bg-indigo-500/10 blur-[130px] pointer-events-none" />
      <div className="absolute top-[40%] right-[30%] w-[30%] h-[30%] rounded-full bg-emerald-500/5 blur-[120px] pointer-events-none" />
      
      {/* Dynamic Grid Overlay */}
      <div 
        className="absolute inset-0 opacity-15 pointer-events-none"
        style={{
          backgroundImage: `radial-gradient(circle, rgba(99, 102, 241, 0.15) 1px, transparent 1px)`,
          backgroundSize: '24px 24px'
        }}
      />

      {/* Left Column: Visual Showcase & System Highlights (Visible on lg screens) */}
      <div className="hidden lg:flex lg:w-7/12 p-16 flex-col justify-between relative z-10 border-r border-slate-900 bg-slate-950/60 backdrop-blur-3xl overflow-hidden">
        
        {/* Subtle decorative circuit lines */}
        <div className="absolute inset-y-0 right-0 w-[1px] bg-gradient-to-b from-transparent via-slate-800 to-transparent" />
        
        {/* Header Branding */}
        <div className="flex items-center gap-3">
          <div className="inline-flex items-center justify-center w-10 h-10 rounded-xl bg-gradient-to-tr from-brand-600 to-indigo-500 text-white shadow-lg shadow-brand-500/20">
            <svg className="w-5.5 h-5.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
            </svg>
          </div>
          <div>
            <h1 className="text-lg font-black tracking-wider text-white">
              WMS<span className="text-brand-500">HR</span>
            </h1>
            <p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest leading-none">Global Logistics Suite</p>
          </div>
        </div>

        {/* Core Presentation Content */}
        <div className="my-auto max-w-xl space-y-8">
          <div className="space-y-4">
            <h2 className="text-4xl font-black text-white leading-tight tracking-tight">
              智连全球海外仓，<br />
              让跨境团队人效与协同<span className="text-transparent bg-clip-text bg-gradient-to-r from-brand-400 via-indigo-400 to-emerald-400">效能无界</span>
            </h2>
            <p className="text-sm text-slate-300 font-medium leading-relaxed">
              专门针对多国跨国分拨海外仓设计的人效、绩效、考勤和供应链管理一站式中枢。集成智能假期算法、多币种核销账单、实操培训管理及即时客户订单协同。
            </p>
          </div>

          {/* Frosted Feature Highlights Grid */}
          <div className="grid grid-cols-2 gap-4">
            <div className="p-4 bg-slate-900/40 border border-slate-800/80 rounded-2xl transition hover:border-slate-700/80">
              <div className="w-8 h-8 rounded-lg bg-brand-500/10 flex items-center justify-center text-brand-400 mb-2.5">
                <Globe className="w-4 h-4" />
              </div>
              <h4 className="text-xs font-black text-slate-100">多国合规与公共假期</h4>
              <p className="text-[11px] text-slate-300 mt-1 leading-normal">
                智能融合东南亚、欧美等24国法定假期，自动匹配考勤及假期汇算规则。
              </p>
            </div>

            <div className="p-4 bg-slate-900/40 border border-slate-800/80 rounded-2xl transition hover:border-slate-700/80">
              <div className="w-8 h-8 rounded-lg bg-emerald-500/10 flex items-center justify-center text-emerald-400 mb-2.5">
                <Compass className="w-4 h-4" />
              </div>
              <h4 className="text-xs font-black text-slate-100">多仓实时分拨订单</h4>
              <p className="text-[11px] text-slate-300 mt-1 leading-normal">
                泰国、首尔、迪拜等全球节点库容数据即时同步，无缝抓取TikTok等平台单。
              </p>
            </div>

            <div className="p-4 bg-slate-900/40 border border-slate-800/80 rounded-2xl transition hover:border-slate-700/80">
              <div className="w-8 h-8 rounded-lg bg-indigo-500/10 flex items-center justify-center text-indigo-400 mb-2.5">
                <LogIn className="w-4 h-4" />
              </div>
              <h4 className="text-xs font-black text-slate-100">多币种智能薪酬核销</h4>
              <p className="text-[11px] text-slate-300 mt-1 leading-normal">
                打通底薪、津贴和加班费，一键生成符合属地税收法规的明细工资单。
              </p>
            </div>

            <div className="p-4 bg-slate-900/40 border border-slate-800/80 rounded-2xl transition hover:border-slate-700/80">
              <div className="w-8 h-8 rounded-lg bg-purple-500/10 flex items-center justify-center text-purple-400 mb-2.5">
                <User className="w-4 h-4" />
              </div>
              <h4 className="text-xs font-black text-slate-100">实操标准化培训 (SOP)</h4>
              <p className="text-[11px] text-slate-300 mt-1 leading-normal">
                针对入库、打包、质检建立高标准的在线考核、多语种文档与后勤培训。
              </p>
            </div>
          </div>
        </div>

        {/* Footer info/stats */}
        <div className="flex items-center justify-between border-t border-slate-900 pt-6">
          <div className="flex gap-8">
            <div>
              <p className="text-xs font-black text-slate-400 uppercase tracking-wider">海外仓节点</p>
              <p className="text-lg font-black text-white mt-0.5 font-mono">24+</p>
            </div>
            <div>
              <p className="text-xs font-black text-slate-400 uppercase tracking-wider">系统可用率</p>
              <p className="text-lg font-black text-emerald-400 mt-0.5 font-mono">99.99%</p>
            </div>
            <div>
              <p className="text-xs font-black text-slate-400 uppercase tracking-wider">数据加解密</p>
              <p className="text-lg font-black text-indigo-400 mt-0.5 font-mono">AES-256</p>
            </div>
          </div>
          
          <div className="text-[11px] font-bold text-slate-400">
            WMSHR Cloud Services Platform
          </div>
        </div>
      </div>

      {/* Right Column: Interaction Form Panel (Always Center on Mobile, splits on Desktop) */}
      <div className="flex-1 flex flex-col justify-center items-center py-12 px-4 sm:px-6 lg:px-12 relative z-10 bg-slate-950/20">
        
        {/* Top Floating Stats for Mobile View (Hidden on LG) */}
        <div className="lg:hidden flex flex-col items-center mb-8 text-center">
          <div className="inline-flex items-center justify-center w-12 h-12 rounded-2xl bg-gradient-to-tr from-brand-600 to-indigo-500 text-white mb-3 shadow-lg shadow-brand-500/20">
            <svg className="w-6 h-6 animate-pulse" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
            </svg>
          </div>
          <h2 className="text-2xl font-black tracking-tight text-white">
            WMS<span className="text-brand-500">HR</span> 后台管理系统
          </h2>
          <p className="mt-1.5 text-xs text-slate-300 font-medium max-w-xs">
            多国分拨海外仓人效与考勤供应链协同中枢
          </p>
        </div>

        <div className="max-w-md w-full space-y-8 relative">
          <AnimatePresence mode="wait">
            {mode !== "select_country" ? (
              <motion.div
                key="auth-card"
                initial={{ opacity: 0, y: 15 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -15 }}
                className="bg-slate-900/85 backdrop-blur-xl border border-slate-800/80 rounded-3xl p-8 shadow-2xl relative"
              >
                {/* Visual Glow at top of form */}
                <div className="absolute top-0 left-1/4 right-1/4 h-[1px] bg-gradient-to-r from-transparent via-brand-500/50 to-transparent" />

                <div className="text-center mb-6 hidden lg:block">
                  <h3 className="text-xl font-black text-white">
                    {mode === "login" ? "登录管理员账户" : mode === "register" ? "注册新管理员账户" : "设置新密码"}
                  </h3>
                  <p className="mt-1.5 text-xs text-slate-300 font-medium">
                    {mode === "login" ? "请登录您的海外仓管理员或员工账户" : mode === "register" ? "注册一个新的海外仓管理账号" : "密码至少 8 位，并包含字母和数字"}
                  </p>
                </div>

                {/* Form implementation */}
                <form className="space-y-4" onSubmit={mode === "login" ? handleLoginSubmit : mode === "register" ? handleRegisterSubmit : handleResetPassword}>
                  {notice && (
                    <motion.div
                      initial={{ opacity: 0, y: -8 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="bg-sky-500/10 border border-sky-500/30 text-sky-100 text-xs rounded-xl p-3 flex items-start gap-2.5"
                    >
                      <CheckCircle className="w-4 h-4 text-sky-400 shrink-0 mt-0.5" />
                      <p className="leading-relaxed">{notice}</p>
                    </motion.div>
                  )}
                  {error && (
                    <motion.div
                      initial={{ opacity: 0, y: -8 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="bg-red-500/10 border border-red-500/30 text-red-200 text-xs rounded-xl p-3 flex items-start gap-2.5"
                    >
                      <svg className="w-4 h-4 text-red-400 shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"/>
                      </svg>
                      <div className="flex-1 leading-tight">
                        <p className="font-bold text-red-300">认证反馈</p>
                        <p className="mt-1 text-[11px] text-red-200/90">{error}</p>
                      </div>
                    </motion.div>
                  )}

                  {mode === "register" && (
                    <div>
                      <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-1.5">
                        姓名 / 昵称
                      </label>
                      <div className="relative">
                        <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                          <User className="h-4.5 w-4.5" />
                        </div>
                        <input
                          type="text"
                          required
                          placeholder="请输入您的姓名"
                          value={name}
                          onChange={(e) => { setName(e.target.value); setError(null); }}
                          className="block w-full pl-10 pr-4 py-3 bg-slate-950/80 border border-slate-800 rounded-xl text-sm text-white placeholder-slate-500 outline-none focus:ring-2 focus:ring-brand-500 focus:border-transparent transition-all"
                        />
                      </div>
                    </div>
                  )}

                  {mode !== "reset_password" && (
                    <div>
                      <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-1.5">
                        登录邮箱 / 账户
                      </label>
                      <div className="relative">
                        <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                          <Mail className="h-4.5 w-4.5" />
                        </div>
                        <input
                          type={mode === "register" ? "email" : "text"}
                          required
                          disabled={isLoading}
                          autoComplete={mode === "register" ? "email" : "username"}
                          placeholder="admin@wms.com 或员工账号"
                          value={email}
                          onChange={(e) => { setEmail(e.target.value); setError(null); setNotice(null); }}
                          className="block w-full pl-10 pr-4 py-3 bg-slate-950/80 border border-slate-800 rounded-xl text-sm text-white placeholder-slate-500 outline-none focus:ring-2 focus:ring-brand-500 focus:border-transparent transition-all disabled:opacity-60"
                        />
                      </div>
                    </div>
                  )}

                  <div>
                    <div className="flex justify-between items-center mb-1.5">
                      <label className="block text-xs font-bold text-slate-200 uppercase tracking-wider">
                        {mode === "reset_password" ? "新密码" : "登录密码"}
                      </label>
                      {mode === "login" && (
                        <button
                          type="button"
                          disabled={isLoading}
                          onClick={handleForgotPassword}
                          className="text-[11px] text-brand-400 hover:text-brand-300 hover:underline cursor-pointer font-bold transition-all disabled:opacity-50"
                        >
                          忘记密码？
                        </button>
                      )}
                    </div>
                    <div className="relative">
                      <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                        <Lock className="h-4.5 w-4.5" />
                      </div>
                      <input
                        type="password"
                        required
                        minLength={mode === "login" ? undefined : 8}
                        disabled={isLoading}
                        autoComplete={mode === "login" ? "current-password" : "new-password"}
                        placeholder="••••••••"
                        value={password}
                        onChange={(e) => { setPassword(e.target.value); setError(null); setNotice(null); }}
                        className="block w-full pl-10 pr-4 py-3 bg-slate-950/80 border border-slate-800 rounded-xl text-sm text-white placeholder-slate-500 outline-none focus:ring-2 focus:ring-brand-500 focus:border-transparent transition-all disabled:opacity-60"
                      />
                    </div>
                  </div>

                  <button
                    type="submit"
                    disabled={isLoading}
                    className="w-full flex justify-center items-center gap-2 py-3 px-4 border border-transparent rounded-xl text-sm font-bold text-white bg-gradient-to-r from-brand-600 to-indigo-600 hover:from-brand-500 hover:to-indigo-500 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-slate-950 focus:ring-brand-500 transition-all cursor-pointer shadow-lg shadow-brand-600/20 active:scale-[0.98] disabled:opacity-50"
                  >
                    {isLoading ? (
                      <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    ) : mode === "login" ? (
                      <>
                        <LogIn className="w-4 h-4" /> 登 录
                      </>
                    ) : mode === "register" ? (
                      <>
                        <CheckCircle className="w-4 h-4" /> 注 册
                      </>
                    ) : (
                      <>
                        <CheckCircle className="w-4 h-4" /> 更新密码
                      </>
                    )}
                  </button>
                </form>

                {/* Google login & Toggle mode */}
                {mode !== "reset_password" ? (
                  <div className="mt-5">
                    <div className="relative flex py-3 items-center">
                      <div className="flex-grow border-t border-slate-800"></div>
                      <span className="flex-shrink mx-4 text-xs font-bold text-slate-400 uppercase tracking-widest">
                        或通过第三方联登
                      </span>
                      <div className="flex-grow border-t border-slate-800"></div>
                    </div>

                    <button
                      type="button"
                      disabled={isLoading}
                      onClick={handleGoogleLoginClick}
                      className="w-full mt-2 flex justify-center items-center gap-2.5 py-3 px-4 bg-slate-950/80 hover:bg-slate-900 border border-slate-800 rounded-xl text-sm font-bold text-slate-200 transition-all cursor-pointer shadow-sm active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {isLoading ? (
                        <div className="w-4.5 h-4.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                      ) : (
                        <svg className="w-4.5 h-4.5" viewBox="0 0 24 24">
                          <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                          <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                          <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z" />
                          <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
                        </svg>
                      )}
                      使用 Google 账号一键联登
                    </button>

                    <div className="mt-6 text-center">
                      <span className="text-xs text-slate-400">
                        {mode === "login" ? "还没有管理员账户？" : "已有管理员账号？"}
                      </span>{" "}
                      <button
                        type="button"
                        disabled={isLoading}
                        onClick={() => { setMode(mode === "login" ? "register" : "login"); setError(null); setNotice(null); setPassword(""); }}
                        className="text-xs text-brand-400 hover:text-brand-300 hover:underline font-extrabold transition-all ml-1 cursor-pointer disabled:opacity-50"
                      >
                        {mode === "login" ? "点击注册一个" : "立即去登录"}
                      </button>
                    </div>
                  </div>
                ) : (
                  <button type="button" onClick={returnToLogin} className="w-full mt-5 text-xs text-brand-400 hover:text-brand-300 font-bold">
                    返回登录
                  </button>
                )}

              </motion.div>
            ) : (
              <motion.div
                key="country-selector"
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                className="bg-slate-900 border border-slate-800 rounded-3xl p-8 shadow-2xl max-w-2xl w-full"
              >
                <div className="text-center mb-6">
                  <div className="inline-flex items-center justify-center w-12 h-12 rounded-2xl bg-emerald-600 text-white mb-3 shadow-lg shadow-emerald-500/20">
                    <Globe className="w-6 h-6 animate-spin-slow" />
                  </div>
                  <h2 className="text-2xl font-black text-white">请选择您工作的海外仓国家</h2>
                  <p className="mt-1.5 text-xs text-slate-300 font-medium max-w-md mx-auto">
                    您当前登录的账号：<span className="text-brand-400 font-bold">{tempUser?.name} ({tempUser?.email})</span>。系统将根据您选择的国家，自动载入相对应的物流关税与本地假期日历。
                  </p>
                  {error && (
                    <div className="mt-4 rounded-xl border border-red-500/30 bg-red-500/10 p-3 text-xs text-red-200">{error}</div>
                  )}
                </div>

                {/* Continents Grid */}
                <div className="space-y-6 max-h-[400px] overflow-y-auto pr-2 scrollbar-thin">
                  {visibleContinents.map((cont, cIdx) => (
                    <div key={cIdx} className="space-y-2">
                      <h3 className="text-xs font-black text-slate-300 uppercase tracking-widest flex items-center gap-1.5 px-1">
                        <Compass className="w-3.5 h-3.5 text-brand-500 animate-spin-slow" />
                        {cont.name}
                      </h3>
                      <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                        {cont.countries.map((country) => (
                          <button
                            key={country.code}
                            onClick={() => handleSelectCountry(country)}
                            disabled={Boolean(selectingCountryCode)}
                            className="flex items-center gap-2 px-3.5 py-3 bg-slate-950/60 hover:bg-brand-600 border border-slate-800/60 hover:border-brand-500 text-slate-300 hover:text-white rounded-xl transition-all duration-200 cursor-pointer text-left group active:scale-[0.98] disabled:opacity-50 disabled:cursor-wait"
                          >
                            {selectingCountryCode === country.code ? (
                              <span className="w-6 h-6 border-2 border-white/30 border-t-white rounded-full animate-spin shrink-0" />
                            ) : (
                              <span className="text-2xl group-hover:scale-110 transition-transform">{country.flag}</span>
                            )}
                            <div>
                              <p className="text-xs font-bold leading-tight">{country.name}</p>
                              <p className="text-[10px] text-slate-400 group-hover:text-slate-200 font-medium tracking-tight mt-0.5 uppercase">{country.englishName}</p>
                            </div>
                          </button>
                        ))}
                      </div>
                    </div>
                  ))}
                  {visibleContinents.length === 0 && (
                    <div className="rounded-xl border border-amber-500/30 bg-amber-500/10 p-4 text-xs text-amber-100">
                      当前账号没有可用的海外仓，请联系管理员分配仓库权限。
                    </div>
                  )}
                </div>

                <div className="mt-6 pt-4 border-t border-slate-850 flex items-center justify-between">
                  <span className="text-[10.5px] text-slate-400 font-medium flex items-center gap-1">
                    <ShieldAlert className="w-3.5 h-3.5 text-slate-500" />
                    后续可在顶部随时自由切换其他国家
                  </span>
                  <button
                    onClick={returnToLogin}
                    className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-xs font-bold text-slate-300 rounded-lg transition"
                  >
                    返回重新登录
                  </button>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Simple signature on right panel bottom */}
          <div className="text-center">
            <span className="text-[10px] font-bold text-slate-400 font-mono tracking-widest uppercase">
              WMSHR Cloud Suite · 2026
            </span>
          </div>
        </div>
      </div>

    </div>
  );
}
