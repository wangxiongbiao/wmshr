import React, { useState } from "react";
import { ExpenseRecord } from "../types";
import { Button } from "../../ui/button";
import { Input } from "../../ui/input";
import { Label } from "../../ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "../../ui/dialog";
import { Settings, Plus, Check, X, Edit, Trash2 } from "lucide-react";

interface ExpenseCategoryModalProps {
  open: boolean;
  categories: string[];
  expenses: ExpenseRecord[];
  onClose: () => void;
  onAddCategory: (name: string) => void;
  onUpdateCategory: (index: number, name: string) => void;
  onDeleteCategory: (index: number) => void;
}

export function ExpenseCategoryModal({
  open,
  categories,
  expenses,
  onClose,
  onAddCategory,
  onUpdateCategory,
  onDeleteCategory
}: ExpenseCategoryModalProps) {
  const [newCategoryName, setNewCategoryName] = useState("");
  const [editingCatIndex, setEditingCatIndex] = useState<number | null>(null);
  const [editingCatName, setEditingCatName] = useState("");
  const [confirmDeleteIndex, setConfirmDeleteIndex] = useState<number | null>(null);

  const handleAddSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onAddCategory(newCategoryName);
    setNewCategoryName("");
  };

  const handleSaveEdit = (idx: number) => {
    onUpdateCategory(idx, editingCatName);
    setEditingCatIndex(null);
  };

  return (
    <Dialog open={open} onOpenChange={(isOpen) => { if (!isOpen) { onClose(); setEditingCatIndex(null); setConfirmDeleteIndex(null); } }}>
      <DialogContent className="max-w-3xl max-h-[90vh] p-0 flex flex-col sm:rounded-2xl overflow-hidden [&>button]:text-white [&>button]:hover:text-white [&>button]:top-4 [&>button]:right-5">
        <DialogHeader className="bg-brand-600 text-white px-6 py-4 flex flex-row items-center justify-between space-y-0">
          <DialogTitle className="font-bold text-sm tracking-wide text-white flex items-center gap-2">
            <Settings className="w-5 h-5 text-brand-100" />
            <span>费用类型配置</span>
          </DialogTitle>
          <DialogDescription className="sr-only">管理和自定义系统费用类别</DialogDescription>
        </DialogHeader>

        <div className="p-6 flex-1 overflow-y-auto space-y-5">
          <form onSubmit={handleAddSubmit} className="bg-slate-50 border border-slate-200/60 rounded-xl p-4">
            <Label className="block text-slate-600 font-medium mb-2 text-xs">新增费用核销类型</Label>
            <div className="flex gap-2">
              <Input
                type="text"
                value={newCategoryName}
                onChange={(e) => setNewCategoryName(e.target.value)}
                placeholder="如：仓储代办、物化清退、加急配货费"
                className="flex-1 bg-white text-xs font-normal"
              />
              <Button
                type="submit"
                size="sm"
                className="px-4 py-1.5 bg-brand-600 hover:bg-brand-700 text-white font-semibold text-xs gap-1 shrink-0 cursor-pointer"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>添加</span>
              </Button>
            </div>
          </form>

          <div className="space-y-2">
            <div className="flex justify-between items-center px-1">
              <span className="text-xs font-medium text-slate-500 uppercase tracking-widest">当前可用类别 ({categories.length} 个)</span>
              <span className="text-[10px] text-slate-400">修改文本以直接重命名</span>
            </div>
            <div className="border border-slate-200 rounded-xl overflow-hidden divide-y divide-slate-100 bg-white shadow-3xs max-h-[350px] overflow-y-auto select-none">
              {categories.map((cat, idx) => {
                const count = expenses.filter(exp => exp.type === cat).length;
                const isEditing = editingCatIndex === idx;
                const isConfirmingDelete = confirmDeleteIndex === idx;

                return (
                  <div key={idx} className="p-3 hover:bg-slate-50/50 transition">
                    <div className="flex items-center justify-between">
                      <div className="flex-1 mr-3">
                        {isEditing ? (
                          <div className="flex items-center gap-2">
                            <Input
                              type="text"
                              value={editingCatName}
                              onChange={(e) => setEditingCatName(e.target.value)}
                              className="flex-1 h-8 text-xs font-medium"
                              autoFocus
                              onKeyDown={(e) => {
                                if (e.key === 'Enter') handleSaveEdit(idx);
                                if (e.key === 'Escape') setEditingCatIndex(null);
                              }}
                            />
                            <Button
                              type="button"
                              size="icon"
                              variant="ghost"
                              onClick={() => handleSaveEdit(idx)}
                              className="h-7 w-7 p-1 bg-emerald-500 hover:bg-emerald-600 text-white rounded-lg cursor-pointer"
                              title="保存"
                            >
                              <Check className="w-3.5 h-3.5" />
                            </Button>
                            <Button
                              type="button"
                              size="icon"
                              variant="ghost"
                              onClick={() => setEditingCatIndex(null)}
                              className="h-7 w-7 p-1 bg-slate-200 hover:bg-slate-300 text-slate-600 rounded-lg cursor-pointer"
                              title="取消"
                            >
                              <X className="w-3.5 h-3.5" />
                            </Button>
                          </div>
                        ) : (
                          <div 
                            onClick={() => {
                              setEditingCatIndex(idx);
                              setEditingCatName(cat);
                              setConfirmDeleteIndex(null);
                            }}
                            className="font-medium text-xs text-slate-700 hover:text-brand-600 transition cursor-pointer flex items-center gap-1.5 group py-1"
                            title="点击进行编辑修改"
                          >
                            <span>{cat}</span>
                            <Edit className="w-3 h-3 text-slate-400 opacity-0 group-hover:opacity-100 transition-opacity" />
                          </div>
                        )}
                      </div>

                      <div className="flex items-center gap-3">
                        <span className="text-[10px] font-normal px-2 py-0.5 rounded-full bg-slate-100 text-slate-500 shrink-0">
                          {count} 笔记录
                        </span>
                        {!isEditing && !isConfirmingDelete && (
                          <Button
                            type="button"
                            size="icon"
                            variant="ghost"
                            onClick={() => setConfirmDeleteIndex(idx)}
                            className="h-7 w-7 p-1 hover:bg-rose-50 text-slate-400 hover:text-rose-500 rounded-lg cursor-pointer btn-delete-cat" data-cat={cat}
                            title="删除此类型"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </Button>
                        )}
                      </div>
                    </div>

                    {/* 非阻塞内联二次确认条 */}
                    {isConfirmingDelete && (
                      <div className="mt-2 p-2 bg-rose-50/80 border border-rose-200 rounded-lg flex items-center justify-between text-xs animate-in fade-in duration-150">
                        <span className="text-rose-700 font-medium">
                          {count > 0 ? `有 ${count} 笔历史单据使用该类型，确认删除？` : `确认删除该类型？`}
                        </span>
                        <div className="flex items-center gap-1.5">
                          <Button
                            type="button"
                            size="sm"
                            variant="destructive"
                            onClick={() => {
                              onDeleteCategory(idx);
                              setConfirmDeleteIndex(null);
                            }}
                            className="h-6 px-2 text-[11px] font-bold cursor-pointer"
                          >
                            确认删除
                          </Button>
                          <Button
                            type="button"
                            size="sm"
                            variant="ghost"
                            onClick={() => setConfirmDeleteIndex(null)}
                            className="h-6 px-2 text-[11px] text-slate-600 hover:bg-slate-200 cursor-pointer"
                          >
                            取消
                          </Button>
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        <DialogFooter className="bg-slate-50 border-t border-slate-200 p-4 flex flex-row justify-end">
          <Button
            type="button"
            variant="default"
            size="sm"
            onClick={() => {
              onClose();
              setEditingCatIndex(null);
              setConfirmDeleteIndex(null);
            }}
            className="px-5 py-1.5 bg-slate-800 hover:bg-slate-900 font-extrabold text-white text-xs shadow-3xs cursor-pointer"
          >
            保存
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
