import { useState } from "react";
import { ApprovalFlowConfig, ApprovalFlowType } from "../types";
import { DEFAULT_APPROVAL_FLOW_CONFIG } from "../constants";

const STORAGE_KEY = "wms_approval_flow_config";

export function useApprovalFlowConfig(addToast: (msg: string, kind?: "success" | "error" | "info") => void) {
  const [isApprovalFlowOpen, setIsApprovalFlowOpen] = useState(false);
  const [approvalFlowConfig, setApprovalFlowConfig] = useState<ApprovalFlowConfig>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) return JSON.parse(saved);
    } catch {
      // ignore parse error
    }
    return DEFAULT_APPROVAL_FLOW_CONFIG;
  });

  const [newPayoutStepName, setNewPayoutStepName] = useState("");
  const [newIncomeStepName, setNewIncomeStepName] = useState("");
  const [editingStepType, setEditingStepType] = useState<ApprovalFlowType | null>(null);
  const [editingStepIndex, setEditingStepIndex] = useState<number | null>(null);
  const [editingStepValue, setEditingStepValue] = useState("");

  const saveApprovalFlowConfig = (newConfig: ApprovalFlowConfig) => {
    setApprovalFlowConfig(newConfig);
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(newConfig));
    } catch (e) {
      console.error("Failed to save approval flow config", e);
    }
  };

  const handleAddStep = (type: ApprovalFlowType) => {
    const stepName = type === 'payout' ? newPayoutStepName.trim() : newIncomeStepName.trim();
    if (!stepName) {
      addToast("步骤名称不能为空", "error");
      return;
    }
    const currentSteps = [...approvalFlowConfig[type].steps];
    if (currentSteps.includes(stepName)) {
      addToast("该审批步骤名称已存在", "info");
      return;
    }
    
    const updatedSteps = [...currentSteps];
    const finishIndex = updatedSteps.indexOf("完成");
    if (finishIndex > -1) {
      updatedSteps.splice(finishIndex, 0, stepName);
    } else {
      updatedSteps.push(stepName);
    }

    const newConfig: ApprovalFlowConfig = {
      ...approvalFlowConfig,
      [type]: {
        ...approvalFlowConfig[type],
        steps: updatedSteps
      }
    };
    saveApprovalFlowConfig(newConfig);
    if (type === 'payout') setNewPayoutStepName("");
    else setNewIncomeStepName("");
    addToast(`已添加审批环节: ${stepName}`, "success");
  };

  const handleDeleteStep = (type: ApprovalFlowType, index: number) => {
    const currentSteps = [...approvalFlowConfig[type].steps];
    if (currentSteps.length <= 1) {
      addToast("最少必须保留一个审批环节", "info");
      return;
    }
    const removedName = currentSteps[index];
    currentSteps.splice(index, 1);
    const newConfig: ApprovalFlowConfig = {
      ...approvalFlowConfig,
      [type]: {
        ...approvalFlowConfig[type],
        steps: currentSteps
      }
    };
    saveApprovalFlowConfig(newConfig);
    addToast(`已删除环节: ${removedName}`, "success");
  };

  const handleMoveStep = (type: ApprovalFlowType, index: number, direction: 'up' | 'down') => {
    const currentSteps = [...approvalFlowConfig[type].steps];
    const targetIndex = direction === 'up' ? index - 1 : index + 1;
    if (targetIndex < 0 || targetIndex >= currentSteps.length) return;
    
    const temp = currentSteps[index];
    currentSteps[index] = currentSteps[targetIndex];
    currentSteps[targetIndex] = temp;

    const newConfig: ApprovalFlowConfig = {
      ...approvalFlowConfig,
      [type]: {
        ...approvalFlowConfig[type],
        steps: currentSteps
      }
    };
    saveApprovalFlowConfig(newConfig);
  };

  const handleStartEditStep = (type: ApprovalFlowType, index: number, value: string) => {
    setEditingStepType(type);
    setEditingStepIndex(index);
    setEditingStepValue(value);
  };

  const handleSaveEditStep = () => {
    if (!editingStepType || editingStepIndex === null) return;
    const trimmed = editingStepValue.trim();
    if (!trimmed) {
      addToast("步骤名称不能为空", "error");
      return;
    }
    const currentSteps = [...approvalFlowConfig[editingStepType].steps];
    currentSteps[editingStepIndex] = trimmed;
    
    const newConfig: ApprovalFlowConfig = {
      ...approvalFlowConfig,
      [editingStepType]: {
        ...approvalFlowConfig[editingStepType],
        steps: currentSteps
      }
    };
    saveApprovalFlowConfig(newConfig);
    setEditingStepType(null);
    setEditingStepIndex(null);
    setEditingStepValue("");
    addToast("审批环节重命名成功", "success");
  };

  const handleToggleFlow = (type: ApprovalFlowType) => {
    const newConfig: ApprovalFlowConfig = {
      ...approvalFlowConfig,
      [type]: {
        ...approvalFlowConfig[type],
        enabled: !approvalFlowConfig[type].enabled
      }
    };
    saveApprovalFlowConfig(newConfig);
    addToast(`${type === 'payout' ? '支出' : '收入'}审批流程已${newConfig[type].enabled ? '开启' : '关闭'}`, "info");
  };

  return {
    isApprovalFlowOpen,
    setIsApprovalFlowOpen,
    approvalFlowConfig,
    newPayoutStepName,
    setNewPayoutStepName,
    newIncomeStepName,
    setNewIncomeStepName,
    editingStepType,
    editingStepIndex,
    editingStepValue,
    setEditingStepValue,
    handleAddStep,
    handleDeleteStep,
    handleMoveStep,
    handleStartEditStep,
    handleSaveEditStep,
    handleToggleFlow
  };
}
