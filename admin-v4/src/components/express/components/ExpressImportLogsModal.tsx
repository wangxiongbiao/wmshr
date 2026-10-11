import React from "react";
import { History, Eye, Trash2, FileSpreadsheet, CheckCircle2, AlertTriangle, Layers, FileCheck, Loader2 } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle
} from "../../ui/dialog";
import { Button } from "../../ui/button";
import { Badge } from "../../ui/badge";
import { ExpressImportLog } from "../types";

interface ExpressImportLogsModalProps {
  isOpen: boolean;
  onClose: () => void;
  logs: ExpressImportLog[];
  activeLogSnapshotId?: string;
  onRestore: (log: ExpressImportLog) => void;
  onDelete: (id: string) => Promise<boolean> | void;
}

export function ExpressImportLogsModal(props: ExpressImportLogsModalProps) {
  const { isOpen, onClose, logs, activeLogSnapshotId, onRestore, onDelete } = props;
  const [deletingId, setDeletingId] = React.useState<string | null>(null);

  const handleConfirmClearAll = async () => {
    if (deletingId) return;
    if (window.confirm("确定要清空全部历史对账核算记录吗？此操作无法撤销。")) {
      setDeletingId("clear-all");
      try {
        await onDelete("clear-all");
      } finally {
        setDeletingId(null);
      }
    }
  };

  const handleConfirmDelete = async (id: string, batchNo: string) => {
    if (deletingId) return;
    if (window.confirm(`确定要删除批次【${batchNo}】的对账记录吗？`)) {
      setDeletingId(id);
      try {
        await onDelete(id);
      } finally {
        setDeletingId(null);
      }
    }
  };

  return (
    <Dialog
      open={isOpen}
      onOpenChange={(open) => {
        if (!open) {
          if (deletingId) return; // 正在删除期间锁定遮罩与 ESC
          onClose();
        }
      }}
    >
      <DialogContent className="sm:max-w-3xl max-h-[88vh] overflow-hidden p-0 gap-0 flex flex-col">
        {/* Header */}
        <DialogHeader className="p-4 sm:p-5 border-b border-slate-100 bg-slate-50/50 shrink-0">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="p-2 bg-blue-50 text-blue-600 rounded-lg">
                <History className="w-5 h-5" />
              </div>
              <div>
                <DialogTitle className="text-base font-bold text-slate-900 flex items-center gap-2">
                  双表对账核算历史记录
                  <Badge variant="secondary" className="text-xs px-2 py-0.5 bg-blue-50 text-blue-700 border-none font-mono">
                    已归档 {logs.length} 期
                  </Badge>
                </DialogTitle>
                <p className="text-xs text-slate-500 mt-0.5">
                  记录每次系统发货表与 J&T 官方账单完整核对后的最终报表，支持一键调出回显
                </p>
              </div>
            </div>

            {logs.length > 0 && (
              <Button
                type="button"
                variant="ghost"
                size="sm"
                disabled={deletingId !== null}
                onClick={handleConfirmClearAll}
                className="h-7 text-xs text-rose-500 hover:text-rose-600 hover:bg-rose-50 gap-1 cursor-pointer"
                title="清空全部历史对账记录"
              >
                {deletingId === "clear-all" ? (
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                ) : (
                  <Trash2 className="w-3.5 h-3.5" />
                )}
                <span>{deletingId === "clear-all" ? "清空中..." : "清空历史"}</span>
              </Button>
            )}
          </div>
        </DialogHeader>

        {/* List Content */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-5 space-y-3.5">
          {logs.length === 0 ? (
            <div className="py-12 text-center bg-slate-50/50 rounded-xl border border-dashed border-slate-200">
              <FileSpreadsheet className="w-10 h-10 text-slate-300 mx-auto mb-2" />
              <p className="text-xs text-slate-600 font-medium">暂无任何对账核算记录</p>
              <p className="text-[11px] text-slate-400 mt-0.5">
                在上方同时导入【系统发货单】与【J&T官方账单】完成对账后，系统将自动归档生成记录
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {logs.map((log) => {
                const isCurrentActive = activeLogSnapshotId === log.id || activeLogSnapshotId === log.batchNo;
                const dateStr = log.createdAt
                  ? new Date(log.createdAt).toLocaleString("zh-CN", {
                      year: "numeric",
                      month: "2-digit",
                      day: "2-digit",
                      hour: "2-digit",
                      minute: "2-digit"
                    })
                  : "-";

                const matchPct =
                  log.systemCount > 0
                    ? Math.round((log.matchedCount / log.systemCount) * 100)
                    : 100;

                return (
                  <div
                    key={log.id || log.batchNo}
                    className={`p-4 rounded-xl border transition-all shadow-2xs flex flex-col gap-3 ${
                      isCurrentActive
                        ? "border-blue-500 bg-blue-50/30 ring-1 ring-blue-500/20"
                        : "border-slate-200/80 bg-white hover:border-slate-300"
                    }`}
                  >
                    {/* Row 1: Header & Batch info */}
                    <div className="flex items-center justify-between border-b border-slate-100 pb-2.5">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="p-1 bg-brand-50 text-brand-700 rounded text-xs font-mono font-bold">
                          {log.batchNo}
                        </span>
                        {isCurrentActive && (
                          <Badge variant="outline" className="text-[10px] px-1.5 py-0 border-blue-400 text-blue-700 font-medium">
                            当前回显中
                          </Badge>
                        )}
                        <span className="text-[11px] text-slate-400 font-mono">
                          核对时间: {dateStr}
                        </span>
                      </div>

                      <div className="flex items-center gap-2">
                        <Button
                          type="button"
                          variant={isCurrentActive ? "default" : "outline"}
                          size="sm"
                          onClick={() => onRestore(log)}
                          className={`h-7 px-3 text-xs gap-1 cursor-pointer font-medium ${
                            isCurrentActive
                              ? "bg-blue-600 hover:bg-blue-700 text-white"
                              : "text-blue-700 bg-blue-50/50 hover:bg-blue-100/70 border-blue-200/80"
                          }`}
                          title="将该批次核算结果直接回显到当前对账大屏"
                        >
                          <Eye className="w-3.5 h-3.5" />
                          <span>{isCurrentActive ? "已在回显" : "回显结果"}</span>
                        </Button>

                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          disabled={deletingId !== null}
                          onClick={() => handleConfirmDelete(log.id || log.batchNo, log.batchNo)}
                          className="h-7 w-7 text-slate-400 hover:text-rose-600 rounded-lg cursor-pointer"
                          title="删除该期对账记录"
                        >
                          {deletingId === (log.id || log.batchNo) ? (
                            <Loader2 className="w-3.5 h-3.5 animate-spin text-rose-500" />
                          ) : (
                            <Trash2 className="w-3.5 h-3.5" />
                          )}
                        </Button>
                      </div>
                    </div>

                    {/* Row 2: Dual File Origins */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                      <div className="p-2 rounded-lg bg-sky-50/60 border border-sky-100 flex items-center justify-between">
                        <div className="flex items-center gap-1.5 min-w-0">
                          <FileCheck className="w-3.5 h-3.5 text-sky-600 shrink-0" />
                          <span className="font-medium text-slate-700 truncate" title={log.systemFileName}>
                            {log.systemFileName || "系统发货单"}
                          </span>
                        </div>
                        <span className="font-mono text-sky-900 font-bold shrink-0 ml-2">
                          {log.systemCount} 单
                        </span>
                      </div>

                      <div className="p-2 rounded-lg bg-amber-50/60 border border-amber-100 flex items-center justify-between">
                        <div className="flex items-center gap-1.5 min-w-0">
                          <Layers className="w-3.5 h-3.5 text-amber-600 shrink-0" />
                          <span className="font-medium text-slate-700 truncate" title={log.jntFileName}>
                            {log.jntFileName || "J&T官方账单"}
                          </span>
                        </div>
                        <span className="font-mono text-amber-900 font-bold shrink-0 ml-2">
                          {log.jntCount} 笔 · ฿{log.jntTotalFee ? log.jntTotalFee.toFixed(2) : "0.00"}
                        </span>
                      </div>
                    </div>

                    {/* Row 3: Reconciliation Key Metrics */}
                    <div className="flex items-center justify-between text-xs text-slate-600 pt-1 flex-wrap gap-2">
                      <div className="flex items-center gap-3">
                        <span className="flex items-center gap-1 text-emerald-700">
                          <CheckCircle2 className="w-3.5 h-3.5" /> 匹配成功: <strong className="font-mono">{log.matchedCount}</strong> 单 ({matchPct}%)
                        </span>
                        {log.discrepancyCount > 0 ? (
                          <span className="flex items-center gap-1 text-amber-600">
                            <AlertTriangle className="w-3.5 h-3.5" /> 差异异常: <strong className="font-mono">{log.discrepancyCount}</strong> 笔
                          </span>
                        ) : (
                          <span className="text-emerald-600 text-[11px] font-medium">无差异异常</span>
                        )}
                      </div>

                      <div className="flex items-center gap-3">
                        {log.totalSurcharge > 0 && (
                          <span>
                            操作费加成: <strong className="font-mono text-brand-700">฿{log.totalSurcharge.toFixed(2)}</strong>
                          </span>
                        )}
                        <span className="text-slate-800">
                          最终应收总额: <strong className="font-mono font-black text-slate-950 text-sm">฿{log.finalTotalPayable ? log.finalTotalPayable.toFixed(2) : "0.00"}</strong>
                        </span>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
