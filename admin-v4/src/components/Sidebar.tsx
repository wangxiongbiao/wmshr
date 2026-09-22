import { useState, useEffect } from "react";
import { 
  LayoutDashboard, Users, Clock, Wallet, Package, Receipt, Globe, Layers, 
  ShoppingBag, GraduationCap, Utensils, ChevronDown, ChevronRight, 
  Briefcase, Boxes, Coins, Smartphone, Calendar, ShieldCheck, FileText, Truck
} from "lucide-react";
import { TabId, AdminUser } from "../types";
import { cn } from "../lib/utils";
import { getTranslation, Language } from "../lib/i18n";

interface SidebarProps {
  activeTab: TabId;
  onTabChange: (tabId: TabId) => void;
  adminUser: AdminUser | null;
  hasPermission: (permId: string) => boolean;
  lang: Language;
}

export function Sidebar({ activeTab, onTabChange, adminUser, hasPermission, lang }: SidebarProps) {
  // Navigation structure with associated required permissions
  const groupsConfig = [
    {
      title: "客户管理",
      icon: Briefcase,
      items: [
        { id: 'customers' as TabId, label: '客户列表', icon: Globe, permission: "customers_view" },
      ]
    },
    {
      title: "库存管理",
      icon: Boxes,
      items: [
        { id: 'orders' as TabId, label: '订单列表', icon: ShoppingBag, permission: "orders_view" },
        { id: 'goods' as TabId, label: '入库列表', icon: Package, permission: "goods_view" },
        { id: 'products' as TabId, label: '商品列表', icon: Layers, permission: "products_view" },
      ]
    },
    {
      title: "员工管理",
      icon: Users,
      items: [
        { id: 'dashboard' as TabId, label: '数据看板', icon: LayoutDashboard, permission: "dashboard_view" },
        { id: 'employees' as TabId, label: '员工列表', icon: Users, permission: "employees_view" },
        { id: 'attendance' as TabId, label: '考勤列表', icon: Clock, permission: "attendance_view" },
        { id: 'leave_requests' as TabId, label: '请假列表', icon: Calendar, permission: "leave_view" },
        { id: 'payroll' as TabId, label: '薪资列表', icon: Wallet, permission: "payroll_view" },
      ]
    },
    {
      title: "财务管理",
      icon: Coins,
      items: [
        { id: 'expenses' as TabId, label: '工资列表', icon: Receipt, permission: "expenses_view" },
        { id: 'invoices' as TabId, label: '发票列表', icon: FileText, permission: "expenses_view" },
        { id: 'express' as TabId, label: '快递列表', icon: Truck, permission: "expenses_view" },
      ]
    },
    {
      title: "培训管理",
      icon: GraduationCap,
      items: [
        { id: 'sop_training' as TabId, label: '培训列表', icon: GraduationCap, permission: "sop_view" },
      ]
    },
    {
      title: "厨房管理",
      icon: Utensils,
      items: [
        { id: 'sop_catering' as TabId, label: '菜谱列表', icon: Utensils, permission: "sop_view" },
      ]
    },
    {
      title: "移动协同",
      icon: Smartphone,
      items: [
        { id: 'employee_app' as TabId, label: '员工考勤APP', icon: Smartphone, permission: "dashboard_view" }, // anyone with dashboard view can play with client demo
      ]
    }
  ];

  // Dynamically filter groups based on admin permissions
  const filteredGroups = groupsConfig.map(group => {
    const items = group.items.filter(item => !hasPermission || hasPermission(item.permission));
    return { ...group, items };
  }).filter(group => group.items.length > 0);

  // React state for collapsed groups
  const [collapsedGroups, setCollapsedGroups] = useState<Record<string, boolean>>({});

  // Find which group the active tab belongs to
  const activeGroupTitle = filteredGroups.find(group => 
    group.items.some(item => item.id === activeTab)
  )?.title || "";

  // Auto-expand active group if it was collapsed
  useEffect(() => {
    if (activeGroupTitle && collapsedGroups[activeGroupTitle]) {
      setCollapsedGroups(prev => ({
        ...prev,
        [activeGroupTitle]: false
      }));
    }
  }, [activeTab, activeGroupTitle]);

  const toggleGroup = (title: string) => {
    setCollapsedGroups(prev => ({
      ...prev,
      [title]: !prev[title]
    }));
  };

  return (
    <aside className="w-64 bg-white border-r border-slate-200 flex flex-col z-20 flex-shrink-0 select-none">
      <div className="h-16 flex items-center px-6 border-b border-slate-100">
        <div className="w-8 h-8 rounded-lg bg-brand-600 flex items-center justify-center text-white mr-2">
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
          </svg>
        </div>
        <span className="text-lg font-black tracking-tight text-slate-800">WMS<span className="text-brand-600">HR</span></span>
      </div>

      <nav className="flex-1 py-3 px-3 space-y-3 overflow-y-auto">
        {filteredGroups.map((group, idx) => {
          const isCollapsed = group.title ? !!collapsedGroups[group.title] : false;
          const isGroupActive = group.items.some(item => item.id === activeTab);

          return (
            <div key={idx} className="space-y-1">
              {group.title && (
                <button
                  onClick={() => toggleGroup(group.title)}
                  className={cn(
                    "w-full flex items-center justify-between px-3 py-2.5 text-[14px] font-extrabold select-none mb-1.5 mt-1.5 text-left cursor-pointer transition-all rounded-lg",
                    isGroupActive 
                      ? "text-slate-900 bg-slate-100/80 shadow-3xs" 
                      : "text-slate-800 hover:text-black hover:bg-slate-100 bg-slate-50/30"
                  )}
                >
                  <div className="flex items-center gap-2">
                    <group.icon className={cn(
                      "w-4.5 h-4.5 transition-all duration-200", 
                      isGroupActive ? "text-brand-600 scale-110" : "text-slate-700"
                    )} />
                    <span className="tracking-wide font-black">
                      {getTranslation(
                        group.title === "客户管理" ? "group_customer" :
                        group.title === "库存管理" ? "group_inventory" :
                        group.title === "员工管理" ? "group_employee" :
                        group.title === "财务管理" ? "group_finance" :
                        group.title === "培训管理" ? "group_training" :
                        group.title === "厨房管理" ? "group_kitchen" :
                        group.title === "移动协同" ? "group_mobile" : group.title,
                        lang
                      )}
                    </span>
                  </div>
                  {isCollapsed ? (
                    <ChevronRight className="w-4 h-4 text-slate-700 transition-transform duration-200" />
                  ) : (
                    <ChevronDown className="w-4 h-4 text-slate-700 transition-transform duration-200" />
                  )}
                </button>
              )}
              
              {!isCollapsed && (
                <div className={cn("space-y-1 transition-all duration-200", group.title && "pl-2 border-l border-slate-200 ml-1")}>
                  {group.items.map((item) => (
                    <button
                      key={item.id}
                      onClick={() => onTabChange(item.id)}
                      className={cn(
                        "w-full flex items-center px-4 py-2.5 text-[13.5px] font-bold rounded-lg transition-all text-slate-800 text-left cursor-pointer",
                        activeTab === item.id ? "bg-brand-50 text-brand-700 border-l-2 border-brand-600 font-extrabold rounded-l-none" : "hover:bg-slate-100 text-slate-700"
                      )}
                    >
                      <item.icon className={cn(
                        "w-4 h-4 mr-2.5 flex-shrink-0 transition",
                        activeTab === item.id ? "text-brand-600 scale-110" : "text-slate-500"
                      )} />
                      <span className={cn(activeTab === item.id ? "font-black text-brand-800" : "font-semibold")}>
                        {getTranslation(`menu_${item.id}`, lang)}
                      </span>
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
