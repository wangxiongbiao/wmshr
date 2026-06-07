import React, { useEffect, useState, useMemo, useRef } from "react";
import { useTranslation } from "react-i18next";
import { tAdmin } from "../lib/i18nText";
import { SopDocument, SopAttachment, Employee } from "../types";
import { 
  FileText, Plus, Search, Users, CheckCircle, Download, Image as ImageIcon, 
  Upload, Smartphone, Send, RotateCcw, UserCheck, Trash2, Paperclip, 
  ExternalLink, ChevronRight, Info, Sparkles, BookOpen, Clock, AlertTriangle, Check,
  Edit, PenSquare, X
} from "lucide-react";
import { createSop, deleteSop, fetchSops, markSopRead, updateSop } from "../lib/api";

interface SopManagerProps {
  employees: Employee[];
  addToast: (message: string) => void;
  isActive: boolean;
}

// Predefined SOP templates for one-click load.
// 正文是会写入富文本预览和员工端的 HTML 模板：只翻译标签内可见文本，不能把整段 HTML 当作翻译 key，否则 tAdmin(...) 标记会原样显示。
function createSopTemplates() {
  return [
  {
    title: tAdmin("🚜 叉车安全操作与高位堆垛日检规程"),
    templateTitle: tAdmin("叉车安全操作与高位堆垛日检规程"),
    content: `<h3>${tAdmin("1. 每日出车前“五检”要点")}</h3>
<p>${tAdmin("各车段操作员必须在发车前严加检查：")}</p>
<div class="p-3 bg-indigo-50 border-l-4 border-indigo-500 rounded text-indigo-900">
  <b>${tAdmin("✔ 日检清单：")}</b>${tAdmin("液压油位、制动系统灵敏度、货叉齿有无变形裂缝、前后车灯以及倒车蜂鸣器。")}</div>

<h3>${tAdmin("2. 运行限速与十字路鸣笛")}</h3>
<p>${tAdmin("在库房任何作业通道行驶中：时速绝对不得超过")}<b>${tAdmin("5公里/小时")}</b>${tAdmin("。在盲区弯道、推拉式大门口、交叉跑道等，必须提前")}<b>${tAdmin("减速并鸣短笛")}</b>${tAdmin("示意外界。")}</p>

<h3>${tAdmin("3. “十不叉”刚性安全底线")}</h3>
<p>${tAdmin("● 严禁货叉带人进行登高升降作业。")}<br />${tAdmin("● 严禁无特种机械操作证人员动车，一经发现做红线开除处理！")}</p>`,
    images: ["https://images.unsplash.com/photo-1578575437130-527eed3abbec?auto=format&fit=crop&q=80&w=600"],
    attachments: [
      { name: tAdmin("高空叉车操作事故危害点检表.xlsx"), url: "#", size: "340 KB" },
      { name: tAdmin("电动行进堆垛车日常检查表.pdf"), url: "#", size: "1.1 MB" }
    ],
    targetType: "specific",
    targetEmployeeIds: [6] // Forklift operator
  },
  {
    title: tAdmin("📦 易碎高价值物资“十字交叉”加固防震规范"),
    templateTitle: tAdmin("易碎高价值物资“十字交叉”加固防震规范"),
    content: `<h3>${tAdmin("1. 针对货物类别")}</h3>
<p>${tAdmin("凡属于精密光学透镜、贵重陶瓷传感器、高单价电路母版等高额易碎件，必须按此高规打包。")}</p>

<h3>${tAdmin("2. 包装防落震工艺标准")}</h3>
<p>① <b>${tAdmin("一裹：")}</b>${tAdmin("用不少于三层聚乙烯气泡垫紧密缠绕，首尾及缝口使用透明胶带密封严实。")}<br />② <b>${tAdmin("二填：")}</b>${tAdmin("将中转小盒放入外箱后，其空腔上下及四周百分百以发泡聚氨酯或专用气袋填充饱满，严禁发出晃动异响！")}<br />③ <b>${tAdmin("三贴：")}</b>${tAdmin("大箱表面四周采用“十字交叉”黄色高亮封口，并侧面居中粘贴")}<b>${tAdmin("“向上易碎防压”")}</b>${tAdmin("大红标识贴。")}</p>

<h3>${tAdmin("3. 复检流程")}</h3>
<div class="p-3 bg-amber-50 border-l-4 border-amber-500 rounded text-amber-900">${tAdmin("⚠️ 由")}<b>${tAdmin("D区质检领班")}</b>${tAdmin("进行随箱抽样15%，检查不饱满气包应立即退回，重做打包。")}</div>`,
    images: ["https://images.unsplash.com/photo-1586528116311-ad8dd3c8310d?auto=format&fit=crop&q=80&w=600"],
    attachments: [
      { name: tAdmin("高价值抗震试验与气塞填装手册.pdf"), url: "#", size: "1.4 MB" }
    ],
    targetType: "all",
    targetEmployeeIds: []
  },
  {
    title: tAdmin("🛡️ A/B区大功率充电桩防爆消防与预警指南"),
    templateTitle: tAdmin("A/B区大功率充电桩防爆消防与预警指南"),
    content: `<h3>${tAdmin("1. 进场和安全红外间距")}</h3>
<p>${tAdmin("大功率备用供电架与电瓶拖车充电插槽间必须留有 1.2米以上的绝缘防爆安全净空，严禁堆物。")}</p>

<h3>${tAdmin("2. 遇充电过热、冒白烟紧急拆除流程")}</h3>
<div class="p-3 bg-red-50 border-l-4 border-red-500 rounded text-red-955 text-rose-900">
  <b>${tAdmin("🚨 红色紧急行动预案：")}</b><br />
  ① <b>${tAdmin("立即按断：")}</b>${tAdmin("极力按下主墙壁侧面的")}<b>${tAdmin("红色紧急断电拉闸")}</b>。<br />
  ② <b>${tAdmin("灭火沙灭：")}</b>${tAdmin("迅速拿起灭火沙盘往烟点泼撒。绝不能向锂油泄露处泼撒水雾！")}<br />
  ③ <b>${tAdmin("通报疏散：")}</b>${tAdmin("捏响最近的手动消防哨，并告知中控与消防。")}</div>

<h3>${tAdmin("3. 五不准")}</h3>
<p>${tAdmin("● 卡盘充电间10米内绝不准吸烟或带入任何非安全控制的加热及明火工具。")}<br />${tAdmin("● 金属工具物件切勿平放在拖车电瓶两极之间，防止形成短路极爆。")}</p>`,
    images: [],
    attachments: [
      { name: tAdmin("2026版仓库消防器材放置与救援部署图.pdf"), url: "#", size: "2.1 MB" }
    ],
    targetType: "all",
    targetEmployeeIds: []
  }
];
}

