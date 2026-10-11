/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from "react";
import { Calendar, Trash2, Trash, Loader2 } from "lucide-react";
import { HolidayRecord } from "../../../types";
import { Language } from "../../../lib/i18n";
import { INITIAL_HOLIDAYS } from "../../../constants";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "../../ui/dialog";
import { Button } from "../../ui/button";
import { Input } from "../../ui/input";
import { Label } from "../../ui/label";
import { DatePicker } from "../../ui/date-picker";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "../../ui/select";

export interface HolidaySettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  holidays: HolidayRecord[];
  onUpdateHolidays: (list: HolidayRecord[]) => Promise<void> | void;
  lang?: Language;
}

const PRESET_COUNTRIES = [
  { code: "CN", name: "🇨🇳 中国 (CN)" },
  { code: "TH", name: "🇹🇭 泰国 (TH)" },
  { code: "MY", name: "🇲🇾 马来西亚 (MY)" },
  { code: "ID", name: "🇮🇩 印尼 (ID)" },
  { code: "SG", name: "🇸🇬 新加坡 (SG)" },
  { code: "PH", name: "🇵🇭 菲律宾 (PH)" },
  { code: "KR", name: "🇰🇷 韩国 (KR)" },
  { code: "JP", name: "🇯🇵 日本 (JP)" },
  { code: "BN", name: "🇧🇳 文莱 (BN)" },
  { code: "MM", name: "🇲🇲 缅甸 (MM)" },
  { code: "VN", name: "🇻🇳 越南 (VN)" },
  { code: "KH", name: "🇰🇭 柬埔寨 (KH)" },
];

