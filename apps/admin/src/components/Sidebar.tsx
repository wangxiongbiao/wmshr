/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { Clock, FileText, LayoutDashboard, Users, Wallet } from "lucide-react";
import { useTranslation } from "react-i18next";
import { TabId } from "../types";
import { cn } from "../lib/utils";

function WmshrLogoMark() {
  // 继续复用 public/dutylix-icon.svg 这个既有路径，避免改动静态资源引用面；图形内容已恢复为蓝底 WMSHR 立方体标识。
  return <img src="/dutylix-icon.svg" alt="" aria-hidden="true" className="w-8 h-8" />;
}

interface SidebarProps {
  activeTab: TabId;
  // 侧边栏不再直接改本地 state；上层会把 tab 点击映射到 `/:lang/:tab`，让刷新和分享链接都保持一致。
  onTabChange: (tabId: TabId) => void;
}

export function Sidebar({ activeTab, onTabChange }: SidebarProps) {
  const { t } = useTranslation("admin");
  const navItems = [
    // 数据看板已按 admin-v2 界面和接口契约恢复，继续保持 v2 模块顺序，避免旧后台入口回流。
    { id: 'dashboard' as TabId, label: t('数据看板'), icon: LayoutDashboard },
    { id: 'employees' as TabId, label: t('员工管理'), icon: Users },
    { id: 'attendance' as TabId, label: t('考勤计算'), icon: Clock },
    { id: 'payroll' as TabId, label: t('薪资核算'), icon: Wallet },
    { id: 'sop' as TabId, label: t('SOP管理'), icon: FileText },
  ];

  return (
    // 侧边栏只缩窄容器宽度，导航顺序和入口保持 v2 layout；避免为视觉调整牵动业务模块挂载逻辑。
    <aside className="w-52 bg-white border-r border-slate-200 flex flex-col z-20 flex-shrink-0">
      <div className="h-16 flex items-center px-6 border-b border-slate-100">
        <div className="w-8 h-8 rounded-lg flex items-center justify-center mr-2 shadow-sm shadow-brand-600/20">
          <WmshrLogoMark />
        </div>
        <span className="text-lg font-bold text-slate-800">WMS<span className="text-brand-600">HR</span></span>
      </div>
      <nav className="flex-1 py-4 px-2 space-y-1 overflow-y-auto">
        {navItems.map((item) => (
          <button
            key={item.id}
            onClick={() => onTabChange(item.id)}
            className={cn(
              "w-full flex items-center px-3 py-2.5 text-sm rounded-lg transition-all text-slate-600 text-left",
              activeTab === item.id ? "nav-item-active" : "hover:bg-slate-50"
            )}
          >
            <item.icon className={cn(
              "w-5 h-5 mr-3 flex-shrink-0",
               activeTab === item.id ? "text-brand-600" : "text-slate-400"
            )} />
            {item.label}
          </button>
        ))}
      </nav>
    </aside>
  );
}
