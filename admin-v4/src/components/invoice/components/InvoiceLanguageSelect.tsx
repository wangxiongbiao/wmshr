import React from "react";
import { Languages } from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "../../ui/select";
import { cn } from "../../../lib/utils";

export type InvoiceDocLanguage = "zh-CN" | "en";

interface InvoiceLanguageSelectProps {
  value: InvoiceDocLanguage;
  onChange: (lang: InvoiceDocLanguage) => void;
  className?: string;
  uiLang?: string;
}

export const InvoiceLanguageSelect: React.FC<InvoiceLanguageSelectProps> = ({
  value,
  onChange,
  className,
  uiLang = "zh-CN",
}) => {
  const isEnUI = uiLang === "en";

  return (
    <div className={cn("inline-flex items-center", className)}>
      <Select
        value={value}
        onValueChange={(val) => onChange(val as InvoiceDocLanguage)}
      >
        <SelectTrigger
          aria-label={isEnUI ? "Invoice Document Language" : "发票单据语言"}
          className="h-8 md:h-8 text-xs font-bold bg-slate-100 hover:bg-slate-200 text-slate-700 border-0 rounded-xl px-2.5 py-1 gap-1.5 shadow-none focus:ring-1 focus:ring-brand-500 cursor-pointer min-w-[100px] w-auto transition-colors"
        >
          <div className="flex items-center gap-1.5 shrink-0">
            <Languages className="w-3.5 h-3.5 text-slate-500 shrink-0" />
            <SelectValue placeholder={isEnUI ? "Doc Lang" : "单据语言"} />
          </div>
        </SelectTrigger>
        <SelectContent align="end" className="min-w-[130px] rounded-xl shadow-lg border-slate-200 p-1">
          <SelectItem
            value="zh-CN"
            className="text-xs font-semibold rounded-lg py-1.5 cursor-pointer focus:bg-indigo-50 focus:text-indigo-700"
          >
            <span className="flex items-center gap-2">
              <span className="text-sm">🇨🇳</span>
              <span>中文 (简体)</span>
            </span>
          </SelectItem>
          <SelectItem
            value="en"
            className="text-xs font-semibold rounded-lg py-1.5 cursor-pointer focus:bg-indigo-50 focus:text-indigo-700"
          >
            <span className="flex items-center gap-2">
              <span className="text-sm">🇺🇸</span>
              <span>English</span>
            </span>
          </SelectItem>
        </SelectContent>
      </Select>
    </div>
  );
};
