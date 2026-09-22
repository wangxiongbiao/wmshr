import React, { useState, useRef } from "react";
import {
  Upload,
  CheckCircle,
  Clipboard,
  Settings,
  FileSpreadsheet,
  FileCheck,
  RefreshCw,
  Trash2,
  ChevronDown,
  ChevronUp
} from "lucide-react";
import { Button } from "../../ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from "../../ui/select";
import { MatchKeyOption } from "../types";

interface ExpressImportDrawerProps {
  systemPastedText: string;
  setSystemPastedText: (val: string) => void;
  jntPastedText: string;
  setJntPastedText: (val: string) => void;
  systemCount: number;
  jntCount: number;
  systemHeaders: string[];
  jntHeaders: string[];
  matchKeyOption: MatchKeyOption;
  setMatchKeyOption: (val: MatchKeyOption) => void;
  systemAltKey: string;
  setSystemAltKey: (val: string) => void;
  jntAltKey: string;
  setJntAltKey: (val: string) => void;
  onParseSystem: (text: string) => void;
  onParseJnt: (text: string) => void;
  onUploadFile: (file: File, target: "system" | "jnt") => void;
  addToast: (msg: string, kind?: "success" | "error" | "info") => void;
}

export function ExpressImportDrawer(props: ExpressImportDrawerProps) {
  const {
    systemPastedText,
    setSystemPastedText,
    jntPastedText,
    setJntPastedText,
    systemCount,
    jntCount,
    systemHeaders,
    jntHeaders,
    matchKeyOption,
    setMatchKeyOption,
    systemAltKey,
    setSystemAltKey,
    jntAltKey,
    setJntAltKey,
    onParseSystem,
    onParseJnt,
    onUploadFile,
    addToast
  } = props;

  const [dragOverSystem, setDragOverSystem] = useState(false);
  const [dragOverJnt, setDragOverJnt] = useState(false);
  const [systemFileName, setSystemFileName] = useState<string>("");
  const [jntFileName, setJntFileName] = useState<string>("");
  const [showSystemText, setShowSystemText] = useState(false);
  const [showJntText, setShowJntText] = useState(false);

  const systemFileInputRef = useRef<HTMLInputElement>(null);
  const jntFileInputRef = useRef<HTMLInputElement>(null);

  const handleQuickPaste = async (target: "system" | "jnt") => {
    try {
      const text = await navigator.clipboard.readText();
      if (!text.trim()) {
        addToast("剪贴板内容为空", "info");
        return;
      }
      if (target === "system") {
        setSystemFileName("剪贴板文本导入");
        setSystemPastedText(text);
        onParseSystem(text);
      } else {
        setJntFileName("剪贴板文本导入");
        setJntPastedText(text);
        onParseJnt(text);
      }
      addToast("已成功从剪贴板读取数据！", "success");
    } catch {
      addToast("无法直接读取剪贴板，请展开文本框后使用 Ctrl+V 粘贴", "info");
    }
  };

  const handleSystemFileChange = (file: File | undefined) => {
    if (!file) return;
    setSystemFileName(file.name);
    onUploadFile(file, "system");
  };

  const handleJntFileChange = (file: File | undefined) => {
    if (!file) return;
    setJntFileName(file.name);
    onUploadFile(file, "jnt");
  };

  const clearSystemData = () => {
    setSystemFileName("");
    setSystemPastedText("");
    onParseSystem("");
    if (systemFileInputRef.current) systemFileInputRef.current.value = "";
  };

  const clearJntData = () => {
    setJntFileName("");
    setJntPastedText("");
    onParseJnt("");
    if (jntFileInputRef.current) jntFileInputRef.current.value = "";
  };

  return (
    <div className="space-y-4">
      {/* Dual Import Boxes */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Step 1: System Export Data */}
        <div className="bg-white p-4 sm:p-5 rounded-xl border border-slate-200/80 shadow-2xs flex flex-col h-full">
          <div className="flex justify-between items-start mb-3">
            <div>
              <div className="flex items-center gap-2">
                <span className="inline-flex items-center justify-center w-5 h-5 rounded-full bg-blue-100 text-blue-700 text-xs font-bold">
                  1
                </span>
                <h3 className="font-bold text-slate-800 text-sm">
                  导入系统发货数据（线下发货单 / order_*.xlsx）
                </h3>
              </div>
              <p className="text-xs text-slate-400 mt-0.5">
                从客服系统导出的客户发货记录，直接拖入或选择 Excel 文件
              </p>
            </div>
            {systemCount > 0 && (
              <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-emerald-50 text-emerald-700 border border-emerald-200 flex items-center gap-1 shadow-2xs">
                <CheckCircle className="w-3.5 h-3.5 text-emerald-600" /> 已解析 {systemCount} 笔发货
              </span>
            )}
          </div>

          {/* Hidden File Input */}
          <input
            ref={systemFileInputRef}
            type="file"
            onChange={(e) => {
              handleSystemFileChange(e.target.files?.[0]);
              e.target.value = "";
            }}
            className="hidden"
            accept=".xlsx,.xls,.csv,.txt"
          />

          {/* Upload Dropzone / Success Card */}
          {systemCount === 0 && !systemPastedText ? (
            <div
              onDragOver={(e) => {
                e.preventDefault();
                setDragOverSystem(true);
              }}
              onDragLeave={() => setDragOverSystem(false)}
              onDrop={(e) => {
                e.preventDefault();
                setDragOverSystem(false);
                const file = e.dataTransfer.files?.[0];
                if (file) handleSystemFileChange(file);
              }}
              onClick={() => systemFileInputRef.current?.click()}
              className={`border-2 border-dashed rounded-xl p-6 flex flex-col items-center justify-center min-h-[170px] transition-all cursor-pointer select-none group ${
                dragOverSystem
                  ? "border-brand-500 bg-brand-50/40 scale-[0.99]"
                  : "border-slate-200 hover:border-brand-400 bg-slate-50/50 hover:bg-slate-50/80"
              }`}
            >
              <div className="w-12 h-12 rounded-xl bg-blue-50 border border-blue-100 flex items-center justify-center text-blue-600 mb-3 group-hover:scale-110 transition-transform">
                <FileSpreadsheet className="w-6 h-6" />
              </div>
              <p className="text-xs font-bold text-slate-700 mb-1">
                点击上传 或 拖拽系统发货 Excel 文件到此处
              </p>
              <p className="text-[11px] text-slate-400">
                支持 .xlsx / .xls / .csv（如客服系统导出的 order_*.xlsx）
              </p>
            </div>
          ) : (
            <div className="bg-blue-50/40 border border-blue-200/80 rounded-xl p-4 flex flex-col gap-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-lg bg-blue-100 text-blue-700 flex items-center justify-center shrink-0">
                    <FileCheck className="w-5 h-5" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-xs font-bold text-slate-800 truncate max-w-[220px]">
                      {systemFileName || "系统发货表格"}
                    </p>
                    <p className="text-[11px] text-emerald-600 font-medium flex items-center gap-1">
                      <CheckCircle className="w-3 h-3" /> 数据解析成功 · 共 {systemCount} 条记录
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-1.5">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => systemFileInputRef.current?.click()}
                    className="h-7 px-2.5 text-xs text-slate-600 hover:text-brand-600 gap-1 cursor-pointer"
                  >
                    <RefreshCw className="w-3 h-3" />
                    <span>更换文件</span>
                  </Button>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={clearSystemData}
                    className="h-7 w-7 p-0 text-slate-400 hover:text-rose-600 hover:bg-rose-50 cursor-pointer"
                    title="清空数据"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </Button>
                </div>
              </div>

              {/* Collapsible raw preview / edit */}
              <div className="pt-2 border-t border-blue-100">
                <button
                  type="button"
                  onClick={() => setShowSystemText(!showSystemText)}
                  className="flex items-center gap-1 text-[11px] text-slate-500 hover:text-slate-700 font-medium cursor-pointer"
                >
                  {showSystemText ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
                  <span>{showSystemText ? "收起明细文本" : "查看/编辑文本明细"}</span>
                </button>
                {showSystemText && (
                  <textarea
                    value={systemPastedText}
                    onChange={(e) => {
                      setSystemPastedText(e.target.value);
                      onParseSystem(e.target.value);
                    }}
                    placeholder="在此粘贴或修改表格文本..."
                    className="w-full h-24 mt-2 bg-white border border-slate-200 rounded-lg p-2 text-xs font-mono focus:outline-none focus:border-brand-500 resize-none shadow-2xs"
                  />
                )}
              </div>
            </div>
          )}

          {/* Quick paste button footer */}
          <div className="flex justify-between items-center text-xs text-slate-500 pt-3 border-t border-slate-200/70 mt-3">
            <span className="text-[11px] text-slate-400">
              {systemHeaders.length > 0 ? `识别到列: ${systemHeaders.slice(0, 4).join(" | ")}...` : "尚未识别列头"}
            </span>

            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => handleQuickPaste("system")}
              className="h-7 px-2 text-xs font-medium text-brand-600 hover:text-brand-700 hover:bg-brand-50 gap-1 cursor-pointer"
            >
              <Clipboard className="w-3 h-3" />
              <span>从剪贴板快速粘贴</span>
            </Button>
          </div>
        </div>

        {/* Step 2: JNT Statement */}
        <div className="bg-white p-4 sm:p-5 rounded-xl border border-slate-200/80 shadow-2xs flex flex-col h-full">
          <div className="flex justify-between items-start mb-3">
            <div>
              <div className="flex items-center gap-2">
                <span className="inline-flex items-center justify-center w-5 h-5 rounded-full bg-orange-100 text-orange-700 text-xs font-bold">
                  2
                </span>
                <h3 className="font-bold text-slate-800 text-sm">
                  导入 J&T 官方结算表格（对账单 / VIP_*.xlsx）
                </h3>
              </div>
              <p className="text-xs text-slate-400 mt-0.5">
                J&T 快递官方月底提供的财务结算账单，拖入或选择 Excel 文件
              </p>
            </div>
            {jntCount > 0 && (
              <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-emerald-50 text-emerald-700 border border-emerald-200 flex items-center gap-1 shadow-2xs">
                <CheckCircle className="w-3.5 h-3.5 text-emerald-600" /> 已解析 {jntCount} 笔结算
              </span>
            )}
          </div>

          {/* Hidden File Input */}
          <input
            ref={jntFileInputRef}
            type="file"
            onChange={(e) => {
              handleJntFileChange(e.target.files?.[0]);
              e.target.value = "";
            }}
            className="hidden"
            accept=".xlsx,.xls,.csv,.txt"
          />

          {/* Upload Dropzone / Success Card */}
          {jntCount === 0 && !jntPastedText ? (
            <div
              onDragOver={(e) => {
                e.preventDefault();
                setDragOverJnt(true);
              }}
              onDragLeave={() => setDragOverJnt(false)}
              onDrop={(e) => {
                e.preventDefault();
                setDragOverJnt(false);
                const file = e.dataTransfer.files?.[0];
                if (file) handleJntFileChange(file);
              }}
              onClick={() => jntFileInputRef.current?.click()}
              className={`border-2 border-dashed rounded-xl p-6 flex flex-col items-center justify-center min-h-[170px] transition-all cursor-pointer select-none group ${
                dragOverJnt
                  ? "border-orange-500 bg-orange-50/40 scale-[0.99]"
                  : "border-slate-200 hover:border-orange-400 bg-slate-50/50 hover:bg-slate-50/80"
              }`}
            >
              <div className="w-12 h-12 rounded-xl bg-orange-50 border border-orange-100 flex items-center justify-center text-orange-600 mb-3 group-hover:scale-110 transition-transform">
                <FileSpreadsheet className="w-6 h-6" />
              </div>
              <p className="text-xs font-bold text-slate-700 mb-1">
                点击上传 或 拖拽 J&T 官方账单 Excel 文件到此处
              </p>
              <p className="text-[11px] text-slate-400">
                支持 .xlsx / .xls / .csv（如 J&T 月底账单 VIP8021*.xlsx）
              </p>
            </div>
          ) : (
            <div className="bg-orange-50/40 border border-orange-200/80 rounded-xl p-4 flex flex-col gap-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-lg bg-orange-100 text-orange-700 flex items-center justify-center shrink-0">
                    <FileCheck className="w-5 h-5" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-xs font-bold text-slate-800 truncate max-w-[220px]">
                      {jntFileName || "J&T 账单表格"}
                    </p>
                    <p className="text-[11px] text-emerald-600 font-medium flex items-center gap-1">
                      <CheckCircle className="w-3 h-3" /> 数据解析成功 · 共 {jntCount} 条记录
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-1.5">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => jntFileInputRef.current?.click()}
                    className="h-7 px-2.5 text-xs text-slate-600 hover:text-orange-600 gap-1 cursor-pointer"
                  >
                    <RefreshCw className="w-3 h-3" />
                    <span>更换文件</span>
                  </Button>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={clearJntData}
                    className="h-7 w-7 p-0 text-slate-400 hover:text-rose-600 hover:bg-rose-50 cursor-pointer"
                    title="清空数据"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </Button>
                </div>
              </div>

              {/* Collapsible raw preview / edit */}
              <div className="pt-2 border-t border-orange-100">
                <button
                  type="button"
                  onClick={() => setShowJntText(!showJntText)}
                  className="flex items-center gap-1 text-[11px] text-slate-500 hover:text-slate-700 font-medium cursor-pointer"
                >
                  {showJntText ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
                  <span>{showJntText ? "收起明细文本" : "查看/编辑文本明细"}</span>
                </button>
                {showJntText && (
                  <textarea
                    value={jntPastedText}
                    onChange={(e) => {
                      setJntPastedText(e.target.value);
                      onParseJnt(e.target.value);
                    }}
                    placeholder="在此粘贴或修改账单文本..."
                    className="w-full h-24 mt-2 bg-white border border-slate-200 rounded-lg p-2 text-xs font-mono focus:outline-none focus:border-brand-500 resize-none shadow-2xs"
                  />
                )}
              </div>
            </div>
          )}

          {/* Quick paste button footer */}
          <div className="flex justify-between items-center text-xs text-slate-500 pt-3 border-t border-slate-200/70 mt-3">
            <span className="text-[11px] text-slate-400">
              {jntHeaders.length > 0 ? `识别到列: ${jntHeaders.slice(0, 4).join(" | ")}...` : "尚未识别列头"}
            </span>

            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => handleQuickPaste("jnt")}
              className="h-7 px-2 text-xs font-medium text-brand-600 hover:text-brand-700 hover:bg-brand-50 gap-1 cursor-pointer"
            >
              <Clipboard className="w-3 h-3" />
              <span>从剪贴板快速粘贴</span>
            </Button>
          </div>
        </div>
      </div>

      {/* Matching Configuration Card */}
      {(systemCount > 0 || jntCount > 0) && (
        <div className="bg-slate-50/90 border border-slate-200/80 rounded-xl p-4 shadow-2xs space-y-3">
          <div className="flex flex-col gap-1 border-b border-slate-200/60 pb-2.5">
            <div className="flex items-center gap-2">
              <span className="p-1 bg-brand-100/70 text-brand-700 rounded-md">
                <Settings className="w-3.5 h-3.5" />
              </span>
              <h4 className="text-xs font-bold text-slate-800">对账关联与唯一标识穿透设置</h4>
            </div>
            <p className="text-[11px] text-slate-500 leading-normal">
              除了自动比对“运单号”外，支持设置两份文件特有的共同唯一字段（例如：订单号、客户编码、平台单号等）进行补充穿透匹配，有效杜绝错漏。
            </p>
          </div>

          <div className="flex flex-col md:flex-row md:items-center gap-3">
            {/* Left radio selector */}
            <div className="flex items-center gap-3 bg-white px-3 py-1.5 rounded-lg border border-slate-200 shadow-2xs shrink-0">
              <label className="flex items-center gap-1.5 cursor-pointer text-xs font-medium text-slate-700 select-none">
                <input
                  type="radio"
                  name="match_key_opt"
                  checked={matchKeyOption === "waybill_only"}
                  onChange={() => setMatchKeyOption("waybill_only")}
                  className="w-3.5 h-3.5 accent-brand-600 cursor-pointer"
                />
                仅按运单号匹配
              </label>

              <div className="w-px h-3.5 bg-slate-200"></div>

              <label className="flex items-center gap-1.5 cursor-pointer text-xs font-medium text-slate-700 select-none">
                <input
                  type="radio"
                  name="match_key_opt"
                  checked={matchKeyOption === "waybill_and_alt"}
                  onChange={() => setMatchKeyOption("waybill_and_alt")}
                  className="w-3.5 h-3.5 accent-brand-600 cursor-pointer"
                />
                双重标识穿透匹配（推荐）
              </label>
            </div>

            {/* Right dropdown menus */}
            {matchKeyOption === "waybill_and_alt" && (
              <div className="flex flex-col sm:flex-row sm:items-center gap-3 bg-white p-2 sm:px-3 rounded-lg border border-slate-200 shadow-2xs flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-1 min-w-0">
                  <span className="text-xs font-medium text-slate-500 whitespace-nowrap shrink-0">
                    系统表关联列：
                  </span>
                  <Select value={systemAltKey} onValueChange={setSystemAltKey}>
                    <SelectTrigger className="h-7 text-xs bg-slate-50/60 border-slate-200 font-medium">
                      <SelectValue placeholder="(选择匹配列)" />
                    </SelectTrigger>
                    <SelectContent className="max-h-56">
                      {systemHeaders.map((h) => (
                        <SelectItem key={h} value={h}>
                          {h}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="hidden sm:block w-px h-4 bg-slate-200 shrink-0"></div>

                <div className="flex items-center gap-2 flex-1 min-w-0">
                  <span className="text-xs font-medium text-slate-500 whitespace-nowrap shrink-0">
                    J&T表关联列：
                  </span>
                  <Select value={jntAltKey} onValueChange={setJntAltKey}>
                    <SelectTrigger className="h-7 text-xs bg-slate-50/60 border-slate-200 font-medium">
                      <SelectValue placeholder="(选择匹配列)" />
                    </SelectTrigger>
                    <SelectContent className="max-h-56">
                      {jntHeaders.map((h) => (
                        <SelectItem key={h} value={h}>
                          {h}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}