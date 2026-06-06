import { createContext, type ReactNode, useCallback, useContext, useMemo, useState } from "react";
import { tAdmin } from "../lib/i18nText";
import { AlertTriangle, CircleAlert, MessageSquareText, X } from "lucide-react";
import { cn } from "../lib/utils";

type DialogTone = "default" | "danger" | "warning";
type DialogKind = "confirm" | "prompt" | "alert";

interface BaseDialogOptions {
  title: string;
  message: string;
  confirmText?: string;
  cancelText?: string;
  tone?: DialogTone;
}

interface PromptDialogOptions extends BaseDialogOptions {
  placeholder?: string;
  defaultValue?: string;
}

interface ActiveDialog extends BaseDialogOptions {
  kind: DialogKind;
  placeholder?: string;
  defaultValue?: string;
}

interface DialogContextValue {
  confirm: (options: BaseDialogOptions) => Promise<boolean>;
  prompt: (options: PromptDialogOptions) => Promise<string | null>;
  alert: (options: Omit<BaseDialogOptions, "cancelText">) => Promise<void>;
}

const DialogContext = createContext<DialogContextValue | null>(null);

const TONE_META: Record<DialogTone, { icon: typeof CircleAlert; accentClass: string; buttonClass: string }> = {
  default: {
    icon: MessageSquareText,
    accentClass: "from-brand-500/12 via-white to-brand-100/30 text-brand-700",
    buttonClass: "bg-brand-600 hover:bg-brand-700 focus:ring-brand-500"
  },
  warning: {
    icon: AlertTriangle,
    accentClass: "from-amber-500/14 via-white to-amber-100/40 text-amber-700",
    buttonClass: "bg-amber-600 hover:bg-amber-700 focus:ring-amber-500"
  },
  danger: {
    icon: CircleAlert,
    accentClass: "from-rose-500/14 via-white to-rose-100/40 text-rose-700",
    buttonClass: "bg-rose-600 hover:bg-rose-700 focus:ring-rose-500"
  }
};

export function DialogProvider({ children }: { children: ReactNode }) {
  const [activeDialog, setActiveDialog] = useState<ActiveDialog | null>(null);
  const [promptValue, setPromptValue] = useState("");
  const [resolver, setResolver] = useState<((value: boolean | string | null | void) => void) | null>(null);

  const closeDialog = useCallback(() => {
    setActiveDialog(null);
    setPromptValue("");
    setResolver(null);
  }, []);

  const confirm = useCallback((options: BaseDialogOptions) => {
    return new Promise<boolean>((resolve) => {
      setPromptValue("");
      setActiveDialog({
        kind: "confirm",
        confirmText: options.confirmText || tAdmin("确认继续"),
        cancelText: options.cancelText || tAdmin("取消"),
        tone: options.tone || "default",
        ...options
      });
      setResolver(() => resolve);
    });
  }, []);

  const prompt = useCallback((options: PromptDialogOptions) => {
    return new Promise<string | null>((resolve) => {
      const nextValue = options.defaultValue || "";
      setPromptValue(nextValue);
      setActiveDialog({
        kind: "prompt",
        confirmText: options.confirmText || tAdmin("提交"),
        cancelText: options.cancelText || tAdmin("取消"),
        tone: options.tone || "default",
        ...options
      });
      setResolver(() => resolve);
    });
  }, []);

  const alert = useCallback((options: Omit<BaseDialogOptions, "cancelText">) => {
    return new Promise<void>((resolve) => {
      setPromptValue("");
      setActiveDialog({
        kind: "alert",
        confirmText: options.confirmText || tAdmin("知道了"),
        cancelText: "",
        tone: options.tone || "default",
        ...options
      });
      setResolver(() => resolve);
    });
  }, []);

  const handleCancel = useCallback(() => {
    if (!resolver || !activeDialog) {
      closeDialog();
      return;
    }

    if (activeDialog.kind === "confirm") {
      resolver(false);
    } else if (activeDialog.kind === "prompt") {
      resolver(null);
    } else {
      resolver();
    }

    closeDialog();
  }, [activeDialog, closeDialog, resolver]);

  const handleConfirm = useCallback(() => {
    if (!resolver || !activeDialog) {
      closeDialog();
      return;
    }

    if (activeDialog.kind === "confirm") {
      resolver(true);
    } else if (activeDialog.kind === "prompt") {
      resolver(promptValue.trim());
    } else {
      resolver();
    }

    closeDialog();
  }, [activeDialog, closeDialog, promptValue, resolver]);

  const value = useMemo<DialogContextValue>(() => ({
    confirm,
    prompt,
    alert
  }), [alert, confirm, prompt]);

  const tone = activeDialog?.tone || "default";
  const toneMeta = TONE_META[tone];
  const Icon = toneMeta.icon;

  return (
    <DialogContext.Provider value={value}>
      {children}
      {activeDialog ? (
        <div className="fixed inset-0 z-[70] flex items-center justify-center bg-slate-950/40 backdrop-blur-md p-4">
          <div className="w-full max-w-lg overflow-hidden rounded-[28px] border border-white/65 bg-white shadow-[0_24px_100px_rgba(15,23,42,0.18)]">
            <div className={cn("border-b border-slate-100 bg-gradient-to-br px-6 py-5", toneMeta.accentClass)}>
              <div className="flex items-start justify-between gap-4">
                <div className="flex items-start gap-4">
                  <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-white/80 shadow-sm ring-1 ring-white/70">
                    <Icon className="h-6 w-6" />
                  </div>
                  <div className="space-y-1">
                    <h3 className="text-lg font-bold text-slate-900">{activeDialog.title}</h3>
                    <p className="text-sm leading-6 text-slate-600">{activeDialog.message}</p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={handleCancel}
                  className="rounded-full p-2 text-slate-400 transition hover:bg-white/70 hover:text-slate-600"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>
            </div>

            <div className="space-y-5 px-6 py-6">
              {activeDialog.kind === "prompt" ? (
                <div className="space-y-2">
                  <label className="block text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">{tAdmin("备注内容")}</label>
                  <textarea
                    value={promptValue}
                    placeholder={activeDialog.placeholder || tAdmin("请输入内容")}
                    onChange={(event) => setPromptValue(event.target.value)}
                    rows={4}
                    className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-700 outline-none transition focus:border-brand-300 focus:bg-white focus:ring-4 focus:ring-brand-500/12"
                  />
                </div>
              ) : null}

              <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
                {activeDialog.kind !== "alert" ? (
                  <button
                    type="button"
                    onClick={handleCancel}
                    className="inline-flex items-center justify-center rounded-2xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-medium text-slate-600 transition hover:border-slate-300 hover:bg-slate-50"
                  >
                    {activeDialog.cancelText || tAdmin("取消")}
                  </button>
                ) : null}
                <button
                  type="button"
                  onClick={handleConfirm}
                  className={cn("inline-flex items-center justify-center rounded-2xl px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition focus:outline-none focus:ring-4", toneMeta.buttonClass)}
                >
                  {activeDialog.confirmText || tAdmin("确认")}
                </button>
              </div>
            </div>
          </div>
        </div>
      ) : null}
    </DialogContext.Provider>
  );
}

export function useDialog() {
  const value = useContext(DialogContext);
  if (!value) {
    throw new Error(tAdmin("useDialog 必须在 DialogProvider 内使用"));
  }

  return value;
}