export function HolidaySettingsModal({
  isOpen,
  onClose,
  holidays,
  onUpdateHolidays,
}: HolidaySettingsModalProps) {
  const [newHolidayDate, setNewHolidayDate] = useState("");
  const [newHolidayName, setNewHolidayName] = useState("");
  const [newHolidayCountry, setNewHolidayCountry] = useState("CN");
  const [showClearConfirm, setShowClearConfirm] = useState(false);
  const [isUpdatingHoliday, setIsUpdatingHoliday] = useState(false);

  const handleSafeUpdateHolidays = async (newList: HolidayRecord[]) => {
    if (isUpdatingHoliday) return;
    setIsUpdatingHoliday(true);
    try {
      await onUpdateHolidays(newList);
    } finally {
      setIsUpdatingHoliday(false);
    }
  };

  const getCountryLabel = (code: string) => {
    switch (code) {
      case "CN": return "🇨🇳 中国";
      case "TH": return "🇹🇭 泰国";
      case "MY": return "🇲🇾 马来西亚";
      case "ID": return "🇮🇩 印尼";
      case "SG": return "🇸🇬 新加坡";
      case "PH": return "🇵🇭 菲律宾";
      case "KR": return "🇰🇷 韩国";
      case "JP": return "🇯🇵 日本";
      case "BN": return "🇧🇳 文莱";
      case "MM": return "🇲🇲 缅甸";
      case "VN": return "🇻🇳 越南";
      case "KH": return "🇰🇭 柬埔寨";
      default: return "⚙️ 自定义";
    }
  };

  return (
    <Dialog
      open={isOpen}
      onOpenChange={(open) => {
        if (!open) {
          if (isUpdatingHoliday) return;
          onClose();
        }
      }}
    >
      <DialogContent className="max-w-2xl max-h-[90vh] p-0 flex flex-col sm:rounded-2xl overflow-hidden">
        <DialogHeader className="bg-gradient-to-r from-blue-600 to-blue-700 text-white px-6 py-4.5 flex flex-row justify-between items-center space-y-0">
          <DialogTitle className="font-bold text-base text-white flex items-center gap-2 tracking-tight">
            <Calendar className="w-5 h-5 text-blue-100" />
            假期设置
          </DialogTitle>
        </DialogHeader>

        {/* Modal Body */}
        <div className="p-6 overflow-y-auto space-y-5 flex-1 scrollbar-thin">
          <div className="bg-brand-50/40 rounded-xl p-4 border border-brand-100/60 text-xs text-brand-900 leading-relaxed space-y-1">
            <p className="font-bold">⚠️ 加班费计算规则说明：</p>
            <p>1. 在此列表中保存的日期，将被系统判定为<b>「法定节假日」</b>，加班费用按基准时薪的 <b>3.0 倍</b> 计算。</p>
            <p>2. 周六、周日（非节假日）将被自动识别为<b>「周末加班」</b>，加班费用按 <b>2.0 倍</b> 计算。</p>
            <p>3. 普通工作日的加班费用按 <b>1.5 倍</b> 计算。</p>
          </div>

          {/* 快速导入功能 */}
          <div className="space-y-2">
            <span className="text-xs font-bold text-slate-700 uppercase tracking-wide block">💡 快速导入 2026 预设法定节假日：</span>
            <div className="flex flex-wrap gap-2">
              {PRESET_COUNTRIES.map((cty) => (
                <Button
                  key={cty.code}
                  type="button"
                  variant="outline"
                  size="sm"
                  disabled={isUpdatingHoliday}
                  onClick={() => {
                    const toImport = INITIAL_HOLIDAYS.filter(h => h.country === cty.code);
                    const merged = [...holidays];
                    toImport.forEach(item => { if (!merged.some(m => m.date === item.date)) merged.push(item); });
                    void handleSafeUpdateHolidays(merged.sort((a, b) => a.date.localeCompare(b.date)));
                  }}
                  className="h-7 px-2.5 bg-slate-50 hover:bg-slate-100 border-slate-200 text-xs font-semibold text-slate-700 cursor-pointer"
                >
                  {cty.name}
                </Button>
              ))}
            </div>
          </div>

          {/* 手动添加假期 */}
          <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 space-y-3">
            <span className="text-xs font-bold text-slate-700 uppercase tracking-wide block">➕ 手动新增自定义假期：</span>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <Label className="block text-[11px] font-bold text-slate-500 mb-1">日期</Label>
                <DatePicker
                  value={newHolidayDate}
                  onChange={(val) => setNewHolidayDate(val)}
                  className="w-full text-xs bg-white h-9"
                />
              </div>
              <div>
                <Label className="block text-[11px] font-bold text-slate-500 mb-1">节日名称</Label>
                <Input
                  type="text"
                  placeholder="例如: 春节、国庆节"
                  value={newHolidayName}
                  onChange={(e) => setNewHolidayName(e.target.value)}
                  className="w-full text-xs bg-white h-9"
                />
              </div>
              <div>
                <Label className="block text-[11px] font-bold text-slate-500 mb-1">所属国家</Label>
                <div className="flex gap-2">
                  <Select value={newHolidayCountry} onValueChange={setNewHolidayCountry}>
                    <SelectTrigger className="flex-1 h-9 text-xs bg-white border-slate-300">
                      <SelectValue placeholder="选择国家" />
                    </SelectTrigger>
                    <SelectContent className="max-h-56">
                      <SelectItem value="CN">🇨🇳 中国 (CN)</SelectItem>
                      <SelectItem value="TH">🇹🇭 泰国 (TH)</SelectItem>
                      <SelectItem value="MY">🇲🇾 马来西亚 (MY)</SelectItem>
                      <SelectItem value="ID">🇮🇩 印度尼西亚 (ID)</SelectItem>
                      <SelectItem value="SG">🇸🇬 新加坡 (SG)</SelectItem>
                      <SelectItem value="PH">🇵🇭 菲律宾 (PH)</SelectItem>
                      <SelectItem value="KR">🇰🇷 韩国 (KR)</SelectItem>
                      <SelectItem value="JP">🇯🇵 日本 (JP)</SelectItem>
                      <SelectItem value="BN">🇧🇳 文莱 (BN)</SelectItem>
                      <SelectItem value="MM">🇲🇲 缅甸 (MM)</SelectItem>
                      <SelectItem value="VN">🇻🇳 越南 (VN)</SelectItem>
                      <SelectItem value="KH">🇰🇭 柬埔寨 (KH)</SelectItem>
                      <SelectItem value="custom">⚙️ 自定义 (Other)</SelectItem>
                    </SelectContent>
                  </Select>
                  <Button
                    type="button"
                    size="sm"
                    disabled={!newHolidayDate || !newHolidayName || isUpdatingHoliday}
                    onClick={async () => {
                      if (!newHolidayDate || !newHolidayName || isUpdatingHoliday) return;
                      const newRecord: HolidayRecord = {
                        id: `custom-${Date.now()}`,
                        date: newHolidayDate,
                        name: newHolidayName,
                        country: newHolidayCountry
                      };
                      await handleSafeUpdateHolidays([...holidays, newRecord].sort((a, b) => a.date.localeCompare(b.date)));
                      setNewHolidayDate("");
                      setNewHolidayName("");
                    }}
                    className="h-9 px-4 bg-brand-600 hover:bg-brand-700 text-white font-bold text-xs rounded-lg transition cursor-pointer shrink-0"
                  >
                    {isUpdatingHoliday ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : "添加"}
                  </Button>
                </div>
              </div>
            </div>
          </div>

          {/* 现有假期列表 */}
          <div className="space-y-2">
            <div className="flex justify-between items-center">
              <span className="text-xs font-bold text-slate-700 uppercase tracking-wide block">📅 已设置假期 ({holidays.length} 天)：</span>
              {holidays.length > 0 && (
                <div className="flex items-center gap-2">
                  {showClearConfirm ? (
                    <>
                      <span className="text-[11px] font-bold text-red-600 animate-pulse">您确定要全部清空吗？</span>
                      <Button
                        type="button"
                        size="sm"
                        disabled={isUpdatingHoliday}
                        onClick={async () => {
                          await handleSafeUpdateHolidays([]);
                          setShowClearConfirm(false);
                        }}
                        className="h-6 px-2 text-[11px] font-extrabold text-white bg-red-600 hover:bg-red-700 rounded-md transition shadow-xs cursor-pointer"
                      >
                        {isUpdatingHoliday ? <Loader2 className="w-3 h-3 animate-spin mr-1" /> : null}
                        <span>确定清空</span>
                      </Button>
                      <Button
                        type="button"
                        variant="secondary"
                        size="sm"
                        disabled={isUpdatingHoliday}
                        onClick={() => setShowClearConfirm(false)}
                        className="h-6 px-2 text-[11px] font-medium text-slate-600 hover:text-slate-800 bg-slate-100 hover:bg-slate-200 rounded-md transition cursor-pointer"
                      >
                        取消
                      </Button>
                    </>
                  ) : (
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      disabled={isUpdatingHoliday}
                      onClick={() => setShowClearConfirm(true)}
                      className="h-6 px-2 text-[11px] font-bold text-red-600 hover:text-red-700 hover:bg-red-50 transition flex items-center gap-1 cursor-pointer"
                    >
                      <Trash className="w-3.5 h-3.5" />
                      <span>清空全部</span>
                    </Button>
                  )}
                </div>
              )}
            </div>

            {holidays.length === 0 ? (
              <div className="text-center py-8 text-slate-400 text-xs border border-dashed border-slate-200 rounded-xl bg-slate-50/50">
                目前尚未添加任何假期。点击上方按钮可快速一键导入常用假期，或手动添加。
              </div>
            ) : (
              <div className="border border-slate-200 rounded-xl overflow-hidden max-h-60 overflow-y-auto divide-y divide-slate-100 bg-white">
                {holidays.map(h => (
                  <div key={h.date + "-" + h.name} className="px-4 py-2.5 flex items-center justify-between text-xs hover:bg-slate-50/40 transition">
                    <div className="flex items-center gap-3">
                      <span className="font-mono font-bold text-brand-700 bg-brand-50 px-2 py-0.5 rounded border border-brand-100/50">
                        {h.date}
                      </span>
                      <span className="font-medium text-slate-800">{h.name}</span>
                    </div>
                    <div className="flex items-center gap-3.5">
                      <span className="text-slate-500 font-semibold bg-slate-100 px-2 py-0.5 rounded-full text-[10px]">
                        {getCountryLabel(h.country)}
                      </span>
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        disabled={isUpdatingHoliday}
                        onClick={() => {
                          void handleSafeUpdateHolidays(holidays.filter(item => item.date !== h.date || item.name !== h.name));
                        }}
                        className="h-6 w-6 text-slate-400 hover:text-red-500 rounded-md transition cursor-pointer p-0"
                        title="删除此假期"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Modal Footer */}
        <DialogFooter className="bg-slate-50 px-6 py-4 border-t border-slate-100 flex flex-col sm:flex-row sm:justify-between sm:items-center gap-3">
          <span className="text-xs text-slate-500 font-medium">
            如需更多国家，请联系：<span className="text-blue-600 font-semibold">smartbillpro@gamil.com</span>
          </span>
          <Button
            onClick={onClose}
            className="px-6 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold shadow-xs self-end sm:self-auto"
          >
            保存并完成
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
