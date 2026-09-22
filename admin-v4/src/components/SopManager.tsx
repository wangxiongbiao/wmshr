import React, { useState, useMemo, useRef } from "react";
import { SopDocument, SopAttachment, Employee, RecipeIngredient, RecipeEquipment, RecipeReminders } from "../types";
import { RecipeDocumentView } from "./RecipeDocumentView";
import { RecipeFormEditor } from "./RecipeFormEditor";
import { 
  FileText, Plus, Search, Users, CheckCircle, Download, Image as ImageIcon, 
  Upload, Smartphone, Send, RotateCcw, UserCheck, Trash2, Paperclip, 
  ExternalLink, ChevronRight, Info, Sparkles, BookOpen, Clock, AlertTriangle, Check,
  Edit, PenSquare, X, Eye, Printer, ChefHat, Utensils, ZoomIn, ZoomOut, Maximize2,
  Bold, Italic, Underline, List, ListOrdered
} from "lucide-react";
import { motion, AnimatePresence } from "motion/react";

interface SopManagerProps {
  employees: Employee[];
  addToast: (msg: string) => void;
  category: 'training' | 'catering';
}

// Predefined Initial SOPs for a realistic starting experience
const INITIAL_SOPS: SopDocument[] = [
  {
    id: "sop-101",
    title: "WMS日常标准入库作业指导规范_v1.2",
    category: "training",
    content: `<h3>1. 目的与作业范围</h3>\n<p>本作业规范适用于本仓库全体入库岗、叉车岗及理货岗操作员。确保物料在入库卸车、码放及系统登记时安全、准确、高效。</p>\n\n<h3>2. 核心码放作业流程</h3>\n<p>① <b>车辆引导与安检：</b> 司机进入指定月台卸货前，必须在后轮放置三角木垫，关闭引擎并拉上手刹。<br />② <b>托盘复核检验：</b> 必须复核卡板（Tray）表面是否开裂，禁止使用变形损坏卡板。<br />③ <b>标准码放规范：</b> 普货码放实行“五五成堆，十字交叉”堆码标准，卡板边缘整齐不超出 5cm。</p>\n\n<h3>3. 防护与劳动安全指令</h3>\n<p>● 进入A/B作业区必须全程穿戴钢头安全鞋及高可视度反光背心。<br />● 使用液压车拖运重物通过下坡区域时，人必须拉着手把在后方控制车速，严禁位于滑行方向正前方防范挤伤。</p>`,
    images: [
      "https://images.unsplash.com/photo-1586528116311-ad8dd3c8310d?auto=format&fit=crop&q=80&w=400",
    ],
    attachments: [
      { name: "2026版入库安防合规守则.pdf", url: "#", size: "2.4 MB" },
      { name: "托盘科学配重码放图示.xlsx", url: "#", size: "850 KB" }
    ],
    targetType: "all",
    createdAt: "2026-05-18 09:30",
    creator: "仓库管理员 · HR",
    status: "published",
    reads: {
      1: "2026-05-20 14:15",
      2: "2026-05-21 11:02",
      3: "2026-05-19 16:40",
      6: "2026-05-22 09:12"
    }
  },
  {
    id: "sop-102",
    title: "叉车安全驾驶及高空堆垛安全守则",
    category: "training",
    content: `<h3>1. 叉车操作员硬性资质</h3>\n<p>● 只有持有特种设备作业操作证的主检员能够驾驶内燃叉车或高位推垛车。<br />● 严禁无证人员或未完成实机实训的新员工私自启动车辆。</p>\n\n<h3>2. 三“不三车”原则</h3>\n<p>① <b>不超速：</b> 仓库室内全区时速限制为 5km/h，过转角、窄路段必须放慢并按响喇叭。<br />② <b>不违章：</b> 禁止搭载非驾乘人员走动；禁止货叉承载人体升至高空作业，高空维护请使用规范登高机或防护篮。<br />③ <b>不拖延：</b> 车辆油漏或电控系统异响应立刻汇报并挂牌停用，进行规范维保。</p>`,
    images: [
      "https://images.unsplash.com/photo-1578575437130-527eed3abbec?auto=format&fit=crop&q=80&w=400"
    ],
    attachments: [
      { name: "叉车高位升降安防重点查表.docx", url: "#", size: "1.2 MB" }
    ],
    targetType: "all",
    createdAt: "2026-05-22 10:15",
    creator: "安全检查科 Office",
    status: "published",
    reads: {
      1: "2026-05-24 10:45",
      5: "2026-05-23 15:30"
    }
  },
  {
    id: "sop-103",
    title: "C区包装极危易碎品防护加固方案",
    category: "training",
    content: `<h3>1. 针对人群与物资属性</h3>\n<p>本方案专门下发至C/D区质检及打包封装岗。针对高价值陶瓷组件、光学电子芯片等高灵敏物资打包规范。</p>\n\n<h3>2. 核心技术工艺</h3>\n<p>使用不低于三层的防静电气泡膜包履，封箱后外侧必须采用黄色高黏度警示带进行十字缠绕。四周填充充气袋不留空隙缝，防止运输震动。</p>`,
    images: [],
    attachments: [],
    targetType: "specific",
    targetEmployeeIds: [5, 6, 9], // Specific employees (Phyo Lin Aung, Zin Min Htet, etc.)
    createdAt: "2026-05-28 14:00",
    creator: "质检科 · Team C",
    status: "published",
    reads: {
      5: "2026-05-29 11:20"
    }
  },
  {
    id: "sop-201",
    title: "员工中控食堂健康膳食与食品安全留样作业标准_v1.0",
    category: "catering",
    content: `<h3>1. 目的与餐线安全范围</h3>\n<p>为了保障全体员工在库房高强度作业下的营养健康与膳食安全，防止突发性食源性疾患，确保主食及辅料全流程留样可追溯。</p>\n\n<h3>2. 留样核心作业守则</h3>\n<p>① <b>足量留样：</b> 每餐次的每种食品、热菜及凉菜，均须使用经清洗消毒的留样盒保留不少于 <b>125克</b> 的样品。<br />② <b>规范锁闭与贴签：</b> 留样盒加盖锁扣后，必须贴上注明餐次日期、菜品名和留样负责厨师姓名的阻燃标签。<br />③ <b>恒温存储：</b> 严格在 <b>2℃ - 8℃</b> 的专用留样防爆冰箱中留样保存 <b>48小时</b> 以上。</p>`,
    images: [
      "https://images.unsplash.com/photo-1556910103-1c02745aae4d?auto=format&fit=crop&q=80&w=400",
    ],
    attachments: [
      { name: "中控食堂每日农残留检测登记表.xlsx", url: "#", size: "1.2 MB" }
    ],
    targetType: "all",
    createdAt: "2026-06-01 11:30",
    creator: "后勤餐饮保障部 · Admin",
    status: "published",
    reads: {}
  },
  {
    id: "sop-202",
    title: "库区员工集中就餐与餐厨废弃物分类清运规章",
    category: "catering",
    content: `<h3>1. 目的与规范区域</h3>\n<p>保持无蝇无鼠的A级WMS货架环境，严防厨余残液外渗污染商品，并杜绝气味残留。</p>\n\n<h3>2. 就餐时间及定点作业</h3>\n<p>● <b>定点就餐：</b> 严禁携带含肉类及汤汁的餐品进入货架区（Shelf Zone），只允许在指定的 <b>1号多功能休息室</b> 与 <b>中央餐饮餐线区</b> 就餐。<br />● <b>三色清运：</b> 剩汤剩饭一律倒入<b>湿垃圾（棕色桶）</b>，一次性饭盒及筷子投入<b>干垃圾（黑色桶）</b>，饮料塑料瓶进入<b>可回收物（蓝色桶）</b>。<br />● <b>清扫消杀：</b> 后勤保洁组须在午休结束前 <b>30分钟</b> 完成空气喷雾除味与桌面氯水擦拭消杀。</p>`,
    images: [],
    attachments: [],
    targetType: "all",
    createdAt: "2026-06-02 12:45",
    creator: "后勤环卫科 Center",
    status: "published",
    reads: {}
  },
  {
    id: "sop-203",
    title: "Pi-020 梅菜蒸肉饼",
    category: "catering",
    content: "梅菜蒸肉饼是一道极具家常风味的菜色。本作业指导书规范了每道工序配比原材料的重量，并指导下厨标准。",
    images: ["https://images.unsplash.com/photo-1601050690597-df056fb4ce78?auto=format&fit=crop&q=80&w=400"],
    attachments: [],
    targetType: "all",
    createdAt: "2026-06-03 10:15",
    creator: "后勤餐饮保障部 · Admin",
    status: "published",
    reads: {},
    recipeCode: "Pi-020",
    recipeCompany: "金科后勤保障餐饮中心",
    recipeIngredients: [
      { id: 1, name: "五花猪肉", category: "主料", weight: "500g" },
      { id: 2, name: "甜梅菜", category: "主料", weight: "100g" },
      { id: 3, name: "干鱿鱼", category: "主料", weight: "40g" },
      { id: 4, name: "蚝油", category: "调料", weight: "20g" },
      { id: 5, name: "生抽", category: "调料", weight: "20g" },
      { id: 6, name: "麻油", category: "调料", weight: "5g" },
      { id: 7, name: "花生酱", category: "调料", weight: "15g" },
      { id: 8, name: "白胡椒粉", category: "调料", weight: "1g" },
      { id: 9, name: "盐", category: "调料", weight: "5g" },
      { id: 10, name: "糖", category: "调料", weight: "5g" },
      { id: 11, name: "生粉", category: "调料", weight: "15g" },
      { id: 12, name: "鱿鱼水", category: "调料", weight: "80g" },
      { id: 13, name: "葱花", category: "调料", weight: "适量" },
      { id: 14, name: "油", category: "调料", weight: "适量" }
    ],
    recipeEquipment: [
      { name: "蒸箱/家用蒸锅", spec: "三相15kW / 220V", qty: "1台" },
      { name: "绞肉机/破壁机", spec: "双速调控", qty: "1台" }
    ],
    recipeReminders: {
      time: "蒸箱大火蒸 15-20 分钟",
      cutStyle: "猪肉绞碎，梅菜与干鱿鱼冷水浸泡后细切打碎",
      info: "蒸制前拌入泡过干鱿鱼的原水，能够极大增加肉饼的鲜香度与多汁感"
    },
    recipeSteps: [
      "猪肉打碎，鱿鱼浸泡后切碎，梅菜浸泡后洗净打碎；",
      "下浸泡过鱿鱼的水，和所有调料、猪肉拌匀；",
      "梅菜炒香下入猪肉、鱿鱼碎拌匀；",
      "装盘蒸15~20分钟至熟，撒上葱花。"
    ]
  },
  {
    id: "sop-204",
    title: "Pi-018 猪脚鸳鸯蛋",
    category: "catering",
    content: "猪脚鸳鸯蛋是一道口感软糯、酸甜浓郁的营养膳食。遵循此工序可规范切工尺寸并合理调味。",
    images: ["https://images.unsplash.com/photo-1544025162-d76694265947?auto=format&fit=crop&q=80&w=400"],
    attachments: [],
    targetType: "all",
    createdAt: "2026-06-05 11:30",
    creator: "后勤餐饮保障部 · Admin",
    status: "published",
    reads: {},
    recipeCode: "Pi-018",
    recipeCompany: "万导金属制品有限公司",
    recipeIngredients: [
      { id: 1, name: "猪脚", category: "主料", weight: "500g" },
      { id: 2, name: "鸡蛋", category: "主料", weight: "1只" },
      { id: 3, name: "咸鸭蛋", category: "主料", weight: "1只" },
      { id: 4, name: "姜", category: "配料", weight: "50g" },
      { id: 5, name: "甜醋", category: "配料", weight: "200g" },
      { id: 6, name: "糯米醋", category: "配料", weight: "40g" }
    ],
    recipeEquipment: [
      { name: "压力锅/慢炖煲", spec: "1500W高低档", qty: "1台" },
      { name: "爆炒炉灶", spec: "天然气双环火", qty: "1座" }
    ],
    recipeReminders: {
      time: "煲内小火慢炖 30 分钟",
      cutStyle: "猪脚砍成小块，老姜用刀背拍裂拍送",
      info: "咸鸭蛋换咸鸡蛋更好，咸淡相配，风味尤佳；蛋切一开二，保证切口整齐。"
    },
    recipeSteps: [
      "猪脚砍件，锅下姜片、料酒焯水；",
      "姜切块拍裂，下锅炒香；",
      "煲下猪脚、姜片、甜醋小火煮30分钟；",
      "蛋煮好去壳，放入锅中加糯米醋小火煮30分钟至猪脚软糯；",
      "蛋切一开二配餐，咸、淡蛋各半。"
    ]
  }
];

