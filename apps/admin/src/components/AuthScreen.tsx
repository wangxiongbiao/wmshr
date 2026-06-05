/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

interface AuthScreenProps {
  loading?: boolean;
  onGoogleLogin: () => void;
  error?: string;
}

function DutylixLogoMark() {
  // 登录页、侧边栏和门户共用同一品牌图标；这里不要再使用旧后台盾牌图标，避免品牌入口不一致。
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
  return (
    <div className="min-h-screen bg-[#f8fafc] flex items-center justify-center p-6">
      <div className="w-full max-w-5xl grid lg:grid-cols-[1.2fr_0.8fr] gap-6">
        <section className="glass-panel rounded-3xl p-10 lg:p-12 relative overflow-hidden">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,_rgba(37,99,235,0.08),_transparent_38%),radial-gradient(circle_at_bottom_right,_rgba(14,165,233,0.08),_transparent_30%)] pointer-events-none" />
          <div className="relative">
            <div className="w-12 h-12 rounded-2xl flex items-center justify-center shadow-lg shadow-brand-600/20 mb-6">
              <DutylixLogoMark />
            </div>
            <p className="text-sm font-medium text-brand-700 mb-3">DUTYLIX Admin</p>
            <h1 className="text-4xl font-bold text-slate-900 leading-tight">
              DUTYLIX考勤与薪资自动运行
            </h1>
            <p className="mt-5 text-slate-600 text-base leading-7 max-w-xl">
              登录后才会加载员工、考勤和薪资模块数据。本后台当前接入的是 Supabase Auth，
              会使用你的 Google 账号完成统一登录。
            </p>

            <div className="mt-8 grid sm:grid-cols-3 gap-3">
              <div className="rounded-2xl border border-slate-200 bg-white/80 p-4">
                <p className="text-xs text-slate-400 uppercase mb-1">Auth</p>
                <p className="text-sm font-semibold text-slate-800">Supabase Google OAuth</p>
              </div>
              <div className="rounded-2xl border border-slate-200 bg-white/80 p-4">
                <p className="text-xs text-slate-400 uppercase mb-1">Access</p>
                <p className="text-sm font-semibold text-slate-800">Session-protected API</p>
              </div>
              <div className="rounded-2xl border border-slate-200 bg-white/80 p-4">
                <p className="text-xs text-slate-400 uppercase mb-1">Scope</p>
                <p className="text-sm font-semibold text-slate-800">Admin workspace only</p>
              </div>
            </div>
          </div>
        </section>

        <aside className="bg-white rounded-3xl border border-slate-200 shadow-sm p-8 lg:p-10 flex flex-col justify-center">
          <div className="mb-8">
            <p className="text-sm text-slate-500 mb-2">管理员登录</p>
            <h2 className="text-2xl font-bold text-slate-900">使用 Google 继续</h2>
            <p className="mt-3 text-sm text-slate-500 leading-6">
              点击后会打开 Google 授权弹窗，授权完成后会自动回到当前后台，不会整页跳转。
            </p>
          </div>

          <button
            onClick={onGoogleLogin}
            disabled={loading}
            className="w-full rounded-2xl border border-slate-300 bg-white hover:bg-slate-50 text-slate-800 px-5 py-4 text-sm font-semibold shadow-sm transition flex items-center justify-center gap-3 disabled:opacity-60"
          >
            <GoogleIcon />
            {loading ? "正在打开 Google 弹窗..." : "使用 Google 登录"}
          </button>

          {error && (
            <div className="mt-4 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
              {error}
            </div>
          )}

          <div className="mt-8 text-xs text-slate-400 leading-5">
            当前后台仅允许通过 Google 账号登录，请确保浏览器允许本页面弹出授权窗口。
          </div>
        </aside>
      </div>
    </div>
  );
}
