import { ExpenseRecord } from "../types";
import { INITIAL_EXPENSES } from "../constants";

const token = () => localStorage.getItem("wms_admin_token") || "";

const STORAGE_KEY = "wms_expense_records";

export function loadStoredExpenses(): ExpenseRecord[] {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
      const parsed = JSON.parse(saved);
      if (Array.isArray(parsed) && parsed.length > 0) {
        return parsed;
      }
    }
  } catch (e) {
    console.error("Failed to load local expenses", e);
  }
  return INITIAL_EXPENSES;
}

export function saveStoredExpenses(expenses: ExpenseRecord[]): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(expenses));
    window.dispatchEvent(new Event("storage"));
  } catch (e) {
    console.error("Failed to save local expenses", e);
  }
}

export async function fetchExpenseRecords(): Promise<ExpenseRecord[]> {
  try {
    const res = await fetch("/api/v4/admin/expenses", {
      headers: {
        Authorization: `Bearer ${token()}`
      }
    });
    if (res.ok) {
      const data = await res.json();
      if (Array.isArray(data.items)) {
        saveStoredExpenses(data.items);
        return data.items;
      }
    }
  } catch {
    // 降级使用本地存储
  }
  return loadStoredExpenses();
}

export async function approveExpenseRecordApi(
  id: string,
  payload: { status: 'approved' | 'rejected'; approvalNote?: string; approvedBy?: string }
): Promise<void> {
  try {
    await fetch(`/api/v4/admin/expenses/${encodeURIComponent(id)}/approval`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token()}`
      },
      body: JSON.stringify(payload)
    });
  } catch {
    // 忽略网络错误，本地状态优先保证可用
  }
}

export async function deleteExpenseRecordApi(id: string): Promise<void> {
  try {
    await fetch(`/api/v4/admin/expenses/${encodeURIComponent(id)}`, {
      method: "DELETE",
      headers: {
        Authorization: `Bearer ${token()}`
      }
    });
  } catch {
    // 忽略网络错误，本地状态优先保证可用
  }
}
