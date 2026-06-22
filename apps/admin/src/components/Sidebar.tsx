/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { Clock, FileText, Globe, LayoutDashboard, Package, Receipt, Users, Wallet } from "lucide-react";
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
    // 数据看板已按 admin-v2 界面和接口契约恢复，继续保持旧模块在前、新并入的 v3 业务域在后，降低老用户迁移时的导航跳变。
    // 客户/入库/费用三个入口继续沿用用户指定的 v4 顺序与图标，避免当前 admin 和对照版本在同一业务段出现认知跳变。
    { id: 'dashboard' as TabId, label: t('数据看板'), icon: LayoutDashboard },
    { id: 'employees' as TabId, label: t('员工管理'), icon: Users },
    { id: 'attendance' as TabId, label: t('考勤计算'), icon: Clock },
    { id: 'payroll' as TabId, label: t('薪资核算'), icon: Wallet },
    { id: 'sop' as TabId, label: t('SOP管理'), icon: FileText },
    { id: 'customers' as TabId, label: t('客户管理'), icon: Globe },
    { id: 'goods' as TabId, label: t('入库管理'), icon: Package },
    { id: 'expenses' as TabId, label: t('费用管理'), icon: Receipt },
  ];

  return (
    // 侧边栏只缩窄容器宽度，导航顺序和入口保持 v2 layout；避免为视觉调整牵动业务模块挂载逻辑。
    <aside className="w-60 bg-white border-r border-slate-200 flex flex-col z-20 flex-shrink-0">
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
              // 侧栏入口是后台多语言最容易溢出的高频位置；这里允许两行内自然换行，优先保证入口语义完整可读。
              "w-full flex items-start gap-3 px-3 py-3 text-sm rounded-lg transition-all text-slate-600 text-left",
              activeTab === item.id ? "nav-item-active" : "hover:bg-slate-50"
            )}
          >
            <item.icon className={cn(
              "w-5 h-5 mt-0.5 flex-shrink-0",
               activeTab === item.id ? "text-brand-600" : "text-slate-400"
            )} />
            <span className="flex-1 whitespace-normal leading-tight">{item.label}</span>
          </button>
        ))}
      </nav>
    </aside>
  );
}
