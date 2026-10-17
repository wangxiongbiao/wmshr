/**
 * 尚未后端化模块的原型数据存储。员工档案已迁移至真实 API，不得在此持久化。
 */

import { 
  AttendanceRecord, AppConfig, GoodsRecord, HolidayRecord, LeaveRequest, AdminUser, Invoice, ExpenseRecord 
} from "../types";
import { INITIAL_CONFIG, INITIAL_ATTENDANCE, INITIAL_GOODS, INITIAL_HOLIDAYS } from "../constants";

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
  LEAVE: "wms_leave_requests"
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

  resetAllDefaults: () => {
    Object.values(STORAGE_KEYS).forEach(k => {
      if (k !== STORAGE_KEYS.USER) localStorage.removeItem(k);
    });
  }
};
