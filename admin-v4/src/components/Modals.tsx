/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { X, Upload, Trash2, Shield, Key, Lock, Info, UserMinus, Loader2, AlertCircle } from "lucide-react";
import { AppConfig, Employee, AttendanceRecord, CurrencyCode, CountryCode, Gender } from "../types";
import { cn } from "../lib/utils";
import React, { useState, useEffect, useRef } from "react";
import { getTranslation, Language } from "../lib/i18n";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "./ui/dialog";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { Label } from "./ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "./ui/select";
import { DatePicker } from "./ui/date-picker";
import { TimePicker } from "./ui/time-picker";


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

// --- Employee Modal ---
interface EmployeeModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (emp: Partial<Employee>) => Promise<void> | void;
  employee: Employee | null;
  canManagePermissions?: boolean;
  isPermissionsLoading?: boolean;
  defaultWarehouseCode?: string;
  lang?: Language;
}

// Role presets and associated permissions list
const ROLE_PRESETS = {
  "管理员": ["*"],
  "考勤专员": ["dashboard_view", "employees_view", "attendance_view", "attendance_edit", "leave_view", "leave_approve"],
  "仓储主管": ["dashboard_view", "customers_view", "goods_view", "goods_edit", "products_view", "products_edit", "orders_view", "orders_edit"],
  "财务出纳": ["dashboard_view", "payroll_view", "payroll_pay", "expenses_view", "expenses_approve", "customers_view", "customers_recharge"],
  "普通员工": ["dashboard_view", "sop_view"]
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
  const [formData, setFormData] = useState<Partial<Employee>>({
    name: "", gender: "female", country: "MM", warehouseCode: defaultWarehouseCode || "TH", role: "拣货员", dept: "",
    hourlyRate: undefined, baseMonthlyWage: undefined, dailyWage: undefined, attendanceBonus: undefined, socialSecurity: undefined, currency: "THB",
    joinDate: new Date().toISOString().split("T")[0], status: "在职", photo: null, sourceType: "自招", dispatchCommissionRate: undefined,
    otRuleType: "fixed", otFixedRate: undefined, otBaseRate: undefined, otMultiplierWorkday: 1.5, otMultiplierWeekend: 2.0, otMultiplierHoliday: 3.0,
    mealAllowanceDaily: undefined, idCard: "", username: "", password: ""
  });
  const [errorMsg, setErrorMsg] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const activeEmployeeIdRef = useRef<number | null>(null);

  useEffect(() => {
    setErrorMsg("");
    setIsSubmitting(false);
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
        setFormData({
          ...employee,
          warehouseCode: employee.warehouseCode || defaultWarehouseCode || "TH",
          sourceType: employee.sourceType || "自招",
          otRuleType: employee.otRuleType || "fixed",
          otMultiplierWorkday: employee.otMultiplierWorkday ?? 1.5,
          otMultiplierWeekend: employee.otMultiplierWeekend ?? 2.0,
          otMultiplierHoliday: employee.otMultiplierHoliday ?? 3.0,
          permissions: employee.permissions || [],
          idCard: employee.idCard || "",
          password: ""
        });
      } else {
        const randomPass = Math.floor(100000 + Math.random() * 900000).toString();
        setFormData({
          name: "", gender: "female", country: "MM", warehouseCode: defaultWarehouseCode || "TH", role: "拣货员", dept: "",
          hourlyRate: undefined, baseMonthlyWage: undefined, dailyWage: undefined, attendanceBonus: undefined, socialSecurity: undefined, currency: "THB",
          joinDate: new Date().toISOString().split("T")[0], status: "在职", photo: null, username: "", password: randomPass,
          sourceType: "自招", dispatchCommissionRate: undefined, otRuleType: "fixed", otFixedRate: undefined, otBaseRate: undefined,
          otMultiplierWorkday: 1.5, otMultiplierWeekend: 2.0, otMultiplierHoliday: 3.0,
          mealAllowanceDaily: undefined, permissions: [], idCard: ""
        });
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
    setFormData(prev => ({
      ...prev,
      role: presetName,
      permissions: presetPerms
    }));
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
      name === "mealAllowanceDaily"
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

        const hasBaseWage = formData.baseMonthlyWage !== undefined && formData.baseMonthlyWage !== null && formData.baseMonthlyWage > 0;
        const hasHourlyRate = formData.hourlyRate !== undefined && formData.hourlyRate !== null && formData.hourlyRate > 0;
        const hasDailyWage = formData.dailyWage !== undefined && formData.dailyWage !== null && formData.dailyWage > 0;
        if (!hasBaseWage && !hasHourlyRate && !hasDailyWage) {
          setErrorMsg(
            lang === "en" 
              ? "Please enter at least one of: Hourly Rate, Fixed Daily Wage, or Basic Monthly Wage!"
              : lang === "th"
                ? "กรุณาระบุอย่างน้อยหนึ่งรายการ: อัตราค่าจ้างรายชั่วโมง, อัตราค่าจ้างรายวัน หรือเงินเดือนพื้นฐาน!"
                : lang === "zh-TW"
                  ? "請至少輸入「時薪」、「固定日薪」或「基礎工資（為月工資）」其中的一項！"
                  : "请至少输入“时薪”、“固定日薪”或“基础工资（为月工资）”其中的一项！"
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
        
        const finalUsername = formData.username?.trim() || formData.name?.trim().toLowerCase().replace(/[^a-z0-9]/g, "") || "emp" + Date.now().toString().slice(-4);
        const finalPassword = formData.password?.trim() || (!employee ? Math.floor(100000 + Math.random() * 900000).toString() : undefined);
        const finalMealAllowanceDaily = formData.mealAllowanceDaily !== undefined && formData.mealAllowanceDaily !== null ? formData.mealAllowanceDaily : 0;
        const finalOtFixedRate = formData.otFixedRate !== undefined && formData.otFixedRate !== null ? formData.otFixedRate : 0;

        try {
          setIsSubmitting(true);
          await onSave({
            ...formData,
            photo: formData.photo ?? null,
            gender: formData.gender || "female",
            username: finalUsername,
            password: finalPassword,
            hourlyRate: formData.hourlyRate,
            baseMonthlyWage: formData.baseMonthlyWage,
            dailyWage: formData.dailyWage,
            mealAllowanceDaily: finalMealAllowanceDaily,
            otRuleType: formData.otRuleType || "fixed",
            otFixedRate: finalOtFixedRate,
            otBaseRate: formData.otBaseRate,
            otMultiplierWorkday: formData.otMultiplierWorkday ?? 1.5,
            otMultiplierWeekend: formData.otMultiplierWeekend ?? 2.0,
            otMultiplierHoliday: formData.otMultiplierHoliday ?? 3.0
          });
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
                  <Select name="country" value={formData.country || "MM"} onValueChange={(val) => setFormData(prev => ({ ...prev, country: val as CountryCode }))}>
                    <SelectTrigger className="w-full bg-white font-medium text-slate-700">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="MM">{lang === "en" ? "Myanmar" : lang === "th" ? "เมียนมา" : lang === "zh-TW" ? "緬甸籍" : "缅甸籍"}</SelectItem>
                      <SelectItem value="TH">{lang === "en" ? "Thailand" : lang === "th" ? "ไทย" : lang === "zh-TW" ? "泰國籍" : "泰国籍"}</SelectItem>
                      <SelectItem value="CN">{lang === "en" ? "China" : lang === "th" ? "จีน" : lang === "zh-TW" ? "中國籍" : "中国籍"}</SelectItem>
                      <SelectItem value="LA">{lang === "en" ? "Laos" : lang === "th" ? "ลาว" : lang === "zh-TW" ? "老撾籍" : "老挝籍"}</SelectItem>
                      <SelectItem value="KH">{lang === "en" ? "Cambodia" : lang === "th" ? "กัมพูชา" : lang === "zh-TW" ? "柬埔寨籍" : "柬埔寨籍"}</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label className="block text-xs font-semibold text-slate-600 mb-1.5">
                    {lang === "en" ? "Phone Number" : lang === "th" ? "เบอร์โทรศัพท์" : lang === "zh-TW" ? "聯繫電話" : "联系电话"}
                  </Label>
                  <Input type="text" name="phone" value={formData.phone || ""} onChange={handleChange} className="bg-white text-slate-700 font-medium" placeholder={lang === "en" ? "e.g. 0812345678" : lang === "th" ? "เช่น 0812345678" : lang === "zh-TW" ? "例如：0812345678" : "如：0812345678"} />
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
                  <Select name="warehouseCode" value={formData.warehouseCode || defaultWarehouseCode || "TH"} onValueChange={(val) => setFormData(prev => ({ ...prev, warehouseCode: val }))}>
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
                    <Input type="number" name="dispatchCommissionRate" step="0.1" min="0" max="100" value={formData.dispatchCommissionRate !== undefined ? formData.dispatchCommissionRate : ""} onChange={handleChange} className="border-blue-200 bg-blue-50/40 text-blue-700 font-semibold" placeholder="如: 5.5" />
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
              <div>
                <Label className="block text-xs font-semibold text-slate-600 mb-1.5">
                  {lang === "en" ? "Hourly Rate (optional)" : lang === "th" ? "อัตราค่าจ้างรายชั่วโมง (ถ้ามี)" : lang === "zh-TW" ? "時薪 (如不輸，則根據日薪或月薪計)" : "时薪 (如不输，则根据日薪或月薪计)"}
                </Label>
                <div className="relative">
                  <Input type="number" name="hourlyRate" step="0.5" value={formData.hourlyRate !== undefined ? formData.hourlyRate : ""} onChange={handleChange} className="bg-white font-medium" placeholder="如: 300" />
                  {formData.hourlyRate !== undefined && formData.hourlyRate > 0 && (
                    <span className="absolute right-3 top-2 text-xs text-slate-400 font-normal pointer-events-none">
                      ≈ {(formData.hourlyRate * 8 * 30).toLocaleString()} {formData.currency || "THB"}/月参考
                    </span>
                  )}
                </div>
              </div>

              <div>
                <Label className="block text-xs font-semibold text-slate-600 mb-1.5">
                  {lang === "en" ? "Fixed Daily Wage (optional)" : lang === "th" ? "อัตราค่าจ้างรายวัน (ถ้ามี)" : lang === "zh-TW" ? "固定日薪 (如不輸，則根據月薪或時薪計)" : "固定日薪 (如不输，则根据月薪或时薪计)"}
                </Label>
                <div className="relative">
                  <Input type="number" name="dailyWage" step="1" value={formData.dailyWage !== undefined ? formData.dailyWage : ""} onChange={handleChange} className="bg-white font-medium" placeholder="如: 1200" />
                  {formData.dailyWage !== undefined && formData.dailyWage > 0 && (
                    <span className="absolute right-3 top-2 text-xs text-slate-400 font-normal pointer-events-none">
                      ≈ {(formData.dailyWage / 8).toFixed(1)} {formData.currency || "THB"}/时折算
                    </span>
                  )}
                </div>
              </div>

              <div>
                <Label className="block text-xs font-semibold text-slate-600 mb-1.5">
                  {lang === "en" ? "Basic Monthly Wage (optional)" : lang === "th" ? "เงินเดือนพื้นฐาน (ถ้ามี)" : lang === "zh-TW" ? "固定月薪 (如不輸，則按日薪或時薪計)" : "固定月薪 (如不输，则按日薪或时薪计)"}
                </Label>
                <div className="relative">
                  <Input type="number" name="baseMonthlyWage" step="100" value={formData.baseMonthlyWage !== undefined ? formData.baseMonthlyWage : ""} onChange={handleChange} className="bg-white font-medium" placeholder="如: 60000" />
                  {formData.baseMonthlyWage !== undefined && formData.baseMonthlyWage > 0 && (
                    <span className="absolute right-3 top-2 text-xs text-slate-400 font-normal pointer-events-none">
                      ≈ {(formData.baseMonthlyWage / 30 / 8).toFixed(1)} {formData.currency || "THB"}/时折算
                    </span>
                  )}
                </div>
              </div>

              <div>
                <Label className="block text-xs font-semibold text-slate-600 mb-1.5">
                  {lang === "en" ? "Payout Currency" : lang === "th" ? "สกุลเงินเดือน" : lang === "zh-TW" ? "工資幣種" : "工资币种"}
                </Label>
                <Select name="currency" value={formData.currency || "THB"} onValueChange={(val) => setFormData(prev => ({ ...prev, currency: val as CurrencyCode }))}>
                  <SelectTrigger className="w-full bg-white font-medium text-slate-700">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="THB">泰铢 (฿ THB)</SelectItem>
                    <SelectItem value="USD">美金 ($ USD)</SelectItem>
                    <SelectItem value="MYR">马币 (RM MYR)</SelectItem>
                    <SelectItem value="IDR">印尼盾 (Rp IDR)</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label className="block text-xs font-semibold text-slate-600 mb-1.5">
                  {getTranslation("modal_employee_fixed_bonus", lang)}
                </Label>
                <Input type="number" name="attendanceBonus" step="1" value={formData.attendanceBonus !== undefined ? formData.attendanceBonus : ""} onChange={handleChange} className="bg-white font-medium" placeholder="如: 1000" />
              </div>

              <div>
                <Label className="block text-xs font-semibold text-slate-600 mb-1.5">
                  {getTranslation("modal_employee_social_security", lang)}
                </Label>
                <Input type="number" name="socialSecurity" step="1" value={formData.socialSecurity !== undefined ? formData.socialSecurity : ""} onChange={handleChange} className="bg-white font-medium" placeholder="如: 750" />
              </div>

              <div>
                <Label className="block text-xs font-semibold text-slate-600 mb-1.5">
                  {getTranslation("modal_employee_meal_allowance", lang)}
                </Label>
                <Input type="number" name="mealAllowanceDaily" step="1" value={formData.mealAllowanceDaily !== undefined ? formData.mealAllowanceDaily : ""} onChange={handleChange} className="bg-white font-medium text-slate-900" placeholder={lang === "en" ? "Default: 0" : lang === "th" ? "เริ่มต้น: 0" : lang === "zh-TW" ? "不填則默認為: 0" : "不填则默认为: 0"} />
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
                        value={formData.otFixedRate !== undefined ? formData.otFixedRate : ""}
                        onChange={handleChange}
                        className="bg-white font-medium text-slate-900"
                        placeholder={lang === "en" ? "Default: 0" : lang === "th" ? "เริ่มต้น: 0" : lang === "zh-TW" ? "默認：0" : "默认：0"}
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
                        <Input type="number" name="otBaseRate" step="1" value={formData.otBaseRate !== undefined ? formData.otBaseRate : ""} onChange={handleChange} className="bg-white font-medium text-slate-900" placeholder={lang === "en" ? "If blank, uses normal wages" : lang === "th" ? "หากเว้นว่าง ระบบจะคำนวณตามเงินเดือน" : lang === "zh-TW" ? "不填則系統按普通工資折算" : "不填则系统按普通工资折算"} />
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
                <Input 
                  type="text" 
                  name="username" 
                  value={formData.username || ""} 
                  onChange={handleChange} 
                  className="font-semibold text-slate-700 bg-white" 
                  placeholder={lang === "en" ? "System default: initials or custom name" : lang === "th" ? "เริ่มต้นระบบ: ชื่อย่อภาษาอังกฤษ" : lang === "zh-TW" ? "系統默認：姓名拼音或字母" : "系统默认：姓名拼音或字母"} 
                />
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
              <label className="block text-xs font-bold text-slate-500 mb-1.5 uppercase tracking-wide">
                {lang === "en" ? "Apply Preset Role Template" : lang === "th" ? "เลือกแม่แบบบทบาทลัด" : lang === "zh-TW" ? "一鍵應用角色權限模板" : "一键应用角色权限模板"}
              </label>
              <div className="flex flex-wrap gap-2">
                {Object.keys(ROLE_PRESETS).map((presetName) => (
                  <Button
                    key={presetName}
                    type="button"
                    variant={formData.role === presetName ? "default" : "outline"}
                    size="sm"
                    onClick={() => handlePresetRoleSelect(presetName)}
                    className={cn(
                      "text-xs font-bold shadow-3xs h-8",
                      formData.role === presetName ? "bg-blue-600 hover:bg-blue-700 text-white" : "bg-white border-slate-200 hover:border-blue-400 text-slate-700 hover:text-blue-600"
                    )}
                  >
                    {presetName}
                  </Button>
                ))}
              </div>
              <p className="text-[10px] text-slate-400 mt-1.5">
                {lang === "en" 
                  ? "* Note: Choosing a preset role will reset granular checkboxes. You can customize permissions individually below."
                  : lang === "th"
                    ? "* หมายเหตุ: การเลือกแม่แบบจะล้างสิทธิ์ที่ทำไว้ด้านล่าง คุณยังสามารถกำหนดสิทธิ์แต่ละอย่างได้อย่างละเอียดด้านล่างนี้"
                    : lang === "zh-TW"
                      ? "* 提示：選擇預設角色將自動重置權限勾選。您也可以在下方單獨勾選或取消勾選某些權限，支持精細化自由配置。"
                      : "* 提示：选择预设角色将自动重置权限勾选。您也可以在下方单独勾选或取消勾选某些权限，支持精细化自由配置。"
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
  );
}
export function DeleteModal({ isOpen, onClose, onConfirm, employeeName, lang = "zh-CN" }: { isOpen: boolean, onClose: () => void, onConfirm: () => Promise<void> | void, employeeName: string, lang?: Language }) {
  const [isDeleting, setIsDeleting] = useState(false);

  useEffect(() => {
    if (isOpen) setIsDeleting(false);
  }, [isOpen]);

  const handleConfirm = async () => {
    if (isDeleting) return;
    try {
      setIsDeleting(true);
      await onConfirm();
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => { if (!open && !isDeleting) onClose(); }}>
      <DialogContent className="max-w-md p-6 text-center sm:rounded-2xl">
        <DialogHeader className="flex flex-col items-center">
          <div className="w-16 h-16 bg-amber-100 rounded-full flex items-center justify-center text-amber-600 mx-auto mb-4">
            <UserMinus className="w-8 h-8" />
          </div>
          <DialogTitle className="text-lg font-bold text-slate-800 mb-2 text-center">
            {getTranslation("modal_delete_confirm_title", lang)}
          </DialogTitle>
          <DialogDescription className="text-sm text-slate-500 mb-4 leading-relaxed text-center">
            {lang === 'en' 
              ? `Are you sure you want to mark ${employeeName} as resigned? Historical attendance logs, work hours, and payroll records will remain securely archived in the system.`
              : lang === 'th'
                ? `คุณแน่ใจหรือไม่ว่าต้องการเปลี่ยนสถานะของ ${employeeName} เป็นลาออก? ประวัติการทำงาน เวลาเข้างาน และเงินเดือนทั้งหมดจะถูกเก็บถาวรในหมวดพนักงานลาออกอย่างปลอดภัย`
                : lang === 'zh-TW'
                  ? `您確定要將員工 ${employeeName} 辦理離職嗎？系統將完整保留該員工的歷史檔案、考勤打卡與薪資明細，可在「離職員工」列表中隨時查閱。`
                  : `您确定要将员工 ${employeeName} 办理离职吗？系统将完整保留该员工的系统档案、考勤打卡与薪资明细，可在「离职员工」列表中随时查阅。`}
          </DialogDescription>
        </DialogHeader>
        <DialogFooter className="flex flex-row gap-3 justify-center sm:justify-center">
          <Button 
            type="button" 
            variant="outline"
            onClick={onClose} 
            disabled={isDeleting}
            className="rounded-xl px-5"
          >
            {lang === 'en' ? "Cancel" : lang === 'th' ? "ยกเลิก" : lang === 'zh-TW' ? "取消" : "取消"}
          </Button>
          <Button 
            type="button" 
            onClick={handleConfirm} 
            disabled={isDeleting}
            className="rounded-xl px-5 bg-amber-600 hover:bg-amber-700 text-white font-bold shadow-md flex items-center justify-center gap-2"
          >
            {isDeleting && <Loader2 className="w-4 h-4 animate-spin" />}
            {isDeleting 
              ? (lang === 'en' ? "Processing..." : lang === 'th' ? "กำลังดำเนินการ..." : lang === 'zh-TW' ? "處理中..." : "处理中...") 
              : getTranslation("modal_delete_btn_confirm", lang)}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// --- Settings Modal ---
export function SettingsModal({ isOpen, onClose, onSave, onReset, config, lang = "zh-CN" }: { isOpen: boolean, onClose: () => void, onSave: (cfg: AppConfig) => Promise<void> | void, onReset: () => Promise<void> | void, config: AppConfig, lang?: Language }) {
  const [formData, setFormData] = useState<AppConfig>(config);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    setFormData(config);
  }, [config, isOpen]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isSubmitting) return;
    setIsSubmitting(true);
    try {
      await onSave(formData);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ 
      ...prev, 
      [name]: (name === 'otHourlyFee' || name === 'standardHours' || name === 'overtimeMultiplier' || name === 'taxRate' || name === 'dailyBreakMinutes' || name === 'companyLat' || name === 'companyLng') ? parseFloat(value) : value 
    }));
  };

  const handleSelectQuickLocation = (name: string, lat: number, lng: number) => {
    setFormData(prev => ({
      ...prev,
      companyAddress: name,
      companyLat: lat,
      companyLng: lng
    }));
  };

  return (
    <Modal 
      isOpen={isOpen} 
      onClose={onClose} 
      title={lang === 'en' ? "Attendance Settings" : lang === 'th' ? "ตั้งค่าการลงเวลา" : lang === 'zh-TW' ? "考勤設置" : "考勤设置"} 
      className="max-w-lg"
      headerClassName="bg-gradient-to-r from-brand-600 to-brand-700 text-white px-6 py-4.5 border-b border-brand-700/50"
      titleClassName="font-bold text-base tracking-tight text-white"
      closeButtonClassName="text-white/80 hover:text-white hover:bg-white/10 p-1.5 rounded-lg transition cursor-pointer"
    >
      <form onSubmit={handleSubmit} className="space-y-5">
        <div className="grid grid-cols-2 gap-4">
          <div className="bg-blue-50/70 p-3.5 rounded-xl border border-blue-100">
            <Label className="block text-xs font-semibold text-blue-800 mb-2 uppercase">
              {lang === 'en' ? "Shift Start" : lang === 'th' ? "เวลาเริ่มงาน" : lang === 'zh-TW' ? "上班時間" : "上班时间"}
            </Label>
            <TimePicker name="startShift" value={formData.startShift} onChange={handleChange} required className="bg-white border-blue-200 text-slate-700 font-mono text-center" />
          </div>
          <div className="bg-blue-50/70 p-3.5 rounded-xl border border-blue-100">
            <Label className="block text-xs font-semibold text-blue-800 mb-2 uppercase">
              {lang === 'en' ? "Shift End" : lang === 'th' ? "เวลาเลิกงาน" : lang === 'zh-TW' ? "下班時間" : "下班时间"}
            </Label>
            <TimePicker name="endShift" value={formData.endShift} onChange={handleChange} required className="bg-white border-blue-200 text-slate-700 font-mono text-center" />
          </div>
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div className="bg-amber-50/70 p-3.5 rounded-xl border border-amber-100">
            <Label className="block text-xs font-semibold text-amber-800 mb-2 uppercase">
              {lang === 'en' ? "Break Start" : lang === 'th' ? "เริ่มพักกลางวัน" : lang === 'zh-TW' ? "午休開始" : "午休开始"}
            </Label>
            <TimePicker name="breakStart" value={formData.breakStart} onChange={handleChange} required className="bg-white border-amber-200 text-slate-700 font-mono text-center" />
          </div>
          <div className="bg-amber-50/70 p-3.5 rounded-xl border border-amber-100">
            <Label className="block text-xs font-semibold text-amber-800 mb-2 uppercase">
              {lang === 'en' ? "Break End" : lang === 'th' ? "สิ้นสุดพักกลางวัน" : lang === 'zh-TW' ? "午休結束" : "午休结束"}
            </Label>
            <TimePicker name="breakEnd" value={formData.breakEnd} onChange={handleChange} required className="bg-white border-amber-200 text-slate-700 font-mono text-center" />
          </div>
        </div>
        <div className="bg-green-50 p-3 rounded-lg border border-green-100 hidden">
          <label className="block text-xs font-semibold text-green-800 mb-2 uppercase">加班费标准 (泰铢/小时)</label>
          <div className="flex items-center gap-2">
            <span className="text-lg font-bold text-green-700">฿</span>
            <input type="number" name="otHourlyFee" step="0.01" min="0" value={formData.otHourlyFee} onChange={handleChange} className="w-full px-3 py-2 bg-white border border-green-200 rounded-md text-slate-700 focus:ring-2 focus:ring-green-500 outline-none font-mono text-lg" />
            <span className="text-sm text-slate-500 whitespace-nowrap">/ 小时</span>
          </div>
        </div>

        {/* 公司地理位置设置 */}
        <div className="border-t border-slate-100 pt-4 space-y-3">
          <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wide flex items-center gap-1.5">
            <span className="w-1.5 h-3.5 bg-brand-500 rounded-full"></span>
            {lang === 'en' ? "📍 Company Worksite" : lang === 'th' ? "📍 ที่ตั้งสำนักงาน" : lang === 'zh-TW' ? "📍 公司辦公點" : "📍 公司办公点"}
          </h4>
          
          <div>
            <label className="block text-xs font-medium text-slate-500 mb-1">
              {lang === 'en' ? "Company Address" : lang === 'th' ? "ที่อยู่บริษัท" : lang === 'zh-TW' ? "公司地址" : "公司地址"}
            </label>
            <input 
              type="text" 
              name="companyAddress" 
              value={formData.companyAddress || ""} 
              onChange={(e) => setFormData(prev => ({ ...prev, companyAddress: e.target.value }))}
              required 
              className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-brand-500 outline-none" 
              placeholder={lang === 'en' ? "e.g. Yangon Logistics Hub" : lang === 'th' ? "เช่น ศูนย์กระจายสินค้ากรุงเทพฯ" : lang === 'zh-TW' ? "例如：仰光物流中心" : "例如：仰光物流中心"} 
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-slate-500 mb-1">
                {lang === 'en' ? "Longitude" : lang === 'th' ? "ลองจิจูด" : lang === 'zh-TW' ? "公司經度" : "公司经度"} (Longitude)
              </label>
              <input 
                type="number" 
                step="0.000001" 
                name="companyLng" 
                value={formData.companyLng !== undefined ? formData.companyLng : ""} 
                onChange={handleChange}
                required 
                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-brand-500 outline-none font-mono" 
                placeholder="例如：100.717390" 
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-500 mb-1">
                {lang === 'en' ? "Latitude" : lang === 'th' ? "ละติจูด" : lang === 'zh-TW' ? "公司緯度" : "公司纬度"} (Latitude)
              </label>
              <input 
                type="number" 
                step="0.000001" 
                name="companyLat" 
                value={formData.companyLat !== undefined ? formData.companyLat : ""} 
                onChange={handleChange}
                required 
                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-brand-500 outline-none font-mono" 
                placeholder="例如：13.578230" 
              />
            </div>
          </div>

          <div className="hidden">
            <label className="block text-[11px] text-slate-400 mb-1.5">快捷定位参考：</label>
            <div className="flex flex-wrap gap-1.5">
              <button
                type="button"
                onClick={() => handleSelectQuickLocation("仰光物流中心", 16.8661, 96.1951)}
                className="px-2.5 py-1 text-xs border border-slate-200 rounded-md hover:bg-slate-50 text-slate-600 transition cursor-pointer"
              >
                🇲🇲 仰光仓 (16.8661, 96.1951)
              </button>
              <button
                type="button"
                onClick={() => handleSelectQuickLocation("曼谷智能仓", 13.7563, 100.5018)}
                className="px-2.5 py-1 text-xs border border-slate-200 rounded-md hover:bg-slate-50 text-slate-600 transition cursor-pointer"
              >
                🇹🇭 曼谷仓 (13.7563, 100.5018)
              </button>
              <button
                type="button"
                onClick={() => handleSelectQuickLocation("广州运营总部", 23.1291, 113.2644)}
                className="px-2.5 py-1 text-xs border border-slate-200 rounded-md hover:bg-slate-50 text-slate-600 transition cursor-pointer"
              >
                🇨🇳 广州总部 (23.1291, 113.2644)
              </button>
            </div>
            <p className="mt-1.5 text-[10px] text-slate-400">
              提示：员工打卡时，系统将计算其设备位置与此地点的距离，若超出 <b>800米</b> 将自动标记为“异地打卡（偏离超过800米）”。
            </p>
          </div>
        </div>

        <div className="flex justify-end gap-3 pt-2 border-t border-slate-100">
          <button type="button" onClick={onReset} className="hidden px-4 py-2 text-sm font-medium text-slate-500 hover:bg-slate-100 rounded-lg transition">恢复默认</button>
          <button type="submit" disabled={isSubmitting} className="px-6 py-2.5 bg-brand-600 hover:bg-brand-700 text-white rounded-xl text-xs font-black transition cursor-pointer shadow-xs disabled:opacity-50">
            {isSubmitting ? (lang === 'en' ? "Saving..." : "保存中...") : (lang === 'en' ? "Save Settings" : lang === 'th' ? "บันทึกการตั้งค่า" : lang === 'zh-TW' ? "保存設置" : "保存设置")}
          </button>
        </div>
      </form>
    </Modal>
  );
}

// --- Attendance Adjustment Modal ---
export function AttendanceAdjustmentModal({ 
  isOpen, 
  onClose, 
  onSave, 
  record, 
  employees, 
  existingRecords = [],
  lang = "zh-CN" 
}: { 
  isOpen: boolean, 
  onClose: () => void, 
  onSave: (rec: Partial<AttendanceRecord>, isAdjustment?: boolean) => Promise<void> | void, 
  record: AttendanceRecord | null,
  employees: Employee[],
  existingRecords?: AttendanceRecord[],
  lang?: Language
}) {
  const [formData, setFormData] = useState<Partial<AttendanceRecord>>({
    date: '', type: 'normal', inTime: '08:30', outTime: '17:30', note: ''
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [autoFilledForDate, setAutoFilledForDate] = useState<string | null>(null);

  useEffect(() => {
    if (record) {
      setFormData(record);
      setAutoFilledForDate(null);
    }
  }, [record, isOpen]);

  const isManual = record?.id === 'new-manual';
  const emp = employees.find(e => e.id === Number(formData.empId || record?.empId));

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData(prev => {
      const next = { ...prev, [name]: value };
      if (name === "type") {
        if (value === "absent" || value === "leave") {
          next.inTime = "";
          next.outTime = "";
        } else if (!prev.inTime && !prev.outTime) {
          next.inTime = "08:30";
          next.outTime = "17:30";
        }
      }
      return next;
    });
  };

  // Anti-collision check: only in manual add mode when selecting an employee and date that already has a record
  const matchedExisting = React.useMemo(() => {
    if (!isManual || !formData.empId || !formData.date) return null;
    return (existingRecords || []).find(r => 
      Number(r.empId) === Number(formData.empId) && 
      r.date === formData.date && 
      String(r.id) !== String(record?.id)
    );
  }, [isManual, existingRecords, formData.empId, formData.date, record?.id]);

  // When conflict detected in manual add mode, auto-fill existing record data
  useEffect(() => {
    if (isManual && matchedExisting) {
      const conflictKey = String(matchedExisting.empId) + "_" + matchedExisting.date;
      if (autoFilledForDate !== conflictKey) {
        setFormData(prev => ({
          ...prev,
          inTime: matchedExisting.inTime || prev.inTime,
          outTime: matchedExisting.outTime || prev.outTime,
          type: matchedExisting.type || prev.type,
          note: prev.note || (matchedExisting.note ? "[调整] 原备注: " + matchedExisting.note : "")
        }));
        setAutoFilledForDate(conflictKey);
      }
    }
  }, [isManual, matchedExisting, autoFilledForDate]);

  // Lifecycle boundary validations
  const todayStr = React.useMemo(() => new Date().toISOString().slice(0, 10), []);
  const isFutureDate = Boolean(formData.date && formData.date > todayStr && formData.type !== 'leave');
  const isBeforeJoinDate = Boolean(emp?.joinDate && formData.date && formData.date < emp.joinDate);
  const isResignedEmp = emp?.status === '离职';

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isFutureDate) {
      alert("无法为未来日期录入出勤打卡事实（仅请假类型允许预先录入）");
      return;
    }
    if (isBeforeJoinDate) {
      alert("考勤日期（" + formData.date + "）早于员工入职日期（" + (emp?.joinDate || "") + "）");
      return;
    }
    if (isResignedEmp && isManual) {
      alert("该员工已离职，无法新增考勤记录");
      return;
    }

    try {
      setIsSubmitting(true);
      const isAdjustment = Boolean(!isManual || matchedExisting);
      await onSave(formData, isAdjustment);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Modal 
      isOpen={isOpen} 
      onClose={onClose} 
      title={isManual
        ? (matchedExisting
            ? "检测到已有记录 · 考勤调整"
            : (lang === 'en' ? "Add Attendance" : lang === 'th' ? "เพิ่มบันทึกเวลา" : lang === 'zh-TW' ? "手動新增考勤" : "手动新增考勤"))
        : (lang === 'en' ? "Adjust Attendance" : lang === 'th' ? "ปรับปรุงประวัติการเข้างาน" : lang === 'zh-TW' ? "調整考勤記錄" : "调整考勤记录")
      } 
      className="max-w-lg"
    >
      <form onSubmit={handleSubmit} className="space-y-5">
        {isManual && matchedExisting && (
          <div className="bg-amber-50 border border-amber-200 text-amber-800 rounded-xl p-3 text-xs flex items-start gap-2.5 shadow-2xs">
            <AlertCircle className="w-4 h-4 text-amber-600 flex-shrink-0 mt-0.5" />
            <div>
              <div className="font-bold text-amber-900">
                该员工在 {formData.date} 已有考勤记录
              </div>
              <div className="mt-1 text-amber-700 leading-relaxed">
                原打卡：{matchedExisting.inTime || "未打卡"} ~ {matchedExisting.outTime || "未打卡"}（类型：{matchedExisting.type}）。已为您自动切换至【考勤调整】模式并载入数据，保存时将记录变更。
              </div>
            </div>
          </div>
        )}

        {isBeforeJoinDate && (
          <div className="bg-rose-50 border border-rose-200 text-rose-800 rounded-xl p-2.5 text-xs flex items-center gap-2">
            <AlertCircle className="w-4 h-4 text-rose-600 flex-shrink-0" />
            <span>所选日期（{formData.date}）早于员工入职日期（{emp?.joinDate}），无法录入。</span>
          </div>
        )}

        {isFutureDate && (
          <div className="bg-rose-50 border border-rose-200 text-rose-800 rounded-xl p-2.5 text-xs flex items-center gap-2">
            <AlertCircle className="w-4 h-4 text-rose-600 flex-shrink-0" />
            <span>客观出勤打卡不能晚于今天（{todayStr}）。</span>
          </div>
        )}

        {isResignedEmp && isManual && (
          <div className="bg-rose-50 border border-rose-200 text-rose-800 rounded-xl p-2.5 text-xs flex items-center gap-2">
            <AlertCircle className="w-4 h-4 text-rose-600 flex-shrink-0" />
            <span>该员工已离职，无法新增考勤。</span>
          </div>
        )}

        {emp && !isManual ? (
          <div className="bg-slate-50 border border-slate-100 rounded-xl p-3 flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-slate-200 flex items-center justify-center text-slate-600 font-bold overflow-hidden border border-slate-200 shadow-sm flex-shrink-0">
              {emp.photo ? (
                <img src={emp.photo} className="w-full h-full object-cover" alt={emp.name} />
              ) : (
                <span className="text-sm">{emp.name.charAt(0)}</span>
              )}
            </div>
            <div>
              <div className="text-[11px] text-slate-400 font-medium">
                {lang === 'en' ? "Target Employee" : lang === 'th' ? "พนักงานเป้าหมาย" : lang === 'zh-TW' ? "考勤當事人" : "考勤当事人"}
              </div>
              <div className="text-sm font-bold text-slate-800">
                {emp.name}
                <span className="text-xs font-normal text-slate-500 ml-2">({emp.dept} · {emp.role})</span>
              </div>
            </div>
          </div>
        ) : (
          <div className="space-y-1">
            <label className="block text-xs font-semibold text-slate-500 uppercase">
              {lang === 'en' ? "Select Employee" : lang === 'th' ? "เลือกพนักงาน" : lang === 'zh-TW' ? "選擇員工" : "选择员工"} <span className="text-red-500">*</span>
            </label>
            <select
              name="empId"
              value={formData.empId || ''}
              onChange={(e) => setFormData(prev => ({ ...prev, empId: Number(e.target.value) }))}
              required
              className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm bg-white focus:ring-2 focus:ring-brand-500 outline-none text-slate-800 font-medium"
            >
              <option value="">{lang === 'en' ? "-- Select Employee --" : lang === 'th' ? "-- เลือกพนักงาน --" : lang === 'zh-TW' ? "-- 請選擇員工 --" : "-- 请选择员工 --"}</option>
              {employees.map((e) => (
                <option key={e.id} value={e.id}>
                  {e.name} ({e.dept || '无区域'} · {e.role || '无职位'}) {e.status === '离职' ? '(已离职)' : ''}
                </option>
              ))}
            </select>
          </div>
        )}
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-medium text-slate-500 mb-1 uppercase">
              {lang === 'en' ? "Date" : lang === 'th' ? "วันที่" : lang === 'zh-TW' ? "日期" : "日期"}
            </label>
            <DatePicker name="date" value={formData.date} onChange={handleChange} required className="bg-white" />
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-500 mb-1 uppercase">
              {lang === 'en' ? "Attendance Type" : lang === 'th' ? "ประเภทการเข้างาน" : lang === 'zh-TW' ? "考勤類型" : "考勤类型"}
            </label>
            <select name="type" value={formData.type} onChange={handleChange} className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-brand-500 outline-none text-sm bg-white">
              <option value="normal">{lang === 'en' ? "Normal" : lang === 'th' ? "ปกติ" : lang === 'zh-TW' ? "正常" : "正常"}</option>
              <option value="late">{lang === 'en' ? "Late" : lang === 'th' ? "สาย" : lang === 'zh-TW' ? "遲到" : "迟到"}</option>
              <option value="early">{lang === 'en' ? "Early Leave" : lang === 'th' ? "กลับก่อนเวลา" : lang === 'zh-TW' ? "早退" : "早退"}</option>
              <option value="absent">{lang === 'en' ? "Absent" : lang === 'th' ? "ขาดงาน" : lang === 'zh-TW' ? "缺勤" : "缺勤"}</option>
              <option value="leave">{lang === 'en' ? "On Leave" : lang === 'th' ? "ลาหยุด" : lang === 'zh-TW' ? "假期" : "假期"}</option>
              <option value="sick_leave">{lang === 'en' ? "Sick Leave" : lang === 'th' ? "ลาป่วย" : lang === 'zh-TW' ? "病假" : "病假"}</option>
              <option value="overtime">{lang === 'en' ? "Overtime" : lang === 'th' ? "ล่วงเวลา" : lang === 'zh-TW' ? "加班" : "加班"}</option>
              <option value="manual_adjusted">{lang === 'en' ? "Manual Adjusted" : lang === 'th' ? "ปรับปรุงด้วยตนเอง" : lang === 'zh-TW' ? "人工調整" : "人工调整"}</option>
            </select>
          </div>
        </div>
        {(() => {
          const isTimeRequired = formData.type !== "absent" && formData.type !== "leave" && formData.type !== "sick_leave";
          return (
            <div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium text-slate-500 mb-1 uppercase">
                    {lang === 'en' ? "Punch In" : lang === 'th' ? "เวลาเข้างาน" : lang === 'zh-TW' ? "上班時間" : "上班时间"}
                    {isTimeRequired && <span className="text-red-500 ml-0.5">*</span>}
                  </label>
                  <TimePicker 
                    name="inTime" 
                    value={formData.inTime || ""} 
                    onChange={handleChange} 
                    required={isTimeRequired} 
                    disabled={!isTimeRequired} 
                    className={cn("bg-white font-mono text-center", !isTimeRequired && "bg-slate-100 text-slate-400 cursor-not-allowed border-slate-200")} 
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-500 mb-1 uppercase">
                    {lang === 'en' ? "Punch Out" : lang === 'th' ? "เวลาเลิกงาน" : lang === 'zh-TW' ? "下班時間" : "下班时间"}
                    {isTimeRequired && <span className="text-red-500 ml-0.5">*</span>}
                  </label>
                  <TimePicker 
                    name="outTime" 
                    value={formData.outTime || ""} 
                    onChange={handleChange} 
                    required={isTimeRequired} 
                    disabled={!isTimeRequired} 
                    className={cn("bg-white font-mono text-center", !isTimeRequired && "bg-slate-100 text-slate-400 cursor-not-allowed border-slate-200")} 
                  />
                </div>
              </div>
              {!isTimeRequired && (
                <div className="text-[11px] text-slate-400 mt-1">缺勤、假期与病假类型无需记录打卡时间</div>
              )}
            </div>
          );
        })()}
        <div>
          <label className="block text-xs font-medium text-slate-500 mb-1 uppercase">
            {lang === 'en' ? "Adjustment Note" : lang === 'th' ? "หมายเหตุการปรับปรุง" : lang === 'zh-TW' ? "調整備註" : "调整备注"}
          </label>
          <textarea name="note" rows={2} value={formData.note} onChange={handleChange} className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-brand-500 outline-none text-sm resize-none" placeholder={lang === 'en' ? "e.g. Device failure or missed punch..." : lang === 'th' ? "เช่น อุปกรณ์ขัดข้องหรือลืมลงเวลา..." : lang === 'zh-TW' ? "如：設備故障或忘記打卡..." : "如：设备故障或忘记打卡..."}></textarea>
        </div>
        <div className="flex justify-end gap-3 pt-2 border-t border-slate-100">
          <button type="button" onClick={onClose} className="px-4 py-2 text-sm font-medium text-slate-500 hover:bg-slate-100 rounded-lg transition">
            {lang === 'en' ? "Cancel" : lang === 'th' ? "ยกเลิก" : lang === 'zh-TW' ? "取消" : "取消"}
          </button>
          <button 
            type="submit" 
            disabled={isSubmitting || isFutureDate || isBeforeJoinDate || (isResignedEmp && isManual)}
            className={cn(
              "px-6 py-2 text-sm font-medium text-white bg-brand-600 hover:bg-brand-700 rounded-lg shadow-md transition flex items-center gap-2 cursor-pointer",
              (isSubmitting || isFutureDate || isBeforeJoinDate || (isResignedEmp && isManual)) && "opacity-50 cursor-not-allowed"
            )}
          >
            {isSubmitting && <Loader2 className="w-4 h-4 animate-spin" />}
            {isManual && matchedExisting
              ? "保存调整"
              : isManual 
                ? (lang === 'en' ? "Add Attendance" : lang === 'th' ? "เพิ่มบันทึก" : lang === 'zh-TW' ? "確認並新增" : "确认并新增")
                : (lang === 'en' ? "Save Adjustments" : lang === 'th' ? "บันทึกการปรับปรุง" : lang === 'zh-TW' ? "保存調整" : "保存调整")
            }
          </button>
        </div>
      </form>
    </Modal>
  );
}
