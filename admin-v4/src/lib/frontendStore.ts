/**
 * 尚未后端化模块的原型数据存储。员工档案已迁移至真实 API，不得在此持久化。
 */

import { 
  AttendanceRecord, AppConfig, GoodsRecord, Customer, Product, 
  CustomerOrder, HolidayRecord, LeaveRequest, AdminUser, Invoice, ExpenseRecord 
} from "../types";
import { INITIAL_CONFIG, INITIAL_ATTENDANCE, INITIAL_GOODS, INITIAL_HOLIDAYS } from "../constants";

export const INITIAL_CUSTOMERS: Customer[] = [
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

export const INITIAL_PRODUCTS: Product[] = [
  { id: "SKU-3CE", name: "3CE 九色眼影盘 #波打大马士革", spec: "9色/120g", customerId: "CUST-101", customerName: "上海凯信国际贸易商社", inventory: 25, shelfLocation: "A-02-05", note: "大促热销美妆件，需要气泡纸精细包装", length: 10, width: 10, height: 2, weight: 0.12, volume: 200 },
  { id: "SKU-9色/盒", name: "美妆九色眼影盘", spec: "9色/盒", customerId: "CUST-101", customerName: "上海凯信国际贸易商社", inventory: 15, shelfLocation: "A-02-06", note: "同步WMS入库单所得", length: 12, width: 12, height: 2.2, weight: 0.15, volume: 316.8 },
  { id: "SKU-CAMP-LAMP", name: "GLOW 太阳能多功能营地灯", spec: "双电池/高亮款", customerId: "CUST-102", customerName: "深圳市格朗户外智能装备", inventory: 8, shelfLocation: "B-12-01", note: "带锂电池，必须特殊标危险标签出库", length: 15, width: 15, height: 25, weight: 1.2, volume: 5625 }
];

export const INITIAL_ORDERS: CustomerOrder[] = [
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

export const INITIAL_LEAVE_REQUESTS: LeaveRequest[] = [];

export const DEFAULT_ADMIN_USER: AdminUser = {
  id: "admin-1",
  email: "admin@wmshr.com",
  name: "系统管理员 (Gary)",
  role: "admin",
  country: "TH",
  permissions: ["*"]
};

// 内存与前端本地存储键
const STORAGE_KEYS = {
  USER: "wms_admin_user",
  EMPLOYEES: "wms_employees",
  ATTENDANCE: "wms_attendance",
  GOODS: "wms_goods",
  CONFIG: "wms_config",
  HOLIDAYS: "wms_holidays",
  LEAVE: "wms_leave_requests",
  CUSTOMERS: "wms_customers",
  PRODUCTS: "wms_products",
  ORDERS: "wms_orders"
} as const;

function loadFromStorage<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return fallback;
    return JSON.parse(raw);
  } catch {
    return fallback;
  }
}

function saveToStorage<T>(key: string, data: T): void {
  try {
    localStorage.setItem(key, JSON.stringify(data));
  } catch (err) {
    console.warn(`[frontendStore] Failed to persist key ${key}:`, err);
  }
}

export const frontendStore = {
  getAdminUser: () => {
    const user = loadFromStorage<AdminUser | null>(STORAGE_KEYS.USER, null);
    if (!user) {
      return null;
    }
    if (!user.permissions || user.permissions.length === 0) {
      return { ...user, permissions: ["*"] };
    }
    return user;
  },
  setAdminUser: (user: AdminUser | null) => {
    if (user) saveToStorage(STORAGE_KEYS.USER, user);
    else localStorage.removeItem(STORAGE_KEYS.USER);
  },

  getAttendance: () => loadFromStorage<AttendanceRecord[]>(STORAGE_KEYS.ATTENDANCE, INITIAL_ATTENDANCE),
  saveAttendance: (list: AttendanceRecord[]) => saveToStorage(STORAGE_KEYS.ATTENDANCE, list),

  getGoods: () => loadFromStorage<GoodsRecord[]>(STORAGE_KEYS.GOODS, INITIAL_GOODS),
  saveGoods: (list: GoodsRecord[]) => saveToStorage(STORAGE_KEYS.GOODS, list),

  getConfig: () => loadFromStorage<AppConfig>(STORAGE_KEYS.CONFIG, INITIAL_CONFIG),
  saveConfig: (cfg: AppConfig) => saveToStorage(STORAGE_KEYS.CONFIG, cfg),

  getHolidays: () => loadFromStorage<HolidayRecord[]>(STORAGE_KEYS.HOLIDAYS, INITIAL_HOLIDAYS),
  saveHolidays: (list: HolidayRecord[]) => saveToStorage(STORAGE_KEYS.HOLIDAYS, list),

  getLeaveRequests: () => {
    const list = loadFromStorage<LeaveRequest[]>(STORAGE_KEYS.LEAVE, INITIAL_LEAVE_REQUESTS);
    const cleaned = list.filter(l => {
      if (l.id === "leave-1" || l.id === "leave-2") return false;
      if (typeof l.reason === "string" && (l.reason.includes("家里有些急事") || l.reason.includes("身体不适发烧"))) return false;
      return true;
    });
    if (cleaned.length !== list.length) {
      saveToStorage(STORAGE_KEYS.LEAVE, cleaned);
    }
    return cleaned;
  },
  clearLeaveRequests: () => saveToStorage(STORAGE_KEYS.LEAVE, []),
  saveLeaveRequests: (list: LeaveRequest[]) => saveToStorage(STORAGE_KEYS.LEAVE, list),

  getCustomers: () => loadFromStorage<Customer[]>(STORAGE_KEYS.CUSTOMERS, INITIAL_CUSTOMERS),
  saveCustomers: (list: Customer[]) => saveToStorage(STORAGE_KEYS.CUSTOMERS, list),

  getProducts: () => loadFromStorage<Product[]>(STORAGE_KEYS.PRODUCTS, INITIAL_PRODUCTS),
  saveProducts: (list: Product[]) => saveToStorage(STORAGE_KEYS.PRODUCTS, list),

  getOrders: () => loadFromStorage<CustomerOrder[]>(STORAGE_KEYS.ORDERS, INITIAL_ORDERS),
  saveOrders: (list: CustomerOrder[]) => saveToStorage(STORAGE_KEYS.ORDERS, list),

  resetAllDefaults: () => {
    Object.values(STORAGE_KEYS).forEach(k => {
      if (k !== STORAGE_KEYS.USER) localStorage.removeItem(k);
    });
  }
};
