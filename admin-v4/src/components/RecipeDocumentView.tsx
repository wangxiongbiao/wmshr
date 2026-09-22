import React, { useState } from "react";
import { SopDocument } from "../types";
import { 
  ChefHat, 
  Utensils, 
  Clock, 
  Sparkles, 
  AlertTriangle, 
  Flame, 
  Scissors,
  Check,
  CheckSquare,
  Square,
  CheckCircle,
  Circle
} from "lucide-react";

interface RecipeDocumentViewProps {
  sop: SopDocument;
  id?: string;
  isMobile?: boolean;
}

export function RecipeDocumentView({ sop, id, isMobile = false }: RecipeDocumentViewProps) {
  const [activeTab, setActiveTab] = useState<'prep' | 'steps'>('prep');
  const [checkedIngredients, setCheckedIngredients] = useState<Record<number, boolean>>({});
  const [checkedEquipment, setCheckedEquipment] = useState<Record<number, boolean>>({});
  const [checkedSteps, setCheckedSteps] = useState<Record<number, boolean>>({});

  const ingredients = sop.recipeIngredients || [];
  const equipment = sop.recipeEquipment || [];
  const reminders = sop.recipeReminders || {};
  const steps = sop.recipeSteps || [];

  const toggleIngredient = (idx: number) => {
    setCheckedIngredients(prev => ({ ...prev, [idx]: !prev[idx] }));
  };

  const toggleEquipment = (idx: number) => {
    setCheckedEquipment(prev => ({ ...prev, [idx]: !prev[idx] }));
  };

  const toggleStep = (idx: number) => {
    setCheckedSteps(prev => ({ ...prev, [idx]: !prev[idx] }));
  };

  if (isMobile) {
    const totalPrepItems = ingredients.length + equipment.length;
    const checkedPrepCount = 
      Object.values(checkedIngredients).filter(Boolean).length + 
      Object.values(checkedEquipment).filter(Boolean).length;
    
    const stepsCount = steps.length;
    const checkedStepsCount = Object.values(checkedSteps).filter(Boolean).length;

    return (
      <div id={id || `recipe-view-${sop.id}`} className="space-y-4 font-sans text-slate-800 pb-4 select-text">
        {/* 2. Custom Interactive Tabs Bar */}
        <div className="bg-slate-100 p-1 rounded-xl flex gap-1.5 shadow-2xs border border-slate-200/50">
          <button
            type="button"
            onClick={() => setActiveTab('prep')}
            className={`flex-1 py-2.5 px-3 rounded-lg font-black text-xs transition duration-150 flex items-center justify-center gap-1.5 cursor-pointer border-0 ${
              activeTab === 'prep'
                ? "bg-white text-indigo-950 shadow-sm"
                : "text-slate-500 hover:text-slate-800 bg-transparent"
            }`}
          >
            <Utensils className="w-3.5 h-3.5" />
            <span>配方</span>
            {totalPrepItems > 0 && (
              <span className={`text-[9px] px-1.5 py-0.5 rounded-full font-bold ${
                activeTab === 'prep' ? "bg-indigo-50 text-indigo-600" : "bg-slate-200 text-slate-600"
              }`}>
                {checkedPrepCount}/{totalPrepItems}
              </span>
            )}
          </button>
          
          <button
            type="button"
            onClick={() => setActiveTab('steps')}
            className={`flex-1 py-2.5 px-3 rounded-lg font-black text-xs transition duration-150 flex items-center justify-center gap-1.5 cursor-pointer border-0 ${
              activeTab === 'steps'
                ? "bg-white text-indigo-950 shadow-sm"
                : "text-slate-500 hover:text-slate-800 bg-transparent"
            }`}
          >
            <Flame className="w-3.5 h-3.5" />
            <span>烹饪</span>
            {stepsCount > 0 && (
              <span className={`text-[9px] px-1.5 py-0.5 rounded-full font-bold ${
                activeTab === 'steps' ? "bg-indigo-50 text-indigo-600" : "bg-slate-200 text-slate-600"
              }`}>
                {checkedStepsCount}/{stepsCount}
              </span>
            )}
          </button>
        </div>

        {/* Tab 1 Content: Preparation & Ingredients */}
        {activeTab === 'prep' && (
          <div className="space-y-4 animate-fade-in text-left">
            {/* Dish Hero Image */}
            {sop.images && sop.images[0] && (
              <div className="overflow-hidden rounded-2xl border border-slate-200/60 shadow-2xs bg-white p-1">
                <div className="aspect-[16/10] w-full rounded-xl overflow-hidden bg-slate-50 relative">
                  <img 
                    src={sop.images[0]} 
                    className="w-full h-full object-cover" 
                    alt={sop.title}
                    referrerPolicy="no-referrer"
                  />
                  <div className="absolute bottom-2 right-2 bg-black/60 backdrop-blur-md text-white text-[9px] px-2 py-0.5 rounded-full font-bold select-none">
                    📷 菜品成品效果图
                  </div>
                </div>
              </div>
            )}

            {/* Culinary Requirements Highlights */}
            <div className="grid grid-cols-2 gap-2.5">
              <div className="bg-white border border-slate-100 rounded-xl p-3 shadow-3xs flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-amber-50 text-amber-600 flex items-center justify-center shrink-0">
                  <Clock className="w-4 h-4" />
                </div>
                <div>
                  <span className="text-[9px] text-slate-400 block font-bold">烹饪时间</span>
                  <span className="text-[11px] font-black text-slate-800">{reminders.time || "常态时间"}</span>
                </div>
              </div>
              <div className="bg-white border border-slate-100 rounded-xl p-3 shadow-3xs flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-indigo-50 text-indigo-600 flex items-center justify-center shrink-0">
                  <Scissors className="w-4 h-4" />
                </div>
                <div>
                  <span className="text-[9px] text-slate-400 block font-bold">刀工规格</span>
                  <span className="text-[11px] font-black text-slate-800">{reminders.cutStyle || "标准切配"}</span>
                </div>
              </div>
            </div>

            {/* Food Safety Notification */}
            {reminders.info && (
              <div className="bg-rose-50/70 border border-rose-100 rounded-xl p-3 flex gap-2.5 shadow-3xs">
                <div className="w-5 h-5 rounded-full bg-rose-100 text-rose-600 flex items-center justify-center shrink-0 mt-0.5">
                  <AlertTriangle className="w-3.5 h-3.5" />
                </div>
                <div className="flex-1">
                  <span className="text-[9.5px] text-rose-800 font-extrabold block">食品安全及操作规范提醒:</span>
                  <p className="text-[11px] text-rose-950 font-black mt-0.5 leading-relaxed">{reminders.info}</p>
                </div>
              </div>
            )}

            {/* Interactive Ingredients Checklist */}
            <div className="bg-white border border-slate-150 rounded-2xl p-4 shadow-3xs">
              <div className="flex items-center justify-between pb-2.5 border-b border-slate-100 mb-2.5">
                <h2 className="text-xs font-black text-slate-950 flex items-center gap-1.5">
                  <Utensils className="w-4 h-4 text-orange-500" />
                  <span>食材物料清单 (点击可标记已备齐)</span>
                </h2>
                <span className="text-[9px] text-slate-400 font-mono">共 {ingredients.length} 种</span>
              </div>
              
              <div className="divide-y divide-slate-100">
                {ingredients.map((ing, idx) => {
                  const isChecked = !!checkedIngredients[idx];
                  return (
                    <button
                      key={idx}
                      type="button"
                      onClick={() => toggleIngredient(idx)}
                      className="w-full flex items-center justify-between py-3 first:pt-0 last:pb-0 text-left transition active:bg-slate-50 cursor-pointer border-0 bg-transparent"
                    >
                      <div className="flex items-center gap-3 overflow-hidden mr-2">
                        <div className="shrink-0">
                          {isChecked ? (
                            <CheckSquare className="w-4 h-4 text-emerald-500" />
                          ) : (
                            <Square className="w-4 h-4 text-slate-300" />
                          )}
                        </div>
                        <div className="flex items-center gap-2 overflow-hidden">
                          <span className={`text-[12.5px] font-extrabold transition-all duration-150 truncate ${
                            isChecked ? "text-slate-400 line-through font-normal" : "text-slate-800"
                          }`}>
                            {ing.name}
                          </span>
                          <span className={`px-1.5 py-0.5 text-[8.5px] font-black rounded shrink-0 ${
                            isChecked
                              ? "bg-slate-100 text-slate-400 border border-slate-200"
                              : ing.category === '主料' 
                                ? 'bg-orange-50 text-orange-600 border border-orange-100' 
                                : 'bg-indigo-50 text-indigo-600 border border-indigo-100'
                          }`}>
                            {ing.category}
                          </span>
                        </div>
                      </div>
                      <span className={`text-[12.5px] font-mono transition font-black shrink-0 ${
                        isChecked ? "text-slate-300 font-normal" : "text-slate-950"
                      }`}>
                        {ing.weight}
                      </span>
                    </button>
                  );
                })}
                {ingredients.length === 0 && (
                  <div className="py-6 text-center text-slate-400 text-[10px]">暂无添加具体食材配比</div>
                )}
              </div>
            </div>

            {/* Recommended Equipment checklist */}
            <div className="bg-white border border-slate-150 rounded-2xl p-4 shadow-3xs">
              <div className="flex items-center justify-between pb-2.5 border-b border-slate-100 mb-2.5">
                <h2 className="text-xs font-black text-slate-950 flex items-center gap-1.5">
                  <Sparkles className="w-4 h-4 text-indigo-500" />
                  <span>配套设备与厨具工具 (推荐)</span>
                </h2>
              </div>
              <div className="grid grid-cols-1 gap-2">
                {equipment.map((eq, idx) => {
                  const isChecked = !!checkedEquipment[idx];
                  return (
                    <button
                      key={idx}
                      type="button"
                      onClick={() => toggleEquipment(idx)}
                      className={`w-full text-left p-3 rounded-xl border transition-all duration-150 cursor-pointer flex items-center justify-between bg-transparent ${
                        isChecked 
                          ? "bg-slate-50/50 border-slate-200" 
                          : "bg-slate-50/30 border-slate-100 hover:border-slate-200"
                      }`}
                    >
                      <div className="flex items-center gap-2.5 overflow-hidden min-w-0">
                        {isChecked ? (
                          <CheckCircle className="w-4 h-4 text-emerald-500 shrink-0" />
                        ) : (
                          <Circle className="w-4 h-4 text-slate-300 shrink-0" />
                        )}
                        <div className="overflow-hidden">
                          <span className={`text-[12px] font-extrabold block truncate ${
                            isChecked ? "text-slate-400 line-through" : "text-slate-800"
                          }`}>
                            {eq.name}
                          </span>
                          <span className="text-[9px] text-slate-400 font-medium block truncate mt-0.5">
                            {eq.spec || "厨中标准规格"}
                          </span>
                        </div>
                      </div>
                      <span className={`font-mono text-[11px] px-1.5 py-0.5 rounded font-black border select-none shrink-0 ${
                        isChecked
                          ? "bg-slate-100 text-slate-400 border-slate-200"
                          : "bg-white text-slate-700 border-slate-200/60"
                      }`}>
                        {eq.qty}
                      </span>
                    </button>
                  );
                })}
                {equipment.length === 0 && (
                  <div className="py-4 text-center text-slate-400 text-[10px]">标准基础厨房配套设备及炉灶配套</div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Tab 2 Content: Chronological Cooking Steps */}
        {activeTab === 'steps' && (
          <div className="space-y-4 animate-fade-in text-left">
            {/* Quick Summary Bar */}
            <div className="bg-indigo-50/60 border border-indigo-100/40 rounded-xl p-3 flex items-center justify-between">
              <span className="text-[10.5px] font-bold text-indigo-900 flex items-center gap-1.5">
                <Flame className="w-3.5 h-3.5 text-indigo-600 animate-pulse" />
                <span>制作工艺细节重点工序</span>
              </span>
              <span className="text-[10px] bg-indigo-100/80 text-indigo-800 font-mono font-black px-2 py-0.5 rounded-full">
                已完成 {checkedStepsCount} / {stepsCount} 步
              </span>
            </div>

            {/* Interactive Timeline Steps */}
            <div className="space-y-3 relative pl-1">
              {/* Vertical connector line */}
              {steps.length > 1 && (
                <div className="absolute left-[11px] top-3 bottom-3 w-[1.5px] bg-indigo-100" />
              )}
              
              {steps.map((step, idx) => {
                const isChecked = !!checkedSteps[idx];
                const isCurrentPending = !isChecked && (idx === 0 || !!checkedSteps[idx - 1]);
                
                return (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => toggleStep(idx)}
                    className="w-full text-left flex gap-2.5 items-start relative z-10 p-0 border-0 bg-transparent cursor-pointer transition-all duration-150"
                  >
                    {/* Interactive step number / check icon bubble */}
                    <div className="shrink-0 mt-0.5">
                      {isChecked ? (
                        <div className="w-5.5 h-5.5 rounded-full bg-emerald-500 border-2 border-emerald-500 flex items-center justify-center text-white shadow-3xs">
                          <Check className="w-3.5 h-3.5 stroke-[3]" />
                        </div>
                      ) : (
                        <div className={`w-5.5 h-5.5 rounded-full font-mono font-black text-[11px] flex items-center justify-center border-2 transition-all shadow-3xs ${
                          isCurrentPending
                            ? "bg-indigo-600 text-white border-indigo-600 ring-4 ring-indigo-100"
                            : "bg-white text-slate-500 border-slate-300"
                        }`}>
                          {idx + 1}
                        </div>
                      )}
                    </div>

                    {/* Step Card */}
                    <div className={`flex-1 rounded-2xl p-3.5 border transition-all duration-200 ${
                      isChecked 
                        ? "bg-slate-50/80 border-slate-200/60 opacity-65" 
                        : isCurrentPending
                          ? "bg-white border-indigo-500 shadow-md ring-1 ring-indigo-500/10"
                          : "bg-white border-slate-150 shadow-3xs"
                    }`}>
                      <div className="flex items-center justify-between mb-1">
                        <span className={`text-[9.5px] font-black uppercase tracking-wider ${
                          isChecked ? "text-slate-400" : "text-indigo-600"
                        }`}>
                          第 {idx + 1} 步
                        </span>
                        {isChecked && (
                          <span className="text-[9px] text-emerald-600 font-extrabold bg-emerald-50 px-1.5 py-0.2 rounded">
                            已完成
                          </span>
                        )}
                      </div>
                      <p className={`text-[12.5px] font-bold leading-relaxed select-all ${
                        isChecked ? "text-slate-400 line-through" : "text-slate-850"
                      }`}>
                        {step}
                      </p>
                    </div>
                  </button>
                );
              })}

              {steps.length === 0 && (
                <div className="bg-white border border-slate-150 rounded-2xl p-6 text-center select-none text-slate-400">
                  <span className="text-xl">👩‍🍳</span>
                  <p className="text-[10px] font-bold mt-1">本食谱暂无添加分步细节，请依据传统熟练手法操作。</p>
                </div>
              )}
            </div>

            {/* "All Steps Completed" Celebration Banner */}
            {stepsCount > 0 && checkedStepsCount === stepsCount && (
              <div className="bg-emerald-50 border border-emerald-200 rounded-2xl p-4 text-center space-y-1 animate-bounce shadow-md">
                <span className="text-2xl">🎉</span>
                <h3 className="text-xs font-black text-emerald-950">全体工序学习配制完毕！</h3>
                <p className="text-[10px] text-emerald-700 font-bold">请检查灶火、卫生，并准备安全上餐。</p>
              </div>
            )}
          </div>
        )}
      </div>
    );
  }

  return (
    <div 
      id={id || `recipe-view-${sop.id}`} 
      className="bg-[#FAF9F6] text-slate-800 font-sans select-text border-2 border-slate-300 rounded-2xl p-4 md:p-6 shadow-inner"
    >
      {/* Document Header */}
      <div className="text-center border-b-2 border-double border-slate-400 pb-3 mb-4">
        <p className="text-xs md:text-sm font-extrabold tracking-widest text-slate-500 uppercase">
          {sop.recipeCompany || "后勤保障餐饮部餐饮中心"}
        </p>
        <h1 className="text-lg md:text-2xl font-black text-slate-900 mt-1 tracking-tight">
          烹饪标准作业指导书
        </h1>
      </div>

      {/* Meta Grid info */}
      {isMobile ? (
        <div className="border border-slate-300 bg-white rounded-xl p-3 mb-3 text-xs font-bold space-y-2 shadow-3xs">
          <div className="flex justify-between items-center pb-2 border-b border-slate-100">
            <span className="text-slate-400 font-extrabold">菜名 (Dish Name)</span>
            <span className="text-indigo-950 font-black text-xs sm:text-sm">{sop.title}</span>
          </div>
          <div className="flex justify-between items-center">
            <span className="text-slate-400 font-extrabold">编号 (SOP Code)</span>
            <span className="text-indigo-900 font-mono font-black">{sop.recipeCode || "N/A"}</span>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-12 border border-slate-350 bg-slate-50 text-[11px] md:text-xs font-bold divide-x divide-slate-300 mb-4 rounded overflow-hidden">
          <div className="col-span-2 px-2 md:px-3 py-2 bg-slate-100 text-slate-500 text-center select-none flex items-center justify-center">菜名</div>
          <div className="col-span-6 px-4 py-2 text-indigo-900 font-black text-sm md:text-base text-left bg-white flex items-center truncate">{sop.title}</div>
          <div className="col-span-2 px-2 md:px-3 py-2 bg-slate-100 text-slate-500 text-center select-none flex items-center justify-center">编号</div>
          <div className="col-span-2 px-2 md:px-3 py-2 text-slate-800 font-mono text-center bg-white flex items-center justify-center">{sop.recipeCode || "N/A"}</div>
        </div>
      )}

      {/* Main Body Grid */}
      <div className={isMobile ? "space-y-4" : "grid grid-cols-1 lg:grid-cols-12 gap-5"}>
        {/* Ingredients part on Left */}
        <div className={isMobile ? "space-y-2" : "lg:col-span-7 space-y-2"}>
          <div className="flex items-center justify-between">
            <span className="text-xs md:text-sm font-black text-slate-800 uppercase tracking-widest flex items-center gap-1.5">
              <span className="w-1.5 h-3 bg-indigo-600 rounded-full inline-block"></span>
              材料份量:
            </span>
            <span className="text-[9px] md:text-[10px] text-slate-400 font-mono">PORTIONS / INGREDIENTS</span>
          </div>

          <div className="overflow-x-auto border border-slate-300 rounded-xl overflow-hidden shadow-3xs">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-100 border-b border-slate-300 text-slate-600 text-[10.5px] md:text-xs">
                  <th className={`py-2 font-bold border-r border-slate-300 text-center select-none ${isMobile ? "px-1 w-10" : "px-2 w-12"}`}>序号</th>
                  <th className={`py-2 font-bold border-r border-slate-300 ${isMobile ? "px-2" : "px-3"}`}>名称</th>
                  <th className={`py-2 font-bold border-r border-slate-300 text-center select-none ${isMobile ? "px-1.5 w-14" : "px-3 w-16"}`}>类别</th>
                  <th className={`py-2 font-bold text-right ${isMobile ? "px-2 w-20" : "px-3 w-24"}`}>重量</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 bg-white text-[11px] md:text-xs">
                {ingredients.map((ing, idx) => (
                  <tr key={idx} className="hover:bg-amber-50/20 transition-colors">
                    <td className={`py-1.5 border-r border-slate-300 text-center text-slate-400 font-mono ${isMobile ? "px-1 text-[10px]" : "px-2"}`}>{idx + 1}</td>
                    <td className={`py-1.5 border-r border-slate-300 font-bold text-slate-900 ${isMobile ? "px-2 text-[11.5px]" : "px-3"}`}>{ing.name}</td>
                    <td className={`py-1.5 border-r border-slate-300 text-center ${isMobile ? "px-1" : "px-3"}`}>
                      <span className={`inline-block px-1.5 py-0.5 text-[8.5px] font-extrabold rounded-md ${
                        ing.category === '主料' ? 'bg-orange-100 text-orange-700 border border-orange-200' :
                        ing.category === '配料' ? 'bg-indigo-100 text-indigo-700 border border-indigo-200' :
                        'bg-slate-100 text-slate-600 border border-slate-200'
                      }`}>
                        {ing.category}
                      </span>
                    </td>
                    <td className={`py-1.5 text-right font-black font-mono text-slate-750 ${isMobile ? "px-2 text-[11px]" : "px-3"}`}>{ing.weight}</td>
                  </tr>
                ))}
                {/* Pad empty rows if ingredients is very short to match exact cooking SOP document design (only on desktop/A4) */}
                {!isMobile && ingredients.length < 15 && 
                  Array.from({ length: 15 - ingredients.length }).map((_, idx) => {
                    const padIdx = ingredients.length + idx + 1;
                    return (
                      <tr key={`pad-${padIdx}`} className="h-7 text-slate-200 opacity-30 bg-slate-50/30">
                        <td className="px-2 py-1.5 border-r border-slate-300 text-center text-slate-300 font-mono text-[11px]">{padIdx}</td>
                        <td className="px-3 py-1.5 border-r border-slate-300"></td>
                        <td className="px-3 py-1.5 border-r border-slate-300"></td>
                        <td className="px-3 py-1.5"></td>
                      </tr>
                    );
                  })
                }
              </tbody>
            </table>
          </div>
        </div>

        {/* Right column: Image, Equipment table, Reminders box */}
        <div className={isMobile ? "flex flex-col space-y-3.5" : "lg:col-span-5 flex flex-col space-y-4"}>
          
          {/* Photos area */}
          {sop.images && sop.images[0] ? (
            <div className="border border-slate-300 rounded-xl p-1.5 bg-white relative shadow-3xs">
              <div className={`${isMobile ? "aspect-[16/9]" : "aspect-[4/3]"} w-full rounded-lg overflow-hidden bg-slate-50`}>
                <img 
                  src={sop.images[0]} 
                  className="w-full h-full object-cover select-none" 
                  alt={sop.title}
                  referrerPolicy="no-referrer"
                />
              </div>
              <div className="text-center text-[9px] font-bold text-slate-400 mt-1 select-none font-mono">
                📷 STANDARD PRODUCT PHOTO / 产品成品参相
              </div>
            </div>
          ) : (
            <div className={`border border-slate-300 rounded-xl bg-slate-50/20 text-center select-none text-slate-400 flex flex-col items-center justify-center border-dashed ${isMobile ? "py-4 min-h-[90px]" : "p-6 min-h-[120px]"}`}>
              <span className="text-xl mb-0.5">🥘</span>
              <p className="text-[9px] font-bold font-mono text-slate-400">NO EXPERIMENTAL PHOTO / 暂无参考效果图</p>
            </div>
          )}

          {/* Equipment table */}
          <div className="space-y-1.5">
            <span className="text-xs md:text-sm font-black text-slate-800 uppercase tracking-widest block flex items-center gap-1.5">
              <span className="w-1.5 h-3 bg-indigo-500 rounded-full inline-block"></span>
              使用设备、工具:
            </span>
            <div className="border border-slate-300 rounded-xl overflow-hidden shadow-3xs bg-white">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-slate-100 border-b border-slate-300 text-slate-600 text-[10.5px] md:text-xs font-bold">
                    <th className={`py-2 font-bold border-r border-slate-300 ${isMobile ? "px-2" : "px-3"}`}>名称</th>
                    <th className={`py-2 font-bold border-r border-slate-300 ${isMobile ? "px-2" : "px-3"}`}>型号/规格</th>
                    <th className={`py-2 font-bold text-center w-12 ${isMobile ? "px-1" : "px-2"}`}>数量</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200 text-[11px] md:text-xs">
                  {equipment.map((eq, idx) => (
                    <tr key={idx} className="hover:bg-slate-50/50 transition-colors">
                      <td className={`py-1.5 border-r border-slate-300 font-bold text-slate-850 ${isMobile ? "px-2 text-[11px]" : "px-3"}`}>{eq.name}</td>
                      <td className={`py-1.5 border-r border-slate-300 text-slate-450 ${isMobile ? "px-2 text-[10px]" : "px-3"}`}>{eq.spec || "标准通用"}</td>
                      <td className={`py-1.5 text-center font-black font-mono text-slate-750 ${isMobile ? "px-1" : "px-2"}`}>{eq.qty}</td>
                    </tr>
                  ))}
                  {equipment.length === 0 && (
                    <tr className="h-10 text-center text-slate-400 bg-slate-50/20">
                      <td colSpan={3} className="py-2 text-[10px] font-medium font-sans">后勤标准基础厨具及炉房配套设备</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* Warnings and requirement reminders on cut, time, etc. */}
          <div className="border border-slate-300 rounded-xl overflow-hidden flex flex-col shadow-3xs bg-white text-[11px] md:text-xs">
            <div className="bg-slate-800 text-white text-center py-1.5 font-extrabold text-[10px] md:text-[11px] tracking-widest select-none uppercase">
              工 具 和 要 求 提 醒
            </div>
            
            <div className="divide-y divide-slate-200 flex-1 flex flex-col justify-between">
              <div className="px-3 py-1.5 flex items-start gap-2.5">
                <span className="font-extrabold text-slate-500 shrink-0 w-11 mt-0.5 font-sans select-none">时 间:</span>
                <span className="text-slate-800 font-bold select-all leading-normal">{reminders.time || "按常态熟成时间出餐"}</span>
              </div>
              <div className="px-3 py-1.5 flex items-start gap-2.5">
                <span className="font-extrabold text-slate-500 shrink-0 w-11 mt-0.5 font-sans select-none">切 工:</span>
                <span className="text-slate-800 font-bold select-all leading-normal">{reminders.cutStyle || "洗净切配，块条整洁"}</span>
              </div>
              <div className="px-3 py-2 flex items-start gap-2.5 bg-amber-50/60">
                <span className="font-extrabold text-amber-800 shrink-0 w-11 mt-0.5 font-sans select-none">提 醒:</span>
                <span className="text-red-900 font-extrabold text-[10.5px] md:text-[11px] select-all leading-normal flex-1">{reminders.info || "生熟隔离，规范实施48小时食品留样"}</span>
              </div>
            </div>
          </div>

        </div>
      </div>

      {/* Production Process Steps */}
      <div className={`mt-4 border-t border-dashed border-slate-300 ${isMobile ? "pt-3" : "pt-4"} space-y-2`}>
        <span className="text-xs md:text-sm font-black text-slate-800 uppercase tracking-widest block flex items-center gap-1.5">
          <span className="w-1.5 h-3 bg-amber-500 rounded-full inline-block"></span>
          制作流程重点:
        </span>
        <div className={`bg-white border border-slate-200/80 rounded-2xl ${isMobile ? "p-3" : "p-4"} space-y-2.5 shadow-3xs`}>
          {steps.map((step, idx) => (
            <div key={idx} className="flex gap-2.5 items-start text-slate-700 hover:text-slate-950 transition-colors">
              <span className="font-mono font-black text-indigo-650 bg-indigo-50 border border-indigo-100 rounded-md w-5 h-5 md:w-6 md:h-6 flex items-center justify-center shrink-0 text-[10px] md:text-xs">
                {idx + 1}
              </span>
              <p className="font-bold flex-1 pt-0.5 leading-relaxed text-[11px] md:text-xs">{step}</p>
            </div>
          ))}
          {steps.length === 0 && (
            <p className="text-slate-400 italic text-center py-2 text-[10px]">本食谱暂无添加分步制作细节流程，请依据食堂经典手法准备。</p>
          )}
        </div>
      </div>
    </div>
  );
}
