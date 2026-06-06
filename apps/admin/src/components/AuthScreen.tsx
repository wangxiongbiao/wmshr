/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useTranslation } from "react-i18next";

interface AuthScreenProps {
  loading?: boolean;
  onGoogleLogin: () => void;
  error?: string;
}

// 登录页“返回官网”必须和门户服务解耦：本地调试回 3001 门户，生产环境回正式官网；如域名调整，优先通过 VITE_HOME_URL 覆盖。
const HOME_SITE_URL = import.meta.env.VITE_HOME_URL
  || (import.meta.env.DEV ? "http://localhost:3001" : "https://dutylix.com");

function WmshrLogoMark() {
  // 继续复用 public/dutylix-icon.svg 这个既有路径，避免改动静态资源引用面；图形内容已恢复为蓝底 WMSHR 立方体标识。
  return <img src="/dutylix-icon.svg" alt="" aria-hidden="true" className="w-12 h-12" />;
}

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

export function AuthScreen({ loading = false, onGoogleLogin, error }: AuthScreenProps) {
  const { t } = useTranslation(["auth", "common"]);

  return (
    <div className="min-h-screen overflow-hidden bg-[#eef5f2] text-slate-950">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_12%_10%,rgba(191,224,221,0.75),transparent_32%),radial-gradient(circle_at_86%_18%,rgba(219,232,244,0.8),transparent_28%),linear-gradient(135deg,#fbfaf6_0%,#eef5f2_48%,#e8f0f6_100%)]" />
      <div className="absolute inset-0 opacity-[0.16] bg-[linear-gradient(to_right,#64748b_1px,transparent_1px),linear-gradient(to_bottom,#64748b_1px,transparent_1px)] bg-[size:72px_72px]" />

      <main className="relative min-h-screen px-5 py-5 lg:px-10 lg:py-8 flex items-center">
        <a
          href={HOME_SITE_URL}
          className="absolute right-5 top-5 lg:right-10 lg:top-8 rounded-full border border-white/70 bg-white/75 px-4 py-2 text-xs font-semibold text-slate-600 shadow-sm backdrop-blur-xl transition hover:-translate-y-0.5 hover:bg-white hover:text-slate-900"
        >
          {t("返回官网")}
        </a>

        <div className="mx-auto grid w-full max-w-7xl items-center gap-6 lg:grid-cols-[1.12fr_0.88fr]">
          <section className="relative min-h-[620px] overflow-hidden rounded-[2rem] border border-white/70 bg-white/45 p-6 shadow-[0_30px_100px_rgba(15,23,42,0.12)] backdrop-blur-2xl lg:rounded-[2.5rem] lg:p-8">
            {/* 视觉面板只负责传达“考勤/薪资被校准”的业务气质；真实认证边界仍在右侧 Google OAuth 卡片，不在门户主站保存登录态。 */}
            <div className="absolute left-7 top-8 z-10 hidden h-[82%] w-px bg-slate-900/10 lg:block" />

            <div className="absolute inset-0 bg-[radial-gradient(circle_at_18%_20%,rgba(14,165,233,0.12),transparent_34%),radial-gradient(circle_at_70%_80%,rgba(16,185,129,0.12),transparent_28%)]" />
            <div className="absolute -right-14 top-16 h-64 w-64 rounded-full bg-cyan-100/70 blur-3xl" />
            <div className="absolute bottom-0 left-1/2 h-52 w-72 -translate-x-1/2 rounded-full bg-emerald-100/70 blur-3xl" />

            <div className="relative ml-0 grid h-full min-h-[560px] grid-rows-[1fr_auto] lg:ml-12">
              <div className="relative rounded-[1.75rem] border border-white/65 bg-[#dfeae8] p-5 shadow-inner overflow-hidden">
                <div className="absolute inset-0 bg-[linear-gradient(145deg,rgba(15,23,42,0.08),transparent_42%),radial-gradient(circle_at_70%_20%,rgba(255,255,255,0.9),transparent_24%)]" />
                <div className="absolute inset-x-0 bottom-0 h-48 bg-gradient-to-t from-[#d7e4e2] to-transparent" />

                <div className="relative grid h-full min-h-[360px] grid-cols-[0.9fr_1.1fr] gap-4">
                  <div className="flex flex-col justify-end gap-4">
                    <div className="w-44 rounded-[1.35rem] border border-white/70 bg-white/70 p-4 shadow-xl shadow-slate-900/5 backdrop-blur-md">
                      <p className="text-[10px] font-bold uppercase tracking-[0.24em] text-slate-400">{t("安全登录")}</p>
                      <p className="mt-3 text-3xl font-semibold tracking-tight text-slate-900">08:30</p>
                      <p className="mt-2 text-xs text-slate-500">{t("Google 账号进入")}</p>
                    </div>
                    <div className="ml-10 w-52 rounded-[1.35rem] border border-white/70 bg-slate-950/80 p-4 text-white shadow-2xl shadow-slate-900/20 backdrop-blur-md">
                      <p className="text-[10px] font-bold uppercase tracking-[0.24em] text-cyan-100/70">{t("薪资边界")}</p>
                      <div className="mt-4 space-y-2">
                        <div className="h-2 w-28 rounded-full bg-white/70" />
                        <div className="h-2 w-36 rounded-full bg-white/35" />
                        <div className="h-2 w-20 rounded-full bg-emerald-300/80" />
                      </div>
                    </div>
                  </div>

                  <div className="relative flex items-center justify-center">
                    <div className="absolute h-72 w-72 rounded-full border border-white/70 bg-white/25" />
                    <div className="relative h-80 w-64 rotate-3 rounded-[2rem] border border-white/80 bg-white/80 p-5 shadow-2xl shadow-slate-900/10 backdrop-blur-md">
                      <div className="flex items-center justify-between border-b border-slate-200 pb-4">
                        <div>
                          <p className="text-[10px] font-bold uppercase tracking-[0.24em] text-slate-400">{t("专属工作台")}</p>
                          <p className="mt-1 text-lg font-semibold text-slate-900">{t("只显示你的团队数据")}</p>
                        </div>
                        <span className="rounded-full bg-emerald-100 px-3 py-1 text-[10px] font-bold text-emerald-700">{t("在线")}</span>
                      </div>
                      <div className="mt-5 space-y-4">
                        {[[t("安全登录"), "8.0h"], [t("薪资边界"), "1.25h"], [t("专属工作台"), t("在线")]].map(([label, value], index) => (
                          <div key={label}>
                            <div className="mb-2 flex justify-between text-xs text-slate-500">
                              <span>{label}</span>
                              <span>{value}</span>
                            </div>
                            <div className="h-2 overflow-hidden rounded-full bg-slate-100">
                              <div className={`h-full rounded-full ${index === 0 ? "w-[82%] bg-slate-800" : index === 1 ? "w-[38%] bg-cyan-400" : "w-[58%] bg-emerald-400"}`} />
                            </div>
                          </div>
                        ))}
                      </div>
                      <div className="mt-6 rounded-2xl bg-slate-50 p-4">
                        <p className="text-[10px] font-bold uppercase tracking-[0.24em] text-slate-400">{t("薪资边界")}</p>
                        <p className="mt-2 text-2xl font-semibold text-slate-900">12</p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              <div className="mt-6 grid gap-3 sm:grid-cols-3">
                {[
                  [t("安全登录"), t("Google 账号进入")],
                  [t("专属工作台"), t("只显示你的团队数据")],
                  [t("薪资边界"), t("工资与考勤独立核对")]
                ].map(([title, caption]) => (
                  <div key={title} className="rounded-2xl border border-white/70 bg-white/55 p-4 shadow-sm backdrop-blur-xl">
                    <p className="text-sm font-semibold text-slate-800">{title}</p>
                    <p className="mt-1 text-xs text-slate-500">{caption}</p>
                  </div>
                ))}
              </div>
            </div>
          </section>

          <aside className="relative mx-auto w-full max-w-[480px] rounded-[2rem] border border-white/75 bg-white/80 p-7 shadow-[0_30px_90px_rgba(15,23,42,0.14)] backdrop-blur-2xl lg:-ml-8 lg:p-9">
            <div className="absolute -left-6 top-14 hidden h-24 w-12 rounded-l-full border-y border-l border-white/70 bg-white/50 lg:block" />
            <div className="relative">
              <div className="mb-8 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-white shadow-lg shadow-slate-900/10">
                    <WmshrLogoMark />
                  </div>
                  <div>
                    <p className="text-sm font-bold tracking-[0.18em] text-slate-400">WMSHR</p>
                    <p className="text-sm font-semibold text-slate-700">{t("专属工作台")}</p>
                  </div>
                </div>
                <span className="rounded-full bg-emerald-50 px-3 py-1.5 text-[11px] font-bold text-emerald-700 ring-1 ring-emerald-100">{t("在线")}</span>
              </div>

              <div className="mb-8">
                <p className="mb-3 text-sm font-semibold text-cyan-700">{t("管理员登录")}</p>
                <h1 className="text-4xl font-semibold leading-[1.08] tracking-[-0.04em] text-slate-950 lg:text-5xl">
                  {t("考勤与薪资自动运行")}
                </h1>
                <p className="mt-5 text-base leading-7 text-slate-500">{t("统一管理员入口，登录后即可查看员工、考勤、加班与工资条数据。")}</p>
              </div>

              <button
                onClick={onGoogleLogin}
                disabled={loading}
                className="group flex w-full items-center justify-center gap-3 rounded-2xl border border-slate-200 bg-slate-950 px-5 py-4 text-sm font-semibold text-white shadow-xl shadow-slate-900/15 transition hover:-translate-y-0.5 hover:bg-slate-800 disabled:translate-y-0 disabled:cursor-not-allowed disabled:opacity-60"
              >
                <span className="flex h-8 w-8 items-center justify-center rounded-full bg-white">
                  <GoogleIcon />
                </span>
                {loading ? t("正在打开 Google 授权...") : t("使用 Google 账号进入后台")}
              </button>

              {error && (
                <div className="mt-4 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                  {error}
                </div>
              )}

              <div className="mt-6 rounded-2xl border border-slate-200 bg-slate-50/80 p-4 text-sm leading-6 text-slate-500">
                <p className="font-semibold text-slate-700">{t("主站进入 · Google 登录 · 数据安全隔离")}</p>
                <p className="mt-1 text-xs">{t("登录成功后进入你的管理工作台，员工与薪资数据不会展示给未授权访问者。")}</p>
              </div>
            </div>
          </aside>
        </div>
      </main>
    </div>
  );
}
