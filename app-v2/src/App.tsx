/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { 
  Home, 
  ClipboardCheck, 
  FileText, 
  User, 
  MapPin, 
  CheckCircle2, 
  Bell, 
  ChevronRight,
  Settings,
  ShieldCheck,
  LogOut,
  Timer
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

class ErrorBoundary extends React.Component<
  { children: React.ReactNode },
  { hasError: boolean; error: Error | null }
> {
  constructor(props: any) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error) {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error("ErrorBoundary caught an error", error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div style={{ padding: '24px', background: '#fef2f2', color: '#991b1b', fontFamily: 'monospace', minHeight: '100vh' }}>
          <h2 style={{ fontSize: '18px', fontWeight: 'bold', marginBottom: '8px' }}>应用渲染出现异常 (Application Render Error)</h2>
          <p style={{ fontSize: '14px', marginBottom: '16px' }}>{this.state.error?.toString()}</p>
          <pre style={{ fontSize: '12px', background: '#fee2e2', padding: '12px', borderRadius: '8px', overflowX: 'auto' }}>
            {this.state.error?.stack}
          </pre>
        </div>
      );
    }

    return this.props.children;
  }
}

// --- Types ---
type Page = 'home' | 'attendance' | 'sop' | 'mine';

interface CheckInData {
  status: 'none' | 'in' | 'out';
  inTime: string | null;
  outTime: string | null;
  gps: string;
}

interface AttendanceRecord {
  date: string;
  in: string;
  out: string;
  type: 'normal' | 'overtime';
  hours: string;
}

interface SOP {
  id: number;
  title: string;
  ver: string;
  date: string;
  read: boolean;
}

// --- Components ---

const TabBar = ({ current, onNav }: { current: Page, onNav: (page: Page) => void }) => {
  const tabs: { id: Page; label: string; icon: typeof Home }[] = [
    { id: 'home', label: '首页', icon: Home },
    { id: 'attendance', label: '考勤', icon: ClipboardCheck },
    { id: 'sop', label: 'SOP', icon: FileText },
    { id: 'mine', label: '我的', icon: User },
  ];

  return (
    <div className="fixed bottom-0 left-0 right-0 max-w-md mx-auto h-20 bg-white/85 backdrop-blur-2xl border-t border-slate-100 flex justify-around items-center z-40 px-2 pb-2">
      {tabs.map((tab) => {
        const isActive = current === tab.id;
        return (
          <button 
            key={tab.id}
            onClick={() => onNav(tab.id)}
            className={`flex flex-col items-center gap-1 transition-all duration-300 flex-1 ${isActive ? 'text-blue-600 scale-105' : 'text-slate-400 hover:text-slate-500'}`}
          >
            <tab.icon size={22} strokeWidth={isActive ? 2.5 : 2} />
            <span className="text-[10px] font-bold uppercase tracking-wider">{tab.label}</span>
            {isActive && (
              <motion.div 
                layoutId="tab-dot"
                className="w-1 h-1 bg-blue-600 rounded-full mt-0.5"
              />
            )}
          </button>
        );
      })}
    </div>
  );
};

