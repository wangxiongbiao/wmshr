/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useEffect, useState } from "react";
import { Briefcase, Boxes, Calendar, ChevronDown, ChevronRight, Clock, FileText, Globe, LayoutDashboard, Package, Receipt, Users, Wallet } from "lucide-react";
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
  const groups = [
    {
      title: t('客户管理'),
      icon: Briefcase,
      items: [
        { id: 'customers' as TabId, label: t('客户列表'), icon: Globe },
      ],
    },
    {
      title: t('仓储管理'),
      icon: Boxes,
      items: [
        { id: 'goods' as TabId, label: t('入库管理'), icon: Package },
      ],
    },
    {
      title: t('员工管理'),
      icon: Users,
      items: [
        // 员工域保留“看板 → 列表 → 计算/审批”的访问顺序；树形改造只重组导航，不改变既有模块先后与路由契约。
        { id: 'dashboard' as TabId, label: t('数据看板'), icon: LayoutDashboard },
        { id: 'employees' as TabId, label: t('员工列表'), icon: Users },
        { id: 'attendance' as TabId, label: t('考勤计算'), icon: Clock },
        { id: 'leave' as TabId, label: t('请假管理'), icon: Calendar },
        { id: 'payroll' as TabId, label: t('薪资核算'), icon: Wallet },
      ],
    },
    {
      title: t('流程管理'),
      icon: FileText,
      items: [
        { id: 'sop' as TabId, label: t('SOP管理'), icon: FileText },
      ],
    },
    {
      title: t('财务管理'),
      icon: Receipt,
      items: [
        { id: 'expenses' as TabId, label: t('费用管理'), icon: Receipt },
      ],
    },
  ];

  // 树形侧栏要允许手动折叠分组，但当外部路由把当前 tab 切到某组内部时，必须自动展开该组，避免“页面已切换、入口却消失”的错觉。
  const [collapsedGroups, setCollapsedGroups] = useState<Record<string, boolean>>({});
  const activeGroupTitle = groups.find((group) => group.items.some((item) => item.id === activeTab))?.title || "";

  useEffect(() => {
    if (activeGroupTitle && collapsedGroups[activeGroupTitle]) {
      setCollapsedGroups((prev) => ({
        ...prev,
        [activeGroupTitle]: false,
      }));
    }
  }, [activeGroupTitle, activeTab, collapsedGroups]);

  const toggleGroup = (title: string) => {
    setCollapsedGroups((prev) => ({
      ...prev,
      [title]: !prev[title],
    }));
  };

  return (
    // 侧边栏改为业务域树形分组后，一级标题承担“找领域”、二级项承担“找页面”；布局宽度仍保持原值，避免联动主内容区测量逻辑。
    <aside className="w-60 bg-white border-r border-slate-200 flex flex-col z-20 flex-shrink-0">
      <div className="h-16 flex items-center px-6 border-b border-slate-100">
        <div className="w-8 h-8 rounded-lg flex items-center justify-center mr-2 shadow-sm shadow-brand-600/20">
          <WmshrLogoMark />
        </div>
        <span className="text-lg font-bold text-slate-800">WMS<span className="text-brand-600">HR</span></span>
      </div>
      <nav className="flex-1 py-3 px-2.5 space-y-3 overflow-y-auto">
        {groups.map((group) => {
          const isCollapsed = !!collapsedGroups[group.title];
          const isGroupActive = group.items.some((item) => item.id === activeTab);

          return (
            <div key={group.title} className="space-y-1">
              <button
                onClick={() => toggleGroup(group.title)}
                className={cn(
                  "w-full flex items-center justify-between px-3 py-2.5 text-sm rounded-lg transition-all text-left",
                  isGroupActive ? "bg-slate-100 text-slate-900" : "bg-slate-50/60 text-slate-800 hover:bg-slate-100"
                )}
              >
                <div className="flex items-center gap-2.5 min-w-0">
                  <group.icon className={cn("w-4.5 h-4.5 flex-shrink-0", isGroupActive ? "text-brand-600" : "text-slate-600")} />
                  <span className="font-semibold whitespace-normal leading-tight">{group.title}</span>
                </div>
                {isCollapsed ? (
                  <ChevronRight className="w-4 h-4 flex-shrink-0 text-slate-500" />
                ) : (
                  <ChevronDown className="w-4 h-4 flex-shrink-0 text-slate-500" />
                )}
              </button>

              {!isCollapsed && (
                <div className="ml-2 border-l border-slate-200 pl-2 space-y-1">
                  {group.items.map((item) => (
                    <button
                      key={item.id}
                      onClick={() => onTabChange(item.id)}
                      className={cn(
                        // 二级入口继续允许两行内换行，兼容多语言和较长业务名；激活态改为左边框强调，贴近用户提供的树形参考。
                        "w-full flex items-start gap-3 px-3 py-2.5 text-sm rounded-lg transition-all text-left",
                        activeTab === item.id ? "bg-brand-50 text-brand-700 border-l-2 border-brand-600 rounded-l-none" : "text-slate-700 hover:bg-slate-50"
                      )}
                    >
                      <item.icon className={cn(
                        "w-4.5 h-4.5 mt-0.5 flex-shrink-0",
                        activeTab === item.id ? "text-brand-600" : "text-slate-400"
                      )} />
                      <span className="flex-1 whitespace-normal leading-tight font-medium">{item.label}</span>
                    </button>
                  ))}
                </div>
              )}
            </div>
          );
        })}
      </nav>
    </aside>
  );
}
