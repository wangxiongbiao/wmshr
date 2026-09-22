/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export type TabId = 'login' | 'dashboard' | 'employees' | 'attendance' | 'payroll' | 'sop' | 'goods' | 'expenses' | 'customers' | 'products' | 'orders' | 'sop_training' | 'sop_catering' | 'employee_app' | 'leave_requests' | 'invoices' | 'express';

export interface GoodsRecord {
  id: string;
  customerName: string;       // 客户名称
  goodsName: string;          // 货物名称规格
  goodsPhoto?: string;        // 货物图片
  goodsPhotos?: string[];     // 多个额外货物图片
  arrivalDate: string;        // 到达日期
  pieces: number;             // 到达件数
  actualPieces?: number;      // 实际签收件数/箱数
  signSlipUrl?: string;       // 签收货物单图片/凭证
  signSlipUrls?: string[];      // 多个签收货物单图片列表
  signSlipName?: string;     // 签收货物单文件名/扫描凭证名称
  receiverId?: number;        // 签收人ID (对应员工)
  receiverName?: string;      // 签收人姓名/手写签署
  entryNo: string;            // 入库单号
  status: 'pending' | 'arrived' | 'completed'; // 状态: 待到达 | 已到货待签收 | 已签收入库
  note?: string;              // 备注
  skus?: { sku: string; qty: number; desc?: string; actualQty?: number; image?: string }[]; // 多个SKU与对应数量的明细列表
  shippingMark?: string;      // 麦头
  shippingMarks?: { mark: string; pieces: number; actualPieces?: number }[]; // 多个麦头与对应箱数/数量的明细列表
}

export type Gender = 'male' | 'female';

export type CountryCode = 'MM' | 'TH' | 'CN' | 'VN' | 'KH';

export type AttendanceType = 'normal' | 'late' | 'early' | 'absent' | 'leave' | 'sick_leave' | 'overtime' | 'manual_adjusted' | 'checked_in' | 'pending' | 'exception';

export type EmployeeStatus = '在职' | '离职' | '休假';

export type CurrencyCode = 'THB' | 'USD' | 'MYR' | 'IDR' | 'CNY' | 'PHP' | 'VND' | 'KRW' | 'JPY' | 'HKD' | 'MOP' | 'SGD' | 'BND' | 'GBP' | 'EUR' | 'EGP' | 'OMR' | 'AED' | 'MMK';

export interface AppConfig {
  startShift: string;
  endShift: string;
  breakStart: string;
  breakEnd: string;
  standardHours: number;
  otHourlyFee: number;
  overtimeMultiplier: number;
  taxRate: number;
  dailyBreakMinutes: number;
  currency: CurrencyCode;
  companyLat?: number;
  companyLng?: number;
  companyAddress?: string;
}

export interface Employee {
  id: number;
  employeeNo?: string;
  name: string;
  nickname?: string;
  gender: Gender;
  warehouseCode?: string;
  country: CountryCode;
  role: string;
  dept: string;
  phone?: string;
  nationality?: string;
  salaryType?: "hourly" | "fixed";
  hourlyRate?: number;
  baseMonthlyWage?: number;
  dailyWage?: number;
  attendanceBonus?: number;
  socialSecurity?: number;
  currency: CurrencyCode;
  joinDate: string;
  status: EmployeeStatus;
  photo: string | null;
  username?: string;
  password?: string;
  sourceType?: '自招' | '劳务派遣';
  dispatchCommissionRate?: number;
  otRuleType?: 'fixed' | 'multiplier';
  otFixedRate?: number;
  otBaseRate?: number;
  otMultiplierWorkday?: number;
  otMultiplierWeekend?: number;
  otMultiplierHoliday?: number;
  mealAllowanceDaily?: number;
  permissions?: string[]; // 员工所拥有的具体后台权限
  bankCardNumber?: string; // 发工资的银行卡号
  bankName?: string; // 银行名称
  idCard?: string; // 身份证号/护照号
  updatedAt?: string;
}

