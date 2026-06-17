/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState, useMemo } from "react";
import { Sidebar } from "./components/Sidebar";
import { Header } from "./components/Header";
import { Dashboard } from "./components/Dashboard";
import { EmployeeList } from "./components/EmployeeList";
import { AttendanceTable } from "./components/AttendanceTable";
import { PayrollTable } from "./components/PayrollTable";
import { SopManager } from "./components/SopManager";
import { EmployeeModal, DeleteModal, SettingsModal, AttendanceAdjustmentModal } from "./components/Modals";
import { GoodsManager } from "./components/GoodsManager";
import { ExpenseManager } from "./components/ExpenseManager";
import { CustomerManager } from "./components/CustomerManager";
import { ProductManager } from "./components/ProductManager";
import { OrderManager } from "./components/OrderManager";
import { TabId, Employee, AttendanceRecord, AppConfig, GoodsRecord, Customer, Product, CustomerOrder } from "./types";
import { INITIAL_EMPLOYEES, INITIAL_ATTENDANCE, INITIAL_CONFIG, INITIAL_GOODS } from "./constants";
import { motion, AnimatePresence } from "motion/react";
import { CheckCircle } from "lucide-react";

export default function App() {
  const [activeTab, setActiveTab] = useState<TabId>('attendance');
  const [employees, setEmployees] = useState<Employee[]>(INITIAL_EMPLOYEES);
  const [attendance, setAttendance] = useState<AttendanceRecord[]>(INITIAL_ATTENDANCE);
  const [goods, setGoods] = useState<GoodsRecord[]>(INITIAL_GOODS);
  const [config, setConfig] = useState<AppConfig>(INITIAL_CONFIG);
  const [selectedAttIds, setSelectedAttIds] = useState<Set<string>>(new Set());

  // 1. Customers State
  const [customers, setCustomers] = useState<Customer[]>(() => {
    try {
      const saved = localStorage.getItem("wms_customers");
      return saved ? JSON.parse(saved) : [
        {
          id: "CUST-101",
          name: "上海凯信国际贸易商社",
          contact: "李经理 13911112222",
          currency: "CNY",
          availableLimit: 120000,
          creditLimit: 150000,
          billingTemplate: "WMS标准月结模版",
          status: "enabled",
          shops: [
            { id: "s-1", platform: "TikTok", shopName: "凯信海外美妆直营1店", shopId: "tk-859403", status: "enabled", authorizedAt: "2026-05-01" },
            { id: "s-2", platform: "Shopee", shopName: "凯信东南亚特产屋", shopId: "sp-748301", status: "enabled", authorizedAt: "2026-05-15" }
          ],
          creditLogs: [
            { id: "tx-1", type: "recharge", amount: 100000, balanceAfter: 100000, createdAt: "2026-05-01 10:00:00", note: "首期线下银行电汇缴费充值入账", operator: "财务主管-小陈" },
            { id: "tx-2", type: "recharge", amount: 20450, balanceAfter: 120450, createdAt: "2026-05-15 11:30:00", note: "季度WMS仓储补贴活动预充赠送", operator: "系统自动" },
            { id: "tx-3", type: "consumption", amount: 450, balanceAfter: 120000, createdAt: "2026-06-05 15:00:00", note: "扣除 WMS 拣货贴单打包费 (批次: IN2026-06)", operator: "系统自动" }
          ]
        },
        {
          id: "CUST-102",
          name: "深圳市格朗户外智能装备",
          contact: "王主管 18688889999",
          currency: "USD",
          availableLimit: 45000,
          creditLimit: 50000,
          billingTemplate: "外贸一件代发专属模版",
          status: "enabled",
          shops: [
            { id: "s-3", platform: "TikTok", shopName: "GLOW Outdoor TK-FR", shopId: "tk-229940", status: "enabled", authorizedAt: "2026-06-01" }
          ],
          creditLogs: [
            { id: "tx-4", type: "recharge", amount: 50000, balanceAfter: 50000, createdAt: "2026-06-01 09:12:00", note: "商户开户预付押金及可用额度充值", operator: "财务主管-小陈" },
            { id: "tx-5", type: "consumption", amount: 5000, balanceAfter: 45000, createdAt: "2026-06-03 14:00:00", note: "平台一件代发国际分拨首段航程预扣费", operator: "拼箱专员" }
          ]
        }
      ];
    } catch {
      return [];
    }
  });

  const handleUpdateCustomers = (newList: Customer[]) => {
    setCustomers(newList);
    localStorage.setItem("wms_customers", JSON.stringify(newList));
  };

  // 2. Products State
  const [products, setProducts] = useState<Product[]>(() => {
    try {
      const saved = localStorage.getItem("wms_products");
      return saved ? JSON.parse(saved) : [
        { id: "SKU-3CE", name: "3CE 九色眼影盘 #波打大马士革", spec: "9色/120g", customerId: "CUST-101", customerName: "上海凯信国际贸易商社", inventory: 25, shelfLocation: "A-02-05", note: "大促热销美妆件，需要气泡纸精细包装" },
        { id: "SKU-9色/盒", name: "美妆九色眼影盘", spec: "9色/盒", customerId: "CUST-101", customerName: "上海凯信国际贸易商社", inventory: 15, shelfLocation: "A-02-06", note: "同步WMS入库单所得" },
        { id: "SKU-CAMP-LAMP", name: "GLOW 太阳能多功能营地灯", spec: "双电池/高亮款", customerId: "CUST-102", customerName: "深圳市格朗户外智能装备", inventory: 8, shelfLocation: "B-12-01", note: "带锂电池，必须特殊标危险标签出库" }
      ];
    } catch {
      return [];
    }
  });

  const handleUpdateProducts = (newList: Product[]) => {
    setProducts(newList);
    localStorage.setItem("wms_products", JSON.stringify(newList));
  };

  // 3. Orders State
  const [orders, setOrders] = useState<CustomerOrder[]>(() => {
    try {
      const saved = localStorage.getItem("wms_orders");
      return saved ? JSON.parse(saved) : [
        {
          id: "ord-8291-TK5",
          orderNo: "TK-20490294-M",
          customerId: "CUST-101",
          customerName: "上海凯信国际贸易商社",
          platform: "TikTok",
          shopName: "凯信海外美妆直营1店",
          shopId: "tk-859403",
          skuId: "SKU-3CE",
          skuName: "3CE 九色眼影盘 #波打大马士革",
          qty: 2,
          price: 89,
          currency: "CNY",
          receiverName: "Somchai Arisara",
          receiverPhone: "081-229-3049",
          receiverAddress: "泰国曼谷市帕克区99号大楼12B室",
          status: "pending_print",
          createdAt: "2026-06-05 12:00:00"
        },
        {
          id: "ord-7489-SP1",
          orderNo: "SP-84950393-X",
          customerId: "CUST-101",
          customerName: "上海凯信国际贸易商社",
          platform: "Shopee",
          shopName: "凯信东南亚特产屋",
          shopId: "sp-748301",
          skuId: "SKU-3CE",
          skuName: "3CE 九色眼影盘 #波打大马士革",
          qty: 1,
          price: 89,
          currency: "CNY",
          receiverName: "Nattapong Som",
          receiverPhone: "099-384-9583",
          receiverAddress: "泰国春武里府芭提雅市海滩路5号公寓",
          status: "printed",
          carrier: "闪送国际速递 (FlashExpress)",
          trackingNo: "FLE-839502941",
          createdAt: "2026-06-05 14:45:00"
        }
      ];
    } catch {
      return [];
    }
  });

  const handleUpdateOrders = (newList: CustomerOrder[]) => {
    setOrders(newList);
    localStorage.setItem("wms_orders", JSON.stringify(newList));
  };

  // Modal States
  const [isEmployeeModalOpen, setIsEmployeeModalOpen] = useState(false);
  const [editingEmployee, setEditingEmployee] = useState<Employee | null>(null);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [deletingEmployee, setDeletingEmployee] = useState<Employee | null>(null);
  const [isSettingsModalOpen, setIsSettingsModalOpen] = useState(false);
  const [isAttAdjustModalOpen, setIsAttAdjustModalOpen] = useState(false);
  const [editingRecord, setEditingRecord] = useState<AttendanceRecord | null>(null);

  // Toast
  const [toasts, setToasts] = useState<{ id: number; msg: string }[]>([]);

  const addToast = (msg: string) => {
    const id = Date.now();
    setToasts(prev => [...prev, { id, msg }]);
    setTimeout(() => {
      setToasts(prev => prev.filter(t => t.id !== id));
    }, 3000);
  };

  // Handlers
  const handleSaveEmployee = (data: Partial<Employee>) => {
    if (editingEmployee) {
      setEmployees(prev => prev.map(e => e.id === editingEmployee.id ? { ...e, ...data } as Employee : e));
      addToast('员工档案已更新');
    } else {
      const newId = Math.max(0, ...employees.map(e => e.id)) + 1;
      setEmployees(prev => [...prev, { ...data, id: newId } as Employee]);
      addToast('新员工已添加成功');
    }
    setIsEmployeeModalOpen(false);
  };

  const handleConfirmDelete = () => {
    if (deletingEmployee) {
      setEmployees(prev => prev.filter(e => e.id !== deletingEmployee.id));
      addToast('员工已删除');
      setIsDeleteModalOpen(false);
      setDeletingEmployee(null);
    }
  };

  const handleSaveRecord = (data: Partial<AttendanceRecord>) => {
    if (editingRecord) {
      if (editingRecord.id.startsWith('new-')) {
        const newRecord: AttendanceRecord = {
          id: `att-${Date.now()}`,
          empId: editingRecord.empId,
          date: editingRecord.date,
          inTime: data.inTime || '08:30',
          outTime: data.outTime || '17:30',
          type: data.type || 'normal',
          note: data.note || ''
        };
        setAttendance(prev => [...prev, newRecord]);
        addToast('新增并调整考勤成功');
      } else {
        setAttendance(prev => prev.map(r => r.id === editingRecord.id ? { ...r, ...data } as AttendanceRecord : r));
        addToast('考勤记录已更新');
      }
    }
    setIsAttAdjustModalOpen(false);
  };

  const pageTitle = useMemo(() => {
    const titles: Record<TabId, string> = {
      dashboard: '数据看板',
      employees: '员工管理',
      attendance: '考勤计算',
      payroll: '薪资核算',
      sop: 'SOP管理',
      goods: '入库管理',
      expenses: '费用核销',
      customers: '客户管理',
      products: '商品管理',
      orders: '订单管理'
    };
    return titles[activeTab];
  }, [activeTab]);

  return (
    <div className="text-slate-700 h-screen flex overflow-hidden font-sans antialiased">
      <Sidebar activeTab={activeTab} onTabChange={setActiveTab} />
      
      <main className="flex-1 flex flex-col min-w-0 overflow-hidden bg-[#f8fafc] relative">
        <Header title={pageTitle} />
        
        <div className="flex-1 overflow-y-auto p-6 scroll-smooth relative">
          <AnimatePresence mode="wait">
            <motion.div
              key={activeTab}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.2 }}
            >
              {activeTab === 'dashboard' && (
                <Dashboard
                  employees={employees}
                  attendance={attendance}
                  config={config}
                  onOpenSettings={() => setIsSettingsModalOpen(true)}
                  onNav={(id) => setActiveTab(id)}
                />
              )}
              {activeTab === 'employees' && (
                <EmployeeList
                  employees={employees}
                  onAddEmployee={() => { setEditingEmployee(null); setIsEmployeeModalOpen(true); }}
                  onEditEmployee={(emp) => { setEditingEmployee(emp); setIsEmployeeModalOpen(true); }}
                  onDeleteEmployee={(emp) => { setDeletingEmployee(emp); setIsDeleteModalOpen(true); }}
                />
              )}
              {activeTab === 'attendance' && (
                <AttendanceTable
                  employees={employees}
                  attendance={attendance}
                  config={config}
                  selectedIds={selectedAttIds}
                  onSelect={(id, checked) => {
                    const next = new Set(selectedAttIds);
                    if (checked) next.add(id); else next.delete(id);
                    setSelectedAttIds(next);
                  }}
                  onSelectAll={(ids) => {
                    setSelectedAttIds(new Set(ids));
                  }}
                  onOpenSettings={() => setIsSettingsModalOpen(true)}
                  onEditRecord={(id, empId, date) => {
                    if (id) {
                      const rec = attendance.find(r => r.id === id);
                      if (rec) {
                        setEditingRecord(rec);
                        setIsAttAdjustModalOpen(true);
                      }
                    } else if (empId && date) {
                      const emp = employees.find(e => e.id === empId);
                      const isLeave = emp?.status === '休假';
                      const newTempRecord: AttendanceRecord = {
                        id: `new-${empId}-${date}`,
                        empId: empId,
                        date: date,
                        inTime: isLeave ? '08:30' : '08:30',
                        outTime: isLeave ? '17:30' : '17:30',
                        type: isLeave ? 'leave' : 'absent',
                        note: ''
                      };
                      setEditingRecord(newTempRecord);
                      setIsAttAdjustModalOpen(true);
                    }
                  }}
                />
              )}
              {activeTab === 'payroll' && (
                <PayrollTable
                  employees={employees}
                  attendance={attendance}
                  config={config}
                />
              )}
              {activeTab === 'sop' && (
                <SopManager
                  employees={employees}
                  addToast={addToast}
                />
              )}
              {activeTab === 'goods' && (
                <GoodsManager
                  employees={employees}
                  goods={goods}
                  onUpdateGoods={setGoods}
                  addToast={addToast}
                />
              )}
              {activeTab === 'expenses' && (
                <ExpenseManager
                  employees={employees}
                  addToast={addToast}
                />
              )}
              {activeTab === 'customers' && (
                <CustomerManager
                  customers={customers}
                  onUpdateCustomers={handleUpdateCustomers}
                  addToast={addToast}
                />
              )}
              {activeTab === 'products' && (
                <ProductManager
                  products={products}
                  onUpdateProducts={handleUpdateProducts}
                  customers={customers}
                  goodsList={goods}
                  addToast={addToast}
                />
              )}
              {activeTab === 'orders' && (
                <OrderManager
                  orders={orders}
                  onUpdateOrders={handleUpdateOrders}
                  products={products}
                  onUpdateProducts={handleUpdateProducts}
                  customers={customers}
                  addToast={addToast}
                />
              )}
            </motion.div>
          </AnimatePresence>
        </div>
      </main>

      {/* Modals */}
      <EmployeeModal
        isOpen={isEmployeeModalOpen}
        onClose={() => setIsEmployeeModalOpen(false)}
        onSave={handleSaveEmployee}
        employee={editingEmployee}
      />
      
      <DeleteModal
        isOpen={isDeleteModalOpen}
        onClose={() => setIsDeleteModalOpen(false)}
        onConfirm={handleConfirmDelete}
        employeeName={deletingEmployee?.name || ""}
      />

      <SettingsModal
        isOpen={isSettingsModalOpen}
        onClose={() => setIsSettingsModalOpen(false)}
        config={config}
        onSave={(cfg) => { setConfig(cfg); setIsSettingsModalOpen(false); addToast('考勤规则已保存'); }}
        onReset={() => { setConfig(INITIAL_CONFIG); addToast('已恢复默认规则'); }}
      />

      <AttendanceAdjustmentModal
        isOpen={isAttAdjustModalOpen}
        onClose={() => setIsAttAdjustModalOpen(false)}
        record={editingRecord}
        onSave={handleSaveRecord}
        employees={employees}
      />

      {/* Toasts */}
      <div className="fixed top-4 right-4 z-[60] flex flex-col gap-2 pointer-events-none">
        <AnimatePresence>
          {toasts.map(t => (
            <motion.div
              key={t.id}
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, scale: 0.9 }}
              className="pointer-events-auto px-4 py-3 rounded-lg shadow-lg text-sm font-medium text-white bg-slate-800 flex items-center gap-2"
            >
              <CheckCircle className="w-4 h-4 text-green-400" /> {t.msg}
            </motion.div>
          ))}
        </AnimatePresence>
      </div>
    </div>
  );
}
