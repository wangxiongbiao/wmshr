/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from "react";
import { Copy, Check, RefreshCw, Loader2 } from "lucide-react";
import { Employee } from "../../../types";
import { Language } from "../../../lib/i18n";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "../../ui/dialog";
import { Button } from "../../ui/button";

export interface EmployeeCredentialsModalProps {
  employee: Employee | null;
  isOpen: boolean;
  onClose: () => void;
  onUpdateEmployeePassword?: (empId: number, newPass: string) => Promise<void> | void;
  lang?: Language;
}

export function EmployeeCredentialsModal({
  employee,
  isOpen,
  onClose,
  onUpdateEmployeePassword,
  lang = "zh-CN",
}: EmployeeCredentialsModalProps) {
  const [copiedField, setCopiedField] = useState<"username" | null>(null);
  const [recentlyResetInfo, setRecentlyResetInfo] = useState<{ empId: number; newPass: string } | null>(null);
  const [copiedPass, setCopiedPass] = useState(false);
  const [isResettingPassword, setIsResettingPassword] = useState(false);

  const copyToClipboard = async (text: string, field: "username") => {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedField(field);
      setTimeout(() => setCopiedField(null), 2000);
    } catch {
      const textarea = document.createElement("textarea");
      textarea.value = text;
      document.body.appendChild(textarea);
      textarea.select();
      try {
        document.execCommand("copy");
        setCopiedField(field);
        setTimeout(() => setCopiedField(null), 2000);
      } catch (e) {
        console.error(e);
      }
      document.body.removeChild(textarea);
    }
  };

  const handleClose = () => {
    if (!isResettingPassword) {
      setRecentlyResetInfo(null);
      setCopiedPass(false);
      onClose();
    }
  };

  if (!employee) return null;

  return (
    <Dialog
      open={isOpen}
      onOpenChange={(open) => {
        if (!open) handleClose();
      }}
    >
      <DialogContent className="max-w-lg p-6 sm:rounded-2xl">
        <DialogHeader>
          <DialogTitle className="text-xl font-bold text-slate-800 tracking-tight">
            {lang === "en" ? "App Access Credentials" : lang === "th" ? "จัดการบัญชีเข้าสู่ระบบแอป" : lang === "zh-TW" ? "APP 帳號管理" : "APP 账号管理"}
          </DialogTitle>
          <DialogDescription className="text-sm text-slate-500 font-bold">
            {lang === "en" ? "Employee: " : lang === "th" ? "พนักงาน: " : "员工："}{employee.name}
          </DialogDescription>
        </DialogHeader>

        {/* Account credentials */}
        <div className="space-y-4">
          {/* Username field */}
          <div className="bg-slate-50/80 rounded-2xl p-4 border border-slate-100 space-y-2">
            <div className="flex justify-between items-center text-xs font-bold text-slate-400 uppercase tracking-wide">
              <span>{lang === "en" ? "App Login Username" : lang === "th" ? "ชื่อบัญชีเข้าสู่ระบบแอป" : lang === "zh-TW" ? "APP 登錄帳號" : "APP 登录账号"}</span>
              {copiedField === "username" && (
                <span className="text-emerald-600 font-bold flex items-center gap-1.5 text-xs">
                  <Check className="w-3.5 h-3.5" /> {lang === "en" ? "Copied" : lang === "th" ? "คัดลอกแล้ว" : "已复制"}
                </span>
              )}
            </div>
            <div className="flex items-center justify-between gap-3 mt-1.5">
              <span className="font-mono text-base md:text-lg font-black text-brand-700 select-all tracking-wide bg-brand-50/70 px-4 py-1.5 rounded-xl border border-brand-100">
                {employee.username || `emp${employee.id}`}
              </span>
              <Button
                type="button"
                variant="ghost"
                size="icon"
                onClick={() => copyToClipboard(employee.username || `emp${employee.id}`, "username")}
                className="h-8 w-8 hover:bg-slate-200/60 text-slate-500 hover:text-slate-700 rounded-xl transition cursor-pointer bg-white border border-slate-200 shadow-xs p-0"
                title={lang === "en" ? "Copy Username" : lang === "th" ? "คัดลอกชื่อผู้ใช้" : "复制账号"}
              >
                <Copy className="w-4 h-4" />
              </Button>
            </div>
          </div>

          {/* Newly generated password box */}
          {recentlyResetInfo && recentlyResetInfo.empId === employee.id ? (
            <div className="bg-emerald-50 border border-emerald-200 rounded-2xl p-4 space-y-3 animate-in fade-in zoom-in-95">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-emerald-800 uppercase tracking-wide flex items-center gap-1.5">
                  <Check className="w-4 h-4 text-emerald-600" />
                  {lang === "en" ? "New Password Generated" : lang === "th" ? "สร้างรหัสผ่านใหม่เรียบร้อยแล้ว" : lang === "zh-TW" ? "新密碼已成功生成" : "新密码已成功生成"}
                </span>
                <span className="text-[10px] font-bold bg-emerald-200/70 text-emerald-900 px-2 py-0.5 rounded-full">
                  {lang === "en" ? "One-time view" : lang === "th" ? "แสดงครั้งเดียว" : "仅此一次显示"}
                </span>
              </div>
              <div className="flex items-center justify-between gap-3 bg-white p-3 rounded-xl border border-emerald-200">
                <span className="font-mono text-lg font-black text-emerald-800 select-all tracking-wider">
                  {recentlyResetInfo.newPass}
                </span>
                <Button
                  type="button"
                  variant="default"
                  size="sm"
                  onClick={async () => {
                    try {
                      await navigator.clipboard.writeText(recentlyResetInfo.newPass);
                      setCopiedPass(true);
                      setTimeout(() => setCopiedPass(false), 2000);
                    } catch {}
                  }}
                  className="px-3.5 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-bold flex items-center gap-1.5 transition cursor-pointer shadow-xs h-7"
                >
                  {copiedPass ? (
                    <>
                      <Check className="w-3.5 h-3.5" />
                      {lang === "en" ? "Copied" : lang === "th" ? "คัดลอกแล้ว" : "已复制"}
                    </>
                  ) : (
                    <>
                      <Copy className="w-3.5 h-3.5" />
                      {lang === "en" ? "Copy Password" : lang === "th" ? "คัดลอกรหัส" : "复制密码"}
                    </>
                  )}
                </Button>
              </div>
              <p className="text-[11px] text-emerald-700 font-medium leading-relaxed">
                {lang === "en"
                  ? "Please copy and securely deliver this password to the employee now. It is encrypted in the database and will not be displayed again after closing."
                  : lang === "th"
                    ? "กรุณาคัดลอกและส่งมอบรหัสผ่านให้พนักงานทันที ระบบจะไม่แสดงรหัสนี้อีกหลังปิดหน้าต่าง"
                    : "请立即复制并将新密码安全交付给员工。密码已哈希加密存储，关闭弹窗后无法再次查阅。"}
              </p>
            </div>
          ) : (
            <p className="rounded-2xl border border-slate-100 bg-slate-50/80 p-4 text-xs font-medium text-slate-500">
              {lang === "en"
                ? "Existing passwords are not stored in plain text and cannot be viewed. Click below to generate a one-time secure password when needed."
                : lang === "th"
                  ? "ระบบไม่จัดเก็บรหัสผ่านเดิมเป็นข้อความธรรมดา กดปุ่มด้านล่างเพื่อสร้างรหัสผ่านใหม่แบบครั้งเดียวเมื่อต้องการ"
                  : "系统不保存或展示现有密码。需要时请生成一次性安全新密码。"}
            </p>
          )}
        </div>

        {/* Actions */}
        <div className="space-y-2.5 pt-1">
          <Button
            type="button"
            disabled={isResettingPassword}
            onClick={async () => {
              if (isResettingPassword || !employee) return;
              const bytes = crypto.getRandomValues(new Uint8Array(8));
              const newPass = `Aa1${Array.from(bytes, byte => (byte % 36).toString(36)).join("")}`;
              try {
                setIsResettingPassword(true);
                if (onUpdateEmployeePassword) {
                  await onUpdateEmployeePassword(employee.id, newPass);
                }
                setRecentlyResetInfo({ empId: employee.id, newPass });
                setCopiedPass(false);
              } catch (err) {
                console.error("Failed to reset password:", err);
              } finally {
                setIsResettingPassword(false);
              }
            }}
            className="w-full py-2.5 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white font-bold rounded-xl text-sm flex items-center justify-center gap-2 shadow-md"
          >
            {isResettingPassword ? <Loader2 className="w-4 h-4 animate-spin" /> : <RefreshCw className="w-4 h-4" />}
            {isResettingPassword
              ? (lang === "en" ? "Resetting..." : lang === "th" ? "กำลังรีเซ็ต..." : lang === "zh-TW" ? "重置中..." : "重置中...")
              : (lang === "en" ? "Generate New Secure Password" : lang === "th" ? "สร้างรหัสผ่านใหม่ที่ปลอดภัย" : lang === "zh-TW" ? "重置並生成安全新密碼" : "重置并生成安全新密码")}
          </Button>
          <p className="text-xs text-slate-400 font-medium text-center leading-relaxed">
            {lang === "en"
              ? "Resetting will immediately invalidate the old password."
              : lang === "th"
                ? "การรีเซ็ตจะทำให้รหัสผ่านเดิมใช้การไม่ได้ทันที"
                : "重置后旧密码将立即失效，现有密码无法直接查看。"}
          </p>
        </div>

        <DialogFooter className="border-t border-slate-100 pt-3">
          <Button
            variant="outline"
            disabled={isResettingPassword}
            onClick={handleClose}
            className="px-6 rounded-xl text-xs font-bold text-slate-600"
          >
            {lang === "en" ? "Close" : lang === "th" ? "ปิด" : "关闭"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
