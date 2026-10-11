/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useRef } from "react";
import { X, Upload, Trash2, Shield, Key, Lock, Info, UserMinus, Loader2, AlertCircle, History, Sparkles, ArrowRight, Calendar, FileText, CheckCircle2 } from "lucide-react";
import { AppConfig, Employee, AttendanceRecord, CurrencyCode, CountryCode, Gender, EmployeeStatus } from "../../../types";
import { cn, formatDate, getNowDateStr, getCurrencyForCountry, normalizeSalaryValue } from "../../../lib/utils";
import { getTranslation, Language } from "../../../lib/i18n";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "../../ui/dialog";
import { Button } from "../../ui/button";
import { Input } from "../../ui/input";
import { Label } from "../../ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "../../ui/select";
import { DatePicker } from "../../ui/date-picker";
import { SalaryChangeConfirmModal, SalaryDiffItem } from "./SalaryChangeConfirmModal";
import type { EmployeeModalProps } from "../types";

interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  children: React.ReactNode;
  title: string;
  className?: string;
  footer?: React.ReactNode;
  headerClassName?: string;
  titleClassName?: string;
  closeButtonClassName?: string;
}

function Modal({ 
  isOpen, 
  onClose, 
  children, 
  title, 
  className, 
  footer,
  headerClassName,
  titleClassName,
}: ModalProps) {
  return (
    <Dialog open={isOpen} onOpenChange={(open) => { if (!open) onClose(); }}>
      <DialogContent className={cn("max-w-2xl max-h-[90vh] p-0 flex flex-col gap-0 overflow-hidden sm:rounded-2xl", className)}>
        <DialogHeader className={cn("bg-slate-50 px-6 py-4 border-b border-slate-100 flex flex-row items-center justify-between space-y-0", headerClassName)}>
          <DialogTitle className={cn("text-lg font-bold text-slate-800 pr-8", titleClassName)}>{title}</DialogTitle>
        </DialogHeader>
        <div className="overflow-y-auto p-6 flex-1">
          {children}
        </div>
        {footer && (
          <DialogFooter className="px-6 py-3.5 border-t border-slate-100 bg-slate-50 flex flex-row justify-end gap-3 flex-shrink-0">
            {footer}
          </DialogFooter>
        )}
      </DialogContent>
    </Dialog>
  );
}

const ROLE_PRESETS = {
  "管理员": ["*"],
  "考勤专员": ["dashboard_view", "employees_view", "attendance_view", "attendance_edit", "leave_view", "leave_approve"],
  "仓储主管": ["dashboard_view", "customers_view", "goods_view", "goods_edit", "products_view", "products_edit", "orders_view", "orders_edit"],
  "财务出纳": ["dashboard_view", "payroll_view", "payroll_pay", "expenses_view", "expenses_approve", "customers_view", "customers_recharge"],
  "普通员工": ["dashboard_view", "sop_view"]
};

// 预设角色考勤打卡默认规则：默认所有角色都需要考勤打卡
const DEFAULT_ROLE_ATTENDANCE: Record<string, boolean> = {
  "管理员": true,
  "考勤专员": true,
  "仓储主管": true,
  "财务出纳": true,
  "普通员工": true
};

// 员工 APP 登录账号生成规则：仓库所属国家缩写（如 MY、TH 等）+ 4位数字
const getWarehouseCountryPrefix = (warehouseCode?: string) => {
  const code = (warehouseCode || "TH").trim().toUpperCase();
  const match = code.match(/^[A-Z]{2}/);
  return match ? match[0] : "TH";
};

const generateAppAccount = (warehouseCode?: string) => {
  const prefix = getWarehouseCountryPrefix(warehouseCode);
  return `${prefix}${Math.floor(1000 + Math.random() * 9000)}`;
};

const ALL_PERMISSIONS = [
  {
    category: "数据看板",
    items: [
      { id: "dashboard_view", label: "数据看板查看", desc: "查看看板整体经营与出勤统计" }
    ]
  },
  {
    category: "员工花名册",
    items: [
      { id: "employees_view", label: "查看员工列表", desc: "查看花名册、手机账号及角色" },
      { id: "employees_edit", label: "新增/编辑员工", desc: "新增员工及修改基本用工与薪资设置" },
      { id: "employees_delete", label: "删除员工档案", desc: "彻底删除员工所有系统档案与考勤" },
      { id: "employees_reset_pwd", label: "重置APP密码", desc: "一键重置或修改协同APP的安全密码" }
    ]
  },
  {
    category: "考勤与请假",
    items: [
      { id: "attendance_view", label: "查看考勤记录", desc: "查看员工打卡时间、GPS距离、申诉状态" },
      { id: "attendance_edit", label: "考勤补卡与补录", desc: "手工修改、重新考勤或录入漏打卡信息" },
      { id: "leave_view", label: "查看请假列表", desc: "查看所有请假日志、请假理由与休假总计" },
      { id: "leave_approve", label: "审批请假单", desc: "同意、驳回请假请求" }
    ]
  },
  {
    category: "财务与薪资",
    items: [
      { id: "payroll_view", label: "查看薪资计算", desc: "查看自动月度核算账单与薪酬明细" },
      { id: "payroll_pay", label: "锁定/发放薪资", desc: "进行最终确认，防止记录再次被重新计算" },
      { id: "expenses_view", label: "查看费用报表", desc: "查看垫付、充值与消费历史流水" },
      { id: "expenses_approve", label: "审批费用垫付", desc: "审批驳回员工发起的日常报销与款项" },
      { id: "expenses_edit", label: "新建费用支出", desc: "直接手工补录公司运营支出与临时款" }
    ]
  },
  {
    category: "跨境商户",
    items: [
      { id: "customers_view", label: "查看商户列表", desc: "查看签约商户、绑定店铺及授信流向" },
      { id: "customers_edit", label: "新增与维护商户", desc: "编辑商户签约详情，添加绑定的TikTok/Shopee店铺" },
      { id: "customers_recharge", label: "商户信用充值", desc: "为商户手动充值，录入线下打款并增加可用余额" }
    ]
  },
  {
    category: "海外仓储",
    items: [
      { id: "goods_view", label: "查看入库列表", desc: "查看商户到货单、商品规格及麦头标签" },
      { id: "goods_edit", label: "新建/签收入库", desc: "新增到货，修改签收并手写签署电子签名完成入库" },
      { id: "products_view", label: "查看商品列表", desc: "查看库存SKU、库存数、货位分布、长宽高" },
      { id: "products_edit", label: "商品盘点与编辑", desc: "更新货位，随时实盘盘点实物库存并保存" },
      { id: "orders_view", label: "查看订单列表", desc: "查看电商平台拉取的物流面单与分拨发货单" },
      { id: "orders_edit", label: "同步/打单/发货", desc: "一键同步平台单、批量生成快递面单并标记出货" }
    ]
  },
  {
    category: "培训与菜谱 (SOP)",
    items: [
      { id: "sop_view", label: "查看培训与菜谱", desc: "阅读已发布的标准作业程序和厨房配方" },
      { id: "sop_edit", label: "编辑/新建 SOP", desc: "创建培训草稿，维护流程图片与配料表" },
      { id: "sop_publish", label: "审批发布 SOP", desc: "将 SOP 课件状态改为发布，实时推送到员工端" }
    ]
  }
];

const CATEGORY_TRANSLATIONS: Record<string, Record<Language, string>> = {
  "数据看板": { "zh-CN": "数据看板", "zh-TW": "數據看板", "en": "Dashboard & Metrics", "th": "แดชบอร์ดข้อมูล" },
  "员工花名册": { "zh-CN": "员工花名册", "zh-TW": "員工花名冊", "en": "Employee Directory", "th": "รายชื่อพนักงาน" },
  "考勤与请假": { "zh-CN": "考勤与请假", "zh-TW": "考勤與請假", "en": "Attendance & Leave", "th": "การลงเวลาและการลา" },
  "财务与薪资": { "zh-CN": "财务与薪资", "zh-TW": "財務與薪資", "en": "Payroll & Finances", "th": "การเงินและเงินเดือน" },
  "跨境商户": { "zh-CN": "跨境商户", "zh-TW": "跨境商戶", "en": "Cross-Border Merchants", "th": "ร้านค้าข้ามพรมแดน" },
  "海外仓储": { "zh-CN": "海外仓储", "zh-TW": "海外倉儲", "en": "Overseas Warehouse", "th": "คลังสินค้าต่างประเทศ" },
  "培训与菜谱 (SOP)": { "zh-CN": "培训与菜谱 (SOP)", "zh-TW": "培訓與菜譜 (SOP)", "en": "Training & SOP", "th": "การฝึกอบรมและ SOP" }
};

