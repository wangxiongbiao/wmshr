import React from "react";
import { ExpenseRecord, ApprovalFlowConfig } from "../types";
import { formatExpenseAmount } from "../constants";
import { Button } from "../../ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "../../ui/dialog";
import {
  FileText,
  BadgeCheck,
  BadgeAlert,
  BadgeHelp,
  Wallet,
  CheckCircle2,
  FileX,
  Image as ImageIcon,
  Eye,
  Download,
  ShieldCheck,
  RotateCcw
} from "lucide-react";
import { formatDate, formatDateTime } from "../../../lib/utils";

interface ExpenseDetailModalProps {
  open: boolean;
  activeExpense: ExpenseRecord | null;
  approvalFlowConfig: ApprovalFlowConfig;
  onClose: () => void;
  onOpenApproval: (rec: ExpenseRecord, e?: React.MouseEvent) => void;
  onRecallApproval: (rec: ExpenseRecord, e?: React.MouseEvent) => void;
  onPreviewImage: (url: string) => void;
}

export function ExpenseDetailModal({
  open,
  activeExpense,
  approvalFlowConfig,
  onClose,
  onOpenApproval,
  onRecallApproval,
  onPreviewImage
}: ExpenseDetailModalProps) {
  if (!activeExpense) return null;

  const isIncome = activeExpense.purpose === 'income';
  const flowConfig = isIncome ? approvalFlowConfig.income : approvalFlowConfig.payout;
  const steps = flowConfig?.enabled ? flowConfig.steps : ["提交申请", "部门主管审批", "财务专员审核", "完成"];

  let currentStepIndex = 1;
  if (activeExpense.status === 'approved') {
    currentStepIndex = steps.length;
  } else if (activeExpense.status === 'recalled') {
    currentStepIndex = 0;
  } else if (activeExpense.status === 'rejected') {
    currentStepIndex = 1;
  }

  return (
    <Dialog open={open} onOpenChange={(isOpen) => { if (!isOpen) onClose(); }}>
      <DialogContent className="max-w-2xl max-h-[90vh] p-0 flex flex-col sm:rounded-2xl overflow-hidden [&>button]:text-white [&>button]:hover:text-white [&>button]:top-4 [&>button]:right-5">
        <DialogHeader className="bg-brand-600 text-white px-6 py-4 flex flex-row items-center justify-between space-y-0">
          <DialogTitle className="font-bold text-[14px] text-white flex items-center gap-2">
            <FileText className="w-5 h-5 text-brand-100" />
            <span>查看报销单</span>
          </DialogTitle>
          <DialogDescription className="sr-only">查看报销单核算明细与流程</DialogDescription>
        </DialogHeader>

        <div className="p-6 space-y-5 overflow-y-auto flex-1">
          {/* 状态卡片 */}
          <div className={`p-4 rounded-xl flex items-center justify-between border ${
            activeExpense.status === 'approved' ? 'bg-emerald-50/40 border-emerald-200 text-emerald-950' :
            activeExpense.status === 'rejected' ? 'bg-rose-50/40 border-rose-200 text-rose-955' :
            'bg-amber-50/30 border-amber-200 text-amber-900'
          }`}>
            <div className="flex items-center gap-3">
              {activeExpense.status === 'approved' ? <BadgeCheck className="w-10 h-10 text-emerald-600" /> :
               activeExpense.status === 'rejected' ? <BadgeAlert className="w-10 h-10 text-rose-600" /> :
               <BadgeHelp className="w-10 h-10 text-amber-600" />}
              <div>
                <h4 className="font-bold text-xs uppercase tracking-wider">
                  审批状态: {activeExpense.status === 'approved' ? '已通过审查' : activeExpense.status === 'rejected' ? '已被驳回' : '财务部门待审批'}
                </h4>
                {(activeExpense.status === 'approved' || activeExpense.status === 'rejected') && (
                  <p className="text-[11px] text-slate-500 mt-1">
                    {activeExpense.status === 'approved' ? `经办审批人：${activeExpense.approvedBy || "WMS管理员"} (${formatDateTime(activeExpense.approvedTime)})` :
                     `经办理领班：${activeExpense.approvedBy || "WMS管理审核"} (${formatDateTime(activeExpense.approvedTime)})`}
                  </p>
                )}
              </div>
            </div>
            <div className="text-right">
              <span className="font-mono text-lg font-black text-slate-800">{formatExpenseAmount(activeExpense.amount, activeExpense.currency)}</span>
            </div>
          </div>

          {/* 审批流程时间轴 */}
          <div className="bg-slate-50 p-4 rounded-xl border border-slate-200/80 space-y-3">
            <div className="text-[11px] text-slate-500 font-extrabold uppercase tracking-wider flex items-center gap-1.5 pb-1 border-b border-slate-200/40">
              <span className="w-1.5 h-3 bg-brand-500 rounded-full"></span>
              <span>审批流程进度</span>
            </div>
            <div className="relative pl-4 border-l border-slate-200 space-y-4 ml-1">
              {steps.map((step, sIdx) => {
                let stepState: 'completed' | 'active' | 'rejected' | 'recalled' | 'waiting' = 'waiting';
                
                if (activeExpense.status === 'approved') {
                  stepState = 'completed';
                } else if (activeExpense.status === 'recalled') {
                  if (sIdx === 0) stepState = 'recalled';
                  else stepState = 'waiting';
                } else if (activeExpense.status === 'rejected') {
                  if (sIdx < 1) stepState = 'completed';
                  else if (sIdx === 1) stepState = 'rejected';
                  else stepState = 'waiting';
                } else {
                  if (sIdx < currentStepIndex) stepState = 'completed';
                  else if (sIdx === currentStepIndex) stepState = 'active';
                  else stepState = 'waiting';
                }

                return (
                  <div key={sIdx} className="relative">
                    <div className={`absolute -left-[22.5px] top-0.5 w-3 h-3 rounded-full flex items-center justify-center border bg-white z-10
                      ${stepState === 'completed' ? 'border-emerald-500 bg-emerald-500 text-white' : ''}
                      ${stepState === 'active' ? 'border-amber-500 bg-white' : ''}
                      ${stepState === 'rejected' ? 'border-rose-500 bg-rose-500 text-white' : ''}
                      ${stepState === 'recalled' ? 'border-slate-400 bg-slate-400 text-white' : ''}
                      ${stepState === 'waiting' ? 'border-slate-200 bg-white' : ''}
                    `}>
                      {stepState === 'completed' && <span className="block w-1 h-1 bg-white rounded-full"></span>}
                      {stepState === 'active' && <span className="block w-1.5 h-1.5 bg-amber-500 rounded-full animate-ping"></span>}
                      {stepState === 'rejected' && <span className="text-[7px] font-black leading-none">×</span>}
                      {stepState === 'recalled' && <span className="text-[7px] font-black leading-none">↩</span>}
                      {stepState === 'waiting' && <span className="block w-1 h-1 bg-slate-200 rounded-full"></span>}
                    </div>

                    <div className="flex flex-col gap-0.5 text-xs">
                      <div className="flex justify-between items-center gap-2">
                        <span className={`font-bold text-[11.5px]
                          ${stepState === 'completed' ? 'text-emerald-700 font-extrabold' : ''}
                          ${stepState === 'active' ? 'text-amber-700 font-extrabold' : ''}
                          ${stepState === 'rejected' ? 'text-rose-700 font-extrabold' : ''}
                          ${stepState === 'recalled' ? 'text-slate-500' : ''}
                          ${stepState === 'waiting' ? 'text-slate-400 font-medium' : ''}
                        `}>
                          {step}
                        </span>
                        
                        {sIdx === 0 && (
                          <span className="text-[10px] text-slate-400 font-mono font-medium">
                            {activeExpense.paymentTime}
                          </span>
                        )}
                        {sIdx === steps.length - 1 && activeExpense.status === 'approved' && (
                          <span className="text-[10px] text-slate-400 font-mono font-medium">
                            {formatDateTime(activeExpense.approvedTime) || formatDate(activeExpense.paymentTime)}
                          </span>
                        )}
                      </div>

                      {stepState === 'active' && (
                        <p className="text-[10px] text-amber-600 font-semibold leading-relaxed">
                          正在等待 {activeExpense.targetApproverName || "部门主管或财务主管"} 进行审核评估...
                        </p>
                      )}
                      {stepState === 'rejected' && (
                        <div className="bg-rose-50/50 p-2 border border-rose-100 rounded-lg mt-1 space-y-0.5">
                          <p className="text-[10px] text-rose-700 font-bold">审批驳回意见</p>
                          <p className="text-[10px] text-rose-650 font-semibold">
                            审批人：{activeExpense.approvedBy || "系统管理员"}
                          </p>
                          <p className="text-[10px] text-rose-500 italic leading-relaxed">
                            “{activeExpense.approvalNote || "由于发票不合规或流程越级，被审核人驳回。"}”
                          </p>
                        </div>
                      )}
                      {stepState === 'completed' && sIdx === steps.length - 1 && (
                        <div className="bg-emerald-50/50 p-2 border border-emerald-100 rounded-lg mt-1 space-y-0.5">
                          <p className="text-[10px] text-emerald-700 font-bold">审批通过意见</p>
                          <p className="text-[10px] text-emerald-650 font-semibold">
                            审批人：{activeExpense.approvedBy || "系统管理员"}
                          </p>
                          {activeExpense.approvalNote && (
                            <p className="text-[10px] text-emerald-500 italic leading-relaxed">
                              “{activeExpense.approvalNote}”
                            </p>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* 薪资关联明细 */}
          {activeExpense.salaryDetail && (
            <div className="bg-gradient-to-br from-slate-50 to-brand-50/20 p-4 rounded-xl border border-brand-200/60 space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Wallet className="w-4 h-4 text-brand-600" />
                  <span className="text-xs font-bold text-slate-800">
                    考勤薪资核算明细 ({activeExpense.salaryDetail.month})
                  </span>
                </div>
                <span className="text-[11px] font-bold text-brand-700 bg-brand-100/60 px-2 py-0.5 rounded-full">
                  {activeExpense.type}
                </span>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-[11.5px] bg-white/80 p-3 rounded-lg border border-slate-100">
                <div>
                  <span className="text-slate-400 block text-[10px]">员工姓名/工号</span>
                  <span className="font-bold text-slate-800">
                    {activeExpense.salaryDetail.emp.name} ({activeExpense.salaryDetail.emp.employeeNo || activeExpense.salaryDetail.emp.id})
                  </span>
                </div>
                <div>
                  <span className="text-slate-400 block text-[10px]">所属部门/职位</span>
                  <span className="text-slate-700">
                    {activeExpense.salaryDetail.emp.dept || "未分配"} · {activeExpense.salaryDetail.emp.role || "普通员工"}
                  </span>
                </div>
                <div>
                  <span className="text-slate-400 block text-[10px]">开户银行</span>
                  <span className="text-slate-700 font-medium">
                    {activeExpense.salaryDetail.emp.bankName || "现金发放 (无卡号)"}
                  </span>
                </div>
                <div>
                  <span className="text-slate-400 block text-[10px]">银行账号</span>
                  <span className="font-mono text-slate-800 font-semibold">
                    {activeExpense.salaryDetail.emp.bankCardNumber || "-"}
                  </span>
                </div>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-[11.5px]">
                <div className="bg-white p-2.5 rounded-lg border border-slate-100">
                  <span className="text-slate-400 block text-[10px]">出勤天数 / 有效工时</span>
                  <span className="font-bold text-slate-700">
                    {activeExpense.salaryDetail.workingDays} 天 / {activeExpense.salaryDetail.valid.toFixed(1)} h
                  </span>
                </div>
                <div className="bg-white p-2.5 rounded-lg border border-slate-100">
                  <span className="text-slate-400 block text-[10px]">加班工时 / 加班费</span>
                  <span className="font-bold text-amber-600">
                    {activeExpense.salaryDetail.ot.toFixed(1)} h (฿{Math.round(activeExpense.salaryDetail.otPay).toLocaleString()})
                  </span>
                </div>
                <div className="bg-white p-2.5 rounded-lg border border-slate-100">
                  <span className="text-slate-400 block text-[10px]">基本工资 / 补贴</span>
                  <span className="font-bold text-slate-700">
                    ฿{Math.round(activeExpense.salaryDetail.basePay).toLocaleString()} + ฿{Math.round(activeExpense.salaryDetail.mealAllowance + activeExpense.salaryDetail.bonus).toLocaleString()}
                  </span>
                </div>
                <div className="bg-white p-2.5 rounded-lg border border-emerald-200 bg-emerald-50/20">
                  <span className="text-slate-400 block text-[10px]">税后实发净额</span>
                  <span className="font-bold text-emerald-700 font-mono text-sm">
                    {formatExpenseAmount(activeExpense.amount, activeExpense.currency)}
                  </span>
                </div>
              </div>

              <div className="flex items-center justify-between text-[11px] pt-1 px-1">
                <span className="text-slate-500">员工签收确认状态：</span>
                {activeExpense.salaryDetail.signature ? (
                  <span className="text-emerald-700 font-bold flex items-center gap-1">
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                    员工已在线签署确认 ({activeExpense.salaryDetail.signature})
                  </span>
                ) : (
                  <span className="text-slate-400 font-medium">
                    等待员工在移动端签收
                  </span>
                )}
              </div>
            </div>
          )}

          {/* 基础字段网格 */}
          <div className="grid grid-cols-2 gap-4 text-xs">
            <div>
              <span className="text-slate-400 block mb-0.5">费用名称</span>
              <p className="font-medium text-slate-800 text-xs">{activeExpense.name}</p>
            </div>
            <div>
              <span className="text-slate-400 block mb-0.5">费用类别</span>
              <p className="font-medium text-brand-700 bg-brand-50 border border-brand-200 px-2 py-0.5 rounded-md inline-block">
                {activeExpense.type}
              </p>
            </div>
            <div>
              <span className="text-slate-400 block mb-0.5">费用用途</span>
              <p className="font-medium">
                {activeExpense.purpose === 'advance' ? (
                  <span className="text-purple-700 bg-purple-50 border border-purple-200/60 px-2 py-0.5 rounded-md inline-block">
                    预支
                  </span>
                ) : activeExpense.purpose === 'income' ? (
                  <span className="text-emerald-700 bg-emerald-50 border border-emerald-200/60 px-2 py-0.5 rounded-md inline-block">
                    收入
                  </span>
                ) : (
                  <span className="text-indigo-700 bg-indigo-50 border border-indigo-200/50 px-2 py-0.5 rounded-md inline-block">
                    支出
                  </span>
                )}
              </p>
            </div>
            <div>
              <span className="text-slate-400 block mb-0.5">报销款额支付支持方式</span>
              <p className="text-slate-700">{activeExpense.paymentMethod}</p>
            </div>
            <div>
              <span className="text-slate-400 block mb-0.5">支付时间</span>
              <p className="font-mono text-slate-700">{activeExpense.paymentTime}</p>
            </div>
            <div>
              <span className="text-slate-400 block mb-0.5">报垫支付人 (Payer)</span>
              <p className="text-slate-700">{activeExpense.payerName || "默认管理员"}</p>
            </div>
            <div>
              <span className="text-slate-400 block mb-0.5">指定对账审批人</span>
              <p className="font-medium text-brand-700">
                {activeExpense.targetApproverName && activeExpense.targetApproverId !== -1 ? activeExpense.targetApproverName : "由任意管理层审批"}
              </p>
            </div>
            <div>
              <span className="text-slate-400 block mb-0.5">本单申报单号</span>
              <p className="font-mono text-slate-500">{activeExpense.id}</p>
            </div>
            {activeExpense.status !== 'pending' && (
              <div>
                <span className="text-slate-400 block mb-0.5">实际裁核审批人</span>
                <p className={`font-medium ${activeExpense.status === 'approved' ? 'text-emerald-700' : 'text-rose-700'}`}>
                  {activeExpense.approvedBy || "系统管理员"}
                </p>
              </div>
            )}
          </div>

          {activeExpense.note && (
            <div className="p-3 bg-slate-50 border border-slate-200 rounded-lg text-xs leading-relaxed text-slate-600">
              <span className="text-slate-500 block mb-1 font-medium">明细备注说明：</span>
              {activeExpense.note}
            </div>
          )}

          {activeExpense.approvalNote && (
            <div className={`p-3 border rounded-lg text-xs leading-relaxed ${
              activeExpense.status === 'approved' ? 'bg-emerald-50/10 border-emerald-200 text-emerald-900' :
              'bg-rose-50/10 border-rose-200 text-rose-900'
            }`}>
              <span className="block mb-1 font-medium text-slate-700">核销财务审批意见栏：</span>
              <i>"{activeExpense.approvalNote}"</i>
            </div>
          )}

          {/* 凭证附件 */}
          {!activeExpense.receiptUrl && (
            <div className="bg-slate-50/60 p-3.5 rounded-xl border border-dashed border-slate-200 text-center text-xs text-slate-400 flex items-center justify-center gap-1.5 select-none">
              <FileX className="w-4 h-4 text-slate-300" />
              <span>本记录暂未附带电子票据凭证或员工签名凭照</span>
            </div>
          )}
          {activeExpense.receiptUrl && (
            <div className="bg-slate-50 p-4.5 rounded-xl border border-slate-200">
              <div className="flex justify-between items-center mb-2">
                <span className="text-xs font-bold text-slate-600 flex items-center gap-1">
                  <ImageIcon className="w-3.5 h-3.5 text-brand-600" />
                  上传支付凭证凭照 (只读)
                </span>
                <span className="text-[10px] font-mono text-slate-400 truncate max-w-[200px]" title={activeExpense.receiptName}>
                  {activeExpense.receiptName || "receipt.png"}
                </span>
              </div>
              
              <div className="relative group rounded-lg overflow-hidden border border-slate-200 bg-white aspect-[4/3] max-h-[180px] flex items-center justify-center">
                <img
                  src={activeExpense.receiptUrl}
                  alt={activeExpense.receiptName}
                  className="w-full h-full object-cover group-hover:scale-102 transition duration-200"
                  referrerPolicy="no-referrer"
                />
                <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition duration-150 flex items-center justify-center gap-2">
                  <Button
                    type="button"
                    variant="secondary"
                    size="sm"
                    onClick={() => onPreviewImage(activeExpense.receiptUrl || "")}
                    className="h-7 px-2 text-[10.5px] bg-white text-slate-800 rounded shadow-sm hover:bg-slate-100 font-semibold gap-1"
                  >
                    <Eye className="w-3 h-3" />
                    <span>放大预览</span>
                  </Button>
                  <Button
                    type="button"
                    size="sm"
                    onClick={() => {
                      const link = document.createElement("a");
                      link.href = activeExpense.receiptUrl || "";
                      link.download = activeExpense.receiptName || `receipt_${activeExpense.id}.png`;
                      link.target = "_blank";
                      document.body.appendChild(link);
                      link.click();
                      document.body.removeChild(link);
                    }}
                    className="h-7 px-2 text-[10.5px] bg-brand-600 text-white rounded shadow-sm hover:bg-brand-700 font-semibold gap-1"
                  >
                    <Download className="w-3.5 h-3.5" />
                    <span>下载凭证</span>
                  </Button>
                </div>
              </div>
            </div>
          )}
        </div>

        <DialogFooter className="bg-slate-50 border-t border-slate-200 p-4 flex flex-row justify-between items-center flex-shrink-0">
          <div className="flex gap-2">
            {activeExpense.status === 'pending' && (
              <Button
                type="button"
                size="sm"
                onClick={(e) => { onOpenApproval(activeExpense, e); }}
                className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 active:scale-95 text-white font-bold text-xs gap-1.5 shadow-xs cursor-pointer"
              >
                <ShieldCheck className="w-4 h-4 text-white" />
                <span>去执行审批</span>
              </Button>
            )}
            {activeExpense.status === 'approved' && (
              <Button
                type="button"
                size="sm"
                onClick={(e) => { onRecallApproval(activeExpense, e); }}
                className="px-4 py-1.5 bg-amber-600 hover:bg-amber-700 text-white font-bold text-xs gap-1"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                撤回发放状态
              </Button>
            )}
          </div>
          <Button
            type="button"
            size="sm"
            onClick={onClose}
            className="px-4 py-1.5 bg-slate-800 hover:bg-slate-900 text-white font-bold text-xs"
          >
            确定
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