export function SopManager({ employees, addToast, isActive }: SopManagerProps) {
  const { i18n } = useTranslation("admin");
  // SOP 快速模板包含预渲染 HTML 字符串，必须随语言变化重新生成；否则切换语言后模板菜单和载入正文会继续使用旧语言。
  const sopTemplates = useMemo(() => createSopTemplates(), [i18n.resolvedLanguage, i18n.language]);

  // SOP 数据已从 v2 本地态切到账号级 API；这里不再读写 localStorage，避免不同 Google 账号之间共享浏览器缓存数据。
  const [sops, setSops] = useState<SopDocument[]>([]);
  const [isLoadingSops, setIsLoadingSops] = useState(false);
  const [isSubmittingSop, setIsSubmittingSop] = useState(false);

  const loadSops = async () => {
    setIsLoadingSops(true);
    try {
      const rows = await fetchSops();
      setSops(rows);
    } catch (error) {
      addToast(error instanceof Error ? error.message : tAdmin("SOP列表加载失败"));
    } finally {
      setIsLoadingSops(false);
    }
  };

  useEffect(() => {
    if (!isActive) {
      return;
    }

    // SOP 模块重新激活时后台刷新列表，但保留当前草稿、检索词和详情展开状态，避免页面回退成冷启动。
    void loadSops();
  }, [isActive]);

  // UI state controllers
  const [activeMode, setActiveMode] = useState<'manager' | 'simulator'>('manager');
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedSopForDetails, setSelectedSopForDetails] = useState<SopDocument | null>(null);

  // Form State for creating / editing SOP
  const [isCreating, setIsCreating] = useState(false);
  const [editingSopId, setEditingSopId] = useState<string | null>(null);
  const [formTitle, setFormTitle] = useState("");
  const [formContent, setFormContent] = useState("");
  const [formTargetType, setFormTargetType] = useState<'all' | 'specific'>('all');
  const [formTargetIds, setFormTargetIds] = useState<number[]>([]);
  
  // Simulated File attachments queue
  const [tempAttachments, setTempAttachments] = useState<SopAttachment[]>([]);
  const [tempImages, setTempImages] = useState<string[]>([]);
  const [imageInputVal, setImageInputVal] = useState("");
  const [showImageInserter, setShowImageInserter] = useState(false);
  const [formImageUrl, setFormImageUrl] = useState("");
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Drag & drop drag zone active state
  const [isDragging, setIsDragging] = useState(false);

  // Simulator State config
  const [simulatedEmployeeId, setSimulatedEmployeeId] = useState<number>(() => {
    return employees.length > 0 ? employees[0].id : 1;
  });
  const [currentSelectedSimSop, setCurrentSelectedSimSop] = useState<SopDocument | null>(null);

  // Currently logged-in simulated employee
  const currentSimEmp = useMemo(() => {
    return employees.find(e => e.id === simulatedEmployeeId) || employees[0];
  }, [employees, simulatedEmployeeId]);

  // Compute SOP list visible to the simulated employee
  const employeeVisibleSops = useMemo(() => {
    return sops.filter(sop => {
      if (sop.status !== 'published') return false;
      if (sop.targetType === 'all') return true;
      if (sop.targetType === 'specific' && sop.targetEmployeeIds?.includes(simulatedEmployeeId)) {
        return true;
      }
      return false;
    });
  }, [sops, simulatedEmployeeId]);
  const showRefreshing = isLoadingSops && sops.length > 0;

  // Filtered SOPs shown in the management panel table
  const filteredSops = useMemo(() => {
    return sops.filter(sop => {
      const matchSearch = sop.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
                          sop.creator.toLowerCase().includes(searchTerm.toLowerCase()) ||
                          sop.content.toLowerCase().includes(searchTerm.toLowerCase());
      return matchSearch;
    });
  }, [sops, searchTerm]);

  // Handle Drag & Drop uploading triggers
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
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      appendTempFiles(e.dataTransfer.files);
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      appendTempFiles(e.target.files);
    }
  };

  const appendTempFiles = (files: FileList) => {
    const updated = [...tempAttachments];
    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      const attachmentSizes = ["425 KB", "1.1 MB", "960 KB", "3.4 MB", "720 KB"];
      const randomSize = attachmentSizes[Math.floor(Math.random() * attachmentSizes.length)];
      updated.push({
        name: file.name,
        url: "#", // Download payload URL is retained in metadata until storage integration is attached
        size: randomSize
      });
    }
    setTempAttachments(updated);
    addToast(tAdmin("已打包本地文件「{{name}}」等进行附件关联发布", { name: files[0].name }));
  };

  // Helper code: Insert quick formatting tags inside the textarea (supports sophisticated alerts)
  const handleInsertCustomTag = (tagType: 'h3' | 'p' | 'b' | 'warning' | 'success' | 'list') => {
    const tags: Record<string, [string, string]> = {
      h3: ["<h3>", "</h3>\n"],
      p: ["<p>", "</p>\n"],
      b: ["<b>", "</b>"],
      warning: [
        `<div class="p-3 bg-amber-50 border-l-4 border-amber-500 rounded text-amber-900 font-sans">\n  <b>${tAdmin("⚠️ 重点警示:")}</b> `,
        '\n</div>\n'
      ],
      success: [
        `<div class="p-3 bg-emerald-50 border-l-4 border-emerald-500 rounded text-emerald-950 font-sans">\n  <b>${tAdmin("✔ 合规标准:")}</b> `,
        '\n</div>\n'
      ],
      list: [
        // 列表模板要插入真实换行；不要使用双重转义字符，否则编辑器里会显示字面量反斜杠。
        tAdmin("☑ 校验现场防爆沙就位\n☑ 车辆轮塞牢固安置\n☑ 双人复核双锁上锁\n"),
        ""
      ]
    };

    const [start, end] = tags[tagType];
    const textarea = document.getElementById("sopFormContent") as HTMLTextAreaElement;
    if (!textarea) {
      setFormContent(prev => prev + start + end);
      return;
    }

    const startPos = textarea.selectionStart;
    const endPos = textarea.selectionEnd;
    const text = textarea.value;
    const selected = text.substring(startPos, endPos);
    
    const replacement = start + (selected || (tagType === 'list' ? '' : tAdmin("请输入指南文本"))) + end;
    const updated = text.substring(0, startPos) + replacement + text.substring(endPos);
    
    setFormContent(updated);
    
    // Reset focus and highlight selection
    setTimeout(() => {
      textarea.focus();
      textarea.setSelectionRange(startPos + start.length, startPos + start.length + (selected ? selected.length : 7));
    }, 50);
  };

  // Insert image tag at client cursor position in editor text box
  const handleInsertImageTag = () => {
    if (!formImageUrl.trim()) {
      addToast(tAdmin("请输入有效的网页图片链接"));
      return;
    }
    const imgTag = `<img src="${formImageUrl.trim()}" class="max-w-full rounded-lg my-2.5 shadow-sm inline-block" alt="${tAdmin("SOP插图")}" />\n`;
    const textarea = document.getElementById("sopFormContent") as HTMLTextAreaElement;
    if (!textarea) {
      setFormContent(prev => prev + imgTag);
      setFormImageUrl("");
      setShowImageInserter(false);
      return;
    }

    const startPos = textarea.selectionStart;
    const endPos = textarea.selectionEnd;
    const text = textarea.value;
    
    const updated = text.substring(0, startPos) + imgTag + text.substring(endPos);
    setFormContent(updated);
    setFormImageUrl("");
    setShowImageInserter(false);
    
    setTimeout(() => {
      textarea.focus();
      textarea.setSelectionRange(startPos + imgTag.length, startPos + imgTag.length);
    }, 50);
    addToast(tAdmin("已在正文光标所在处插入防灾/机械插图"));
  };

  // Predefined loading template helper
  const handleLoadTemplate = (template: ReturnType<typeof createSopTemplates>[number]) => {
    setFormTitle(template.templateTitle);
    setFormContent(template.content);
    setTempImages(template.images || []);
    setTempAttachments(template.attachments || []);
    setFormTargetType(template.targetType as 'all' | 'specific');
    if (template.targetType === 'specific' && template.targetEmployeeIds) {
      setFormTargetIds(template.targetEmployeeIds);
    } else {
      setFormTargetIds([]);
    }
    addToast(tAdmin("【{{title}}】模板载入成功！已实时反馈至右侧预览区。", { title: template.templateTitle }));
  };

  // Group selecting targets with quick checklist filters
  const handleGroupSelect = (type: 'all' | 'none' | 'dept' | 'role', value?: string) => {
    if (type === 'all') {
      setFormTargetIds(employees.map(e => e.id));
      addToast(tAdmin("已全勾选所有在职员工"));
    } else if (type === 'none') {
      setFormTargetIds([]);
      addToast(tAdmin("已清空受众名单，请按需点选"));
    } else if (type === 'dept' && value) {
      const deptEmpIds = employees.filter(e => e.dept === value).map(e => e.id);
      const allChecked = deptEmpIds.every(id => formTargetIds.includes(id));
      if (allChecked) {
        setFormTargetIds(prev => prev.filter(id => !deptEmpIds.includes(id)));
        addToast(tAdmin("已移除 [{{value}}] 部门的所有人员", { value }));
      } else {
        setFormTargetIds(prev => Array.from(new Set([...prev, ...deptEmpIds])));
        addToast(tAdmin("已一键选中 [{{value}}] 部门的全部成员", { value }));
      }
    } else if (type === 'role' && value) {
      const roleEmpIds = employees.filter(e => e.role === value).map(e => e.id);
      const allChecked = roleEmpIds.every(id => formTargetIds.includes(id));
      if (allChecked) {
        setFormTargetIds(prev => prev.filter(id => !roleEmpIds.includes(id)));
        addToast(tAdmin("已移除所有职位为 [{{value}}] 的员工", { value }));
      } else {
        setFormTargetIds(prev => Array.from(new Set([...prev, ...roleEmpIds])));
        addToast(tAdmin("已选中全仓职位为 [{{value}}] 的全部成员", { value }));
      }
    }
  };

  // Triggering SOP edit state
  const handleOpenEditSop = (sop: SopDocument) => {
    setEditingSopId(sop.id);
    setFormTitle(sop.title);
    setFormContent(sop.content);
    setFormTargetType(sop.targetType);
    setFormTargetIds(sop.targetEmployeeIds || []);
    setTempAttachments(sop.attachments || []);
    setTempImages(sop.images || []);
    setIsCreating(true);
    addToast(tAdmin("【{{title}}】编辑草稿加载成功，启动 Editorial Studio。", { title: sop.title }));
  };

  // Add customized external images in editor state
  const handleAddImageUrl = () => {
    if (!imageInputVal.trim()) return;
    if (tempImages.includes(imageInputVal.trim())) {
      addToast(tAdmin("该图片地址已存在于图片池"));
      return;
    }
    setTempImages(prev => [...prev, imageInputVal.trim()]);
    setImageInputVal("");
    addToast(tAdmin("已成功插入插图链接，实时效果已绘制"));
  };

  // Form saving Handler (handles both creation & update)
  const handleSaveSop = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formTitle.trim()) {
      addToast(tAdmin("请输入SOP的操作文档名称"));
      return;
    }
    if (!formContent.trim()) {
      addToast(tAdmin("SOP核心内容文字说明不能为空"));
      return;
    }

    const payload = {
      title: formTitle.trim(),
      content: formContent,
      images: tempImages,
      attachments: tempAttachments,
      targetType: formTargetType,
      targetEmployeeIds: formTargetType === 'all' ? undefined : formTargetIds,
      creator: tAdmin("仓库安全处 · Admin Office"),
      status: "published" as const
    };

    setIsSubmittingSop(true);
    try {
      if (editingSopId) {
        // 保存接口采用整份 SOP 替换语义；前端只在接口成功后刷新状态，避免员工端签收统计与数据库不一致。
        const saved = await updateSop(editingSopId, payload);
        setSops(prev => prev.map(s => s.id === editingSopId ? saved : s));
        addToast(tAdmin("【{{title}}】SOP作业规程修改并同步下发成功！", { title: formTitle }));
        if (selectedSopForDetails?.id === editingSopId) {
          setSelectedSopForDetails(saved);
        }
        if (currentSelectedSimSop?.id === editingSopId) {
          setCurrentSelectedSimSop(saved);
        }
      } else {
        const saved = await createSop(payload);
        setSops(prev => [saved, ...prev]);
        addToast(tAdmin("【{{title}}】SOP全新规范同步下发成功！", { title: formTitle }));
        setSelectedSopForDetails(saved);
      }

      // Reset Form fields
      setFormTitle("");
      setFormContent("");
      setFormTargetType('all');
      setFormTargetIds([]);
      setTempAttachments([]);
      setTempImages([]);
      setIsCreating(false);
      setEditingSopId(null);
    } catch (error) {
      addToast(error instanceof Error ? error.message : tAdmin("SOP保存失败"));
    } finally {
      setIsSubmittingSop(false);
    }
  };

  // Delete SOP handler
  const handleDeleteSop = async (id: string, name: string) => {
    if (!window.confirm(tAdmin("确定要删除并召回作业规范 【{{name}}】吗？删除后员工终端将同步无法查看。", { name }))) {
      return;
    }

    try {
      await deleteSop(id);
      setSops(prev => prev.filter(s => s.id !== id));
      addToast(tAdmin("SOP文档已成功删除撤回"));
      if (selectedSopForDetails?.id === id) {
        setSelectedSopForDetails(null);
      }
      if (currentSelectedSimSop?.id === id) {
        setCurrentSelectedSimSop(null);
      }
    } catch (error) {
      addToast(error instanceof Error ? error.message : tAdmin("SOP删除失败"));
    }
  };

  // Employee action under mobile simulator: Mark as Read (我已学习 & 签收)
  const handleMarkAsReadInSimulator = async (sopId: string) => {
    try {
      const saved = await markSopRead(sopId, simulatedEmployeeId);
      setSops(prev => prev.map(s => s.id === sopId ? saved : s));
      addToast(tAdmin("您以员工【{{name}}】身份确认签收学习了该SOP说明！", { name: currentSimEmp.name }));
      setCurrentSelectedSimSop(saved);
      if (selectedSopForDetails?.id === sopId) {
        setSelectedSopForDetails(saved);
      }
    } catch (error) {
      addToast(error instanceof Error ? error.message : tAdmin("SOP签收失败"));
    }
  };

  // Toggle selection for specific targets
  const toggleEmployeeTargetSelection = (empId: number) => {
    setFormTargetIds(prev => 
      prev.includes(empId) ? prev.filter(id => id !== empId) : [...prev, empId]
    );
  };

  return (
    <div className="space-y-6">
      
      {/* Unified Control Toolbar (Combines Mode Switcher, Search input, and Create button) */}
      {!isCreating && (
        <div className="space-y-3">
          <div className="bg-white rounded-xl shadow-sm border border-slate-100 p-3 flex flex-col md:flex-row items-center justify-between gap-3">
          
          {/* 1. View Mode Toggles */}
          <div className="bg-slate-100 rounded-lg p-1 flex gap-1 items-center w-full md:w-auto shadow-inner">
            <button
              onClick={() => setActiveMode('manager')}
              className={`flex-1 md:flex-initial px-4 py-1.5 rounded-md text-xs font-bold transition flex items-center justify-center gap-1.5 ${
                activeMode === 'manager' 
                  ? 'bg-brand-600 text-white shadow-sm' 
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <UserCheck className="w-3.5 h-3.5" />
              <span>{tAdmin("【管理端】下发与统计")}</span>
            </button>
            
            <button
              onClick={() => {
                setActiveMode('simulator');
                // Auto select first SOP if available
                if (employeeVisibleSops.length > 0) {
                  setCurrentSelectedSimSop(employeeVisibleSops[0]);
                } else {
                  setCurrentSelectedSimSop(null);
                }
              }}
              className={`flex-1 md:flex-initial px-4 py-1.5 rounded-md text-xs font-bold transition flex items-center justify-center gap-1.5 relative ${
                activeMode === 'simulator' 
                  ? 'bg-slate-800 text-white shadow-sm' 
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <Smartphone className="w-3.5 h-3.5 text-orange-400" />
              <span>{tAdmin("【手机端】APP查看")}</span>
              
              {/* Soft reminder badge */}
              <span className="absolute -top-1 right-2 w-2.5 h-2.5 rounded-full bg-red-500 ring-2 ring-white"></span>
            </button>
          </div>

          {/* 2. Unified Search Input (Visible in Manager mode) */}
          {activeMode === 'manager' ? (
            <div className="relative flex-1 w-full md:w-auto">
              <input
                type="text"
                placeholder={tAdmin("搜索已下发的SOP名称、详情或发布人...")}
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-8 pr-3 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-lg outline-none focus:ring-2 focus:ring-brand-500"
              />
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
            </div>
          ) : (
            <div className="flex-1 text-slate-400 text-xs hidden md:block pl-2 font-semibold">{tAdmin("💡 正在查看移动端安全规章签字流程")}</div>
          )}

          {/* 3. Create SOP Button (Visible in Manager mode) */}
          {activeMode === 'manager' && (
            <button
              onClick={() => {
                setEditingSopId(null);
                setFormTitle("");
                setFormContent("");
                setFormTargetType('all');
                setFormTargetIds([]);
                setTempAttachments([]);
                setTempImages([]);
                setIsCreating(true);
              }}
              className="w-full md:w-auto px-4 py-1.5 text-xs font-bold text-white bg-brand-600 hover:bg-brand-700 rounded-lg shadow-sm hover:shadow transition flex items-center justify-center gap-1.5 shrink-0"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>{tAdmin("起草并下发新SOP")}</span>
            </button>
          )}

        </div>
          {showRefreshing ? (
            <div className="rounded-xl border border-brand-100 bg-brand-50/80 px-4 py-2 text-xs text-brand-700">
              {tAdmin("正在后台刷新 SOP 列表，当前先保留上一次成功加载的内容")}
            </div>
          ) : null}
        </div>
      )}

      {/* RENDER VIEW 1: SUPERVISOR MANAGER DASHBOARD */}
      {activeMode === 'manager' && (
        isCreating ? (
          <div className="space-y-6 animate-fade-in">
            {/* Studio Navigation / Header */}
            <div className="bg-white rounded-xl shadow-sm border border-slate-100 p-4 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-indigo-50 text-indigo-600 flex items-center justify-center font-bold shadow-inner">
                  <Sparkles className="w-5 h-5 text-indigo-500 animate-pulse" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] font-extrabold uppercase bg-indigo-100 text-indigo-700 px-2 py-0.5 rounded-full tracking-wider">{tAdmin("SOP 作业规程 · 智选编辑工作室 (Dual-Screen Studio)")}</span>
                    <span className="text-[10px] text-slate-400 font-mono">
                      {editingSopId ? tAdmin("正在编辑重构现有安全规范") : tAdmin("智起草全新作业规范手册")}
                    </span>
                  </div>
                  <h2 className="font-extrabold text-slate-800 text-base mt-1">
                    {editingSopId ? tAdmin("编辑/更正现有作业指导规范书") : tAdmin("起草、美装排版与多通道对口分发系统")}
                  </h2>
                </div>
              </div>

              <div className="flex flex-wrap gap-2 items-center w-full sm:w-auto self-stretch sm:self-auto justify-end">
                {/* Predefined templates loading triggers */}
                {!editingSopId && (
                  <div className="relative group">
                    <button
                      type="button"
                      className="px-3 py-1.5 bg-amber-500 hover:bg-amber-600 text-white rounded-lg text-xs font-bold transition flex items-center gap-1.5 shadow-sm"
                    >
                      <Sparkles className="w-3.5 h-3.5" />
                      <span>{tAdmin("载入快速规范模板")}</span>
                    </button>
                    <div className="absolute right-0 top-full mt-1.5 w-64 bg-white border border-slate-200 rounded-xl shadow-xl py-1 z-50 hidden group-hover:block divide-y divide-slate-100 animate-fade-in">
                      <div className="px-3 py-1.5 text-[10px] text-slate-400 font-bold bg-slate-50 uppercase tracking-widest rounded-t-xl">{tAdmin("选择 WMS 专业库房规章模板")}</div>
                      {sopTemplates.map((tpl, i) => (
                        <button
                          key={i}
                          type="button"
                          onClick={() => handleLoadTemplate(tpl)}
                          className="w-full text-left px-3 py-2 hover:bg-slate-55 hover:bg-slate-100 transition text-[11px] font-medium text-slate-700 block truncate"
                        >
                          {tpl.title}
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                <button
                  type="button"
                  onClick={() => {
                    setIsCreating(false);
                    setEditingSopId(null);
                  }}
                  className="px-4 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-600 text-xs font-bold rounded-lg transition"
                >{tAdmin("放弃并返回列表")}</button>
              </div>
            </div>

            {/* Dynamic Editorial Split Screen: Left (Editor controls) & Right (Phone Simulator UI Preview) */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-stretch">
              
              {/* Left Column: Spacious Formatting Suite (7 Columns) */}
              <div className="lg:col-span-7 bg-white rounded-xl shadow-sm border border-slate-100 p-6 flex flex-col space-y-5">
                <div>
                  <div className="flex items-center justify-between">
                    <h3 className="font-bold text-slate-800 text-sm flex items-center gap-1.5">
                      <FileText className="w-4 h-4 text-indigo-500" />
                      <span>{tAdmin("SOP 标准格式化起草面板")}</span>
                    </h3>
                    <span className="text-[10px] font-mono text-slate-400">{tAdmin("支持 HTML 标签富排版")}</span>
                  </div>
                  <div className="h-px bg-slate-100 mt-2"></div>
                </div>

                {/* SOP Title */}
                <div className="space-y-1.5">
                  <label className="block text-xs font-extrabold text-slate-600">{tAdmin("1. 规范文档名称 (请配置最醒目代表的条例标题):")}</label>
                  <input
                    type="text"
                    required
                    placeholder={tAdmin("请输入富有辨识性的文档标题，如：D区高空坠物及堆垛打安全操作规程...")}
                    value={formTitle}
                    onChange={(e) => setFormTitle(e.target.value)}
                    className="w-full px-3.5 py-2 text-xs bg-slate-50 border border-slate-200 rounded-lg text-slate-800 placeholder-slate-450 outline-none focus:ring-2 focus:ring-brand-500 focus:bg-white font-semibold transition"
                  />
                </div>

                {/* Rich formatting HTML controls & Workspace */}
                <div className="space-y-1.5">
                  <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2">
                    <label className="text-xs font-extrabold text-slate-600">{tAdmin("2. 规范核心指导条款内容:")}</label>
                    
                    {/* Quick bar formatting tools */}
                    <div className="flex flex-wrap gap-1 bg-slate-100/70 p-1 rounded-lg border border-slate-250">
                      <button
                        type="button"
                        onClick={() => handleInsertCustomTag('h3')}
                        className="px-2 py-1 text-[10px] hover:bg-white hover:shadow-xs rounded font-bold text-slate-700 transition"
                        title={tAdmin("插入条例大标题")}
                      >{tAdmin("H3 标题")}</button>
                      <button
                        type="button"
                        onClick={() => handleInsertCustomTag('p')}
                        className="px-2 py-1 text-[10px] hover:bg-white hover:shadow-xs rounded font-semibold text-slate-700 transition"
                        title={tAdmin("标准长文段落")}
                      >{tAdmin("P 段")}</button>
                      <button
                        type="button"
                        onClick={() => handleInsertCustomTag('b')}
                        className="px-2 py-1 text-[10px] hover:bg-white hover:shadow-xs rounded font-extrabold text-slate-900 transition"
                        title={tAdmin("加粗重点指令")}
                      >{tAdmin("B 粗体")}</button>
                      <button
                        type="button"
                        onClick={() => handleInsertCustomTag('warning')}
                        className="px-2 py-1 text-[10px] hover:bg-white hover:shadow-xs rounded font-bold text-amber-800 bg-amber-50 shadow-inner border border-amber-200 transition"
                        title={tAdmin("插入醒目黄边警告区")}
                      >{tAdmin("⚠️ 警告框")}</button>
                      <button
                        type="button"
                        onClick={() => handleInsertCustomTag('success')}
                        className="px-2 py-1 text-[10px] hover:bg-white hover:shadow-xs rounded font-bold text-emerald-800 bg-emerald-50 shadow-inner border border-emerald-200 transition"
                        title={tAdmin("插入绿边合规指示区")}
                      >{tAdmin("✔ 指正框")}</button>
                      <button
                        type="button"
                        onClick={() => handleInsertCustomTag('list')}
                        className="px-2 py-1 text-[10px] hover:bg-white hover:shadow-xs rounded text-slate-700 transition font-mono animate-pulse"
                        title={tAdmin("一键起步安检列表")}
                      >{tAdmin("☑ 点检勾选")}</button>
                      <button
                        type="button"
                        onClick={() => setShowImageInserter(!showImageInserter)}
                        className={`px-2 py-1 text-[10px] hover:bg-white hover:shadow-xs rounded font-bold transition flex items-center gap-1 border ${
                          showImageInserter 
                            ? 'bg-indigo-50 border-indigo-205 text-indigo-700 font-extrabold shadow-inner' 
                            : 'bg-white/80 border-transparent text-indigo-600'
                        }`}
                        title={tAdmin("在当前光标处直接嵌入外部示意网页图片插图")}
                      >
                        <ImageIcon className="w-3 h-3 text-indigo-505 text-indigo-600" />
                        <span>{tAdmin("📷 插入图片")}</span>
                      </button>
                    </div>
                  </div>

                  {showImageInserter && (
                    <div className="flex items-center gap-1.5 p-2 bg-indigo-50/50 border border-indigo-100 rounded-lg animate-fade-in mt-1 mb-2">
                      <input
                        type="url"
                        placeholder={tAdmin("输入网络图片 URL (如 https://images.unsplash.com/...)")}
                        value={formImageUrl}
                        onChange={(e) => setFormImageUrl(e.target.value)}
                        className="flex-1 px-3 py-1 text-xs bg-white border border-indigo-200 rounded-lg outline-none focus:ring-1 focus:ring-indigo-500 text-slate-800 font-mono"
                      />
                      <button
                        type="button"
                        onClick={handleInsertImageTag}
                        className="px-3 py-1 text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg transition shrink-0 shadow-sm"
                      >{tAdmin("确认插入")}</button>
                      <button
                        type="button"
                        onClick={() => {
                          setShowImageInserter(false);
                          setFormImageUrl("");
                        }}
                        className="p-1 px-2 text-xs font-bold text-slate-400 hover:text-slate-600 transition"
                      >
                        ✕
                      </button>
                    </div>
                  )}
 
                   <textarea
                     id="sopFormContent"
                     required
                     rows={12}
                    placeholder={tAdmin(`在此处键入您的核心作业命令或日常执行条例。您可以使用上方快速标签美观排版。
例如：
<h3>1. 备品前点检</h3>
<p>每日点检，凡是货叉出现疲劳裂缝必须挂牌停运。</p>
<div class="p-3 bg-amber-50 border-l-4 border-amber-500 rounded text-amber-900">
  <b>⚠️ 核心警示:</b>时速限制于3公里/小时以内，并在大门口对外部行人长鸣。</div>
<img src="https://images.unsplash.com/photo-1586528116311-ad8dd3c8310d?w=800" class="max-w-full rounded-lg my-1.5 shadow-sm inline-block" />`)}
                     value={formContent}
                     onChange={(e) => setFormContent(e.target.value)}
                     className="w-full px-3.5 py-3 text-xs bg-slate-50 border border-slate-200 rounded-lg text-slate-800 placeholder-slate-400 outline-none focus:ring-2 focus:ring-brand-500 focus:bg-white font-mono leading-relaxed resize-y min-h-[280px]"
                   />
                 </div>
 
                 {/* Upload attachment area with drag-and-drop */}
                 <div className="space-y-1.5">
                   <label className="block text-xs font-extrabold text-slate-600">{tAdmin("3. 挂载标准手册PDF、机械参数表Excel或实操图纸等电子文档附件 (支持无缝拖放):")}</label>
                   
                   <div
                     onDragOver={handleDragOver}
                     onDragLeave={handleDragLeave}
                     onDrop={handleDrop}
                     onClick={() => fileInputRef.current?.click()}
                     className={`border-2 border-dashed rounded-xl p-4 text-center cursor-pointer transition ${
                       isDragging 
                         ? 'border-brand-500 bg-brand-50 text-indigo-700 font-semibold' 
                         : 'border-slate-200 hover:border-brand-405 hover:border-slate-400 bg-slate-50 hover:bg-slate-100/50'
                     }`}
                   >
                     <input 
                       type="file" 
                       multiple
                       ref={fileInputRef}
                       onChange={handleFileSelect}
                       className="hidden" 
                     />
                     <Upload className="w-6 h-6 text-slate-400 mx-auto mb-1.5" />
                     <p className="text-xs font-extrabold text-slate-700">{tAdmin("拖拽文件至此，或者")}<span className="text-indigo-600 hover:underline">{tAdmin("点击这里浏览上传本地文件")}</span>
                     </p>
                     <p className="text-[10px] text-slate-400 mt-1">{tAdmin("支持常用的各种报表、说明规章、防震抗震部署等，随文发布在员工移动APP")}</p>
                   </div>

                  {tempAttachments.length > 0 && (
                    <div className="flex flex-wrap gap-2 pt-1.5 animate-fade-in">
                      {tempAttachments.map((f, i) => (
                        <div key={i} className="inline-flex items-center gap-1.5 px-2.5 py-1 text-[11px] font-mono text-slate-700 bg-slate-50 border border-slate-200 rounded-lg">
                          <Paperclip className="w-3.5 h-3.5 text-orange-500 animate-pulse" />
                          <span className="max-w-[150px] truncate">{f.name}</span>
                          <span className="text-[9px] text-slate-400 font-normal">({f.size})</span>
                          <button
                            type="button"
                            onClick={() => setTempAttachments(prev => prev.filter((_, idx) => idx !== i))}
                            className="ml-1 text-red-500 hover:text-red-700 text-[10px]"
                          >
                            ✕
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* Targeted Distribution list */}
                <div className="space-y-3.5 border-t border-slate-100 pt-5">
                  <div className="flex justify-between items-center">
                    <label className="block text-xs font-extrabold text-slate-650 text-slate-600">{tAdmin("4. 配置本次规范的下发受众范围:")}</label>
                    {formTargetType === 'specific' && (
                      <span className="text-[10px] font-extrabold text-indigo-700 bg-indigo-50 border border-indigo-150 px-2 py-0.5 rounded animate-bounce">{tAdmin("已针对性选中个别员工 ({{count}}人)", { count: formTargetIds.length })}</span>
                    )}
                  </div>

                  <div className="flex gap-4">
                    <label className="flex items-center gap-1.5 cursor-pointer text-xs font-bold text-slate-700 select-none">
                      <input
                        type="radio"
                        name="studioTarget"
                        checked={formTargetType === 'all'}
                        onChange={() => setFormTargetType('all')}
                        className="w-4 h-4 text-brand-600 focus:ring-brand-500"
                      />
                      <span>{tAdmin("下发全在职员工 ({{count}}人)", { count: employees.length })}</span>
                    </label>

                    <label className="flex items-center gap-1.5 cursor-pointer text-xs font-bold text-indigo-700 select-none">
                      <input
                        type="radio"
                        name="studioTarget"
                        checked={formTargetType === 'specific'}
                        onChange={() => setFormTargetType('specific')}
                        className="w-4 h-4 text-brand-650 focus:ring-brand-500"
                      />
                      <span>{tAdmin("个别对口岗员工 (按班组、工种或姓名点选)")}</span>
                    </label>
                  </div>

                  {/* Selective target list with search and team select filters */}
                  {formTargetType === 'specific' && (
                    <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 space-y-3 animate-fade-in">
                      
                      {/* Department / Role Quick select tags */}
                      <div className="space-y-1.5">
                        <span className="text-[10px] font-extrabold text-slate-400 uppercase tracking-widest block font-mono">{tAdmin("快速多选组别:")}</span>
                        <div className="flex flex-wrap gap-1.5">
                          <button
                            type="button"
                            onClick={() => handleGroupSelect('all')}
                            className="px-2.5 py-1 text-[10px] font-bold bg-white border border-slate-200 rounded-lg text-slate-700 hover:bg-slate-100 shadow-xs transition"
                          >{tAdmin("全选")}</button>
                          <button
                            type="button"
                            onClick={() => handleGroupSelect('none')}
                            className="px-2.5 py-1 text-[10px] font-bold bg-white border border-slate-200 rounded-lg text-slate-700 hover:bg-slate-100 shadow-xs transition"
                          >{tAdmin("清空")}</button>
                          <button
                            type="button"
                            onClick={() => handleGroupSelect('dept', tAdmin("A区入库"))}
                            className="px-2.5 py-1 text-[10px] font-bold bg-indigo-50 border border-indigo-100 rounded-lg text-indigo-700 hover:bg-indigo-100 transition"
                          >{tAdmin("A区入库班组")}</button>
                          <button
                            type="button"
                            onClick={() => handleGroupSelect('dept', tAdmin("B区出库"))}
                            className="px-2.5 py-1 text-[10px] font-bold bg-emerald-50 border border-emerald-100 rounded-lg text-emerald-700 hover:bg-emerald-100 transition"
                          >{tAdmin("B区出库班组")}</button>
                          <button
                            type="button"
                            onClick={() => handleGroupSelect('role', tAdmin("打包员"))}
                            className="px-2.5 py-1 text-[10px] font-bold bg-amber-50 border border-amber-100 rounded-lg text-amber-700 hover:bg-amber-100 transition"
                          >{tAdmin("全仓打包员")}</button>
                          <button
                            type="button"
                            onClick={() => handleGroupSelect('role', tAdmin("叉车工"))}
                            className="px-2.5 py-1 text-[10px] font-bold bg-rose-50 border border-rose-100 rounded-lg text-rose-750 text-rose-700 hover:bg-rose-100 transition"
                          >{tAdmin("叉车司机")}</button>
                        </div>
                      </div>

                      {/* Targeted Search */}
                      <div className="relative">
                        <input
                          type="text"
                          placeholder={tAdmin("检索具体目标人员姓名、职位或部门组...")}
                          className="w-full pl-8 pr-3 py-1.5 text-xs bg-white border border-slate-200 rounded-lg outline-none focus:ring-2 focus:ring-brand-500 shadow-sm"
                          onChange={(e) => {
                            const val = e.target.value.toLowerCase();
                            const rows = document.querySelectorAll(".studio-emp-row");
                            rows.forEach((row: any) => {
                              const text = row.innerText.toLowerCase();
                              if (text.includes(val)) {
                                row.style.display = "flex";
                              } else {
                                row.style.display = "none";
                              }
                            });
                          }}
                        />
                        <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
                      </div>

                      {/* Employees List view */}
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-44 overflow-y-auto pr-1">
                        {employees.map(emp => {
                          const isChecked = formTargetIds.includes(emp.id);

                          return (
                            <label
                              key={emp.id}
                              className={`studio-emp-row flex items-center gap-2 p-2 rounded-lg border cursor-pointer select-none transition ${
                                isChecked 
                                  ? 'bg-indigo-50/50 border-indigo-200 text-slate-800 font-semibold shadow-xs' 
                                  : 'bg-white border-slate-100 hover:bg-slate-50 text-slate-600'
                              }`}
                            >
                              <input
                                type="checkbox"
                                checked={isChecked}
                                onChange={() => toggleEmployeeTargetSelection(emp.id)}
                                className="w-3.5 h-3.5 text-indigo-600 focus:ring-brand-300 rounded cursor-pointer"
                              />
                              <div className="text-xs truncate">
                                <span className="font-bold">{emp.name}</span>
                                <span className="text-[9px] text-slate-400 block font-normal">{emp.dept} · {emp.role}</span>
                              </div>
                            </label>
                          );
                        })}
                      </div>

                    </div>
                  )}

                </div>

                {/* Submitting controls */}
                <div className="pt-2">
                  <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 flex gap-3">
                    <button
                      type="button"
                      onClick={() => {
                        setIsCreating(false);
                        setEditingSopId(null);
                      }}
                      className="flex-1 py-2.5 bg-white border border-slate-200 hover:bg-slate-100 text-slate-500 font-bold rounded-lg text-xs transition"
                    >{tAdmin("取消修改并舍弃")}</button>
                    
                    <button
                      type="button"
                      onClick={handleSaveSop}
                      disabled={isSubmittingSop}
                      className="flex-1 py-2.5 bg-indigo-600 hover:bg-indigo-700 disabled:bg-slate-400 disabled:cursor-not-allowed text-white font-extrabold rounded-lg text-xs transition shadow-md hover:shadow-lg flex items-center justify-center gap-1.5"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      <span>{isSubmittingSop ? tAdmin("正在同步保存...") : editingSopId ? tAdmin("保存并完成对口同步发布") : tAdmin("立即全端一键通知下发")}</span>
                    </button>
                  </div>
                </div>

              </div>

              {/* Right Column: Live Smartphone Simulation Preview (5 columns) */}
              <div className="lg:col-span-5 flex flex-col space-y-4">
                
                <div className="bg-white rounded-xl shadow-sm border border-slate-100 p-4">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                      <Smartphone className="w-4 h-4 text-orange-500 animate-pulse" />
                      <span>{tAdmin("移动端实时高仿真呈现效果 (Live Render)")}</span>
                    </span>
                    <span className="text-[9.5px] font-bold text-emerald-600 bg-emerald-50 border border-emerald-150 px-2 py-0.5 rounded cursor-default">{tAdmin("同步渲染中")}</span>
                  </div>
                  <p className="text-[10px] text-slate-400 mt-1">{tAdmin("此处百分百仿真物料员在手机 APP 接收此规范指令时的页面，请审核排版是否规整可读。")}</p>
                </div>

                {/* Phone container */}
                <div className="mx-auto w-[310px] bg-slate-900 rounded-[44px] p-2.5 shadow-2xl border-4 border-slate-805 border-slate-800 sticky top-4 h-[630px] flex flex-col justify-between">
                  {/* Notch */}
                  <div className="px-5 pt-1.5 pb-2 flex items-center justify-between text-slate-300 text-[10px]">
                    <span className="font-bold select-none font-mono">15:30</span>
                    <div className="w-16 h-3.5 bg-black rounded-b-xl absolute left-1/2 -translate-x-1/2 top-2.5"></div>
                    <div className="flex items-center gap-1">
                      <span className="text-[8px] bg-pink-500/20 px-1 rounded text-orange-400 font-extrabold uppercase">5G FULL</span>
                      <div className="w-4.5 h-2 bg-white/70 rounded-xs"></div>
                    </div>
                  </div>

                  {/* Device Screen wrapper */}
                  <div className="bg-slate-100 flex-1 rounded-[32px] overflow-hidden flex flex-col relative h-full">
                    
                    {/* Screen banner */}
                    <div className="bg-gradient-to-r from-orange-600 to-amber-600 text-white p-3 pt-4 text-center">
                      <span className="text-[8px] bg-white/20 text-white px-2 py-0.5 rounded-full font-bold">{tAdmin("WMS 移动学习终端 v2.10")}</span>
                      <h4 className="text-xs font-extrabold mt-1 truncate">
                        {formTitle ? formTitle.trim() : tAdmin("无标题规程（起草中）")}
                      </h4>
                      <div className="flex items-center justify-center gap-2 text-[8px] text-orange-100 mt-0.5">
                        <span>{tAdmin("下发人: 安全督导/WMS安全处")}</span>
                        <span>·</span>
                        <span>{tAdmin("时间: 今天 (刚刚)")}</span>
                      </div>
                    </div>

                    {/* Smartphone scrolling body */}
                    <div className="p-3 space-y-3.5 overflow-y-auto flex-1 text-[11px] leading-relaxed">
                      
                      {/* Safety sign mandatory notify banner */}
                      <div className="p-2.5 bg-amber-50 rounded-xl border border-amber-200 text-[9.5px] text-amber-900 flex items-start gap-1">
                        <Info className="w-3.5 h-3.5 text-amber-500 shrink-0 mt-0.5" />
                        <div>
                          <span className="font-bold">{tAdmin("⚠️ 安全合规签字指示:")}</span>
                          <p className="text-[9px] text-amber-700/80 mt-0.5 leading-normal">{tAdmin("根据《仓储合规硬性条例》，此文档包含强制安全标准流程。所有对口人员必须在查看完毕后签字签收。")}</p>
                        </div>
                      </div>

                      {/* Main text box display HTML directly */}
                      <div className="bg-white rounded-xl border border-slate-200 p-3 space-y-2.5">
                        <span className="text-[8px] font-extrabold text-brand-600 uppercase tracking-widest block font-mono">{tAdmin("NOW STUDYING · 规章正文")}</span>
                        
                        <div 
                          className="text-[10px] text-slate-650 space-y-2 select-text"
                          dangerouslySetInnerHTML={{ 
                            __html: formContent 
                              ? formContent.replace(/\n/g, '<br />')
                              : `<span class="text-slate-400 italic font-sans dark:text-slate-500">${tAdmin("（主干条款正文为空。请在左方编撰正文条目或直接选择“载入快速规范模板”...）")}</span>`
                          }} 
                        />

                        {/* Images */}
                        {tempImages.length > 0 && (
                          <div className="grid grid-cols-1 gap-1.5 pt-1">
                            {tempImages.map((img, idx) => (
                              <div key={idx} className="relative rounded-lg overflow-hidden border border-slate-100 bg-slate-50 h-[110px]">
                                <img src={img} className="w-full h-full object-cover" alt="" referrerPolicy="no-referrer" />
                              </div>
                            ))}
                          </div>
                        )}

                        {/* Attachments */}
                        {tempAttachments.length > 0 && (
                          <div className="space-y-1 pt-1.5 border-t border-slate-100">
                            <p className="text-[8px] font-bold text-slate-400 uppercase tracking-wide">{tAdmin("🔗 相关标准规章电子文档附件:")}</p>
                            <div className="space-y-1">
                              {tempAttachments.map((file, i) => (
                                <div
                                  key={i}
                                  className="w-full flex items-center justify-between p-1.5 bg-slate-50 border border-slate-200 rounded-lg text-[9px] text-slate-700 font-mono"
                                >
                                  <span className="truncate flex-1 font-sans">{file.name}</span>
                                  <span className="text-[8px] text-slate-400 bg-white px-1 py-0.5 rounded border border-slate-101 ml-2">
                                    {file.size}
                                  </span>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>

                      {/* Signature simulation footer inside phone viewport */}
                      <div className="border-t border-slate-200 pt-3">
                        <button
                          type="button"
                          disabled
                          className="w-full py-2 bg-gradient-to-r from-orange-600 to-amber-600 text-white rounded-xl text-[10px] font-extrabold flex items-center justify-center gap-1 opacity-70 cursor-not-allowed shadow-md"
                        >
                          <Send className="w-3 h-3 text-white" />
                          <span>{tAdmin("签字签收并服从管理指令")}</span>
                        </button>
                        <span className="text-[8px] text-slate-400 text-center block mt-1 font-medium font-sans">{tAdmin("预览模式下无法进行实机签章")}</span>
                      </div>

                    </div>

                    {/* Bottom Indicator */}
                    <div className="h-3 flex items-center justify-center bg-slate-100 pb-1">
                      <div className="w-16 h-1 bg-slate-350 bg-slate-300 rounded-full"></div>
                    </div>

                  </div>
                </div>

              </div>
              
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-1 xl:grid-cols-3 gap-6 items-start">
            
            {/* Column A: Left side list displaying published SOPs */}
            <div className={`${selectedSopForDetails ? "xl:col-span-2" : "xl:col-span-3"} space-y-4`}>

            {/* List entries for current SOPs */}
            <div className="space-y-3" aria-busy={isLoadingSops}>
              {filteredSops.length === 0 ? (
                <div className="bg-white rounded-xl p-12 text-center border border-slate-100 text-slate-400">
                  <FileText className="w-12 h-12 text-slate-200 mx-auto mb-3" />
                  <p className="text-sm font-semibold">{tAdmin("没有找到匹配检索的SOP规范")}</p>
                  <p className="text-xs text-slate-400 mt-1">{tAdmin("您可以点击右上方 “起草并下发新SOP” 编写首份仓库作业安全手册")}</p>
                </div>
              ) : (
                filteredSops.map(sop => {
                  // Calculate read progress percentages
                  const eligibleEmployees = employees.filter(emp => {
                    if (sop.targetType === 'all') return true;
                    return sop.targetEmployeeIds?.includes(emp.id);
                  });
                  const totalEligible = eligibleEmployees.length;
                  const confirmedCount = Object.keys(sop.reads || {}).filter(idStr => 
                    eligibleEmployees.some(emp => emp.id === parseInt(idStr))
                  ).length;
                  const ratio = totalEligible > 0 ? (confirmedCount / totalEligible) * 100 : 0;

                  const isSopSelected = selectedSopForDetails?.id === sop.id;

                  return (
                    <div 
                      key={sop.id}
                      onClick={() => setSelectedSopForDetails(selectedSopForDetails?.id === sop.id ? null : sop)}
                      className={`bg-white rounded-xl shadow-sm border transition p-4 cursor-pointer relative overflow-hidden flex flex-col md:flex-row justify-between items-start md:items-center gap-3 hover:border-brand-300 hover:shadow-md ${
                        isSopSelected ? 'border-brand-500 ring-2 ring-brand-50' : 'border-slate-100'
                      }`}
                    >
                      <div className="space-y-1.5 max-w-full md:max-w-md">
                        <div className="flex flex-wrap gap-1.5 items-center">
                          {sop.targetType === 'all' ? (
                            <span className="px-2 py-0.5 rounded text-[10px] font-semibold text-emerald-700 bg-emerald-50 border border-emerald-100 flex items-center gap-1">
                              <Users className="w-3 h-3" />{tAdmin("全员下发")}</span>
                          ) : (
                            <span className="px-2 py-0.5 rounded text-[10px] font-semibold text-blue-700 bg-blue-50 border border-blue-100 flex items-center gap-1">
                              <UserCheck className="w-3 h-3" />
                              {tAdmin("个别员工 ({{count}}人)", { count: sop.targetEmployeeIds?.length })}
                            </span>
                          )}
                          <span className="text-[10px] font-mono text-slate-400">{sop.createdAt}</span>
                        </div>

                        <h3 className="font-bold text-slate-800 text-sm max-w-full line-clamp-1">{sop.title}</h3>
                        
                        <div className="flex flex-wrap items-center gap-3 text-xs text-slate-400 font-mono">
                          <span>{tAdmin("发布: {{creator}}", { creator: sop.creator })}</span>
                          {sop.attachments.length > 0 && (
                            <span className="flex items-center gap-0.5 text-orange-500">
                              <Paperclip className="w-3 h-3" />
                              {tAdmin("{{count}} 份文件", { count: sop.attachments.length })}
                            </span>
                          )}
                          {sop.images.length > 0 && (
                            <span className="flex items-center gap-0.5 text-indigo-500">
                              <ImageIcon className="w-3 h-3" />
                              {tAdmin("{{count}} 张嵌入图", { count: sop.images.length })}
                            </span>
                          )}
                        </div>
                      </div>

                      {/* Read Ratio Statistics Ring / Bar */}
                      <div className="flex items-center gap-4 flex-shrink-0 self-stretch md:self-auto justify-between md:justify-end border-t md:border-t-0 border-slate-100 pt-3 md:pt-0 mt-2 md:mt-0">
                        <div className="text-left md:text-right">
                          <p className="text-[10px] text-slate-400 font-semibold uppercase tracking-wider">{tAdmin("确认签收进度")}</p>
                          <div className="flex items-center gap-1.5 mt-0.5">
                            <div className="w-24 bg-slate-100 h-2 rounded-full overflow-hidden">
                              <div 
                                className="bg-brand-500 h-full rounded-full" 
                                style={{ width: `${ratio}%` }} 
                              />
                            </div>
                            <span className="text-xs font-bold font-mono text-slate-700">{ratio.toFixed(0)}%</span>
                          </div>
                          <span className="text-[10px] text-slate-400 block mt-0.5">{tAdmin("已确认 {{confirmed}} / {{total}} 人", { confirmed: confirmedCount, total: totalEligible })}</span>
                        </div>

                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleOpenEditSop(sop);
                          }}
                          className="p-1.5 hover:bg-slate-100 text-slate-400 hover:text-indigo-650 rounded-lg transition mr-1"
                          title={tAdmin("修改并重新下发此SOP")}
                        >
                          <Edit className="w-4 h-4 text-indigo-500" />
                        </button>

                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleDeleteSop(sop.id, sop.title);
                          }}
                          className="p-1.5 hover:bg-red-50 text-slate-400 hover:text-red-500 rounded-lg transition"
                          title={tAdmin("删除并召回作业规范")}
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>

                    </div>
                  );
                })
              )}
            </div>

          </div>

          {/* Column B: Right sidebar displaying Selected SOP Receipt Logs details */}
          {selectedSopForDetails && (
            <div className="space-y-4">
              <div className="bg-white rounded-xl shadow-sm border border-slate-100 overflow-hidden flex flex-col">
                <div className="p-4 bg-slate-50 border-b border-slate-100 flex justify-between items-center">
                  <div>
                    <h3 className="font-bold text-slate-800 text-sm">{tAdmin("SOP 指导学习反馈追踪")}</h3>
                    <p className="text-xs text-slate-400 mt-0.5">{selectedSopForDetails.title}</p>
                  </div>
                  <button 
                    onClick={() => setSelectedSopForDetails(null)}
                    className="p-1.5 hover:bg-slate-200/60 text-slate-400 hover:text-slate-600 rounded-lg transition"
                    title={tAdmin("收起详情")}
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>

                <div className="p-4 space-y-4">
                  {/* General targets */}
                  <div>
                    <h4 className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-2 flex items-center justify-between">
                      <span>{tAdmin("已阅读签收公示栏")}</span>
                      <span className="text-brand-600 font-mono">
                        {
                          employees.filter(emp => {
                            const isEligible = selectedSopForDetails.targetType === 'all' || selectedSopForDetails.targetEmployeeIds?.includes(emp.id);
                            const wasRead = selectedSopForDetails.reads && selectedSopForDetails.reads[emp.id];
                            return isEligible && wasRead;
                          }).length
                        }{tAdmin(" 人已签")}
                      </span>
                    </h4>

                    {/* Interactive lists of readers */}
                    <div className="max-h-80 overflow-y-auto space-y-2.5 pr-1">
                      {employees.filter(emp => {
                        // Check eligibility
                        if (selectedSopForDetails.targetType === 'all') return true;
                        return selectedSopForDetails.targetEmployeeIds?.includes(emp.id);
                      }).map(emp => {
                        const readTime = selectedSopForDetails.reads?.[emp.id];
                        const didRead = !!readTime;

                        return (
                          <div 
                            key={emp.id}
                            className={`flex items-center justify-between p-2 rounded-lg border text-xs transition-colors ${
                              didRead 
                                ? 'bg-emerald-50/50 border-emerald-100 text-emerald-800' 
                                : 'bg-slate-50/40 border-slate-100 text-slate-600'
                            }`}
                          >
                            <div className="flex items-center gap-2">
                              <div className="w-6 h-6 rounded-full bg-slate-200 flex items-center justify-center text-[10px] font-bold text-slate-600 overflow-hidden">
                                {emp.photo ? (
                                  <img src={emp.photo} className="w-full h-full object-cover" alt="" referrerPolicy="no-referrer" />
                                ) : (
                                  <span>{emp.name.charAt(0)}</span>
                                )}
                              </div>
                              <div>
                                <p className="font-semibold">{emp.name}</p>
                                <p className="text-[9px] text-slate-400">{emp.dept} · {emp.role}</p>
                              </div>
                            </div>

                            {didRead ? (
                              <div className="text-right">
                                <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 bg-emerald-100 text-emerald-800 rounded font-bold text-[9px]">
                                  <Check className="w-2.5 h-2.5" />{tAdmin("已签字")}</span>
                                <span className="text-[8px] text-slate-400 block mt-0.5 font-mono">{readTime}</span>
                              </div>
                            ) : (
                              <div>
                                <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 bg-slice-50 text-amber-700 bg-amber-50 rounded text-[9px] border border-amber-100 font-bold">
                                  <Clock className="w-2.5 h-2.5 text-amber-500 animate-spin" />{tAdmin("待签收")}</span>
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </div>

                  <div className="p-3.5 bg-amber-50 text-amber-950 rounded-lg border border-amber-100 text-xs leading-relaxed space-y-1.5">
                    <p className="font-bold flex items-center gap-1.5 text-amber-800">
                      <AlertTriangle className="w-3.5 h-3.5" />{tAdmin("对漏签人员的安检提示")}</p>
                    <p className="text-[11px] text-slate-600">{tAdmin("本批次指导规范包含重要劳护与卸货机械安全指令。对于上图标红/待签收的生产人员，请班组长在每天上工、交接班前现场宣导完毕，并指导其打开手机登录客户端签字。")}</p>
                  </div>
                </div>
              </div>
            </div>
          )}

        </div>
      ))}

      {/* RENDER VIEW 2: PORTABLE WORKER APP SIMULATOR */}
      {activeMode === 'simulator' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          
          {/* Simulation Settings and Instruction panel */}
          <div className="lg:col-span-4 bg-white rounded-xl shadow-sm border border-slate-100 p-5 space-y-4">
            <div>
              <h3 className="font-bold text-slate-800 text-sm flex items-center gap-1.5">
                <Sparkles className="w-4 h-4 text-brand-500" />{tAdmin("手机端模拟说明")}</h3>
              <p className="text-xs text-slate-500 mt-1 leading-relaxed">{tAdmin("这是本系统的")}<b>{tAdmin("“仓储助理”APP原生轻量版模拟器")}</b>{tAdmin("。通过该端，您的卡车理货员、高架叉车工能够在工作终端或个人触屏上直接看新发布的文件，并点击电子承兑签名反馈。")}</p>
            </div>

            <div className="border-t border-slate-100 pt-4 space-y-3">
              <label className="block text-xs font-bold text-slate-600">{tAdmin("👤 选择切换登录模拟的员工账号:")}</label>
              
              <div className="space-y-1.5 max-h-80 overflow-y-auto">
                {employees.map(emp => {
                  const unreadCount = sops.filter(s => {
                    const isEligible = s.targetType === 'all' || s.targetEmployeeIds?.includes(emp.id);
                    const didRead = s.reads && s.reads[emp.id];
                    return isEligible && !didRead;
                  }).length;

                  return (
                    <button
                      key={emp.id}
                      onClick={() => {
                        setSimulatedEmployeeId(emp.id);
                        // Reset sub selected view
                        const updatedVisible = sops.filter(s => {
                          if (s.status !== 'published') return false;
                          if (s.targetType === 'all') return true;
                          return s.targetType === 'specific' && s.targetEmployeeIds?.includes(emp.id);
                        });
                        if (updatedVisible.length > 0) {
                          setCurrentSelectedSimSop(updatedVisible[0]);
                        } else {
                          setCurrentSelectedSimSop(null);
                        }
                      }}
                      className={`w-full flex items-center justify-between p-2 rounded-lg border text-left transition ${
                        simulatedEmployeeId === emp.id 
                          ? 'border-brand-500 bg-brand-50 text-slate-800 ring-1 ring-brand-100' 
                          : 'border-slate-100 hover:bg-slate-50 text-slate-600'
                      }`}
                    >
                      <div className="flex items-center gap-2">
                        <div className="w-7 h-7 rounded-full bg-slate-200 flex items-center justify-center text-xs font-black overflow-hidden flex-shrink-0">
                          {emp.photo ? (
                            <img src={emp.photo} className="w-full h-full object-cover" alt="" referrerPolicy="no-referrer" />
                          ) : (
                            <span>{emp.name.charAt(0)}</span>
                          )}
                        </div>
                        <div className="truncate">
                          <p className="text-xs font-bold truncate max-w-[120px]">{emp.name}</p>
                          <p className="text-[9px] text-slate-400 truncate">{emp.dept} · {emp.role}</p>
                        </div>
                      </div>

                      {unreadCount > 0 ? (
                        <span className="bg-red-500 text-white font-bold px-1.5 py-0.5 rounded-full text-[9px] font-mono shadow-sm">{tAdmin("{{count}} 篇未读", { count: unreadCount })}</span>
                      ) : (
                        <span className="text-[9px] text-emerald-600 font-semibold flex items-center gap-0.5">{tAdmin("✓ 全部已签")}</span>
                      )}
                    </button>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Smartphone Preview Frame */}
          <div className="lg:col-span-8 flex justify-center py-2 bg-slate-100/50 rounded-2xl border border-dashed border-slate-200 p-4">
            <div className="relative w-full max-w-[375px] h-[670px] bg-slate-900 rounded-[40px] shadow-2xl overflow-hidden p-3 border-4 border-slate-800 flex flex-col">
              
              {/* Dynamic island / Phone Speaker notch */}
              <div className="absolute top-4 left-1/2 -translate-x-1/2 w-28 h-4 bg-black rounded-full z-45 flex items-center justify-center">
                <div className="w-2.5 h-2.5 rounded-full bg-slate-900/80 absolute right-4"></div>
              </div>

              {/* In App View layout */}
              <div className="w-full h-full bg-[#f6f8fa] rounded-[32px] overflow-hidden flex flex-col pt-4 relative text-slate-800 select-none">
                
                {/* Simulated mobile status app bar */}
                <div className="h-6 px-4 flex justify-between items-center text-[10px] text-slate-500 font-bold font-mono">
                  <span>08:45 AM</span>
                  <div className="flex gap-1.5 items-center">
                    <span>5G LTE</span>
                    <span className="w-5 h-2.5 rounded bg-slate-400 flex items-center p-0.5 justify-end">
                      <span className="w-3.5 h-full bg-slate-900 rounded"></span>
                    </span>
                  </div>
                </div>

                {/* Live App Title Bar */}
                <div className="bg-white border-b border-slate-100 p-3 px-4 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="w-7 h-7 rounded-full bg-gradient-to-tr from-brand-500 to-amber-500 text-white flex items-center justify-center font-black text-xs">
                      W
                    </div>
                    <div>
                      <h4 className="text-xs font-bold text-slate-800">{tAdmin("WMS移动规章助手")}</h4>
                      <p className="text-[8px] text-slate-400">{tAdmin("当前：{{name}} (ID: #{{id}})", { name: currentSimEmp.name, id: currentSimEmp.id })}</p>
                    </div>
                  </div>

                  <span className="px-2 py-0.5 rounded bg-orange-55 text-orange-600 bg-orange-50 font-semibold font-mono text-[9px]">{tAdmin("缅/泰双语版")}</span>
                </div>

                {/* Sub App Content Scroll view */}
                <div className="flex-1 overflow-y-auto p-3.5 space-y-3.5 flex flex-col">
                  
                  {/* Personal Stat Card banner */}
                  <div className="bg-gradient-to-r from-slate-800 to-indigo-950 p-3 rounded-2xl text-white space-y-1 shadow-sm">
                    <div className="flex justify-between items-center">
                      <span className="text-[8px] font-bold tracking-wider text-slate-400 uppercase">
                        SOP LEARNING CENTER
                      </span>
                      <span className="text-[8px] bg-slate-700/60 font-semibold px-2 py-0.5 rounded-full text-indigo-300">{tAdmin("双向签名合规")}</span>
                    </div>
                    <p className="text-xs font-semibold">{tAdmin("您好，{{name}}！", { name: currentSimEmp.name })}</p>
                    <p className="text-[9px] text-slate-300">{tAdmin("请复核以下下发至您的新操作标准文档并签章确认。")}</p>
                  </div>

                  {/* Horizontal Lists of active documents for this employee */}
                  <div className="space-y-1.5">
                    <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wider block px-1">{tAdmin("📄 我的专属指导规范清单 ({{count}})", { count: employeeVisibleSops.length })}</span>

                    {employeeVisibleSops.length === 0 ? (
                      <div className="bg-white rounded-xl p-6 text-center border border-slate-100 text-slate-400">
                        <CheckCircle className="w-8 h-8 text-emerald-200 mx-auto mb-1" />
                        <p className="text-[10px] font-bold text-emerald-800">{tAdmin("恭喜！已完成所有学习")}</p>
                        <p className="text-[9px] text-slate-400 mt-0.5">{tAdmin("管理员暂无发布针对您的未读说明")}</p>
                      </div>
                    ) : (
                      <div className="grid grid-cols-1 gap-2">
                        {employeeVisibleSops.map(sop => {
                          const isRead = sop.reads && sop.reads[simulatedEmployeeId];
                          const isActive = currentSelectedSimSop?.id === sop.id;

                          return (
                            <button
                              key={sop.id}
                              type="button"
                              onClick={() => setCurrentSelectedSimSop(sop)}
                              className={`w-full p-2.5 rounded-xl border text-left transition flex items-center justify-between gap-2 shadow-sm ${
                                isActive 
                                  ? 'bg-white border-brand-500 font-bold' 
                                  : 'bg-white border-slate-100 font-normal hover:bg-slate-50'
                              }`}
                            >
                              <div className="truncate flex-1">
                                <p className="text-[11px] text-slate-800 font-bold truncate">{sop.title}</p>
                                <p className="text-[8px] text-slate-400 mt-0.5 font-mono">{tAdmin("下发时间: {{time}}", { time: sop.createdAt })}</p>
                              </div>

                              <div>
                                {isRead ? (
                                  <span className="px-1.5 py-0.5 rounded bg-emerald-50 text-emerald-600 border border-emerald-100 text-[8px] font-bold">{tAdmin("✓ 已签章")}</span>
                                ) : (
                                  <span className="px-1.5 py-0.5 rounded bg-amber-50 text-amber-600 border border-emerald-100 text-[8px] font-bold animate-pulse">{tAdmin("待签")}</span>
                                )}
                              </div>
                            </button>
                          );
                        })}
                      </div>
                    )}
                  </div>

                  {/* Selected Sop Details inside the smartphone */}
                  {currentSelectedSimSop ? (
                    <div className="bg-white rounded-2xl border border-slate-100 p-3.5 space-y-3 shadow-sm select-text">
                      <div className="border-b border-slate-100 pb-2">
                        <span className="text-[8px] font-extrabold text-[#6366f1] bg-indigo-50 border border-indigo-100 px-1.5 py-0.5 rounded tracking-wider font-mono">{tAdmin("正在学习")}</span>
                        <h5 className="text-xs font-black mt-1.5 text-slate-800">
                          {currentSelectedSimSop.title}
                        </h5>
                        <div className="text-[8.5px] text-slate-400 mt-1 font-mono flex flex-wrap gap-x-2">
                          <span>{tAdmin("发布者: {{creator}}", { creator: currentSelectedSimSop.creator })}</span>
                          <span>{tAdmin("时间: {{time}}", { time: currentSelectedSimSop.createdAt })}</span>
                        </div>
                      </div>

                      {/* Content with HTML render */}
                      <div 
                        className="text-[10.5px] leading-relaxed text-slate-650 space-y-2 font-sans"
                        dangerouslySetInnerHTML={{ 
                          __html: currentSelectedSimSop.content.replace(/\n/g, '<br />') 
                        }} 
                      />

                      {/* Interactive images if any */}
                      {currentSelectedSimSop.images && currentSelectedSimSop.images.length > 0 && (
                        <div className="grid grid-cols-1 gap-1.5 pt-1">
                          {currentSelectedSimSop.images.map((img, idx) => (
                            <div key={idx} className="relative rounded-lg overflow-hidden border border-slate-200 bg-slate-50 h-[120px]">
                              <img src={img} className="w-full h-full object-cover" alt="" referrerPolicy="no-referrer" />
                            </div>
                          ))}
                        </div>
                      )}

                      {/* Attachments list with download simulation */}
                      {currentSelectedSimSop.attachments && currentSelectedSimSop.attachments.length > 0 && (
                        <div className="space-y-1.5 pt-2 border-t border-slate-100">
                          <p className="text-[8.5px] font-extrabold text-slate-400 uppercase tracking-widest font-mono">{tAdmin("相关电子文档下载 (Simulated):")}</p>
                          <div className="space-y-1">
                            {currentSelectedSimSop.attachments.map((file, idx) => (
                              <button
                                key={idx}
                                onClick={() => addToast(tAdmin("正在下载文档：{{name}} (大小: {{size}})...", { name: file.name, size: file.size }))}
                                className="w-full flex items-center justify-between p-2 bg-slate-50 hover:bg-slate-100 rounded-lg text-[9px] text-slate-705 font-mono text-left border border-slate-150 transition"
                              >
                                <span className="truncate flex-1 font-sans">{file.name}</span>
                                <span className="text-[8px] text-[#6366f1] hover:underline shrink-0 ml-2 font-semibold font-mono">
                                  {file.size} ↓
                                </span>
                              </button>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* Action buttons to mark as read */}
                      <div className="border-t border-slate-100 pt-3 font-sans">
                        {currentSelectedSimSop.reads?.[simulatedEmployeeId] ? (
                          <div className="p-2.5 bg-emerald-50 rounded-xl border border-emerald-100 flex items-center justify-center gap-1.5">
                            <Check className="w-4 h-4 text-emerald-600" />
                            <div className="text-left">
                              <span className="text-[10px] font-extrabold text-emerald-900 block">{tAdmin("我已于手机端签署承认")}</span>
                              <span className="text-[8px] text-slate-400 font-mono">{tAdmin("签收时间: {{time}}", { time: currentSelectedSimSop.reads[simulatedEmployeeId] })}</span>
                            </div>
                          </div>
                        ) : (
                          <div className="space-y-2">
                            <div className="p-2 bg-amber-50 rounded-lg border border-amber-100 text-[8.5px] text-amber-800 leading-normal">
                              <b>{tAdmin("提醒：")}</b>{tAdmin("请重点阅读以上安全/作业要领，确认无误后点击下方按钮签字。签字即代表已学习、已领会并承诺服从指挥。")}</div>
                            <button
                              type="button"
                              onClick={() => handleMarkAsReadInSimulator(currentSelectedSimSop.id)}
                              className="w-full py-2.5 bg-gradient-to-r from-indigo-600 to-indigo-700 hover:from-indigo-700 hover:to-indigo-800 text-white rounded-xl text-[10px] font-bold flex items-center justify-center gap-1 shadow-md transition transform active:scale-95 duration-101"
                            >
                              <Send className="w-3.5 h-3.5 text-indigo-100" />
                              <span>{tAdmin("签字签收并服从安全指令")}</span>
                            </button>
                          </div>
                        )}
                      </div>
                    </div>
                  ) : (
                    <div className="bg-white rounded-2xl p-8 border border-slate-100 text-center text-slate-400">
                      <BookOpen className="w-10 h-10 text-slate-200 mx-auto mb-2" />
                      <p className="text-[10px] font-bold">{tAdmin("请选择一篇要学习的指导规程")}</p>
                    </div>
                  )}

                </div> {/* End of Sub App Content Scroll view */}

                {/* Bottom Indicator */}
                <div className="h-4 flex items-center justify-center bg-[#f6f8fa] pb-1.5 shrink-0">
                  <div className="w-16 h-1 bg-slate-305 bg-slate-300 rounded-full"></div>
                </div>

              </div> {/* End of In App View layout */}

            </div> {/* End of Phone wrapper */}
          </div> {/* End of Preview Frame outer column */}

        </div> /* End of grid grid-cols-1 lg:grid-cols-12 */
      )} {/* End of activeMode === 'simulator' */}

    </div> /* End of outer space-y-6 container of SopManager */
  );
}
