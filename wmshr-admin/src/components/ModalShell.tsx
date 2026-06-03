import { type ReactNode } from "react";
import { X } from "lucide-react";
import { cn } from "../lib/utils";

interface ModalShellProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  children: ReactNode;
  className?: string;
  bodyClassName?: string;
  headerClassName?: string;
  footer?: ReactNode;
}

export function ModalShell({
  isOpen,
  onClose,
  title,
  children,
  className,
  bodyClassName,
  headerClassName,
  footer
}: ModalShellProps) {
  if (!isOpen) {
    return null;
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4 backdrop-blur-sm">
      <div className={cn("max-h-[90vh] w-full overflow-hidden rounded-xl bg-white shadow-2xl fade-in flex flex-col", className)}>
        <div className={cn("flex flex-shrink-0 items-center justify-between border-b border-slate-100 bg-slate-50 px-6 py-4", headerClassName)}>
          <h3 className="text-lg font-bold text-slate-800">{title}</h3>
          <button onClick={onClose} className="text-slate-400 transition hover:text-slate-600" aria-label="关闭弹窗">
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className={cn("p-6", bodyClassName)}>
          {children}
        </div>

        {footer ? (
          <div className="flex-shrink-0 border-t border-slate-200 bg-[linear-gradient(180deg,rgba(255,255,255,0.94)_0%,rgba(248,250,252,0.99)_100%)] px-6 py-4 shadow-[0_-12px_32px_rgba(15,23,42,0.06)]">
            {footer}
          </div>
        ) : null}
      </div>
    </div>
  );
}