// Predefined SOP templates for one-click load
const SOP_TEMPLATES = [
  {
    title: "🚜 叉车安全操作与高位堆垛日检规程",
    templateTitle: "叉车安全操作与高位堆垛日检规程",
    category: "training",
    content: `<h3>1. 每日出车前“五检”要点</h3>
<p>各车段操作员必须在发车前严加检查：</p>
<div class="p-3 bg-indigo-50 border-l-4 border-indigo-500 rounded text-indigo-900">
  <b>✔ 日检清单：</b> 液压油位、制动系统灵敏度、货叉齿有无变形裂缝、前后车灯以及倒车蜂鸣器。
</div>

<h3>2. 运行限速与十字路鸣笛</h3>
<p>在库房任何作业通道行驶中：时速绝对不得超过 <b>5公里/小时</b>。在盲区弯道、推拉式大门口、交叉跑道等，必须提前<b>减速并鸣短笛</b>示意外界。</p>

<h3>3. “十不叉”刚性安全底线</h3>
<p>● 严禁货叉带人进行登高升降作业。<br />● 严禁无特种机械操作证人员动车，一经发现做红线开除处理！</p>`,
    images: ["https://images.unsplash.com/photo-1578575437130-527eed3abbec?auto=format&fit=crop&q=80&w=600"],
    attachments: [
      { name: "高空叉车操作事故危害点检表.xlsx", url: "#", size: "340 KB" },
      { name: "电动行进堆垛车日常检查表.pdf", url: "#", size: "1.1 MB" }
    ],
    targetType: "specific",
    targetEmployeeIds: [6] // Forklift operator
  },
  {
    title: "📦 易碎高价值物资“十字交叉”加固防震规范",
    templateTitle: "易碎高价值物资“十字交叉”加固防震规范",
    category: "training",
    content: `<h3>1. 针对货物类别</h3>
<p>凡属于精密光学透镜、贵重陶瓷传感器、高单价电路母版等高额易碎件，必须按此高规打包。</p>

<h3>2. 包装防落震工艺标准</h3>
<p>① <b>一裹：</b>用不少于三层聚乙烯气泡垫紧密缠绕，首尾及缝口使用透明胶带密封严实。<br />② <b>二填：</b>将中转小盒放入外箱后，其空腔上下及四周百分百以发泡聚氨酯或专用气袋填充饱满，严禁发出晃动异响！<br />③ <b>三贴：</b>大箱表面四周采用“十字交叉”黄色高亮封口，并侧面居中粘贴<b>“向上易碎防压”</b>大红标识贴。</p>

<h3>3. 复检流程</h3>
<div class="p-3 bg-amber-50 border-l-4 border-amber-500 rounded text-amber-900">
  ⚠️ 由<b>D区质检领班</b>进行随箱抽样15%，检查不饱满气包应立即退回，重做打包。
</div>`,
    images: ["https://images.unsplash.com/photo-1586528116311-ad8dd3c8310d?auto=format&fit=crop&q=80&w=600"],
    attachments: [
      { name: "高价值抗震试验与气塞填装手册.pdf", url: "#", size: "1.4 MB" }
    ],
    targetType: "all",
    targetEmployeeIds: []
  },
  {
    title: "🛡️ A/B区大功率充电桩防爆消防与预警指南",
    templateTitle: "A/B区大功率充电桩防爆消防与预警指南",
    category: "training",
    content: `<h3>1. 进场和安全红外间距</h3>
<p>大功率备用供电架与电瓶拖车充电插槽间必须留有 1.2米以上的绝缘防爆安全净空，严禁堆物。</p>

<h3>2. 遇充电过热、冒白烟紧急拆除流程</h3>
<div class="p-3 bg-red-50 border-l-4 border-red-500 rounded text-red-955 text-rose-900">
  <b>🚨 红色紧急行动预案：</b><br />
  ① <b>立即按断：</b> 极力按下主墙壁侧面的<b>红色紧急断电拉闸</b>。<br />
  ② <b>灭火沙灭：</b> 迅速拿起灭火沙盘往烟点泼撒。绝不能向锂油泄露处泼撒水雾！<br />
  ③ <b>通报疏散：</b> 捏响最近的手动消防哨，并告知中控与消防。
</div>

<h3>3. 五不准</h3>
<p>● 卡盘充电间10米内绝不准吸烟或带入任何非安全控制的加热及明火工具。<br />● 金属工具物件切勿平放在拖车电瓶两极之间，防止形成短路极爆。</p>`,
    images: [],
    attachments: [
      { name: "2026版仓库消防器材放置与救援部署图.pdf", url: "#", size: "2.1 MB" }
    ],
    targetType: "all",
    targetEmployeeIds: []
  },
  {
    title: "🥗 员工中控茶歇室自助咖啡机及微波炉清洁维护指引",
    templateTitle: "员工中控茶歇室自助咖啡机及微波炉清洁维护指引",
    category: "catering",
    content: `<h3>1. 每日定时“三部曲”清洁规范</h3>
<p>① <b>咖啡机残渣清理：</b> 每日下午17:00前倒空粉渣盒，使用清水冲洗滤网，严防咖啡油脂黏结。<br />② <b>微波炉内壁消杀：</b> 用医用酒精或洗洁精抹布抹净炉膛内壁溅落的汤汁，保证无冷凝异味。<br />③ <b>桌面台盘消杀：</b> 使用含氯消毒液（配合无纺布抹布）擦净台面，整理速溶包和餐巾纸箱盒。</p>

<h3>2. 异常预警与紧急报修</h3>
<p>遇到微波炉内壁异响、冒火花，必须立即<b>按下电器总插头开关并拔掉电源</b>，并在上面挂牌【故障禁用】，通知设备组徐师傅。</p>`,
    images: [],
    attachments: [
      { name: "餐饮区电气设备维保及消杀巡检单.xlsx", url: "#", size: "180 KB" }
    ],
    targetType: "all",
    targetEmployeeIds: []
  },
  {
    title: "🍲 Pi-020 梅菜蒸肉饼 (红线高标食谱)",
    templateTitle: "Pi-020 梅菜蒸肉饼",
    category: "catering",
    content: "梅菜蒸肉饼是一道极具家常风味的菜色。本作业指导书规范了每道工序配比原材料的重量，并指导下厨标准。",
    images: ["https://images.unsplash.com/photo-1601050690597-df056fb4ce78?auto=format&fit=crop&q=80&w=400"],
    attachments: [],
    targetType: "all",
    targetEmployeeIds: [],
    recipeCode: "Pi-020",
    recipeCompany: "金科后勤保障餐饮中心",
    recipeIngredients: [
      { id: 1, name: "五花猪肉", category: "主料", weight: "500g" },
      { id: 2, name: "甜梅菜", category: "主料", weight: "100g" },
      { id: 3, name: "干鱿鱼", category: "主料", weight: "40g" },
      { id: 4, name: "蚝油", category: "调料", weight: "20g" },
      { id: 5, name: "生抽", category: "调料", weight: "20g" },
      { id: 6, name: "麻油", category: "调料", weight: "5g" },
      { id: 7, name: "花生酱", category: "调料", weight: "15g" },
      { id: 8, name: "白胡椒粉", category: "调料", weight: "1g" },
      { id: 9, name: "盐", category: "调料", weight: "5g" },
      { id: 10, name: "糖", category: "调料", weight: "5g" },
      { id: 11, name: "生粉", category: "调料", weight: "15g" },
      { id: 12, name: "鱿鱼水", category: "调料", weight: "80g" },
      { id: 13, name: "葱花", category: "调料", weight: "适量" },
      { id: 14, name: "油", category: "调料", weight: "适量" }
    ],
    recipeEquipment: [
      { name: "蒸箱/家用蒸锅", spec: "三相15kW / 220V", qty: "1台" },
      { name: "绞肉机/破壁机", spec: "双速调控", qty: "1台" }
    ],
    recipeReminders: {
      time: "蒸箱大火蒸 15-20 分钟",
      cutStyle: "猪肉绞碎，梅菜与干鱿鱼冷水浸泡后细切打碎",
      info: "蒸制前拌入泡过干鱿鱼的原水，能够极大增加肉饼的鲜香度与多汁感"
    },
    recipeSteps: [
      "猪肉打碎，鱿鱼浸泡后切碎，梅菜浸泡后洗净打碎；",
      "下浸泡过鱿鱼的水，和所有调料、猪肉拌匀；",
      "梅菜炒香下入猪肉、鱿鱼碎拌匀；",
      "装盘蒸15~20分钟至熟，撒上葱花。"
    ]
  },
  {
    title: "🥘 Pi-018 猪脚手制鸳鸯蛋 (粤式经典菜谱)",
    templateTitle: "Pi-018 猪脚鸳鸯蛋",
    category: "catering",
    content: "猪脚鸳鸯蛋是一道口感软糯、酸甜浓郁的营养膳食。遵循此工序可规范切工尺寸并合理调味。",
    images: ["https://images.unsplash.com/photo-1544025162-d76694265947?auto=format&fit=crop&q=80&w=400"],
    attachments: [],
    targetType: "all",
    targetEmployeeIds: [],
    recipeCode: "Pi-018",
    recipeCompany: "万导金属制品有限公司",
    recipeIngredients: [
      { id: 1, name: "猪脚", category: "主料", weight: "500g" },
      { id: 2, name: "鸡蛋", category: "主料", weight: "1只" },
      { id: 3, name: "咸鸭蛋", category: "主料", weight: "1只" },
      { id: 4, name: "姜", category: "配料", weight: "50g" },
      { id: 5, name: "甜醋", category: "配料", weight: "200g" },
      { id: 6, name: "糯米醋", category: "配料", weight: "40g" }
    ],
    recipeEquipment: [
      { name: "压力锅/慢炖煲", spec: "1500W高低档", qty: "1台" },
      { name: "爆炒炉灶", spec: "天然气双环火", qty: "1座" }
    ],
    recipeReminders: {
      time: "煲内小火慢炖 30 分钟",
      cutStyle: "猪脚砍成小块，老姜用刀背拍裂拍送",
      info: "咸鸭蛋换咸鸡蛋更好，咸淡相配，风味尤佳；蛋切一开二，保证切口整齐。"
    },
    recipeSteps: [
      "猪脚砍件，锅下姜片、料酒焯水；",
      "姜切块拍裂，下锅炒香；",
      "煲下猪脚、姜片、甜醋小火煮30分钟；",
      "蛋煮好去壳，放入锅中加糯米醋小火煮30分钟至猪脚软糯；",
      "蛋切一开二配餐，咸、淡蛋各半。"
    ]
  }
];

