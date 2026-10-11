import React from "react";
import { ApprovalFlowConfig, ApprovalFlowType } from "../types";
import { Button } from "../../ui/button";
import { Input } from "../../ui/input";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "../../ui/dialog";
import { ShieldCheck, Plus, Check, X, Edit, Trash2 } from "lucide-react";
import { cn } from "../../../lib/utils";

interface ApprovalFlowConfigModalProps {
  open: boolean;
  approvalFlowConfig: ApprovalFlowConfig;
  newPayoutStepName: string;
  setNewPayoutStepName: (val: string) => void;
  newIncomeStepName: string;
  setNewIncomeStepName: (val: string) => void;
  editingStepType: ApprovalFlowType | null;
  editingStepIndex: number | null;
  editingStepValue: string;
  setEditingStepValue: (val: string) => void;
  onClose: () => void;
  onAddStep: (type: ApprovalFlowType) => void;
  onDeleteStep: (type: ApprovalFlowType, index: number) => void;
  onMoveStep: (type: ApprovalFlowType, index: number, direction: 'up' | 'down') => void;
  onStartEditStep: (type: ApprovalFlowType, index: number, value: string) => void;
  onSaveEditStep: () => void;
  onToggleFlow: (type: ApprovalFlowType) => void;
}

export function ApprovalFlowConfigModal({
  open,
  approvalFlowConfig,
  newPayoutStepName,
  setNewPayoutStepName,
  newIncomeStepName,
  setNewIncomeStepName,
  editingStepType,
  editingStepIndex,
  editingStepValue,
  setEditingStepValue,
  onClose,
  onAddStep,
  onDeleteStep,
  onMoveStep,
  onStartEditStep,
  onSaveEditStep,
  onToggleFlow
}: ApprovalFlowConfigModalProps) {
  return (
    <Dialog open={open} onOpenChange={(isOpen) => { if (!isOpen) onClose(); }}>
      <DialogContent className="max-w-3xl max-h-[90vh] p-0 flex flex-col sm:rounded-2xl overflow-hidden [&>button]:text-white [&>button]:hover:text-white [&>button]:top-4 [&>button]:right-5">
        <DialogHeader className="bg-brand-600 text-white px-6 py-4 flex flex-row items-center justify-between space-y-0">
          <DialogTitle className="font-bold text-sm tracking-wide text-white flex items-center gap-2">
            <ShieldCheck className="w-5 h-5 text-brand-100" />
            <span>审核流程配置中心</span>
          </DialogTitle>
          <DialogDescription className="sr-only">配置支出与收入审批流程节点</DialogDescription>
        </DialogHeader>

        <div className="p-6 flex-1 overflow-y-auto space-y-6">
          <p className="text-xs text-slate-500 leading-relaxed bg-slate-50 p-3 rounded-lg border border-slate-100 animate-fade-in">
            💡 在这里可以分别为<b>「支出流程」</b>和<b>「收入流程」</b>定制专属的多级审批节点。还可以全局开启或关闭审批功能。
            审批节点更新后，员工手机端在查看报销单时，即可实时拉取对应的审批链条与到账进度。
          </p>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* 1. 支出核销审批链条 */}
            <div className="border border-slate-200 rounded-xl p-4.5 space-y-4 bg-white shadow-3xs flex flex-col">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-rose-500 animate-pulse"></span>
                  <h4 className="text-xs font-black text-slate-800">支出审核流程</h4>
                </div>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => onToggleFlow('payout')}
                  className={cn(
                    "h-6 px-2.5 py-1 rounded-md text-[10px] font-black tracking-wide cursor-pointer",
                    approvalFlowConfig.payout.enabled 
                      ? "bg-emerald-50 text-emerald-700 border-emerald-200 hover:bg-emerald-100" 
                      : "bg-slate-100 text-slate-500 border-slate-200 hover:bg-slate-200"
                  )}
                >
                  {approvalFlowConfig.payout.enabled ? "● 已开启" : "○ 已关闭"}
                </Button>
              </div>

              {approvalFlowConfig.payout.enabled ? (
                <div className="space-y-3 flex-1 flex flex-col">
                  <div className="border border-slate-100 rounded-lg divide-y divide-slate-50 overflow-hidden max-h-[220px] overflow-y-auto bg-slate-50/50 flex-1">
                    {approvalFlowConfig.payout.steps.map((step: string, idx: number) => {
                      const isEditing = editingStepType === 'payout' && editingStepIndex === idx;
                      return (
                        <div key={idx} className="flex items-center justify-between p-2.5 bg-white hover:bg-slate-50 transition text-xs">
                          {isEditing ? (
                            <div className="flex items-center gap-1.5 w-full">
                              <Input
                                type="text"
                                value={editingStepValue}
                                onChange={(e) => setEditingStepValue(e.target.value)}
                                className="flex-1 h-7 px-2 py-1 text-[11px] font-bold text-slate-800"
                                autoFocus
                                onKeyDown={(e) => {
                                  if (e.key === 'Enter') onSaveEditStep();
                                  if (e.key === 'Escape') onClose();
                                }}
                              />
                              <Button
                                type="button"
                                size="icon"
                                variant="ghost"
                                onClick={onSaveEditStep}
                                className="h-6 w-6 p-1 bg-emerald-500 text-white rounded hover:bg-emerald-600"
                              >
                                <Check className="w-3 h-3" />
                              </Button>
                              <Button
                                type="button"
                                size="icon"
                                variant="ghost"
                                onClick={onClose}
                                className="h-6 w-6 p-1 bg-slate-200 text-slate-600 rounded hover:bg-slate-300"
                              >
                                <X className="w-3 h-3" />
                              </Button>
                            </div>
                          ) : (
                            <>
                              <div className="flex items-center gap-2">
                                <span className="w-4 h-4 bg-slate-100 text-slate-500 text-[10px] rounded-full flex items-center justify-center font-bold">
                                  {idx + 1}
                                </span>
                                <span className="font-extrabold text-slate-700">{step}</span>
                              </div>
                              <div className="flex items-center gap-1.5">
                                <Button
                                  type="button"
                                  size="icon"
                                  variant="ghost"
                                  disabled={idx === 0}
                                  onClick={() => onMoveStep('payout', idx, 'up')}
                                  className="h-6 w-6 p-1 text-slate-400 hover:text-slate-700 disabled:opacity-30 rounded"
                                  title="上移"
                                >
                                  ▲
                                </Button>
                                <Button
                                  type="button"
                                  size="icon"
                                  variant="ghost"
                                  disabled={idx === approvalFlowConfig.payout.steps.length - 1}
                                  onClick={() => onMoveStep('payout', idx, 'down')}
                                  className="h-6 w-6 p-1 text-slate-400 hover:text-slate-700 disabled:opacity-30 rounded"
                                  title="下移"
                                >
                                  ▼
                                </Button>
                                <Button
                                  type="button"
                                  size="icon"
                                  variant="ghost"
                                  onClick={() => onStartEditStep('payout', idx, step)}
                                  className="h-6 w-6 p-1 text-slate-400 hover:text-brand-600 rounded"
                                  title="重命名"
                                >
                                  <Edit className="w-3.5 h-3.5" />
                                </Button>
                                <Button
                                  type="button"
                                  size="icon"
                                  variant="ghost"
                                  onClick={() => onDeleteStep('payout', idx)}
                                  className="h-6 w-6 p-1 text-slate-400 hover:text-rose-500 rounded hover:bg-rose-50"
                                  title="删除"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                </Button>
                              </div>
                            </>
                          )}
                        </div>
                      );
                    })}
                  </div>

                  <div className="flex gap-1.5 pt-2">
                    <Input
                      type="text"
                      value={newPayoutStepName}
                      onChange={(e) => setNewPayoutStepName(e.target.value)}
                      placeholder="新审核步骤：如 财务经理初审"
                      className="flex-1 h-8 px-2.5 py-1 text-xs font-semibold text-slate-800 bg-white"
                    />
                    <Button
                      type="button"
                      size="sm"
                      onClick={() => onAddStep('payout')}
                      className="h-8 px-3 py-1 bg-rose-500 hover:bg-rose-600 text-white rounded-lg text-xs font-extrabold gap-1"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      <span>增加</span>
                    </Button>
                  </div>
                </div>
              ) : (
                <div className="flex-1 py-12 flex flex-col items-center justify-center border border-dashed border-slate-200 rounded-lg bg-slate-50/50 text-slate-400 text-xs">
                  <p className="font-bold">支出审批流程已关闭</p>
                  <p className="text-[10px] mt-1 text-slate-400/80">关闭后，支出报销将自动跳过人工审批环节</p>
                </div>
              )}
            </div>

            {/* 2. 收入核销审批链条 */}
            <div className="border border-slate-200 rounded-xl p-4.5 space-y-4 bg-white shadow-3xs flex flex-col">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
                  <h4 className="text-xs font-black text-slate-800">收入审核流程</h4>
                </div>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => onToggleFlow('income')}
                  className={cn(
                    "h-6 px-2.5 py-1 rounded-md text-[10px] font-black tracking-wide cursor-pointer",
                    approvalFlowConfig.income.enabled 
                      ? "bg-emerald-50 text-emerald-700 border-emerald-200 hover:bg-emerald-100" 
                      : "bg-slate-100 text-slate-500 border-slate-200 hover:bg-slate-200"
                  )}
                >
                  {approvalFlowConfig.income.enabled ? "● 已开启" : "○ 已关闭"}
                </Button>
              </div>

              {approvalFlowConfig.income.enabled ? (
                <div className="space-y-3 flex-1 flex flex-col">
                  <div className="border border-slate-100 rounded-lg divide-y divide-slate-50 overflow-hidden max-h-[220px] overflow-y-auto bg-slate-50/50 flex-1">
                    {approvalFlowConfig.income.steps.map((step: string, idx: number) => {
                      const isEditing = editingStepType === 'income' && editingStepIndex === idx;
                      return (
                        <div key={idx} className="flex items-center justify-between p-2.5 bg-white hover:bg-slate-50 transition text-xs">
                          {isEditing ? (
                            <div className="flex items-center gap-1.5 w-full">
                              <Input
                                type="text"
                                value={editingStepValue}
                                onChange={(e) => setEditingStepValue(e.target.value)}
                                className="flex-1 h-7 px-2 py-1 text-[11px] font-bold text-slate-800"
                                autoFocus
                                onKeyDown={(e) => {
                                  if (e.key === 'Enter') onSaveEditStep();
                                  if (e.key === 'Escape') onClose();
                                }}
                              />
                              <Button
                                type="button"
                                size="icon"
                                variant="ghost"
                                onClick={onSaveEditStep}
                                className="h-6 w-6 p-1 bg-emerald-500 text-white rounded hover:bg-emerald-600"
                              >
                                <Check className="w-3 h-3" />
                              </Button>
                              <Button
                                type="button"
                                size="icon"
                                variant="ghost"
                                onClick={onClose}
                                className="h-6 w-6 p-1 bg-slate-200 text-slate-600 rounded hover:bg-slate-300"
                              >
                                <X className="w-3 h-3" />
                              </Button>
                            </div>
                          ) : (
                            <>
                              <div className="flex items-center gap-2">
                                <span className="w-4 h-4 bg-slate-100 text-slate-500 text-[10px] rounded-full flex items-center justify-center font-bold">
                                  {idx + 1}
                                </span>
                                <span className="font-extrabold text-slate-700">{step}</span>
                              </div>
                              <div className="flex items-center gap-1.5">
                                <Button
                                  type="button"
                                  size="icon"
                                  variant="ghost"
                                  disabled={idx === 0}
                                  onClick={() => onMoveStep('income', idx, 'up')}
                                  className="h-6 w-6 p-1 text-slate-400 hover:text-slate-700 disabled:opacity-30 rounded"
                                  title="上移"
                                >
                                  ▲
                                </Button>
                                <Button
                                  type="button"
                                  size="icon"
                                  variant="ghost"
                                  disabled={idx === approvalFlowConfig.income.steps.length - 1}
                                  onClick={() => onMoveStep('income', idx, 'down')}
                                  className="h-6 w-6 p-1 text-slate-400 hover:text-slate-700 disabled:opacity-30 rounded"
                                  title="下移"
                                >
                                  ▼
                                </Button>
                                <Button
                                  type="button"
                                  size="icon"
                                  variant="ghost"
                                  onClick={() => onStartEditStep('income', idx, step)}
                                  className="h-6 w-6 p-1 text-slate-400 hover:text-brand-600 rounded"
                                  title="重命名"
                                >
                                  <Edit className="w-3.5 h-3.5" />
                                </Button>
                                <Button
                                  type="button"
                                  size="icon"
                                  variant="ghost"
                                  onClick={() => onDeleteStep('income', idx)}
                                  className="h-6 w-6 p-1 text-slate-400 hover:text-rose-500 rounded hover:bg-rose-50"
                                  title="删除"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                </Button>
                              </div>
                            </>
                          )}
                        </div>
                      );
                    })}
                  </div>

                  <div className="flex gap-1.5 pt-2">
                    <Input
                      type="text"
                      value={newIncomeStepName}
                      onChange={(e) => setNewIncomeStepName(e.target.value)}
                      placeholder="新对账步骤：如 仓储财务二审"
                      className="flex-1 h-8 px-2.5 py-1 text-xs font-semibold text-slate-800 bg-white"
                    />
                    <Button
                      type="button"
                      size="sm"
                      onClick={() => onAddStep('income')}
                      className="h-8 px-3 py-1 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-extrabold gap-1"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      <span>增加</span>
                    </Button>
                  </div>
                </div>
              ) : (
                <div className="flex-1 py-12 flex flex-col items-center justify-center border border-dashed border-slate-200 rounded-lg bg-slate-50/50 text-slate-400 text-xs">
                  <p className="font-bold">收入审批流程已关闭</p>
                  <p className="text-[10px] mt-1 text-slate-400/80">关闭后，收入回账记录将自动标识为免审通过</p>
                </div>
              )}
            </div>
          </div>
        </div>

        <DialogFooter className="bg-slate-50 border-t border-slate-200 p-4 flex flex-row justify-end">
          <Button
            type="button"
            variant="default"
            size="sm"
            onClick={onClose}
            className="px-5 py-1.5 bg-slate-800 hover:bg-slate-900 font-extrabold text-white text-xs shadow-3xs"
          >
            保存
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
