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
  ChevronUp,
  Loader2,
  X,
  Sparkles,
  ArrowRight
} from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter
} from "../../ui/dialog";
import { Button } from "../../ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from "../../ui/select";
import { MatchKeyOption } from "../types";

export interface ExpressImportModalProps {
  isOpen: boolean;
  onClose: () => void;
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

export function ExpressImportModal(props: ExpressImportModalProps) {
  const {
    isOpen,
    onClose,
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
  const [isParsingSystem, setIsParsingSystem] = useState(false);
  const [isParsingJnt, setIsParsingJnt] = useState(false);

  const systemFileInputRef = useRef<HTMLInputElement>(null);
  const jntFileInputRef = useRef<HTMLInputElement>(null);

  const handleQuickPaste = async (target: "system" | "jnt") => {
    try {
      const text = await navigator.clipboard.readText();
      if (!text || !text.trim()) {
        addToast("剪贴板内容为空，请先在 Excel/表格中复制数据", "error");
        return;
      }
      if (target === "system") {
        setIsParsingSystem(true);
        setSystemPastedText(text);
        setSystemFileName("剪贴板粘贴发货单");
        onParseSystem(text);
        setIsParsingSystem(false);
      } else {
        setIsParsingJnt(true);
        setJntPastedText(text);
        setJntFileName("剪贴板粘贴J&T账单");
        onParseJnt(text);
        setIsParsingJnt(false);
      }
    } catch {
      if (target === "system") {
        setShowSystemText(true);
      } else {
        setShowJntText(true);
      }
      addToast("无法直接访问剪贴板，请在下方文本框中手动按 Ctrl+V 粘贴", "info");
    }
  };

  const handleManualParse = (target: "system" | "jnt") => {
    if (target === "system") {
      if (!systemPastedText.trim()) {
        addToast("请先粘贴系统发货单数据", "error");
        return;
      }
      setIsParsingSystem(true);
      onParseSystem(systemPastedText);
      setIsParsingSystem(false);
    } else {
      if (!jntPastedText.trim()) {
        addToast("请先粘贴J&T账单数据", "error");
        return;
      }
      setIsParsingJnt(true);
      onParseJnt(jntPastedText);
      setIsParsingJnt(false);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>, target: "system" | "jnt") => {
    const file = e.target.files?.[0];
    if (file) {
      if (target === "system") setSystemFileName(file.name);
      else setJntFileName(file.name);
      onUploadFile(file, target);
    }
    e.target.value = "";
  };

  const handleDrop = (e: React.DragEvent<HTMLDivElement>, target: "system" | "jnt") => {
    e.preventDefault();
    if (target === "system") setDragOverSystem(false);
    else setDragOverJnt(false);

    const file = e.dataTransfer.files?.[0];
    if (file) {
      if (target === "system") setSystemFileName(file.name);
      else setJntFileName(file.name);
      onUploadFile(file, target);
    }
  };

  const handleFinishAndStart = () => {
    if (systemCount === 0 && jntCount === 0) {
      addToast("请先导入或粘贴至少一边的数据", "error");
      return;
    }
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-4xl p-6 max-h-[90vh] flex flex-col overflow-hidden">
        <DialogHeader className="pb-3 border-b border-slate-100 shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-brand-50 border border-brand-100 flex items-center justify-center text-brand-600">
              <Upload className="w-4 h-4" />
            </div>
            <div>
              <DialogTitle className="text-base font-bold text-slate-900">
                导入发货单与快递账单数据
              </DialogTitle>
              <DialogDescription className="text-xs text-slate-500 mt-0.5">
                支持 Excel 文件拖拽上传与剪贴板纯文本粘贴，系统将自动清洗并提取单号核对
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        {/* 弹窗可滚动主体区 */}
        <div className="flex-1 overflow-y-auto py-4 space-y-4 pr-1">
          {/* Two-Column Drop/Paste Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Box 1: System Shipments */}
            <div
              onDragOver={(e) => {
                e.preventDefault();
                setDragOverSystem(true);
              }}
              onDragLeave={() => setDragOverSystem(false)}
              onDrop={(e) => handleDrop(e, "system")}
              className={`relative rounded-xl border transition-all duration-200 p-4 flex flex-col justify-between ${
                dragOverSystem
                  ? "border-brand-500 bg-brand-50/50 shadow-sm"
                  : systemCount > 0
                  ? "border-emerald-200 bg-emerald-50/20 shadow-2xs"
                  : "border-slate-200 bg-slate-50/40 hover:border-slate-300"
              }`}
            >
              <input
                ref={systemFileInputRef}
                type="file"
                accept=".xlsx,.xls,.csv,.tsv"
                className="hidden"
                onChange={(e) => handleFileChange(e, "system")}
              />

              <div>
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-blue-500"></span>
                    <span className="font-bold text-slate-800 text-xs">
                      1. 系统出库发货单 (order_*.xlsx)
                    </span>
                  </div>
                  {systemCount > 0 ? (
                    <span className="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-700 bg-emerald-100/80 px-2 py-0.5 rounded-full font-mono">
                      <CheckCircle className="w-3 h-3 text-emerald-600" />
                      已解析 {systemCount} 单
                    </span>
                  ) : (
                    <span className="text-[11px] text-slate-400">待导入</span>
                  )}
                </div>

                <p className="text-[11px] text-slate-500 mb-3 leading-relaxed">
                  必须包含 <code className="text-slate-700 font-semibold">运单号</code>
                  ，可选包含客户名称、收件人、重量(g)、订单号
                </p>

                {systemFileName && (
                  <div className="mb-3 px-2.5 py-1.5 rounded-lg bg-white border border-slate-200/80 flex items-center justify-between text-xs text-slate-700 shadow-2xs">
                    <span className="truncate flex items-center gap-1.5 font-medium">
                      <FileCheck className="w-3.5 h-3.5 text-blue-600 shrink-0" />
                      <span className="truncate">{systemFileName}</span>
                    </span>
                    <button
                      type="button"
                      onClick={() => {
                        setSystemFileName("");
                        setSystemPastedText("");
                        onParseSystem("");
                      }}
                      className="text-slate-400 hover:text-rose-500 p-0.5 transition-colors cursor-pointer"
                      title="清除此表格"
                    >
                      <Trash2 className="w-3 h-3" />
                    </button>
                  </div>
                )}
              </div>

              <div className="space-y-2">
                <div className="grid grid-cols-2 gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => systemFileInputRef.current?.click()}
                    className="h-8 text-xs font-semibold bg-white hover:bg-slate-50 text-slate-700 border-slate-200 shadow-2xs cursor-pointer"
                  >
                    <Upload className="w-3.5 h-3.5 mr-1 text-slate-500" />
                    上传 Excel/CSV
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => handleQuickPaste("system")}
                    className="h-8 text-xs font-semibold bg-white hover:bg-slate-50 text-slate-700 border-slate-200 shadow-2xs cursor-pointer"
                  >
                    <Clipboard className="w-3.5 h-3.5 mr-1 text-blue-600" />
                    一键粘贴文本
                  </Button>
                </div>

                <button
                  type="button"
                  onClick={() => setShowSystemText(!showSystemText)}
                  className="w-full flex items-center justify-center gap-1 text-[11px] text-slate-400 hover:text-slate-600 py-1 transition-colors cursor-pointer"
                >
                  <span>{showSystemText ? "收起文本编辑框" : "展开手动文本输入框"}</span>
                  {showSystemText ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
                </button>

                {showSystemText && (
                  <div className="space-y-2 pt-1 border-t border-slate-200/60 animate-in fade-in-50 duration-150">
                    <textarea
                      rows={3}
                      value={systemPastedText}
                      onChange={(e) => setSystemPastedText(e.target.value)}
                      placeholder="直接在此处按 Ctrl+V 粘贴发货单表格内容（包含表头）..."
                      className="w-full text-xs p-2 rounded-lg border border-slate-200 bg-white font-mono text-slate-700 resize-y focus:outline-none focus:ring-1 focus:ring-brand-500"
                    />
                    <Button
                      type="button"
                      size="sm"
                      onClick={() => handleManualParse("system")}
                      disabled={isParsingSystem || !systemPastedText.trim()}
                      className="w-full h-7 text-xs bg-brand-600 hover:bg-brand-700 text-white cursor-pointer font-medium"
                    >
                      {isParsingSystem ? (
                        <>
                          <Loader2 className="w-3 h-3 mr-1 animate-spin" />
                          正在解析发货数据...
                        </>
                      ) : (
                        "立即解析发货数据"
                      )}
                    </Button>
                  </div>
                )}
              </div>
            </div>

            {/* Box 2: JNT Bills */}
            <div
              onDragOver={(e) => {
                e.preventDefault();
                setDragOverJnt(true);
              }}
              onDragLeave={() => setDragOverJnt(false)}
              onDrop={(e) => handleDrop(e, "jnt")}
              className={`relative rounded-xl border transition-all duration-200 p-4 flex flex-col justify-between ${
                dragOverJnt
                  ? "border-brand-500 bg-brand-50/50 shadow-sm"
                  : jntCount > 0
                  ? "border-emerald-200 bg-emerald-50/20 shadow-2xs"
                  : "border-slate-200 bg-slate-50/40 hover:border-slate-300"
              }`}
            >
              <input
                ref={jntFileInputRef}
                type="file"
                accept=".xlsx,.xls,.csv,.tsv"
                className="hidden"
                onChange={(e) => handleFileChange(e, "jnt")}
              />

              <div>
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-amber-500"></span>
                    <span className="font-bold text-slate-800 text-xs">
                      2. J&T 官方运费对账单 (jnt_*.xlsx)
                    </span>
                  </div>
                  {jntCount > 0 ? (
                    <span className="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-700 bg-emerald-100/80 px-2 py-0.5 rounded-full font-mono">
                      <CheckCircle className="w-3 h-3 text-emerald-600" />
                      已解析 {jntCount} 笔
                    </span>
                  ) : (
                    <span className="text-[11px] text-slate-400">待导入</span>
                  )}
                </div>

                <p className="text-[11px] text-slate-500 mb-3 leading-relaxed">
                  必须包含 <code className="text-slate-700 font-semibold">运单号</code> 与{" "}
                  <code className="text-slate-700 font-semibold">总运费</code>
                  ，自动兼容极兔官方导出的全部字段列
                </p>

                {jntFileName && (
                  <div className="mb-3 px-2.5 py-1.5 rounded-lg bg-white border border-slate-200/80 flex items-center justify-between text-xs text-slate-700 shadow-2xs">
                    <span className="truncate flex items-center gap-1.5 font-medium">
                      <FileCheck className="w-3.5 h-3.5 text-amber-600 shrink-0" />
                      <span className="truncate">{jntFileName}</span>
                    </span>
                    <button
                      type="button"
                      onClick={() => {
                        setJntFileName("");
                        setJntPastedText("");
                        onParseJnt("");
                      }}
                      className="text-slate-400 hover:text-rose-500 p-0.5 transition-colors cursor-pointer"
                      title="清除此表格"
                    >
                      <Trash2 className="w-3 h-3" />
                    </button>
                  </div>
                )}
              </div>

              <div className="space-y-2">
                <div className="grid grid-cols-2 gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => jntFileInputRef.current?.click()}
                    className="h-8 text-xs font-semibold bg-white hover:bg-slate-50 text-slate-700 border-slate-200 shadow-2xs cursor-pointer"
                  >
                    <Upload className="w-3.5 h-3.5 mr-1 text-slate-500" />
                    上传 J&T Excel/CSV
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => handleQuickPaste("jnt")}
                    className="h-8 text-xs font-semibold bg-white hover:bg-slate-50 text-slate-700 border-slate-200 shadow-2xs cursor-pointer"
                  >
                    <Clipboard className="w-3.5 h-3.5 mr-1 text-amber-600" />
                    一键粘贴账单
                  </Button>
                </div>

                <button
                  type="button"
                  onClick={() => setShowJntText(!showJntText)}
                  className="w-full flex items-center justify-center gap-1 text-[11px] text-slate-400 hover:text-slate-600 py-1 transition-colors cursor-pointer"
                >
                  <span>{showJntText ? "收起文本编辑框" : "展开手动文本输入框"}</span>
                  {showJntText ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
                </button>

                {showJntText && (
                  <div className="space-y-2 pt-1 border-t border-slate-200/60 animate-in fade-in-50 duration-150">
                    <textarea
                      rows={3}
                      value={jntPastedText}
                      onChange={(e) => setJntPastedText(e.target.value)}
                      placeholder="直接在此处按 Ctrl+V 粘贴J&T官方账单表格内容..."
                      className="w-full text-xs p-2 rounded-lg border border-slate-200 bg-white font-mono text-slate-700 resize-y focus:outline-none focus:ring-1 focus:ring-brand-500"
                    />
                    <Button
                      type="button"
                      size="sm"
                      onClick={() => handleManualParse("jnt")}
                      disabled={isParsingJnt || !jntPastedText.trim()}
                      className="w-full h-7 text-xs bg-brand-600 hover:bg-brand-700 text-white cursor-pointer font-medium"
                    >
                      {isParsingJnt ? (
                        <>
                          <Loader2 className="w-3 h-3 mr-1 animate-spin" />
                          正在解析账单数据...
                        </>
                      ) : (
                        "立即解析账单数据"
                      )}
                    </Button>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Bottom Settings Bar: Advanced Dual-Key Matching Rules */}
          {(systemCount > 0 || jntCount > 0) && (
            <div className="p-3 bg-slate-50 rounded-xl border border-slate-200/70 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs text-slate-600">
              <div className="flex items-center gap-4">
                <span className="font-bold text-slate-700 flex items-center gap-1.5 shrink-0">
                  <Settings className="w-3.5 h-3.5 text-slate-400" />
                  对账匹配规则：
                </span>
                <label className="flex items-center gap-1.5 cursor-pointer text-xs font-medium text-slate-700 select-none">
                  <input
                    type="radio"
                    name="match_key_opt"
                    checked={matchKeyOption === "waybill_only"}
                    onChange={() => setMatchKeyOption("waybill_only")}
                    className="w-3.5 h-3.5 accent-brand-600 cursor-pointer"
                  />
                  仅严格匹配运单号
                </label>
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

              {matchKeyOption === "waybill_and_alt" && (
                <div className="flex flex-col sm:flex-row sm:items-center gap-3 bg-white p-1.5 px-2.5 rounded-lg border border-slate-200 shadow-2xs flex-1 min-w-0">
                  <div className="flex items-center gap-1.5 flex-1 min-w-0">
                    <span className="text-[11px] font-medium text-slate-500 whitespace-nowrap shrink-0">
                      系统关联列：
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

                  <div className="hidden sm:block w-px h-3.5 bg-slate-200 shrink-0"></div>

                  <div className="flex items-center gap-1.5 flex-1 min-w-0">
                    <span className="text-[11px] font-medium text-slate-500 whitespace-nowrap shrink-0">
                      J&T关联列：
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
          )}
        </div>

        {/* 弹窗 Footer */}
        <DialogFooter className="pt-3 border-t border-slate-100 flex items-center justify-between sm:justify-between w-full">
          <div className="text-xs text-slate-500 font-mono">
            {systemCount > 0 || jntCount > 0 ? (
              <span>
                当前状态: 发货单 <strong className="text-blue-700">{systemCount}</strong> 单 · J&T账单{" "}
                <strong className="text-amber-700">{jntCount}</strong> 笔
              </span>
            ) : (
              <span>暂未录入数据</span>
            )}
          </div>

          <div className="flex items-center gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={onClose}
              className="h-8 text-xs font-semibold border-slate-200 text-slate-600"
            >
              取消
            </Button>
            <Button
              type="button"
              size="sm"
              onClick={handleFinishAndStart}
              className="h-8 text-xs font-bold bg-brand-600 hover:bg-brand-700 text-white shadow-xs"
            >
              <span>完成并开始对账</span>
              <ArrowRight className="w-3.5 h-3.5 ml-1" />
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
