import React from "react";
import { Dialog, DialogContent, DialogTitle, DialogDescription } from "../../ui/dialog";

interface ExpenseReceiptPreviewModalProps {
  previewImageUrl: string | null;
  onClose: () => void;
}

export function ExpenseReceiptPreviewModal({
  previewImageUrl,
  onClose
}: ExpenseReceiptPreviewModalProps) {
  return (
    <Dialog open={!!previewImageUrl} onOpenChange={(open) => { if (!open) onClose(); }}>
      <DialogContent className="max-w-4xl p-4 bg-slate-950/90 border-0 flex flex-col items-center justify-center text-center [&>button]:text-white [&>button]:hover:text-white [&>button]:top-4 [&>button]:right-5">
        <DialogTitle className="sr-only">凭证发票原图放大预览</DialogTitle>
        <DialogDescription className="sr-only">原图放大查看</DialogDescription>
        <img 
          src={previewImageUrl || ""} 
          alt="receipt magnified lightbox" 
          className="max-w-full max-h-[85vh] rounded-lg shadow-2xl object-contain mx-auto border-3 border-white/20 select-none animate-in zoom-in-95 duration-200"
          referrerPolicy="no-referrer"
        />
        <p className="text-white text-xs font-medium tracking-wide mt-3 select-none text-slate-200 flex items-center justify-center gap-1">
          <span>单击右上角关闭</span>
          <span className="w-1 h-1 rounded-full bg-slate-400"></span>
          <span>或按下 Esc 退出大图查看</span>
        </p>
      </DialogContent>
    </Dialog>
  );
}
