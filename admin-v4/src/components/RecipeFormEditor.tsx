import React, { useState } from "react";
import { RecipeIngredient, RecipeEquipment, RecipeReminders } from "../types";
import { Plus, Trash2, HelpCircle, Utensils, Shield, Sparkles, Image as ImageIcon, Link, Check, RefreshCw, Upload } from "lucide-react";

interface RecipeFormEditorProps {
  recipeCode: string;
  setRecipeCode: (val: string) => void;
  recipeCompany: string;
  setRecipeCompany: (val: string) => void;
  recipeIngredients: RecipeIngredient[];
  setRecipeIngredients: React.Dispatch<React.SetStateAction<RecipeIngredient[]>>;
  recipeEquipment: RecipeEquipment[];
  setRecipeEquipment: React.Dispatch<React.SetStateAction<RecipeEquipment[]>>;
  recipeReminders: RecipeReminders;
  setRecipeReminders: React.Dispatch<React.SetStateAction<RecipeReminders>>;
  recipeSteps: string[];
  setRecipeSteps: React.Dispatch<React.SetStateAction<string[]>>;
  isEdit?: boolean;
  recipeImages?: string[];
  setRecipeImages?: React.Dispatch<React.SetStateAction<string[]>>;
}

export function RecipeFormEditor({
  recipeCode,
  setRecipeCode,
  recipeCompany,
  setRecipeCompany,
  recipeIngredients,
  setRecipeIngredients,
  recipeEquipment,
  setRecipeEquipment,
  recipeReminders,
  setRecipeReminders,
  recipeSteps,
  setRecipeSteps,
  isEdit = false,
  recipeImages = [],
  setRecipeImages,
}: RecipeFormEditorProps) {
  
  // Local state for image custom input
  const [customImgUrl, setCustomImgUrl] = useState("");
  const [showImgSelector, setShowImgSelector] = useState(false);
  const [isDragging, setIsDragging] = useState(false);

  // Handle local file upload
  const handleLocalImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        if (typeof reader.result === "string" && setRecipeImages) {
          setRecipeImages([reader.result]);
        }
      };
      reader.readAsDataURL(file);
    }
  };

  // Handle drag and drop
  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = () => {
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files?.[0];
    if (file && file.type.startsWith("image/")) {
      const reader = new FileReader();
      reader.onloadend = () => {
        if (typeof reader.result === "string" && setRecipeImages) {
          setRecipeImages([reader.result]);
        }
      };
      reader.readAsDataURL(file);
    }
  };

  // Handle paste events (copied image files directly pasted)
  const handlePasteImage = (e: React.ClipboardEvent) => {
    const items = e.clipboardData?.items;
    if (items) {
      for (let i = 0; i < items.length; i++) {
        if (items[i].type.indexOf("image") !== -1) {
          const file = items[i].getAsFile();
          if (file) {
            const reader = new FileReader();
            reader.onloadend = () => {
              if (typeof reader.result === "string" && setRecipeImages) {
                setRecipeImages([reader.result]);
              }
            };
            reader.readAsDataURL(file);
            e.preventDefault();
            break;
          }
        }
      }
    }
  };

  // Preset food image resources with high-quality descriptions
  const PRESET_FOOD_IMAGES = [
    { name: "酸辣土豆丝/丝状炒菜", url: "https://images.unsplash.com/photo-1590059005116-bbccabf51259?auto=format&fit=crop&q=80&w=600" },
    { name: "红烧肉/梅菜扣肉", url: "https://images.unsplash.com/photo-1544025162-d76694265947?auto=format&fit=crop&q=80&w=600" },
    { name: "卤肉鸳鸯蛋/红烧鸡腿", url: "https://images.unsplash.com/photo-1601050690597-df056fb4ce78?auto=format&fit=crop&q=80&w=600" },
    { name: "清蒸鱼/海鲜鱼汤", url: "https://images.unsplash.com/photo-1578575437130-527eed3abbec?auto=format&fit=crop&q=80&w=600" },
    { name: "广式点心/蒸饺馒头", url: "https://images.unsplash.com/photo-1563245372-f21724e3856d?auto=format&fit=crop&q=80&w=600" },
    { name: "家常蔬菜/轻食沙拉", url: "https://images.unsplash.com/photo-1540420773420-3366772f4999?auto=format&fit=crop&q=80&w=600" },
    { name: "热气汤羹/炖汤砂锅", url: "https://images.unsplash.com/photo-1547592180-85f173990554?auto=format&fit=crop&q=80&w=600" },
  ];
  
  // Local states for quickly typing an ingredient and appending
  const [newIngName, setNewIngName] = useState("");
  const [newIngCategory, setNewIngCategory] = useState<'主料' | '配料' | '调料'>('主料');
  const [newIngWeight, setNewIngWeight] = useState("");
  const [ingError, setIngError] = useState(false);

  // Local states for equipment
  const [newEqName, setNewEqName] = useState("");
  const [newEqSpec, setNewEqSpec] = useState("");
  const [newEqQty, setNewEqQty] = useState("");

  // Local state for step
  const [newStepText, setNewStepText] = useState("");
  const [stepError, setStepError] = useState(false);

  const handleAddIngredient = () => {
    if (!newIngName.trim()) {
      setIngError(true);
      setTimeout(() => setIngError(false), 2000);
      return;
    }
    setIngError(false);
    const newItem: RecipeIngredient = {
      id: Date.now() + Math.random(),
      name: newIngName.trim(),
      category: newIngCategory,
      weight: newIngWeight.trim() || "适量"
    };
    setRecipeIngredients(prev => [...prev, newItem]);
    setNewIngName("");
    setNewIngWeight("");
  };

  const handleRemoveIngredient = (id: number) => {
    setRecipeIngredients(prev => prev.filter(item => item.id !== id));
  };

  const handleAddEquipment = () => {
    if (!newEqName.trim()) return;
    const newItem: RecipeEquipment = {
      name: newEqName.trim(),
      spec: newEqSpec.trim() || "通用标准",
      qty: newEqQty.trim() || "1台"
    };
    setRecipeEquipment(prev => [...prev, newItem]);
    setNewEqName("");
    setNewEqSpec("");
    setNewEqQty("");
  };

  const handleRemoveEquipment = (index: number) => {
    setRecipeEquipment(prev => prev.filter((_, idx) => idx !== index));
  };

  const handleAddStep = () => {
    if (!newStepText.trim()) {
      setStepError(true);
      setTimeout(() => setStepError(false), 2000);
      return;
    }
    setStepError(false);
    setRecipeSteps(prev => [...prev, newStepText.trim()]);
    setNewStepText("");
  };

  const handleRemoveStep = (index: number) => {
    setRecipeSteps(prev => prev.filter((_, idx) => idx !== index));
  };

  return (
    <div className="space-y-5 border border-slate-200 bg-slate-50/30 rounded-2xl p-4 md:p-5 text-sm">
      
      {/* Code & Studio Metadata hidden per user request */}

      {/* Ingredients Grid (Table builder) */}
      <div className="space-y-2">
        <div className="flex justify-between items-center bg-slate-50 p-2 rounded-lg border border-slate-100">
          <span className="font-bold text-slate-700 flex items-center gap-1.5">
            <Utensils className="w-4 h-4 text-orange-500" />
            <span>材料配量表</span>
          </span>
          <span className="text-[10px] text-slate-400 font-bold font-mono">
            已录入 {recipeIngredients.length} 项
          </span>
        </div>

        {/* Existing table inputs preview */}
        {recipeIngredients.length > 0 ? (
          <div className="border border-slate-200 rounded-xl overflow-hidden shadow-xs bg-white">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-100/80 text-xs font-bold text-slate-600 border-b border-slate-200">
                  <th className="px-4 py-2.5 text-center w-16 select-none">序号</th>
                  <th className="px-4 py-2.5 text-left">材料名称</th>
                  <th className="px-4 py-2.5 text-center w-28">类型</th>
                  <th className="px-4 py-2.5 text-right w-40">重量</th>
                  <th className="px-4 py-2.5 text-center w-16">操作</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-sm">
                {recipeIngredients.map((item, idx) => (
                  <tr key={item.id} className="hover:bg-slate-50/40 transition-colors">
                    <td className="px-4 py-3 text-center font-mono text-slate-400 text-xs select-none">
                      {idx + 1}
                    </td>
                    <td className="px-4 py-2 font-bold text-slate-800">
                      <input 
                        type="text" 
                        value={item.name}
                        onChange={(e) => {
                          const name = e.target.value;
                          setRecipeIngredients(prev => prev.map(old => old.id === item.id ? { ...old, name } : old));
                        }}
                        className="bg-transparent border border-transparent hover:border-slate-200 focus:bg-slate-50 px-2 py-1 rounded-md w-full text-sm font-bold text-slate-800 transition-all focus:ring-2 focus:ring-indigo-100 focus:border-indigo-400 outline-none"
                      />
                    </td>
                    <td className="px-4 py-2 text-center">
                      <select 
                        value={item.category}
                        onChange={(e) => {
                          const category = e.target.value as '主料' | '配料' | '调料';
                          setRecipeIngredients(prev => prev.map(old => old.id === item.id ? { ...old, category } : old));
                        }}
                        className="px-2.5 py-1 bg-slate-50 text-xs rounded-md border border-slate-200 font-bold cursor-pointer text-slate-700 focus:ring-2 focus:ring-indigo-100 focus:border-indigo-400 w-full text-center hover:bg-slate-100/70 transition-all outline-none"
                      >
                        <option value="主料">主料 🥩</option>
                        <option value="配料">配料 🥬</option>
                        <option value="调料">调料 🍶</option>
                      </select>
                    </td>
                    <td className="px-4 py-2 text-right">
                      <div className="flex items-center justify-end gap-1">
                        <input 
                          type="text" 
                          value={item.weight}
                          placeholder="数量 / 重量"
                          onChange={(e) => {
                            const weight = e.target.value;
                            setRecipeIngredients(prev => prev.map(old => old.id === item.id ? { ...old, weight } : old));
                          }}
                          className="bg-transparent border border-transparent hover:border-slate-200 focus:bg-slate-50 px-2 py-1 rounded-md w-28 text-right font-extrabold text-sm text-slate-700 font-mono transition-all focus:ring-2 focus:ring-indigo-100 focus:border-indigo-400 outline-none"
                        />
                      </div>
                    </td>
                    <td className="px-4 py-2 text-center">
                      <button
                        type="button"
                        onClick={() => handleRemoveIngredient(item.id)}
                        className="text-red-500 hover:text-red-700 p-1.5 rounded-lg hover:bg-red-50 transition-all inline-flex items-center justify-center"
                        title="移除此配料"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : null}

        {/* Action input bar */}
        <div className="bg-slate-50 p-2.5 rounded-xl border border-slate-200 flex flex-wrap sm:flex-nowrap items-center gap-2">
          <input
            type="text"
            placeholder={ingError ? "⚠️ 请输入食材名称" : "食材名称"}
            value={newIngName}
            onChange={(e) => {
              setNewIngName(e.target.value);
              if (e.target.value.trim()) setIngError(false);
            }}
            className={`flex-1 px-3 py-1.5 border rounded-lg outline-none transition-all duration-200 ${
              ingError
                ? "border-red-400 bg-red-50 placeholder-red-400 focus:ring-1 focus:ring-red-500 text-red-900 font-bold"
                : "border-slate-205 border-slate-200 bg-white focus:ring-1 focus:ring-indigo-500"
            }`}
            onKeyDown={(e) => {
              if (e.key === 'Enter') { e.preventDefault(); handleAddIngredient(); }
            }}
          />
          <select
            value={newIngCategory}
            onChange={(e) => setNewIngCategory(e.target.value as any)}
            className="w-24 px-2 py-1.5 border border-slate-200 bg-white rounded-lg text-slate-650 outline-none focus:ring-1 focus:ring-indigo-500 font-bold"
          >
            <option value="主料 font-bold">主料 🥩</option>
            <option value="配料 font-bold">配料 🥬</option>
            <option value="调料 font-bold">调料 🍶</option>
          </select>
          <div className="relative flex items-center shrink-0">
            <input
              type="text"
              placeholder="重量 / 用量"
              value={newIngWeight}
              onChange={(e) => setNewIngWeight(e.target.value)}
              className="w-32 px-3 py-1.5 border border-slate-200 bg-white rounded-lg outline-none focus:ring-1 focus:ring-indigo-500 text-right font-mono"
              onKeyDown={(e) => {
                if (e.key === 'Enter') { e.preventDefault(); handleAddIngredient(); }
              }}
            />
          </div>
          <button
            type="button"
            onClick={handleAddIngredient}
            className="px-3.5 py-1.5 font-bold text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg transition shrink-0 flex items-center gap-1 shadow-sm"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>添加材料</span>
          </button>
        </div>
      </div>

      {/* Equipments & Tools builder */}
      <div className="space-y-2">
        <span className="font-extrabold text-slate-700 block flex items-center gap-1.5 bg-slate-50 p-2 rounded-lg border border-slate-100">
          <Shield className="w-4 h-4 text-emerald-600" />
          <span>使用设备、工具点检配置</span>
        </span>
        
        {recipeEquipment.length > 0 ? (
          <div className="border border-slate-200 rounded-xl overflow-hidden bg-white shadow-xs">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50 text-[10px] font-extrabold text-slate-500 border-b border-slate-150">
                  <th className="px-3 py-1.5">设备/硬件名称</th>
                  <th className="px-3 py-1.5">技术规格/型号</th>
                  <th className="px-3 py-1.5 text-center w-20 font-bold">所需数目</th>
                  <th className="px-3 py-1.5 text-center w-12">操作</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-[11px]">
                {recipeEquipment.map((eq, index) => (
                  <tr key={index} className="hover:bg-slate-50/50">
                    <td className="px-3 py-1.5 font-bold text-slate-800">
                      <input 
                        type="text" 
                        value={eq.name}
                        onChange={(e) => {
                          const name = e.target.value;
                          setRecipeEquipment(prev => prev.map((old, oldIdx) => oldIdx === index ? { ...old, name } : old));
                        }}
                        className="bg-transparent border border-transparent hover:border-slate-200 focus:bg-slate-50 rounded px-1.5 py-0.5 w-full font-bold text-slate-800 outline-none"
                      />
                    </td>
                    <td className="px-3 py-1.5">
                      <input 
                        type="text" 
                        value={eq.spec}
                        placeholder="通用标准"
                        onChange={(e) => {
                          const spec = e.target.value;
                          setRecipeEquipment(prev => prev.map((old, oldIdx) => oldIdx === index ? { ...old, spec } : old));
                        }}
                        className="bg-transparent border border-transparent hover:border-slate-200 focus:bg-slate-50 rounded px-1.5 py-0.5 w-full text-slate-500 outline-none"
                      />
                    </td>
                    <td className="px-3 py-1.5 text-center font-bold">
                      <input 
                        type="text" 
                        value={eq.qty}
                        onChange={(e) => {
                          const qty = e.target.value;
                          setRecipeEquipment(prev => prev.map((old, oldIdx) => oldIdx === index ? { ...old, qty } : old));
                        }}
                        className="bg-transparent border border-transparent hover:border-slate-200 focus:bg-slate-50 text-center font-mono rounded px-1.5 py-0.5 w-full font-bold text-slate-700 outline-none"
                      />
                    </td>
                    <td className="px-3 py-1.5 text-center">
                      <button
                        type="button"
                        onClick={() => handleRemoveEquipment(index)}
                        className="text-red-400 hover:text-red-650 p-1 rounded-md hover:bg-red-50/50"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : null}

        {/* Quick adding bar */}
        <div className="bg-slate-50 p-2 rounded-xl border border-slate-200 flex flex-wrap sm:flex-nowrap gap-2 items-center">
          <input
            type="text"
            placeholder="设备名 (如 慢炖煲/压力笼)"
            value={newEqName}
            onChange={(e) => setNewEqName(e.target.value)}
            className="flex-1 px-3 py-1.5 border border-slate-200 bg-white rounded-lg outline-none focus:ring-1 focus:ring-indigo-500 text-xs font-bold"
            onKeyDown={(e) => {
              if (e.key === 'Enter') { e.preventDefault(); handleAddEquipment(); }
            }}
          />
          <input
            type="text"
            placeholder="规格 (如 15k-W或通用)"
            value={newEqSpec}
            onChange={(e) => setNewEqSpec(e.target.value)}
            className="w-36 px-3 py-1.5 border border-slate-200 bg-white rounded-lg outline-none focus:ring-1 focus:ring-indigo-500 text-xs font-bold"
            onKeyDown={(e) => {
              if (e.key === 'Enter') { e.preventDefault(); handleAddEquipment(); }
            }}
          />
          <input
            type="text"
            placeholder="数量 (如 1台)"
            value={newEqQty}
            onChange={(e) => setNewEqQty(e.target.value)}
            className="w-20 px-3 py-1.5 border border-slate-200 bg-white rounded-lg outline-none focus:ring-1 focus:ring-indigo-500 text-xs text-center font-mono"
            onKeyDown={(e) => {
              if (e.key === 'Enter') { e.preventDefault(); handleAddEquipment(); }
            }}
          />
          <button
            type="button"
            onClick={handleAddEquipment}
            className="px-3.5 py-1.5 font-bold text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg transition shrink-0 flex items-center gap-1 shadow-sm text-xs"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>添加</span>
          </button>
        </div>
      </div>

      {/* Recipe Standard Reference Photo Section */}
      <div className="space-y-3 bg-indigo-50/20 border border-slate-200 rounded-2xl p-4">
        <span className="font-extrabold text-slate-700 block flex items-center gap-1.5">
          <ImageIcon className="w-4 h-4 text-indigo-600" />
          <span>菜谱参考图</span>
        </span>

        <div className="grid grid-cols-1 md:grid-cols-12 gap-4">
          {/* Current thumbnail on left (4 columns) - Supports drag & drop */}
          <div className="md:col-span-4">
            <div 
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onDrop={handleDrop}
              className={`border rounded-xl p-1.5 h-full flex flex-col items-center justify-center min-h-[140px] shadow-xs relative group overflow-hidden transition-all ${
                isDragging 
                  ? "border-dashed border-2 border-indigo-500 bg-indigo-50/55 scale-[1.02]" 
                  : "border-slate-250 bg-white"
              }`}
            >
              {isDragging ? (
                <div className="text-center p-3 pointer-events-none">
                  <span className="text-3xl block animate-bounce">📥</span>
                  <span className="text-xs font-black text-indigo-700">松开鼠标上传图片</span>
                </div>
              ) : recipeImages && recipeImages[0] ? (
                <>
                  <img 
                    src={recipeImages[0]} 
                    alt="菜谱成品预览" 
                    className="w-full h-28 object-cover rounded-lg"
                    referrerPolicy="no-referrer"
                  />
                  <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                    <button
                      type="button"
                      onClick={() => setRecipeImages?.([])}
                      className="p-1.5 px-3 bg-red-600 hover:bg-red-700 text-white font-extrabold rounded-lg text-xs shadow-md transition cursor-pointer"
                    >
                      删除图片
                    </button>
                  </div>
                  <span className="text-[10px] text-slate-400 mt-1.5 font-medium font-mono">参考效果图</span>
                </>
              ) : (
                <div className="text-center p-3 text-slate-400 select-none">
                  <span className="text-2xl block mb-0.5">🥘</span>
                  <span className="text-[10px] font-bold text-slate-400 leading-none">暂无效果图 (可拖拽至此)</span>
                </div>
              )}
            </div>
          </div>

          {/* Picture setting options on right (8 columns) */}
          <div className="md:col-span-8 space-y-2" onPaste={handlePasteImage}>
            <span className="text-xs font-black text-slate-600 block flex items-center gap-1">
              <span>🖼️ 设定菜谱效果图</span>
            </span>

            {/* Local File Upload Button Area */}
            <div className="grid grid-cols-1 gap-2">
              <label className="border border-dashed border-indigo-200 hover:border-indigo-400 bg-indigo-50/10 hover:bg-indigo-50/30 rounded-lg p-3 flex items-center justify-center gap-2 cursor-pointer transition text-xs font-bold text-indigo-700">
                <Upload className="w-4 h-4 text-indigo-600 animate-pulse" />
                <span>点击选择本地图片上传 (支持 Ctrl+V 粘贴)</span>
                <input
                  type="file"
                  accept="image/*"
                  onChange={handleLocalImageUpload}
                  className="hidden"
                />
              </label>
            </div>

            <div className="pt-0.5">
              <div className="flex justify-between items-center mb-1 bg-slate-100/50 p-1 px-2 rounded">
                <span className="text-[10px] text-slate-500 font-bold">✨ 常用预设图片推荐：</span>
                <button
                  type="button"
                  onClick={() => setShowImgSelector(!showImgSelector)}
                  className="text-[10px] text-indigo-600 hover:underline font-bold flex items-center gap-0.5"
                >
                  <RefreshCw className="w-3 h-3" />
                  {showImgSelector ? "收起" : "展开快捷模板"}
                </button>
              </div>

              {(!recipeImages || recipeImages.length === 0 || showImgSelector) && (
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-1.5 max-h-[140px] overflow-y-auto p-1 bg-white border border-slate-200 rounded-lg">
                  {PRESET_FOOD_IMAGES.map((preset, pIdx) => (
                    <button
                      key={pIdx}
                      type="button"
                      onClick={() => setRecipeImages?.([preset.url])}
                      className="p-1 border border-slate-100 hover:border-indigo-400 hover:bg-indigo-50/30 text-left rounded-lg group transition flex items-center gap-1.5 text-[10px]"
                    >
                      <img 
                        src={preset.url} 
                        alt="" 
                        className="w-7 h-7 object-cover rounded" 
                        referrerPolicy="no-referrer"
                      />
                      <span className="text-slate-600 font-bold truncate group-hover:text-indigo-800 flex-1">{preset.name.split("/")[0]}</span>
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Warnings & Requirements Box */}
      <div className="space-y-3 bg-amber-50/50 rounded-xl p-4 border border-amber-200">
        <span className="font-extrabold text-amber-900 text-sm flex items-center gap-1.5">
          <Sparkles className="w-4 h-4 text-amber-500 animate-pulse" />
          <span>时效及安全提醒</span>
        </span>
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="space-y-1.5">
            <span className="text-xs font-bold text-slate-500">熟成总时长:</span>
            <input
              type="text"
              placeholder="如：蒸15-20分钟"
              value={recipeReminders.time || ""}
              onChange={(e) => setRecipeReminders(prev => ({ ...prev, time: e.target.value }))}
              className="w-full px-3 py-2 border border-slate-200 bg-white rounded-lg outline-none focus:ring-2 focus:ring-indigo-100 focus:border-indigo-400 text-sm font-bold text-slate-800 transition-all"
            />
          </div>
          <div className="space-y-1.5">
            <span className="text-xs font-bold text-slate-500">切配工艺:</span>
            <input
              type="text"
              placeholder="如：切丝 / 切片"
              value={recipeReminders.cutStyle || ""}
              onChange={(e) => setRecipeReminders(prev => ({ ...prev, cutStyle: e.target.value }))}
              className="w-full px-3 py-2 border border-slate-200 bg-white rounded-lg outline-none focus:ring-2 focus:ring-indigo-100 focus:border-indigo-400 text-sm font-bold text-slate-800 transition-all"
            />
          </div>
          <div className="space-y-1.5">
            <span className="text-xs font-bold text-slate-500">安全与留样提醒:</span>
            <input
              type="text"
              placeholder="如：生熟隔离，足额留样"
              value={recipeReminders.info || ""}
              onChange={(e) => setRecipeReminders(prev => ({ ...prev, info: e.target.value }))}
              className="w-full px-3 py-2 border border-slate-200 bg-white rounded-lg outline-none focus:ring-2 focus:ring-indigo-100 focus:border-indigo-400 text-sm font-bold text-red-950 bg-red-50/20 border-red-200/50 transition-all"
            />
          </div>
        </div>
      </div>

      {/* Production Steps */}
      <div className="space-y-3">
        <span className="font-bold text-slate-800 text-sm flex items-center gap-2 bg-slate-50 p-2 rounded-lg border border-slate-100">
          <span className="bg-indigo-100 rounded-lg w-5.5 h-5.5 flex items-center justify-center font-bold font-mono text-indigo-700 text-xs">✔</span>
          <span>制作步骤</span>
        </span>

        {recipeSteps.length > 0 ? (
          <div className="space-y-2">
            {recipeSteps.map((step, idx) => (
              <div key={idx} className="flex gap-3 items-center bg-white p-2.5 rounded-xl border border-slate-200 text-sm font-bold text-slate-700 hover:border-indigo-300 hover:shadow-xs transition-all duration-150">
                <span className="font-mono bg-indigo-50 border border-indigo-100 text-indigo-700 w-6 h-6 flex items-center justify-center rounded-lg font-extrabold shrink-0 text-xs select-none">
                  {idx + 1}
                </span>
                <input
                  type="text"
                  value={step}
                  onChange={(e) => {
                    const text = e.target.value;
                    setRecipeSteps(prev => prev.map((old, oldIdx) => oldIdx === idx ? text : old));
                  }}
                  className="flex-1 bg-transparent border-0 p-0 font-bold focus:ring-0 outline-none text-slate-800 text-sm"
                />
                <button
                  type="button"
                  onClick={() => handleRemoveStep(idx)}
                  className="text-slate-400 hover:text-red-500 transition-all p-1.5 rounded-lg hover:bg-red-50/50"
                  title="删除本流程"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            ))}
          </div>
        ) : null}

        <div className="bg-slate-50 p-2.5 rounded-xl border border-slate-200 flex gap-2 items-center">
          <input
            type="text"
            placeholder={stepError ? "⚠️ 请输入步骤描述" : "填写新的一步流程描述..."}
            value={newStepText}
            onChange={(e) => {
              setNewStepText(e.target.value);
              if (e.target.value.trim()) setStepError(false);
            }}
            className={`flex-1 px-3 py-2 border rounded-lg outline-none transition-all duration-200 shrink text-sm ${
              stepError
                ? "border-red-400 bg-red-50 placeholder-red-400 focus:ring-1 focus:ring-red-500 text-red-900 font-bold"
                : "border-slate-200 bg-white focus:ring-1 focus:ring-indigo-500 font-bold text-slate-800"
            }`}
            onKeyDown={(e) => {
              if (e.key === 'Enter') { e.preventDefault(); handleAddStep(); }
            }}
          />
          <button
            type="button"
            onClick={handleAddStep}
            className="px-4 py-2 font-bold text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg transition shrink-0 shadow-sm flex items-center gap-1 text-sm"
          >
            <Plus className="w-4 h-4" />
            <span>添加步骤</span>
          </button>
        </div>
      </div>

    </div>
  );
}
