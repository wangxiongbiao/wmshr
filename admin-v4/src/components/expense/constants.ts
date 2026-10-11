import { ReceiptPreset, CurrencyItem, ApprovalFlowConfig, ExpenseRecord } from "./types";

export const RECEIPT_PRESETS: ReceiptPreset[] = [
  { name: "仓储物流发票凭证", url: "https://images.unsplash.com/photo-1554415707-6e8cfc93fe23?w=500&auto=format&fit=crop&q=60" },
  { name: "设备维修清算收据", url: "https://images.unsplash.com/photo-1554224155-8d04cb21cd6c?w=500&auto=format&fit=crop&q=60" },
  { name: "企业公积服务明细", url: "https://images.unsplash.com/photo-1454165804606-c3d57bc86b40?w=500&auto=format&fit=crop&q=60" },
  { name: "日常办公耗材账单", url: "https://images.unsplash.com/photo-1506784983877-45594efa4cbe?w=500&auto=format&fit=crop&q=60" }
];

export const CURRENCIES: CurrencyItem[] = [
  { code: "CNY", symbol: "￥", rate: 1.0, label: "人民币 (CNY)" },
  { code: "USD", symbol: "$", rate: 7.24, label: "美元 (USD)" },
  { code: "THB", symbol: "฿", rate: 0.20, label: "泰铢 (THB)" },
  { code: "PHP", symbol: "₱", rate: 0.13, label: "菲律宾比索 (PHP)" },
  { code: "VND", symbol: "₫", rate: 0.00029, label: "越南盾 (VND)" },
  { code: "IDR", symbol: "Rp", rate: 0.00045, label: "印尼盾 (IDR)" },
  { code: "MYR", symbol: "RM", rate: 1.62, label: "马来西亚林吉特 (MYR)" },
  { code: "MMK", symbol: "K", rate: 0.0034, label: "缅元 (MMK)" },
  { code: "EUR", symbol: "€", rate: 7.82, label: "欧元 (EUR)" }
];

export const DEFAULT_CATEGORIES: string[] = [
  "固定月薪", "计时工时", "固定日薪", "场地租金", "水电动力费", "设备维护费", "物耗杂费", "办公差旅", "行政耗杂", "其他物流开支"
];

export const METHODS: string[] = [
  "银行转账", "微信支付", "支付宝", "现金", "企业信用卡", "支票", "公对公网银"
];

export const DEFAULT_APPROVAL_FLOW_CONFIG: ApprovalFlowConfig = {
  payout: {
    enabled: true,
    steps: ["提交申请", "部门主管审批", "财务专员审核", "完成"]
  },
  income: {
    enabled: false,
    steps: ["录入账目", "财务对账", "出纳确认"]
  }
};

export const INITIAL_EXPENSES: ExpenseRecord[] = [
  {
    id: "wms1101",
    name: "2026年6月份仓库集中场地租金",
    type: "场地租金",
    paymentMethod: "银行转账",
    amount: 15500,
    receiptUrl: RECEIPT_PRESETS[0].url,
    receiptName: "2026-06_仓库场地租金发票.png",
    payerId: 1,
    payerName: "张领班",
    paymentTime: "2026-06-01",
    status: "approved",
    approvedBy: "吴总经理",
    approvedTime: "2026-06-02 10:15",
    approvalNote: "财务审核已对账，款项确认无误，予以准入报销。",
    note: "本季度第2个月租金，包含A/B区全部租赁面积和基础物业管理费。",
    purpose: "payout"
  },
  {
    id: "wms1102",
    name: "临时备用金与叉车燃油/电池应急调度采购预支款",
    type: "水电动力费",
    paymentMethod: "微信支付",
    amount: 3240,
    receiptUrl: RECEIPT_PRESETS[1].url,
    receiptName: "WMS_5月库电水缴费清单.png",
    payerId: 5,
    payerName: "Phyo Lin Aung",
    paymentTime: "2026-06-04",
    status: "pending",
    note: "伴随夏季高温，库房紧急预支周转应急资金，用于后备电池及叉车油脂临时保障性采办。",
    purpose: "advance"
  },
  {
    id: "wms1103",
    name: "C区高位电动堆垛车液压油常规养护配件款",
    type: "设备维护费",
    paymentMethod: "支付宝",
    amount: 1200,
    receiptUrl: RECEIPT_PRESETS[2].url,
    receiptName: "液压液及润滑脂代购收支凭证.png",
    payerId: 6,
    payerName: "Zin Min Htet",
    paymentTime: "2026-05-28",
    status: "approved",
    approvedBy: "仓库管理员 · HR",
    approvedTime: "2026-05-29 16:40",
    approvalNote: "叉车班报备项，属于正常月度设备折旧保养性耗费，批准核销。",
    note: "购买了原装3号重载特质齿轮导轨防蚀油脂两桶，以及液压管路配套喉箍4枚。",
    purpose: "payout"
  },
  {
    id: "wms1104",
    name: "办公室打印纸、碳粉硒鼓及日常包装标签贴纸采购",
    type: "物耗杂费",
    paymentMethod: "企业信用卡",
    amount: 680,
    receiptUrl: RECEIPT_PRESETS[3].url,
    receiptName: "泰邦文具耗材收银总明细.jpg",
    payerId: 8,
    payerName: "Aang Myint Than",
    paymentTime: "2026-06-02",
    status: "rejected",
    approvedBy: "仓库管理员 (财务岗)",
    approvedTime: "2026-06-03 11:20",
    approvalNote: "包装区使用的封箱胶带与静电气泡塑料，应当走'大宗物资统一采办流程'，不应由个人小额代垫报销，故驳回，请转交总采购专员核办。",
    note: "包含A4打印纸 2箱，包装区域所缺的手撕急件彩色标贴共 30卷。",
    purpose: "payout"
  }
];

export const formatExpenseAmount = (amount: number, currencyCode?: string): string => {
  const code = currencyCode || "CNY";
  const found = CURRENCIES.find(c => c.code === code);
  const symbol = found ? found.symbol : "￥";
  return `${symbol}${amount.toLocaleString()}`;
};

export const generateUniqueWmsId = (existingExpenses: ExpenseRecord[]): string => {
  let attempts = 0;
  while (attempts < 100) {
    const id = `wms${Math.floor(1000 + Math.random() * 9000)}`;
    if (!existingExpenses.some(e => e.id === id)) {
      return id;
    }
    attempts++;
  }
  return `wms${Date.now().toString().slice(-4)}`;
};