export interface AdminUser {
  id: string;
  accountId?: string;
  ownerUserId?: string;
  authUserId?: string;
  account?: string;
  email: string;
  name: string;
  photo?: string;
  role: string;
  country?: string;
  countryCode?: string;
  currency?: string;
  permissions: string[];
  allowedWarehouses?: string[];
  password?: string;
}

export interface HolidayRecord {
  id?: string;
  date: string;
  name: string;
  country?: string;
}

export interface AttendanceRecord {
  id: string;
  empId: number;
  date: string;
  inTime: string;
  outTime: string;
  type: AttendanceType;
  note: string;
  inLat?: number;
  inLng?: number;
  inDistance?: number;
  inDeviated?: boolean;
  outLat?: number;
  outLng?: number;
  outDistance?: number;
  outDeviated?: boolean;
}

export interface AttendanceDetails {
  raw: number;
  valid: number;
  standard: number;
  ot: number;
}

export interface EmployeeStats {
  valid: number;
  ot: number;
  otPay: number;
  currency: CurrencyCode;
}

export interface PayrollSummary {
  emp: Employee;
  valid: number;
  ot: number;
  basePay: number;
  otPay: number;
  mealAllowance: number;
  gross: number;
  net: number;
  serviceFee?: number;
  workingDays: number;
  otCount: number;
}

export interface SopAttachment {
  name: string;
  url: string;
  size: string;
}

export interface RecipeIngredient {
  id: number;
  name: string;
  category: '主料' | '配料' | '调料';
  weight: string;
}

export interface RecipeEquipment {
  name: string;
  spec: string;
  qty: string;
}

export interface RecipeReminders {
  time?: string;
  cutStyle?: string;
  info?: string;
}

export interface SopDocument {
  id: string;
  title: string;
  content: string;
  images: string[];
  attachments: SopAttachment[];
  targetType: 'all' | 'specific';
  targetEmployeeIds?: number[];
  createdAt: string;
  creator: string;
  status: 'draft' | 'published';
  reads: Record<number, string>; // maps employeeId to readAt ISO string
  category?: 'training' | 'catering';
  docType?: 'notification' | 'training'; // 'notification' or 'training'
  
  // Recipe standard SOP fields
  recipeCode?: string;
  recipeIngredients?: RecipeIngredient[];
  recipeEquipment?: RecipeEquipment[];
  recipeReminders?: RecipeReminders;
  recipeSteps?: string[];
  recipeCompany?: string;
}

export interface ExpenseRecord {
  id: string;
  name: string;             // 费用名称
  type: string;             // 费用类型
  paymentMethod: string;    // 支持方式 / 支付方式
  amount: number;           // 费用金额 (系统自动支持)
  currency?: string;        // 支付货币 (如: CNY, USD, MMK, THB 等)
  receiptUrl?: string;      // 证件/凭证图片主图
  receiptUrls?: string[];   // 多个凭证图片列表
  receiptName?: string;     // 凭证文件名描述
  payerId?: number;         // 支付人员工ID
  payerName?: string;       // 支付人手写/输入名
  paymentTime: string;      // 支付时间
  status: 'pending' | 'approved' | 'rejected' | 'recalled'; // 审批状态: 待审批、已通过、已拒绝、已撤回
  approvedBy?: string;      // 审批人名字
  approvedTime?: string;    // 审批时间
  approvalNote?: string;    // 审批说明/意见文字
  note?: string;            // 申报备注
  targetApproverId?: number;  // 指定审批人ID (可选)
  targetApproverName?: string; // 指定审批人名字 (可选)
  purpose?: 'advance' | 'payout' | 'income';
  salaryDetail?: any; // 费用用途: 'advance' (预支)、'payout' (支出)、'income' (收入)
}

export interface ShopBinding {
  id: string;
  platform: 'TikTok' | 'Shopee';
  shopName: string;
  shopId: string;
  status: 'enabled' | 'disabled';
  authorizedAt: string;
}

export interface CreditLogRecord {
  id: string;
  type: 'recharge' | 'consumption'; // 充值 | 消耗
  amount: number;       // 金额
  balanceAfter: number; // 发生后的可用额度
  createdAt: string;    // 记录时间
  note: string;         // 说明/备注 (e.g., 在线网关充值, 账项核销扣减)
  operator: string;     // 经办人
}