const PERMISSION_TRANSLATIONS: Record<string, Record<Language, { label: string; desc: string }>> = {
  dashboard_view: {
    "zh-CN": { label: "数据看板查看", desc: "查看看板整体经营与出勤统计" },
    "zh-TW": { label: "數據看板查看", desc: "查看看板整體經營與出勤統計" },
    "en": { label: "View Dashboard", desc: "Access operational and attendance overview" },
    "th": { label: "ดูแดชบอร์ด", desc: "เข้าถึงภาพรวมการปฏิบัติการและการเข้างาน" }
  },
  employees_view: {
    "zh-CN": { label: "查看员工列表", desc: "查看花名册、账号及岗位信息" },
    "zh-TW": { label: "查看員工列表", desc: "查看花名冊、賬號及崗位資訊" },
    "en": { label: "View Employee List", desc: "Browse staff profiles, accounts, and roles" },
    "th": { label: "ดูรายชื่อพนักงาน", desc: "ดูประวัติพนักงาน บัญชี และตำแหน่ง" }
  },
  employees_edit: {
    "zh-CN": { label: "新增/编辑员工", desc: "新增员工及修改用工与薪资设置" },
    "zh-TW": { label: "新增/編輯員工", desc: "新增員工及修改用工與薪資設置" },
    "en": { label: "Add/Edit Employees", desc: "Create staff and update wage profiles" },
    "th": { label: "เพิ่ม/แก้ไขพนักงาน", desc: "สร้างพนักงานและแก้ไขข้อมูลค่าจ้าง" }
  },
  employees_delete: {
    "zh-CN": { label: "办理离职与归档", desc: "标记员工离职并安全归档考勤与薪酬" },
    "zh-TW": { label: "辦理離職與歸檔", desc: "標記員工離職並安全歸檔考勤與薪酬" },
    "en": { label: "Process Resignation", desc: "Mark employee resigned and archive records" },
    "th": { label: "บันทึกพนักงานลาออก", desc: "เปลี่ยนสถานะเป็นลาออกและจัดเก็บประวัติ" }
  },
  employees_reset_pwd: {
    "zh-CN": { label: "重置APP密码", desc: "一键重置移动端协同APP安全密码" },
    "zh-TW": { label: "重置APP密碼", desc: "一鍵重置移動端協同APP安全密碼" },
    "en": { label: "Reset App Password", desc: "Generate secure new credentials for mobile app" },
    "th": { label: "รีเซ็ตรหัสผ่านแอป", desc: "สร้างรหัสผ่านใหม่สำหรับแอปพลิเคชัน" }
  },
  attendance_view: {
    "zh-CN": { label: "查看考勤记录", desc: "查看打卡时间、GPS距离及异常状态" },
    "zh-TW": { label: "查看考勤記錄", desc: "查看打卡時間、GPS距離及異常狀態" },
    "en": { label: "View Attendance Logs", desc: "Check clock-in times, GPS location, and status" },
    "th": { label: "ดูบันทึกเวลาทำงาน", desc: "ดูเวลาลงชื่อเข้างาน พิกัด GPS และสถานะ" }
  },
  attendance_edit: {
    "zh-CN": { label: "考勤补卡与调整", desc: "手工调整考勤、补卡及修正考勤异常" },
    "zh-TW": { label: "考勤補卡與調整", desc: "手工調整考勤、補卡及修正考勤異常" },
    "en": { label: "Adjust Attendance", desc: "Manual clock adjustments and punch fixes" },
    "th": { label: "แก้ไขเวลาทำงาน", desc: "ปรับปรุงเวลาลงชื่อเข้างานและแก้ไขข้อผิดพลาด" }
  },
  leave_view: {
    "zh-CN": { label: "查看请假列表", desc: "查看所有请假日志、事由及统计" },
    "zh-TW": { label: "查看請假列表", desc: "查看所有請假日誌、事由及統計" },
    "en": { label: "View Leave Requests", desc: "View all staff leave applications and balances" },
    "th": { label: "ดูรายการใบลา", desc: "ดูประวัติการลางาน เหตุผล และยอดคงเหลือ" }
  },
  leave_approve: {
    "zh-CN": { label: "审批请假单", desc: "审核并批准或驳回员工请假申请" },
    "zh-TW": { label: "審批請假單", desc: "審核並批准或駁回員工請假申請" },
    "en": { label: "Approve Leave", desc: "Approve or reject staff leave requests" },
    "th": { label: "อนุมัติใบลา", desc: "อนุมัติหรือปฏิเสธคำขอลางาน" }
  },
  payroll_view: {
    "zh-CN": { label: "查看薪资核算", desc: "查看月度工资表及自动核算明细" },
    "zh-TW": { label: "查看薪資核算", desc: "查看月度工資表及自動核算明細" },
    "en": { label: "View Payroll Calculations", desc: "Review monthly payroll breakdown and hours" },
    "th": { label: "ดูการคำนวณเงินเดือน", desc: "ดูยอดเงินเดือนประจำเดือนและชั่วโมงทำงาน" }
  },
  payroll_pay: {
    "zh-CN": { label: "发放/锁定薪资", desc: "确认发放薪资条并锁定不可篡改" },
    "zh-TW": { label: "發放/鎖定薪資", desc: "確認發放薪資條並鎖定不可篡改" },
    "en": { label: "Payout & Lock Payroll", desc: "Confirm payslip dispatch and lock payroll records" },
    "th": { label: "จ่ายและล็อกเงินเดือน", desc: "ยืนยันการจ่ายเงินเดือนและล็อกสลิป" }
  },
  expenses_view: {
    "zh-CN": { label: "查看费用报表", desc: "查看垫付、报销与日常支出流水" },
    "zh-TW": { label: "查看費用報表", desc: "查看墊付、報銷與日常支出流水" },
    "en": { label: "View Expenses", desc: "Review reimbursement and operational expenses" },
    "th": { label: "ดูรายงานค่าใช้จ่าย", desc: "ดูรายการเบิกจ่ายและค่าใช้จ่ายทั่วไป" }
  },
  expenses_approve: {
    "zh-CN": { label: "审批费用报销", desc: "审批驳回员工发起的日常报销与垫付" },
    "zh-TW": { label: "審批費用報銷", desc: "審批駁回員工發起的日常報銷與墊付" },
    "en": { label: "Approve Reimbursements", desc: "Approve or decline expense reimbursement requests" },
    "th": { label: "อนุมัติการเบิกจ่าย", desc: "อนุมัติหรือปฏิเสธการขอเบิกเงิน" }
  },
  expenses_edit: {
    "zh-CN": { label: "新建费用支出", desc: "手工录入公司营运支出流水" },
    "zh-TW": { label: "新建費用支出", desc: "手工錄入公司營運支出流水" },
    "en": { label: "Record Expenses", desc: "Manually log warehouse operational expenses" },
    "th": { label: "บันทึกค่าใช้จ่าย", desc: "บันทึกค่าใช้จ่ายการดำเนินงานของคลัง" }
  },
  customers_view: {
    "zh-CN": { label: "查看商户列表", desc: "查看签约商户、绑定店铺与授信额度" },
    "zh-TW": { label: "查看商戶列表", desc: "查看簽約商戶、綁定店鋪與授信額度" },
    "en": { label: "View Merchant List", desc: "View contracted merchants, shops, and credit" },
    "th": { label: "ดูรายชื่อร้านค้า", desc: "ดูร้านค้าที่ทำสัญญา ร้านค้าที่ผูกไว้ และวงเงิน" }
  },
  customers_edit: {
    "zh-CN": { label: "维护商户档案", desc: "编辑商户签约信息与平台授权" },
    "zh-TW": { label: "維護商戶檔案", desc: "編輯商戶簽約資訊與平台授權" },
    "en": { label: "Manage Merchants", desc: "Update contract terms and e-commerce store bindings" },
    "th": { label: "จัดการร้านค้า", desc: "แก้ไขข้อมูลสัญญาและการเชื่อมต่อร้านค้า" }
  },
  customers_recharge: {
    "zh-CN": { label: "商户余额充值", desc: "录入线下打款并增加商户可用账户余额" },
    "zh-TW": { label: "商戶餘額充值", desc: "錄入線下打款並增加商戶可用賬戶餘額" },
    "en": { label: "Top Up Merchant Credit", desc: "Record offline deposits and credit balance" },
    "th": { label: "เติมเครดิตร้านค้า", desc: "บันทึกการโอนเงินและเพิ่มยอดเงินคงเหลือ" }
  },
  goods_view: {
    "zh-CN": { label: "查看入库列表", desc: "查看商户到货单、到件规格与唛头" },
    "zh-TW": { label: "查看入庫列表", desc: "查看商戶到貨單、到件規格與嘜頭" },
    "en": { label: "View Inbound Deliveries", desc: "Browse inbound packages and shipping marks" },
    "th": { label: "ดูรายการสินค้าเข้าคลัง", desc: "ดูรายการพัสดุและรหัสสินค้าที่มาถึง" }
  },
  goods_edit: {
    "zh-CN": { label: "新建/签收入库", desc: "录入到货并电子签名确认入库" },
    "zh-TW": { label: "新建/簽收入庫", desc: "錄入到貨並電子簽名確認入庫" },
    "en": { label: "Receive & Sign Inbound", desc: "Check in shipments with e-signature receipt" },
    "th": { label: "รับและเซ็นชื่อรับพัสดุ", desc: "บันทึกรับสินค้าและเซ็นชื่ออิเล็กทรอนิกส์" }
  },
  products_view: {
    "zh-CN": { label: "查看商品与货位", desc: "查看SKU库存、货位分布及尺寸重量" },
    "zh-TW": { label: "查看商品與貨位", desc: "查看SKU庫存、貨位分佈及尺寸重量" },
    "en": { label: "View Product Catalog", desc: "Browse SKUs, shelf locations, and dimensions" },
    "th": { label: "ดูรายการสินค้าและชั้นวาง", desc: "ดู SKU ตำแหน่งชั้นวาง และขนาดน้ำหนัก" }
  },
  products_edit: {
    "zh-CN": { label: "商品盘点与维护", desc: "调整货位布局与实盘库存修正" },
    "zh-TW": { label: "商品盤點與維護", desc: "調整貨位佈局與實盤庫存修正" },
    "en": { label: "Inventory Stocktake", desc: "Update shelf bins and perform physical counts" },
    "th": { label: "ตรวจนับสต็อกสินค้า", desc: "แก้ไขตำแหน่งชั้นวางและปรับปรุงจำนวนสต็อกจริง" }
  },
  orders_view: {
    "zh-CN": { label: "查看出库订单", desc: "查看电商物流面单与拣货发运单" },
    "zh-TW": { label: "查看出庫訂單", desc: "查看電商物流面單與揀貨發運單" },
    "en": { label: "View Outbound Orders", desc: "Track shipping waybills and picking slips" },
    "th": { label: "ดูรายการคำสั่งซื้อขาออก", desc: "ดูใบปะหน้าพัสดุและใบหยิบสินค้า" }
  },
  orders_edit: {
    "zh-CN": { label: "打单分拨与出货", desc: "一键拉单、打印面单及分拨出库" },
    "zh-TW": { label: "打單分撥與出貨", desc: "一鍵拉單、列印面單及分撥出庫" },
    "en": { label: "Print & Dispatch Orders", desc: "Generate waybills and mark packages dispatched" },
    "th": { label: "พิมพ์ใบปะหน้าและจัดส่ง", desc: "พิมพ์ใบปะหน้าและบันทึกการส่งพัสดุ" }
  },
  sop_view: {
    "zh-CN": { label: "查看培训与SOP", desc: "查阅标准作业程序与流程配方" },
    "zh-TW": { label: "查看培訓與SOP", desc: "查閱標準作業程序與流程配方" },
    "en": { label: "View Training SOPs", desc: "Read warehouse standard operating procedures" },
    "th": { label: "ดูคู่มือ SOP การทำงาน", desc: "อ่านขั้นตอนมาตรฐานการทำงานของคลัง" }
  },
  sop_edit: {
    "zh-CN": { label: "编辑/起草SOP", desc: "编写操作规程流程与图文说明" },
    "zh-TW": { label: "編輯/起草SOP", desc: "編寫操作規程流程與圖文說明" },
    "en": { label: "Create/Draft SOPs", desc: "Draft operational workflow guides and steps" },
    "th": { label: "เขียน/แก้ไขร่าง SOP", desc: "เขียนขั้นตอนการทำงานและรายละเอียดภาพประกอบ" }
  },
  sop_publish: {
    "zh-CN": { label: "审核并发布SOP", desc: "发布课程与SOP实时同步至员工端APP" },
    "zh-TW": { label: "審核並發布SOP", desc: "發布課程與SOP實時同步至員工端APP" },
    "en": { label: "Publish SOPs", desc: "Approve and push SOP courses to mobile app" },
    "th": { label: "อนุมัติและเผยแพร่ SOP", desc: "เผยแพร่คู่มือไปยังแอปพลิเคชันพนักงานทันที" }
  }
};