export function SopManager({ employees, addToast, category }: SopManagerProps) {
  // State variables backboning reactive SOP operations
  const [sops, setSops] = useState<SopDocument[]>(() => {
    try {
      const saved = localStorage.getItem("wms_sop_documents");
      return saved ? JSON.parse(saved) : INITIAL_SOPS;
    } catch {
      return INITIAL_SOPS;
    }
  });

  // Save changes to localstorage to avoid data resets
  const saveSops = (updated: SopDocument[]) => {
    setSops(updated);
    localStorage.setItem("wms_sop_documents", JSON.stringify(updated));
    window.dispatchEvent(new Event("storage"));
  };

  // UI state controllers
  const [activeMode, setActiveMode] = useState<'manager' | 'simulator'>('manager');
  const [searchTerm, setSearchTerm] = useState("");
  const [docTypeFilter, setDocTypeFilter] = useState<'all' | 'training' | 'notification'>('all');
  const [selectedSopForDetails, setSelectedSopForDetails] = useState<SopDocument | null>(null);
  const [previewSop, setPreviewSop] = useState<SopDocument | null>(null);
  const [pdfZoomPercent, setPdfZoomPercent] = useState(100);
  
  // Publication wizard states
  const [publishingSop, setPublishingSop] = useState<SopDocument | null>(null);
  const [publishTargetType, setPublishTargetType] = useState<'all' | 'specific'>('all');
  const [publishTargetIds, setPublishTargetIds] = useState<number[]>([]);

  const handleOpenPublishSop = (sop: SopDocument) => {
    setPublishingSop(sop);
    setPublishTargetType(sop.targetType || 'all');
    setPublishTargetIds(sop.targetEmployeeIds || []);
  };

  // Form State for creating / editing SOP
  const [isCreating, setIsCreating] = useState(false);
  const [editingSopId, setEditingSopId] = useState<string | null>(null);
  const [formTitle, setFormTitle] = useState("");
  const [formContent, setFormContent] = useState("");
  const [formTargetType, setFormTargetType] = useState<'all' | 'specific'>('all');
  const [formTargetIds, setFormTargetIds] = useState<number[]>([]);
  const [formDocType, setFormDocType] = useState<'notification' | 'training'>('training');
  const [editorMode, setEditorMode] = useState<'visual' | 'html'>('visual');
  const editorRef = useRef<HTMLDivElement>(null);
  const imageFileInputRef = useRef<HTMLInputElement>(null);

  // Sync formContent with visual editor editable div
  React.useEffect(() => {
    if (editorRef.current && editorRef.current.innerHTML !== formContent) {
      editorRef.current.innerHTML = formContent;
    }
  }, [editorMode, editingSopId, isCreating]);
  
  // Custom states for recipe mode under kitchen catering
  const [recipeFormType, setRecipeFormType] = useState<'recipe' | 'general'>('recipe');
  const [recipeCode, setRecipeCode] = useState("");
  const [recipeCompany, setRecipeCompany] = useState("");
  const [recipeIngredients, setRecipeIngredients] = useState<RecipeIngredient[]>([]);
  const [recipeEquipment, setRecipeEquipment] = useState<RecipeEquipment[]>([]);
  const [recipeReminders, setRecipeReminders] = useState<RecipeReminders>({ time: "", cutStyle: "", info: "" });
  const [recipeSteps, setRecipeSteps] = useState<string[]>([]);

  // Simulated File attachments queue
  const [tempAttachments, setTempAttachments] = useState<SopAttachment[]>([]);
  const [tempImages, setTempImages] = useState<string[]>([]);
  const [imageInputVal, setImageInputVal] = useState("");
  const [showImageInserter, setShowImageInserter] = useState(false);
  const [formImageUrl, setFormImageUrl] = useState("");
  const [showCateringMobilePreview, setShowCateringMobilePreview] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Drag & drop drag zone active state
  const [isDragging, setIsDragging] = useState(false);

  // Simulator State config
  const [simulatedEmployeeId, setSimulatedEmployeeId] = useState<number>(() => {
    return employees.length > 0 ? employees[0].id : 1;
  });
  const [currentSelectedSimSop, setCurrentSelectedSimSop] = useState<SopDocument | null>(null);
  const [sopToDelete, setSopToDelete] = useState<SopDocument | null>(null);

  // Currently logged-in simulated employee
  const currentSimEmp = useMemo(() => {
    return employees.find(e => e.id === simulatedEmployeeId) || employees[0];
  }, [employees, simulatedEmployeeId]);

  // Compute SOP list visible to the simulated employee
  const employeeVisibleSops = useMemo(() => {
    return sops.filter(sop => {
      const sopCategory = sop.category || 'training';
      if (sopCategory !== category) return false;
      if (sop.status !== 'published') return false;
      if (sop.targetType === 'all') return true;
      if (sop.targetType === 'specific' && sop.targetEmployeeIds?.includes(simulatedEmployeeId)) {
        return true;
      }
      return false;
    });
  }, [sops, simulatedEmployeeId, category]);

  // Filtered SOPs shown in the management panel table
  const filteredSops = useMemo(() => {
    return sops.filter(sop => {
      const sopCategory = sop.category || 'training';
      if (sopCategory !== category) return false;
      // Exclude automatic payslip notifications from backend's SOP list
      if (sop.id && sop.id.startsWith("sop-payslip-")) return false;

      // Sub-filter by document type for training category
      if (category === 'training' && docTypeFilter !== 'all') {
        const dType = sop.docType || 'training';
        if (dType !== docTypeFilter) return false;
      }

      const matchSearch = sop.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
                          sop.creator.toLowerCase().includes(searchTerm.toLowerCase()) ||
                          sop.content.toLowerCase().includes(searchTerm.toLowerCase());
      return matchSearch;
    });
  }, [sops, searchTerm, category, docTypeFilter]);

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
      const mockSizes = ["425 KB", "1.1 MB", "960 KB", "3.4 MB", "720 KB"];
      const randomSize = mockSizes[Math.floor(Math.random() * mockSizes.length)];
      updated.push({
        name: file.name,
        url: "#", // Simulated downloadable payload
        size: randomSize
      });
    }
    setTempAttachments(updated);
    addToast(`已打包本地文件「${files[0].name}」等进行附件关联发布`);
  };

  // Helper code: Insert quick formatting tags inside the textarea or visual editor (supports sophisticated alerts)
  const handleInsertCustomTag = (tagType: 'h1' | 'h2' | 'h3' | 'p' | 'b' | 'italic' | 'underline' | 'ul' | 'ol' | 'warning' | 'success' | 'list') => {
    const tags: Record<string, [string, string]> = {
      h1: ["<h1>", "</h1>\n"],
      h2: ["<h2>", "</h2>\n"],
      h3: ["<h3>", "</h3>\n"],
      p: ["<p>", "</p>\n"],
      b: ["<b>", "</b>"],
      italic: ["<i>", "</i>"],
      underline: ["<u>", "</u>"],
      ul: ["<ul>\n  <li>", "</li>\n</ul>\n"],
      ol: ["<ol>\n  <li>", "</li>\n</ol>\n"],
      warning: [
        '<div class="p-3 bg-amber-50 border-l-4 border-amber-500 rounded text-amber-900 font-sans my-2">\n  <b>⚠️ 重点警示:</b> ',
        '\n</div>\n'
      ],
      success: [
        '<div class="p-3 bg-emerald-50 border-l-4 border-emerald-500 rounded text-emerald-955 font-sans my-2">\n  <b>✔ 合规标准:</b> ',
        '\n</div>\n'
      ],
      list: [
        "☑ 校验现场防爆沙就位<br />☑ 车辆轮塞牢固安置<br />☑ 双人复核双锁上锁<br />",
        ""
      ]
    };

    const [start, end] = tags[tagType];

    if (editorMode === 'visual') {
      if (editorRef.current) {
        editorRef.current.focus();
      }
      
      let selectionText = "";
      const selection = window.getSelection();
      if (selection && selection.rangeCount > 0) {
        selectionText = selection.toString();
      }

      if (tagType === 'b') {
        document.execCommand('bold', false);
      } else if (tagType === 'italic') {
        document.execCommand('italic', false);
      } else if (tagType === 'underline') {
        document.execCommand('underline', false);
      } else if (tagType === 'h1') {
        document.execCommand('formatBlock', false, 'H1');
        if (!selectionText) {
          document.execCommand('insertHTML', false, '<h1>标题一</h1>');
        }
      } else if (tagType === 'h2') {
        document.execCommand('formatBlock', false, 'H2');
        if (!selectionText) {
          document.execCommand('insertHTML', false, '<h2>标题二</h2>');
        }
      } else if (tagType === 'h3') {
        document.execCommand('formatBlock', false, 'H3');
        if (!selectionText) {
          document.execCommand('insertHTML', false, '<h3>标题三</h3>');
        }
      } else if (tagType === 'p') {
        document.execCommand('formatBlock', false, 'P');
        if (!selectionText) {
          document.execCommand('insertHTML', false, '<p>新段落</p>');
        }
      } else if (tagType === 'ul') {
        document.execCommand('insertUnorderedList', false);
        const parentNode = selection?.anchorNode?.parentNode;
        const parentTag = (parentNode as HTMLElement)?.tagName?.toLowerCase();
        if (parentTag !== 'li' && !selectionText) {
          document.execCommand('insertHTML', false, '<ul><li>无序列表</li></ul>');
        }
      } else if (tagType === 'ol') {
        document.execCommand('insertOrderedList', false);
        const parentNode = selection?.anchorNode?.parentNode;
        const parentTag = (parentNode as HTMLElement)?.tagName?.toLowerCase();
        if (parentTag !== 'li' && !selectionText) {
          document.execCommand('insertHTML', false, '<ol><li>有序列表</li></ol>');
        }
      } else {
        const insertText = selectionText || (tagType === 'list' ? '' : '请输入指南文本');
        const html = start + insertText + end;
        document.execCommand('insertHTML', false, html);
      }

      if (editorRef.current) {
        setFormContent(editorRef.current.innerHTML);
      }
      return;
    }

    const textarea = document.getElementById("sopFormContent") as HTMLTextAreaElement;
    if (!textarea) {
      setFormContent(prev => prev + start + end);
      return;
    }

    const startPos = textarea.selectionStart;
    const endPos = textarea.selectionEnd;
    const text = textarea.value;
    const selected = text.substring(startPos, endPos);
    
    const replacement = start + (selected || (tagType === 'list' ? '' : '请输入指南文本')) + end;
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
      addToast("请输入有效的网页图片链接");
      return;
    }
    const imgTag = `<img src="${formImageUrl.trim()}" class="max-w-full rounded-lg my-2.5 shadow-sm inline-block" alt="SOP插图" />\n`;

    if (editorMode === 'visual') {
      if (editorRef.current) {
        editorRef.current.focus();
      }
      document.execCommand('insertHTML', false, imgTag);
      if (editorRef.current) {
        setFormContent(editorRef.current.innerHTML);
      }
      setFormImageUrl("");
      setShowImageInserter(false);
      addToast("已在可视化编辑器中插入插图");
      return;
    }

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
    addToast("已在正文光标所在处插入防灾/机械插图");
  };

  // Local image upload handler that inserts base64 source as direct html tag in cursor position
  const handleLocalImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      const file = e.target.files[0];
      const reader = new FileReader();
      reader.onload = (event) => {
        const base64String = event.target?.result as string;
        if (base64String) {
          const imgTag = `<img src="${base64String}" class="max-w-full rounded-lg my-2.5 shadow-sm inline-block" alt="SOP插图" />\n`;
          
          if (editorMode === 'visual') {
            if (editorRef.current) {
              editorRef.current.focus();
            }
            document.execCommand('insertHTML', false, imgTag);
            if (editorRef.current) {
              setFormContent(editorRef.current.innerHTML);
            }
          } else {
            const textarea = document.getElementById("sopFormContent") as HTMLTextAreaElement;
            if (textarea) {
              const startPos = textarea.selectionStart;
              const endPos = textarea.selectionEnd;
              const text = textarea.value;
              const updated = text.substring(0, startPos) + imgTag + text.substring(endPos);
              setFormContent(updated);
            } else {
              setFormContent(prev => prev + imgTag);
            }
          }
          
          setTempImages(prev => [...prev, base64String]);
          addToast(`本地图片「${file.name}」已转换为高保真数据流并成功插入正文！`);
        }
      };
      reader.readAsDataURL(file);
    }
  };

  // Predefined loading template helper
  const handleLoadTemplate = (template: typeof SOP_TEMPLATES[number]) => {
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

    // Load recipe-specific properties
    const tempAsRecipe = template as any;
    if (tempAsRecipe.recipeCode || tempAsRecipe.recipeIngredients) {
      setRecipeFormType('recipe');
      setRecipeCode(tempAsRecipe.recipeCode || "");
      setRecipeCompany(tempAsRecipe.recipeCompany || "");
      setRecipeIngredients(tempAsRecipe.recipeIngredients || []);
      setRecipeEquipment(tempAsRecipe.recipeEquipment || []);
      setRecipeReminders(tempAsRecipe.recipeReminders || { time: "", cutStyle: "", info: "" });
      setRecipeSteps(tempAsRecipe.recipeSteps || []);
    } else {
      setRecipeFormType('general');
      setRecipeCode("");
      setRecipeCompany("");
      setRecipeIngredients([]);
      setRecipeEquipment([]);
      setRecipeReminders({ time: "", cutStyle: "", info: "" });
      setRecipeSteps([]);
    }

    addToast(`【${template.templateTitle}】模板载入成功！已实时反馈至右侧预览区。`);
  };

  // Group selecting targets with quick checklist filters
  const handleGroupSelect = (type: 'all' | 'none' | 'dept' | 'role', value?: string) => {
    if (type === 'all') {
      setFormTargetIds(employees.map(e => e.id));
      addToast("已全勾选所有在职员工");
    } else if (type === 'none') {
      setFormTargetIds([]);
      addToast("已清空受众名单，请按需点选");
    } else if (type === 'dept' && value) {
      const deptEmpIds = employees.filter(e => e.dept === value).map(e => e.id);
      const allChecked = deptEmpIds.every(id => formTargetIds.includes(id));
      if (allChecked) {
        setFormTargetIds(prev => prev.filter(id => !deptEmpIds.includes(id)));
        addToast(`已移除 [${value}] 部门的所有人员`);
      } else {
        setFormTargetIds(prev => Array.from(new Set([...prev, ...deptEmpIds])));
        addToast(`已一键选中 [${value}] 部门的全部成员`);
      }
    } else if (type === 'role' && value) {
      const roleEmpIds = employees.filter(e => e.role === value).map(e => e.id);
      const allChecked = roleEmpIds.every(id => formTargetIds.includes(id));
      if (allChecked) {
        setFormTargetIds(prev => prev.filter(id => !roleEmpIds.includes(id)));
        addToast(`已移除所有职位为 [${value}] 的员工`);
      } else {
        setFormTargetIds(prev => Array.from(new Set([...prev, ...roleEmpIds])));
        addToast(`已选中全仓职位为 [${value}] 的全部成员`);
      }
    }
  };

  const toggleEmployeeTargetSelection = (id: number) => {
    setFormTargetIds(prev => 
      prev.includes(id) ? prev.filter(item => item !== id) : [...prev, id]
    );
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
    setFormDocType(sop.docType || 'training');
    
    // Set recipe states depending on whether SOP is a recipe
    if (sop.recipeCode || sop.recipeIngredients) {
      setRecipeFormType('recipe');
      setRecipeCode(sop.recipeCode || "");
      setRecipeCompany(sop.recipeCompany || "");
      setRecipeIngredients(sop.recipeIngredients || []);
      setRecipeEquipment(sop.recipeEquipment || []);
      setRecipeReminders(sop.recipeReminders || { time: "", cutStyle: "", info: "" });
      setRecipeSteps(sop.recipeSteps || []);
    } else {
      setRecipeFormType('general');
      setRecipeCode("");
      setRecipeCompany("");
      setRecipeIngredients([]);
      setRecipeEquipment([]);
      setRecipeReminders({ time: "", cutStyle: "", info: "" });
      setRecipeSteps([]);
    }

    setIsCreating(true);
    addToast(`【${sop.title}】编辑草稿加载成功，启动 Editorial Studio。`);
  };

  // Start drafting a new blank document (SOP or recipe)
  const handleStartCreateNewSop = () => {
    setEditingSopId(null);
    setFormTitle("");
    setFormContent("");
    setFormTargetType('all');
    setFormTargetIds([]);
    setFormDocType('training');
    setTempAttachments([]);
    setTempImages([]);
    setRecipeCode("");
    setRecipeCompany("");
    setRecipeIngredients([]);
    setRecipeEquipment([]);
    setRecipeReminders({ time: "", cutStyle: "", info: "" });
    setRecipeSteps([]);
    setIsCreating(true);
    addToast(category === 'catering' ? "已启动新膳食菜谱配方起草编辑器。" : "已启动新标准安全合规SOP起草编辑器。");
  };

  // Add customized external images in editor state
  const handleAddImageUrl = () => {
    if (!imageInputVal.trim()) return;
    if (tempImages.includes(imageInputVal.trim())) {
      addToast("该图片地址已存在于图片池");
      return;
    }
    setTempImages(prev => [...prev, imageInputVal.trim()]);
    setImageInputVal("");
    addToast("已成功插入插图链接，实时效果已绘制");
  };

  // Form saving Handler (handles both creation & update)
  const handleSaveSop = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formTitle.trim()) {
      addToast("请输入SOP的操作文档名称");
      return;
    }
    
    // Recipes can be saved even with a blank text description, because the grid represents everything
    const isRecipe = category === 'catering' && recipeFormType === 'recipe';
    if (!formContent.trim() && !isRecipe) {
      addToast("SOP核心内容文字说明不能为空");
      return;
    }

    if (editingSopId) {
      // Edit Mode Save
      const updatedSops = sops.map(s => {
        if (s.id === editingSopId) {
          const updatedSop: SopDocument = {
            ...s,
            title: formTitle.trim(),
            content: formContent.trim() || `${formTitle.trim()}的标准作业指导食谱`,
            images: tempImages,
            attachments: tempAttachments,
            targetType: formTargetType,
            targetEmployeeIds: formTargetType === 'all' ? undefined : formTargetIds,
            // Keep category
            category: s.category,
            docType: s.category === 'catering' ? undefined : formDocType
          };

          if (isRecipe) {
            updatedSop.recipeCode = recipeCode;
            updatedSop.recipeCompany = recipeCompany;
            updatedSop.recipeIngredients = recipeIngredients;
            updatedSop.recipeEquipment = recipeEquipment;
            updatedSop.recipeReminders = recipeReminders;
            updatedSop.recipeSteps = recipeSteps;
          } else {
            // Delete recipe properties if switched back to general
            delete updatedSop.recipeCode;
            delete updatedSop.recipeCompany;
            delete updatedSop.recipeIngredients;
            delete updatedSop.recipeEquipment;
            delete updatedSop.recipeReminders;
            delete updatedSop.recipeSteps;
          }

          return updatedSop;
        }
        return s;
      });
      saveSops(updatedSops);
      addToast(`【${formTitle}】SOP作业规程修改并同步下发成功！`);
      
      // Auto update active selection details if matched
      const matched = updatedSops.find(s => s.id === editingSopId);
      if (matched && selectedSopForDetails?.id === editingSopId) {
        setSelectedSopForDetails(matched);
      }
    } else {
      // Create Mode Save
      const newSop: SopDocument = {
        id: `sop-${Date.now()}`,
        title: formTitle.trim(),
        content: formContent.trim() || `${formTitle.trim()}的标准作业指导食谱`,
        images: tempImages,
        attachments: tempAttachments,
        targetType: formTargetType,
        targetEmployeeIds: formTargetType === 'all' ? undefined : formTargetIds,
        createdAt: new Date().toISOString().replace('T', ' ').slice(0, 16),
        creator: category === 'catering' ? "后勤餐饮保障部 · Admin" : "仓库安全处 · Admin Office",
        status: category === 'catering' ? "draft" : "published",
        reads: {},
        category: category,
        docType: category === 'catering' ? undefined : formDocType
      };

      if (isRecipe) {
        newSop.recipeCode = recipeCode;
        newSop.recipeCompany = recipeCompany;
        newSop.recipeIngredients = recipeIngredients;
        newSop.recipeEquipment = recipeEquipment;
        newSop.recipeReminders = recipeReminders;
        newSop.recipeSteps = recipeSteps;
      }

      const newSopList = [newSop, ...sops];
      saveSops(newSopList);
      
      if (category === 'catering') {
        addToast(`【${formTitle}】新建菜谱保存成功，状态为待发布！`);
      } else {
        addToast(`【${formTitle}】SOP全新规范同步下发成功！`);
      }
      
      // Auto select the new one for view details
      setSelectedSopForDetails(newSop);
    }

    // Reset Form fields
    setFormTitle("");
    setFormContent("");
    setFormTargetType('all');
    setFormTargetIds([]);
    setFormDocType('training');
    setTempAttachments([]);
    setTempImages([]);
    setRecipeCode("");
    setRecipeCompany("");
    setRecipeIngredients([]);
    setRecipeEquipment([]);
    setRecipeReminders({ time: "", cutStyle: "", info: "" });
    setRecipeSteps([]);
    setIsCreating(false);
    setEditingSopId(null);
  };

  // Delete SOP handler
  const handleDeleteSop = (id: string, name: string) => {
    const s = sops.find(sop => sop.id === id);
    if (s) {
      setSopToDelete(s);
    }
  };

  const handleConfirmDelete = () => {
    if (!sopToDelete) return;
    const remaining = sops.filter(s => s.id !== sopToDelete.id);
    saveSops(remaining);
    addToast(category === 'catering' ? "菜谱配方已成功删除" : "SOP规范已成功删除并召回");
    if (selectedSopForDetails?.id === sopToDelete.id) {
      setSelectedSopForDetails(null);
    }
    if (currentSelectedSimSop?.id === sopToDelete.id) {
      setCurrentSelectedSimSop(null);
    }
    setSopToDelete(null);
  };

  // Worker Simulator reading/signing signature action
  const handleMarkAsReadInSimulator = (sopId: string) => {
    const updatedSops = sops.map(s => {
      if (s.id === sopId) {
        const updatedReads = {
          ...(s.reads || {}),
          [simulatedEmployeeId]: new Date().toISOString().replace('T', ' ').slice(0, 16)
        };
        const updatedDoc = { ...s, reads: updatedReads };
        
        // Sync detail panels reactively
        if (selectedSopForDetails?.id === sopId) {
          setSelectedSopForDetails(updatedDoc);
        }
        if (currentSelectedSimSop?.id === sopId) {
          setCurrentSelectedSimSop(updatedDoc);
        }
        return updatedDoc;
      }
      return s;
    });
    
    saveSops(updatedSops);
    
    // Toast notification
    const empName = employees.find(e => e.id === simulatedEmployeeId)?.name || "模拟员工";
    addToast(`模拟签字成功！员工【${empName}】已签收并服从安全与管理规程。`);
  };

  // Export physical PDF document (direct print tab escape)
  const handleExportSopPdf = (sop: SopDocument) => {
    const printWindow = window.open("", "_blank");
    if (!printWindow) {
      addToast("客户端安全拦截了打印页卡，请授权后重试");
      return;
    }

    const isCatering = sop.category === 'catering';
    const ingredients = sop.recipeIngredients || [];
    const equipment = sop.recipeEquipment || [];
    const reminders = sop.recipeReminders || {};
    const steps = sop.recipeSteps || [];

    // Construct table/list strings procedurally to keep the template literal readable and error-free
    let ingredientsHtml = "";
    if (ingredients.length > 0) {
      ingredients.forEach((ing, index) => {
        const catTag = ing.category === "主料" 
          ? '<span class="tag-cat tag-main">主料</span>' 
          : '<span class="tag-cat tag-sub">配料</span>';
        ingredientsHtml += `
          <tr>
            <td class="center val-mono">${index + 1}</td>
            <td class="val-bold">${ing.name}</td>
            <td class="center">${catTag}</td>
            <td class="right val-mono val-bold">${ing.weight}</td>
          </tr>
        `;
      });
    } else {
      ingredientsHtml += `
        <tr>
          <td colspan="4" style="text-align: center; color: #94a3b8; padding: 15px;">暂无主配物料清单数据</td>
        </tr>
      `;
    }

    let equipmentHtml = "";
    if (equipment.length > 0) {
      equipment.forEach(eq => {
        equipmentHtml += `
          <tr>
            <td class="val-bold">${eq.name}</td>
            <td style="color: #64748b;">${eq.spec || "通用规范"}</td>
            <td class="center val-mono val-bold">${eq.qty}</td>
          </tr>
        `;
      });
    } else {
      equipmentHtml += `
        <tr>
          <td colspan="3" class="center" style="color: #94a3b8; padding: 10px;">后勤厨房基础刀具、炉具及公用器皿</td>
        </tr>
      `;
    }

    let stepsHtml = "";
    if (steps.length > 0) {
      steps.forEach((step, idx) => {
        stepsHtml += `
          <div class="step-row">
            <div class="step-num">${idx + 1}</div>
            <div class="step-desc">${step}</div>
          </div>
        `;
      });
    } else {
      stepsHtml += `
        <div style="text-align: center; color: #94a3b8; padding: 10px;">暂无具体步骤细节指示。制作人员依据大厨标准手册实施。</div>
      `;
    }

    let trainingImageHtml = "";
    if (!isCatering && sop.images && sop.images[0]) {
      trainingImageHtml = `
        <div class="section-lbl" style="margin-top:25px;">📷 附：作业现场图景与合规实景</div>
        <div class="pic-wrapper" style="max-width: 450px;">
          <img src="${sop.images[0]}" class="pic-img" style="max-height: 280px;" alt="${sop.title}">
          <div class="pic-caption">安全合规操作指导示意图</div>
        </div>
      `;
    }

    const targetScopeStr = sop.targetType === "all" 
      ? "全体部门及指定人员" 
      : "指定员工（已发 " + (sop.targetEmployeeIds?.length || 0) + " 人）";

    const creatorCleaned = sop.creator.replace("后勤餐饮保障部", "餐饮部").replace("后勤环卫科", "环卫科").replace("仓库安全处", "安全处");

    const imageRefBlock = sop.images && sop.images[0] 
      ? `<img src="${sop.images[0]}" class="pic-img" alt="${sop.title}">` 
      : `<div style="height: 120px; display: flex; flex-direction: column; align-items: center; justify-content: center; background: #f8fafc; border: 1px dashed #cbd5e1; border-radius: 6px; color: #94a3b8;"><span style="font-size: 24px;">🥘</span><span style="font-size: 10px; font-weight: 700; margin-top: 5px;">暂未上传标准成品参考图</span></div>`;

    // Construct the printable HTML page
    let htmlContent = `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8">
          <title>${sop.title} - ${isCatering ? "标准配方配餐规范" : "安全标准作业规范"} (PDF)</title>
          <style>
            @media print {
              body { margin: 0; padding: 1.2cm; background: white; }
              .no-print { display: none !important; }
            }
            @page { size: A4 portrait; margin: 1.2cm; }
            body {
              font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif;
              color: #1e293b;
              background-color: #ffffff;
              line-height: 1.5;
              font-size: 13px;
              margin: 0;
              padding: 20px;
              -webkit-print-color-adjust: exact !important;
              print-color-adjust: exact !important;
            }
            .header-block {
              text-align: center;
              border-bottom: 2px double #94a3b8;
              padding-bottom: 12px;
              margin-bottom: 20px;
            }
            .header-org {
              font-size: 12px;
              font-weight: 800;
              letter-spacing: 0.15em;
              color: #64748b;
              text-transform: uppercase;
            }
            .header-title {
              font-size: 24px;
              font-weight: 900;
              color: #0f172a;
              margin: 6px 0 0 0;
            }
            .meta-grid {
              display: grid;
              grid-template-columns: repeat(12, 1fr);
              border: 1px solid #cbd5e1;
              background-color: #f8fafc;
              font-size: 12px;
              margin-bottom: 20px;
              border-radius: 6px;
              overflow: hidden;
            }
            .meta-label {
              grid-column: span 2;
              background-color: #f1f5f9;
              color: #475569;
              padding: 8px 12px;
              text-align: center;
              font-weight: 700;
              border-right: 1px solid #cbd5e1;
              display: flex;
              align-items: center;
              justify-content: center;
            }
            .meta-value-title {
              grid-column: span 6;
              color: #0f172a;
              padding: 8px 15px;
              background-color: #ffffff;
              font-weight: 800;
              font-size: 14px;
              border-right: 1px solid #cbd5e1;
              display: flex;
              align-items: center;
            }
            .meta-value-code {
              grid-column: span 2;
              padding: 8px;
              background-color: #ffffff;
              text-align: center;
              font-weight: 700;
              font-family: monospace;
              border-right: 1px solid #cbd5e1;
              display: flex;
              align-items: center;
              justify-content: center;
            }
            .meta-value-creator {
              grid-column: span 2;
              padding: 8px;
              background-color: #ffffff;
              text-align: center;
              font-weight: 600;
              color: #475569;
              display: flex;
              align-items: center;
              justify-content: center;
            }
            .section-lbl {
              font-size: 14px;
              font-weight: 850;
              color: #0f172a;
              margin-bottom: 12px;
              border-left: 3.5px solid #10b981;
              padding-left: 8px;
              text-transform: uppercase;
              letter-spacing: 0.05em;
            }
            .g-cols {
              display: grid;
              grid-template-columns: repeat(12, 1fr);
              gap: 20px;
            }
            .col-left {
              grid-column: span 7;
            }
            .col-right {
              grid-column: span 5;
            }
            .table-pdf {
              width: 100%;
              border-collapse: collapse;
              border: 1px solid #cbd5e1;
              border-radius: 6px;
              overflow: hidden;
              margin-bottom: 20px;
              background: white;
            }
            .table-pdf th {
              background-color: #f1f5f9;
              color: #475569;
              font-weight: 700;
              border: 1px solid #cbd5e1;
              padding: 6px 10px;
              font-size: 11px;
            }
            .table-pdf td {
              border: 1px solid #cbd5e1;
              padding: 6px 10px;
              font-size: 11px;
            }
            .val-bold {
              font-weight: 700;
              color: #0f172a;
            }
            .val-mono {
              font-family: monospace;
              font-weight: 700;
            }
            .tag-cat {
              display: inline-block;
              padding: 1.5px 5px;
              font-size: 9.5px;
              font-weight: 700;
              border-radius: 4px;
            }
            .tag-main {
              background-color: #ffedd5;
              color: #c2410c;
              border: 1px solid #fed7aa;
            }
            .tag-sub {
              background-color: #e0e7ff;
              color: #4338ca;
              border: 1px solid #c7d2fe;
            }
            .pic-wrapper {
              border: 1px solid #cbd5e1;
              border-radius: 8px;
              padding: 5px;
              background-color: #ffffff;
              margin-bottom: 15px;
              text-align: center;
            }
            .pic-img {
              width: 100%;
              max-height: 220px;
              object-fit: cover;
              border-radius: 6px;
            }
            .pic-caption {
              font-size: 10px;
              font-weight: 700;
              color: #94a3b8;
              margin-top: 4px;
              font-family: monospace;
              letter-spacing: 0.1em;
            }
            .box-reminders {
              border: 1px solid #cbd5e1;
              border-radius: 8px;
              overflow: hidden;
              background: white;
            }
            .rem-h {
              background-color: #1e293b;
              color: #ffffff;
              text-align: center;
              padding: 5px;
              font-size: 10.5px;
              font-weight: 800;
              letter-spacing: 0.1em;
            }
            .rem-item {
              display: flex;
              border-bottom: 1px solid #cbd5e1;
              padding: 8px 12px;
              font-size: 11.5px;
            }
            .rem-item:last-child {
              border-bottom: none;
            }
            .rem-item.warn-bg {
              background-color: #fffbef;
            }
            .rem-lbl {
              width: 50px;
              font-weight: 800;
              color: #64748b;
              flex-shrink: 0;
            }
            .rem-lbl.warn-color {
              color: #b45309;
            }
            .rem-txt {
              flex: 1;
              font-weight: 700;
            }
            .rem-txt.warn-color {
              color: #92400e;
            }
            .steps-block {
              margin-top: 20px;
            }
            .step-row {
              display: flex;
              gap: 12px;
              margin-bottom: 10px;
              align-items: flex-start;
            }
            .step-num {
              font-family: monospace;
              font-weight: 900;
              color: #059669;
              background-color: #ecfdf5;
              border: 1px solid #a7f3d0;
              border-radius: 6px;
              width: 24px;
              height: 24px;
              display: flex;
              align-items: center;
              justify-content: center;
              flex-shrink: 0;
              font-size: 12px;
            }
            .step-desc {
              font-weight: 700;
              font-size: 12px;
              padding-top: 2.5px;
              color: #334155;
            }
            .text-content-fallback {
              background: #fafaf9;
              border: 1px solid #e7e5e4;
              border-radius: 8px;
              padding: 15px 20px;
              font-size: 12.5px;
              color: #292524;
            }
            .text-content-fallback h3 {
              font-size: 14px;
              font-weight: 800;
              margin-top: 15px;
              margin-bottom: 6px;
              color: #0f172a;
              border-bottom: 1px solid #cbd5e1;
              padding-bottom: 4px;
            }
            .text-content-fallback p {
              margin-top: 0;
              margin-bottom: 10px;
              font-weight: 500;
            }
            .footer-info {
              margin-top: 40px;
              border-top: 1px dashed #cbd5e1;
              padding-top: 10px;
              text-align: center;
              font-size: 10px;
              color: #94a3b8;
              font-weight: 600;
            }
            .action-btn-line {
              position: fixed;
              bottom: 20px;
              right: 20px;
              background-color: #10b981;
              color: white;
              border: none;
              border-radius: 30px;
              padding: 12px 24px;
              font-size: 13px;
              font-weight: 800;
              cursor: pointer;
              box-shadow: 0 4px 15px rgba(16, 185, 129, 0.4);
              font-family: inherit;
              transition: transform 0.15s ease;
            }
            .action-btn-line:hover {
              transform: scale(1.05);
              background-color: #059669;
            }
          </style>
        </head>
        <body>
          <button class="action-btn-line no-print" onclick="window.print()">
            🖨️ 打印 / 另存为 PDF
          </button>

          <div class="header-block">
            <span class="header-org">${sop.recipeCompany || "后勤保障餐饮部餐饮中心"}</span>
            <h1 class="header-title">${isCatering ? "标准烹饪工艺作业指导书 (SOP)" : "仓储安全标准作业指导规范 (SOP)"}</h1>
          </div>

          <div class="meta-grid">
            <div class="meta-label">${isCatering ? "菜品名称" : "规范标题"}</div>
            <div class="meta-value-title">${sop.title}</div>
            <div class="meta-label">${isCatering ? "菜谱编号" : "规程编号"}</div>
            <div class="meta-value-code">${isCatering ? (sop.recipeCode || "REC-NEW") : "SOP-" + (sop.id || "").slice(-6).toUpperCase()}</div>
            <div class="meta-label">起草人</div>
            <div class="meta-value-creator">${creatorCleaned}</div>
          </div>

          ${isCatering ? `
            <div class="g-cols">
              <div class="col-left">
                <div class="section-lbl">📋 标定主配物料清单 (Recipe Ingredients)</div>
                <table class="table-pdf">
                  <thead>
                    <tr>
                      <th style="width: 40px;">序号</th>
                      <th>原辅料品名</th>
                      <th style="width: 80px;">类型</th>
                      <th style="width: 90px; text-align: right;">投料标准</th>
                    </tr>
                  </thead>
                  <tbody>
                    ${ingredientsHtml}
                  </tbody>
                </table>

                <div class="section-lbl">🍲 标准制作工艺及烹饪步骤 (Cooking Steps)</div>
                <div class="steps-block">
                  ${stepsHtml}
                </div>
              </div>

              <div class="col-right">
                <div class="section-lbl">🍳 适用关键设备器皿 (Equipment)</div>
                <table class="table-pdf">
                  <thead>
                    <tr>
                      <th>设备/器皿品名</th>
                      <th>规格要求</th>
                      <th style="width: 60px;">配量</th>
                    </tr>
                  </thead>
                  <tbody>
                    ${equipmentHtml}
                  </tbody>
                </table>

                <div class="section-lbl">💡 厨务核心操作关键控制点 (Reminders)</div>
                <div class="box-reminders">
                  <div class="rem-h">KEY POINTS</div>
                  <div class="rem-item">
                    <div class="rem-lbl">时效</div>
                    <div class="rem-txt">${reminders.time || "按大厨标准"}</div>
                  </div>
                  <div class="rem-item">
                    <div class="rem-lbl">刀工</div>
                    <div class="rem-txt">${reminders.cutStyle || "按大厨标准"}</div>
                  </div>
                  <div class="rem-item warn-bg">
                    <div class="rem-lbl warn-color">提醒</div>
                    <div class="rem-txt warn-color">${reminders.info || "注意火候，安全第一"}</div>
                  </div>
                </div>

                <div class="section-lbl" style="margin-top: 20px;">🖼️ 菜品标准成品图 (Reference)</div>
                <div class="pic-wrapper">
                  ${imageRefBlock}
                  <div class="pic-caption">菜品出锅摆盘标准示意图</div>
                </div>
              </div>
            </div>
          ` : `
            <div class="section-lbl">📖 标准作业规程 / 核心要求细节 (SOP Rules)</div>
            <div class="text-content-fallback">
              ${sop.content}
            </div>
            ${trainingImageHtml}
          `}

          <div class="footer-info">
            &copy; 智链云仓数字化后台 &middot; 安全与餐饮保障规范 &middot; 作业指导书 (SOP) 打印件
          </div>
        </body>
      </html>
    `;

    printWindow.document.write(htmlContent);
    printWindow.document.close();
  };

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6 animate-fade-in">
      
      {/* Header with Title */}
      {category !== 'catering' ? null : (
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-white rounded-2xl border border-slate-100 p-6 shadow-sm">
          <div>
            <h1 className="text-xl font-bold text-slate-800 flex items-center gap-2">
              🛡️ 后勤膳食菜谱与经典食谱配方库
            </h1>
            <p className="text-xs text-slate-400 mt-1">
              规范后勤膳食加工工艺，指导厨师制作标准化菜品细节
            </p>
          </div>
        </div>
      )}

      {activeMode === 'manager' && (
        isCreating ? (
          <div className="space-y-6 animate-fade-in p-2">
      {/* Header Bar */}
      <div className="bg-white rounded-2xl border border-slate-100 p-4 flex items-center justify-between gap-4 shadow-sm">
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => {
              setIsCreating(false);
              setEditingSopId(null);
            }}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-slate-650 bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded-xl transition cursor-pointer"
          >
            <ChevronRight className="w-4 h-4 rotate-180" />
            <span>返回</span>
          </button>
          
          <div className="h-5 w-[1px] bg-slate-200"></div>

          <h2 className="text-sm font-black text-slate-800">
            {editingSopId ? "编辑规程文档" : "起草新SOP规程"}
          </h2>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left Column: Form Editor */}
        <div className={`${category === 'catering' ? 'lg:col-span-12' : 'lg:col-span-7'} bg-white rounded-2xl border border-slate-100 p-6 flex flex-col space-y-6 shadow-sm`}>
          
          {/* Basic Info Block */}
          <div className="space-y-4">
            <div className="space-y-1.5">
              <label className="block text-xs font-bold text-slate-600">
                规程主题
              </label>
              <input
                type="text"
                required
                placeholder="请输入规程或培训主题 (例如：仓内叉车作业安全规范)..."
                value={formTitle}
                onChange={(e) => setFormTitle(e.target.value)}
                className="w-full px-3 py-2.5 text-xs bg-slate-50 border border-slate-200 rounded-xl text-slate-800 outline-none focus:ring-2 focus:ring-indigo-500 focus:bg-white transition"
              />
            </div>

            {category !== 'catering' && (
              <div className="space-y-1.5 max-w-xs">
                <label className="block text-xs font-bold text-slate-600">
                  分类标签
                </label>
                <div className="grid grid-cols-2 gap-1 bg-slate-100/80 p-1 rounded-xl border border-slate-200">
                  <button
                    type="button"
                    onClick={() => setFormDocType('training')}
                    className={`py-1.5 text-xs font-semibold rounded-lg transition-all duration-150 cursor-pointer ${
                      formDocType === 'training'
                        ? 'bg-white text-indigo-700 shadow-sm font-bold'
                        : 'text-slate-500 hover:text-slate-800'
                    }`}
                  >
                    培训文档
                  </button>
                  <button
                    type="button"
                    onClick={() => setFormDocType('notification')}
                    className={`py-1.5 text-xs font-semibold rounded-lg transition-all duration-150 cursor-pointer ${
                      formDocType === 'notification'
                        ? 'bg-white text-indigo-700 shadow-sm font-bold'
                        : 'text-slate-500 hover:text-slate-800'
                    }`}
                  >
                    通知公告
                  </button>
                </div>
              </div>
            )}
          </div>

          {category === 'catering' ? (
            <div className="space-y-1.5 text-slate-800">
              <label className="block text-xs font-bold text-slate-600">
                配料与制作参数
              </label>
              <RecipeFormEditor
                recipeCode={recipeCode}
                setRecipeCode={setRecipeCode}
                recipeCompany={recipeCompany}
                setRecipeCompany={setRecipeCompany}
                recipeIngredients={recipeIngredients}
                setRecipeIngredients={setRecipeIngredients}
                recipeEquipment={recipeEquipment}
                setRecipeEquipment={setRecipeEquipment}
                recipeReminders={recipeReminders}
                setRecipeReminders={setRecipeReminders}
                recipeSteps={recipeSteps}
                setRecipeSteps={setRecipeSteps}
                isEdit={!!editingSopId}
                recipeImages={tempImages}
                setRecipeImages={setTempImages}
              />
            </div>
          ) : (
            <div className="space-y-3">
              <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2">
                <label className="text-xs font-bold text-slate-600">
                  正文内容编写
                </label>
                
                {/* Visual vs HTML tabs */}
                <div className="flex gap-1 bg-slate-100 p-0.5 rounded-lg border border-slate-200">
                  <button
                    type="button"
                    onClick={() => setEditorMode('visual')}
                    className={`px-2.5 py-1 text-[10px] font-bold rounded-md transition ${
                      editorMode === 'visual'
                        ? 'bg-white text-indigo-700 shadow-sm'
                        : 'text-slate-500 hover:text-slate-800'
                    }`}
                  >
                    可视化
                  </button>
                  <button
                    type="button"
                    onClick={() => setEditorMode('html')}
                    className={`px-2.5 py-1 text-[10px] font-bold rounded-md transition ${
                      editorMode === 'html'
                        ? 'bg-white text-indigo-700 shadow-sm'
                        : 'text-slate-500 hover:text-slate-800'
                    }`}
                  >
                    HTML代码
                  </button>
                </div>
              </div>

              {/* Formatting Toolbar */}
              {editorMode === 'visual' && (
                <div className="flex flex-wrap gap-1 bg-slate-50 p-1.5 rounded-xl border border-slate-200 items-center">
                  
                  {/* Hidden file input for uploading images */}
                  <input 
                    type="file" 
                    ref={imageFileInputRef} 
                    onChange={handleLocalImageUpload} 
                    accept="image/*" 
                    className="hidden" 
                  />

                  {/* High-frequency text style controls */}
                  <button
                    type="button"
                    onMouseDown={(e) => e.preventDefault()}
                    onClick={() => handleInsertCustomTag('h1')}
                    className="p-1.5 px-2.5 text-xs hover:bg-white hover:shadow-xs rounded-lg font-black text-slate-900 border border-transparent hover:border-slate-200 transition cursor-pointer"
                    title="插入一级标题"
                  >
                    标题一
                  </button>
                  <button
                    type="button"
                    onMouseDown={(e) => e.preventDefault()}
                    onClick={() => handleInsertCustomTag('h2')}
                    className="p-1.5 px-2.5 text-xs hover:bg-white hover:shadow-xs rounded-lg font-extrabold text-slate-800 border border-transparent hover:border-slate-200 transition cursor-pointer"
                    title="插入二级标题"
                  >
                    标题二
                  </button>
                  <button
                    type="button"
                    onMouseDown={(e) => e.preventDefault()}
                    onClick={() => handleInsertCustomTag('h3')}
                    className="p-1.5 px-2.5 text-xs hover:bg-white hover:shadow-xs rounded-lg font-bold text-slate-700 border border-transparent hover:border-slate-200 transition cursor-pointer"
                    title="插入三级标题"
                  >
                    标题三
                  </button>
                  <button
                    type="button"
                    onMouseDown={(e) => e.preventDefault()}
                    onClick={() => handleInsertCustomTag('p')}
                    className="p-1.5 px-2.5 text-xs hover:bg-white hover:shadow-xs rounded-lg font-medium text-slate-700 border border-transparent hover:border-slate-200 transition cursor-pointer"
                    title="新段落"
                  >
                    段落
                  </button>
                  
                  <div className="w-[1px] h-4 bg-slate-200 mx-1"></div>

                  <button
                    type="button"
                    onMouseDown={(e) => e.preventDefault()}
                    onClick={() => handleInsertCustomTag('b')}
                    className="p-1.5 px-2.5 text-xs hover:bg-white hover:shadow-xs rounded-lg text-slate-900 border border-transparent hover:border-slate-200 transition cursor-pointer flex items-center gap-1"
                    title="加粗选中文字"
                  >
                    <Bold className="w-3.5 h-3.5" />
                    <span>加粗</span>
                  </button>
                  
                  <button
                    type="button"
                    onMouseDown={(e) => e.preventDefault()}
                    onClick={() => handleInsertCustomTag('italic')}
                    className="p-1.5 px-2.5 text-xs hover:bg-white hover:shadow-xs rounded-lg text-slate-700 border border-transparent hover:border-slate-200 transition cursor-pointer flex items-center gap-1"
                    title="倾斜选中文字"
                  >
                    <Italic className="w-3.5 h-3.5" />
                    <span>倾斜</span>
                  </button>

                  <button
                    type="button"
                    onMouseDown={(e) => e.preventDefault()}
                    onClick={() => handleInsertCustomTag('underline')}
                    className="p-1.5 px-2.5 text-xs hover:bg-white hover:shadow-xs rounded-lg text-slate-700 border border-transparent hover:border-slate-200 transition cursor-pointer flex items-center gap-1"
                    title="给选中文字加下划线"
                  >
                    <Underline className="w-3.5 h-3.5" />
                    <span>下划线</span>
                  </button>

                  <div className="w-[1px] h-4 bg-slate-200 mx-1"></div>

                  <button
                    type="button"
                    onMouseDown={(e) => e.preventDefault()}
                    onClick={() => handleInsertCustomTag('ul')}
                    className="p-1.5 px-2.5 text-xs hover:bg-white hover:shadow-xs rounded-lg text-slate-700 border border-transparent hover:border-slate-200 transition cursor-pointer flex items-center gap-1"
                    title="无序列表"
                  >
                    <List className="w-3.5 h-3.5" />
                    <span>无序列表</span>
                  </button>

                  <button
                    type="button"
                    onMouseDown={(e) => e.preventDefault()}
                    onClick={() => handleInsertCustomTag('ol')}
                    className="p-1.5 px-2.5 text-xs hover:bg-white hover:shadow-xs rounded-lg text-slate-700 border border-transparent hover:border-slate-200 transition cursor-pointer flex items-center gap-1"
                    title="有序列表"
                  >
                    <ListOrdered className="w-3.5 h-3.5" />
                    <span>有序列表</span>
                  </button>

                  <div className="w-[1px] h-4 bg-slate-200 mx-1"></div>

                  {/* SOP-specific widgets */}
                  <button
                    type="button"
                    onMouseDown={(e) => e.preventDefault()}
                    onClick={() => handleInsertCustomTag('warning')}
                    className="p-1.5 px-2.5 text-xs hover:bg-amber-100 hover:shadow-xs rounded-lg font-bold text-amber-850 bg-amber-50/50 border border-amber-250/30 transition cursor-pointer flex items-center gap-1"
                    title="插入黄边警告框"
                  >
                    <AlertTriangle className="w-3.5 h-3.5 text-amber-500" />
                    <span>⚠️ 警示框</span>
                  </button>
                  
                  <button
                    type="button"
                    onMouseDown={(e) => e.preventDefault()}
                    onClick={() => handleInsertCustomTag('success')}
                    className="p-1.5 px-2.5 text-xs hover:bg-emerald-100 hover:shadow-xs rounded-lg font-bold text-emerald-850 bg-emerald-50/50 border border-emerald-250/30 transition cursor-pointer flex items-center gap-1"
                    title="插入绿边合规标准框"
                  >
                    <CheckCircle className="w-3.5 h-3.5 text-emerald-500" />
                    <span>✔ 合规框</span>
                  </button>
                  
                  <button
                    type="button"
                    onMouseDown={(e) => e.preventDefault()}
                    onClick={() => handleInsertCustomTag('list')}
                    className="p-1.5 px-2.5 text-xs hover:bg-indigo-100 hover:shadow-xs rounded-lg text-indigo-850 bg-indigo-50/50 border border-indigo-250/30 transition cursor-pointer font-semibold flex items-center gap-1"
                    title="插入复选框列表"
                  >
                    <Check className="w-3.5 h-3.5 text-indigo-500" />
                    <span>☑ 点检勾选</span>
                  </button>

                  <div className="w-[1px] h-4 bg-slate-200 mx-1"></div>

                  {/* High-frequency image uploader */}
                  <button
                    type="button"
                    onMouseDown={(e) => e.preventDefault()}
                    onClick={() => imageFileInputRef.current?.click()}
                    className="p-1.5 px-2.5 text-xs bg-indigo-600 hover:bg-indigo-700 text-white hover:shadow-xs rounded-lg font-semibold transition flex items-center gap-1 cursor-pointer"
                    title="上传并插入本地图片"
                  >
                    <Upload className="w-3.5 h-3.5 text-white" />
                    <span>上传本地图片</span>
                  </button>

                </div>
              )}

              {/* Editor Workspace */}
              {editorMode === 'visual' ? (
                <div 
                  ref={editorRef}
                  contentEditable
                  data-placeholder="在此直接输入或排版培训规章内容..."
                  onInput={() => {
                    if (editorRef.current) {
                      setFormContent(editorRef.current.innerHTML);
                    }
                  }}
                  className="w-full px-4 py-4.5 text-xs bg-slate-50 border border-slate-200 rounded-2xl text-slate-800 placeholder-slate-400 outline-none focus:ring-0 focus:border-slate-200 focus:outline-none focus-visible:outline-none focus-visible:ring-0 focus-visible:border-slate-200 focus:bg-white min-h-[300px] overflow-y-auto leading-relaxed prose prose-sm max-w-none shadow-inner"
                  style={{ outline: 'none', boxShadow: 'none' }}
                />
              ) : (
                <textarea
                  id="sopFormContent"
                  required
                  rows={12}
                  placeholder="在此直接编辑 HTML 源码..."
                  value={formContent}
                  onChange={(e) => setFormContent(e.target.value)}
                  className="w-full px-4 py-4.5 text-xs bg-slate-50 border border-slate-200 rounded-2xl text-slate-800 placeholder-slate-400 outline-none focus:ring-0 focus:border-slate-200 focus:outline-none focus-visible:outline-none focus-visible:ring-0 focus-visible:border-slate-200 focus:bg-white font-mono leading-relaxed resize-y min-h-[300px]"
                  style={{ outline: 'none', boxShadow: 'none' }}
                />
              )}

              {/* Attachment upload */}
              <div className="space-y-1.5 pt-3 border-t border-slate-100 mt-4">
                <label className="block text-xs font-bold text-slate-600">
                  文档附件
                </label>
                
                <div
                  onDragOver={handleDragOver}
                  onDragLeave={handleDragLeave}
                  onDrop={handleDrop}
                  onClick={() => fileInputRef.current?.click()}
                  className={`border-2 border-dashed rounded-2xl p-4 text-center cursor-pointer transition ${
                    isDragging 
                      ? 'border-indigo-500 bg-indigo-50 text-indigo-700 font-semibold' 
                      : 'border-slate-200 hover:border-indigo-400 bg-slate-50 hover:bg-slate-100/50'
                  }`}
                >
                  <input 
                    type="file" 
                    multiple
                    ref={fileInputRef}
                    onChange={handleFileSelect}
                    className="hidden" 
                  />
                  <Upload className="w-5 h-5 text-slate-400 mx-auto mb-1.5" />
                  <p className="text-xs text-slate-600 font-bold">
                    拖拽文件至此，或者 <span className="text-indigo-600 hover:underline">点击这里上传本地文件</span>
                  </p>
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
                          className="ml-1 text-red-500 hover:text-red-700 text-[10px] cursor-pointer"
                        >
                          ✕
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Targeted Distribution list */}
          {category !== 'catering' && (
            <div className="space-y-3.5 border-t border-slate-100 pt-5">
              <div className="flex justify-between items-center">
                <label className="block text-xs font-bold text-slate-600">
                  下发受众范围
                </label>
              </div>

              <div className="flex gap-4">
                <label className="flex items-center gap-1.5 cursor-pointer text-xs font-bold text-slate-755 text-slate-700 select-none">
                  <input
                    type="radio"
                    name="studioTarget"
                    checked={formTargetType === 'all'}
                    onChange={() => setFormTargetType('all')}
                    className="w-4 h-4 text-indigo-600 focus:ring-indigo-500 cursor-pointer"
                  />
                  <span>下发全在职员工 ({employees.length}人)</span>
                </label>

                <label className="flex items-center gap-1.5 cursor-pointer text-xs font-bold text-indigo-700 select-none">
                  <input
                    type="radio"
                    name="studioTarget"
                    checked={formTargetType === 'specific'}
                    onChange={() => setFormTargetType('specific')}
                    className="w-4 h-4 text-indigo-600 focus:ring-indigo-500 cursor-pointer"
                  />
                  <span>个别特定员工</span>
                </label>
              </div>

              {/* Selective target list */}
              {formTargetType === 'specific' && (
                <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4 space-y-3 animate-fade-in">
                  <div className="flex flex-wrap gap-1.5">
                    <button
                      type="button"
                      onClick={() => handleGroupSelect('all')}
                      className="px-2.5 py-1 text-[10px] font-bold bg-white border border-slate-200 rounded-lg text-slate-700 hover:bg-slate-100 shadow-xs transition cursor-pointer"
                    >
                      全选
                    </button>
                    <button
                      type="button"
                      onClick={() => handleGroupSelect('none')}
                      className="px-2.5 py-1 text-[10px] font-bold bg-white border border-slate-200 rounded-lg text-slate-700 hover:bg-slate-100 shadow-xs transition cursor-pointer"
                    >
                      清空
                    </button>
                    <button
                      type="button"
                      onClick={() => handleGroupSelect('dept', 'A区入库')}
                      className="px-2.5 py-1 text-[10px] font-bold bg-indigo-50 border border-indigo-100 rounded-lg text-indigo-700 hover:bg-indigo-100 transition cursor-pointer"
                    >
                      A区入库组
                    </button>
                    <button
                      type="button"
                      onClick={() => handleGroupSelect('dept', 'B区出库')}
                      className="px-2.5 py-1 text-[10px] font-bold bg-emerald-50 border border-emerald-100 rounded-lg text-emerald-700 hover:bg-emerald-100 transition cursor-pointer"
                    >
                      B区出库组
                    </button>
                  </div>

                  {/* Targeted Search */}
                  <div className="relative">
                    <input
                      type="text"
                      placeholder="搜索受众姓名或职位..."
                      className="w-full pl-8 pr-3 py-1.5 text-xs bg-white border border-slate-200 rounded-lg outline-none focus:ring-2 focus:ring-indigo-500 shadow-sm"
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

                  {/* Employees Check Cards */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-44 overflow-y-auto pr-1">
                    {employees.map(emp => {
                      const isChecked = formTargetIds.includes(emp.id);

                      return (
                        <label
                          key={emp.id}
                          className={`studio-emp-row flex items-center gap-2 p-2 rounded-xl border cursor-pointer select-none transition ${
                            isChecked 
                              ? 'bg-indigo-50/50 border-indigo-200 text-slate-800 font-semibold shadow-xs' 
                              : 'bg-white border-slate-100 hover:bg-slate-50 text-slate-600'
                          }`}
                        >
                          <input
                            type="checkbox"
                            checked={isChecked}
                            onChange={() => toggleEmployeeTargetSelection(emp.id)}
                            className="w-3.5 h-3.5 text-indigo-600 focus:ring-indigo-500 rounded cursor-pointer"
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
          )}

          {/* Submitting controls */}
          <div className="p-4 bg-slate-50 border-t border-slate-150 flex gap-3 mt-auto shrink-0 rounded-2xl">
            <button
              type="button"
              onClick={() => {
                setIsCreating(false);
                setEditingSopId(null);
              }}
              className="flex-1 py-2.5 bg-white border border-slate-200 hover:bg-slate-100 text-slate-500 font-bold rounded-xl text-sm transition cursor-pointer"
            >
              取消
            </button>
            
            {category === 'catering' && (
              <button
                type="button"
                onClick={() => setShowCateringMobilePreview(true)}
                className="flex-1 py-2.5 bg-amber-500 hover:bg-amber-600 text-white font-bold rounded-xl text-sm transition shadow-sm flex items-center justify-center gap-1.5 cursor-pointer"
              >
                <Eye className="w-4 h-4" />
                <span>预览</span>
              </button>
            )}
            
            <button
              type="button"
              onClick={handleSaveSop}
              className="flex-1 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-xl text-sm transition shadow-sm flex items-center justify-center gap-1.5 cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              <span>保存下发</span>
            </button>
          </div>

        </div>

        {/* Right Column: Live Smartphone Simulation Preview */}
        {category !== 'catering' && (
          <div className="lg:col-span-5 flex flex-col space-y-4">
            
            {/* Phone container */}
            <div className="mx-auto w-[310px] bg-slate-900 rounded-[44px] p-2.5 shadow-2xl border-4 border-slate-800 sticky top-4 h-[630px] flex flex-col justify-between">
              {/* Notch */}
              <div className="px-5 pt-1.5 pb-2 flex items-center justify-between text-slate-300 text-[10px]">
                <span className="font-bold select-none font-mono">15:30</span>
                <div className="w-16 h-3.5 bg-black rounded-b-xl absolute left-1/2 -translate-x-1/2 top-2.5"></div>
                <div className="flex items-center gap-1">
                  <span className="text-[8px] bg-blue-500/20 px-1 rounded text-blue-400 font-extrabold uppercase">5G</span>
                  <div className="w-4.5 h-2 bg-white/70 rounded-xs"></div>
                </div>
              </div>

              {/* Device Screen wrapper */}
              <div className="bg-slate-100 flex-1 rounded-[32px] overflow-hidden flex flex-col relative h-full">
                
                {/* Screen banner */}
                <div className="bg-gradient-to-r from-blue-600 to-indigo-600 text-white p-3 pt-4 text-center">
                  <h4 className="text-xs font-extrabold mt-1 truncate">
                    {formTitle ? formTitle.trim() : "无标题规程（起草中）"}
                  </h4>
                </div>

                {/* Smartphone scrolling body */}
                <div className="p-3 space-y-3.5 overflow-y-auto flex-1 text-[11px] leading-relaxed">
                  
                  {/* Main text box display HTML directly */}
                  <div className="bg-white rounded-2xl border border-slate-200 p-3 space-y-2.5">
                    <span className="text-[8px] font-extrabold text-blue-600 uppercase tracking-widest block font-mono">
                      规章正文
                    </span>
                    
                    <div 
                      className="text-[10px] text-slate-900 space-y-2 select-text sop-content"
                      dangerouslySetInnerHTML={{ 
                        __html: formContent 
                          ? formContent.replace(/\n/g, '<br />')
                          : `<span class="text-slate-400 italic font-sans">（主干条款正文为空。请在左方编撰正文条目...）</span>` 
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
                        <p className="text-[8px] font-bold text-slate-400 uppercase tracking-wide">
                          相关电子文档附件:
                        </p>
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
                      className="w-full py-2 bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-xl text-[10px] font-extrabold flex items-center justify-center gap-1 opacity-70 cursor-not-allowed shadow-md"
                    >
                      <Send className="w-3 h-3 text-white" />
                      <span>签字签收并服从管理指令</span>
                    </button>
                  </div>

                </div>

                {/* Bottom Indicator */}
                <div className="h-3 flex items-center justify-center bg-slate-100 pb-1">
                  <div className="w-16 h-1 bg-slate-300 rounded-full"></div>
                </div>

              </div>
            </div>

          </div>
        )}
        
      </div>
    </div>
  ) : (
    <div className="space-y-6">
      {/* Control Bar: Search input, Sub-type filter tabs, and Create button */}
      <div className="bg-white rounded-2xl border border-slate-100 p-4 shadow-sm flex flex-col md:flex-row items-center justify-between gap-4">
        
        {/* Search input with search icon */}
        <div className="relative w-full md:max-w-md">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input
            type="text"
            placeholder={category === 'catering' ? "搜索菜谱名称、工艺、配料或编号..." : "搜索SOP主题、规程要点、发布部门..."}
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-10 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-indigo-500 focus:bg-white transition"
          />
          {searchTerm && (
            <button
              type="button"
              onClick={() => setSearchTerm("")}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 font-bold text-xs cursor-pointer"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>

        {/* Filters and Creation Action Buttons */}
        <div className="flex flex-wrap items-center gap-3 w-full md:w-auto justify-end">
          {/* Subtype tabs for Training category */}
          {category === 'training' && (
            <div className="flex bg-slate-100 p-1 rounded-xl border border-slate-200 text-xs font-semibold">
              <button
                type="button"
                onClick={() => setDocTypeFilter('all')}
                className={`px-3 py-1.5 rounded-lg transition-all duration-150 cursor-pointer ${
                  docTypeFilter === 'all'
                    ? 'bg-white text-indigo-700 shadow-xs font-black'
                    : 'text-slate-500 hover:text-slate-800'
                }`}
              >
                全部类别
              </button>
              <button
                type="button"
                onClick={() => setDocTypeFilter('training')}
                className={`px-3 py-1.5 rounded-lg transition-all duration-150 cursor-pointer ${
                  docTypeFilter === 'training'
                    ? 'bg-white text-indigo-700 shadow-xs font-black'
                    : 'text-slate-500 hover:text-slate-800'
                }`}
              >
                培训文档
              </button>
              <button
                type="button"
                onClick={() => setDocTypeFilter('notification')}
                className={`px-3 py-1.5 rounded-lg transition-all duration-150 cursor-pointer ${
                  docTypeFilter === 'notification'
                    ? 'bg-white text-indigo-700 shadow-xs font-black'
                    : 'text-slate-500 hover:text-slate-800'
                }`}
              >
                通知公告
              </button>
            </div>
          )}

          {/* Action trigger button */}
          <button
            type="button"
            onClick={handleStartCreateNewSop}
            className="px-4 py-2 text-xs font-black text-white bg-indigo-600 hover:bg-indigo-700 active:bg-indigo-800 rounded-xl transition flex items-center gap-1.5 shadow-sm cursor-pointer"
          >
            <Plus className="w-4 h-4 text-white font-black" />
            <span>
              {category === 'catering' ? '新建菜谱规程' : '新建'}
            </span>
          </button>
        </div>

      </div>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6 items-start">
            
            {/* Column A: Left side list displaying published SOPs */}
            <div className={`${selectedSopForDetails ? "xl:col-span-2" : "xl:col-span-3"} space-y-4`}>

            {/* List entries for current SOPs */}
            {category === 'catering' ? (
              filteredSops.length === 0 ? (
                <div className="bg-white rounded-xl p-12 text-center border border-slate-100 text-slate-400">
                  <FileText className="w-12 h-12 text-slate-200 mx-auto mb-3" />
                  <p className="text-sm font-semibold">没有找到匹配检索的餐品茶歇与菜谱配方</p>
                  <p className="text-xs text-slate-400 mt-1">
                    您可以点击右上方 “新建菜谱规程” 编写首份膳食配餐或经典食谱规范
                  </p>
                </div>
              ) : (
                <div className="bg-white rounded-xl shadow-sm border border-slate-100 overflow-hidden">
                  <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse min-w-[950px] text-[13px]">
                      <thead>
                        <tr className="bg-slate-50 border-b border-slate-200/80 text-slate-500 font-bold text-xs uppercase tracking-wider">
                          <th className="px-5 py-4 w-[130px]">菜谱编号</th>
                          <th className="px-5 py-4">菜品名称 & 工艺规范</th>
                          <th className="px-5 py-4">发布部门</th>
                          <th className="px-5 py-4 text-center">下发范围</th>
                          <th className="px-5 py-4 text-center w-[180px]">签收进度</th>
                          <th className="px-5 py-4 text-center w-[120px]">状态</th>
                          <th className="px-5 py-4 text-center w-[200px]">操作</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 text-slate-750">
                        {filteredSops.map(sop => {
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
                            <tr 
                              key={sop.id}
                              onClick={() => setSelectedSopForDetails(selectedSopForDetails?.id === sop.id ? null : sop)}
                              className={`hover:bg-slate-50/70 transition-colors cursor-pointer align-middle ${
                                isSopSelected ? 'bg-brand-50/40' : ''
                              }`}
                            >
                              {/* Recipe Code */}
                              <td className="px-5 py-4.5 align-middle">
                                <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-indigo-50/60 border border-indigo-100/60 text-indigo-700 font-mono text-xs font-bold shadow-3xs">
                                  <ChefHat className="w-3.5 h-3.5 text-indigo-400 shrink-0" />
                                  <span>{sop.recipeCode || "Pi-000"}</span>
                                </span>
                              </td>

                              {/* Title and metadata */}
                              <td className="px-5 py-4.5 align-middle">
                                <div className="flex items-center gap-2">
                                  <span className="text-base shrink-0">🍲</span>
                                  <span className="font-black text-slate-800 text-sm tracking-tight leading-snug hover:text-brand-650 transition">
                                    {sop.title}
                                  </span>
                                </div>
                                <div className="flex items-center gap-2 mt-2 flex-wrap">
                                  {sop.recipeIngredients && sop.recipeIngredients.length > 0 && (
                                    <span className="inline-flex items-center gap-1 text-[10px] text-amber-700 font-black bg-amber-50/80 px-2.5 py-0.5 rounded-md border border-amber-100 shadow-3xs">
                                      <Utensils className="w-2.5 h-2.5 text-amber-500 shrink-0" />
                                      <span>{sop.recipeIngredients.length} 种主配料</span>
                                    </span>
                                  )}
                                  {sop.images.length > 0 && (
                                    <span className="inline-flex items-center gap-1 text-[10px] text-emerald-700 font-black bg-emerald-50/80 px-2.5 py-0.5 rounded-md border border-emerald-100 shadow-3xs">
                                      <ImageIcon className="w-2.5 h-2.5 text-emerald-500 shrink-0" />
                                      <span>{sop.images.length} 张工艺图</span>
                                    </span>
                                  )}
                                  {sop.attachments.length > 0 && (
                                    <span className="inline-flex items-center gap-1 text-[10px] text-blue-700 font-black bg-blue-50/80 px-2.5 py-0.5 rounded-md border border-blue-100 shadow-3xs">
                                      <Paperclip className="w-2.5 h-2.5 text-blue-500 shrink-0" />
                                      <span>{sop.attachments.length} 份附件文档</span>
                                    </span>
                                  )}
                                </div>
                              </td>

                              {/* Publisher / Creator */}
                              <td className="px-5 py-4.5 align-middle">
                                <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-extrabold text-orange-700 bg-orange-50/60 border border-orange-100/60 shadow-3xs">
                                  <span className="w-1.5 h-1.5 rounded-full bg-orange-500 shrink-0 animate-pulse" />
                                  <span>{sop.creator.replace('后勤餐饮保障部', '餐饮部').replace('后勤环卫科', '环卫科').replace('仓库安全处', '安全处')}</span>
                                </span>
                              </td>

                              {/* Target delivery */}
                              <td className="px-5 py-4.5 align-middle">
                                <div className="flex justify-center">
                                  {sop.status === 'draft' ? (
                                    sop.targetType === 'all' ? (
                                      <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-bold text-slate-500 bg-slate-55 bg-slate-50 border border-slate-200 shadow-4xs">
                                        <Users className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                                        <span>全员 (预设)</span>
                                      </span>
                                    ) : (
                                      <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-bold text-slate-500 bg-slate-50 border border-slate-200 shadow-4xs">
                                        <UserCheck className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                                        <span>指定 ({sop.targetEmployeeIds?.length || 0}人)</span>
                                      </span>
                                    )
                                  ) : (
                                    sop.targetType === 'all' ? (
                                      <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-bold text-purple-700 bg-purple-50 border border-purple-100 shadow-4xs">
                                        <Users className="w-3.5 h-3.5 text-purple-500 shrink-0" />
                                        <span>全体下发确认</span>
                                      </span>
                                    ) : (
                                      <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-bold text-sky-700 bg-sky-50 border border-sky-100 shadow-4xs">
                                        <UserCheck className="w-3.5 h-3.5 text-sky-500 shrink-0" />
                                        <span>指定下发 ({sop.targetEmployeeIds?.length}人)</span>
                                      </span>
                                    )
                                  )}
                                </div>
                              </td>

                              {/* Execution progress */}
                              <td className="px-5 py-4.5 align-middle text-center" onClick={(e) => e.stopPropagation()}>
                                <div className="flex justify-center">
                                  {sop.status === 'draft' ? (
                                    <span className="inline-flex items-center gap-1 text-xs font-semibold text-slate-400 bg-slate-50/50 border border-slate-150 rounded-lg px-2.5 py-1">
                                      ⏳ 待发布后开始
                                    </span>
                                  ) : (
                                    <div className="flex flex-col items-center w-[140px] bg-slate-50/60 border border-slate-100 rounded-xl p-2.5 shadow-4xs">
                                      <div className="flex items-center justify-between w-full mb-1">
                                        <span className="text-[10px] font-black text-slate-400">已签进度</span>
                                        <span className="text-[11px] font-black font-mono text-brand-650">{ratio.toFixed(0)}%</span>
                                      </div>
                                      <div className="w-full bg-slate-200 h-2 rounded-full overflow-hidden border border-slate-100">
                                        <div 
                                          className="bg-gradient-to-r from-brand-500 to-brand-600 h-full rounded-full transition-all duration-500" 
                                          style={{ width: `${ratio}%` }} 
                                        />
                                      </div>
                                      <span className="text-[9.5px] text-slate-500 font-extrabold mt-1.5 block">
                                        👥 已签收 {confirmedCount}/{totalEligible} 人
                                      </span>
                                    </div>
                                  )}
                                </div>
                              </td>

                              {/* Core Publish status */}
                              <td className="px-5 py-4.5 align-middle">
                                <div className="flex justify-center">
                                  {sop.status === 'draft' ? (
                                    <span className="px-2.5 py-1 rounded-full text-xs font-extrabold text-slate-600 bg-slate-100/80 border border-slate-200 inline-flex items-center gap-1.5 shadow-3xs">
                                      <Clock className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                                      <span>草稿未发</span>
                                    </span>
                                  ) : (
                                    <span className="px-2.5 py-1 rounded-full text-xs font-extrabold text-emerald-700 bg-emerald-50 border border-emerald-100 inline-flex items-center gap-1.5 shadow-3xs">
                                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 shrink-0 animate-ping" />
                                      <span>已发布执行</span>
                                    </span>
                                  )}
                                </div>
                              </td>

                              {/* Interactive Actions */}
                              <td className="px-5 py-4.5 align-middle text-center" onClick={(e) => e.stopPropagation()}>
                                <div className="flex items-center justify-center gap-1.5">
                                  {sop.status === 'draft' && (
                                    <button
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        handleOpenPublishSop(sop);
                                      }}
                                      className="px-2.5 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold rounded-lg text-xs transition shadow-sm hover:shadow flex items-center gap-1 cursor-pointer"
                                      title="在全员或员工中发布下发此菜谱"
                                    >
                                      <Send className="w-3 h-3 shrink-0" />
                                      <span>发布</span>
                                    </button>
                                  )}

                                  <button
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      setPreviewSop(sop);
                                    }}
                                    className="p-1.5 bg-slate-50 hover:bg-emerald-50 border border-slate-200 hover:border-emerald-100 text-slate-600 hover:text-emerald-700 rounded-lg transition flex items-center justify-center cursor-pointer shadow-4xs"
                                    title="查看并预览工艺菜谱明细"
                                  >
                                    <Eye className="w-4 h-4" />
                                  </button>

                                  <button
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      handleExportSopPdf(sop);
                                    }}
                                    className="p-1.5 bg-slate-50 hover:bg-teal-50 border border-slate-200 hover:border-teal-100 text-slate-600 hover:text-teal-700 rounded-lg transition flex items-center justify-center cursor-pointer shadow-4xs"
                                    title="导出此菜谱为PDF格式实体文件"
                                  >
                                    <Download className="w-4 h-4" />
                                  </button>

                                  <button
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      handleOpenEditSop(sop);
                                    }}
                                    className="p-1.5 bg-slate-50 hover:bg-indigo-50 border border-slate-200 hover:border-indigo-100 text-slate-600 hover:text-indigo-700 rounded-lg transition flex items-center justify-center cursor-pointer shadow-4xs"
                                    title="编辑菜谱配餐与指导参数"
                                  >
                                    <Edit className="w-4 h-4" />
                                  </button>

                                  <button
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      handleDeleteSop(sop.id, sop.title);
                                    }}
                                    className="p-1.5 bg-slate-50 hover:bg-red-50 border border-slate-200 hover:border-red-100 text-slate-400 hover:text-red-500 rounded-lg transition flex items-center justify-center cursor-pointer shadow-4xs"
                                    title="删除此菜谱"
                                  >
                                    <Trash2 className="w-4 h-4" />
                                  </button>
                                </div>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </div>
              )
            ) : (
              <div className="space-y-3">
                {filteredSops.length === 0 ? (
                  <div className="bg-white rounded-xl p-12 text-center border border-slate-101 border-slate-100 text-slate-400">
                    <FileText className="w-12 h-12 text-slate-200 mx-auto mb-3" />
                    <p className="text-sm font-semibold">没有找到匹配检索的SOP规范</p>
                    <p className="text-xs text-slate-400 mt-1">
                      您可以点击右上方 “起草并下发新SOP” 编写首份仓库作业安全手册
                    </p>
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
                          isSopSelected ? 'border-brand-500 ring-2 ring-brand-50' : 'border-slate-101'
                        }`}
                      >
                        <div className="space-y-1.5 max-w-full md:max-w-md">
                          <div className="flex flex-wrap gap-1.5 items-center">
                            {sop.status === 'draft' ? (
                              <>
                                <span className="px-2 py-0.5 rounded text-[10px] font-black text-amber-700 bg-amber-50 border border-amber-200 flex items-center gap-1 shrink-0">
                                  <Clock className="w-3 h-3 text-amber-655 text-amber-600 animate-spin" style={{ animationDuration: '3s' }} />
                                  待发布
                                </span>
                                {sop.targetType === 'all' ? (
                                  <span className="px-2 py-0.5 rounded text-[10px] font-medium text-slate-500 bg-slate-50 border border-slate-200">
                                    预设: 全员下发
                                  </span>
                                ) : (
                                  <span className="px-2 py-0.5 rounded text-[10px] font-medium text-slate-500 bg-slate-50 border border-slate-200">
                                    预设: 指定员工 ({sop.targetEmployeeIds?.length || 0}人)
                                  </span>
                                )}
                              </>
                            ) : (
                              sop.targetType === 'all' ? (
                                <span className="px-1.5 py-0.5 rounded text-[10px] font-semibold text-emerald-700 bg-emerald-50 border border-emerald-100 flex items-center gap-1">
                                  <Users className="w-3 h-3" />
                                  全员下发
                                </span>
                              ) : (
                                <span className="px-1.5 py-0.5 rounded text-[10px] font-semibold text-blue-700 bg-blue-50 border border-blue-100 flex items-center gap-1">
                                  <UserCheck className="w-3 h-3" />
                                  个别员工 ({sop.targetEmployeeIds?.length}人)
                                </span>
                              )
                            )}
                             <span className={`px-1.5 py-0.5 rounded text-[10px] font-extrabold ${
                                (sop.docType || 'training') === 'notification'
                                  ? 'bg-amber-100 text-amber-800 border border-amber-200'
                                  : 'bg-indigo-100 text-indigo-800 border border-indigo-250 border-indigo-200'
                              }`}>
                               {(sop.docType || 'training') === 'notification' ? '通知公告' : '培训文档'}
                             </span>
                            <span className="text-[10px] font-mono text-slate-400">{sop.createdAt}</span>
                          </div>

                          <h3 className="font-bold text-slate-800 text-sm max-w-full line-clamp-1">{sop.title}</h3>
                          
                          <div className="flex flex-wrap items-center gap-3 text-xs text-slate-400 font-mono">
                            <span>发布: {sop.creator}</span>
                            {sop.attachments.length > 0 && (
                              <span className="flex items-center gap-0.5 text-orange-500">
                                <Paperclip className="w-3 h-3" />
                                {sop.attachments.length} 份文件
                              </span>
                            )}
                            {sop.images.length > 0 && (
                              <span className="flex items-center gap-0.5 text-indigo-500">
                                <ImageIcon className="w-3 h-3" />
                                {sop.images.length} 张嵌入图
                              </span>
                            )}
                          </div>
                        </div>

                        {/* Read Ratio Statistics Ring / Bar */}
                        <div className="flex items-center gap-4 flex-shrink-0 self-stretch md:self-auto justify-between md:justify-end border-t md:border-t-0 border-slate-100 pt-3 md:pt-0 mt-2 md:mt-0">
                          <div className="text-left md:text-right">
                            <p className="text-[10px] text-slate-400 font-semibold uppercase tracking-wider">确认签收进度</p>
                            {sop.status === 'draft' ? (
                              <div className="mt-1">
                                <span className="text-[10px] font-bold text-amber-600 bg-amber-50 border border-amber-200 rounded px-1.5 py-0.5">
                                  ⏳ 等待发布下发
                                </span>
                              </div>
                            ) : (
                              <>
                                <div className="flex items-center gap-1.5 mt-0.5">
                                  <div className="w-24 bg-slate-100 h-2 rounded-full overflow-hidden">
                                    <div 
                                      className="bg-brand-500 h-full rounded-full" 
                                      style={{ width: `${ratio}%` }} 
                                    />
                                  </div>
                                  <span className="text-xs font-bold font-mono text-slate-700">{ratio.toFixed(0)}%</span>
                                </div>
                                <span className="text-[10px] text-slate-450 text-slate-400 block mt-0.5">
                                  已确认 {confirmedCount} / {totalEligible} 人
                                </span>
                              </>
                            )}
                          </div>

                          {sop.status === 'draft' && (
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                handleOpenPublishSop(sop);
                              }}
                              className="px-2.5 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold rounded-lg text-xs transition shadow-sm hover:shadow flex items-center gap-1 cursor-pointer mr-1 shrink-0"
                              title="在全员或员工中发布下发此菜谱"
                            >
                              <Send className="w-3 h-3 shrink-0" />
                              <span>发布</span>
                            </button>
                          )}

                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              handleExportSopPdf(sop);
                            }}
                            className="p-1.5 hover:bg-teal-50 text-teal-600 hover:text-teal-850 rounded-lg transition mr-1"
                            title="导出此规范为PDF格式实体文件"
                          >
                            <Download className="w-4 h-4" />
                          </button>

                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              handleOpenEditSop(sop);
                            }}
                            className="p-1.5 hover:bg-slate-100 text-slate-400 hover:text-indigo-650 rounded-lg transition mr-1"
                            title="修改并重新下发此SOP"
                          >
                            <Edit className="w-4 h-4 text-indigo-500" />
                          </button>

                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              handleDeleteSop(sop.id, sop.title);
                            }}
                            className="p-1.5 hover:bg-red-50 text-slate-400 hover:text-red-500 rounded-lg transition"
                            title="删除并召回作业规范"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>

                      </div>
                    );
                  })
                )}
              </div>
            )}

          </div>

          {/* Column B: Right sidebar displaying Selected SOP Receipt Logs details */}
          {selectedSopForDetails && (
            <div className="space-y-4">
              <div className="bg-white rounded-xl shadow-sm border border-slate-100 overflow-hidden flex flex-col">
                <div className="p-4 bg-slate-50 border-b border-slate-100 flex justify-between items-center">
                  <div>
                    <h3 className="font-bold text-slate-800 text-sm">SOP 指导学习反馈追踪</h3>
                    <p className="text-xs text-slate-400 mt-0.5">{selectedSopForDetails.title}</p>
                  </div>
                  <button 
                    onClick={() => setSelectedSopForDetails(null)}
                    className="p-1.5 hover:bg-slate-200/60 text-slate-400 hover:text-slate-600 rounded-lg transition"
                    title="收起详情"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>

                <div className="p-4 space-y-4">
                  {/* General targets */}
                  <div>
                    <h4 className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-2 flex items-center justify-between">
                      <span>已阅读签收公示栏</span>
                      <span className="text-brand-600 font-mono">
                        {
                          employees.filter(emp => {
                            const isEligible = selectedSopForDetails.targetType === 'all' || selectedSopForDetails.targetEmployeeIds?.includes(emp.id);
                            const wasRead = selectedSopForDetails.reads && selectedSopForDetails.reads[emp.id];
                            return isEligible && wasRead;
                          }).length
                        } 人已签
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
                                  <Check className="w-2.5 h-2.5" /> 已签字
                                </span>
                                <span className="text-[8px] text-slate-400 block mt-0.5 font-mono">{readTime}</span>
                              </div>
                            ) : (
                              <div>
                                <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 bg-slice-50 text-amber-700 bg-amber-50 rounded text-[9px] border border-amber-100 font-bold">
                                  <Clock className="w-2.5 h-2.5 text-amber-500 animate-spin" /> 待签收
                                </span>
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </div>

                  <div className="p-3.5 bg-amber-50 text-amber-950 rounded-lg border border-amber-100 text-xs leading-relaxed space-y-1.5">
                    <p className="font-bold flex items-center gap-1.5 text-amber-800">
                      <AlertTriangle className="w-3.5 h-3.5" />
                      对漏签人员的安检提示
                    </p>
                    <p className="text-[11px] text-slate-600">
                      本批次指导规范包含重要劳护与卸货机械安全指令。对于上图标红/待签收的生产人员，请班组长在每天上工、交接班前现场宣导完毕，并指导其打开手机登录客户端签字。
                    </p>
                  </div>
                </div>
              </div>
            </div>
          )}

        </div>
      </div>
    ))}

      {/* RENDER VIEW 2: PORTABLE WORKER APP SIMULATOR */}
      {activeMode === 'simulator' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          
          {/* Simulation Settings and Instruction panel */}
          <div className="lg:col-span-4 bg-white rounded-xl shadow-sm border border-slate-100 p-5 space-y-4">
            <div>
              <h3 className="font-bold text-slate-800 text-sm flex items-center gap-1.5">
                <Sparkles className="w-4 h-4 text-brand-500" />
                手机端模拟说明
              </h3>
              <p className="text-xs text-slate-500 mt-1 leading-relaxed">
                这是本系统的<b>“仓储助理”APP原生轻量版模拟器</b>。通过该端，您的卡车理货员、高架叉车工能够在工作终端或个人触屏上直接看新发布的文件，并点击电子承兑签名反馈。
              </p>
            </div>

            <div className="border-t border-slate-100 pt-4 space-y-3">
              <label className="block text-xs font-bold text-slate-600">
                👤 选择切换登录模拟的员工账号:
              </label>
              
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
                        <span className="bg-red-500 text-white font-bold px-1.5 py-0.5 rounded-full text-[9px] font-mono shadow-sm">
                          {unreadCount} 篇未读
                        </span>
                      ) : (
                        <span className="text-[9px] text-emerald-600 font-semibold flex items-center gap-0.5">
                          ✓ 全部已签
                        </span>
                      )}
                    </button>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Smartphone Simulator Mock Frame */}
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
                      <h4 className="text-xs font-bold text-slate-800">WMS移动规章助手</h4>
                      <p className="text-[8px] text-slate-400">当前：{currentSimEmp.name} (ID: #{currentSimEmp.id})</p>
                    </div>
                  </div>

                  <span className="px-2 py-0.5 rounded bg-orange-55 text-orange-600 bg-orange-50 font-semibold font-mono text-[9px]">
                    缅/泰双语版
                  </span>
                </div>

                {/* Sub App Content Scroll view */}
                <div className="flex-1 overflow-y-auto p-3.5 space-y-3.5 flex flex-col">
                  
                  {/* Personal Stat Card banner */}
                  <div className="bg-gradient-to-r from-slate-800 to-indigo-950 p-3 rounded-2xl text-white space-y-1 shadow-sm">
                    <div className="flex justify-between items-center">
                      <span className="text-[8px] font-bold tracking-wider text-slate-400 uppercase">
                        SOP LEARNING CENTER
                      </span>
                      <span className="text-[8px] bg-slate-700/60 font-semibold px-2 py-0.5 rounded-full text-indigo-300">
                        双向签名合规
                      </span>
                    </div>
                    <p className="text-xs font-semibold">
                      您好，{currentSimEmp.name}！
                    </p>
                    <p className="text-[9px] text-slate-300">
                      请复核以下下发至您的新操作标准文档并签章确认。
                    </p>
                  </div>

                  {/* Horizontal Lists of active documents for this employee */}
                  <div className="space-y-1.5">
                    <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wider block px-1">
                      📄 我的专属指导规范清单 ({employeeVisibleSops.length})
                    </span>

                    {employeeVisibleSops.length === 0 ? (
                      <div className="bg-white rounded-xl p-6 text-center border border-slate-100 text-slate-400">
                        <CheckCircle className="w-8 h-8 text-emerald-200 mx-auto mb-1" />
                        <p className="text-[10px] font-bold text-emerald-800">恭喜！已完成所有学习</p>
                        <p className="text-[9px] text-slate-400 mt-0.5">管理员暂无发布针对您的未读说明</p>
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
                                <p className="text-[8px] text-slate-400 mt-0.5 font-mono">
                                  下发时间: {sop.createdAt}
                                </p>
                              </div>

                              <div>
                                {isRead ? (
                                  <span className="px-1.5 py-0.5 rounded bg-emerald-50 text-emerald-600 border border-emerald-100 text-[8px] font-bold">
                                    ✓ 已签章
                                  </span>
                                ) : (
                                  <span className="px-1.5 py-0.5 rounded bg-amber-50 text-amber-600 border border-emerald-100 text-[8px] font-bold animate-pulse">
                                    待签
                                  </span>
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
                        <span className="text-[8px] font-extrabold text-[#6366f1] bg-indigo-50 border border-indigo-100 px-1.5 py-0.5 rounded tracking-wider font-mono">
                          正在学习
                        </span>
                        <h5 className="text-xs font-black mt-1.5 text-slate-800">
                          {currentSelectedSimSop.title}
                        </h5>
                        <div className="text-[8.5px] text-slate-400 mt-1 font-mono flex flex-wrap gap-x-2">
                          <span>发布者: {currentSelectedSimSop.creator}</span>
                          <span>时间: {currentSelectedSimSop.createdAt}</span>
                        </div>
                      </div>

                      {/* Content with HTML render */}
                      <div 
                        className="text-[10.5px] leading-relaxed text-slate-900 space-y-2 font-sans sop-content"
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
                          <p className="text-[8.5px] font-extrabold text-slate-400 uppercase tracking-widest font-mono">
                            相关电子文档下载 (Simulated):
                          </p>
                          <div className="space-y-1">
                            {currentSelectedSimSop.attachments.map((file, idx) => (
                              <button
                                key={idx}
                                onClick={() => addToast(`正在下载文档：${file.name} (大小: ${file.size})...`)}
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
                              <span className="text-[10px] font-extrabold text-emerald-900 block">我已于手机端签署承认</span>
                              <span className="text-[8px] text-slate-400 font-mono">
                                签收时间: {currentSelectedSimSop.reads[simulatedEmployeeId]}
                              </span>
                            </div>
                          </div>
                        ) : (
                          <div className="space-y-2">
                            <div className="p-2 bg-amber-50 rounded-lg border border-amber-100 text-[8.5px] text-amber-800 leading-normal">
                              <b>提醒：</b>请重点阅读以上安全/作业要领，确认无误后点击下方按钮签字。签字即代表已学习、已领会并承诺服从指挥。
                            </div>
                            <button
                              type="button"
                              onClick={() => handleMarkAsReadInSimulator(currentSelectedSimSop.id)}
                              className="w-full py-2.5 bg-gradient-to-r from-indigo-600 to-indigo-700 hover:from-indigo-700 hover:to-indigo-800 text-white rounded-xl text-[10px] font-bold flex items-center justify-center gap-1 shadow-md transition transform active:scale-95 duration-101"
                            >
                              <Send className="w-3.5 h-3.5 text-indigo-100" />
                              <span>签字签收并服从安全指令</span>
                            </button>
                          </div>
                        )}
                      </div>
                    </div>
                  ) : (
                    <div className="bg-white rounded-2xl p-8 border border-slate-100 text-center text-slate-400">
                      <BookOpen className="w-10 h-10 text-slate-200 mx-auto mb-2" />
                      <p className="text-[10px] font-bold">请选择一篇要学习的指导规程</p>
                    </div>
                  )}

                </div> {/* End of Sub App Content Scroll view */}

                {/* Bottom Indicator */}
                <div className="h-4 flex items-center justify-center bg-[#f6f8fa] pb-1.5 shrink-0">
                  <div className="w-16 h-1 bg-slate-305 bg-slate-300 rounded-full"></div>
                </div>

              </div> {/* End of In App View layout */}

            </div> {/* End of Phone wrapper */}
          </div> {/* End of Mock Frame outer column */}

        </div> /* End of grid grid-cols-1 lg:grid-cols-12 */
      )} {/* End of activeMode === 'simulator' */}

      {/* Recipe Preview Modal */}
      <AnimatePresence>
        {previewSop && (
          <div className="fixed inset-0 bg-slate-950/85 backdrop-blur-xs z-[100] flex items-center justify-center p-2 sm:p-4">
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 15 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 15 }}
              transition={{ duration: 0.2, ease: "easeOut" }}
              className="bg-[#525659] rounded-2xl max-w-5xl w-full h-[90vh] flex flex-col shadow-2xl overflow-hidden border border-zinc-700"
            >
              {/* PDF Viewer Styled Header */}
              <div className="bg-[#323639] text-white px-4 py-3 flex items-center justify-between text-xs font-sans shrink-0 border-b border-zinc-800 shadow-sm">
                {/* Left side: PDF title & page count */}
                <div className="flex items-center gap-3">
                  <span className="p-1.5 bg-rose-500/10 text-rose-400 rounded">
                    <FileText className="w-4 h-4" />
                  </span>
                  <div className="max-w-[150px] sm:max-w-xs truncate">
                    <span className="font-extrabold block text-slate-100">{previewSop.title}_菜谱工艺标准作业书.pdf</span>
                    <span className="text-[10px] text-slate-400 font-medium">文件大小: 124 KB • 1 / 1 页</span>
                  </div>
                </div>

                {/* Middle side: Zoom controls */}
                <div className="hidden md:flex items-center gap-3 bg-zinc-800 px-3 py-1.5 rounded-lg border border-zinc-700/60 shadow-inner">
                  <button 
                    onClick={() => setPdfZoomPercent(prev => Math.max(50, prev - 10))}
                    className="p-1 hover:bg-zinc-700 text-zinc-300 hover:text-white rounded transition cursor-pointer"
                    title="缩小"
                  >
                    <ZoomOut className="w-3.5 h-3.5" />
                  </button>
                  <span className="text-[11px] font-mono select-none text-zinc-300 font-bold min-w-[36px] text-center">{pdfZoomPercent}%</span>
                  <button 
                    onClick={() => setPdfZoomPercent(prev => Math.min(150, prev + 10))}
                    className="p-1 hover:bg-zinc-700 text-zinc-300 hover:text-white rounded transition cursor-pointer"
                    title="放大"
                  >
                    <ZoomIn className="w-3.5 h-3.5" />
                  </button>
                  <div className="w-px h-3 bg-zinc-700 mx-1"></div>
                  <button 
                    onClick={() => setPdfZoomPercent(100)}
                    className="p-1 hover:bg-zinc-700 text-zinc-400 hover:text-white rounded text-[10px] font-bold transition cursor-pointer"
                    title="重置缩放"
                  >
                    适合宽度
                  </button>
                </div>

                {/* Right side: Action icons and close */}
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => handleExportSopPdf(previewSop)}
                    className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-lg text-xs transition flex items-center gap-1.5 cursor-pointer shadow-sm"
                    title="直接打印 / 另存为 PDF"
                  >
                    <Printer className="w-3.5 h-3.5" />
                    <span className="hidden sm:inline">打印 / 另存</span>
                  </button>
                  <button 
                    onClick={() => setPreviewSop(null)}
                    className="p-2 hover:bg-zinc-800 text-zinc-400 hover:text-white rounded-lg transition cursor-pointer"
                    title="关闭 PDF 预览"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              </div>

              {/* Scrollable PDF Canvas */}
              <div className="flex-1 overflow-auto bg-[#525659] p-4 sm:p-8 flex justify-center items-start">
                <motion.div 
                  layout
                  className="shadow-2xl rounded-sm overflow-hidden bg-[#FAF9F6] border border-zinc-300 transition-all duration-150"
                  style={{ width: `${pdfZoomPercent}%`, maxWidth: '52rem' }}
                >
                  <RecipeDocumentView sop={previewSop} />
                </motion.div>
              </div>

              {/* PDF Reader Mock Footer */}
              <div className="bg-[#323639] text-zinc-400 px-4 py-2 flex items-center justify-between text-[10px] font-semibold tracking-wider font-sans shrink-0 border-t border-zinc-800 select-none">
                <span>⚡ 后勤保障餐饮部 WMS SMART PDF VIEWER</span>
                <span>页面渲染: 100% 矢量精准矢量保真</span>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Hidden container specifically for high-quality single-purpose printable vector PDF document cloning */}
      {previewSop && (
        <div id="print-container-root">
          <RecipeDocumentView sop={previewSop} id="printable-sop-document" />
        </div>
      )}

      {/* Recipe Publish Configuration Modal (Publish/Apportion targets wizard) */}
      <AnimatePresence>
        {publishingSop && (
          <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs z-[100] flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 15 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 15 }}
              transition={{ duration: 0.2, ease: "easeOut" }}
              className="bg-white rounded-2xl max-w-lg w-full max-h-[85vh] flex flex-col shadow-2xl overflow-hidden border border-slate-200"
            >
              {/* Modal Header */}
              <div className="p-4 bg-slate-50 border-b border-slate-100 flex justify-between items-center shrink-0">
                <div className="flex items-center gap-2">
                  <span className="p-1.5 bg-indigo-50 text-indigo-600 rounded-lg">
                    <Send className="w-5 h-5 text-indigo-500 animate-pulse" />
                  </span>
                  <div>
                    <h3 className="font-extrabold text-slate-800 text-sm md:text-base">下发与发布配置</h3>
                    <p className="text-[11px] text-slate-400 font-medium">配置由谁签收并执行 【{publishingSop.title}】</p>
                  </div>
                </div>
                <button 
                  onClick={() => setPublishingSop(null)}
                  className="p-1.5 hover:bg-slate-200/60 text-slate-400 hover:text-slate-600 rounded-lg transition"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Modal body (Scrollable choices) */}
              <div className="p-5 overflow-y-auto bg-slate-50/50 flex-1 space-y-4">
                {/* Publish Target Selector */}
                <div className="space-y-2">
                  <label className="text-xs font-bold text-slate-500 block uppercase tracking-wider">发布适用对象</label>
                  <div className="grid grid-cols-2 gap-3">
                    <button
                      type="button"
                      onClick={() => setPublishTargetType('all')}
                      className={`p-3 rounded-xl border-2 transition text-left flex items-start gap-2.5 cursor-pointer ${
                        publishTargetType === 'all'
                          ? 'border-indigo-600 bg-indigo-50/45 text-indigo-950 shadow-xs'
                          : 'border-slate-200 bg-white hover:border-slate-300 text-slate-600'
                      }`}
                    >
                      <Users className={`w-5 h-5 mt-0.5 shrink-0 ${publishTargetType === 'all' ? 'text-indigo-600' : 'text-slate-400'}`} />
                      <div>
                        <span className="text-xs font-black block">全员发布</span>
                        <span className="text-[10px] text-slate-400 block mt-0.5">全体成员可阅读并在移动端签字签收</span>
                      </div>
                    </button>

                    <button
                      type="button"
                      onClick={() => {
                        setPublishTargetType('specific');
                        // Pre-populate with all employees if empty to save time toggling
                        if (publishTargetIds.length === 0) {
                          setPublishTargetIds(employees.slice(0, 3).map(e => e.id));
                        }
                      }}
                      className={`p-3 rounded-xl border-2 transition text-left flex items-start gap-2.5 cursor-pointer ${
                        publishTargetType === 'specific'
                          ? 'border-indigo-600 bg-indigo-50/45 text-indigo-950 shadow-xs'
                          : 'border-slate-200 bg-white hover:border-slate-300 text-slate-600'
                      }`}
                    >
                      <UserCheck className={`w-5 h-5 mt-0.5 shrink-0 ${publishTargetType === 'specific' ? 'text-indigo-600' : 'text-slate-400'}`} />
                      <div>
                        <span className="text-xs font-black block">指定员工发布</span>
                        <span className="text-[10px] text-slate-400 block mt-0.5">指定特定的岗位或部分部门员工签收</span>
                      </div>
                    </button>
                  </div>
                </div>

                {/* Specific Employees Checkboxes Grid */}
                {publishTargetType === 'specific' && (
                  <div className="space-y-2.5 animate-fade-in p-1">
                    <div className="flex justify-between items-center bg-slate-100/70 p-2 rounded-lg">
                      <span className="text-[11px] font-bold text-slate-500">选择接收并签收菜谱的员工 (已选 {publishTargetIds.length} 人)</span>
                      <button
                        type="button"
                        onClick={() => {
                          if (publishTargetIds.length === employees.length) {
                            setPublishTargetIds([]);
                          } else {
                            setPublishTargetIds(employees.map(e => e.id));
                          }
                        }}
                        className="text-[10px] bg-white hover:bg-slate-55 border border-slate-200 text-indigo-605 text-indigo-600 font-bold px-2 py-1 rounded cursor-pointer transition shadow-xs"
                      >
                        {publishTargetIds.length === employees.length ? "取消全选" : "快速全选"}
                      </button>
                    </div>

                    <div className="border border-slate-200 bg-white rounded-xl divide-y divide-slate-100 max-h-[220px] overflow-y-auto shadow-xs">
                      {employees.map(emp => {
                        const isChecked = publishTargetIds.includes(emp.id);
                        return (
                          <div 
                            key={emp.id}
                            onClick={() => {
                              if (isChecked) {
                                setPublishTargetIds(publishTargetIds.filter(id => id !== emp.id));
                              } else {
                                setPublishTargetIds([...publishTargetIds, emp.id]);
                              }
                            }}
                            className="p-2 px-3 flex items-center justify-between hover:bg-slate-50/80 transition cursor-pointer select-none"
                          >
                            <div className="flex items-center gap-2 max-w-[80%]">
                              {emp.photo ? (
                                <img src={emp.photo} alt={emp.name} className="w-6 h-6 rounded-full object-cover shrink-0" referrerPolicy="no-referrer" />
                              ) : (
                                <div className="w-6 h-6 rounded-full bg-slate-100 border border-slate-200 text-[10px] font-black text-slate-600 font-sans flex items-center justify-center shrink-0">
                                  {emp.name.slice(0, 2)}
                                </div>
                              )}
                              <div className="truncate">
                                <span className="text-xs font-black text-slate-700">{emp.name}</span>
                                <span className="mx-1.5 text-slate-350 text-[10px]">|</span>
                                <span className="text-[10px] font-semibold text-slate-500 bg-slate-100 px-1.5 py-0.5 rounded italic">
                                  {emp.dept} - {emp.role}
                                </span>
                              </div>
                            </div>
                            <input
                              type="checkbox"
                              checked={isChecked}
                              onChange={() => {}} // Controlled via parent row click
                              className="w-4 h-4 text-indigo-600 border-slate-300 rounded focus:ring-indigo-500 cursor-pointer pointer-events-none"
                            />
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>

              {/* Modal Footer */}
              <div className="px-5 py-3.5 bg-slate-50 border-t border-slate-100 flex justify-end gap-2.5 shrink-0">
                <button
                  type="button"
                  onClick={() => setPublishingSop(null)}
                  className="px-4 py-2 hover:bg-slate-100 text-slate-500 border border-slate-200 font-bold rounded-xl text-xs transition cursor-pointer"
                >
                  取消
                </button>
                <button
                  type="button"
                  onClick={() => {
                    if (publishTargetType === 'specific' && publishTargetIds.length === 0) {
                      addToast("⚠️ 请至少选择一位待下发的内部员工进行发布配置！");
                      return;
                    }
                    
                    // Update state and save
                    const updatedSops = sops.map(s => {
                      if (s.id === publishingSop.id) {
                        return {
                          ...s,
                          status: 'published' as const,
                          targetType: publishTargetType,
                          targetEmployeeIds: publishTargetType === 'all' ? undefined : publishTargetIds
                        };
                      }
                      return s;
                    });
                    
                    saveSops(updatedSops);
                    addToast(`🎉 【${publishingSop.title}】标准菜谱工艺已成功对外发布下发！`);
                    
                    // Keep detail views updated
                    const m = updatedSops.find(s => s.id === publishingSop.id);
                    if (m && selectedSopForDetails?.id === publishingSop.id) {
                      setSelectedSopForDetails(m);
                    }
                    
                    setPublishingSop(null);
                  }}
                  className="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold rounded-xl text-xs transition shadow-md hover:shadow-lg cursor-pointer flex items-center gap-1"
                >
                  <Check className="w-3.5 h-3.5" />
                  <span>确认全新发布</span>
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Delete SOP / Recipe Confirmation Modal */}
      <AnimatePresence>
        {sopToDelete && (
          <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs z-[110] flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 15 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 15 }}
              transition={{ duration: 0.2, ease: "easeOut" }}
              className="bg-white rounded-2xl max-w-sm w-full p-5 shadow-2xl border border-slate-200 space-y-4"
            >
              <div className="flex items-start gap-3">
                <div className="p-2.5 bg-red-50 text-red-600 rounded-xl shrink-0">
                  <AlertTriangle className="w-5 h-5 animate-pulse" />
                </div>
                <div className="space-y-1">
                  <h3 className="font-extrabold text-slate-800 text-sm md:text-base">
                    {category === 'catering' ? "确定要删除此菜谱配方吗？" : "确定要删除此SOP作业规范吗？"}
                  </h3>
                  <p className="text-[11px] text-slate-500 leading-relaxed font-semibold">
                    您正在执行持久删除操作。删除后该菜谱将被同步回收下线，内部员工在对应终端将同步无法查看或进行签字签收。
                  </p>
                </div>
              </div>

              {/* Document details box */}
              <div className="bg-slate-50 border border-slate-100 rounded-xl p-3.5 space-y-2">
                <div className="flex justify-between text-xs">
                  <span className="text-slate-400 font-semibold">
                    {category === 'catering' ? "菜谱编号：" : "规范编号："}
                  </span>
                  <span className="text-slate-700 font-mono font-bold">
                    {sopToDelete.recipeCode || "N/A"}
                  </span>
                </div>
                <div className="flex justify-between text-xs items-start gap-4">
                  <span className="text-slate-400 font-semibold shrink-0">
                    {category === 'catering' ? "菜品名称：" : "文档标题："}
                  </span>
                  <span className="text-slate-750 font-bold truncate text-right">
                    {sopToDelete.title}
                  </span>
                </div>
                <div className="flex justify-between text-xs">
                  <span className="text-slate-400 font-semibold">发布部门：</span>
                  <span className="text-slate-700 font-semibold">
                    {sopToDelete.creator.replace('后勤餐饮保障部', '餐饮部').replace('后勤环卫科', '环卫科').replace('仓库安全处', '安全处')}
                  </span>
                </div>
              </div>

              {/* Interactive buttons */}
              <div className="flex items-center gap-2 pt-1">
                <button
                  type="button"
                  onClick={() => setSopToDelete(null)}
                  className="flex-1 px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-600 font-bold rounded-xl text-xs transition cursor-pointer text-center"
                >
                  取消
                </button>
                <button
                  type="button"
                  onClick={handleConfirmDelete}
                  className="flex-1 px-4 py-2 bg-red-600 hover:bg-red-700 text-white font-extrabold rounded-xl text-xs transition shadow-sm hover:shadow cursor-pointer text-center"
                >
                  确认删除
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Catering Mobile Preview Modal */}
      <AnimatePresence>
        {showCateringMobilePreview && (
          <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center z-[100] p-4">
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 15 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 15 }}
              transition={{ duration: 0.2, ease: "easeOut" }}
              className="bg-white rounded-3xl shadow-2xl border border-slate-100 max-w-md w-full overflow-hidden flex flex-col relative h-[780px]"
            >
              {/* Modal Header */}
              <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50">
                <div className="flex items-center gap-2">
                  <Smartphone className="w-5 h-5 text-amber-505 text-amber-500 animate-pulse" />
                  <div>
                    <span className="font-extrabold text-slate-800 text-sm block">移动端高仿真呈现效果 (Live Render)</span>
                    <span className="text-[10px] font-bold text-emerald-600 bg-emerald-50 border border-emerald-100 px-1.5 py-0.5 rounded cursor-default inline-block mt-0.5">
                      同步渲染中
                    </span>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setShowCateringMobilePreview(false)}
                  className="p-1.5 hover:bg-slate-200 text-slate-400 hover:text-slate-600 rounded-lg transition cursor-pointer"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Modal Body: contains the simulator screen */}
              <div className="flex-1 bg-slate-100/60 overflow-y-auto flex items-center justify-center p-6">
                
                {/* Phone container */}
                <div className="w-[310px] bg-slate-900 rounded-[44px] p-2.5 shadow-2xl border-4 border-slate-800 h-[630px] flex flex-col justify-between">
                  {/* Notch */}
                  <div className="px-5 pt-1.5 pb-2 flex items-center justify-between text-slate-300 text-[10px] relative">
                    <span className="font-bold select-none font-mono">15:30</span>
                    <div className="w-16 h-3.5 bg-black rounded-b-xl absolute left-1/2 -translate-x-1/2 top-2.5"></div>
                    <div className="flex items-center gap-1">
                      <span className="text-[8px] bg-blue-500/20 px-1 rounded text-blue-400 font-extrabold uppercase">5G FULL</span>
                      <div className="w-4.5 h-2 bg-white/70 rounded-xs"></div>
                    </div>
                  </div>

                  {/* Device Screen wrapper */}
                  <div className="bg-slate-100 flex-1 rounded-[32px] overflow-hidden flex flex-col relative h-full">
                    
                    {/* Screen banner */}
                    <div className="bg-gradient-to-r from-blue-600 to-indigo-600 text-white p-3 pt-4 text-center">
                      <span className="text-[8px] bg-white/20 text-white px-2 py-0.5 rounded-full font-bold">
                        WMS 移动学习终端 v2.10
                      </span>
                      <h4 className="text-xs font-extrabold mt-1 truncate">
                        {formTitle ? formTitle.trim() : "无标题菜谱（起草中）"}
                      </h4>
                      <div className="flex items-center justify-center gap-2 text-[8px] text-blue-100 mt-0.5">
                        <span>下发人: 后勤保障餐饮部</span>
                        <span>·</span>
                        <span>时间: 今天 (刚刚)</span>
                      </div>
                    </div>

                    {/* Smartphone scrolling body */}
                    <div className="p-3 space-y-3.5 overflow-y-auto flex-1 text-[11px] leading-relaxed">

                      {/* Main text box displaying recipe view / details */}
                      <div className="bg-white rounded-xl border border-slate-200 p-3 space-y-2.5 shadow-xs">
                        <span className="text-[8px] font-extrabold text-blue-600 uppercase tracking-widest block font-mono">
                          NOW STUDYING · 菜谱规范
                        </span>

                        {/* Title and general description */}
                        <div className="border-b border-slate-100 pb-2">
                          <h4 className="text-xs font-black text-slate-900">{formTitle || "未命名菜谱"}</h4>
                        </div>

                        {/* Ingredients */}
                        {recipeIngredients.length > 0 && (
                          <div className="space-y-1.5">
                            <p className="text-[8.5px] font-extrabold text-slate-400 uppercase tracking-wider">配料用量清单:</p>
                            <div className="border border-slate-150 border-slate-200 rounded-lg overflow-hidden divide-y divide-slate-100">
                              {recipeIngredients.map((ing, idx) => (
                                <div key={ing.id || idx} className="flex justify-between items-center px-2 py-1 bg-slate-50/50 text-[9px]">
                                  <span className="font-bold text-slate-700">{ing.name} ({ing.category})</span>
                                  <span className="font-mono text-slate-500 font-bold">{ing.weight}</span>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}

                        {/* Equipment */}
                        {recipeEquipment.length > 0 && (
                          <div className="space-y-1.5">
                            <p className="text-[8.5px] font-extrabold text-slate-400 uppercase tracking-wider">工具与设备要求:</p>
                            <div className="border border-slate-200 rounded-lg overflow-hidden divide-y divide-slate-100">
                              {recipeEquipment.map((eq, idx) => (
                                <div key={idx} className="flex justify-between items-center px-2 py-1 bg-slate-50/50 text-[9px]">
                                  <span className="font-bold text-slate-700">{eq.name} ({eq.spec})</span>
                                  <span className="font-mono text-slate-500 font-bold">x{eq.qty}</span>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}

                        {/* Steps */}
                        {recipeSteps.length > 0 && (
                          <div className="space-y-1.5">
                            <p className="text-[8.5px] font-extrabold text-slate-400 uppercase tracking-wider">烹饪制作工序:</p>
                            <div className="space-y-1">
                              {recipeSteps.map((step, idx) => (
                                <div key={idx} className="p-2 bg-slate-50 border border-slate-150 rounded-lg text-[9px] text-slate-700">
                                  <div className="font-extrabold text-[8px] text-indigo-650 text-indigo-600 uppercase mb-0.5">第 {idx + 1} 步</div>
                                  <div className="leading-normal">{step}</div>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}

                        {/* Reminders */}
                        {(recipeReminders.time || recipeReminders.cutStyle || recipeReminders.info) && (
                          <div className="p-2 bg-amber-50 rounded-xl border border-amber-200 text-[9px] text-amber-900 space-y-1">
                            <p className="font-black flex items-center gap-1"><Info className="w-3 h-3 text-amber-500" /> 温馨提示 & 制作要点:</p>
                            {recipeReminders.time && <p className="text-[8.5px] text-amber-800">● <b>制作耗时:</b> {recipeReminders.time}</p>}
                            {recipeReminders.cutStyle && <p className="text-[8.5px] text-amber-800">● <b>切配规格:</b> {recipeReminders.cutStyle}</p>}
                            {recipeReminders.info && <p className="text-[8.5px] text-amber-800">● <b>技术要领:</b> {recipeReminders.info}</p>}
                          </div>
                        )}

                        {/* Standard text content (if any) */}
                        {formContent && (
                          <div className="space-y-1 pt-1.5 border-t border-slate-100">
                            <p className="text-[8.5px] font-extrabold text-slate-400 uppercase tracking-wider">补充说明正文:</p>
                            <div 
                              className="text-[9.5px] text-slate-900 space-y-1 select-text sop-content"
                              dangerouslySetInnerHTML={{ __html: formContent.replace(/\n/g, '<br />') }} 
                            />
                          </div>
                        )}

                        {/* Images */}
                        {tempImages.length > 0 && (
                          <div className="grid grid-cols-1 gap-1.5 pt-1">
                            {tempImages.map((img, idx) => (
                              <div key={idx} className="relative rounded-lg overflow-hidden border border-slate-101 bg-slate-50 h-[110px]">
                                <img src={img} className="w-full h-full object-cover" alt="" referrerPolicy="no-referrer" />
                              </div>
                            ))}
                          </div>
                        )}
                      </div>

                      {/* Signature simulation footer inside phone viewport */}
                      <div className="border-t border-slate-200 pt-3">
                        <button
                          type="button"
                          disabled
                          className="w-full py-2 bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-xl text-[10px] font-extrabold flex items-center justify-center gap-1 opacity-70 cursor-not-allowed shadow-md"
                        >
                          <Send className="w-3 h-3 text-white" />
                          <span>确认签字领会指示</span>
                        </button>
                        <span className="text-[8px] text-slate-400 text-center block mt-1 font-medium font-sans">
                          预览模式下无法进行实机签章
                        </span>
                      </div>

                    </div>

                    {/* Bottom Indicator */}
                    <div className="h-3 flex items-center justify-center bg-slate-100 pb-1">
                      <div className="w-16 h-1 bg-slate-300 rounded-full"></div>
                    </div>

                  </div>
                </div>

              </div>

              {/* Modal Footer */}
              <div className="p-4 bg-slate-50 border-t border-slate-100 flex justify-end">
                <button
                  type="button"
                  onClick={() => setShowCateringMobilePreview(false)}
                  className="px-4 py-2 bg-slate-200 hover:bg-slate-300 text-slate-700 font-bold text-xs rounded-xl transition cursor-pointer"
                >
                  关闭
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

    </div> /* End of outer space-y-6 container of SopManager */
  );
}
