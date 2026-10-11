/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from "react";
import { AlertCircle, CheckCircle2, ArrowRight, History, Sparkles, Clock, Calendar, FileText, Loader2 } from "lucide-react";
import { Language, getTranslation } from "../../../lib/i18n";
import { cn, formatDate, getNowDateStr } from "../../../lib/utils";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "../../ui/dialog";
import { Button } from "../../ui/button";
import { Input } from "../../ui/input";
import { Label } from "../../ui/label";
import { Badge } from "../../ui/badge";
import { DatePicker } from "../../ui/date-picker";

export interface SalaryDiffItem {
  field: string;
  label: string;
  from: any;
  to: any;
}

export function SalaryChangeConfirmModal({
  isOpen,
  onClose,
  onConfirm,
  diffs,
  employeeName,
  employeeJoinDate,
  isFixedSalary = false,
  isRehiring = false,
  isSubmitting = false,
  lang = "zh-CN"
}: {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (data: { changeReason: string; effectiveDate: string }) => void;
  diffs: SalaryDiffItem[];
  employeeName: string;
  employeeJoinDate?: string;
  isFixedSalary?: boolean;
  isRehiring?: boolean;
  isSubmitting?: boolean;
  lang?: Language;
}) {
  const [changeReason, setChangeReason] = useState("");
  const [effectiveDate, setEffectiveDate] = useState("");
  const [dateError, setDateError] = useState("");

  // 计算方案 B 的标准 1 号选项（本月 1 号与次月 1 号）
  const { currentMonthFirst, nextMonthFirst } = React.useMemo(() => {
    const now = new Date();
    const y = now.getFullYear();
    const m = now.getMonth(); // 0-based
    const curFirst = `${y}-${String(m + 1).padStart(2, "0")}-01`;
    const nextDate = new Date(y, m + 1, 1);
    const nxtFirst = `${nextDate.getFullYear()}-${String(nextDate.getMonth() + 1).padStart(2, "0")}-01`;
    return { currentMonthFirst: curFirst, nextMonthFirst: nxtFirst };
  }, []);

  useEffect(() => {
    if (isOpen) {
      setChangeReason(isRehiring ? (lang === "en" ? "Rehired & Set Wage" : "复职重新定薪") : "");
      setDateError("");
      // 固定月薪模式下，默认推荐次月 1 号生效（下期发薪执行）；若入职当月则推荐当月 1 号
      if (isFixedSalary) {
        setEffectiveDate(nextMonthFirst);
      } else {
        setEffectiveDate(getNowDateStr());
      }
    }
  }, [isOpen, isFixedSalary, isRehiring, lang, nextMonthFirst]);

  const presetReasons = isRehiring ? [
    lang === "en" ? "Rehired & Set Wage" : lang === "th" ? "รับกลับเข้าทำงาน" : lang === "zh-TW" ? "復職重新定薪" : "复职重新定薪",
    lang === "en" ? "Probation Pass" : lang === "th" ? "ผ่านทดลองงาน" : lang === "zh-TW" ? "轉正定薪" : "转正定薪",
    lang === "en" ? "Job Transfer" : lang === "th" ? "ย้ายแผนก" : lang === "zh-TW" ? "崗位調整" : "岗位调整"
  ] : [
    lang === "en" ? "Promotion" : lang === "th" ? "เลื่อนตำแหน่ง" : lang === "zh-TW" ? "職務晉升" : "职务晋升",
    lang === "en" ? "Probation Pass" : lang === "th" ? "ผ่านทดลองงาน" : lang === "zh-TW" ? "轉正定薪" : "转正定薪",
    lang === "en" ? "Annual Review" : lang === "th" ? "ปรับประจำปี" : lang === "zh-TW" ? "年度調薪" : "年度调薪",
    lang === "en" ? "Job Transfer" : lang === "th" ? "ย้ายแผนก" : lang === "zh-TW" ? "崗位調整" : "岗位调整",
    lang === "en" ? "Tax / Rule Change" : lang === "th" ? "ปรับเกณฑ์ภาษี" : lang === "zh-TW" ? "稅率規則變更" : "税率规则变更"
  ];

  const handleValidateAndConfirm = () => {
    setDateError("");
    const selected = effectiveDate.trim();
    if (!selected) {
      setDateError(lang === "en" ? "Please select an effective date" : "请选择生效日期");
      return;
    }

    // 校验不能早于员工入职所属自然月
    if (employeeJoinDate) {
      const joinMonthFirst = `${employeeJoinDate.slice(0, 7)}-01`;
      if (selected < joinMonthFirst) {
        const msg = getTranslation("modal_salary_err_join_date", lang).replace("{date}", employeeJoinDate);
        setDateError(msg);
        return;
      }
    }

    // 固定月薪校验必须是 1 号
    if (isFixedSalary && !selected.endsWith("-01")) {
      setDateError(lang === "en" ? "Fixed monthly wage effective date must be the 1st of the month" : "固定月薪生效日期必须为每月 1 号（整月核算）");
      return;
    }

    onConfirm({ changeReason, effectiveDate: selected });
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => { if (!open && !isSubmitting) onClose(); }}>
      <DialogContent className="max-w-md p-0 flex flex-col sm:rounded-2xl overflow-hidden border border-slate-200/90 shadow-2xl bg-white">
        {/* Header: 标准专业品牌蓝渐变 Header */}
        <DialogHeader className="bg-gradient-to-r from-brand-600 via-indigo-600 to-indigo-700 text-white px-6 py-5 flex flex-row items-center gap-3.5 space-y-0">
          <div className="w-10 h-10 rounded-xl bg-white/15 border border-white/20 backdrop-blur-md flex items-center justify-center shrink-0 shadow-xs">
            <Sparkles className="w-5 h-5 text-amber-300" />
          </div>
          <div className="flex-1 min-w-0">
            <DialogTitle className="font-extrabold text-base text-white tracking-tight flex items-center gap-2">
              <span>{getTranslation("modal_salary_change_confirm_title", lang)}</span>
            </DialogTitle>
            <DialogDescription className="text-xs text-blue-100/90 mt-0.5 truncate">
              {employeeName ? `员工：${employeeName}` : getTranslation("modal_salary_change_confirm_desc", lang)}
            </DialogDescription>
          </div>
        </DialogHeader>

        {/* Body */}
        <div className="p-6 space-y-5 max-h-[72vh] overflow-y-auto">
          {/* 1. 变动明细卡片 */}
          <div className="space-y-2.5">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                <span className="w-1.5 h-1.5 rounded-full bg-brand-500"></span>
                {lang === "en" ? "Changes Overview" : "薪酬规则变动对比"}
              </span>
              <span className="text-[11px] font-semibold text-brand-700 bg-brand-50 px-2 py-0.5 rounded-full border border-brand-100">
                共 {diffs.length} 项变动
              </span>
            </div>

            <div className="bg-slate-50/70 border border-slate-200/80 rounded-xl divide-y divide-slate-100 overflow-hidden shadow-2xs">
              {diffs.map((diff, i) => {
                const isNumeric = typeof diff.from === "number" || typeof diff.to === "number";
                let deltaText = "";
                let isIncrease = false;
                if (isNumeric) {
                  const fromNum = Number(diff.from || 0);
                  const toNum = Number(diff.to || 0);
                  const delta = Math.round((toNum - fromNum) * 100) / 100;
                  if (delta > 0) {
                    deltaText = `+${delta.toLocaleString()}`;
                    isIncrease = true;
                  } else if (delta < 0) {
                    deltaText = `${delta.toLocaleString()}`;
                    isIncrease = false;
                  }
                }

                return (
                  <div key={i} className="p-3 flex items-center justify-between text-xs gap-3">
                    <div className="flex items-center gap-1.5 min-w-28 text-slate-700 font-semibold">
                      <FileText className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                      <span>{diff.label || diff.field}</span>
                    </div>

                    <div className="flex items-center gap-2 font-mono tabular-nums">
                      <span className="line-through text-slate-400 bg-white px-2 py-0.5 rounded-md border border-slate-200/90 text-[11px]">
                        {diff.from === null || diff.from === undefined ? "未设置" : String(diff.from)}
                      </span>
                      <ArrowRight className="w-3.5 h-3.5 text-slate-300 shrink-0" />
                      <span className="font-bold text-brand-700 bg-brand-50 px-2 py-0.5 rounded-md border border-brand-200 text-[11px]">
                        {diff.to === null || diff.to === undefined ? "清空/跟随默认" : String(diff.to)}
                      </span>
                      {deltaText && (
                        <span className={cn(
                          "text-[10px] font-bold px-1.5 py-0.5 rounded-md",
                          isIncrease ? "bg-emerald-50 text-emerald-700 border border-emerald-200" : "bg-rose-50 text-rose-700 border border-rose-200"
                        )}>
                          {deltaText}
                        </span>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* 2. 本次调整原因输入 */}
          <div className="space-y-2">
            <Label className="block text-xs font-bold text-slate-700">
              {getTranslation("modal_salary_change_reason", lang)}
            </Label>
            <Input
              type="text"
              autoFocus
              value={changeReason}
              onChange={(e) => setChangeReason(e.target.value)}
              placeholder={getTranslation("modal_salary_change_reason_placeholder", lang)}
              className="bg-white text-xs text-slate-800 font-medium h-9 border-slate-200 focus:border-brand-500 focus:ring-brand-500"
            />
            {/* 快捷推荐原因标签 */}
            <div className="flex flex-wrap gap-1.5 pt-0.5">
              {presetReasons.map((tag) => {
                const isSelected = changeReason === tag;
                return (
                  <button
                    key={tag}
                    type="button"
                    onClick={() => setChangeReason(tag)}
                    className={cn(
                      "px-2.5 py-1 text-[11px] rounded-lg border transition-all cursor-pointer font-medium",
                      isSelected
                        ? "bg-brand-50 text-brand-700 border-brand-300 font-bold shadow-2xs"
                        : "bg-white text-slate-600 border-slate-200 hover:border-brand-200 hover:bg-slate-50"
                    )}
                  >
                    {tag}
                  </button>
                );
              })}
            </div>
          </div>

          {/* 3. 薪酬生效日期（方案 B：月薪锁定每月 1 号） */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label className="block text-xs font-bold text-slate-700">
                {getTranslation("modal_salary_effective_date", lang)}
              </Label>
              <span className="text-[10px] text-slate-400 font-normal">
                {isFixedSalary 
                  ? getTranslation("modal_salary_effective_mode_monthly", lang)
                  : getTranslation("modal_salary_effective_mode_hourly", lang)}
              </span>
            </div>

            {isFixedSalary ? (
              <div className="space-y-2">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => { setEffectiveDate(nextMonthFirst); setDateError(""); }}
                    className={cn(
                      "p-3 rounded-xl border text-left transition-all cursor-pointer",
                      effectiveDate === nextMonthFirst
                        ? "bg-brand-50/80 border-brand-500 ring-2 ring-brand-500/20 shadow-xs"
                        : "bg-white hover:bg-slate-50 border-slate-200"
                    )}
                  >
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-xs font-bold text-brand-900 font-mono">{nextMonthFirst}</span>
                      <span className="text-[10px] bg-brand-100 text-brand-800 font-semibold px-1.5 py-0.5 rounded">推荐</span>
                    </div>
                    <p className="text-[11px] text-slate-500 leading-snug">
                      {getTranslation("modal_salary_opt_next_month", lang)}
                    </p>
                  </button>

                  <button
                    type="button"
                    onClick={() => { setEffectiveDate(currentMonthFirst); setDateError(""); }}
                    className={cn(
                      "p-3 rounded-xl border text-left transition-all cursor-pointer",
                      effectiveDate === currentMonthFirst
                        ? "bg-brand-50/80 border-brand-500 ring-2 ring-brand-500/20 shadow-xs"
                        : "bg-white hover:bg-slate-50 border-slate-200"
                    )}
                  >
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-xs font-bold text-slate-800 font-mono">{currentMonthFirst}</span>
                      <span className="text-[10px] bg-slate-100 text-slate-600 font-medium px-1.5 py-0.5 rounded">追溯</span>
                    </div>
                    <p className="text-[11px] text-slate-500 leading-snug">
                      {getTranslation("modal_salary_opt_current_month", lang)}
                    </p>
                  </button>
                </div>

                <div className="pt-1">
                  <span className="text-[11px] text-slate-400 block mb-1">或选择其他月份 1 号：</span>
                  <DatePicker
                    name="effectiveDate"
                    value={effectiveDate}
                    onChange={(e) => { setEffectiveDate(e.target.value); setDateError(""); }}
                    className="bg-white font-medium text-slate-700 text-xs"
                    placeholder="请选择生效月份 1 号 (YYYY-MM-01)"
                  />
                </div>
              </div>
            ) : (
              <DatePicker
                name="effectiveDate"
                value={effectiveDate}
                onChange={(e) => { setEffectiveDate(e.target.value); setDateError(""); }}
                className="bg-white font-medium text-slate-700 text-xs"
                placeholder={lang === "en" ? "Select effective date" : "选择生效日期"}
              />
            )}

            {dateError && (
              <p className="text-[11px] font-semibold text-rose-600 bg-rose-50 border border-rose-200 px-2.5 py-1.5 rounded-lg animate-fade-in flex items-center gap-1.5">
                <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                <span>{dateError}</span>
              </p>
            )}
          </div>
        </div>

        {/* Footer */}
        <DialogFooter className="bg-slate-50 px-6 py-4 border-t border-slate-100 flex flex-row justify-end items-center gap-2.5">
          <Button
            type="button"
            variant="outline"
            disabled={isSubmitting}
            onClick={onClose}
            className="text-xs h-9 px-4 rounded-xl font-medium border-slate-200 text-slate-600 hover:bg-slate-100"
          >
            {getTranslation("modal_salary_btn_back", lang)}
          </Button>
          <Button
            type="button"
            disabled={isSubmitting}
            onClick={handleValidateAndConfirm}
            className="bg-brand-600 hover:bg-brand-700 text-white font-bold text-xs h-9 px-5 rounded-xl shadow-xs flex items-center gap-1.5 cursor-pointer"
          >
            {isSubmitting ? (
              <>
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                <span>保存中...</span>
              </>
            ) : (
              <>
                <CheckCircle2 className="w-3.5 h-3.5" />
                <span>{getTranslation("modal_salary_btn_confirm", lang)}</span>
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

