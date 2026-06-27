/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { motion, useScroll, useTransform, AnimatePresence } from "motion/react";
import {
  Users,
  Globe,
  Wallet,
  ArrowRight,
  ShieldCheck,
  BarChart3,
  Smartphone,
  Github,
  Twitter,
  Menu,
  X,
  Languages,
  Check,
  Clock,
  CircleDollarSign,
  Briefcase
} from "lucide-react";
import { useState, useEffect, useRef } from "react";
import QRCode from "qrcode";
import { useTranslation } from "react-i18next";
import { normalizeLanguage, SUPPORTED_LANGUAGES, type SupportedLanguageCode } from "@wmshr/i18n";
import { useLocation, useNavigate } from "react-router-dom";
import EmailFormPage from "./components/EmailFormPage";
import LegalPage from "./components/LegalPage";
import { buildHomeRoute, parseHomeRoute, type HomePageRoute } from "./lib/homeRoute";
import teamMeetingImage from "./assets/images/zenith_team_meeting_1779183482085.png";
import hqOfficeImage from "./assets/images/zenith_hq_office_1779183499882.png";
// 门户 about 区块的 founder 头像固定使用本地静态图，避免继续回退到纯文字占位头像。
import founderAvatarImage from "./assets/images/founder-avatar.jpg";

const ADMIN_PORTAL_URL = import.meta.env.VITE_ADMIN_PORTAL_URL
  || (import.meta.env.DEV ? "http://localhost:3000" : "https://admin.dutylix.com");

// 门户下载区仍通过更新接口确认“当前是否已配置可用 Android 包”，但真正触发下载时必须走本站同源代理。
// 不要再把数据库里的第三方/静态直链直接暴露给按钮或二维码，否则一旦上游回源到 HTML 页面，官网会表现成“按钮能点但下载不到 APK”。
const DOWNLOAD_SECTION_HASH = "#download";
const MOBILE_APP_DOWNLOAD_PATH = "/api/public/mobile-app-download";
const PRIVACY_CONTACT_EMAIL = "dutylix@163.com";
type LegalRoute = Extract<HomePageRoute, "privacy" | "terms" | "compliance">;

type MobileAndroidUpdatePayload = {
  version: string;
  content: string;
  url: string;
};

const languages = SUPPORTED_LANGUAGES.map(({ code, nativeName }) => ({ code, name: nativeName }));

function WmshrLogoMark({ className = "w-6 h-6" }: { className?: string }) {
  // 继续复用 public/dutylix-icon.svg 这个既有路径，避免改动静态资源引用面；图形内容已恢复为蓝底 WMSHR 立方体标识。
  return <img src="/dutylix-icon.svg" alt="" aria-hidden="true" className={className} />;
}

