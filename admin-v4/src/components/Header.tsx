import { useEffect, useState, useRef } from "react";
import { 
  LayoutDashboard, Users, Clock, Wallet, GraduationCap, Utensils, 
  ShoppingBag, Package, Layers, Receipt, Globe, Smartphone, ChevronDown, LogOut, Compass, Shield
} from "lucide-react";
import { AdminUser } from "../types";
import { CONTINENTS } from "./Login";
import { cn } from "../lib/utils";
import { getTranslation, Language } from "../lib/i18n";

interface HeaderProps {
  title: string;
  adminUser: AdminUser | null;
  onSelectCountry: (country: typeof CONTINENTS[number]["countries"][number]) => Promise<boolean>;
  onLogout: () => void;
  lang: Language;
  onLanguageChange: (lang: Language) => void;
}

export function Header({ title, adminUser, onSelectCountry, onLogout, lang, onLanguageChange }: HeaderProps) {
  const [time, setTime] = useState(new Date());
  const [showCountryDropdown, setShowCountryDropdown] = useState(false);
  const [showLangDropdown, setShowLangDropdown] = useState(false);
  const [switchingCountryCode, setSwitchingCountryCode] = useState<string | null>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const langDropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const timer = setInterval(() => setTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  // Close dropdown on click outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setShowCountryDropdown(false);
      }
      if (langDropdownRef.current && !langDropdownRef.current.contains(event.target as Node)) {
        setShowLangDropdown(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const allowedWarehouses = adminUser?.allowedWarehouses || [];
  const visibleContinents = CONTINENTS
    .map(continent => ({
      ...continent,
      countries: continent.countries.filter(country => allowedWarehouses.includes("*") || allowedWarehouses.includes(country.code))
    }))
    .filter(continent => continent.countries.length > 0);

  const clockTime = time.toLocaleTimeString('zh-CN', { hour12: false });
  const days = ['周日', '周一', '周二', '周三', '周四', '周五', '周六'];
  const clockDate = `${time.getMonth() + 1}月${time.getDate()}日 ${days[time.getDay()]}`;

  const getHeaderIcon = (titleStr: string) => {
    const s = titleStr || "";
    if (s.includes("看板") || s.includes("数据")) return <LayoutDashboard className="w-5 h-5 text-brand-600 shrink-0" />;
    if (s.includes("员工")) return <Users className="w-5 h-5 text-indigo-600 shrink-0" />;
    if (s.includes("考勤")) return <Clock className="w-5 h-5 text-sky-600 shrink-0" />;
    if (s.includes("薪资") || s.includes("核算")) return <Wallet className="w-5 h-5 text-emerald-600 shrink-0" />;
    if (s.includes("SOP") || s.includes("培训")) return <GraduationCap className="w-5 h-5 text-violet-600 shrink-0" />;
    if (s.includes("订单")) return <ShoppingBag className="w-5 h-5 text-brand-600 shrink-0" />;
    if (s.includes("入库")) return <Package className="w-5 h-5 text-amber-500 shrink-0" />;
    if (s.includes("商品")) return <Layers className="w-5 h-5 text-teal-600 shrink-0" />;
    if (s.includes("费用") || s.includes("核销")) return <Receipt className="w-5 h-5 text-rose-500 shrink-0" />;
    if (s.includes("客户")) return <Globe className="w-5 h-5 text-teal-600 shrink-0" />;
    if (s.includes("厨房") || s.includes("菜谱")) return <Utensils className="w-5 h-5 text-amber-600 shrink-0" />;
    if (s.includes("APP") || s.includes("移动端") || s.includes("手机")) return <Smartphone className="w-5 h-5 text-brand-600 shrink-0" />;
    return null;
  };

  return (
    <header className="bg-white border-b border-slate-200 h-16 flex items-center justify-between px-6 flex-shrink-0 z-30 select-none">
      <div className="flex items-center gap-2.5">
        {getHeaderIcon(title)}
        <h2 className="text-lg font-black text-slate-900 tracking-tight">{title}</h2>
      </div>

      <div className="flex items-center gap-3">
        {/* Language Selector Dropdown */}
        <div className="relative h-11" ref={langDropdownRef}>
          <button
            onClick={() => setShowLangDropdown(!showLangDropdown)}
            className="flex items-center gap-2 px-3 h-11 bg-white hover:bg-slate-50 border border-slate-200 hover:border-brand-300 text-slate-800 rounded-xl transition cursor-pointer text-xs font-bold shadow-3xs"
          >
            <span className="text-sm">🌐</span>
            <span>{lang === 'zh-CN' ? '简体中文' : lang === 'zh-TW' ? '繁體中文' : lang === 'th' ? 'ไทย' : 'English'}</span>
            <ChevronDown className="w-3 h-3 text-slate-500" />
          </button>

          {showLangDropdown && (
            <div className="absolute right-0 mt-2 w-36 bg-white border border-slate-200 rounded-2xl shadow-xl z-50 p-1.5 space-y-0.5">
              {[
                { code: 'zh-CN', label: '简体中文' },
                { code: 'en', label: 'English' },
              ].map((l) => (
                <button
                  key={l.code}
                  onClick={() => {
                    onLanguageChange(l.code as any);
                    setShowLangDropdown(false);
                  }}
                  className={cn(
                    "w-full flex items-center justify-between px-3 py-2 rounded-lg text-left transition cursor-pointer text-xs font-bold",
                    lang === l.code
                      ? "bg-brand-50 text-brand-700 font-extrabold"
                      : "hover:bg-slate-50 text-slate-700"
                  )}
                >
                  {l.label}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Branch / Country Selector Dropdown */}
        {adminUser && (
          <div className="relative h-11" ref={dropdownRef}>
            <button
              onClick={() => setShowCountryDropdown(!showCountryDropdown)}
              className="flex items-center gap-2 px-3.5 h-11 bg-white hover:bg-slate-50 border border-slate-200 hover:border-brand-300 text-slate-800 rounded-xl transition cursor-pointer text-xs font-bold shadow-3xs"
            >
              <Globe className="w-3.5 h-3.5 text-brand-600 animate-spin-slow" />
              <span>{getTranslation("current_country_label", lang)}<span className="text-brand-700 font-extrabold">{adminUser.country || "🏳️ 未选择"}</span></span>
              <ChevronDown className="w-3 h-3 text-slate-500" />
            </button>

            {showCountryDropdown && (
              <div className="absolute right-0 mt-2 w-80 bg-white border border-slate-200 rounded-2xl shadow-xl z-50 p-4 max-h-[420px] overflow-y-auto">
                <div className="flex items-center gap-1.5 text-xs font-black text-slate-500 uppercase tracking-wider mb-3 pb-1 border-b border-slate-100">
                  <Compass className="w-3.5 h-3.5 text-brand-500" />
                  {getTranslation("switch_country_title", lang)}
                </div>
                <div className="space-y-4">
                  {visibleContinents.map((cont, cIdx) => (
                    <div key={cIdx} className="space-y-1.5">
                      <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{cont.name}</h4>
                      <div className="grid grid-cols-2 gap-1.5">
                        {cont.countries.map((c) => {
                          const countryStr = `${c.flag} ${c.name}`;
                          const isCurrent = adminUser.country === countryStr;
                          return (
                            <button
                              key={c.code}
                              disabled={Boolean(switchingCountryCode) || isCurrent}
                              onClick={async () => {
                                setSwitchingCountryCode(c.code);
                                const switched = await onSelectCountry(c);
                                setSwitchingCountryCode(null);
                                if (switched) setShowCountryDropdown(false);
                              }}
                              className={cn(
                                "flex items-center gap-1.5 px-2 py-1.5 rounded-lg text-left transition cursor-pointer border text-xs font-bold disabled:opacity-50 disabled:cursor-not-allowed",
                                isCurrent
                                  ? "bg-brand-600 border-brand-500 text-white"
                                  : "bg-slate-50 border-slate-100 hover:border-brand-400 text-slate-700 hover:text-brand-600"
                              )}
                            >
                              {switchingCountryCode === c.code ? (
                                <span className="w-3.5 h-3.5 border-2 border-current/30 border-t-current rounded-full animate-spin shrink-0" />
                              ) : (
                                <span className="text-sm">{c.flag}</span>
                              )}
                              <span className="truncate">{c.name}</span>
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  ))}
                  {visibleContinents.length === 0 && (
                    <p className="text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded-lg p-3">当前账号没有可切换的海外仓。</p>
                  )}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Real-time Clock Compartment */}
        <div className="hidden md:flex items-center gap-2 px-3.5 h-11 bg-white border border-slate-200 rounded-xl shadow-3xs">
          <Clock className="w-3.5 h-3.5 text-slate-400" />
          <div className="text-left font-mono">
            <div className="text-xs font-extrabold text-slate-800 leading-tight">{clockTime}</div>
            <div className="text-[9px] font-black text-slate-400 tracking-wider uppercase leading-none mt-0.5">{clockDate}</div>
          </div>
        </div>

        {/* Admin info & Logout Card */}
        {adminUser && (
          <div className="flex items-center gap-3 bg-white border border-slate-200 px-3 h-11 rounded-xl shadow-3xs">
            {/* User Profile Info */}
            <div className="flex items-center gap-2">
              {adminUser.photo ? (
                <img 
                  src={adminUser.photo} 
                  className="w-7.5 h-7.5 rounded-full object-cover border border-slate-100 shadow-3xs" 
                  alt="" 
                  referrerPolicy="no-referrer" 
                />
              ) : (
                <div className="w-7.5 h-7.5 rounded-full bg-gradient-to-tr from-brand-600 to-indigo-500 text-white flex items-center justify-center font-black text-xs shadow-3xs uppercase">
                  {adminUser.name.charAt(0)}
                </div>
              )}
              <div className="flex flex-col text-left">
                <span className="text-xs font-extrabold text-slate-800 leading-none truncate max-w-[80px]">
                  {adminUser.name}
                </span>
                <span className="inline-flex items-center gap-0.5 mt-1 px-1 py-0.2 bg-brand-50 text-[8px] font-black text-brand-700 border border-brand-100/80 rounded">
                  <Shield className="w-2 h-2" />
                  {adminUser.role === "超级管理员" ? "超管" : "职员"}
                </span>
              </div>
            </div>

            {/* Vertical Divider */}
            <div className="w-[1px] h-5 bg-slate-200" />

            {/* Logout Action Button */}
            <button
              onClick={onLogout}
              className="flex items-center gap-1.5 px-2.5 py-1.5 bg-red-50 hover:bg-rose-500 text-rose-600 hover:text-white rounded-lg text-xs font-bold transition-all duration-200 cursor-pointer"
              title={getTranslation("logout_btn", lang)}
            >
              <LogOut className="w-3 h-3" />
              <span>{getTranslation("logout_btn", lang)}</span>
            </button>
          </div>
        )}
      </div>
    </header>
  );
}