export interface Customer {
  id: string;             // 客户ID
  name: string;           // 客户名称
  contact: string;        // 对接人
  currency: string;      // 结算货币
  availableLimit: number; // 可用额度
  creditLimit: number;    // 信用额度
  billingTemplate: string; // 计费模版
  status: 'enabled' | 'disabled'; // 状态: 启用/禁用
  shops: ShopBinding[];   // 绑定的店铺列表
  creditLogs?: CreditLogRecord[]; // 充值与消耗累计流水
  address?: string;       // 客户地址
  taxNo?: string;         // 税号id
  bankAccount?: string;   // 银行账户
  bankName?: string;      // 开户银行机构
}

export interface Product {
  id: string;             // 商品ID / SKU
  name: string;           // 商品名称
  spec?: string;          // 规格属性
  customerId: string;     // 客户ID
  customerName: string;   // 客户名称
  inventory: number;      // 库存件数 (盘点库存可编辑)
  shelfLocation?: string; // 库位
  note?: string;          // 备注
  imageUrl?: string;      // 货物图片
  lastStocktakeTime?: string; // 最近盘点时间
  lastStocktakeQty?: number;  // 盘点前库存
  length?: number;        // 单件长度 (cm)
  width?: number;         // 单件宽度 (cm)
  height?: number;        // 单件高度 (cm)
  weight?: number;        // 单件重量 (kg)
  volume?: number;        // 单件总体积 (cm³)
}

export interface CustomerOrder {
  id: string;             // 订单ID (系统流水号)
  orderNo: string;        // 客拉取平台订单号
  customerId: string;     // 关联客户ID
  customerName: string;   // 关联客户名称
  platform: 'TikTok' | 'Shopee'; // 平台
  shopName: string;       // 绑定的店铺名称
  shopId: string;         // 店铺ID
  skuId: string;          // 商品SKU
  skuName: string;        // 商品名称规格
  qty: number;            // 订购数量
  price: number;          // 单价
  currency: string;       // 金额货币
  receiverName: string;   // 收件人姓名
  receiverPhone: string;  // 收件人电话
  receiverAddress: string;// 收货地址
  shippingLabelUrl?: string; // 快递面单图片
  status: 'retrieved' | 'pending_print' | 'printed' | 'shipped' | 'anomaly' | 'canceled'; // 拉取/待打单/已打单/已发货/异常/作废
  createdAt: string;      // 订单拉取同步时间
  carrier?: string;       // 物流承运商
  trackingNo?: string;    // 真实快递单号
  reason?: string;        // 异常标记说明/作废说明
}

export interface LeaveRequest {
  id: string;
  empId: number;
  type: string;
  days: number;
  startDate: string;
  endDate: string;
  reason: string;
  status: 'pending' | 'approved' | 'rejected' | 'recalled';
}

export interface InvoiceItem {
  id: string;
  description: string;
  qty: number;
  unitPrice: number;
  amount: number;
}

export interface Invoice {
  id: string;
  invoiceNo: string;
  customerId: string;
  customerName: string;
  amount: number;
  currency: string;
  issueDate: string;
  dueDate: string;
  status: 'draft' | 'pending' | 'paid' | 'overdue' | 'canceled';
  taxRate?: number;
  taxAmount?: number;
  subtotal?: number;
  invoiceType: string;
  pdfUrl?: string;
  note?: string;
  items?: InvoiceItem[];
  copyText?: string;
  // Custom Seller Information
  sellerName?: string;
  sellerTaxNo?: string;
  sellerBankName?: string;
  sellerBankAccount?: string;
  sellerAddress?: string;
  sellerPhone?: string;
  sellerContact?: string;
  sellerLogo?: string;
  // Custom Buyer Information
  buyerTaxNo?: string;
  buyerBankName?: string;
  buyerBankAccount?: string;
  buyerAddress?: string;
  buyerPhone?: string;
  buyerContact?: string;
  buyerLogo?: string;
  sellerSignature?: string;
  sellerStamp?: string;
  sigX?: number;
  sigY?: number;
  stampX?: number;
  stampY?: number;
}

