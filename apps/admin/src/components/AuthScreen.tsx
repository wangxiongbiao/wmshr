/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useEffect, useRef, useState, type FormEvent } from "react";
import { useTranslation } from "react-i18next";
import { SUPPORTED_LANGUAGES, type SupportedLanguageCode } from "@wmshr/i18n";
import { ArrowLeft, Check, ChevronDown, Languages } from "lucide-react";

export type AdminEmailAuthMode = "login" | "register";

export interface AdminEmailAuthPayload {
  mode: AdminEmailAuthMode;
  email: string;
  password: string;
  confirmPassword: string;
}

interface AuthScreenProps {
  currentLanguage: SupportedLanguageCode;
  loading?: boolean;
  emailLoading?: boolean;
  onGoogleLogin: () => void;
  onEmailAuth: (payload: AdminEmailAuthPayload) => void | Promise<void>;
  onLanguageChange: (language: SupportedLanguageCode) => void;
  error?: string;
}

const languages = SUPPORTED_LANGUAGES.map(({ code, nativeName }) => ({ code, name: nativeName }));

// 登录页“返回官网”必须和门户服务解耦：本地调试回 3001 门户，生产环境回正式官网；如域名调整，优先通过 VITE_HOME_URL 覆盖。
const HOME_SITE_URL = import.meta.env.VITE_HOME_URL
  || (import.meta.env.DEV ? "http://localhost:3001" : "https://dutylix.com");

function GoogleIcon() {
  return (
    <svg viewBox="0 0 24 24" className="w-5 h-5" aria-hidden="true">
      <path fill="#EA4335" d="M12 10.2v3.9h5.4c-.2 1.2-.9 2.2-1.9 2.9l3 2.3c1.7-1.6 2.7-4 2.7-6.8 0-.7-.1-1.4-.2-2H12z" />
      <path fill="#34A853" d="M12 21c2.4 0 4.4-.8 5.9-2.1l-3-2.3c-.8.6-1.8 1-2.9 1-2.2 0-4-1.5-4.7-3.4L4.2 16.6C5.7 19.3 8.6 21 12 21z" />
      <path fill="#FBBC05" d="M7.3 14.2c-.2-.6-.3-1.3-.3-2s.1-1.4.3-2L4.2 7.8C3.4 9.3 3 10.6 3 12.2s.4 2.9 1.2 4.4l3.1-2.4z" />
      <path fill="#4285F4" d="M12 6.8c1.3 0 2.5.4 3.4 1.3l2.6-2.6C16.4 4 14.4 3 12 3 8.6 3 5.7 4.7 4.2 7.8l3.1 2.4c.7-2 2.5-3.4 4.7-3.4z" />
    </svg>
  );
}

function WmshrLogoMark({ className = "w-10 h-10" }: { className?: string }) {
  return <img src="/dutylix-icon.svg" alt="" aria-hidden="true" className={className} />;
}

function LanguageSelector({
  currentLanguage,
  onLanguageChange,
}: {
  currentLanguage: SupportedLanguageCode;
  onLanguageChange: (language: SupportedLanguageCode) => void;
}) {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const currentLanguageOption = languages.find((item) => item.code === currentLanguage) || languages[0];

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  return (
    <div className="relative" ref={containerRef}>
      <button
        type="button"
        onClick={() => setIsOpen((prev) => !prev)}
        className="flex items-center gap-2 rounded-full border border-white/15 bg-white/10 px-3.5 py-2 text-sm font-medium text-white/90 backdrop-blur-xl transition hover:bg-white/15"
      >
        <Languages className="h-4 w-4 text-cyan-300" />
        <span className="hidden sm:inline">{currentLanguageOption.name}</span>
        <ChevronDown className={`h-4 w-4 text-white/60 transition-transform ${isOpen ? "rotate-180" : ""}`} />
      </button>

      {isOpen ? (
        <div className="absolute right-0 top-full z-[60] mt-2 w-48 overflow-hidden rounded-2xl border border-white/10 bg-slate-950/92 shadow-2xl shadow-black/35 backdrop-blur-2xl">
          <div className="py-2">
            {languages.map((lang) => (
              <button
                key={lang.code}
                type="button"
                onClick={() => {
                  // 登录页语言必须继续以路由 path 为唯一来源；这里只能走父层路由切换，不能只局部改 i18n 状态。
                  onLanguageChange(lang.code as SupportedLanguageCode);
                  setIsOpen(false);
                }}
                className="flex w-full items-center justify-between px-4 py-2.5 text-left text-sm text-white/85 transition hover:bg-white/10"
              >
                <span>{lang.name}</span>
                {currentLanguage === lang.code ? <Check className="h-4 w-4 text-cyan-300" /> : null}
              </button>
            ))}
          </div>
        </div>
      ) : null}
    </div>
  );
}

