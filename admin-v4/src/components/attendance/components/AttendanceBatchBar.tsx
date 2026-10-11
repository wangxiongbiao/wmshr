import { Download, X } from "lucide-react";
import { Button } from "../../ui/button";

interface AttendanceBatchBarProps {
  selectedCount: number;
  onExportSelected: () => void;
  onClearSelection: () => void;
}

export function AttendanceBatchBar({
  selectedCount,
  onExportSelected,
  onClearSelection
}: AttendanceBatchBarProps) {
  if (selectedCount === 0) return null;

  return (
    <div className="bg-slate-900 text-white px-4 py-2.5 rounded-xl shadow-xl flex items-center justify-between gap-4 animate-fade-in text-xs z-30">
      <div className="flex items-center gap-3">
        <span className="w-2 h-2 rounded-full bg-brand-400 animate-pulse" />
        <span className="font-medium">
          已选中 <span className="font-bold text-brand-300 font-mono text-sm">{selectedCount}</span> 条打卡记录
        </span>
      </div>
      <div className="flex items-center gap-2">
        <Button
          type="button"
          variant="secondary"
          size="sm"
          onClick={onExportSelected}
          className="h-8 px-3 bg-slate-800 hover:bg-slate-700 text-white border-0 text-xs font-medium rounded-lg inline-flex items-center gap-1.5"
        >
          <Download className="w-3.5 h-3.5" />
          导出选中记录
        </Button>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={onClearSelection}
          className="h-8 px-3 bg-white/10 hover:bg-white/20 text-white text-xs font-medium rounded-lg inline-flex items-center gap-1"
        >
          <X className="w-3.5 h-3.5" />
          取消全选
        </Button>
      </div>
    </div>
  );
}
