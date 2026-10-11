import { CustomerSurcharge, ExpressImportLog } from "../types";
import { DEFAULT_SURCHARGES } from "../constants";

const STORAGE_KEY = "wms_express_surcharges";
const INITED_KEY = "wms_express_surcharges_inited";

function getToken(): string {
  try {
    return localStorage.getItem("wms_admin_token") || "";
  } catch {
    return "";
  }
}

/**
 * 从后端加载操作费配置，失败时平滑降级到 localStorage
 * 允许返回空对象 {}（当用户删光所有规则时）
 */
export async function loadExpressSurcharges(): Promise<Record<string, CustomerSurcharge>> {
  const token = getToken();

  if (token) {
    try {
      const res = await fetch("/api/v4/resources/express-surcharges", {
        headers: {
          Authorization: `Bearer ${token}`
        }
      });
      if (res.ok) {
        const json = await res.json();
        const data = json.data !== undefined ? json.data : json;
        if (data && typeof data === "object") {
          // 只要后端返回了合法的对象（即使是空对象 {}），都以服务端为准
          try {
            localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
            localStorage.setItem(INITED_KEY, "true");
          } catch {}
          return data;
        }
      }
    } catch (e) {
      console.warn("远程获取快递操作费失败，降级读取本地缓存:", e);
    }
  }

  // Fallback 到 localStorage
  try {
    const hasInited = localStorage.getItem(INITED_KEY);
    const saved = localStorage.getItem(STORAGE_KEY);
    if (hasInited && saved !== null) {
      const parsed = JSON.parse(saved);
      if (parsed && typeof parsed === "object") {
        return parsed;
      }
    }
  } catch (e) {
    console.error("读取本地快递操作费失败:", e);
  }

  // 无任何配置时，返回空对象 {}，绝不注入假数据
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({}));
    localStorage.setItem(INITED_KEY, "true");
  } catch {}

  return {};
}

/**
 * 保存操作费配置，同时持久化到后端并同步更新本地缓存
 */
export async function saveExpressSurcharges(
  surcharges: Record<string, CustomerSurcharge>
): Promise<void> {
  const safeSurcharges = surcharges || {};

  // 1. 本地即时保存
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(safeSurcharges));
    localStorage.setItem(INITED_KEY, "true");
  } catch (e) {
    console.error("本地保存快递操作费失败:", e);
  }

  // 2. 异步持久化到后端
  const token = getToken();
  if (token) {
    try {
      await fetch("/api/v4/resources/express-surcharges", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({ surcharges: safeSurcharges })
      });
    } catch (e) {
      console.warn("同步快递操作费到服务端失败:", e);
    }
  }
}

/**
 * 从后端获取快递导入历史记录
 */
export async function fetchImportLogs(): Promise<ExpressImportLog[]> {
  const token = getToken();

  try {
    const headers: Record<string, string> = {};
    if (token) headers.Authorization = `Bearer ${token}`;

    const res = await fetch("/api/v4/resources/express-import-logs", { headers });
    if (res.ok) {
      const json = await res.json();
      const list = json.data !== undefined ? json.data : json;
      return Array.isArray(list) ? list : [];
    }
  } catch (e) {
    console.warn("加载服务端快递导入记录失败:", e);
  }
  return [];
}

/**
 * 上报新增快递导入历史记录到后端
 */
export async function createImportLog(
  log: Omit<ExpressImportLog, "id" | "createdAt"> & { id?: string; createdAt?: string }
): Promise<ExpressImportLog | null> {
  const token = getToken();

  try {
    const headers: Record<string, string> = { "Content-Type": "application/json" };
    if (token) headers.Authorization = `Bearer ${token}`;

    const res = await fetch("/api/v4/resources/express-import-logs", {
      method: "POST",
      headers,
      body: JSON.stringify(log)
    });
    if (res.ok) {
      const json = await res.json();
      return json.data || json;
    }
  } catch (e) {
    console.warn("保存快递导入记录到服务端失败:", e);
  }
  return null;
}

/**
 * 删除指定的快递导入记录（id 为 "clear-all" 时清空全部）
 */
export async function removeImportLog(id: string): Promise<boolean> {
  const token = getToken();

  try {
    const headers: Record<string, string> = {};
    if (token) headers.Authorization = `Bearer ${token}`;

    const res = await fetch(`/api/v4/resources/express-import-logs/${encodeURIComponent(id)}`, {
      method: "DELETE",
      headers
    });
    return res.ok;
  } catch (e) {
    console.warn("删除快递导入记录失败:", e);
  }
  return false;
}