export default function App() {
  const [currentPage, setCurrentPage] = useState<Page>('home');
  const [currentTime, setCurrentTime] = useState(new Date());
  const [toast, setToast] = useState<{ msg: string, type: 'success' | 'error' | 'info' } | null>(null);
  
  const [user, setUser] = useState<{ name: string; dept: string; avatarUrl: string | null }>({
    name: 'Thin Thin Aung',
    dept: 'A区-入库部门',
    avatarUrl: null // null initially, fallback to 'T'
  });

  const [checkInData, setCheckInData] = useState<CheckInData>({
    status: 'none',
    inTime: null,
    outTime: null,
    gps: '曼谷 Warehouse A · 精度 3.2m'
  });

  const renderAvatarContainer = (sizeClasses: string, textClass: string, isRoundCornerLarge = false) => {
    const firstLetter = user.name ? user.name.trim().charAt(0).toUpperCase() : '?';
    const borderRadiusClass = isRoundCornerLarge ? 'rounded-[40px]' : 'rounded-2xl';
    const borderClass = isRoundCornerLarge ? 'border-4 border-white' : 'border-2 border-white';
    
    if (user.avatarUrl) {
      return (
        <div className={`${sizeClasses} ${borderRadiusClass} bg-slate-200 overflow-hidden ${borderClass} flex items-center justify-center shrink-0`}>
          <img 
            src={user.avatarUrl} 
            alt={user.name} 
            referrerPolicy="no-referrer"
            className="w-full h-full object-cover"
          />
        </div>
      );
    }
    
    return (
      <div className={`${sizeClasses} ${borderRadiusClass} bg-gradient-to-br from-blue-600 to-blue-800 flex items-center justify-center text-white font-black overflow-hidden ${borderClass} shrink-0 shadow-lg shadow-blue-500/10`}>
        <span className={textClass}>
          {firstLetter}
        </span>
      </div>
    );
  };

  const handleAvatarChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setUser(prev => ({ ...prev, avatarUrl: reader.result as string }));
        showToast('头像更新成功', 'success');
      };
      reader.readAsDataURL(file);
    }
  };

  const setPresetAvatar = () => {
    setUser(prev => ({ 
      ...prev, 
      avatarUrl: 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?auto=format&fit=crop&q=80&w=200&h=200' 
    }));
    showToast('已加载推荐内置头像', 'success');
  };

  const clearAvatar = () => {
    setUser(prev => ({ ...prev, avatarUrl: null }));
    showToast('头像已清除，已恢复为首字母显示', 'info');
  };

  const [attendance] = useState<AttendanceRecord[]>([
    { date: '2026-05-17', in: '08:30', out: '17:35', type: 'normal', hours: '8.1h' },
    { date: '2026-05-16', in: '08:45', out: '19:20', type: 'overtime', hours: '9.6h' },
    { date: '2026-05-15', in: '08:32', out: '17:40', type: 'normal', hours: '8.1h' },
    { date: '2026-05-14', in: '08:28', out: '17:30', type: 'normal', hours: '8.0h' }
  ]);

  const [sops] = useState<SOP[]>([
    { id: 1, title: '仓库安全操作规范', ver: 'V2.1', date: '05-10', read: true },
    { id: 2, title: '拣货作业标准流程', ver: 'V1.8', date: '05-08', read: false },
    { id: 3, title: '叉车安全驾驶指南', ver: 'V3.0', date: '05-05', read: false }
  ]);

  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  const showToast = (msg: string, type: 'success' | 'error' | 'info' = 'success') => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3000);
  };

  const handleCheckIn = () => {
    const now = new Date();
    const timeStr = now.toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit', hour12: false });
    
    if (checkInData.status === 'none') {
      setCheckInData(prev => ({ ...prev, status: 'in', inTime: timeStr }));
      showToast('上班打卡成功', 'success');
    } else if (checkInData.status === 'in') {
      setCheckInData(prev => ({ ...prev, status: 'out', outTime: timeStr }));
      showToast('下班打卡成功', 'success');
    } else {
      setCheckInData({
        status: 'none',
        inTime: null,
        outTime: null,
        gps: '曼谷 Warehouse A · 精度 3.2m'
      });
      showToast('已重置状态 (演示)', 'info');
    }
  };

  const detailedTime = currentTime.toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false });
  const formattedDate = currentTime.toLocaleDateString('zh-CN', { weekday: 'long', month: 'long', day: 'numeric' });

  return (
    <ErrorBoundary>
      <div className="min-h-screen bg-slate-50 flex flex-col max-w-md mx-auto relative shadow-2xl overflow-x-hidden border-x border-slate-100 font-sans antialiased">
        {/* Toast */}
        <AnimatePresence>
          {toast && (
            <motion.div 
              initial={{ opacity: 0, y: -20, scale: 0.9 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -20, scale: 0.9 }}
              className={`fixed top-4 left-4 right-4 max-w-sm mx-auto z-[100] p-4 rounded-2xl shadow-xl text-white font-bold text-sm text-center border backdrop-blur-md
                ${toast.type === 'success' ? 'bg-emerald-500/90 border-emerald-400' : toast.type === 'error' ? 'bg-rose-500/90 border-rose-400' : 'bg-slate-800/90 border-slate-700'}`}
            >
              {toast.msg}
            </motion.div>
          )}
        </AnimatePresence>

      <div className="flex-1 pb-24 pt-4 overflow-y-auto no-scrollbar scroll-smooth">
        <AnimatePresence mode="wait">
          {currentPage === 'home' && (
            <motion.div 
              key="home"
              initial={{ opacity: 0, scale: 0.98 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.98 }}
              transition={{ duration: 0.2 }}
              className="px-6 space-y-6"
            >
              {/* Header */}
              <div className="flex justify-between items-center bg-slate-50/80 backdrop-blur-md sticky top-0 py-2 z-30">
                <div>
                  <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">下午好</p>
                  <h1 className="text-2xl font-bold text-slate-900 leading-tight">{user.name}</h1>
                </div>
                {renderAvatarContainer('w-12 h-12', 'text-xl')}
              </div>

              {/* Check-in Card */}
              <div className="relative group">
                <div className={`absolute inset-0 bg-gradient-to-br transition-all duration-500 rounded-[32px] blur-xl opacity-20 group-hover:opacity-30
                  ${checkInData.status === 'in' ? 'from-emerald-500 to-green-500' : checkInData.status === 'out' ? 'from-slate-400 to-slate-500' : 'from-blue-500 to-blue-600'}`} />
                
                <div className="relative bg-white rounded-[32px] border border-slate-100 p-6 shadow-sm overflow-hidden">
                  <div className="flex justify-between items-start mb-6">
                    <div>
                      <p className="text-[10px] text-slate-400 font-black uppercase tracking-[0.15em]">系统时间</p>
                      <p className="text-4xl font-black text-slate-900 mono tracking-tighter mt-1">{detailedTime}</p>
                      <p className="text-[11px] text-slate-500 font-semibold mt-1">{formattedDate}</p>
                    </div>
                    <div>
                      {checkInData.status === 'in' ? (
                        <div className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-50 text-emerald-600 rounded-full text-[10px] font-black uppercase tracking-wider border border-emerald-100">
                          <span className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse shadow-[0_0_8px_rgba(16,185,129,0.5)]" />
                          在勤中
                        </div>
                      ) : checkInData.status === 'out' ? (
                        <div className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-100 text-slate-500 rounded-full text-[10px] font-black uppercase tracking-wider border border-slate-200">
                          已完成
                        </div>
                      ) : (
                        <div className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-100 text-slate-400 rounded-full text-[10px] font-black uppercase tracking-wider border border-slate-200">
                          未打卡
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4 mb-6">
                    <div className="bg-slate-50 rounded-2xl p-4 border border-slate-100/80 text-center">
                      <div className="flex items-center justify-center gap-2 mb-2">
                        <div className={`w-2 h-2 rounded-full ${checkInData.inTime ? 'bg-emerald-500' : 'bg-slate-300'}`} />
                        <span className="text-[9px] text-slate-400 font-black uppercase tracking-widest">上班时间</span>
                      </div>
                      <p className={`text-2xl font-black mono tracking-tight ${checkInData.inTime ? 'text-slate-800' : 'text-slate-300'}`}>
                        {checkInData.inTime || '--:--'}
                      </p>
                    </div>
                    <div className="bg-slate-50 rounded-2xl p-4 border border-slate-100/80 text-center">
                      <div className="flex items-center justify-center gap-2 mb-2">
                        <div className={`w-2 h-2 rounded-full ${checkInData.outTime ? 'bg-blue-500' : 'bg-slate-300'}`} />
                        <span className="text-[9px] text-slate-400 font-black uppercase tracking-widest">下班时间</span>
                      </div>
                      <p className={`text-2xl font-black mono tracking-tight ${checkInData.outTime ? 'text-slate-800' : 'text-slate-300'}`}>
                        {checkInData.outTime || '--:--'}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 py-3 px-4 bg-blue-50/50 rounded-xl border border-blue-100 text-[11px] text-blue-600 font-bold mb-6">
                    <MapPin size={14} strokeWidth={2.5} />
                    <span className="truncate">{checkInData.gps}</span>
                  </div>

                  <button 
                    onClick={handleCheckIn}
                    disabled={checkInData.status === 'out'}
                    className={`w-full py-4.5 rounded-2xl font-black text-sm uppercase tracking-widest transition-all shadow-lg active:scale-95 flex items-center justify-center gap-2
                      ${checkInData.status === 'none' 
                        ? 'bg-blue-600 text-white shadow-blue-500/25 hover:bg-blue-700' 
                        : checkInData.status === 'in' 
                        ? 'bg-amber-500 text-white shadow-amber-500/25 hover:bg-amber-600'
                        : 'bg-slate-100 text-slate-400 shadow-none cursor-not-allowed'
                      }`}
                  >
                    {checkInData.status === 'none' ? <Timer size={18} /> : checkInData.status === 'in' ? <LogOut size={18} /> : <CheckCircle2 size={18} />}
                    {checkInData.status === 'none' ? '上班打卡' : checkInData.status === 'in' ? '下班打卡' : '今日已下班'}
                  </button>
                </div>
              </div>

              {/* Stats Grid */}
              <div className="grid grid-cols-3 gap-3">
                <div className="bg-white p-4 rounded-[24px] border border-slate-100 shadow-sm text-center">
                  <p className="text-[9px] text-slate-400 font-black uppercase tracking-widest">本月工时</p>
                  <p className="text-xl font-black text-slate-900 mt-1">164<span className="text-[10px] text-slate-400 ml-0.5">h</span></p>
                </div>
                <div className="bg-white p-4 rounded-[24px] border border-slate-100 shadow-sm text-center">
                  <p className="text-[9px] text-slate-400 font-black uppercase tracking-widest">出勤天数</p>
                  <p className="text-xl font-black text-slate-900 mt-1">18<span className="text-[10px] text-slate-400 ml-0.5">d</span></p>
                </div>
                <div className="bg-white p-4 rounded-[24px] border border-slate-100 shadow-sm text-center">
                  <p className="text-[9px] text-slate-400 font-black uppercase tracking-widest">待办SOP</p>
                  <p className="text-xl font-black text-slate-900 mt-1">2<span className="text-[10px] text-slate-400 ml-0.5">p</span></p>
                </div>
              </div>

              {/* Notifications */}
              <div className="bg-white rounded-[24px] border border-slate-100 p-5 space-y-4 shadow-sm">
                <div className="flex justify-between items-center">
                  <h2 className="text-sm font-black text-slate-900 uppercase tracking-widest">系统通知</h2>
                  <button className="text-[10px] font-black text-blue-600 uppercase tracking-widest hover:underline">查看全部</button>
                </div>
                
                <div className="space-y-4">
                  <div className="flex gap-4 items-start group cursor-pointer">
                    <div className="w-10 h-10 rounded-xl bg-blue-50 flex items-center justify-center shrink-0 group-hover:bg-blue-100 transition-colors">
                      <Bell size={18} className="text-blue-600" />
                    </div>
                    <div className="flex-1 overflow-hidden">
                      <p className="text-xs font-bold text-slate-800">仓库消防演练通知</p>
                      <p className="text-[11px] text-slate-500 mt-0.5 truncate mr-2">本周五下午 14:00 全员参与...</p>
                    </div>
                    <ChevronRight size={14} className="text-slate-300 self-center" />
                  </div>
                  <div className="flex gap-4 items-start group cursor-pointer">
                    <div className="w-10 h-10 rounded-xl bg-emerald-50 flex items-center justify-center shrink-0 group-hover:bg-emerald-100 transition-colors">
                      <CheckCircle2 size={18} className="text-emerald-600" />
                    </div>
                    <div className="flex-1 overflow-hidden">
                      <p className="text-xs font-bold text-slate-800">4月工资条已生成</p>
                      <p className="text-[11px] text-slate-500 mt-0.5 truncate mr-2">请前往个人中心查看详情...</p>
                    </div>
                    <ChevronRight size={14} className="text-slate-300 self-center" />
                  </div>
                </div>
              </div>
            </motion.div>
          )}

          {currentPage === 'attendance' && (
            <motion.div 
              key="attendance"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="px-6"
            >
              <h1 className="text-2xl font-black text-slate-900 mb-6 uppercase tracking-tight">考勤流水</h1>
              <div className="bg-white rounded-[32px] border border-slate-100 overflow-hidden shadow-sm">
                {attendance.map((record, i) => (
                  <div key={i} className="flex justify-between items-center p-5 border-b border-slate-50 last:border-0 hover:bg-slate-50 transition-colors cursor-pointer">
                    <div>
                      <p className="text-xs font-black text-slate-800">{record.date}</p>
                      <p className="text-[11px] text-slate-500 font-bold mono mt-1">{record.in} - {record.out}</p>
                    </div>
                    <div className="text-right">
                      <span className={`inline-block px-3 py-1 rounded-full text-[9px] font-black uppercase tracking-widest border
                        ${record.type === 'overtime' ? 'bg-purple-50 text-purple-600 border-purple-100' : 'bg-emerald-50 text-emerald-600 border-emerald-100'}`}>
                        {record.type === 'overtime' ? '加班' : '常规'}
                      </span>
                      <p className="text-[11px] text-slate-400 font-bold mono mt-1.5 tracking-tight">{record.hours}</p>
                    </div>
                  </div>
                ))}
              </div>
            </motion.div>
          )}

          {currentPage === 'sop' && (
            <motion.div 
              key="sop"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="px-6"
            >
              <h1 className="text-2xl font-black text-slate-900 mb-6 uppercase tracking-tight">作业规范</h1>
              <div className="space-y-3">
                {sops.map((sop) => (
                  <div 
                    key={sop.id} 
                    onClick={() => showToast(`预览文档: ${sop.title}`, 'info')}
                    className="flex justify-between items-center p-5 bg-white rounded-[24px] border border-slate-100 shadow-sm active:scale-95 transition-all cursor-pointer group"
                  >
                    <div className="flex items-center gap-4">
                      <div className={`w-11 h-11 rounded-2xl flex items-center justify-center shrink-0 border transition-colors
                        ${sop.read ? 'bg-slate-50 border-slate-100 text-slate-400' : 'bg-blue-50 border-blue-100 text-blue-600'}`}>
                        <FileText size={20} strokeWidth={sop.read ? 2 : 2.5} />
                      </div>
                      <div>
                        <p className={`text-sm font-bold ${sop.read ? 'text-slate-600' : 'text-slate-900'}`}>{sop.title}</p>
                        <p className="text-[10px] text-slate-400 font-bold mt-1 uppercase tracking-widest">{sop.ver} · 更新于 {sop.date}</p>
                      </div>
                    </div>
                    {!sop.read && (
                      <div className="w-2 h-2 bg-rose-500 rounded-full shadow-[0_0_8px_rgba(244,63,94,0.6)]" />
                    )}
                  </div>
                ))}
              </div>
            </motion.div>
          )}

          {currentPage === 'mine' && (
            <motion.div 
              key="mine"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="px-6 bg-slate-50 h-full"
            >
              <div className="text-center py-8">
                <div className="relative inline-block">
                  {renderAvatarContainer('w-28 h-28', 'text-4xl', true)}
                  <div className="absolute -bottom-1 -right-1 w-10 h-10 bg-emerald-500 border-4 border-white rounded-2xl z-20 flex items-center justify-center shadow-lg">
                    <CheckCircle2 size={20} className="text-white" />
                  </div>
                </div>
                <h2 className="text-2xl font-black text-slate-900 mt-6 tracking-tight">{user.name}</h2>
                <span className="inline-block mt-2 px-4 py-1.5 bg-white rounded-full border border-slate-200 text-[10px] font-black text-slate-500 uppercase tracking-widest shadow-sm">
                  {user.dept}
                </span>
              </div>

              {/* Avatar Management Simulation Desk */}
              <div className="bg-white rounded-[32px] border border-slate-100 p-5 shadow-sm mb-6">
                <div className="flex items-center gap-2 mb-3">
                  <div className="w-1.5 h-3.5 bg-blue-600 rounded-full" />
                  <h3 className="text-xs font-black text-slate-800 uppercase tracking-wider">
                    员工头像后台管理模拟
                  </h3>
                </div>
                
                <p className="text-[11px] text-slate-400 mb-4 font-semibold leading-relaxed">
                  模拟HR后台系统的行为。你可以上传本地照片，或者直接一键加载默认的高级头像资源进行预览。
                </p>

                <div className="grid grid-cols-2 gap-3 mb-3.5">
                  <button 
                    onClick={setPresetAvatar}
                    className="flex-1 py-3 px-2 text-xs font-black text-blue-600 bg-blue-50/60 hover:bg-blue-50 border border-blue-100/60 rounded-xl transition-all text-center active:scale-95"
                  >
                    一键设置头像
                  </button>
                  <button 
                    onClick={clearAvatar}
                    disabled={!user.avatarUrl}
                    className={`flex-1 py-3 px-2 text-xs font-black rounded-xl border transition-all text-center active:scale-95
                      ${user.avatarUrl 
                        ? 'text-rose-600 bg-rose-50/60 hover:bg-rose-50 border-rose-100/60' 
                        : 'text-slate-300 bg-slate-50 border-slate-100/30 cursor-not-allowed'}`}
                  >
                    恢复首字母显示
                  </button>
                </div>
                
                <label className="block text-center cursor-pointer py-3 border border-dashed border-slate-200 hover:border-blue-400 rounded-xl bg-slate-50/50 hover:bg-blue-50/20 transition-all">
                  <span className="text-xs font-bold text-slate-500">上传真实本地照片测试</span>
                  <input 
                    type="file" 
                    accept="image/*" 
                    className="hidden" 
                    onChange={handleAvatarChange} 
                  />
                </label>
              </div>

              <div className="bg-white rounded-[32px] border border-slate-100 p-6 shadow-sm mb-6">
                <div className="grid grid-cols-3 gap-6 text-center divide-x divide-slate-100">
                  <div className="pl-0">
                    <p className="text-xl font-black text-slate-900">18</p>
                    <p className="text-[9px] text-slate-400 font-black uppercase tracking-widest mt-1">出勤率</p>
                  </div>
                  <div className="pl-4">
                    <p className="text-xl font-black text-slate-900">0</p>
                    <p className="text-[9px] text-slate-400 font-black uppercase tracking-widest mt-1">异常</p>
                  </div>
                  <div className="pl-4">
                    <p className="text-xl font-black text-slate-900">4.5</p>
                    <p className="text-[9px] text-slate-400 font-black uppercase tracking-widest mt-1">加班</p>
                  </div>
                </div>
              </div>

              <div className="bg-white rounded-[32px] border border-slate-100 overflow-hidden shadow-sm divide-y divide-slate-50">
                <div className="flex items-center justify-between p-5 hover:bg-slate-50 transition-colors cursor-pointer group">
                  <div className="flex items-center gap-4">
                    <div className="w-10 h-10 rounded-2xl bg-blue-50 flex items-center justify-center border border-blue-100 group-hover:scale-110 transition-transform">
                      <Settings size={18} className="text-blue-600" />
                    </div>
                    <span className="text-sm font-bold text-slate-800">系统设置</span>
                  </div>
                  <ChevronRight size={18} className="text-slate-300" />
                </div>
                <div className="flex items-center justify-between p-5 hover:bg-slate-50 transition-colors cursor-pointer group">
                  <div className="flex items-center gap-4">
                    <div className="w-10 h-10 rounded-2xl bg-emerald-50 flex items-center justify-center border border-emerald-100 group-hover:scale-110 transition-transform">
                      <ShieldCheck size={18} className="text-emerald-600" />
                    </div>
                    <span className="text-sm font-bold text-slate-800">隐私策略</span>
                  </div>
                  <ChevronRight size={18} className="text-slate-300" />
                </div>
                <button 
                  onClick={() => showToast('已安全登出', 'info')}
                  className="w-full p-5 text-rose-500 font-black text-sm uppercase tracking-[0.2em] hover:bg-rose-50 transition-colors flex items-center justify-center gap-2"
                >
                  <LogOut size={16} />
                  退出登录
                </button>
              </div>
              
              <p className="text-center text-[9px] text-slate-300 font-bold uppercase tracking-widest mt-12 mb-6">
                WMSHR Global · v1.0.24
              </p>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      <TabBar current={currentPage} onNav={setCurrentPage} />
    </div>
  </ErrorBoundary>
);
}