export function AuthScreen({
  currentLanguage,
  loading = false,
  emailLoading = false,
  onGoogleLogin,
  onEmailAuth,
  onLanguageChange,
  error,
}: AuthScreenProps) {
  const { t } = useTranslation(["auth", "common"]);
  const [mode, setMode] = useState<AdminEmailAuthMode>("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  // admin 已把语言固定在 `/:lang/:tab`；这里返回官网时必须把当前 lang 回传给门户，避免从后台返回后又掉回裸站默认语言。
  const homeUrl = new URL(`/${currentLanguage}`, `${HOME_SITE_URL.replace(/\/+$/, "")}/`).toString();
  const isRegister = mode === "register";
  const emailActionText = isRegister ? t("注册并进入后台") : t("邮箱登录");

  const handleEmailSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    void onEmailAuth({ mode, email, password, confirmPassword });
  };

  return (
    <div className="min-h-screen overflow-hidden bg-[#07111f] text-white">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_15%_20%,rgba(34,211,238,0.18),transparent_30%),radial-gradient(circle_at_85%_18%,rgba(59,130,246,0.18),transparent_26%),radial-gradient(circle_at_50%_100%,rgba(16,185,129,0.16),transparent_30%),linear-gradient(135deg,#020617_0%,#07111f_42%,#0b1f35_100%)]" />
      <div className="absolute inset-0 opacity-[0.12] bg-[linear-gradient(to_right,rgba(148,163,184,0.32)_1px,transparent_1px),linear-gradient(to_bottom,rgba(148,163,184,0.32)_1px,transparent_1px)] bg-[size:72px_72px]" />
      <div className="absolute -left-24 top-20 h-80 w-80 rounded-full bg-cyan-500/12 blur-3xl" />
      <div className="absolute bottom-0 right-0 h-96 w-96 rounded-full bg-blue-500/10 blur-3xl" />

      <main className="relative min-h-screen px-5 py-5 lg:px-10 lg:py-8 flex items-center">
        <div className="absolute left-5 top-5 right-5 z-50 flex items-center justify-between gap-3 lg:left-10 lg:right-10 lg:top-8">
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-white/10 shadow-lg shadow-cyan-500/10 backdrop-blur-xl">
              <WmshrLogoMark className="h-10 w-10" />
            </div>
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.24em] text-white/45">WMSHR Admin</p>
              <p className="text-sm text-white/75">{t("统一管理员入口")}</p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <LanguageSelector currentLanguage={currentLanguage} onLanguageChange={onLanguageChange} />
            <a
              href={homeUrl}
              // 登录页顶部控制条需要和门户一样保持同层可见；返回官网与语言切换都固定在玻璃头部，避免被主体卡片遮挡。
              className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/10 px-4 py-2 text-sm font-medium text-white/90 backdrop-blur-xl transition hover:bg-white/15"
            >
              <ArrowLeft className="h-4 w-4" />
              <span className="hidden sm:inline">{t("返回官网")}</span>
            </a>
          </div>
        </div>

        <div className="mx-auto grid w-full max-w-7xl items-center gap-6 pt-16 lg:grid-cols-[1.08fr_0.92fr] lg:pt-10">
          <section className="relative min-h-[620px] overflow-hidden rounded-[2rem] border border-white/10 bg-white/[0.06] p-6 shadow-[0_30px_100px_rgba(2,6,23,0.4)] backdrop-blur-2xl lg:rounded-[2.5rem] lg:p-8">
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_18%_20%,rgba(34,211,238,0.12),transparent_34%),radial-gradient(circle_at_76%_76%,rgba(16,185,129,0.12),transparent_28%)]" />
            <div className="absolute left-8 top-8 hidden h-[80%] w-px bg-white/10 lg:block" />

            <div className="relative ml-0 grid h-full min-h-[560px] grid-rows-[1fr_auto] lg:ml-12">
              <div className="relative overflow-hidden rounded-[1.75rem] border border-white/10 bg-slate-950/35 p-5 shadow-inner shadow-black/20">
                <div className="absolute inset-0 bg-[linear-gradient(145deg,rgba(255,255,255,0.04),transparent_42%),radial-gradient(circle_at_70%_20%,rgba(255,255,255,0.08),transparent_24%)]" />
                <div className="absolute inset-x-0 bottom-0 h-48 bg-gradient-to-t from-cyan-500/8 to-transparent" />

                <div className="relative grid h-full min-h-[360px] grid-cols-[0.9fr_1.1fr] gap-4">
                  <div className="flex flex-col justify-end gap-4">
                    <div className="w-full max-w-44 rounded-[1.35rem] border border-white/12 bg-white/10 p-4 shadow-xl shadow-black/10 backdrop-blur-md">
                      <p className="text-[10px] font-bold uppercase tracking-[0.24em] text-cyan-100/55">{t("安全登录")}</p>
                      <p className="mt-3 text-3xl font-semibold tracking-tight text-white">08:30</p>
                      <p className="mt-2 text-xs text-white/60">{t("Google 或邮箱进入")}</p>
                    </div>
                    <div className="ml-6 w-full max-w-52 rounded-[1.35rem] border border-cyan-300/15 bg-slate-950/70 p-4 text-white shadow-2xl shadow-black/20 backdrop-blur-md">
                      <p className="text-[10px] font-bold uppercase tracking-[0.24em] text-cyan-100/70">{t("薪资边界")}</p>
                      <div className="mt-4 space-y-2">
                        <div className="h-2 w-28 rounded-full bg-white/70" />
                        <div className="h-2 w-36 rounded-full bg-white/25" />
                        <div className="h-2 w-20 rounded-full bg-emerald-400/90" />
                      </div>
                    </div>
                  </div>

                  <div className="relative flex items-center justify-center">
                    <div className="absolute h-72 w-72 rounded-full border border-white/10 bg-white/[0.03]" />
                    <div className="relative min-h-80 w-64 rotate-3 rounded-[2rem] border border-white/12 bg-white/[0.08] p-5 shadow-2xl shadow-black/20 backdrop-blur-md">
                      <div className="flex items-start justify-between gap-3 border-b border-white/10 pb-4">
                        <div className="min-w-0 flex-1">
                          <p className="text-[10px] font-bold uppercase tracking-[0.24em] text-cyan-100/55">{t("专属工作台")}</p>
                          <p className="mt-1 text-lg font-semibold leading-tight text-white">{t("只显示你的团队数据")}</p>
                        </div>
                        <span className="rounded-full bg-emerald-500/15 px-3 py-1 text-[10px] font-bold text-emerald-200 text-center leading-tight flex-shrink-0">{t("在线")}</span>
                      </div>
                      <div className="mt-5 space-y-4">
                        {[[t("安全登录"), "8.0h"], [t("薪资边界"), "1.25h"], [t("专属工作台"), t("在线")]].map(([label, value], index) => (
                          <div key={label}>
                            <div className="mb-2 flex items-start justify-between gap-2 text-xs text-white/55">
                              <span className="flex-1 leading-tight">{label}</span>
                              <span className="flex-shrink-0 text-right">{value}</span>
                            </div>
                            <div className="h-2 overflow-hidden rounded-full bg-white/10">
                              <div className={`h-full rounded-full ${index === 0 ? "w-[82%] bg-white" : index === 1 ? "w-[38%] bg-cyan-400" : "w-[58%] bg-emerald-400"}`} />
                            </div>
                          </div>
                        ))}
                      </div>
                      <div className="mt-6 rounded-2xl border border-white/10 bg-slate-950/35 p-4">
                        <p className="text-[10px] font-bold uppercase tracking-[0.24em] text-cyan-100/55">{t("薪资边界")}</p>
                        <p className="mt-2 text-2xl font-semibold text-white">12</p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              <div className="mt-6 grid gap-3 sm:grid-cols-3">
                {[
                  [t("安全登录"), t("Google 或邮箱进入")],
                  [t("专属工作台"), t("只显示你的团队数据")],
                  [t("薪资边界"), t("工资与考勤独立核对")]
                ].map(([title, caption]) => (
                  <div key={title} className="rounded-2xl border border-white/10 bg-white/[0.06] p-4 shadow-sm backdrop-blur-xl">
                    <p className="text-sm font-semibold text-white">{title}</p>
                    <p className="mt-1 text-xs text-white/55">{caption}</p>
                  </div>
                ))}
              </div>
            </div>
          </section>

          <aside className="relative mx-auto w-full max-w-[480px] rounded-[2rem] border border-white/10 bg-white/[0.08] p-7 shadow-[0_30px_90px_rgba(2,6,23,0.36)] backdrop-blur-2xl lg:-ml-8 lg:p-9">
            <div className="absolute -left-6 top-14 hidden h-24 w-12 rounded-l-full border-y border-l border-white/10 bg-white/[0.04] lg:block" />
            <div className="relative">
              <div className="mb-6">
                <p className="mb-3 text-2xl font-semibold tracking-tight text-white lg:text-3xl">{t("管理员登录")}</p>
                <p className="text-base leading-7 text-white/60">{t("统一管理员入口，登录后即可查看员工、考勤、加班与工资条数据。")}</p>
              </div>

              <div className="mb-4 grid grid-cols-2 rounded-2xl bg-white/[0.06] p-1 text-sm font-semibold text-white/55">
                <button
                  type="button"
                  onClick={() => setMode("login")}
                  className={`rounded-xl px-3 py-2 transition ${!isRegister ? "bg-white text-slate-950 shadow-sm" : "hover:text-white"}`}
                >
                  {t("邮箱登录")}
                </button>
                <button
                  type="button"
                  onClick={() => setMode("register")}
                  className={`rounded-xl px-3 py-2 transition ${isRegister ? "bg-white text-slate-950 shadow-sm" : "hover:text-white"}`}
                >
                  {t("邮箱注册")}
                </button>
              </div>

              <form onSubmit={handleEmailSubmit} className="space-y-3">
                <label className="block">
                  <span className="mb-1.5 block text-xs font-semibold text-white/65">{t("邮箱")}</span>
                  <input
                    type="email"
                    value={email}
                    onChange={(event) => setEmail(event.target.value)}
                    autoComplete="email"
                    placeholder="admin@example.com"
                    className="w-full rounded-2xl border border-white/10 bg-slate-950/35 px-4 py-3 text-sm text-white outline-none transition placeholder:text-white/25 focus:border-cyan-400/70 focus:ring-4 focus:ring-cyan-400/10"
                  />
                </label>
                <label className="block">
                  <span className="mb-1.5 block text-xs font-semibold text-white/65">{t("密码")}</span>
                  <input
                    type="password"
                    value={password}
                    onChange={(event) => setPassword(event.target.value)}
                    autoComplete={isRegister ? "new-password" : "current-password"}
                    placeholder={t("至少 8 位，包含字母和数字")}
                    className="w-full rounded-2xl border border-white/10 bg-slate-950/35 px-4 py-3 text-sm text-white outline-none transition placeholder:text-white/25 focus:border-cyan-400/70 focus:ring-4 focus:ring-cyan-400/10"
                  />
                </label>
                {isRegister ? (
                  <label className="block">
                    <span className="mb-1.5 block text-xs font-semibold text-white/65">{t("确认密码")}</span>
                    <input
                      type="password"
                      value={confirmPassword}
                      onChange={(event) => setConfirmPassword(event.target.value)}
                      autoComplete="new-password"
                      placeholder={t("再次输入密码")}
                      className="w-full rounded-2xl border border-white/10 bg-slate-950/35 px-4 py-3 text-sm text-white outline-none transition placeholder:text-white/25 focus:border-cyan-400/70 focus:ring-4 focus:ring-cyan-400/10"
                    />
                  </label>
                ) : null}
                <button
                  type="submit"
                  disabled={emailLoading || loading}
                  className="flex w-full items-center justify-center rounded-2xl bg-cyan-500 px-5 py-3.5 text-sm font-semibold text-slate-950 shadow-xl shadow-cyan-950/15 transition hover:-translate-y-0.5 hover:bg-cyan-400 disabled:translate-y-0 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {emailLoading ? t("正在处理...") : emailActionText}
                </button>
              </form>

              <div className="my-5 flex items-center gap-3 text-xs font-semibold text-white/35">
                <div className="h-px flex-1 bg-white/10" />
                <span>{t("或")}</span>
                <div className="h-px flex-1 bg-white/10" />
              </div>

              <button
                onClick={onGoogleLogin}
                disabled={loading || emailLoading}
                // 登录按钮是登录页最关键的文案承载位：这里保留图标+主文案结构，但允许文案换行，避免长翻译把主 CTA 裁掉。
                className="group flex w-full items-center justify-center gap-3 rounded-2xl border border-white/12 bg-white text-sm font-semibold text-slate-950 shadow-xl shadow-black/15 transition hover:-translate-y-0.5 hover:bg-cyan-50 disabled:translate-y-0 disabled:cursor-not-allowed disabled:opacity-60 px-5 py-4"
              >
                <span className="flex h-8 w-8 items-center justify-center rounded-full bg-white shadow-sm">
                  <GoogleIcon />
                </span>
                <span className="flex-1 whitespace-normal text-center leading-tight">
                  {loading ? t("正在打开 Google 授权...") : t("使用 Google 账号进入后台")}
                </span>
              </button>

              {error ? (
                <div className="mt-4 rounded-2xl border border-red-400/20 bg-red-500/10 px-4 py-3 text-sm text-red-100">
                  {error}
                </div>
              ) : null}
            </div>
          </aside>
        </div>
      </main>
    </div>
  );
}
