/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { LayoutDashboard, Users, Clock, Wallet, FileText } from "lucide-react";
import { TabId } from "../types";
import { cn } from "../lib/utils";

interface SidebarProps {
  activeTab: TabId;
  onTabChange: (tabId: TabId) => void;
}

export function Sidebar({ activeTab, onTabChange }: SidebarProps) {
  const navItems = [
    { id: 'dashboard' as TabId, label: '数据看板', icon: LayoutDashboard },
    { id: 'employees' as TabId, label: '员工管理', icon: Users },
    { id: 'attendance' as TabId, label: '考勤计算', icon: Clock },
    { id: 'payroll' as TabId, label: '薪资核算', icon: Wallet },
    { id: 'sop' as TabId, label: 'SOP管理', icon: FileText },
  ];

  return (
    <aside className="w-64 bg-white border-r border-slate-200 flex flex-col z-20 flex-shrink-0">
      <div className="h-16 flex items-center px-6 border-b border-slate-100">
        <div className="w-8 h-8 rounded-lg bg-brand-600 flex items-center justify-center text-white mr-2">
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
          </svg>
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
      <div className="p-4 border-t border-slate-100">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-full bg-slate-200 flex items-center justify-center text-slate-600 font-bold text-xs">A</div>
          <div>
            <p className="text-sm font-medium text-slate-800">仓库管理员</p>
            <p className="text-xs text-slate-500">admin@globalwms.com</p>
          </div>
        </div>
      </div>
    </aside>
  );
}