export function EmployeeModal({ isOpen, onClose, onSave, employee, canManagePermissions = false, isPermissionsLoading = false, defaultWarehouseCode = "TH", lang = "zh-CN" }: EmployeeModalProps) {
  const formContainerRef = useRef<HTMLFormElement>(null);
  const [roleAttendanceMap, setRoleAttendanceMap] = useState<Record<string, boolean>>(DEFAULT_ROLE_ATTENDANCE);
  const [formData, setFormData] = useState<Partial<Employee>>({
    name: "", gender: "female", country: "MM", warehouseCode: defaultWarehouseCode || "TH", role: "拣货员", dept: "",
    requiresAttendance: true,
    hourlyRate: undefined, baseMonthlyWage: undefined, dailyWage: undefined, attendanceBonus: undefined, socialSecurity: undefined, currency: "THB",
    joinDate: new Date().toISOString().split("T")[0], status: "在职", photo: null, sourceType: "自招", dispatchCommissionRate: undefined,
    otRuleType: "fixed", otFixedRate: undefined, otBaseRate: undefined, otMultiplierWorkday: 1.5, otMultiplierWeekend: 2.0, otMultiplierHoliday: 3.0,
    taxRate: 5, mealAllowanceDaily: undefined, licenseFee: undefined, idCard: "", username: "", password: ""
  });
  const [changeReason, setChangeReason] = useState("");
  const [effectiveDate, setEffectiveDate] = useState("");
  const [errorMsg, setErrorMsg] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showSalaryConfirmModal, setShowSalaryConfirmModal] = useState(false);
  const [detectedSalaryDiffs, setDetectedSalaryDiffs] = useState<SalaryDiffItem[]>([]);
  const [pendingSavePayload, setPendingSavePayload] = useState<any>(null);

  const activeEmployeeIdRef = useRef<number | null>(null);
  const initialSalarySnapshotRef = useRef<Record<string, any>>({});

  // 监听薪酬及规则字段是否发生改动（仅在编辑已有员工时触发）
  const isSalaryModified = React.useMemo(() => {
    if (!employee) return false;
    const initial = initialSalarySnapshotRef.current;
    if (!initial || Object.keys(initial).length === 0) return false;

    const norm = (v: any) => (v === undefined || v === null || v === "" ? null : Number(v));
    const normStr = (v: any) => (v === undefined || v === null ? "" : String(v).trim());

    if (norm(formData.baseMonthlyWage) !== norm(initial.baseMonthlyWage)) return true;
    if (norm(formData.hourlyRate) !== norm(initial.hourlyRate)) return true;
    if (norm(formData.dailyWage) !== norm(initial.dailyWage)) return true;
    if (norm(formData.taxRate) !== norm(initial.taxRate)) return true;
    if (norm(formData.attendanceBonus) !== norm(initial.attendanceBonus)) return true;
    if (norm(formData.socialSecurity) !== norm(initial.socialSecurity)) return true;
    if (norm(formData.mealAllowanceDaily) !== norm(initial.mealAllowanceDaily)) return true;
    if (norm(formData.licenseFee) !== norm(initial.licenseFee)) return true;
    if (norm(formData.dispatchCommissionRate) !== norm(initial.dispatchCommissionRate)) return true;
    if (normStr(formData.currency) !== normStr(initial.currency)) return true;
    if (normStr(formData.otRuleType) !== normStr(initial.otRuleType)) return true;
    if (norm(formData.otFixedRate) !== norm(initial.otFixedRate)) return true;
    if (norm(formData.otBaseRate) !== norm(initial.otBaseRate)) return true;
    if (norm(formData.otMultiplierWorkday) !== norm(initial.otMultiplierWorkday)) return true;
    if (norm(formData.otMultiplierWeekend) !== norm(initial.otMultiplierWeekend)) return true;
    if (norm(formData.otMultiplierHoliday) !== norm(initial.otMultiplierHoliday)) return true;

    return false;
  }, [formData, employee]);

  useEffect(() => {
    setErrorMsg("");
    setIsSubmitting(false);
    setChangeReason("");
    setEffectiveDate(getNowDateStr());
    if (isOpen) {
      const isSameEmployee = Boolean(employee && activeEmployeeIdRef.current === employee.id);
      activeEmployeeIdRef.current = employee?.id ?? null;

      if (isSameEmployee) {
        // If the same employee modal is already open, only update permissions when asynchronously fetched
        if (Array.isArray(employee?.permissions)) {
          setFormData(prev => ({
            ...prev,
            permissions: employee.permissions
          }));
        }
        return;
      }

      if (employee) {
        // 锁定打开弹窗瞬间的薪酬原始快照
        initialSalarySnapshotRef.current = {
          baseMonthlyWage: employee.baseMonthlyWage !== undefined && employee.baseMonthlyWage !== null && Number(employee.baseMonthlyWage) > 0 ? Number(employee.baseMonthlyWage) : undefined,
          hourlyRate: employee.hourlyRate !== undefined && employee.hourlyRate !== null && Number(employee.hourlyRate) > 0 ? Number(employee.hourlyRate) : undefined,
          dailyWage: employee.dailyWage !== undefined && employee.dailyWage !== null && Number(employee.dailyWage) > 0 ? Number(employee.dailyWage) : undefined,
          taxRate: employee.taxRate !== undefined && employee.taxRate !== null ? Number(employee.taxRate) : 5,
          attendanceBonus: employee.attendanceBonus !== undefined && employee.attendanceBonus !== null && Number(employee.attendanceBonus) > 0 ? Number(employee.attendanceBonus) : undefined,
          socialSecurity: employee.socialSecurity !== undefined && employee.socialSecurity !== null && Number(employee.socialSecurity) > 0 ? Number(employee.socialSecurity) : undefined,
          mealAllowanceDaily: employee.mealAllowanceDaily !== undefined && employee.mealAllowanceDaily !== null && Number(employee.mealAllowanceDaily) > 0 ? Number(employee.mealAllowanceDaily) : undefined,
          licenseFee: employee.licenseFee !== undefined && employee.licenseFee !== null && Number(employee.licenseFee) > 0 ? Number(employee.licenseFee) : undefined,
          dispatchCommissionRate: employee.dispatchCommissionRate !== undefined && employee.dispatchCommissionRate !== null && Number(employee.dispatchCommissionRate) > 0 ? Number(employee.dispatchCommissionRate) : undefined,
          currency: employee.currency || "THB",
          otRuleType: employee.otRuleType || "fixed",
          otFixedRate: employee.otFixedRate !== undefined && employee.otFixedRate !== null && Number(employee.otFixedRate) > 0 ? Number(employee.otFixedRate) : undefined,
          otBaseRate: employee.otBaseRate !== undefined && employee.otBaseRate !== null && Number(employee.otBaseRate) > 0 ? Number(employee.otBaseRate) : undefined,
          otMultiplierWorkday: employee.otMultiplierWorkday ?? 1.5,
          otMultiplierWeekend: employee.otMultiplierWeekend ?? 2.0,
          otMultiplierHoliday: employee.otMultiplierHoliday ?? 3.0
        };
        setFormData({
          ...employee,
          joinDate: employee.joinDate ? formatDate(employee.joinDate, getNowDateStr()) : getNowDateStr(),
          status: employee.status || "在职",
          warehouseCode: employee.warehouseCode || defaultWarehouseCode || "TH",
          sourceType: employee.sourceType || "自招",
          hourlyRate: employee.hourlyRate !== undefined && employee.hourlyRate !== null && Number(employee.hourlyRate) > 0 ? Number(employee.hourlyRate) : undefined,
          baseMonthlyWage: employee.baseMonthlyWage !== undefined && employee.baseMonthlyWage !== null && Number(employee.baseMonthlyWage) > 0 ? Number(employee.baseMonthlyWage) : undefined,
          dailyWage: employee.dailyWage !== undefined && employee.dailyWage !== null && Number(employee.dailyWage) > 0 ? Number(employee.dailyWage) : undefined,
          attendanceBonus: employee.attendanceBonus !== undefined && employee.attendanceBonus !== null && Number(employee.attendanceBonus) > 0 ? Number(employee.attendanceBonus) : undefined,
          socialSecurity: employee.socialSecurity !== undefined && employee.socialSecurity !== null && Number(employee.socialSecurity) > 0 ? Number(employee.socialSecurity) : undefined,
          mealAllowanceDaily: employee.mealAllowanceDaily !== undefined && employee.mealAllowanceDaily !== null && Number(employee.mealAllowanceDaily) > 0 ? Number(employee.mealAllowanceDaily) : undefined,
          licenseFee: employee.licenseFee !== undefined && employee.licenseFee !== null && Number(employee.licenseFee) > 0 ? Number(employee.licenseFee) : undefined,
          dispatchCommissionRate: employee.dispatchCommissionRate !== undefined && employee.dispatchCommissionRate !== null && Number(employee.dispatchCommissionRate) > 0 ? Number(employee.dispatchCommissionRate) : undefined,
          otRuleType: employee.otRuleType || "fixed",
          otFixedRate: employee.otFixedRate !== undefined && employee.otFixedRate !== null && Number(employee.otFixedRate) > 0 ? Number(employee.otFixedRate) : undefined,
          otBaseRate: employee.otBaseRate !== undefined && employee.otBaseRate !== null && Number(employee.otBaseRate) > 0 ? Number(employee.otBaseRate) : undefined,
          otMultiplierWorkday: employee.otMultiplierWorkday ?? 1.5,
          otMultiplierWeekend: employee.otMultiplierWeekend ?? 2.0,
          otMultiplierHoliday: employee.otMultiplierHoliday ?? 3.0,
          taxRate: employee.taxRate !== undefined && employee.taxRate !== null ? Number(employee.taxRate) : 5,
          permissions: employee.permissions || [],
          requiresAttendance: employee.requiresAttendance !== false,
          idCard: employee.idCard || "",
          currency: (employee.currency || "THB") as CurrencyCode, // 防止 null 导致 formData.currency=null，提交时被后端 fallback 覆盖
          password: ""
        });
        const currentRole = employee.role || "普通员工";
        setRoleAttendanceMap(prev => ({
          ...DEFAULT_ROLE_ATTENDANCE,
          ...prev,
          [currentRole]: employee.requiresAttendance !== false
        }));
      } else {
        const randomPass = Math.floor(100000 + Math.random() * 900000).toString();
        const initialWarehouse = defaultWarehouseCode || "TH";
        const initialAccount = generateAppAccount(initialWarehouse);
        setFormData({
          name: "", gender: "female", country: "MM", warehouseCode: initialWarehouse, role: "拣货员", dept: "",
          requiresAttendance: true,
          hourlyRate: undefined, baseMonthlyWage: undefined, dailyWage: undefined, attendanceBonus: undefined, socialSecurity: undefined, currency: "THB",
          joinDate: getNowDateStr(), status: "在职", photo: null, username: initialAccount, password: randomPass,
          sourceType: "自招", dispatchCommissionRate: undefined, otRuleType: "fixed", otFixedRate: undefined, otBaseRate: undefined,
          otMultiplierWorkday: 1.5, otMultiplierWeekend: 2.0, otMultiplierHoliday: 3.0, taxRate: 5,
          mealAllowanceDaily: undefined, licenseFee: undefined, permissions: [], idCard: ""
        });
        setRoleAttendanceMap({ ...DEFAULT_ROLE_ATTENDANCE });
      }
    } else {
      activeEmployeeIdRef.current = null;
    }
  }, [defaultWarehouseCode, employee, isOpen]);

  const handlePermissionChange = (permId: string, checked: boolean) => {
    setFormData(prev => {
      const currentPerms = prev.permissions || [];
      let updated: string[];
      if (checked) {
        if (permId === "*") {
          updated = ["*"];
        } else {
          const filtered = currentPerms.filter(p => p !== "*");
          if (!filtered.includes(permId)) {
            updated = [...filtered, permId];
          } else {
            updated = filtered;
          }
        }
      } else {
        updated = currentPerms.filter(p => p !== permId);
      }
      return { ...prev, permissions: updated };
    });
  };

  const handlePresetRoleSelect = (presetName: string) => {
    const presetPerms = ROLE_PRESETS[presetName as keyof typeof ROLE_PRESETS] || [];
    const isPunchRequired = roleAttendanceMap[presetName] ?? true;
    setFormData(prev => ({
      ...prev,
      role: presetName,
      permissions: presetPerms,
      requiresAttendance: isPunchRequired
    }));
  };

  const handleToggleRoleAttendance = (presetName: string, checked: boolean) => {
    setRoleAttendanceMap(prev => ({ ...prev, [presetName]: checked }));
    if (formData.role === presetName) {
      setFormData(prev => ({ ...prev, requiresAttendance: checked }));
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    let finalValue: any = value;
    if (
      name === "hourlyRate" || 
      name === "baseMonthlyWage" || 
      name === "dailyWage" || 
      name === "attendanceBonus" || 
      name === "socialSecurity" || 
      name === "dispatchCommissionRate" || 
      name === "otFixedRate" ||
      name === "otBaseRate" ||
      name === "otMultiplierWorkday" ||
      name === "otMultiplierWeekend" ||
      name === "otMultiplierHoliday" ||
      name === "taxRate" ||
      name === "mealAllowanceDaily" ||
      name === "licenseFee"
    ) {
      finalValue = value === "" ? undefined : parseFloat(value);
      if (finalValue !== undefined && isNaN(finalValue)) {
        finalValue = undefined;
      }
    }
    setErrorMsg("");
    setFormData(prev => {
      const updated = { ...prev, [name]: finalValue };
      if (name === "sourceType" && finalValue === "自招") {
        updated.dispatchCommissionRate = undefined;
      }
      return updated;
    });
  };

  const handlePhotoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (ev) => {
        const rawData = ev.target?.result as string;
        if (!rawData) return;
        const img = new Image();
        img.onload = () => {
          try {
            const canvas = document.createElement("canvas");
            const maxDim = 200;
            let width = img.width;
            let height = img.height;
            if (width > height) {
              if (width > maxDim) {
                height = Math.round((height * maxDim) / width);
                width = maxDim;
              }
            } else {
              if (height > maxDim) {
                width = Math.round((width * maxDim) / height);
                height = maxDim;
              }
            }
            canvas.width = width;
            canvas.height = height;
            const ctx = canvas.getContext("2d");
            if (ctx) {
              ctx.drawImage(img, 0, 0, width, height);
              const compressedBase64 = canvas.toDataURL("image/jpeg", 0.7);
              setFormData(prev => ({ ...prev, photo: compressedBase64 }));
            } else {
              setFormData(prev => ({ ...prev, photo: rawData }));
            }
          } catch {
            setFormData(prev => ({ ...prev, photo: rawData }));
          }
        };
        img.onerror = () => {
          setFormData(prev => ({ ...prev, photo: rawData }));
        };
        img.src = rawData;
      };
      reader.onerror = () => {
        console.error("Failed to read file");
      };
      reader.readAsDataURL(file);
      e.target.value = "";
    }
  };

  return (
    <>
    <Modal
      isOpen={isOpen}
      onClose={() => { if (!isSubmitting) onClose(); }}
      title={employee ? getTranslation("modal_employee_edit", lang) : getTranslation("modal_employee_add", lang)}
      className="max-w-2xl"
      footer={
        <>
          <Button 
            type="button" 
            variant="outline"
            onClick={onClose} 
            disabled={isSubmitting}
            className="rounded-lg text-slate-600 hover:bg-slate-100"
          >
            {lang === "en" ? "Cancel" : lang === "th" ? "ยกเลิก" : lang === "zh-TW" ? "取消" : "取消"}
          </Button>
          <Button 
            type="submit" 
            form="employee-profile-form" 
            disabled={isSubmitting}
            className="rounded-lg shadow-md bg-blue-600 hover:bg-blue-700 text-white flex items-center justify-center gap-2"
          >
            {isSubmitting && <Loader2 className="w-4 h-4 animate-spin" />}
            {isSubmitting 
              ? (lang === "en" ? "Saving..." : lang === "th" ? "กำลังบันทึก..." : lang === "zh-TW" ? "保存中..." : "保存中...") 
              : (lang === "en" ? "Save Profile" : lang === "th" ? "บันทึกประวัติพนักงาน" : lang === "zh-TW" ? "保存員工檔案" : "保存员工档案")}
          </Button>
        </>
      }
    >
      <form ref={formContainerRef} id="employee-profile-form" onSubmit={async (e) => {
        e.preventDefault();
        if (isSubmitting) return;

        const hasBaseWage = formData.baseMonthlyWage !== undefined && formData.baseMonthlyWage !== null && Number(formData.baseMonthlyWage) > 0;
        const hasHourlyRate = !hasBaseWage && formData.hourlyRate !== undefined && formData.hourlyRate !== null && Number(formData.hourlyRate) > 0;
        const hasDailyWage = !hasBaseWage && formData.dailyWage !== undefined && formData.dailyWage !== null && Number(formData.dailyWage) > 0;
        if (!hasBaseWage && !hasHourlyRate && !hasDailyWage) {
          setErrorMsg(
            lang === "en"
              ? "Please enter Basic Monthly Wage, or enter Fixed Daily Wage / Hourly Rate!"
              : lang === "th"
                ? "กรุณาระบุเงินเดือนพื้นฐาน หรือระบุค่าจ้างรายวัน/รายชั่วโมง!"
                : lang === "zh-TW"
                  ? "請輸入「固定月薪」，或輸入「固定日薪」/「時薪」！"
                  : "请输入“固定月薪”，或输入“固定日薪”/“时薪”！"
          );
          formContainerRef.current?.scrollTo({ top: 0, behavior: "smooth" });
          return;
        }

        if (formData.sourceType === "劳务派遣" && (formData.dispatchCommissionRate === undefined || formData.dispatchCommissionRate === null)) {
          setErrorMsg(
            lang === "en"
              ? "Dispatch employees must have a dispatch service commission rate!"
              : lang === "th"
                ? "พนักงานส่งตัวต้องระบุอัตราค่าคอมมิชชั่นการส่งตัว!"
                : lang === "zh-TW"
                  ? "勞務派遣員工必須輸入「派遣服務抽傭比例」！"
                  : "劳务派遣员工必须输入“派遣服务抽佣比例”！"
          );
          formContainerRef.current?.scrollTo({ top: 0, behavior: "smooth" });
          return;
        }

        const finalJoinDate = formatDate(formData.joinDate, "");
        if (!finalJoinDate || !/^\d{4}-\d{2}-\d{2}$/.test(finalJoinDate)) {
          setErrorMsg(
            lang === "en"
              ? "Please select a valid hire date!"
              : lang === "th"
                ? "กรุณาเลือกวันที่เริ่มงานที่ถูกต้อง!"
                : lang === "zh-TW"
                  ? "請選擇有效的入職日期！"
                  : "请选择有效的入职日期！"
          );
          formContainerRef.current?.scrollTo({ top: 0, behavior: "smooth" });
          return;
        }

        const finalUsername = formData.username?.trim() || generateAppAccount(formData.warehouseCode || defaultWarehouseCode || "TH");
        const finalPassword = formData.password?.trim() || (!employee ? Math.floor(100000 + Math.random() * 900000).toString() : undefined);
        const finalMealAllowanceDaily = formData.mealAllowanceDaily !== undefined && formData.mealAllowanceDaily !== null && Number(formData.mealAllowanceDaily) > 0 ? Number(formData.mealAllowanceDaily) : undefined;
        const finalOtFixedRate = formData.otFixedRate !== undefined && formData.otFixedRate !== null && Number(formData.otFixedRate) > 0 ? Number(formData.otFixedRate) : undefined;
        const finalOtBaseRate = formData.otBaseRate !== undefined && formData.otBaseRate !== null && Number(formData.otBaseRate) > 0 ? Number(formData.otBaseRate) : undefined;
        const finalAttendanceBonus = formData.attendanceBonus !== undefined && formData.attendanceBonus !== null && Number(formData.attendanceBonus) > 0 ? Number(formData.attendanceBonus) : undefined;
        const finalSocialSecurity = formData.socialSecurity !== undefined && formData.socialSecurity !== null && Number(formData.socialSecurity) > 0 ? Number(formData.socialSecurity) : undefined;
        const finalLicenseFee = formData.licenseFee !== undefined && formData.licenseFee !== null && Number(formData.licenseFee) > 0 ? Number(formData.licenseFee) : undefined;
        const finalDispatchCommissionRate = formData.dispatchCommissionRate !== undefined && formData.dispatchCommissionRate !== null && Number(formData.dispatchCommissionRate) > 0 ? Number(formData.dispatchCommissionRate) : undefined;

        const finalTaxRate = formData.taxRate !== undefined && formData.taxRate !== null && !isNaN(Number(formData.taxRate)) ? Number(formData.taxRate) : undefined;
        if (finalTaxRate !== undefined && (finalTaxRate < 0 || finalTaxRate > 100)) {
          setErrorMsg(lang === "en" ? "Tax rate must be between 0% and 100%!" : "个人所得税比例必须在 0% 到 100% 之间！");
          formContainerRef.current?.scrollTo({ top: 0, behavior: "smooth" });
          return;
        }

        const preparedPayload = {
          ...formData,
          requiresAttendance: formData.requiresAttendance !== false,
          joinDate: finalJoinDate,
          status: formData.status || "在职",
          photo: formData.photo ?? null,
          gender: formData.gender || "female",
          username: finalUsername,
          password: finalPassword,
          hourlyRate: hasBaseWage ? undefined : (formData.hourlyRate !== undefined && Number(formData.hourlyRate) > 0 ? Number(formData.hourlyRate) : undefined),
          baseMonthlyWage: hasBaseWage ? Number(formData.baseMonthlyWage) : undefined,
          dailyWage: hasBaseWage ? undefined : (formData.dailyWage !== undefined && Number(formData.dailyWage) > 0 ? Number(formData.dailyWage) : undefined),
          salaryType: hasBaseWage ? "fixed" : "hourly",
          mealAllowanceDaily: finalMealAllowanceDaily,
          attendanceBonus: finalAttendanceBonus,
          socialSecurity: finalSocialSecurity,
          licenseFee: finalLicenseFee,
          dispatchCommissionRate: finalDispatchCommissionRate,
          otRuleType: formData.otRuleType || "fixed",
          otFixedRate: finalOtFixedRate,
          otBaseRate: finalOtBaseRate,
          otMultiplierWorkday: formData.otMultiplierWorkday ?? 1.5,
          otMultiplierWeekend: formData.otMultiplierWeekend ?? 2.0,
          otMultiplierHoliday: formData.otMultiplierHoliday ?? 3.0,
          taxRate: finalTaxRate
        };

        // 如果是编辑已有员工，检测是否存在薪酬与规则变动
        if (employee) {
          const initial = initialSalarySnapshotRef.current || {};
          const diffs: SalaryDiffItem[] = [];

          const norm = (v: any) => (v === undefined || v === null || v === "" ? null : Number(v));
          const normStr = (v: any) => (v === undefined || v === null ? "" : String(v).trim());

          const checkList: Array<{ key: string; label: string; isStr?: boolean }> = [
            { key: "baseMonthlyWage", label: lang === "en" ? "Basic Monthly Wage" : "固定月薪" },
            { key: "hourlyRate", label: lang === "en" ? "Hourly Rate" : "标准时薪" },
            { key: "dailyWage", label: lang === "en" ? "Fixed Daily Wage" : "固定日薪" },
            { key: "taxRate", label: lang === "en" ? "Tax Rate (%)" : "个人所得税比例 (%)" },
            { key: "attendanceBonus", label: lang === "en" ? "Attendance Bonus" : "全勤奖金" },
            { key: "socialSecurity", label: lang === "en" ? "Social Security" : "社保代扣" },
            { key: "mealAllowanceDaily", label: lang === "en" ? "Daily Meal Allowance" : "每日餐补" },
            { key: "licenseFee", label: lang === "en" ? "License Fee" : "证件补贴" },
            { key: "dispatchCommissionRate", label: lang === "en" ? "Dispatch Commission (%)" : "派遣抽佣 (%)" },
            { key: "currency", label: lang === "en" ? "Currency" : "币种", isStr: true },
            { key: "otRuleType", label: lang === "en" ? "OT Rule" : "加班规则", isStr: true },
            { key: "otFixedRate", label: lang === "en" ? "OT Fixed Rate" : "固定加班费" },
            { key: "otBaseRate", label: lang === "en" ? "OT Base Rate" : "加班计算基准" },
            { key: "otMultiplierWorkday", label: lang === "en" ? "Workday OT Multiplier" : "工作日加班倍率" },
            { key: "otMultiplierWeekend", label: lang === "en" ? "Weekend OT Multiplier" : "周末加班倍率" },
            { key: "otMultiplierHoliday", label: lang === "en" ? "Holiday OT Multiplier" : "节假日加班倍率" }
          ];

          for (const item of checkList) {
            const fromVal = normalizeSalaryValue(initial[item.key], Boolean(item.isStr));
            const toVal = normalizeSalaryValue((preparedPayload as any)[item.key], Boolean(item.isStr));
            if (fromVal !== toVal) {
              diffs.push({
                field: item.key,
                label: item.label,
                from: fromVal,
                to: toVal
              });
            }
          }

          if (diffs.length > 0) {
            // 拦截保存，弹出明显的二次确认窗口！
            setDetectedSalaryDiffs(diffs);
            setPendingSavePayload(preparedPayload);
            setShowSalaryConfirmModal(true);
            return;
          }
        }

        try {
          setIsSubmitting(true);
          await onSave(preparedPayload as any);
          onClose();
        } catch (err) {
          setErrorMsg(err?.message || (lang === "en" ? "Failed to save employee profile" : "保存员工档案失败，请稍后重试"));
          formContainerRef.current?.scrollTo({ top: 0, behavior: "smooth" });
        } finally {
          setIsSubmitting(false);
        }
      }} className="space-y-6 max-h-[80vh] overflow-y-auto px-1">
        {errorMsg && (
          <div className="sticky top-0 z-20 mb-4 p-3.5 text-sm text-red-700 bg-red-50/95 backdrop-blur-xs rounded-xl border border-red-200 shadow-sm flex items-center justify-between animate-fade-in">
            <div className="flex items-center gap-2 font-medium">
              <Info className="w-4 h-4 text-red-500 flex-shrink-0" />
              <span>{errorMsg}</span>
            </div>
            <button type="button" onClick={() => setErrorMsg("")} className="text-red-400 hover:text-red-600 p-1 cursor-pointer">
              <X className="w-4 h-4" />
            </button>
          </div>
        )}

        {/* 1、员工基础信息 */}
        <div className="space-y-3">
          <h4 className="text-sm font-bold text-slate-800 flex items-center gap-2">
            <span className="w-1 bg-brand-500 h-4 rounded-full"></span>
            {getTranslation("modal_employee_section1", lang)}
          </h4>
          <div className="bg-slate-50/50 rounded-xl p-4 border border-slate-200/60 space-y-4">
            <div className="flex flex-col md:flex-row gap-5">
              {/* Photo Upload Left */}
              <div className="flex flex-col items-center justify-center bg-white p-3 rounded-xl border border-slate-200/60 shadow-sm flex-shrink-0 self-start">
                <label htmlFor="employee_photo_input" className="w-24 h-24 rounded-full bg-slate-50 border-2 border-dashed border-slate-200 flex items-center justify-center overflow-hidden cursor-pointer hover:border-brand-400 hover:bg-brand-50/30 transition group relative">
                  {formData.photo ? (
                    <img
                      src={formData.photo}
                      className="w-full h-full object-cover"
                      alt=""
                      onError={(e) => {
                        (e.target as HTMLImageElement).style.display = "none";
                      }}
                    />
                  ) : (
                    <div className="text-slate-400 group-hover:text-brand-500 transition flex flex-col items-center">
                      <Upload className="w-7 h-7 text-slate-400" />
                      <span className="text-[10px] text-slate-400 mt-1">
                        {lang === "en" ? "Upload" : lang === "th" ? "อัปโหลด" : lang === "zh-TW" ? "上傳照片" : "上传照片"}
                      </span>
                    </div>
                  )}
                </label>
                <input id="employee_photo_input" type="file" className="hidden" accept="image/*" onChange={handlePhotoUpload} />
                {formData.photo && (
                  <button type="button" onClick={() => setFormData(prev => ({ ...prev, photo: null }))} className="text-xs text-red-500 hover:text-red-700 font-medium mt-2">
                    {lang === "en" ? "Remove Photo" : lang === "th" ? "ลบรูปภาพ" : lang === "zh-TW" ? "移除照片" : "移除照片"}
                  </button>
                )}
              </div>
              
              {/* Fields Grid Right */}
              <div className="flex-1 grid grid-cols-2 gap-3">
                <div className="col-span-2">
                  <Label className="block text-xs font-semibold text-slate-600 mb-1.5">
                    {lang === "en" ? "Employee Name" : lang === "th" ? "ชื่อพนักงาน" : lang === "zh-TW" ? "員工姓名" : "员工姓名"} <span className="text-red-500">*</span>
                  </Label>
                  <Input type="text" name="name" value={formData.name || ""} onChange={handleChange} required className="bg-white" placeholder={getTranslation("modal_employee_name_placeholder", lang)} />
                </div>
                <div>
                  <Label className="block text-xs font-semibold text-slate-600 mb-1.5">
                    {getTranslation("modal_employee_gender", lang)}
                  </Label>
                  <Select name="gender" value={formData.gender || "female"} onValueChange={(val) => setFormData(prev => ({ ...prev, gender: val as Gender }))}>
                    <SelectTrigger className="w-full bg-white font-medium text-slate-700">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="female">{lang === "en" ? "Female" : lang === "th" ? "หญิง" : lang === "zh-TW" ? "女" : "女"}</SelectItem>
                      <SelectItem value="male">{lang === "en" ? "Male" : lang === "th" ? "ชาย" : lang === "zh-TW" ? "男" : "男"}</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label className="block text-xs font-semibold text-slate-600 mb-1.5">
                    {getTranslation("modal_employee_country", lang)}
                  </Label>
                  <Select
                    name="country"
                    value={formData.country || "MM"}
                    onValueChange={(val) => {
                      const nextCountry = val as CountryCode;
                      setFormData(prev => ({
                        ...prev,
                        country: nextCountry,
                        nationality: nextCountry, // 国籍与国籍选项同步，确保提交时不被旧 nationality 覆盖
                        currency: !employee ? getCurrencyForCountry(nextCountry) : prev.currency
                      }));
                    }}
                  >
                    <SelectTrigger className="w-full bg-white font-medium text-slate-700">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="MM">{lang === "en" ? "🇲🇲 Myanmar" : lang === "th" ? "🇲🇲 เมียนมา" : lang === "zh-TW" ? "🇲🇲 緬甸籍" : "🇲🇲 缅甸籍"}</SelectItem>
                      <SelectItem value="TH">{lang === "en" ? "🇹🇭 Thailand" : lang === "th" ? "🇹🇭 ไทย" : lang === "zh-TW" ? "🇹🇭 泰國籍" : "🇹🇭 泰国籍"}</SelectItem>
                      <SelectItem value="CN">{lang === "en" ? "🇨🇳 China" : lang === "th" ? "🇨🇳 จีน" : lang === "zh-TW" ? "🇨🇳 中國籍" : "🇨🇳 中国籍"}</SelectItem>
                      <SelectItem value="PH">{lang === "en" ? "🇵🇭 Philippines" : lang === "th" ? "🇵🇭 ฟิลิปปินส์" : lang === "zh-TW" ? "🇵🇭 菲律賓籍" : "🇵🇭 菲律宾籍"}</SelectItem>
                      <SelectItem value="ID">{lang === "en" ? "🇮🇩 Indonesia" : lang === "th" ? "🇮🇩 อินโดนีเซีย" : lang === "zh-TW" ? "🇮🇩 印度尼西亞籍" : "🇮🇩 印度尼西亚籍"}</SelectItem>
                      <SelectItem value="MY">{lang === "en" ? "🇲🇾 Malaysia" : lang === "th" ? "🇲🇾 มาเลเซีย" : lang === "zh-TW" ? "🇲🇾 馬來西亞籍" : "🇲🇾 马来西亚籍"}</SelectItem>
                      <SelectItem value="VN">{lang === "en" ? "🇻🇳 Vietnam" : lang === "th" ? "🇻🇳 เวียดนาม" : lang === "zh-TW" ? "🇻🇳 越南籍" : "🇻🇳 越南籍"}</SelectItem>
                      <SelectItem value="LA">{lang === "en" ? "🇱🇦 Laos" : lang === "th" ? "🇱🇦 ลาว" : lang === "zh-TW" ? "🇱🇦 老撾籍" : "🇱🇦 老挝籍"}</SelectItem>
                      <SelectItem value="KH">{lang === "en" ? "🇰🇭 Cambodia" : lang === "th" ? "🇰🇭 กัมพูชา" : lang === "zh-TW" ? "🇰🇭 柬埔寨籍" : "🇰🇭 柬埔寨籍"}</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label className="block text-xs font-semibold text-slate-600 mb-1.5">
                    {getTranslation("modal_employee_status", lang)} <span className="text-red-500">*</span>
                  </Label>
                  <Select 
                    name="status" 
                    value={formData.status || "在职"} 
                    onValueChange={(val) => setFormData(prev => ({ ...prev, status: val as EmployeeStatus }))}
                  >
                    <SelectTrigger className="w-full bg-white font-medium text-slate-700">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="在职">{lang === "en" ? "Active" : lang === "th" ? "ทำงานอยู่" : lang === "zh-TW" ? "在職" : "在职"}</SelectItem>
                      <SelectItem value="试用">{lang === "en" ? "Probation" : lang === "th" ? "ทดลองงาน" : lang === "zh-TW" ? "試用" : "试用"}</SelectItem>
                      <SelectItem value="休假">{lang === "en" ? "On Leave" : lang === "th" ? "ลาหยุด" : lang === "zh-TW" ? "休假" : "休假"}</SelectItem>
                      <SelectItem value="离职">{lang === "en" ? "Resigned" : lang === "th" ? "ลาออก" : lang === "zh-TW" ? "離職" : "离职"}</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label className="block text-xs font-semibold text-slate-600 mb-1.5">
                    {getTranslation("modal_employee_join_date", lang)} <span className="text-red-500">*</span>
                  </Label>
                  <DatePicker 
                    name="joinDate" 
                    value={formData.joinDate} 
                    onChange={handleChange} 
                    required 
                    className="bg-white font-medium text-slate-700" 
                  />
                </div>
                <div>
                  <Label className="block text-xs font-semibold text-slate-600 mb-1.5">
                    {lang === "en" ? "Zone" : lang === "th" ? "โซน / แผนก" : lang === "zh-TW" ? "所屬區域" : "所属区域"}
                  </Label>
                  <Input type="text" name="dept" value={formData.dept || ""} onChange={handleChange} className="bg-white text-slate-700 font-medium" placeholder={lang === "en" ? "e.g. Zone A - Receiving" : lang === "th" ? "เช่น โซน A - รับสินค้า" : lang === "zh-TW" ? "例如：A區-入庫" : "如：A区-入库"} />
                </div>
                <div>
                  <Label className="block text-xs font-semibold text-slate-600 mb-1.5">
                    {lang === "en" ? "Overseas Warehouse" : lang === "th" ? "คลังสินค้าต่างประเทศ" : lang === "zh-TW" ? "所屬海外倉" : "所属海外仓"}
                  </Label>
                  <Select 
                    name="warehouseCode" 
                    value={formData.warehouseCode || defaultWarehouseCode || "TH"} 
                    onValueChange={(val) => {
                      setFormData(prev => {
                        let newUsername = prev.username;
                        if (!newUsername || /^[A-Z]{2}\d{4}$/.test(newUsername)) {
                          const numPart = (newUsername && /^[A-Z]{2}(\d{4})$/.exec(newUsername)?.[1]) || Math.floor(1000 + Math.random() * 9000).toString();
                          newUsername = `${getWarehouseCountryPrefix(val)}${numPart}`;
                        }
                        return { ...prev, warehouseCode: val, username: newUsername };
                      });
                    }}
                  >
                    <SelectTrigger className="w-full bg-white font-medium text-slate-700">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="TH">🇹🇭 泰国仓</SelectItem>
                      <SelectItem value="KR">🇰🇷 韩国仓</SelectItem>
                      <SelectItem value="VN">🇻🇳 越南仓</SelectItem>
                      <SelectItem value="MY">🇲🇾 马来西亚仓</SelectItem>
                      <SelectItem value="ID">🇮🇩 印尼仓</SelectItem>
                      <SelectItem value="PH">🇵🇭 菲律宾仓</SelectItem>
                      <SelectItem value="SG">🇸🇬 新加坡仓</SelectItem>
                      <SelectItem value="CN">🇨🇳 中国仓</SelectItem>
                      <SelectItem value="US">🇺🇸 美国仓</SelectItem>
                      <SelectItem value="GB">🇬🇧 英国仓</SelectItem>
                      <SelectItem value="JP">🇯🇵 日本仓</SelectItem>
                      <SelectItem value="MO">🇲🇴 澳门仓</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* 2、薪资与福利待遇 */}
        <div className="space-y-3">
          <h4 className="text-sm font-bold text-slate-800 flex items-center gap-2">
            <span className="w-1 bg-teal-500 h-4 rounded-full"></span>
            {getTranslation("modal_employee_section4", lang)}
          </h4>
          <div className="bg-slate-50/50 rounded-xl p-4 border border-slate-200/60 space-y-4">
            <div className="grid grid-cols-2 gap-3.5">
              <div>
                <Label className="block text-xs font-semibold text-slate-600 mb-1.5">
                  {lang === "en" ? "Employment Type" : lang === "th" ? "ประเภทการจ้างงาน" : lang === "zh-TW" ? "用工性質 / 來源類型" : "用工性质 / 来源类型"}
                </Label>
                <Select name="sourceType" value={formData.sourceType || "自招"} onValueChange={(val) => setFormData(prev => ({ ...prev, sourceType: val as any, ...(val === "自招" ? { dispatchCommissionRate: undefined } : {}) }))}>
                  <SelectTrigger className="w-full bg-white font-bold text-slate-700">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="自招">{lang === "en" ? "Direct Hire" : lang === "th" ? "พนักงานจ้างตรง" : lang === "zh-TW" ? "自招員工" : "自招员工"}</SelectItem>
                    <SelectItem value="劳务派遣">{lang === "en" ? "Labor Dispatch" : lang === "th" ? "พนักงานส่งตัว" : lang === "zh-TW" ? "勞務派遣員工" : "劳务派遣员工"}</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                {formData.sourceType === "劳务派遣" ? (
                  <div>
                    <Label className="block text-xs font-bold text-blue-600 mb-1.5">
                      {getTranslation("modal_employee_dispatch_comm", lang)} <span className="text-red-500">*</span>
                    </Label>
                    <Input type="number" name="dispatchCommissionRate" step="0.1" min="0" max="100" value={formData.dispatchCommissionRate !== undefined && formData.dispatchCommissionRate !== null && Number(formData.dispatchCommissionRate) > 0 ? formData.dispatchCommissionRate : ""} onChange={handleChange} className="border-blue-200 bg-blue-50/40 text-blue-700 font-semibold" placeholder="如: 5.5" />
                  </div>
                ) : (
                  <div>
                    <Label className="block text-xs font-semibold text-slate-400 mb-1.5">
                      {lang === "en" ? "Dispatch Commission Rate" : lang === "th" ? "อัตราค่าคอมมิชชั่นการส่งตัว" : lang === "zh-TW" ? "派遣服務抽傭比例" : "派遣服务抽佣比例"}
                    </Label>
                    <div className="w-full px-3 py-2 bg-slate-100/60 border border-slate-200 rounded-lg text-xs text-slate-400 flex items-center h-9 font-medium">
                      {lang === "en" ? "Direct Hire: No commission fee" : lang === "th" ? "พนักงานจ้างตรง: ไม่มีค่าบริการส่งตัว" : lang === "zh-TW" ? "自招員工：不計算派遣抽傭服務費" : "自招员工：不计算派遣抽佣服务费"}
                    </div>
                  </div>
                )}
              </div>

              {/* 3个平行薪资输入项（时薪、固定日薪、固定月薪） */}
              {(() => {
                const isMonthlyWageActive = Boolean(formData.baseMonthlyWage !== undefined && formData.baseMonthlyWage !== null && Number(formData.baseMonthlyWage) > 0);
                return (
                  <>
                    <div className="col-span-2 pt-1 border-t border-slate-200/60">
                      <span className="text-xs font-semibold text-slate-700 flex items-center justify-between">
                        <span className="flex items-center gap-1">
                          <span className="text-red-500 font-bold">*</span>
                          {lang === "en"
                            ? "Wage Standard (Enter Monthly, or Daily / Hourly)"
                            : lang === "th"
                              ? "เกณฑ์ค่าจ้าง (ระบุเงินเดือน หรือระบุรายวัน/รายชั่วโมง)"
                              : lang === "zh-TW"
                                ? "薪資標準（輸入固定月薪，或輸入固定日薪 / 時薪）"
                                : "薪资标准（输入固定月薪，或输入固定日薪 / 时薪）"}
                        </span>
                        {isMonthlyWageActive && (
                          <span className="text-[11px] text-amber-600 bg-amber-50 px-2 py-0.5 rounded border border-amber-200/80 font-normal animate-fade-in">
                            {lang === "en" ? "Fixed Monthly Mode: Hourly & Daily Wage are locked" : lang === "zh-TW" ? "已啟用固定月薪模式：時薪與日薪已置灰鎖定" : "已启用固定月薪模式：时薪与日薪已置灰锁定"}
                          </span>
                        )}
                      </span>
                    </div>

                    <div>
                      <Label className="block text-xs font-semibold text-slate-600 mb-1.5 flex items-center justify-between">
                        <span>{lang === "en" ? "Hourly Rate (optional)" : lang === "th" ? "อัตราค่าจ้างรายชั่วโมง (ถ้ามี)" : lang === "zh-TW" ? "時薪" : "时薪"}</span>
                        {isMonthlyWageActive && (
                          <span className="text-[10px] text-amber-600 font-normal">
                            {lang === "en" ? "(Locked)" : lang === "zh-TW" ? "(已置灰)" : "(已置灰)"}
                          </span>
                        )}
                      </Label>
                      <div className="relative">
                        <Input
                          type="number"
                          name="hourlyRate"
                          step="0.5"
                          disabled={isMonthlyWageActive}
                          value={formData.hourlyRate !== undefined && formData.hourlyRate !== null && Number(formData.hourlyRate) > 0 ? formData.hourlyRate : ""}
                          onChange={handleChange}
                          className={`font-medium ${isMonthlyWageActive ? "bg-slate-100 text-slate-400 cursor-not-allowed border-slate-200 select-none shadow-none" : "bg-white"}`}
                          placeholder={isMonthlyWageActive ? (lang === "en" ? "Locked (Monthly active)" : "已启用固定月薪") : "如: 300"}
                        />
                        {!isMonthlyWageActive && formData.hourlyRate !== undefined && formData.hourlyRate > 0 && (
                          <span className="absolute right-3 top-2 text-xs text-slate-400 font-normal pointer-events-none">
                            ≈ {(formData.hourlyRate * 8 * 30).toLocaleString()} {formData.currency || "THB"}/月参考
                          </span>
                        )}
                      </div>
                    </div>

                    <div>
                      <Label className="block text-xs font-semibold text-slate-600 mb-1.5 flex items-center justify-between">
                        <span>{lang === "en" ? "Fixed Daily Wage (optional)" : lang === "th" ? "อัตราค่าจ้างรายวัน (ถ้ามี)" : lang === "zh-TW" ? "固定日薪" : "固定日薪"}</span>
                        {isMonthlyWageActive && (
                          <span className="text-[10px] text-amber-600 font-normal">
                            {lang === "en" ? "(Locked)" : lang === "zh-TW" ? "(已置灰)" : "(已置灰)"}
                          </span>
                        )}
                      </Label>
                      <div className="relative">
                        <Input
                          type="number"
                          name="dailyWage"
                          step="1"
                          disabled={isMonthlyWageActive}
                          value={formData.dailyWage !== undefined && formData.dailyWage !== null && Number(formData.dailyWage) > 0 ? formData.dailyWage : ""}
                          onChange={handleChange}
                          className={`font-medium ${isMonthlyWageActive ? "bg-slate-100 text-slate-400 cursor-not-allowed border-slate-200 select-none shadow-none" : "bg-white"}`}
                          placeholder={isMonthlyWageActive ? (lang === "en" ? "Locked (Monthly active)" : "已启用固定月薪") : "如: 1200"}
                        />
                        {!isMonthlyWageActive && formData.dailyWage !== undefined && formData.dailyWage > 0 && (
                          <span className="absolute right-3 top-2 text-xs text-slate-400 font-normal pointer-events-none">
                            ≈ {(formData.dailyWage / 8).toFixed(1)} {formData.currency || "THB"}/时折算
                          </span>
                        )}
                      </div>
                    </div>

                    <div>
                      <Label className="block text-xs font-semibold text-slate-600 mb-1.5 flex items-center justify-between">
                        <span>{lang === "en" ? "Basic Monthly Wage (optional)" : lang === "th" ? "เงินเดือนพื้นฐาน (ถ้ามี)" : lang === "zh-TW" ? "固定月薪" : "固定月薪"}</span>
                        {isMonthlyWageActive && (
                          <span className="text-[10px] text-emerald-600 font-normal">
                            {lang === "en" ? "(Active)" : lang === "zh-TW" ? "(生效中)" : "(生效中)"}
                          </span>
                        )}
                      </Label>
                      <div className="relative">
                        <Input
                          type="number"
                          name="baseMonthlyWage"
                          step="100"
                          value={formData.baseMonthlyWage !== undefined && formData.baseMonthlyWage !== null && Number(formData.baseMonthlyWage) > 0 ? formData.baseMonthlyWage : ""}
                          onChange={handleChange}
                          className="bg-white font-medium"
                          placeholder="如: 60000"
                        />
                        {formData.baseMonthlyWage !== undefined && formData.baseMonthlyWage > 0 && (
                          <span className="absolute right-3 top-2 text-xs text-slate-400 font-normal pointer-events-none">
                            ≈ {(formData.baseMonthlyWage / 30 / 8).toFixed(1)} {formData.currency || "THB"}/时折算
                          </span>
                        )}
                      </div>
                    </div>
                  </>
                );
              })()}

              <div>
                <Label className="block text-xs font-semibold text-slate-600 mb-1.5">
                  {lang === "en" ? "Payout Currency" : lang === "th" ? "สกุลเงินเดือน" : lang === "zh-TW" ? "工資幣種" : "工资币种"}
                </Label>
                <Select name="currency" value={formData.currency || "THB"} onValueChange={(val) => setFormData(prev => ({ ...prev, currency: val as CurrencyCode }))}>
                  <SelectTrigger className="w-full bg-white font-medium text-slate-700">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="THB">{lang === "en" ? "฿ THB (Thai Baht)" : lang === "th" ? "฿ THB (บาทไทย)" : "฿ THB (泰铢)"}</SelectItem>
                    <SelectItem value="USD">{lang === "en" ? "$ USD (US Dollar)" : lang === "th" ? "$ USD (ดอลลาร์สหรัฐ)" : "$ USD (美元)"}</SelectItem>
                    <SelectItem value="MYR">{lang === "en" ? "RM MYR (Malaysian Ringgit)" : lang === "th" ? "RM MYR (ริงกิตมาเลเซีย)" : "RM MYR (马币/林吉特)"}</SelectItem>
                    <SelectItem value="IDR">{lang === "en" ? "Rp IDR (Indonesian Rupiah)" : lang === "th" ? "Rp IDR (รูเปียห์อินโดนีเซีย)" : "Rp IDR (印尼盾)"}</SelectItem>
                    <SelectItem value="PHP">{lang === "en" ? "₱ PHP (Philippine Peso)" : lang === "th" ? "₱ PHP (เปโซฟิลิปปินส์)" : "₱ PHP (菲律宾比索)"}</SelectItem>
                    <SelectItem value="VND">{lang === "en" ? "₫ VND (Vietnamese Dong)" : lang === "th" ? "₫ VND (ดงเวียดนาม)" : "₫ VND (越南盾)"}</SelectItem>
                    <SelectItem value="CNY">{lang === "en" ? "¥ CNY (Chinese Yuan)" : lang === "th" ? "¥ CNY (หยวนจีน)" : "¥ CNY (人民币)"}</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label className="block text-xs font-semibold text-slate-600 mb-1.5">
                  {getTranslation("modal_employee_fixed_bonus", lang)}
                </Label>
                <Input type="number" name="attendanceBonus" step="1" value={formData.attendanceBonus !== undefined && formData.attendanceBonus !== null && Number(formData.attendanceBonus) > 0 ? formData.attendanceBonus : ""} onChange={handleChange} className="bg-white font-medium" placeholder="如: 1000" />
              </div>

              <div>
                <Label className="block text-xs font-semibold text-slate-600 mb-1.5">
                  {getTranslation("modal_employee_social_security", lang)}
                </Label>
                <Input type="number" name="socialSecurity" step="1" value={formData.socialSecurity !== undefined && formData.socialSecurity !== null && Number(formData.socialSecurity) > 0 ? formData.socialSecurity : ""} onChange={handleChange} className="bg-white font-medium" placeholder="如: 750" />
              </div>

              <div>
                <Label className="block text-xs font-semibold text-slate-600 mb-1.5">
                  {getTranslation("modal_employee_meal_allowance", lang)}
                </Label>
                <Input type="number" name="mealAllowanceDaily" step="1" value={formData.mealAllowanceDaily !== undefined && formData.mealAllowanceDaily !== null && Number(formData.mealAllowanceDaily) > 0 ? formData.mealAllowanceDaily : ""} onChange={handleChange} className="bg-white font-medium text-slate-900" placeholder="如: 50" />
              </div>

              <div>
                <Label className="block text-xs font-semibold text-slate-600 mb-1.5">
                  {getTranslation("modal_employee_license_fee", lang)}
                </Label>
                <Input type="number" name="licenseFee" step="1" min="0" value={formData.licenseFee !== undefined && formData.licenseFee !== null && Number(formData.licenseFee) > 0 ? formData.licenseFee : ""} onChange={handleChange} className="bg-white font-medium text-slate-900" placeholder="如: 200" />
              </div>

              {/* 加班费计算规则设置 */}
              <div className="col-span-2 border-t border-slate-200/60 pt-3 mt-1">
                <span className="block text-xs font-bold text-slate-600 mb-2 uppercase tracking-wide flex items-center gap-1">
                  {getTranslation("modal_employee_ot_rule", lang)}
                </span>
                <div className="bg-white p-3.5 rounded-lg border border-slate-200 shadow-sm space-y-3.5">
                  <div>
                    <Label className="block text-xs font-semibold text-slate-600 mb-1.5">
                      {lang === "en" ? "OT Calculation Rule" : lang === "th" ? "กฎการจ่ายค่าล่วงเวลา" : lang === "zh-TW" ? "加班薪資計算規則" : "加班薪资计算规则"}
                    </Label>
                    <Select
                      name="otRuleType"
                      value={formData.otRuleType || "fixed"}
                      onValueChange={(val) => setFormData(prev => ({ ...prev, otRuleType: val as "fixed" | "multiplier" }))}
                    >
                      <SelectTrigger className="w-full bg-white font-medium text-slate-700">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="fixed">
                          {lang === "en" ? "Fixed Overtime Fee" : lang === "th" ? "ค่าล่วงเวลาแบบคงที่" : lang === "zh-TW" ? "固定加班費用" : "固定加班费用"}
                        </SelectItem>
                        <SelectItem value="multiplier">
                          {lang === "en" ? "Based on Workday Multipliers" : lang === "th" ? "ตามอัตราก้าวหน้าคูณเท่า" : lang === "zh-TW" ? "按工作倍率計算" : "按工作倍率计算"}
                        </SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  {(!formData.otRuleType || formData.otRuleType === "fixed") ? (
                    <div className="p-3 bg-slate-50 rounded-xl border border-slate-200/60">
                      <Label className="block text-xs font-semibold text-slate-600 mb-1.5">
                        {lang === "en" ? "Fixed Overtime Rate (per Hour)" : lang === "th" ? "อัตราค่าล่วงเวลาคงที่ (ต่อชั่วโมง)" : lang === "zh-TW" ? "固定加班費用 (每小時)" : "固定加班费用 (每小时)"}
                      </Label>
                      <Input
                        type="number"
                        name="otFixedRate"
                        step="1"
                        value={formData.otFixedRate !== undefined && formData.otFixedRate !== null && Number(formData.otFixedRate) > 0 ? formData.otFixedRate : ""}
                        onChange={handleChange}
                        className="bg-white font-medium text-slate-900"
                        placeholder="如: 50"
                      />
                      <span className="block text-[10px] text-slate-400 mt-1">
                        {lang === "en" ? "Overtime pay = overtime hours × fixed rate. Defaults to 0." : lang === "th" ? "ค่าล่วงเวลา = ชั่วโมงล่วงเวลา × อัตราคงที่ เริ่มต้นที่ 0" : lang === "zh-TW" ? "加班薪資 = 加班工時 × 固定費用，默認為 0。" : "加班薪资 = 加班工时 × 固定费用，默认为 0。"}
                      </span>
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5 bg-slate-50 p-3 rounded-xl border border-slate-200/60">
                      <div>
                        <Label className="block text-xs font-semibold text-slate-600 mb-1.5">
                          {lang === "en" ? "OT Calculation Base Rate" : lang === "th" ? "ค่าจ้างอ้างอิงรายชั่วโมง" : lang === "zh-TW" ? "加班計算基準費用" : "加班计算基准费用"}
                        </Label>
                        <Input type="number" name="otBaseRate" step="1" value={formData.otBaseRate !== undefined && formData.otBaseRate !== null && Number(formData.otBaseRate) > 0 ? formData.otBaseRate : ""} onChange={handleChange} className="bg-white font-medium text-slate-900" placeholder={lang === "en" ? "If blank, uses normal wages" : lang === "th" ? "หากเว้นว่าง ระบบจะคำนวณตามเงินเดือน" : lang === "zh-TW" ? "不填則系統按普通工資折算" : "不填则系统按普通工资折算"} />
                      </div>
                      <div>
                        <div className="grid grid-cols-3 gap-3 mb-3">
                          <div>
                            <Label className="block text-[11px] text-slate-400 mb-1">
                              {lang === "en" ? "Workday OT" : lang === "th" ? "วันทำงาน" : lang === "zh-TW" ? "工作日倍率" : "工作日倍率"}
                            </Label>
                            <Input type="number" name="otMultiplierWorkday" step="0.1" min="0" value={formData.otMultiplierWorkday !== undefined ? formData.otMultiplierWorkday : ""} onChange={handleChange} className="h-8 text-xs text-slate-700 bg-white font-medium" placeholder="默认 1.5" />
                          </div>
                          <div>
                            <Label className="block text-[11px] text-slate-400 mb-1">
                              {lang === "en" ? "Weekend OT" : lang === "th" ? "วันหยุด" : lang === "zh-TW" ? "雙休日倍率" : "双休日倍率"}
                            </Label>
                            <Input type="number" name="otMultiplierWeekend" step="0.1" min="0" value={formData.otMultiplierWeekend !== undefined ? formData.otMultiplierWeekend : ""} onChange={handleChange} className="h-8 text-xs text-slate-700 bg-white font-medium" placeholder="默认 2.0" />
                          </div>
                          <div>
                            <Label className="block text-[11px] text-slate-400 mb-1">
                              {lang === "en" ? "Holiday OT" : lang === "th" ? "วันหยุดนักขัตฯ" : lang === "zh-TW" ? "法定節假日倍率" : "法定节假日倍率"}
                            </Label>
                            <Input type="number" name="otMultiplierHoliday" step="0.1" min="0" value={formData.otMultiplierHoliday !== undefined ? formData.otMultiplierHoliday : ""} onChange={handleChange} className="h-8 text-xs text-slate-700 bg-white font-medium" placeholder="默认 3.0" />
                          </div>
                        </div>
                        <div className="bg-amber-50/60 border border-amber-100 rounded-xl p-2.5 text-[11px] text-slate-600 leading-relaxed">
                          <span className="font-bold text-amber-800 flex items-center gap-1 mb-0.5">
                            {lang === "en" ? "🌟 Overtime Calculation Rules:" : lang === "th" ? "🌟 กฎการคำนวณค่าล่วงเวลา:" : lang === "zh-TW" ? "🌟 倍率計算說明：" : "🌟 倍率计算说明："}
                          </span>
                          {lang === "en" ? (
                            <>
                              OT hourly rate = <span className="font-semibold text-brand-700">hourly base rate</span> × <span className="font-semibold text-brand-700">corresponding multiplier</span>.
                              <span className="block text-[10px] text-slate-450 mt-0.5">If hourly base rate is blank, the system automatically uses the employee's hourly rate or prorated rate from their daily/monthly wage.</span>
                            </>
                          ) : lang === "th" ? (
                            <>
                              ค่าล่วงเวลาต่อชั่วโมง = <span className="font-semibold text-brand-700">ค่าจ้างอ้างอิงรายชั่วโมง</span> × <span className="font-semibold text-brand-700">ตัวคูณที่สอดคล้อง</span>.
                              <span className="block text-[10px] text-slate-450 mt-0.5">หากเว้นว่างไว้ ระบบจะคำนวณจากฐานเงินเดือน/ชั่วโมงงานปกติโดยอัตโนมัติ</span>
                            </>
                          ) : lang === "zh-TW" ? (
                            <>
                              各場景加班時薪 = <span className="font-semibold text-brand-700">計算基準費用</span> × <span className="font-semibold text-brand-700">對應場景倍率</span>。
                              <span className="block text-[10px] text-slate-450 mt-0.5">如果未指定「加班計算基準費用」，系統將使用該員工的 [時薪] 或是將 [日薪/月薪] 按每日 8 小時標準工作時間折算之時薪作為計算基準。</span>
                            </>
                          ) : (
                            <>
                              各场景加班时薪 = <span className="font-semibold text-brand-700">计算基准费用</span> × <span className="font-semibold text-brand-700">对应场景倍率</span>。
                              <span className="block text-[10px] text-slate-450 mt-0.5">如果未指定“加班计算基准费用”，系统将使用该员工的 [时薪] 或是将 [日薪/月薪] 按每日 8 小时标准工作时间折算的时薪作为计算基准。</span>
                            </>
                          )}
                        </div>
                      </div>
                    </div>
                  )}

                  {/* 个人所得税代扣比例 */}
                  <div className="border-t border-slate-100 pt-3">
                    <div className="flex items-center justify-between mb-1.5">
                      <Label className="block text-xs font-semibold text-slate-700">
                        {getTranslation("modal_employee_tax_rate", lang)}
                      </Label>
                      <span className="text-[11px] font-medium text-brand-600 bg-brand-50 px-2 py-0.5 rounded-full border border-brand-100">
                        {lang === "en" ? "Default: 5%" : lang === "th" ? "เริ่มต้น: 5%" : lang === "zh-TW" ? "預設：5%" : "默认：5%"}
                      </span>
                    </div>
                    <div className="relative">
                      <Input
                        type="number"
                        name="taxRate"
                        step="0.1"
                        min="0"
                        max="100"
                        value={formData.taxRate !== undefined && formData.taxRate !== null ? formData.taxRate : ""}
                        onChange={handleChange}
                        className="bg-white font-medium text-slate-900 pr-8"
                        placeholder="5"
                      />
                      <span className="absolute right-3 top-1/2 -translate-y-1/2 text-sm text-slate-400 font-bold pointer-events-none">%</span>
                    </div>
                    <span className="block text-[11px] text-slate-400 mt-1">
                      {getTranslation("modal_employee_tax_rate_desc", lang)}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* 3、发薪银行账户绑定 */}
        <div className="space-y-3">
          <h4 className="text-sm font-bold text-slate-800 flex items-center gap-2">
            <span className="w-1 bg-emerald-500 h-4 rounded-full"></span>
            {getTranslation("modal_employee_section2", lang)}
          </h4>
          <div className="bg-slate-50/50 rounded-xl p-4 border border-slate-200/60 space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3.5">
              <div>
                <Label className="block text-xs font-semibold text-slate-600 mb-1.5">
                  {getTranslation("modal_employee_bank_name", lang)}
                </Label>
                <Input 
                  type="text" 
                  name="bankName" 
                  value={formData.bankName || ""} 
                  onChange={handleChange} 
                  className="font-semibold text-slate-700 bg-white" 
                  placeholder={lang === "en" ? "e.g. Bangkok Bank, Kasikorn Bank, ICBC" : lang === "th" ? "เช่น ธนาคารกรุงเทพ, ธนาคารกสิกรไทย, ICBC" : lang === "zh-TW" ? "如：盤谷銀行 (Bangkok Bank)、大城銀行、中國工商銀行" : "如：盘谷银行 (Bangkok Bank)、大城银行、中国工商银行"} 
                />
              </div>
              <div>
                <Label className="block text-xs font-semibold text-slate-600 mb-1.5">
                  {getTranslation("modal_employee_bank_card", lang)}
                </Label>
                <Input 
                  type="text" 
                  name="bankCardNumber" 
                  value={formData.bankCardNumber || ""} 
                  onChange={handleChange} 
                  className="font-mono font-bold text-slate-700 bg-white" 
                  placeholder={lang === "en" ? "Please enter account or card number" : lang === "th" ? "กรุณาระบุเลขที่บัญชีหรือหมายเลขบัตร" : lang === "zh-TW" ? "請輸入發薪銀行卡號或賬戶號" : "请输入发薪银行卡号或账户号"} 
                />
              </div>
              <div>
                <Label className="block text-xs font-semibold text-slate-600 mb-1.5">
                  {lang === "en" ? "IC Card / ID Card No." : lang === "th" ? "หมายเลขบัตรประชาชน / IC Card" : lang === "zh-TW" ? "身分證字號 / IC Card / 護照號" : "身份证号 / IC Card / 护照号"}
                </Label>
                <Input 
                  type="text" 
                  name="idCard" 
                  value={formData.idCard || ""} 
                  onChange={handleChange} 
                  className="font-mono font-bold text-slate-700 bg-white" 
                  placeholder={lang === "en" ? "Please enter IC Card or passport number" : lang === "th" ? "กรุณาระบุหมายเลขบัตรประชาชน หรือ IC Card" : lang === "zh-TW" ? "請輸入身份證字號、IC Card或護照號" : "请输入身份证号、IC Card或护照号"} 
                />
              </div>
            </div>
          </div>
        </div>

        {/* 4、员工账号与安全密码配置 */}
        <div className="space-y-3">
          <h4 className="text-sm font-bold text-slate-800 flex items-center gap-2">
            <span className="w-1 bg-indigo-500 h-4 rounded-full"></span>
            {lang === "en" ? "4. APP Login Configuration" : lang === "th" ? "4. ตั้งค่าบัญชีผู้ใช้แอปพลิเคชัน" : lang === "zh-TW" ? "4、APP登錄賬戶配置" : "4、APP 登录账户配置"}
          </h4>
          <div className="bg-slate-50/50 rounded-xl p-4 border border-slate-200/60 space-y-4">
            <div className="grid grid-cols-2 gap-3.5">
              <div>
                <Label className="block text-xs font-semibold text-slate-600 mb-1.5">
                  {lang === "en" ? "APP Login Username" : lang === "th" ? "ชื่อผู้ใช้งานแอป" : lang === "zh-TW" ? "APP 登錄賬號" : "APP 登录账号"}
                </Label>
                <div className="flex gap-2">
                  <Input 
                    type="text" 
                    name="username" 
                    value={formData.username || ""} 
                    onChange={handleChange} 
                    className="font-semibold text-slate-700 bg-white" 
                    placeholder={
                      (() => {
                        const p = getWarehouseCountryPrefix(formData.warehouseCode || defaultWarehouseCode || "TH");
                        return lang === "en" ? `System default: ${p} + 4 digits (e.g. ${p}1001)` : lang === "th" ? `เริ่มต้นระบบ: ${p} + ตัวเลข 4 หลัก (เช่น ${p}1001)` : lang === "zh-TW" ? `系統默認：${p}+4位數字 (如 ${p}1001)` : `系统默认：${p}+4位数字 (如 ${p}1001)`;
                      })()
                    } 
                  />
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      const newAccount = generateAppAccount(formData.warehouseCode || defaultWarehouseCode || "TH");
                      setFormData(prev => ({ ...prev, username: newAccount }));
                    }}
                    className="h-9 px-3 text-xs font-semibold whitespace-nowrap bg-white shadow-xs"
                  >
                    {lang === "en" ? "Random" : lang === "th" ? "สุ่ม" : lang === "zh-TW" ? "隨機生成" : "随机生成"}
                  </Button>
                </div>
              </div>
              <div>
                <Label className="block text-xs font-semibold text-slate-600 mb-1.5">
                  {lang === "en" ? "Login Password" : lang === "th" ? "รหัสผ่านความปลอดภัย" : lang === "zh-TW" ? "安全登錄密碼" : "安全登录密码"} {!employee && <span className="text-red-500">*</span>}
                </Label>
                <div className="flex gap-2">
                  <Input 
                    type="text" 
                    name="password" 
                    value={formData.password || ""} 
                    onChange={handleChange} 
                    required={!employee}
                    className="font-mono font-bold text-slate-700 bg-white" 
                    placeholder={employee ? (lang === "en" ? "Leave blank to keep current password" : lang === "zh-TW" ? "留空則保持原密碼不變" : "留空则保持原密码不变") : (lang === "en" ? "Enter at least 6 characters" : lang === "th" ? "รหัสผ่าน 6 ตัวอักษรขึ้นไป" : lang === "zh-TW" ? "請輸入6位以上的密碼" : "请输入6位以上的密码")} 
                  />
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      const newPassword = Math.floor(100000 + Math.random() * 900000).toString();
                      setFormData(prev => ({ ...prev, password: newPassword }));
                    }}
                    className="h-9 px-3 text-xs font-semibold whitespace-nowrap bg-white shadow-xs"
                  >
                    {lang === "en" ? "Random" : lang === "th" ? "สุ่มรหัสผ่าน" : lang === "zh-TW" ? "隨機密碼" : "随机密码"}
                  </Button>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* 5、角色与后台管理权限设置 */}
        <div className="space-y-3">
          <h4 className="text-sm font-bold text-slate-800 flex items-center gap-2">
            <span className="w-1 bg-brand-500 h-4 rounded-full"></span>
            {getTranslation("modal_employee_section5", lang)}
          </h4>
          <div className="bg-slate-50/50 rounded-xl p-4 border border-slate-200/60 space-y-4">
            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="block text-xs font-bold text-slate-600 uppercase tracking-wide">
                  {lang === "en" ? "Preset Roles & Punch Checkboxes" : lang === "th" ? "บทบาทและตั้งค่าการลงเวลา" : lang === "zh-TW" ? "角色模板與考勤打卡設置" : "角色模板与考勤打卡设置"}
                </label>
                <span className="text-[11px] text-slate-400 font-medium">
                  {lang === "en" ? "Default: Attendance punch required" : lang === "th" ? "ค่าเริ่มต้น: ต้องลงเวลาทุกบทบาท" : lang === "zh-TW" ? "預設：所有角色均需考勤打卡" : "默认：所有角色均需考勤打卡"}
                </span>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5">
                {Object.keys(ROLE_PRESETS).map((presetName) => {
                  const isSelected = formData.role === presetName;
                  const isPunchRequired = roleAttendanceMap[presetName] ?? true;
                  return (
                    <div
                      key={presetName}
                      className={cn(
                        "flex items-center justify-between p-2 rounded-xl border transition-all duration-150 shadow-3xs",
                        isSelected
                          ? "bg-blue-50/70 border-blue-300 ring-1 ring-blue-400/30"
                          : "bg-white border-slate-200 hover:border-slate-300 hover:bg-slate-50/50"
                      )}
                    >
                      <button
                        type="button"
                        onClick={() => handlePresetRoleSelect(presetName)}
                        className="flex items-center gap-1.5 text-left flex-1 min-w-0 pr-2 group cursor-pointer"
                        title={lang === "en" ? `Apply ${presetName} template` : `应用「${presetName}」权限模板`}
                      >
                        <span className={cn(
                          "w-2 h-2 rounded-full flex-shrink-0 transition-colors",
                          isSelected ? "bg-blue-600 ring-2 ring-blue-200" : "bg-slate-300 group-hover:bg-slate-400"
                        )} />
                        <span className={cn(
                          "text-xs font-bold truncate",
                          isSelected ? "text-blue-700" : "text-slate-700 group-hover:text-blue-600"
                        )}>
                          {presetName}
                        </span>
                      </button>

                      <label
                        className="flex items-center gap-1.5 text-[11px] font-medium text-slate-600 cursor-pointer select-none bg-white/90 px-2 py-1 rounded-lg border border-slate-200/90 hover:bg-white hover:border-blue-200 transition-colors flex-shrink-0"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <input
                          type="checkbox"
                          checked={isPunchRequired}
                          onChange={(e) => handleToggleRoleAttendance(presetName, e.target.checked)}
                          className="rounded text-blue-600 focus:ring-blue-500 w-3.5 h-3.5 border-slate-300 cursor-pointer"
                        />
                        <span className={isPunchRequired ? "text-slate-700 font-semibold" : "text-slate-400"}>
                          {lang === "en" ? "Need Punch" : lang === "th" ? "ต้องลงเวลา" : lang === "zh-TW" ? "需要打卡" : "需要打卡"}
                        </span>
                      </label>
                    </div>
                  );
                })}
              </div>
              <p className="text-[10px] text-slate-400 mt-2">
                {lang === "en" 
                  ? "* Note: Each role has a punch checkbox (checked by default). Choosing a role applies its template and punch setting."
                  : lang === "th"
                    ? "* หมายเหตุ: แต่ละบทบาทมีช่องทำเครื่องหมายการลงเวลา (เลือกเป็นค่าเริ่มต้น) คลิกเพื่อเลือกแม่แบบ"
                    : lang === "zh-TW"
                      ? "* 提示：每個角色均配有「是否需要考勤打卡」勾選框（默認都需要）。點擊角色名稱可切換並套用權限模板。"
                      : "* 提示：每个角色均配有「是否需要考勤打卡」勾选框（默认都需要）。点击角色名称可切换并套用权限模板。"
                }
              </p>
            </div>

            <div className="border-t border-slate-200/60 pt-3">
              <div className="flex items-center justify-between mb-3">
                <span className="block text-xs font-black text-slate-700 uppercase tracking-wide">
                  {lang === "en" ? "Granular Permissions" : lang === "th" ? "รายละเอียดสิทธิ์การใช้งานระบบ" : lang === "zh-TW" ? "系統權限明細" : "系统权限明细"}
                </span>
                {isPermissionsLoading && (
                  <span className="inline-flex items-center gap-1.5 text-[11px] text-blue-600 font-medium bg-blue-50 px-2 py-0.5 rounded-md animate-fade-in">
                    <Loader2 className="w-3 h-3 animate-spin" />
                    {lang === "en" ? "Syncing permissions..." : "正在同步最新权限..."}
                  </span>
                )}
              </div>

              {/* Special superadmin badge */}
              {(formData.permissions || []).includes("*") && (
                <div className="mb-3 px-3 py-2 bg-emerald-50 border border-emerald-150 rounded-lg flex items-center gap-2 text-xs text-emerald-800 font-semibold animate-fade-in">
                  <Shield className="w-4 h-4 text-emerald-600 flex-shrink-0" />
                  {lang === "en" 
                    ? "Super Admin privileges active (access to all boards, business actions, and buttons)"
                    : lang === "th"
                      ? "เปิดใช้งานสิทธิ์ผู้ดูแลระบบสูงสุดแล้ว (เข้าถึงทุกฟังก์ชัน บอร์ด รายการ และปุ่มกด)"
                      : lang === "zh-TW"
                        ? "已開啟超級管理員特權 (擁有所有板塊、列表業務和按鈕功能的操作權限)"
                        : "已开启超级管理员特权 (拥有所有板块、列表业务和按钮功能的操作权限)"
                  }
                  <button
                    type="button"
                    onClick={() => setFormData(prev => ({ ...prev, permissions: [] }))}
                    className="text-[10.5px] text-red-500 hover:text-red-700 ml-auto font-black cursor-pointer"
                  >
                    {lang === "en" ? "Switch to Regular Control" : lang === "th" ? "สลับเป็นการควบคุมสิทธิ์ปกติ" : lang === "zh-TW" ? "切換為普通權限控制" : "切换为普通权限控制"}
                  </button>
                </div>
              )}
              <div className="space-y-4 max-h-[300px] overflow-y-auto pr-1 scrollbar-thin">
                {ALL_PERMISSIONS.map((group) => {
                  const isAllChecked = group.items.every(item => (formData.permissions || []).includes(item.id) || (formData.permissions || []).includes("*"));
                  const localizedCategory = CATEGORY_TRANSLATIONS[group.category]?.[lang] || group.category;
                  return (
                    <div key={group.category} className="border border-slate-200 rounded-xl bg-white overflow-hidden shadow-3xs">
                      <div className="bg-slate-100/65 px-3 py-2 border-b border-slate-200/60 flex items-center justify-between">
                        <span className="text-xs font-black text-slate-800">
                          {localizedCategory}
                        </span>
                        <button
                          type="button"
                          onClick={() => {
                            const isGroupChecked = group.items.every(i => (formData.permissions || []).includes(i.id));
                            group.items.forEach(item => {
                              handlePermissionChange(item.id, !isGroupChecked);
                            });
                          }}
                          disabled={!canManagePermissions || (formData.permissions || []).includes("*")}
                          className="text-[10px] text-brand-600 hover:text-brand-700 font-extrabold disabled:opacity-40"
                        >
                          {isAllChecked 
                            ? (lang === "en" ? "Unselect All" : lang === "th" ? "ยกเลิกทั้งหมด" : lang === "zh-TW" ? "取消全選" : "取消全选") 
                            : (lang === "en" ? "Select Group" : lang === "th" ? "เลือกทั้งกลุ่ม" : lang === "zh-TW" ? "全選本組" : "全选本组")
                          }
                        </button>
                      </div>
                      <div className="p-3 grid grid-cols-1 md:grid-cols-2 gap-3">
                        {group.items.map((item) => {
                          const isChecked = (formData.permissions || []).includes(item.id) || (formData.permissions || []).includes("*");
                          const isSuper = (formData.permissions || []).includes("*");
                          const loc = PERMISSION_TRANSLATIONS[item.id]?.[lang];
                          const itemLabel = loc?.label || item.label;
                          const itemDesc = loc?.desc || item.desc;
                          return (
                            <label
                              key={item.id}
                              className={cn(
                                "flex items-start gap-2.5 p-2 rounded-lg border text-left transition duration-150 select-none cursor-pointer",
                                isChecked 
                                  ? "bg-brand-50/40 border-brand-200" 
                                  : "bg-white hover:bg-slate-50 border-slate-200",
                                (isSuper || !canManagePermissions) && "opacity-75"
                              )}
                            >
                              <input
                                type="checkbox"
                                checked={isChecked}
                                disabled={!canManagePermissions || isSuper}
                                onChange={(e) => handlePermissionChange(item.id, e.target.checked)}
                                className="mt-0.5 rounded text-brand-600 focus:ring-brand-500 w-3.5 h-3.5 border-slate-300 disabled:opacity-40"
                              />
                              <div>
                                <p className="text-xs font-extrabold text-slate-800 leading-tight">
                                  {itemLabel}
                                </p>
                                <p className="text-[10px] text-slate-400 mt-0.5 leading-snug">
                                  {itemDesc}
                                </p>
                              </div>
                            </label>
                          );
                        })}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
      </form>
    </Modal>
    <SalaryChangeConfirmModal
      isOpen={showSalaryConfirmModal}
      onClose={() => setShowSalaryConfirmModal(false)}
      diffs={detectedSalaryDiffs}
      employeeName={formData.name || employee?.name || ""}
      employeeJoinDate={formData.joinDate || employee?.joinDate}
      isFixedSalary={Boolean(formData.baseMonthlyWage !== undefined && formData.baseMonthlyWage !== null && Number(formData.baseMonthlyWage) > 0)}
      isRehiring={Boolean((employee?.status === "离职" || (employee?.status as any) === "resigned") && formData.status && formData.status !== "离职")}
      isSubmitting={isSubmitting}
      lang={lang}
      onConfirm={async ({ changeReason: r, effectiveDate: d }) => {
        if (!pendingSavePayload) return;
        try {
          setIsSubmitting(true);
          await onSave({
            ...pendingSavePayload,
            changeReason: r.trim() ? r.trim() : undefined,
            effectiveDate: d.trim() ? d.trim() : undefined
          });
          setShowSalaryConfirmModal(false);
          setPendingSavePayload(null);
          onClose();
        } catch (err: any) {
          setErrorMsg(err?.message || (lang === "en" ? "Failed to save employee profile" : "保存员工档案失败，请稍后重试"));
          setShowSalaryConfirmModal(false);
          formContainerRef.current?.scrollTo({ top: 0, behavior: "smooth" });
        } finally {
          setIsSubmitting(false);
        }
      }}
    />
    </>
  );
}