const LanguageSelector = ({
  currentLanguage,
  onLanguageChange,
}: {
  currentLanguage: SupportedLanguageCode;
  onLanguageChange: (language: SupportedLanguageCode) => void;
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const currentLanguageOption = languages.find(l => l.code === currentLanguage) || languages[0];

  return (
    <div className="relative" ref={containerRef}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-2 px-3 py-1.5 glass rounded-lg text-sm font-medium hover:bg-white/10 transition-all"
      >
        <Languages className="w-4 h-4 text-brand-accent" />
        <span className="hidden sm:inline">{currentLanguageOption.name}</span>
      </button>

      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 10 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 10 }}
            className="absolute top-full right-0 mt-2 w-48 glass rounded-xl overflow-hidden z-[60] border border-white/20 shadow-2xl"
          >
            <div className="py-2">
              {languages.map((lang) => (
                <button
                  key={lang.code}
                  onClick={() => {
                    // 门户语言现在以 path 为唯一主状态源；这里不能只改 i18n，否则刷新后会再次丢语言。
                    onLanguageChange(lang.code as SupportedLanguageCode);
                    setIsOpen(false);
                  }}
                  className="w-full px-4 py-2 text-left text-sm flex items-center justify-between hover:bg-white/10 transition-colors"
                >
                  {lang.name}
                  {currentLanguage === lang.code && <Check className="w-4 h-4 text-brand-accent" />}
                </button>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

const Nav = ({
  currentLanguage,
  onLanguageChange,
  onNavigateHome,
  onNavigateDownload,
  onNavigateAdmin
}: {
  currentLanguage: SupportedLanguageCode;
  onLanguageChange: (language: SupportedLanguageCode) => void;
  onNavigateHome: (targetHash?: string) => void;
  onNavigateDownload: () => void;
  onNavigateAdmin: () => void;
}) => {
  const { t } = useTranslation();
  const [isScrolled, setIsScrolled] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  useEffect(() => {
    const handleScroll = () => setIsScrolled(window.scrollY > 50);
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  return (
    <nav className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${isScrolled ? "py-4 glass border-b shadow-2xl shadow-black/50" : "py-8"}`}>
      <div className="max-w-7xl mx-auto px-6 flex justify-between items-center">
        <div
          onClick={() => onNavigateHome()}
          className="flex items-center gap-2 cursor-pointer group"
        >
          <div className="w-10 h-10 rounded-xl flex items-center justify-center rotate-12 group-hover:rotate-0 transition-transform shadow-lg shadow-brand-accent/20">
            <WmshrLogoMark className="w-10 h-10" />
          </div>
          <span className="font-display font-bold text-2xl tracking-tighter text-white">WMS<span className="text-brand-accent">HR</span></span>
        </div>

        <div className="hidden md:flex items-center gap-8 text-sm font-medium text-white/70">
          <button type="button" onClick={() => onNavigateHome("#solutions")} className="hover:text-white transition-colors">{t('nav.features')}</button>
          <button type="button" onClick={onNavigateDownload} className="hover:text-white transition-colors">{t('nav.about')}</button>
          <button type="button" onClick={() => onNavigateHome("#about-us")} className="hover:text-white transition-colors">{t('nav.docs')}</button>
          <LanguageSelector currentLanguage={currentLanguage} onLanguageChange={onLanguageChange} />
          <button
            onClick={onNavigateAdmin}
            // 门户导航按钮会承载不同语言的较长 CTA；这里明确允许按钮文案换行，避免英文等长文案把圆角按钮直接挤爆。
            className="flex items-center gap-2 px-5 py-2.5 bg-white text-black rounded-full font-bold shadow-sm border border-black/5 max-w-[13rem] text-left leading-tight"
          >
            <span className="flex-1 whitespace-normal">{t('nav.waitlist')}</span>
            <ArrowRight className="w-4 h-4" />
          </button>
        </div>

        <div className="flex items-center gap-4 md:hidden">
          <LanguageSelector currentLanguage={currentLanguage} onLanguageChange={onLanguageChange} />
          <button onClick={() => setMobileMenuOpen(!mobileMenuOpen)} className="p-2 glass rounded-lg">
            {mobileMenuOpen ? <X /> : <Menu />}
          </button>
        </div>
      </div>

      {/* Mobile Menu */}
      <AnimatePresence>
        {mobileMenuOpen && (
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="absolute top-full left-0 right-0 bg-brand-primary/95 backdrop-blur-2xl border-b border-white/10 p-6 flex flex-col gap-4 md:hidden z-40"
          >
            <button type="button" onClick={() => { onNavigateHome("#solutions"); setMobileMenuOpen(false); }} className="text-xl font-display text-left">{t('nav.features')}</button>
            <button type="button" onClick={() => { onNavigateDownload(); setMobileMenuOpen(false); }} className="text-xl font-display text-left">{t('nav.about')}</button>
            <button type="button" onClick={() => { onNavigateHome("#about-us"); setMobileMenuOpen(false); }} className="text-xl font-display text-left">{t('nav.docs')}</button>
            <button
              onClick={() => { onNavigateAdmin(); setMobileMenuOpen(false); }}
              className="flex items-center justify-center gap-3 w-full py-4 bg-white text-black rounded-xl font-bold mt-4 text-center leading-tight"
            >
              <span className="whitespace-normal">{t('nav.waitlist')}</span>
              <ArrowRight className="w-5 h-5" />
            </button>
          </motion.div>
        )}
      </AnimatePresence>
    </nav>
  );
};

const FeatureCard = ({ icon: Icon, title, description, delay }: any) => (
  <motion.div
    initial={{ opacity: 0, y: 20 }}
    whileInView={{ opacity: 1, y: 0 }}
    transition={{ delay, duration: 0.5 }}
    viewport={{ once: true }}
    className="p-8 rounded-3xl glass hover:border-brand-accent/50 transition-all group hover:-translate-y-1"
  >
    <div className="w-14 h-14 rounded-2xl bg-brand-accent/10 flex items-center justify-center mb-6 group-hover:bg-brand-accent/20 transition-colors">
      <Icon className="text-brand-accent w-7 h-7" />
    </div>
    <h3 className="text-xl font-display font-bold mb-3">{title}</h3>
    <p className="text-white/60 leading-relaxed text-sm">{description}</p>
  </motion.div>
);

const DashboardShowcase = () => {
  const { t } = useTranslation();
  const [activeScene, setActiveScene] = useState(0);

  const scenes = [
    { id: 0, icon: Smartphone, label: t('dashboard.scenes.clockIn') },
    { id: 1, icon: Clock, label: t('dashboard.scenes.records') },
    { id: 2, icon: CircleDollarSign, label: t('dashboard.scenes.payroll') },
    { id: 3, icon: Briefcase, label: t('dashboard.scenes.sop') },
  ];

  return (
    <div className="glass rounded-[2.5rem] p-4 md:p-6 border-white/10 shadow-2xl">
      <div className="bg-brand-primary rounded-[1.5rem] border border-white/5 overflow-hidden grid grid-cols-1 md:grid-cols-[240px_1fr] min-h-[500px]">
        {/* Sidebar Tabs */}
        <div className="hidden md:flex flex-col p-6 border-r border-white/5 bg-white/[0.02]">
          <div className="space-y-2">
            {scenes.map((scene) => (
              <button
                key={scene.id}
                onClick={() => setActiveScene(scene.id)}
                className={`w-full flex items-center gap-3 p-3 rounded-xl transition-all ${
                  activeScene === scene.id
                  ? 'bg-brand-accent/20 text-brand-accent shadow-lg shadow-brand-accent/10 border border-brand-accent/20'
                  : 'text-white/30 hover:bg-white/5 hover:text-white/50'
                }`}
              >
                <scene.icon className="w-5 h-5" />
                <span className="flex-1 text-left text-xs font-bold uppercase tracking-widest whitespace-normal leading-tight">{scene.label}</span>
              </button>
            ))}
          </div>

          <div className="mt-auto pt-6 border-t border-white/10 space-y-4">
            <div className="p-4 rounded-xl bg-emerald-500/5 border border-emerald-500/10">
              <div className="flex items-center gap-2 mb-2">
                <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                <span className="text-[10px] font-bold text-emerald-400 uppercase tracking-widest leading-none">{t('dashboard.gpsActive')}</span>
              </div>
              <p className="text-[9px] text-white/40 leading-tight">System monitoring 1,240 active geofences globally.</p>
            </div>

            <div className="flex items-center gap-3 px-2">
              <div className="w-8 h-8 rounded-full bg-brand-accent/20 flex items-center justify-center text-[10px] font-bold text-brand-accent">AD</div>
              <div className="space-y-1">
                <div className="h-2 w-16 bg-white/20 rounded-full" />
                <div className="h-1.5 w-12 bg-white/10 rounded-full" />
              </div>
            </div>
          </div>
        </div>

        {/* Dynamic Content Area */}
        <div className="relative overflow-hidden bg-white/[0.01] flex flex-col">
          {/* Header */}
          <div className="p-8 border-b border-white/5 flex justify-between items-center bg-white/[0.02]">
            <div className="space-y-1">
              <h4 className="text-2xl font-bold tracking-tight text-white/90">
                {t(`dashboard.sceneTitles.s${activeScene + 1}`)}
              </h4>
              {/* dashboard 场景说明是典型的多语言长文案位：这里取消单行裁切并保留固定最大宽度，避免翻译一长就直接丢信息。 */}
              <p className="text-sm text-white/40 max-w-md leading-relaxed min-h-[2.5rem]">
                {t(`dashboard.sceneDescs.s${activeScene + 1}`)}
              </p>
            </div>
            <div className="hidden sm:flex items-center gap-4">
              <div className="px-4 py-2 rounded-xl bg-white/5 border border-white/10 text-[10px] font-bold text-white/40 uppercase tracking-widest">
                Real-time
              </div>
              <div className="px-4 py-2 rounded-xl bg-brand-accent text-white text-[10px] font-bold uppercase tracking-widest shadow-lg shadow-brand-accent/20">
                {t('dashboard.autoCalc')}
              </div>
            </div>
          </div>

          {/* Active Content */}
          <div className="flex-1 p-8 flex items-center justify-center relative bg-gradient-to-br from-brand-accent/5 to-transparent">
            <AnimatePresence mode="wait">
              <motion.div
                key={activeScene}
                initial={{ opacity: 0, y: 10, scale: 0.98 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: -10, scale: 0.98 }}
                transition={{ duration: 0.3 }}
                className="w-full h-full"
              >
                {activeScene === 0 && (
                  <div className="h-full flex items-center justify-center">
                    <div className="w-[280px] aspect-[9/19] bg-zinc-900 rounded-[3rem] border-[8px] border-zinc-800 shadow-2xl relative overflow-hidden flex flex-col p-6">
                      <div className="absolute top-2 left-1/2 -translate-x-1/2 w-16 h-4 bg-zinc-800 rounded-full" />
                      <div className="mt-8 space-y-6">
                        <div className="space-y-1">
                          <p className="text-[10px] text-white/40 uppercase font-bold tracking-widest">Current Location</p>
                          <div className="flex items-center gap-2">
                            <Globe className="w-4 h-4 text-brand-accent" />
                            <p className="text-sm font-bold">Bangkok HQ - Area A</p>
                          </div>
                        </div>
                        <div className="w-full aspect-square rounded-2xl bg-white/5 border border-white/10 relative overflow-hidden">
                          <div className="absolute inset-0 bg-brand-accent/10 flex items-center justify-center">
                            <div className="w-12 h-12 bg-brand-accent/30 rounded-full flex items-center justify-center animate-ping" />
                            <div className="absolute flex flex-col items-center">
                              <div className="w-4 h-4 bg-brand-accent rounded-full border-2 border-white" />
                              <div className="w-1 h-3 bg-brand-accent/50 rounded-full -mt-0.5" />
                            </div>
                          </div>
                        </div>
                        <button className="w-full py-4 bg-brand-accent rounded-2xl font-bold flex flex-col items-center justify-center shadow-xl shadow-brand-accent/20">
                          <span className="text-[10px] text-white/50 uppercase">Punch In</span>
                          <span className="text-sm">09:00 AM</span>
                        </button>
                      </div>
                    </div>
                    {/* Floating confirmation mobile */}
                    <motion.div
                      initial={{ x: 20, opacity: 0 }}
                      animate={{ x: 0, opacity: 1 }}
                      className="absolute right-12 hidden lg:flex flex-col gap-4"
                    >
                      <div className="glass p-4 rounded-2xl border-emerald-500/20 max-w-[200px]">
                        <Check className="text-emerald-400 w-5 h-5 mb-2" />
                        <p className="text-xs font-bold mb-1">Clock-in Success</p>
                        <p className="text-[10px] text-white/40 leading-tight">Verified via GPS & Biometrics ID: #4421</p>
                      </div>
                    </motion.div>
                  </div>
                )}

                {activeScene === 1 && (
                  <div className="w-full space-y-3">
                    <div className="grid grid-cols-4 gap-4 px-4 pb-2 border-b border-white/5 text-[10px] uppercase font-bold text-white/30 tracking-widest">
                      <span>{t('dashboard.employee')}</span>
                      <span>{t('dashboard.location')}</span>
                      <span>{t('dashboard.hours')}</span>
                      <span>{t('dashboard.overtime')}</span>
                    </div>
                    {[
                      { name: 'Alex Yang', initial: 'AY', color: 'blue', loc: 'In Office', time: '08:45:12', ot: '+1.5h detected', status: 'active' },
                      { name: 'Sarah Nom', initial: 'SN', color: 'purple', loc: 'On Site (SG)', time: '07:30:00', ot: null, status: 'normal' },
                      { name: 'James Chen', initial: 'JC', color: 'emerald', loc: 'Remote', time: '06:12:45', ot: '+0.5h detected', status: 'active' },
                      { name: 'Linda Vo', initial: 'LV', color: 'orange', loc: 'In Office', time: '05:55:20', ot: null, status: 'normal' },
                    ].map((row, i) => (
                      <div key={i} className="grid grid-cols-4 gap-4 px-4 py-3 rounded-xl bg-white/[0.03] border border-white/5 items-center hover:bg-white/[0.08] transition-all cursor-default">
                        <div className="flex items-center gap-3">
                          <div className={`w-8 h-8 rounded-full bg-${row.color}-500/20 flex items-center justify-center text-[10px] font-bold text-${row.color}-400 border border-${row.color}-500/20`}>{row.initial}</div>
                          <span className="text-sm font-medium text-white/80">{row.name}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <div className={`w-1.5 h-1.5 rounded-full ${row.status === 'active' ? 'bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.5)]' : 'bg-blue-500'}`} />
                          <span className="text-xs text-white/60">{row.loc}</span>
                        </div>
                        <span className="text-xs font-mono text-white/80">{row.time}</span>
                        <div className={row.ot ? "px-2 py-1 rounded bg-orange-500/10 text-orange-400 text-[9px] font-bold w-fit border border-orange-500/20 tracking-tight" : "text-xs text-white/10"}>
                          {row.ot || '—'}
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                {activeScene === 2 && (
                  <div className="w-full grid grid-cols-2 gap-6 h-full">
                    <div className="glass p-8 rounded-3xl border-white/5 flex flex-col">
                      <p className="text-[10px] text-white/40 uppercase font-bold tracking-widest mb-4">Payout Overview</p>
                      <div className="space-y-6">
                        <div className="flex justify-between items-end">
                          <div>
                            <h5 className="text-4xl font-bold text-gradient">$42,850.50</h5>
                            <p className="text-xs text-emerald-400 font-bold mt-1 uppercase tracking-tight">Ready for distribution</p>
                          </div>
                          <CircleDollarSign className="w-10 h-10 text-white/10" />
                        </div>
                        <div className="h-32 w-full flex items-end gap-2 group">
                          {[40, 70, 45, 90, 65, 80, 55].map((h, i) => (
                            <div key={i} className="flex-1 rounded-t-lg bg-brand-accent/20 border-t border-brand-accent/50 hover:bg-brand-accent/40 transition-all cursor-pointer relative group">
                              <div style={{ height: `${h}%` }} className="w-full bg-brand-accent/40 rounded-t-lg transition-all" />
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>
                    <div className="space-y-4">
                      {[
                        { label: 'Calculated Overtime', val: '$1,240.20' },
                        { label: 'Social Contributions', val: '$3,892.15' },
                        { label: 'Tax Deductions', val: '$5,920.00' },
                      ].map((stat, i) => (
                        <div key={i} className="glass p-5 rounded-2xl border-white/5 flex justify-between items-center">
                          <span className="text-sm text-white/40">{stat.label}</span>
                          <span className="text-sm font-bold">{stat.val}</span>
                        </div>
                      ))}
                      <div className="p-6 rounded-2xl bg-brand-accent text-white text-center shadow-lg shadow-brand-accent/20">
                        <p className="text-xs font-bold uppercase tracking-widest mb-1">Verify & Pay</p>
                        <p className="text-[10px] opacity-60">Calculated for 124 employees</p>
                      </div>
                    </div>
                  </div>
                )}

                {activeScene === 3 && (
                  <div className="w-full space-y-6">
                    <div className="flex justify-between items-center">
                      <p className="text-[10px] text-white/40 uppercase font-bold tracking-widest">Active Standard Operating Procedures (SOP)</p>
                      <button className="px-4 py-2 glass rounded-xl text-xs font-bold hover:bg-white/10 transition-colors">Create New SOP</button>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      {[
                        { title: 'Global Employee Onboarding', type: 'HR', users: '12 Users', date: 'Oct 12' },
                        { title: 'Security Protocol V2.1', type: 'Security', users: 'Group: All', date: 'Oct 14' },
                        { title: 'Remote Work Ethics', type: 'Legal', users: '84 Users', date: 'Oct 15' },
                        { title: 'Regional Tax Filing Guide', type: 'Finance', users: 'Managers', date: 'Oct 18' },
                      ].map((sop, i) => (
                        <div key={i} className="glass p-6 rounded-2xl border-white/5 hover:border-brand-accent/50 transition-all group">
                          <div className="flex justify-between items-start mb-4">
                            <h6 className="text-sm font-bold text-white/90 group-hover:text-brand-accent transition-colors">{sop.title}</h6>
                            <span className="px-2 py-0.5 rounded-full bg-white/5 text-[9px] font-bold text-white/40 uppercase">{sop.type}</span>
                          </div>
                          <div className="flex items-center justify-between mt-auto">
                            <div className="flex -space-x-2">
                              {[1, 2, 3].map(u => (
                                <div key={u} className="w-6 h-6 rounded-full border border-brand-primary bg-white/10" />
                              ))}
                              <div className="w-6 h-6 rounded-full border border-brand-primary bg-brand-accent/20 flex items-center justify-center text-[10px] text-brand-accent font-bold">+</div>
                            </div>
                            <span className="text-[10px] text-white/20 font-bold">{sop.date}</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </motion.div>
            </AnimatePresence>
          </div>
        </div>
      </div>

      {/* Dynamic Context Badge */}
      <motion.div
        animate={{ y: [0, -10, 0] }}
        transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
        className="absolute -top-6 -right-6 glass p-4 rounded-2xl shadow-xl border-white/10 bg-brand-primary/50 backdrop-blur-2xl hidden md:block"
      >
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-brand-accent flex items-center justify-center">
            <Check className="text-white w-6 h-6" />
          </div>
          <div>
            <p className="text-xs font-bold text-white/50 uppercase tracking-tighter">{activeScene === 2 ? 'Payroll Calculation' : 'System Status'}</p>
            <p className="text-sm font-bold text-emerald-400">{activeScene === 2 ? 'Audit Passed' : 'Active & Secured'}</p>
          </div>
        </div>
      </motion.div>
    </div>
  );
};

const AboutSection = () => {
  const { t } = useTranslation();
  return (
    <section id="about-us" className="py-32 relative overflow-hidden">
      <div className="max-w-7xl mx-auto px-6">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-24 items-center mb-32">
          <motion.div
            initial={{ opacity: 0, x: -30 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            className="space-y-8"
          >
            <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full glass text-xs font-bold text-brand-accent uppercase tracking-widest border-brand-accent/20">
              {t('about_section.badge')}
            </div>
            <h2 className="text-4xl md:text-7xl font-display font-bold leading-[0.9] tracking-tighter uppercase">
              {t('about_section.title')}
            </h2>
            <p className="text-white/50 text-xl font-light leading-relaxed">
              {t('about_section.description')}
            </p>

            <div className="p-8 rounded-[2.5rem] bg-white/[0.03] border border-white/5 relative group">
              <div className="flex items-center gap-6 mb-6">
                {/* 这里改为真实头像图；保留原有圆形尺寸和描边，避免破坏 about founder 卡片的既有排版。 */}
                <div className="w-20 h-20 rounded-full bg-brand-accent/20 flex items-center justify-center p-1 border border-brand-accent/20 overflow-hidden">
                  <img
                    src={founderAvatarImage}
                    alt={t('about_section.founder.name')}
                    className="w-full h-full rounded-full object-cover"
                  />
                </div>
                <div>
                  <p className="text-xs font-bold text-brand-accent uppercase tracking-[0.2em] mb-1">{t('about_section.founder.label')}</p>
                  <h4 className="text-2xl font-bold">{t('about_section.founder.name')}</h4>
                </div>
              </div>
              <p className="text-white/60 italic leading-relaxed text-lg">
                "{t('about_section.founder.bio')}"
              </p>
            </div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            whileInView={{ opacity: 1, scale: 1 }}
            viewport={{ once: true }}
            className="relative"
          >
            <div className="aspect-[4/5] rounded-[3rem] overflow-hidden border border-white/10 shadow-2xl relative">
              <img
                src={teamMeetingImage}
                alt="Dutylix Global Team"
                className="w-full h-full object-cover grayscale opacity-80 group-hover:grayscale-0 transition-all duration-500"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-brand-primary via-transparent to-transparent opacity-60" />
              <div className="absolute bottom-10 left-10 right-10">
                <h4 className="text-2xl font-bold mb-2">{t('about_section.team.title')}</h4>
                <p className="text-sm text-white/60 leading-relaxed">{t('about_section.team.desc')}</p>
              </div>
            </div>
            {/* Decorative element */}
            <div className="absolute -top-10 -right-10 w-40 h-40 bg-brand-accent/20 rounded-full blur-[80px]" />
          </motion.div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          <div className="md:col-span-2 aspect-[16/9] rounded-[2.5rem] overflow-hidden border border-white/10 relative group">
            <img
              src={hqOfficeImage}
              alt="Dutylix HQ Office"
              className="w-full h-full object-cover opacity-70 group-hover:opacity-100 transition-opacity duration-700"
            />
            <div className="absolute inset-0 bg-black/20 group-hover:bg-transparent transition-colors" />
            <div className="absolute top-8 left-8">
               <div className="px-4 py-2 glass rounded-full text-[10px] font-bold text-white/40 uppercase tracking-widest backdrop-blur-md">
                 HQ: Global Operations Center
               </div>
            </div>
          </div>
          <div className="flex flex-col justify-center p-12 rounded-[2.5rem] glass border-white/5 space-y-6">
            <h4 className="text-3xl font-display font-bold leading-tight">{t('about_section.office.title')}</h4>
            <p className="text-white/40 text-sm leading-relaxed">
              {t('about_section.office.desc')}
            </p>
            <div className="flex gap-2">
              {[1, 2, 3].map(i => (
                <div key={i} className="w-2 h-2 rounded-full bg-brand-accent/40" />
              ))}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default function App() {
  const { t, i18n } = useTranslation();
  const location = useLocation();
  const navigate = useNavigate();
  const routeState = parseHomeRoute(location.pathname);
  const currentLanguage = routeState.language;
  const isLegalPage = routeState.page !== "home";
  const legalPage: LegalRoute | null = isLegalPage ? (routeState.page as LegalRoute) : null;
  const [showEmailForm, setShowEmailForm] = useState(false);
  // 门户下载区只把“是否存在当前最新 Android 包”作为展示/可点击前提；真正的下载目标统一切到本站同源代理，避免暴露会漂移的上游直链。
  const [androidDownloadUrl, setAndroidDownloadUrl] = useState("");
  // 下载链接一旦触发，就先锁住按钮并给出等待提醒，避免同一个会话里重复点击同一安装包造成重复下载。
  const [hasTriggeredAndroidDownload, setHasTriggeredAndroidDownload] = useState(false);
  // 二维码必须和桌面按钮共用同一个同源下载入口，保证扫码下载和按钮下载命中的是同一条受控链路。
  const [androidDownloadQrCodeDataUrl, setAndroidDownloadQrCodeDataUrl] = useState("");

  useEffect(() => {
    let cancelled = false;

    // 下载区只用更新接口判断“后台是否已配置最新 Android 包”；真正下载时再统一跳到本站 `/api/public/mobile-app-download`。
    void fetch("/api/public/mobile-app-update")
      .then(async (response) => {
        if (!response.ok) {
          const payload = await response.json().catch(() => ({}));
          throw new Error(payload.error || "Android 更新信息加载失败");
        }

        return response.json() as Promise<MobileAndroidUpdatePayload>;
      })
      .then((payload) => {
        if (!cancelled) {
          const hasConfiguredRelease = Boolean(String(payload.url || "").trim());
          setAndroidDownloadUrl(
            hasConfiguredRelease ? new URL(MOBILE_APP_DOWNLOAD_PATH, window.location.origin).toString() : ""
          );
        }
      })
      .catch(() => {
        if (!cancelled) {
          setAndroidDownloadUrl("");
        }
      });

    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (location.pathname === "/") {
      const detectedLanguage = normalizeLanguage(i18n.resolvedLanguage || i18n.language);
      navigate({ pathname: buildHomeRoute(detectedLanguage), hash: location.hash }, { replace: true });
      return;
    }

    if (routeState.isLegacyDownloadPath) {
      // 历史上下载入口曾落到 `/:lang/download`；这里保留无感跳回首页下载区块，避免旧分享链接直接失效。
      navigate({ pathname: routeState.canonicalPath, hash: DOWNLOAD_SECTION_HASH }, { replace: true });
      return;
    }

    if (location.pathname !== routeState.canonicalPath) {
      // 门户语言 path 是唯一主状态源；非法或缺失语言时统一 replace，避免 URL 与实际语言状态分叉。
      navigate({ pathname: routeState.canonicalPath, hash: location.hash }, { replace: true });
    }
  }, [i18n.language, i18n.resolvedLanguage, location.hash, location.pathname, navigate, routeState.canonicalPath, routeState.isLegacyDownloadPath]);

  useEffect(() => {
    if ((i18n.resolvedLanguage || i18n.language) !== currentLanguage) {
      // 语言以 `/:lang` 为准，路由变化时再同步 i18n；这样刷新、分享链接和前进后退都不会丢语言。
      void i18n.changeLanguage(currentLanguage);
    }
  }, [currentLanguage, i18n]);

  useEffect(() => {
    if (!location.hash || showEmailForm) {
      return;
    }

    // 下载入口现在回到首页同页滚动；这里显式滚动到 hash 目标，保证从其它路由状态切回首页时也能稳定落到目标区块。
    const targetId = decodeURIComponent(location.hash.slice(1));
    const frame = window.requestAnimationFrame(() => {
      document.getElementById(targetId)?.scrollIntoView({ behavior: "smooth", block: "start" });
    });

    return () => window.cancelAnimationFrame(frame);
  }, [location.hash, location.pathname, showEmailForm]);

  useEffect(() => {
    if (!androidDownloadUrl) {
      setAndroidDownloadQrCodeDataUrl("");
      return;
    }

    let cancelled = false;

    // 二维码直接编码数据库里当前最新下载地址，保证桌面点击和手机扫码不会落到不同版本的安装包。
    void QRCode.toDataURL(androidDownloadUrl, {
      errorCorrectionLevel: "M",
      margin: 1,
      width: 220,
      color: {
        dark: "#111827",
        light: "#FFFFFFFF",
      },
    }).then((dataUrl) => {
      if (!cancelled) {
        setAndroidDownloadQrCodeDataUrl(dataUrl);
      }
    }).catch(() => {
      if (!cancelled) {
        setAndroidDownloadQrCodeDataUrl("");
      }
    });

    return () => {
      cancelled = true;
    };
  }, [androidDownloadUrl]);

  const handleLanguageRouteChange = (language: SupportedLanguageCode) => {
    navigate({ pathname: buildHomeRoute(language, routeState.page), hash: isLegalPage ? "" : location.hash });
  };

  const navigateToHome = (targetHash = "") => {
    setShowEmailForm(false);
    // 顶部导航的首页锚点既要支持首页内滚动，也要支持从其它状态回首页后继续定位到对应区块。
    navigate({ pathname: buildHomeRoute(currentLanguage), hash: targetHash }, { replace: false });
  };

  const navigateToLegal = (page: LegalRoute) => {
    setShowEmailForm(false);
    navigate({ pathname: buildHomeRoute(currentLanguage, page), hash: "" }, { replace: false });
  };

  const navigateToDownload = () => {
    // 独立下载页已移除；下载入口统一回到首页下载区块，避免路由和页面内容继续分叉。
    navigateToHome(DOWNLOAD_SECTION_HASH);
  };

  // 门户跳后台时显式把当前语言写进 `/:lang/dashboard`，避免 admin 只能依赖自己的 detector 重新猜语言。
  // 这里固定落到 dashboard：admin 已把 lang/tab 都路由化，首页入口应传递完整初始状态而不是裸域名。
  const openAdmin = () => {
    const adminUrl = new URL(`/${currentLanguage}/dashboard`, `${ADMIN_PORTAL_URL.replace(/\/+$/, "")}/`);
    window.location.assign(adminUrl.toString());
  };

  const triggerAndroidDownload = () => {
    if (!androidDownloadUrl || hasTriggeredAndroidDownload) {
      return;
    }

    // 下载动作一旦发出就立即锁定按钮，产品要求当前会话内只允许触发一次，避免连续点击产生重复下载任务。
    setHasTriggeredAndroidDownload(true);

    // 这里用临时锚点触发浏览器原生下载导航；真正是否直接下载取决于目标 URL 返回的 Content-Disposition/文件类型。
    const downloadLink = document.createElement("a");
    downloadLink.href = androidDownloadUrl;
    downloadLink.rel = "noopener noreferrer";
    downloadLink.click();
  };

  return (
    <div className="min-h-screen bg-brand-primary text-white">
      <Nav
        currentLanguage={currentLanguage}
        onLanguageChange={handleLanguageRouteChange}
        onNavigateHome={navigateToHome}
        onNavigateDownload={navigateToDownload}
        onNavigateAdmin={openAdmin}
      />

      {legalPage ? (
        <LegalPage
          contactEmail={PRIVACY_CONTACT_EMAIL}
          currentLanguage={currentLanguage}
          page={legalPage}
          onBackHome={() => navigateToHome()}
        />
      ) : showEmailForm ? (
        <div className="pt-24 pb-12">
          <EmailFormPage onBack={() => setShowEmailForm(false)} onOpenAdmin={openAdmin} />
        </div>
      ) : (
        <>
          {/* Hero Section */}
          <section className="relative pt-48 pb-32 overflow-hidden">
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full h-[800px] pointer-events-none">
          <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[1000px] h-[500px] bg-brand-accent/20 rounded-[100%] blur-[120px] opacity-20" />
          <div className="absolute top-1/4 left-1/4 w-[400px] h-[400px] bg-emerald-500/10 rounded-full blur-[100px] opacity-10" />
        </div>

        <div className="max-w-7xl mx-auto px-6 relative">
          <div className="text-center max-w-4xl mx-auto">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8 }}
            >
              <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full glass text-xs font-bold text-brand-accent mb-8 uppercase tracking-widest border-brand-accent/20">
                <Briefcase className="w-3.5 h-3.5" />
                {t('hero.badge')}
              </div>

              <h1 className="text-5xl md:text-8xl font-display font-bold leading-[1] tracking-tighter mb-8 text-gradient uppercase">
                {t('hero.title')}
              </h1>

              <p className="text-lg md:text-2xl text-white/50 leading-relaxed mb-12 max-w-3xl mx-auto font-light">
                {t('hero.description')}
              </p>

              <div className="flex flex-col sm:flex-row gap-4 justify-center">
                <button
                  onClick={() => setShowEmailForm(true)}
                  className="group px-10 py-5 bg-brand-accent text-white rounded-2xl font-bold text-lg flex items-center justify-center gap-2 hover:bg-brand-accent/90 transition-all shadow-2xl shadow-brand-accent/40 w-full sm:w-auto"
                >
                  <span className="whitespace-normal text-center leading-tight">{t('hero.getStarted')}</span>
                  <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
                </button>
                <button
                  onClick={navigateToDownload}
                  className="px-10 py-5 glass text-white rounded-2xl font-bold text-lg hover:bg-white/10 transition-all border-white/5 w-full sm:w-auto"
                >
                  <span className="whitespace-normal text-center leading-tight">{t('hero.viewPlatform')}</span>
                </button>
              </div>
            </motion.div>
          </div>

          {/* Payroll Visual Dashboard Showcase */}
          <div className="mt-24 relative max-w-6xl mx-auto">
            <DashboardShowcase />
          </div>
        </div>
      </section>

      {/* Stats Section */}
      <section className="py-20 border-y border-white/5 bg-white/[0.02]">
        <div className="max-w-7xl mx-auto px-6 grid grid-cols-2 md:grid-cols-4 gap-12">
          {[
            { label: t('stats.throughput'), value: "150+" },
            { label: t('stats.latency'), value: "45+" },
            { label: t('stats.precision'), value: "100%" },
            { label: t('stats.uptime'), value: "< 24h" }
          ].map((stat, i) => (
            <div key={i} className="text-center">
              <p className="text-3xl md:text-5xl font-display font-bold mb-2 text-brand-accent">{stat.value}</p>
              <p className="text-[10px] uppercase tracking-[0.2em] text-white/40 font-bold">{stat.label}</p>
            </div>
          ))}
        </div>
      </section>

      <section id="download" className="py-24">
        <div className="max-w-5xl mx-auto px-6">
          <div className="glass rounded-[2rem] border border-white/10 p-10 md:p-14 text-center shadow-2xl shadow-black/20">
            <div className="inline-flex items-center gap-3 px-4 py-2 rounded-full bg-brand-accent/10 text-brand-accent text-xs font-bold uppercase tracking-[0.2em] mb-8">
              <Smartphone className="w-4 h-4" />
              {t('downloadSection.badge')}
            </div>
            <h2 className="text-3xl md:text-5xl font-display font-bold tracking-tight mb-5">
              {t('downloadSection.title')}
            </h2>
            <p className="text-white/60 text-base md:text-lg leading-relaxed max-w-2xl mx-auto mb-10">
              {t('downloadSection.description')}
            </p>
            <button
              type="button"
              onClick={triggerAndroidDownload}
              disabled={!androidDownloadUrl || hasTriggeredAndroidDownload}
              className="mx-auto inline-flex items-center justify-center gap-3 px-8 py-4 bg-brand-accent text-white rounded-2xl font-bold text-lg shadow-2xl shadow-brand-accent/30 hover:bg-brand-accent/90 disabled:cursor-not-allowed disabled:bg-white/10 disabled:text-white/40 disabled:shadow-none transition-all"
            >
              <Smartphone className="w-5 h-5" />
              {hasTriggeredAndroidDownload
                ? t('downloadSection.androidButtonWaiting')
                : t('downloadSection.androidButton')}
            </button>
            {hasTriggeredAndroidDownload ? (
              <p className="mt-4 text-sm md:text-base text-brand-accent" role="status" aria-live="polite">
                {t('downloadSection.waitingReminder')}
              </p>
            ) : null}
            {androidDownloadQrCodeDataUrl ? (
              <div className="mt-10 mx-auto max-w-sm rounded-[2rem] border border-white/10 bg-white/5 p-6 text-center">
                <div className="mx-auto flex w-fit items-center gap-2 rounded-full bg-white/10 px-3 py-1 text-xs font-bold uppercase tracking-[0.2em] text-white/70">
                  <Smartphone className="w-4 h-4" />
                  {t('downloadSection.qrTitle')}
                </div>
                <div className="mx-auto mt-5 flex w-fit rounded-[1.5rem] bg-white p-4 shadow-xl shadow-black/20">
                  <img
                    src={androidDownloadQrCodeDataUrl}
                    alt={t('downloadSection.qrTitle')}
                    className="h-44 w-44 rounded-xl"
                  />
                </div>
                <p className="mt-5 text-sm md:text-base leading-relaxed text-white/60">
                  {t('downloadSection.qrDescription')}
                </p>
              </div>
            ) : null}
          </div>
        </div>
      </section>

      {/* Features Grid */}
      <section id="solutions" className="py-32 overflow-hidden">
        <div className="max-w-7xl mx-auto px-6">
          <div className="flex flex-col md:flex-row md:items-end justify-between mb-24 gap-8">
            <div className="max-w-3xl">
              <div className="w-12 h-1.5 bg-brand-accent rounded-full mb-8" />
              <h2 className="text-4xl md:text-6xl font-display font-bold mb-6 tracking-tight uppercase leading-[0.9]">{t('features.badge')}</h2>
              <p className="text-white/50 text-xl font-light leading-relaxed">{t('features.description')}</p>
            </div>
            <button className="text-brand-accent font-bold flex items-center gap-2 hover:translate-x-2 transition-transform h-fit">
              {t('features.viewAll')} <ArrowRight className="w-5 h-5" />
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <FeatureCard
              icon={Clock}
              title={t('features.items.reasoning.title')}
              description={t('features.items.reasoning.desc')}
              delay={0}
            />
            <FeatureCard
              icon={CircleDollarSign}
              title={t('features.items.dist.title')}
              description={t('features.items.dist.desc')}
              delay={0.1}
            />
            <FeatureCard
              icon={ShieldCheck}
              title={t('features.items.security.title')}
              description={t('features.items.security.desc')}
              delay={0.2}
            />
            <FeatureCard
              icon={BarChart3}
              title={t('features.items.multimodal.title')}
              description={t('features.items.multimodal.desc')}
              delay={0.3}
            />
            <FeatureCard
              icon={Smartphone}
              title={t('features.items.cli.title')}
              description={t('features.items.cli.desc')}
              delay={0.4}
            />
            <FeatureCard
              icon={Globe}
              title={t('features.items.scaling.title')}
              description={t('features.items.scaling.desc')}
              delay={0.5}
            />
          </div>
        </div>
      </section>

      <AboutSection />

      {/* CTA Section */}
      <section className="py-32 relative">
        <div className="max-w-7xl mx-auto px-6 relative z-10">
          <div className="bg-brand-accent rounded-[3.5rem] p-12 md:p-24 text-center relative overflow-hidden group shadow-[0_0_100px_rgba(99,102,241,0.3)]">
            <motion.div
               animate={{ rotate: 360 }}
               transition={{ duration: 30, repeat: Infinity, ease: "linear" }}
               className="absolute -top-1/2 -left-1/2 w-[200%] h-[200%] bg-[radial-gradient(circle_at_50%_50%,_rgba(255,255,255,0.05)_0%,_transparent_60%)] pointer-events-none"
            />

            <h2 className="text-4xl md:text-7xl font-display font-bold mb-8 relative z-10 uppercase tracking-tighter">{t('cta.title')}</h2>
            <p className="text-white/80 text-xl font-light mb-12 max-w-2xl mx-auto relative z-10 leading-relaxed">
              {t('cta.description')}
            </p>
            <div className="flex justify-center relative z-10">
              <button
                onClick={() => setShowEmailForm(true)}
                className="px-10 py-5 bg-white text-brand-accent rounded-2xl font-bold text-xl hover:scale-105 active:scale-95 transition-all shadow-xl block w-full sm:w-auto"
              >
                <span className="whitespace-normal text-center leading-tight">{t('cta.getStarted')}</span>
              </button>
            </div>
          </div>
        </div>
      </section>
    </>
  )}

      {/* Footer */}
      <footer className="py-24 border-t border-white/5 bg-black/40">
        <div className="max-w-7xl mx-auto px-6 lg:flex justify-between">
          <div className="mb-16 lg:mb-0">
            <div className="flex items-center gap-3 mb-8">
              <div className="w-10 h-10 rounded-xl flex items-center justify-center shadow-lg shadow-brand-accent/20">
                <WmshrLogoMark className="w-10 h-10" />
              </div>
              <span className="font-display font-bold text-2xl tracking-tighter text-white">WMS<span className="text-brand-accent">HR</span></span>
            </div>
            <p className="text-white/40 max-w-xs text-sm leading-relaxed mb-8">
              {t('footer.desc')}
            </p>
            <div className="flex gap-4">
              <a href="#" className="w-11 h-11 glass rounded-xl flex items-center justify-center hover:text-brand-accent hover:border-brand-accent/50 transition-all">
                <Twitter className="w-5 h-5" />
              </a>
              <a href="#" className="w-11 h-11 glass rounded-xl flex items-center justify-center hover:text-brand-accent hover:border-brand-accent/50 transition-all">
                <Github className="w-5 h-5" />
              </a>
            </div>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-3 gap-16 md:gap-24">
            <div>
              <h4 className="font-bold mb-8 uppercase text-[10px] tracking-[0.2em] text-white/30">{t('footer.product')}</h4>
              <ul className="flex flex-col gap-5 text-white/50 text-sm font-medium">
                <li><a href="#" className="hover:text-white transition-colors">{t('footer.links.payroll')}</a></li>
                <li><a href="#" className="hover:text-white transition-colors">{t('footer.links.attendance')}</a></li>
                <li><a href="#" className="hover:text-white transition-colors">{t('footer.links.tax')}</a></li>
                <li><a href="#" className="hover:text-white transition-colors">{t('footer.links.employee')}</a></li>
              </ul>
            </div>
            <div>
              <h4 className="font-bold mb-8 uppercase text-[10px] tracking-[0.2em] text-white/30">{t('footer.company')}</h4>
              <ul className="flex flex-col gap-5 text-white/50 text-sm font-medium">
                <li><a href="#" className="hover:text-white transition-colors">{t('footer.links.integrations')}</a></li>
                <li><a href="#" className="hover:text-white transition-colors">{t('footer.links.support')}</a></li>
                <li><a href="#about-us" className="hover:text-white transition-colors">{t('nav.docs')}</a></li>
              </ul>
            </div>
            <div className="col-span-2 md:col-span-1">
              <h4 className="font-bold mb-8 uppercase text-[10px] tracking-[0.2em] text-white/30">Legal</h4>
              <ul className="flex flex-col gap-5 text-white/50 text-sm font-medium">
                <li><button type="button" onClick={() => navigateToLegal("privacy")} className="hover:text-white transition-colors">{t('footer.links.privacy')}</button></li>
                <li><button type="button" onClick={() => navigateToLegal("terms")} className="hover:text-white transition-colors">{t('footer.links.terms')}</button></li>
                <li><button type="button" onClick={() => navigateToLegal("compliance")} className="hover:text-white transition-colors">{t('footer.links.compliance')}</button></li>
              </ul>
            </div>
          </div>
        </div>
        <div className="max-w-7xl mx-auto px-6 mt-24 pt-10 border-t border-white/5 flex flex-col md:flex-row justify-between gap-6 text-[10px] text-white/20 font-bold uppercase tracking-[0.2em]">
          <p>{t('footer.rights')}</p>
          <div className="flex gap-10">
            <span>{t('footer.certifications.soc2')}</span>
            <span>{t('footer.certifications.gdpr')}</span>
          </div>
        </div>
      </footer>
    </div>
  );
}
