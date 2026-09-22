import { useState, useEffect, useMemo, FormEvent, useRef, ChangeEvent } from "react";
import { BiometricTerminal } from './BiometricTerminal';
import { 
  Smartphone, Clock, MapPin, CheckCircle, Calendar, ChevronRight, LogOut, 
  BookOpen, FileText, Check, Plus, Coins, ArrowLeft, Award, Wifi, Battery,
  ShieldCheck, AlertCircle, RefreshCw, Upload, Sparkles, Send, History,
  Lock, User, Mail, ArrowRight, Eye, EyeOff, HelpCircle, UserPlus, Shield, Info, Search,
  Receipt, Wallet, Home, ClipboardCheck, Bell, X, Camera, Globe, Fingerprint, Zap,
  ChevronDown, ChevronUp, Download, ChevronLeft, Edit3, Trash2, Printer, ZoomIn, ZoomOut, Utensils, ChefHat,
  UserCheck, Sun, Moon, Loader2, Users, Filter, Settings
} from "lucide-react";
import { Employee, AttendanceRecord, AppConfig, SopDocument, ExpenseRecord, TabId, Gender, CountryCode, CurrencyCode, HolidayRecord, LeaveRequest } from "../types";
import { motion, AnimatePresence } from "motion/react";
import { calcAttendanceDetails, formatCurrency, formatDuration, COUNTRY_FLAGS, COUNTRY_NAMES, calcOvertimePay, cn } from "../lib/utils";
import { jsPDF } from "jspdf";
import html2canvas from "html2canvas";
import { RecipeDocumentView } from "./RecipeDocumentView";

function getDistanceInMeters(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 6371e3; // metres
  const phi1 = lat1 * Math.PI/180;
  const phi2 = lat2 * Math.PI/180;
  const deltaPhi = (lat2-lat1) * Math.PI/180;
  const deltaLambda = (lng2-lng1) * Math.PI/180;

  const a = Math.sin(deltaPhi/2) * Math.sin(deltaPhi/2) +
            Math.cos(phi1) * Math.cos(phi2) *
            Math.sin(deltaLambda/2) * Math.sin(deltaLambda/2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));

  return Math.round(R * c);
}

interface EmployeeAppProps {
  employees: Employee[];
  onUpdateEmployees: (updated: Employee[]) => void;
  attendance: AttendanceRecord[];
  config: AppConfig;
  onUpdateAttendance: (updated: AttendanceRecord[]) => void;
  addToast: (msg: string) => void;
  onNavigateToTab: (tabId: TabId) => void;
  holidays: HolidayRecord[];
  leaveRequests?: LeaveRequest[];
  onUpdateLeaveRequests?: (updated: LeaveRequest[]) => void;
}

const TRANSLATIONS: Record<string, Record<string, string>> = {
  "zh-CN": {
    "my_center": "个人中心",
    "home": "首页",
    "attendance": "考勤请假",
    "sop": "SOP",
    "my": "我的",
    "dept": "部门",
    "role": "岗位",
    "join_date": "入职日期",
    "hourly_rate": "岗位基准时薪",
    "base_currency": "结算本位币",
    "reim_title": "报销单",
    "reim_add": "添加",
    "reim_desc": "提报代垫款项凭证，将自动生成报销审批流。审核通过后将即时加拨入本月实发工资单中。",
    "reim_history": "报销记录",
    "reim_none": "暂无报销记录",
    "reim_form_title": "添加报销单",
    "reim_name_label": "费用名称",
    "reim_name_placeholder": "如: 6月办公用品采购 / 叉车加油",
    "reim_type_label": "费用类别",
    "reim_currency_label": "报销币种",
    "reim_amount_label": "报销金额 *",
    "reim_amount_placeholder": "输入实付代垫金额",
    "reim_receipt_label": "上传本地凭证",
    "reim_note_label": "备注说明",
    "reim_note_placeholder": "补充说明采购规格和用途",
    "reim_submit": "提交审批申请",
    "reim_back": "返回",
    "reim_success": "费用报销申请已成功提交至后台审批",
    "reim_pending": "待审批",
    "reim_approved": "已通过",
    "reim_rejected": "已拒绝",
    "reim_cancel": "取消",
    "lang_toast": "语言已成功切换为：",
    "attendance_center": "考勤",
    "sop_center": "通知公告",
    "loading": "请稍候...",
    "info_success": "🎉 个人头像更新成功！已同步至后台系统！",
    "today": "今日",
    "punched": "已打卡",
    "not_punched": "未打卡",
    "sys_time": "系统时间",
    "shift_in": "上班时间",
    "shift_out": "下班时间",
    "bangkok_wh": "曼谷 Warehouse A · 精度 3.2m",
    "beijing_wh": "北京智能冷链1号仓 · 精度 1.2m",
    "yangon_wh": "仰光物流转运中心 · 精度 4.5m",
    "hcmc_wh": "胡志明市分拨中心 · 精度 2.8m",
    "phnompenh_wh": "金边集散地仓 · 精度 3.5m",
    "shanghai_wh": "上海一号配送中心 · 精度 1.2m",
    "punch_in_btn": "上班打卡",
    "punch_out_btn": "下班打卡",
    "hours_this_month": "本月工时",
    "days_worked": "出勤天数",
    "pending_sops": "待办SOP",
    "sys_notification": "通知公告",
    "view_all": "查看全部",
    "fire_drill_title": "仓库消防演练通知",
    "fire_drill_desc": "本周五下午 14:00 全员参与...",
    "fire_drill_content": "为提高仓库全员安全意识及防灾应急响应能力，定于本周五下午 14:00 举行全员消防灭火与紧急疏散逃生实战演练。请各拣货、叉车及打包组组长提前协调班组作业，确保演练期间人身安全与设备断电，全员准时在A区大门外空地集合签到。",
    "payslip_notif_title": "4月工资条已生成",
    "payslip_notif_desc": "请前往个人中心查看详情...",
    "payslip_notif_toast": "正在为您载入本月电子加密薪资单。",
    "no_more_notif": "🔔 当前无更多历史通知记录",
    "calendar_header": "考勤",
    "request_leave": "申请请假",
    "leave_type": "请假类型",
    "leave_days": "请假天数",
    "start_date": "起始日期",
    "end_date": "结束日期",
    "leave_reason_label": "请假事由说明（选填）",
    "leave_reason_placeholder": "请输入请假具体原因（选填），以便部门主管审批。",
    "leave_submit": "提交",
    "calendar_normal": "正常",
    "calendar_late": "迟到",
    "calendar_leave": "请假",
    "leave_detail": "请假记录",
    "leave_approved": "已核准",
    "punch_log": "打卡记录",
    "punch_count_month": "本月已签 {count} 次",
    "no_punch_log": "本月暂无打卡记录",
    "punch_log_row": "上班签到: {inTime} • 下班签退: {outTime}",
    "training_docs": "培训文档",
    "announcements": "通知公告",
    "back_to_list": "返回",
    "sop_instructions_title": "签署承诺须知：",
    "sop_instructions_content": "认真学习并掌握岗位相关内容，是维护安全、高效运行的红线准则。确认签署后，您的已阅及承诺日志将即时上传并存至系统档案中。",
    "sop_checkbox": "我已认真阅读、理解该标准，并保证在今后作业中严格遵守此文档方案。",
    "sop_agree_btn": "确认已阅并承诺遵守",
    "sop_empty": "暂无该分类下分配给您的文档",
    "sop_read": "已阅签",
    "sop_unread": "待学签",
    "sop_publish_date": "发布:",
    "sop_publisher": "发布人:",
    "e_payslip": "电子薪资单",
    "emp_id_label": "工号:",
    "flag_domestic": "中国",
    "flag_thai": "泰国",
    "flag_myanmar": "缅甸",
    "flag_vietnam": "越南",
    "flag_cambodia": "柬埔寨",
    "flag_intl": "外籍",
    "flag_suffix": "籍员工",
    "attendance_accounting": "考勤出勤核算",
    "std_work_hours": "标准计薪时限 (每日)",
    "hours_per_day": "{hours} 小时/天",
    "working_days_month": "有效上班天数",
    "days_unit": "{days} 天",
    "valid_hours_month": "累计上班工时",
    "ot_hours_month": "有效加班工时",
    "ot_count_unit": "{count}次",
    "payslip_detail": "应发核算明细 (工资构成)",
    "base_salary_monthly": "基础工资 (月薪计)",
    "monthly_unit": "{amount}/月",
    "days_pay_calc": "核算天数工资 (底薪/30 × {days}天)",
    "ot_pay_calc": "加班应得 (时薪 × {hours}h)",
    "bonus_pay_calc": "全勤奖 (考勤津贴)",
    "meal_allowance_calc": "餐饮费 (餐补)",
    "tax_withholding": "所得税代扣 ({rate}%)",
    "social_security": "社保扣款 (社会保障金)",
    "approved_reimbursement": "已审批垫付报销 (实报实销)",
    "net_payout_title": "本月实际应发放 (税后净得)",
    "payout_currency_label": "发放币种:",
    "signed_status": "已电子核对并签收",
    "signed_payout_desc": "本人已于系统完成电子签名，核对上述工资条明细无误，核销已发放，资金已入个人指定账户。",
    "signatory": "签署人:",
    "safety_receipt_title": "安全电子签收回执 (待签收)",
    "receipt_pledge": "我已认真阅读上述考勤工作时长及薪酬明细，确认金额无误，且已知悉此工资条等同于纸质签名回执。",
    "signature_input_label": "电子签名签署 (请点击下方进行手写签名)",
    "signature_placeholder": "请点击下方手写您的姓名",
    "sign_confirm_btn": "我已确认",
    "pleas_check_receipt": "请先勾选已认真阅读并确认选项！",
    "please_sign_correctly": "为了电子签名有效性，请完整且准确地输入您的姓名 \"{name}\"！",
    "sign_success_toast": "🎉 电子工资单签收成功！数据已实时核销并同步至财务后台！",
    "back_previous": "返回上一级",
    "personal_leave": "事假",
    "sick_leave": "病假",
    "annual_leave": "年假",
    "special_leave": "婚产假",
    "late_badge": "迟到打卡",
    "all_punched_toast": "🎉 您今天已完成考勤签退，明天见！",
    "expense_supplies": "物耗杂费",
    "expense_maintenance": "设备维护费",
    "expense_utilities": "水电动力费",
    "expense_travel": "差旅补贴",
    "language_settings": "语言设置",
    "payslip_unreleased": "工资条尚未发布",
    "payslip_unreleased_desc": "您本月的工资单正在核算与审核中，发布后您将收到系统通知。如有疑问，请咨询人事或财务管理员。"
  },
  "zh-TW": {
    "my_center": "個人中心",
    "home": "首頁",
    "attendance": "考勤請假",
    "sop": "SOP",
    "my": "我的",
    "dept": "部門",
    "role": "崗位",
    "join_date": "入職日期",
    "hourly_rate": "崗位基準時薪",
    "base_currency": "結算本位幣",
    "reim_title": "報銷單",
    "reim_add": "添加",
    "reim_desc": "提報代墊款項憑證，將自動生成報銷審批流。審核通過後將即時加撥入本月實發工資單中。",
    "reim_history": "報銷記錄",
    "reim_none": "暫無報銷記錄",
    "reim_form_title": "添加報銷單",
    "reim_name_label": "費用名稱",
    "reim_name_placeholder": "如: 6月辦公用品採購 / 叉車加油",
    "reim_type_label": "費用類別",
    "reim_currency_label": "報銷幣種",
    "reim_amount_label": "報銷金額 *",
    "reim_amount_placeholder": "輸入實付代墊金額",
    "reim_receipt_label": "上傳本地憑證",
    "reim_note_label": "備註說明",
    "reim_note_placeholder": "補充說明採購規格和用途",
    "reim_submit": "提交審批申請",
    "reim_back": "返回",
    "reim_success": "費用報銷申請已成功提交至后台審批",
    "reim_pending": "待審批",
    "reim_approved": "已通過",
    "reim_rejected": "已拒絕",
    "reim_cancel": "取消",
    "lang_toast": "語言已成功切換為：",
    "attendance_center": "考勤",
    "sop_center": "通知公告",
    "loading": "請稍候...",
    "info_success": "🎉 個人頭像更新成功！已同步至后台系統！",
    "today": "今日",
    "punched": "已打卡",
    "not_punched": "未打卡",
    "sys_time": "系統時間",
    "shift_in": "上班時間",
    "shift_out": "下班時間",
    "bangkok_wh": "曼谷 Warehouse A · 精度 3.2m",
    "beijing_wh": "北京智能冷鏈1號倉 · 精度 1.2m",
    "yangon_wh": "仰光物流轉運中心 · 精度 4.5m",
    "hcmc_wh": "胡志明市分撥中心 · 精度 2.8m",
    "phnompenh_wh": "金邊集散地倉 · 精度 3.5m",
    "shanghai_wh": "上海一號配送中心 · 精度 1.2m",
    "punch_in_btn": "上班打卡",
    "punch_out_btn": "下班打卡",
    "hours_this_month": "本月工時",
    "days_worked": "出勤天數",
    "pending_sops": "待辦SOP",
    "sys_notification": "通知公告",
    "view_all": "查看全部",
    "fire_drill_title": "倉庫消防演練通知",
    "fire_drill_desc": "本週五下午 14:00 全員參與...",
    "fire_drill_content": "為提高倉庫全員安全意識及防災應急響應能力，定於本週五下午 14:00 舉行全員消防滅火與緊急疏散逃生實戰演練。請各揀貨、叉車及打包組組長提前協調班組作業，確保演練期間人身安全與設備斷電，全員準時在A區大門外空地集合簽到。",
    "payslip_notif_title": "4月工資條已生成",
    "payslip_notif_desc": "請前往個人中心查看詳情...",
    "payslip_notif_toast": "正在為您載入本月電子加密薪資單。",
    "no_more_notif": "🔔 當前無更多歷史通知記錄",
    "calendar_header": "考勤",
    "request_leave": "申請請假",
    "leave_type": "請假類型",
    "leave_days": "請假天數",
    "start_date": "起始日期",
    "end_date": "結束日期",
    "leave_reason_label": "請假事由說明（選填）",
    "leave_reason_placeholder": "請輸入請假具體原因（選填），以便部門主管審批。",
    "leave_submit": "提交",
    "calendar_normal": "正常",
    "calendar_late": "遲到",
    "calendar_leave": "請假",
    "leave_detail": "請假記錄",
    "leave_approved": "已核準",
    "punch_log": "打卡記錄",
    "punch_count_month": "本月已簽 {count} 次",
    "no_punch_log": "本月暫無打卡記錄",
    "punch_log_row": "上班簽到: {inTime} • 下班簽退: {outTime}",
    "training_docs": "培訓文檔",
    "announcements": "通知公告",
    "back_to_list": "返回",
    "sop_instructions_title": "簽署承諾須知：",
    "sop_instructions_content": "認真學習並掌握崗位相關內容，是維護安全、高效運行的紅線準則。確認簽署後，您的已閱及承諾日誌將即時上傳並存至系統檔案中。",
    "sop_checkbox": "我已認真閱讀、理解該標準，並保證在今後作業中嚴格遵守此文檔方案。",
    "sop_agree_btn": "確認已閱並承諾遵守",
    "sop_empty": "暫無該分類下分配給您的文檔",
    "sop_read": "已閱簽",
    "sop_unread": "待學簽",
    "sop_publish_date": "發布:",
    "sop_publisher": "發布人:",
    "e_payslip": "電子薪資單",
    "emp_id_label": "工號:",
    "flag_domestic": "中國",
    "flag_thai": "泰國",
    "flag_myanmar": "緬甸",
    "flag_vietnam": "越南",
    "flag_cambodia": "柬埔寨",
    "flag_intl": "外籍",
    "flag_suffix": "籍員工",
    "attendance_accounting": "考勤出勤核算",
    "std_work_hours": "標準計薪時限 (每日)",
    "hours_per_day": "{hours} 小時/天",
    "working_days_month": "有效上班天數",
    "days_unit": "{days} 天",
    "valid_hours_month": "累計上班工時",
    "ot_hours_month": "有效加班工時",
    "ot_count_unit": "{count}次",
    "payslip_detail": "應發核算明細 (工資構成)",
    "base_salary_monthly": "基礎工資 (月薪計)",
    "monthly_unit": "{amount}/月",
    "days_pay_calc": "核算天數工資 (底薪/30 × {days}天)",
    "ot_pay_calc": "加班應得 (時薪 × {hours}h)",
    "bonus_pay_calc": "全勤獎 (考勤津貼)",
    "meal_allowance_calc": "餐飲費 (餐補)",
    "tax_withholding": "所得稅代扣 ({rate}%)",
    "social_security": "社保扣款 (社會保障金)",
    "approved_reimbursement": "已審批墊付報銷 (實報實銷)",
    "net_payout_title": "本月實際應發放 (稅後淨得)",
    "payout_currency_label": "發放幣種:",
    "signed_status": "已電子核對並簽收",
    "signed_payout_desc": "本人已於系統完成電子簽名，核對上述工資條明细無誤，核銷已發放，資金已入個人指定賬戶。",
    "signatory": "簽署人:",
    "safety_receipt_title": "安全電子簽收回執 (待簽收)",
    "receipt_pledge": "我已認真閱讀上述考勤工作時長及薪酬明細，確認金額無誤，且已知悉此工資條等同於紙質簽名回執。",
    "signature_input_label": "電子簽名簽署 (請點擊下方進行手寫簽名)",
    "signature_placeholder": "請點擊下方手寫您的姓名",
    "sign_confirm_btn": "我已確認",
    "pleas_check_receipt": "請先勾選已認真閱讀並確認選項！",
    "please_sign_correctly": "為了電子簽名有效性，請完整且準確地輸入您的姓名 \"{name}\"！",
    "sign_success_toast": "🎉 電子工資單簽收成功！數據已實時核銷並同步至財務後台！",
    "back_previous": "返回上一級",
    "personal_leave": "事假",
    "sick_leave": "病假",
    "annual_leave": "年假",
    "special_leave": "婚產假",
    "late_badge": "遲到打卡",
    "all_punched_toast": "🎉 您今天已完成考勤簽退，明天见！",
    "expense_supplies": "物耗雜費",
    "expense_maintenance": "設備維護費",
    "expense_utilities": "電力水費",
    "expense_travel": "差旅補貼",
    "language_settings": "語言設置",
    "payslip_unreleased": "工資條尚未發布",
    "payslip_unreleased_desc": "您本月的工資單正在核算與審核中，發布後您將收到系統通知。如有疑問，請諮詢人事或財務管理員。"
  },
  "en": {
    "my_center": "Personal Center",
    "home": "Home",
    "attendance": "Attendance",
    "sop": "SOP",
    "my": "Me",
    "dept": "Department",
    "role": "Role",
    "join_date": "Join Date",
    "hourly_rate": "Base Hourly Rate",
    "base_currency": "Settlement Currency",
    "reim_title": "Reimbursement Application",
    "reim_add": "Add",
    "reim_desc": "Submit backup receipts to auto-generate a reimbursement flow. Once approved, it will be added to this month's payroll.",
    "reim_history": "History Logs",
    "reim_none": "No reimbursement logs found",
    "reim_form_title": "Add Reimbursement",
    "reim_name_label": "Purpose/Expense Name *",
    "reim_name_placeholder": "e.g., Forklift fuel / Protective gloves",
    "reim_type_label": "Expense Type",
    "reim_currency_label": "Currency",
    "reim_amount_label": "Amount *",
    "reim_amount_placeholder": "Enter exact amount paid",
    "reim_receipt_label": "Receipt Attachment",
    "reim_note_label": "Note",
    "reim_note_placeholder": "Add detailed specifications & purpose",
    "reim_submit": "Submit for Approval",
    "reim_back": "Back",
    "reim_success": "Reimbursement application submitted successfully to background approval",
    "reim_pending": "Pending",
    "reim_approved": "Approved",
    "reim_rejected": "Rejected",
    "reim_cancel": "Cancel",
    "lang_toast": "Language switched to: ",
    "attendance_center": "Attendance & Leave Center",
    "sop_center": "Message Notifications",
    "loading": "Please wait...",
    "info_success": "🎉 Photo updated successfully! Synchronized to admin console!",
    "today": "Today",
    "punched": "Punched",
    "not_punched": "Not Punched",
    "sys_time": "System Time",
    "shift_in": "Shift In",
    "shift_out": "Shift Out",
    "bangkok_wh": "Bangkok Warehouse A · Accu 3.2m",
    "beijing_wh": "Beijing Smart Cold Chain Wh 1 · Accu 1.2m",
    "yangon_wh": "Yangon Logistics Center · Accu 4.5m",
    "hcmc_wh": "HCMC Distribution Center · Accu 2.8m",
    "phnompenh_wh": "Phnom Penh Depot Wh · Accu 3.5m",
    "shanghai_wh": "Shanghai Wh 1 · Accu 1.2m",
    "punch_in_btn": "Punch In",
    "punch_out_btn": "Punch Out",
    "hours_this_month": "Hours",
    "days_worked": "Days",
    "pending_sops": "Pending SOPs",
    "sys_notification": "Message Notifications",
    "view_all": "View All",
    "fire_drill_title": "Warehouse Fire Drill Notification",
    "fire_drill_desc": "All staff participation this Friday at 14:00...",
    "fire_drill_content": "To improve safety awareness and emergency response capability, a full-staff fire drill and emergency evacuation exercise is scheduled for Friday at 14:00. Team leaders please coordinate work, ensure safety and power off equipment, and gather for sign-in outside Area A main gate on time.",
    "payslip_notif_title": "April Payslip Generated",
    "payslip_notif_desc": "Please check details in your Personal Center...",
    "payslip_notif_toast": "Loading your encrypted electronic payslip for this month.",
    "no_more_notif": "🔔 No more historical notifications currently",
    "calendar_header": "Attendance & Leave Center",
    "request_leave": "Request Leave",
    "leave_type": "Leave Type",
    "leave_days": "Leave Days",
    "start_date": "Start Date",
    "end_date": "End Date",
    "leave_reason_label": "Leave Reason (Optional)",
    "leave_reason_placeholder": "Enter detailed reason for manager's approval.",
    "leave_submit": "Submit",
    "calendar_normal": "Normal",
    "calendar_late": "Late",
    "calendar_leave": "Leave",
    "leave_detail": "Leave Records",
    "leave_approved": "Approved",
    "punch_log": "Punch Logs",
    "punch_count_month": "Checked in {count} times this month",
    "no_punch_log": "No punch records this month",
    "punch_log_row": "Check In: {inTime} • Check Out: {outTime}",
    "training_docs": "Training",
    "announcements": "Announcements",
    "back_to_list": "Back to List",
    "sop_instructions_title": "Pledge Agreement Instructions:",
    "sop_instructions_content": "Studying and mastering guidelines is vital for safety and efficient operations. Once pledged, your read status and log will be synced with the archives.",
    "sop_checkbox": "I have carefully read, understood this guideline, and pledge to strictly follow it in my future work.",
    "sop_agree_btn": "Acknowledge & Pledge",
    "sop_empty": "No assigned documents in this category",
    "sop_read": "Read",
    "sop_unread": "To Read",
    "sop_publish_date": "Pub:",
    "sop_publisher": "By:",
    "e_payslip": "Electronic Payslip",
    "emp_id_label": "Emp ID:",
    "flag_domestic": "China",
    "flag_thai": "Thailand",
    "flag_myanmar": "Myanmar",
    "flag_vietnam": "Vietnam",
    "flag_cambodia": "Cambodia",
    "flag_intl": "Foreign",
    "flag_suffix": " Citizen",
    "attendance_accounting": "Attendance Summary",
    "std_work_hours": "Std Work Hours (Daily)",
    "hours_per_day": "{hours} hrs/day",
    "working_days_month": "Effective Days",
    "days_unit": "{days} days",
    "valid_hours_month": "Cumulative Work Hours",
    "ot_hours_month": "Overtime Work Hours",
    "ot_count_unit": "{count} times",
    "payslip_detail": "Compensation Details",
    "base_salary_monthly": "Base Salary (Monthly)",
    "monthly_unit": "{amount}/mo",
    "days_pay_calc": "Pro-rated Base Pay (Base/30 × {days}d)",
    "ot_pay_calc": "Overtime Pay (Rate × {hours}h)",
    "bonus_pay_calc": "Attendance Bonus",
    "meal_allowance_calc": "Meal Allowance (Food Subsidy)",
    "tax_withholding": "Income Tax ({rate}%)",
    "social_security": "Social Security",
    "approved_reimbursement": "Reimbursement (Approved)",
    "net_payout_title": "Net Payout",
    "payout_currency_label": "Currency:",
    "signed_status": "Digitally Signed",
    "signed_payout_desc": "I have digitally signed, verified the details, and acknowledge the funds are transferred to my designated account.",
    "signatory": "Signatory:",
    "safety_receipt_title": "Safety Digital Signature Receipt (Pending)",
    "receipt_pledge": "I have carefully reviewed the work hours and payment details above, confirm they are correct, and understand this holds legal weight.",
    "signature_input_label": "Digital Signature (Please click below to sign by hand)",
    "signature_placeholder": "Please click below to sign by hand",
    "sign_confirm_btn": "I Have Confirmed",
    "pleas_check_receipt": "Please check the read & confirm option first!",
    "please_sign_correctly": "Please type your name accurately: \"{name}\"!",
    "sign_success_toast": "🎉 Payslip signed successfully! Data synced to financial backend!",
    "back_previous": "Back",
    "personal_leave": "Personal",
    "sick_leave": "Sick",
    "annual_leave": "Annual",
    "special_leave": "Special",
    "late_badge": "Late Punch",
    "all_punched_toast": "🎉 You have completed punch out today, see you tomorrow!",
    "expense_supplies": "Supplies",
    "expense_maintenance": "Equipment Maintenance",
    "expense_utilities": "Utilities",
    "expense_travel": "Travel Allowance",
    "language_settings": "Language Settings",
    "payslip_unreleased": "Payslip Not Released Yet",
    "payslip_unreleased_desc": "Your payslip for this month is still being calculated and reviewed. You will receive a notification once published."
  },
  "th": {
    "my_center": "ศูนย์ข้อมูลส่วนบุคคล",
    "home": "หน้าแรก",
    "attendance": "เวลาเข้างาน",
    "sop": "SOP",
    "my": "ฉัน",
    "dept": "แผนก",
    "role": "ตำแหน่ง",
    "join_date": "วันที่เริ่มงาน",
    "hourly_rate": "อัตราค่าจ้างรายชั่วโมง",
    "base_currency": "สกุลเงินที่ใช้ชำระเงิน",
    "reim_title": "คำขอเบิกค่าใช้จ่าย",
    "reim_add": "เพิ่ม",
    "reim_desc": "ยื่นเอกสารการชำระเงินเพื่อสร้างสลิปเบิกเงิน หลังจากได้รับการอนุมัติ จะโอนรวมเข้ากับสลิปเงินเดือนของเดือนนี้ทันที",
    "reim_history": "ประวัติการเบิกเงิน",
    "reim_none": "ไม่มีประวัติการเบิกเงิน",
    "reim_form_title": "เพิ่มสลิปเบิกเงิน",
    "reim_name_label": "วัตถุประสงค์/รายการ *",
    "reim_name_placeholder": "เช่น เติมน้ำมันรถยก / ถุงมือกันลื่นฉุกเฉิน",
    "reim_type_label": "ประเภทค่าใช้จ่าย",
    "reim_currency_label": "สกุลเงินเบิกเงิน",
    "reim_amount_label": "จำนวนเงิน *",
    "reim_amount_placeholder": "ป้อนจำนวนเงินที่จ่ายจริง",
    "reim_receipt_label": "แนบหลักฐานการชำระเงิน",
    "reim_note_label": "หมายเหตุ",
    "reim_note_placeholder": "ระบุข้อกำหนดการซื้อและวัตถุประสงค์เพิ่มเติม",
    "reim_submit": "ยื่นคำขออนุมัติ",
    "reim_back": "ย้อนกลับ",
    "reim_success": "ยื่นคำขอเบิกค่าใช้จ่ายเรียบร้อยแล้ว รอการอนุมัติจากระบบหลังบ้าน",
    "reim_pending": "รออนุมัติ",
    "reim_approved": "อนุมัติแล้ว",
    "reim_rejected": "ปฏิเสธ",
    "reim_cancel": "ยกเลิก",
    "lang_toast": "เปลี่ยนภาษาเป็น: ",
    "attendance_center": "การลงเวลาและลางาน",
    "sop_center": "การแจ้งเตือนข้อความ",
    "loading": "กรุณารอสักครู่...",
    "info_success": "🎉 อัปเดตรูปโปรไฟล์สำเร็จแล้ว! ข้อมูลซิงค์ไปยังระบบหลังบ้านแล้ว!",
    "today": "วันนี้",
    "punched": "ลงเวลาแล้ว",
    "not_punched": "ยังไม่ลงเวลา",
    "sys_time": "เวลาในระบบ",
    "shift_in": "เวลาเข้างาน",
    "shift_out": "เวลาเลิกงาน",
    "bangkok_wh": "คลังสินค้ากรุงเทพ A · ความแม่นยำ 3.2m",
    "beijing_wh": "คลังสินค้าห่วงโซ่เย็นอัจฉริยะปักกิ่ง 1 · ความแม่นยำ 1.2m",
    "yangon_wh": "ศูนย์ลอจิสติกส์ย่างกุ้ง · ความแม่นยำ 4.5m",
    "hcmc_wh": "ศูนย์กระจายสินค้าโฮจิมินห์ · ความแม่นยำ 2.8m",
    "phnompenh_wh": "คลังสินค้าพนมเปญ · ความแม่นยำ 3.5m",
    "shanghai_wh": "ศูนย์กระจายสินค้าเซี่ยงไฮ้ 1 · ความแม่นยำ 1.2m",
    "punch_in_btn": "ลงเวลาเข้างาน",
    "punch_out_btn": "ลงเวลาเลิกงาน",
    "hours_this_month": "ชั่วโมงทำงาน",
    "days_worked": "วันทำงาน",
    "pending_sops": "SOP ที่ต้องทำ",
    "sys_notification": "การแจ้งเตือนข้อความ",
    "view_all": "ดูทั้งหมด",
    "fire_drill_title": "ประกาศการซ้อมดับเพลิงคลังสินค้า",
    "fire_drill_desc": "พนักงานทุกคนเข้าร่วมวันศุกร์นี้เวลา 14:00...",
    "fire_drill_content": "เพื่อเพิ่มความตระหนักด้านความปลอดภัยและความสามารถในการรับมือเหตุฉุกเฉิน กำหนดให้มีการซ้อมดับเพลิงและการอพยพหนีไฟสำหรับพนักงานทุกคนในวันศุกร์นี้เวลา 14:00 น. หัวหน้าทีมกรุณาประสานงาน ปิดอุปกรณ์ และรวมพลที่ลานหน้าประตูหลักโซน A",
    "payslip_notif_title": "สลิปเงินเดือนเดือนเมษายนพร้อมแล้ว",
    "payslip_notif_desc": "กรุณาตรวจสอบรายละเอียดที่หน้าข้อมูลส่วนตัว...",
    "payslip_notif_toast": "กำลังโหลดสลิปเงินเดือนอิเล็กทรอนิกส์ที่มีการเข้ารหัสของเดือนนี้",
    "no_more_notif": "🔔 ไม่มีประวัติการแจ้งเตือนอื่นในขณะนี้",
    "calendar_header": "ศูนย์ลงเวลาและลางาน",
    "request_leave": "ขอลางาน",
    "leave_type": "ประเภทการลา",
    "leave_days": "จำนวนวันลา",
    "start_date": "วันที่เริ่มลา",
    "end_date": "วันที่สิ้นสุด",
    "leave_reason_label": "เหตุผลการลา (ไม่บังคับ)",
    "leave_reason_placeholder": "ป้อนเหตุผลโดยละเอียดเพื่อการอนุมัติของหัวหน้างาน",
    "leave_submit": "ส่งคำขอ",
    "calendar_normal": "ปกติ",
    "calendar_late": "สาย",
    "calendar_leave": "ลา",
    "leave_detail": "ประวัติการลา",
    "leave_approved": "อนุมัติแล้ว",
    "punch_log": "บันทึกการลงเวลา",
    "punch_count_month": "ลงเวลาแล้ว {count} ครั้งในเดือนนี้",
    "no_punch_log": "ไม่มีประวัติการลงเวลาในเดือนนี้",
    "punch_log_row": "เข้างาน: {inTime} • เลิกงาน: {outTime}",
    "training_docs": "เอกสารการฝึกอบรม",
    "announcements": "ประกาศ",
    "back_to_list": "กลับสู่รายการ",
    "sop_instructions_title": "คำชี้แจงการลงนามรับทราบ:",
    "sop_instructions_content": "การศึกษาและทำความเข้าใจแนวทางปฏิบัติเป็นสิ่งสำคัญสำหรับความปลอดภัยและการดำเนินงานที่มีประสิทธิภาพ เมื่อลงนามแล้ว สถานะการอ่านและบันทึกจะถูกซิงค์ไปยังคลังข้อมูล",
    "sop_checkbox": "ฉันได้อ่านและทำความเข้าใจแนวทางปฏิบัตินี้อย่างละเอียด และขอสัญญาว่าจะปฏิบัติตามอย่างเคร่งครัดในการทำงาน",
    "sop_agree_btn": "รับทราบและให้คำมั่นสัญญา",
    "sop_empty": "ไม่มีเอกสารที่ได้รับมอบหมายในหมวดหมู่นี้",
    "sop_read": "อ่านแล้ว",
    "sop_unread": "ยังไม่ได้อ่าน",
    "sop_publish_date": "เผยแพร่:",
    "sop_publisher": "ผู้เผยแพร่:",
    "e_payslip": "สลิปเงินเดือนอิเล็กทรอนิกส์",
    "emp_id_label": "รหัสพนักงาน:",
    "flag_domestic": "จีน",
    "flag_thai": "ไทย",
    "flag_myanmar": "เมียนมาร์",
    "flag_vietnam": "เวียดนาม",
    "flag_cambodia": "กัมพูชา",
    "flag_intl": "ต่างชาติ",
    "flag_suffix": " สัญชาติ",
    "attendance_accounting": "การคำนวณวันเข้างาน",
    "std_work_hours": "เวลาทำงานมาตรฐาน (ต่อวัน)",
    "hours_per_day": "{hours} ชั่วโมง/วัน",
    "working_days_month": "จำนวนวันทำงานจริง",
    "days_unit": "{days} วัน",
    "valid_hours_month": "ชั่วโมงทำงานสะสม",
    "ot_hours_month": "ชั่วโมงล่วงเวลา",
    "ot_count_unit": "{count} ครั้ง",
    "payslip_detail": "รายละเอียดรายรับ (โครงสร้างค่าจ้าง)",
    "base_salary_monthly": "เงินเดือนพื้นฐาน",
    "monthly_unit": "{amount}/เดือน",
    "days_pay_calc": "ค่าจ้างตามวันทำงาน (ฐาน/30 × {days} วัน)",
    "ot_pay_calc": "เงินล่วงเวลา (อัตรา × {hours} ชม.)",
    "bonus_pay_calc": "เบี้ยขยัน (เบี้ยเลี้ยงเข้างาน)",
    "meal_allowance_calc": "ค่าอาหาร (ค่าครองชีพ)",
    "tax_withholding": "ภาษีหัก ณ ที่จ่าย ({rate}%)",
    "social_security": "ประกันสังคม",
    "approved_reimbursement": "เงินเบิกจ่ายที่อนุมัติแล้ว",
    "net_payout_title": "ยอดเงินจ่ายสุทธิประจำเดือนนี้",
    "payout_currency_label": "สกุลเงินที่จ่าย:",
    "signed_status": "ลงนามอิเล็กทรอนิกส์แล้ว",
    "signed_payout_desc": "ฉันได้ลงนามอิเล็กทรอนิกส์ ตรวจสอบรายละเอียดแล้ว และรับทราบว่าเงินได้รับการโอนเข้าบัญชีที่กำหนดแล้ว",
    "signatory": "ผู้ลงนาม:",
    "safety_receipt_title": "ใบรับรองการลงนามอิเล็กทรอนิกส์ (รอการลงนาม)",
    "receipt_pledge": "ฉันได้ตรวจสอบชั่วโมงทำงานและรายละเอียดการชำระเงินข้างต้นแล้ว ยืนยันว่าถูกต้อง และเข้าใจว่าสิ่งนี้มีผลผูกพันทางกฎหมาย",
    "signature_input_label": "ลงนามอิเล็กทรอนิกส์ (กรุณาพิมพ์ชื่อนามสกุลจริง)",
    "signature_placeholder": "พิมพ์ \"{name}\" เพื่อยืนยัน",
    "sign_confirm_btn": "ลงนามและยืนยันรับสลิปอย่างปลอดภัย",
    "pleas_check_receipt": "กรุณาติ๊กเลือกช่องยอมรับและยืนยันก่อน!",
    "please_sign_correctly": "กรุณากรอกชื่อจริงให้ถูกต้อง: \"{name}\"!",
    "sign_success_toast": "🎉 ลงนามรับสลิปเงินเดือนเรียบร้อยแล้ว! ข้อมูลได้รับการอัปเดตไปยังแผนกการเงินแล้ว!",
    "back_previous": "ย้อนกลับ",
    "personal_leave": "ลากิจ",
    "sick_leave": "ลาป่วย",
    "annual_leave": "ลาพักร้อน",
    "special_leave": "ลาคลอด/ลาแต่งงาน",
    "late_badge": "สาย",
    "all_punched_toast": "🎉 วันนี้คุณได้ลงเวลาเลิกงานเรียบร้อยแล้ว เจอกันพรุ่งนี้!",
    "expense_supplies": "วัสดุสิ้นเปลือง",
    "expense_maintenance": "การบำรุงรักษาอุปกรณ์",
    "expense_utilities": "ค่าน้ำค่าไฟ",
    "expense_travel": "ค่าเบี้ยเลี้ยงเดินทาง",
    "language_settings": "ตั้งค่าภาษา",
    "payslip_unreleased": "สลิปเงินเดือนยังไม่พร้อมใช้งาน",
    "payslip_unreleased_desc": "สลิปเงินเดือนของคุณสำหรับเดือนนี้ยังคงอยู่ระหว่างการคำนวณและตรวจสอบ คุณจะได้รับการแจ้งเตือนหลังจากที่เปิดใช้งานแล้ว"
  },
  "id": {
    "my_center": "Pusat Pribadi",
    "home": "Beranda",
    "attendance": "Kehadiran",
    "sop": "SOP",
    "my": "Saya",
    "dept": "Departemen",
    "role": "Peran/Jabatan",
    "join_date": "Tanggal Masuk",
    "hourly_rate": "Gaji Pokok Per Jam",
    "base_currency": "Mata Uang Pembayaran",
    "reim_title": "Pengajuan Reimbursement",
    "reim_add": "Tambah",
    "reim_desc": "Kirim bukti pembayaran untuk menghasilkan alur persetujuan reimbursement otomatis. Setelah disetujui, dana akan segera ditambahkan ke slip gaji bulan ini.",
    "reim_history": "Riwayat Reimbursement",
    "reim_none": "Belum ada riwayat reimbursement",
    "reim_form_title": "Tambah Reimbursement",
    "reim_name_label": "Tujuan/Nama Biaya *",
    "reim_name_placeholder": "Misalnya: Bahan bakar forklift / Sarung tangan darurat",
    "reim_type_label": "Kategori Biaya",
    "reim_currency_label": "Mata Uang",
    "reim_amount_label": "Jumlah Biaya *",
    "reim_amount_placeholder": "Masukkan jumlah yang dibayarkan",
    "reim_receipt_label": "Lampiran Kuitansi",
    "reim_note_label": "Keterangan",
    "reim_note_placeholder": "Berikan spesifikasi pembelian dan tujuan",
    "reim_submit": "Kirim Pengajuan",
    "reim_back": "Kembali",
    "reim_success": "Pengajuan reimbursement berhasil dikirim untuk persetujuan backend",
    "reim_pending": "Menunggu",
    "reim_approved": "Disetujui",
    "reim_rejected": "Ditolak",
    "reim_cancel": "Batal",
    "lang_toast": "Bahasa diubah menjadi: ",
    "attendance_center": "Kehadiran & Cuti",
    "sop_center": "Notifikasi Pesan",
    "loading": "Silakan tunggu...",
    "info_success": "🎉 Foto profil berhasil diperbarui! sinkron dengan konsol admin!",
    "today": "Hari Ini",
    "punched": "Sudah Hadir",
    "not_punched": "Belum Hadir",
    "sys_time": "Waktu Sistem",
    "shift_in": "Waktu Masuk",
    "shift_out": "Waktu Pulang",
    "bangkok_wh": "Gudang Bangkok A · Akurasi 3.2m",
    "beijing_wh": "Gudang Rantai Dingin Cerdas Beijing 1 · Akurasi 1.2m",
    "yangon_wh": "Pusat Logistik Yangon · Akurasi 4.5m",
    "hcmc_wh": "Pusat Distribusi HCMC · Akurasi 2.8m",
    "phnompenh_wh": "Gudang Phnom Penh · Akurasi 3.5m",
    "shanghai_wh": "Pusat Distribusi Shanghai 1 · Akurasi 1.2m",
    "punch_in_btn": "Absen Masuk",
    "punch_out_btn": "Absen Pulang",
    "hours_this_month": "Jam Kerja",
    "days_worked": "Hari Kerja",
    "pending_sops": "SOP Tertunda",
    "sys_notification": "Notifikasi Pesan",
    "view_all": "Lihat Semua",
    "fire_drill_title": "Pemberitahuan Latihan Kebakaran Gudang",
    "fire_drill_desc": "Partisipasi semua staf Jumat ini pukul 14:00...",
    "fire_drill_content": "Untuk meningkatkan kesadaran keselamatan dan kemampuan tanggap darurat, latihan kebakaran dan evakuasi darurat dijadwalkan pada hari Jumat ini pukul 14:00. Ketua tim silakan koordinasi, matikan peralatan, dan berkumpul di luar gerbang utama Area A tepat waktu.",
    "payslip_notif_title": "Slip Gaji April Telah Dibuat",
    "payslip_notif_desc": "Silakan periksa detailnya di Pusat Pribadi...",
    "payslip_notif_toast": "Memuat slip gaji elektronik terenkripsi Anda untuk bulan ini.",
    "no_more_notif": "🔔 Tidak ada notifikasi riwayat lainnya saat ini",
    "calendar_header": "Pusat Kehadiran & Cuti",
    "request_leave": "Ajukan Cuti",
    "leave_type": "Jenis Cuti",
    "leave_days": "Jumlah Hari",
    "start_date": "Tanggal Mulai",
    "end_date": "Tanggal Selesai",
    "leave_reason_label": "Alasan Cuti (Opsional)",
    "leave_reason_placeholder": "Masukkan alasan detail untuk persetujuan manajer.",
    "leave_submit": "Kirim",
    "calendar_normal": "Normal",
    "calendar_late": "Terlambat",
    "calendar_leave": "Cuti",
    "leave_detail": "Catatan Cuti",
    "leave_approved": "Disetujui",
    "punch_log": "Catatan Kehadiran",
    "punch_count_month": "Hadir {count} kali bulan ini",
    "no_punch_log": "Belum ada catatan kehadiran bulan ini",
    "punch_log_row": "Absen Masuk: {inTime} • Absen Pulang: {outTime}",
    "training_docs": "Dokumen Pelatihan",
    "announcements": "Pengumuman",
    "back_to_list": "Kembali ke Daftar",
    "sop_instructions_title": "Instruksi Penandatanganan Pernyataan:",
    "sop_instructions_content": "Mempelajari dan menguasai panduan sangat penting untuk keselamatan dan operasi yang efisien. Setelah menandatangani, status baca dan log Anda akan disinkronkan ke arsip.",
    "sop_checkbox": "Saya telah membaca dan memahami pedoman ini dengan cermat, dan berjanji untuk mematuhinya dalam pekerjaan saya di masa depan.",
    "sop_agree_btn": "Pahami & Setujui",
    "sop_empty": "Tidak ada dokumen yang ditugaskan dalam kategori ini",
    "sop_read": "Sudah Dibaca",
    "sop_unread": "Belum Dibaca",
    "sop_publish_date": "Terbit:",
    "sop_publisher": "Oleh:",
    "e_payslip": "Slip Gaji Elektronik",
    "emp_id_label": "ID Karyawan:",
    "flag_domestic": "Tiongkok",
    "flag_thai": "Thailand",
    "flag_myanmar": "Myanmar",
    "flag_vietnam": "Vietnam",
    "flag_cambodia": "Kamboja",
    "flag_intl": "Asing",
    "flag_suffix": " Warga Negara",
    "attendance_accounting": "Perhitungan Kehadiran",
    "std_work_hours": "Jam Kerja Standar (Harian)",
    "hours_per_day": "{hours} Jam/Hari",
    "working_days_month": "Hari Kerja Efektif",
    "days_unit": "{days} Hari",
    "valid_hours_month": "Akumulasi Jam Kerja",
    "ot_hours_month": "Jam Lembur Efektif",
    "ot_count_unit": "{count} kali",
    "payslip_detail": "Rincian Gaji (Komponen Gaji)",
    "base_salary_monthly": "Gaji Pokok (Bulanan)",
    "monthly_unit": "{amount}/bulan",
    "days_pay_calc": "Gaji Pokok Prorata (Pokok/30 × {days} hari)",
    "ot_pay_calc": "Gaji Lembur (Tarif × {hours} jam)",
    "bonus_pay_calc": "Bonus Kehadiran",
    "meal_allowance_calc": "Tunjangan Makan (Subsidi Makanan)",
    "tax_withholding": "Potongan Pajak ({rate}%)",
    "social_security": "Jaminan Sosial",
    "approved_reimbursement": "Reimbursement yang Disetujui",
    "net_payout_title": "Jumlah yang Diterima Bulan Ini (Bersih)",
    "payout_currency_label": "Mata Uang Pembayaran:",
    "signed_status": "Ditandatangani secara Elektronik",
    "signed_payout_desc": "Saya telah menandatangani secara digital, memverifikasi rinciannya, dan mengakui bahwa dana telah ditransfer ke rekening yang ditentukan.",
    "signatory": "Penandatangan:",
    "safety_receipt_title": "Tanda Terima Tanda Tangan Elektronik (Menunggu)",
    "receipt_pledge": "Saya telah memeriksa jam kerja dan rincian pembayaran di atas, mengonfirmasi bahwa rincian tersebut benar, dan memahami bahwa tanda terima ini memiliki kekuatan hukum.",
    "signature_input_label": "Tanda Tangan Elektronik (Silakan ketik nama lengkap Anda)",
    "signature_placeholder": "Ketik \"{name}\" untuk konfirmasi",
    "sign_confirm_btn": "Tandatangani & Terima dengan Aman",
    "pleas_check_receipt": "Silakan centang pilihan baca & konfirmasi terlebih dahulu!",
    "please_sign_correctly": "Harap ketik nama Anda dengan benar: \"{name}\"!",
    "sign_success_toast": "🎉 Slip gaji berhasil ditandatangani! Data disinkronkan ke backend keuangan!",
    "back_previous": "Kembali",
    "personal_leave": "Cuti Pribadi",
    "sick_leave": "Cuti Sakit",
    "annual_leave": "Cuti Tahunan",
    "special_leave": "Cuti Khusus",
    "late_badge": "Terlambat",
    "all_punched_toast": "🎉 Anda telah menyelesaikan absen pulang hari ini, sampai jumpa besok!",
    "expense_supplies": "Bahan Habis Pakai",
    "expense_maintenance": "Pemeliharaan Peralatan",
    "expense_utilities": "Biaya Utilitas",
    "expense_travel": "Tunjangan Perjalanan",
    "language_settings": "Pengaturan Bahasa",
    "payslip_unreleased": "Slip Gaji Belum Dirilis",
    "payslip_unreleased_desc": "Slip gaji Anda untuk bulan ini masih dalam proses perhitungan dan peninjauan. Anda akan menerima notifikasi setelah dirilis."
  }
};

const getCanvasCoords = (
  e: MouseEvent | TouchEvent, 
  canvas: HTMLCanvasElement, 
  isPortrait: boolean
) => {
  const rect = canvas.getBoundingClientRect();
  let clientX = 0;
  let clientY = 0;

  if ('touches' in e) {
    if (e.touches.length === 0) return null;
    clientX = e.touches[0].clientX;
    clientY = e.touches[0].clientY;
  } else {
    clientX = e.clientX;
    clientY = e.clientY;
  }

  if (isPortrait) {
    // Clockwise 90-degree rotation math
    const x = ((clientY - rect.top) / rect.height) * canvas.width;
    const y = ((rect.right - clientX) / rect.width) * canvas.height;
    return { x, y };
  } else {
    // Normal landscape coordinates
    const x = ((clientX - rect.left) / rect.width) * canvas.width;
    const y = ((clientY - rect.top) / rect.height) * canvas.height;
    return { x, y };
  }
};

const playHappyMusic = () => {
  try {
    const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
    if (!AudioContextClass) return;
    const ctx = new AudioContextClass();
    
    // Play a lovely happy arpeggio chord: C5 -> E5 -> G5 -> C6 -> E6
    const notes = [523.25, 659.25, 783.99, 1046.50, 1318.51]; 
    const now = ctx.currentTime;
    
    notes.forEach((freq, idx) => {
      const osc = ctx.createOscillator();
      const gainNode = ctx.createGain();
      
      osc.type = "sine"; // smooth, beautiful sweet bell tone
      osc.frequency.setValueAtTime(freq, now + idx * 0.12);
      
      // Cheerful vibrato / frequency swell
      osc.frequency.exponentialRampToValueAtTime(freq * 1.01, now + idx * 0.12 + 0.3);
      
      gainNode.gain.setValueAtTime(0, now + idx * 0.12);
      gainNode.gain.linearRampToValueAtTime(0.15, now + idx * 0.12 + 0.05);
      gainNode.gain.exponentialRampToValueAtTime(0.001, now + idx * 0.12 + 0.8);
      
      osc.connect(gainNode);
      gainNode.connect(ctx.destination);
      
      osc.start(now + idx * 0.12);
      osc.stop(now + idx * 0.12 + 0.8);
    });
  } catch (err) {
    console.warn("Audio Context blocked or failed:", err);
  }
};

function ConfettiRain() {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let animationId: number;
    let width = (canvas.width = canvas.parentElement?.clientWidth || 375);
    let height = (canvas.height = canvas.parentElement?.clientHeight || 600);

    const handleResize = () => {
      if (canvas && canvas.parentElement) {
        width = canvas.width = canvas.parentElement.clientWidth;
        height = canvas.height = canvas.parentElement.clientHeight;
      }
    };
    window.addEventListener("resize", handleResize);

    const colors = ["#f59e0b", "#f97316", "#ef4444", "#ec4899", "#8b5cf6", "#3b82f6", "#10b981", "#84cc16"];
    
    interface Particle {
      x: number;
      y: number;
      size: number;
      color: string;
      speedX: number;
      speedY: number;
      rotation: number;
      rotationSpeed: number;
    }

    const particles: Particle[] = [];
    for (let i = 0; i < 80; i++) {
      particles.push({
        x: Math.random() * width,
        y: Math.random() * -height - 20,
        size: Math.random() * 6 + 4,
        color: colors[Math.floor(Math.random() * colors.length)],
        speedX: Math.random() * 2 - 1,
        speedY: Math.random() * 3 + 2,
        rotation: Math.random() * 360,
        rotationSpeed: Math.random() * 4 - 2,
      });
    }

    const draw = () => {
      ctx.clearRect(0, 0, width, height);
      let finished = true;

      particles.forEach((p) => {
        p.y += p.speedY;
        p.x += p.speedX + Math.sin(p.y / 30) * 0.3;
        p.rotation += p.rotationSpeed;

        if (p.y < height) {
          finished = false;
        }

        ctx.save();
        ctx.translate(p.x, p.y);
        ctx.rotate((p.rotation * Math.PI) / 180);
        ctx.fillStyle = p.color;
        ctx.fillRect(-p.size / 2, -p.size / 2, p.size, p.size * 1.5);
        ctx.restore();
      });

      if (!finished) {
        animationId = requestAnimationFrame(draw);
      }
    };

    draw();

    return () => {
      cancelAnimationFrame(animationId);
      window.removeEventListener("resize", handleResize);
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      className="absolute inset-0 w-full h-full pointer-events-none z-50"
    />
  );
}

// Mobile tab ids
type MobileTab = "home" | "attendance" | "sop" | "my" | "payslip" | "expense" | "add_expense";

export function EmployeeApp({ 
  employees, 
  onUpdateEmployees,
  attendance, 
  config, 
  onUpdateAttendance, 
  addToast: parentAddToast,
  onNavigateToTab,
  holidays,
  leaveRequests = [],
  onUpdateLeaveRequests
}: EmployeeAppProps) {
  
  // Local notification state inside EmployeeApp to avoid popping up outside of the app
  const [localToasts, setLocalToasts] = useState<{ id: number; msg: string }[]>([]);

  const payslipPrintRef = useRef<HTMLDivElement>(null);
  const [isExporting, setIsExporting] = useState(false);

  const addToast = (msg: string) => {
    const id = Date.now();
    setLocalToasts(prev => [...prev, { id, msg }]);
    setTimeout(() => {
      setLocalToasts(prev => prev.filter(t => t.id !== id));
    }, 3000);
  };

  const handleExportPDF = async () => {
    if (!payslipPrintRef.current || !currentUser) return;
    setIsExporting(true);
    addToast(locale === "zh-CN" ? "正在生成精美PDF薪资单..." : "Generating beautiful PDF...");
    
    try {
      // Wait for rendering
      await new Promise(resolve => setTimeout(resolve, 400));
      
      const element = payslipPrintRef.current;
      const canvas = await html2canvas(element, {
        scale: 2.5, // Ultra-high-resolution for print
        useCORS: true,
        logging: false,
        backgroundColor: "#ffffff"
      });
      
      const imgData = canvas.toDataURL("image/png");
      const pdf = new jsPDF("p", "mm", "a4");
      const imgWidth = 210;
      const pageHeight = 297;
      const imgHeight = (canvas.height * imgWidth) / canvas.width;
      
      let heightLeft = imgHeight;
      let position = 0;
      
      pdf.addImage(imgData, "PNG", 0, position, imgWidth, imgHeight);
      heightLeft -= pageHeight;
      
      while (heightLeft >= 0) {
        position = heightLeft - imgHeight;
        pdf.addPage();
        pdf.addImage(imgData, "PNG", 0, position, imgWidth, imgHeight);
        heightLeft -= pageHeight;
      }
      
      const filename = `${currentUser.name}_Payslip_${currentMonthStr}.pdf`;
      pdf.save(filename);
      addToast(locale === "zh-CN" ? "精美PDF工资条导出成功！" : "Beautiful PDF exported successfully!");
    } catch (err) {
      console.error("PDF export error", err);
      addToast(locale === "zh-CN" ? "导出 PDF 失败，请重试" : "Failed to export PDF");
    } finally {
      setIsExporting(false);
    }
  };

  // Onboarding Slides State
  const [isOnboarded, setIsOnboarded] = useState<boolean>(() => {
    try {
      const saved = localStorage.getItem("wms_app_onboarded");
      return saved === "true";
    } catch {
      return false;
    }
  });
  const [currentSlide, setCurrentSlide] = useState(0);

  // Language Locale State
  const [locale, setLocale] = useState<"zh-CN" | "zh-TW" | "en" | "th" | "id">(() => {
    try {
      return (localStorage.getItem("wms_employee_locale") as any) || "zh-CN";
    } catch {
      return "zh-CN";
    }
  });

  const t = (key: string, params?: Record<string, string | number>): string => {
    const dict = TRANSLATIONS[locale] || TRANSLATIONS["zh-CN"];
    let val = dict[key] || TRANSLATIONS["zh-CN"][key] || key;
    if (params) {
      Object.entries(params).forEach(([k, v]) => {
        val = val.replace(new RegExp(`\\{${k}\\}`, "g"), String(v));
      });
    }
    return val;
  };

  const getPayslipNotifTitle = (monthStr: string, currentLocale: string) => {
    if (!monthStr) return "";
    const parts = monthStr.split("-");
    if (parts.length < 2) return "";
    const moStr = parts[1];
    const monthNum = parseInt(moStr, 10);
    
    if (currentLocale === "zh-CN") {
      return `${monthNum}月工资条已生成`;
    }
    if (currentLocale === "zh-TW") {
      return `${monthNum}月工資條已生成`;
    }
    
    const EN_MONTHS = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
    const TH_MONTHS = ["มกราคม", "กุมภาพันธ์", "มีนาคม", "เมษายน", "พฤษภาคม", "มิถุนายน", "กรกฎาคม", "สิงหาคม", "กันยายน", "ตุลาคม", "พฤศจิกายน", "ธันวาคม"];
    const ID_MONTHS = ["Januari", "Februari", "Maret", "April", "Mei", "Juni", "Juli", "Agustus", "September", "Oktober", "November", "Desember"];
    
    const idx = monthNum - 1;
    if (currentLocale === "en") {
      return `${EN_MONTHS[idx] || "April"} Payslip Generated`;
    }
    if (currentLocale === "th") {
      return `สลิปเงินเดือนเดือน${TH_MONTHS[idx] || "เมษายน"}พร้อมแล้ว`;
    }
    if (currentLocale === "id") {
      return `Slip Gaji ${ID_MONTHS[idx] || "April"} Telah Dibuat`;
    }
    return `${monthNum}月工资条已生成`;
  };

  const getDeptLabel = (dept: string) => {
    if (dept === "A区入库" || dept === "A區入庫") {
      return locale === "zh-CN" ? "A区入库" : locale === "zh-TW" ? "A區入庫" : locale === "th" ? "โซน A ขาเข้า" : locale === "id" ? "Zona A Masuk" : "Zone A Inbound";
    }
    if (dept === "B区出库" || dept === "B區出庫") {
      return locale === "zh-CN" ? "B区出库" : locale === "zh-TW" ? "B區出庫" : locale === "th" ? "โซน B ขาออก" : locale === "id" ? "Zona B Keluar" : "Zone B Outbound";
    }
    if (dept === "C区包装" || dept === "C區包裝") {
      return locale === "zh-CN" ? "C区包装" : locale === "zh-TW" ? "C區包裝" : locale === "th" ? "โซน C บรรจุภัณฑ์" : locale === "id" ? "Zona C Pengemasan" : "Zone C Packaging";
    }
    if (dept === "D区质检" || dept === "D區質檢") {
      return locale === "zh-CN" ? "D区质检" : locale === "zh-TW" ? "D區質檢" : locale === "th" ? "โซน D ตรวจสอบคุณภาพ" : locale === "id" ? "Zona D QC" : "Zone D QC";
    }
    if (dept === "E区包装" || dept === "E區包裝") {
      return locale === "zh-CN" ? "E区包装" : locale === "zh-TW" ? "E區包裝" : locale === "th" ? "โซน E บรรจุภัณฑ์" : locale === "id" ? "Zona E Pengemasan" : "Zone E Packaging";
    }
    if (dept === "全仓" || dept === "全倉") {
      return locale === "zh-CN" ? "全仓" : locale === "zh-TW" ? "全倉" : locale === "th" ? "คลังสินค้าทั้งหมด" : locale === "id" ? "Seluruh Gudang" : "All Whse";
    }
    if (dept === "仓库管理" || dept === "倉庫管理") {
      return locale === "zh-CN" ? "仓库管理" : locale === "zh-TW" ? "倉庫管理" : locale === "th" ? "การจัดการคลังสินค้า" : locale === "id" ? "Manajemen Gudang" : "Whse Management";
    }
    return dept;
  };

  const getRoleLabel = (role: string) => {
    if (role === "拣货员" || role === "揀貨員") {
      return locale === "zh-CN" ? "拣货员" : locale === "zh-TW" ? "揀貨員" : locale === "th" ? "เจ้าหน้าที่หยิบสินค้า" : locale === "id" ? "Picker" : "Picker";
    }
    if (role === "打包员" || role === "打包員") {
      return locale === "zh-CN" ? "打包员" : locale === "zh-TW" ? "打包員" : locale === "th" ? "เจ้าหน้าที่แพ็คสินค้า" : locale === "id" ? "Packer" : "Packer";
    }
    if (role === "组长" || role === "組長") {
      return locale === "zh-CN" ? "组长" : locale === "zh-TW" ? "組長" : locale === "th" ? "หัวหน้าทีม" : locale === "id" ? "Leader" : "Team Leader";
    }
    if (role === "质检员" || role === "質檢員") {
      return locale === "zh-CN" ? "质检员" : locale === "zh-TW" ? "質檢員" : locale === "th" ? "เจ้าหน้าที่ตรวจสินค้า" : locale === "id" ? "QC Inspector" : "QC Inspector";
    }
    if (role === "叉车工" || role === "叉車工") {
      return locale === "zh-CN" ? "叉车工" : locale === "zh-TW" ? "叉車工" : locale === "th" ? "พนักงานขับรถโฟล์คลิฟท์" : locale === "id" ? "Operator Forklift" : "Forklift Operator";
    }
    if (role === "仓管员" || role === "倉管員") {
      return locale === "zh-CN" ? "仓管员" : locale === "zh-TW" ? "倉管員" : locale === "th" ? "เจ้าหน้าที่คลังสินค้า" : locale === "id" ? "Staf Gudang" : "Whse Keeper";
    }
    return role;
  };

  const getCountryName = (code: string) => {
    const flags = {
      MM: locale === "zh-CN" ? "缅甸" : locale === "zh-TW" ? "緬甸" : locale === "th" ? "เมียนมา" : locale === "id" ? "Myanmar" : "Myanmar",
      TH: locale === "zh-CN" ? "泰国" : locale === "zh-TW" ? "泰國" : locale === "th" ? "ไทย" : locale === "id" ? "Thailand" : "Thailand",
      CN: locale === "zh-CN" ? "中国" : locale === "zh-TW" ? "中國" : locale === "th" ? "จีน" : locale === "id" ? "Tiongkok" : "China",
      VN: locale === "zh-CN" ? "越南" : locale === "zh-TW" ? "越南" : locale === "th" ? "เวียดนาม" : locale === "id" ? "Vietnam" : "Vietnam",
      KH: locale === "zh-CN" ? "柬埔寨" : locale === "zh-TW" ? "柬埔寨" : locale === "th" ? "กัมพูชา" : locale === "id" ? "Kamboja" : "Cambodia",
    };
    return flags[code as keyof typeof flags] || (locale === "zh-CN" ? "外籍" : locale === "zh-TW" ? "外籍" : locale === "th" ? "ต่างชาติ" : locale === "id" ? "Asing" : "Foreign");
  };

  const getLeaveTypeLabel = (type: string) => {
    if (type === "事假") return t("personal_leave");
    if (type === "病假") return t("sick_leave");
    if (type === "年假") return t("annual_leave");
    if (type === "婚产假") return t("special_leave");
    return type;
  };

  const getExpenseTypeLabel = (type: string) => {
    if (type === "物耗杂费") return t("expense_supplies");
    if (type === "设备维护费") return t("expense_maintenance");
    if (type === "水电动力费") return t("expense_utilities");
    if (type === "差旅补贴") return t("expense_travel");
    return type;
  };

  useEffect(() => {
    try {
      localStorage.setItem("wms_employee_locale", locale);
    } catch (e) {
      console.error(e);
    }
  }, [locale]);

  // Login View States
  const [loginMethod, setLoginMethod] = useState<"credentials" | "register">("credentials");
  const [inputAccount, setInputAccount] = useState("");
  const [selectedEmpId, setSelectedEmpId] = useState<string>("");
  const [inputPassword, setInputPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [isAutoLoggingIn, setIsAutoLoggingIn] = useState<string | null>(null);
  const [showDemoAccounts, setShowDemoAccounts] = useState(false);
  const [demoSearchQuery, setDemoSearchQuery] = useState("");

  // Email Register & Login View States
  const [inputEmail, setInputEmail] = useState("");
  const [inputEmailPassword, setInputEmailPassword] = useState("");
  const [showEmailPassword, setShowEmailPassword] = useState(false);
  const [registerType, setRegisterType] = useState<"google" | "email">("google");
  const [emailRegisterAddress, setEmailRegisterAddress] = useState("");
  const [emailName, setEmailName] = useState("");
  const [showEmailRegister, setShowEmailRegister] = useState(false);

  // Google Simulated Sign-In Popups
  const [showGoogleAccounts, setShowGoogleAccounts] = useState(false);
  const [showGoogleRegister, setShowGoogleRegister] = useState(false);
  const [googleEmail, setGoogleEmail] = useState("");
  const [googleName, setGoogleName] = useState("");

  // Registration form inputs (when signing up via Google)
  const [regGender, setRegGender] = useState<Gender>("male");
  const [regCountry, setRegCountry] = useState<CountryCode>("CN");
  const [regDept, setRegDept] = useState("仓储部");
  const [regRole, setRegRole] = useState("拣货组长");
  const [regCurrency, setRegCurrency] = useState<CurrencyCode>("USD");

    // Login Session
  const [currentUser, setCurrentUser] = useState<Employee | null>(null);
  const [activeMobileTab, setActiveMobileTab] = useState<MobileTab>("home");
  const [previousTab, setPreviousTab] = useState<MobileTab>("home");
  const [isCheckingUpdate, setIsCheckingUpdate] = useState(false);
  const [expenseScrolled, setExpenseScrolled] = useState(false);
  const [attendanceScrolled, setAttendanceScrolled] = useState(false);
  const [isImmersiveMode, setIsImmersiveMode] = useState<boolean>(false);
  const [showConfetti, setShowConfetti] = useState(false);

  useEffect(() => {
    if (activeMobileTab === "payslip") {
      setShowConfetti(true);
      playHappyMusic();
      const timer = setTimeout(() => {
        setShowConfetti(false);
      }, 5500);
      return () => clearTimeout(timer);
    }
  }, [activeMobileTab]);

  // Device location and geofence simulation states
  const [deviceLat, setDeviceLat] = useState<number>(() => config.companyLat || 16.8661);
  const [deviceLng, setDeviceLng] = useState<number>(() => config.companyLng || 96.1951);
  const [locationPreset, setLocationPreset] = useState<string>("in_company");
  const [isLocating, setIsLocating] = useState<boolean>(false);
  const [showSimControls, setShowSimControls] = useState<boolean>(false);

  useEffect(() => {
    if (locationPreset === "in_company" && config.companyLat && config.companyLng) {
      setDeviceLat(config.companyLat);
      setDeviceLng(config.companyLng);
    } else if (locationPreset === "gate_offset" && config.companyLat && config.companyLng) {
      // Offset by approx 150m
      setDeviceLat(config.companyLat + 0.001);
      setDeviceLng(config.companyLng + 0.001);
    } else if (locationPreset === "outpost_offset" && config.companyLat && config.companyLng) {
      // Offset by approx 950m
      setDeviceLat(config.companyLat + 0.006);
      setDeviceLng(config.companyLng + 0.006);
    } else if (locationPreset === "home_offset" && config.companyLat && config.companyLng) {
      // Offset by approx 6km
      setDeviceLat(config.companyLat + 0.04);
      setDeviceLng(config.companyLng + 0.04);
    }
  }, [config.companyLat, config.companyLng, locationPreset]);

  // Leave application state variables
  const setLeaveRequests = (updated: any[]) => {
    if (onUpdateLeaveRequests) {
      onUpdateLeaveRequests(updated);
    }
  };
  const [simulatedDate, setSimulatedDate] = useState<string>(() => {
    const today = new Date();
    return today.toISOString().split("T")[0];
  });

  const [showLeaveForm, setShowLeaveForm] = useState(false);
  const [leaveType, setLeaveType] = useState("事假");
  const [leaveDays, setLeaveDays] = useState("1");
  const [leaveStart, setLeaveStart] = useState("");
  const [leaveEnd, setLeaveEnd] = useState("");
  const [leaveReason, setLeaveReason] = useState("");
  const [showDatePickerTarget, setShowDatePickerTarget] = useState<"start" | "end" | null>(null);
  const [showLeaveTypePicker, setShowLeaveTypePicker] = useState(false);
  const [pickerYear, setPickerYear] = useState<number>(2026);
  const [pickerMonth, setPickerMonth] = useState<number>(7);

  useEffect(() => {
    if (showLeaveForm) {
      if (!leaveStart) setLeaveStart(simulatedDate);
      if (!leaveEnd) setLeaveEnd(simulatedDate);
    }
  }, [showLeaveForm, simulatedDate]);

  // Notification Modal state
  const [notificationDetail, setNotificationDetail] = useState<{id?: string, title: string, time: string, content: string, category?: string, sop?: SopDocument} | null>(null);
  const [leaveStatusAlerts, setLeaveStatusAlerts] = useState<{ id: string; type: string; startDate: string; endDate: string; days: number; status: 'approved' | 'rejected' }[]>([]);
  const [sopSubTab, setSopSubTab] = useState<'training' | 'notification'>('training');
  const [attendanceSubTab, setAttendanceSubTab] = useState<'punch' | 'leave'>('punch');
  const [editingLeaveId, setEditingLeaveId] = useState<string | null>(null);

  // --- FACE RECOGNITION ATTENDANCE SYSTEM ---
  const [isFaceAttendanceOpen, setIsFaceAttendanceOpen] = useState(false);
  const [faceScanMode, setFaceScanMode] = useState<"in" | "out">("in");
  const [faceSelectedEmpId, setFaceSelectedEmpId] = useState<string>("unknown");
  const [isFaceScanning, setIsFaceScanning] = useState(false);
  const [faceScanResult, setFaceScanResult] = useState<any>(null);
  const [faceScanHistory, setFaceScanHistory] = useState<any[]>([]);
  const [isWebcamActive, setIsWebcamActive] = useState(false);
  const [isEmpSelectorOpen, setIsEmpSelectorOpen] = useState(false);
  const [empSearchQuery, setEmpSearchQuery] = useState("");
  const [mediaStream, setMediaStream] = useState<MediaStream | null>(null);
  const videoRef = useRef<HTMLVideoElement | null>(null);

  // New Batch Attendance and UI Enhancements
  const [faceAttendanceTab, setFaceAttendanceTab] = useState<'scan' | 'batch'>('batch');
  const [batchSelectedIds, setBatchSelectedIds] = useState<number[]>([]);
  const [selectedDeptFilter, setSelectedDeptFilter] = useState<string>("all");
  const [batchTimeSource, setBatchTimeSource] = useState<'shift' | 'current' | 'custom'>('shift');
  const [batchCustomTime, setBatchCustomTime] = useState<string>("09:00");
  const [attendanceStatusFilter, setAttendanceStatusFilter] = useState<'all' | 'not_punched' | 'punched'>('all');

  // Webcam stream control for face terminal
  useEffect(() => {
    if (isFaceAttendanceOpen && isWebcamActive) {
      navigator.mediaDevices.getUserMedia({ video: { width: 320, height: 240 } })
        .then(stream => {
          setMediaStream(stream);
          if (videoRef.current) {
            videoRef.current.srcObject = stream;
          }
        })
        .catch(err => {
          console.warn("Webcam activation failed:", err);
          setIsWebcamActive(false);
          addToast("📷 无法开启真实摄像头，已自动切换为科技模拟探测视窗。");
        });
    } else {
      if (mediaStream) {
        mediaStream.getTracks().forEach(track => track.stop());
        setMediaStream(null);
      }
    }
    return () => {
      if (mediaStream) {
        mediaStream.getTracks().forEach(track => track.stop());
      }
    };
  }, [isFaceAttendanceOpen, isWebcamActive]);

  const isManager = useMemo(() => {
    if (!currentUser) return false;
    const nameLower = (currentUser.name || "").toLowerCase();
    const usernameLower = (currentUser.username || "").toLowerCase();
    if (nameLower.includes("gary") || usernameLower.includes("gary")) {
      return true;
    }
    const roleName = (currentUser.role || "").toLowerCase();
    const deptName = (currentUser.dept || "").toLowerCase();
    return (
      roleName.includes("组长") ||
      roleName.includes("主管") ||
      roleName.includes("经理") ||
      roleName.includes("管理员") ||
      roleName.includes("管理") ||
      roleName.includes("leader") ||
      roleName.includes("manager") ||
      roleName.includes("admin") ||
      roleName.includes("keeper") ||
      roleName.includes("仓管") ||
      deptName.includes("管理")
    );
  }, [currentUser]);

  const getNextTempEmployeeName = (currentEmployees: Employee[]) => {
    const tempPrefix = "兼职工";
    const letters = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";
    const tempEmployees = currentEmployees.filter(e => e.name.startsWith(tempPrefix));
    const usedLetters = tempEmployees.map(e => e.name.replace(tempPrefix, "").trim());
    
    for (let i = 0; i < letters.length; i++) {
      if (!usedLetters.includes(letters[i])) {
        return `${tempPrefix}${letters[i]}`;
      }
    }
    return `${tempPrefix}${tempEmployees.length + 1}`;
  };

  const calculateEmployeeMonthlySummary = (emp: Employee, currentAttendanceList: AttendanceRecord[]) => {
    const currentMonth = simulatedDate.slice(0, 7); // e.g., "2026-07"
    const monthRecords = currentAttendanceList.filter(r => r.empId === emp.id && r.date.startsWith(currentMonth));
    
    let totalHours = 0;
    let otHours = 0;
    let otPay = 0;
    let workingDays = 0;
    
    monthRecords.forEach(rec => {
      if (rec.inTime && rec.outTime && rec.type !== 'absent' && rec.type !== 'leave') {
        workingDays++;
        const d = calcAttendanceDetails(rec, config);
        totalHours += d.valid;
        otHours += d.ot;
        otPay += calcOvertimePay(emp, rec.date, d.ot, config, holidays).amount;
      }
    });
    
    let basePay = 0;
    if (emp.baseMonthlyWage && emp.baseMonthlyWage > 0) {
      basePay = (emp.baseMonthlyWage / 30) * workingDays;
    } else if (emp.dailyWage && emp.dailyWage > 0) {
      basePay = emp.dailyWage * workingDays;
    } else if (emp.hourlyRate && emp.hourlyRate > 0) {
      basePay = emp.hourlyRate * (totalHours - otHours);
    } else {
      basePay = (emp.hourlyRate || 200) * (totalHours - otHours);
    }
    
    const mealAllowance = (emp.mealAllowanceDaily || 0) * workingDays;
    const grossPay = basePay + otPay + mealAllowance;
    const socialSec = emp.socialSecurity ? (emp.socialSecurity * (workingDays / 22)) : 0;
    const netPay = Math.max(0, grossPay - socialSec);
    
    return {
      workingDays,
      totalHours,
      otHours,
      basePay,
      otPay,
      grossPay,
      netPay
    };
  };

  const handleDirectPunch = (empId: number, mode: 'in' | 'out', customTime?: string) => {
    const targetEmp = employees.find(e => e.id === empId);
    if (!targetEmp) return;
    
    const punchTime = customTime || getSimulatedInTime();
    let updatedAttendance: AttendanceRecord[] = [];
    const existingRecord = attendance.find(r => r.empId === empId && r.date === simulatedDate);
    
    if (mode === "in") {
      if (existingRecord && existingRecord.inTime) {
        addToast(`⚠️ [${targetEmp.name}] 今日已有上班打卡记录: ${existingRecord.inTime}`);
        return;
      }
      
      let recordType: "normal" | "late" = "normal";
      const [startH, startM] = config.startShift.split(":").map(Number);
      const [punchH, punchM] = punchTime.split(":").map(Number);
      if (punchH > startH || (punchH === startH && punchM > startM)) {
        recordType = "late";
      }
      
      const newRecord: AttendanceRecord = {
        id: `att-face-${Date.now()}-${empId}`,
        empId,
        date: simulatedDate,
        inTime: punchTime,
        outTime: existingRecord ? existingRecord.outTime : "",
        type: existingRecord ? existingRecord.type : recordType,
        note: `👤 经主管 [${currentUser?.name || "管理员"}] 极速考勤直录上班`,
        inLat: config.companyLat || 16.8661,
        inLng: config.companyLng || 96.1951,
        inDistance: 0,
        inDeviated: false
      };
      
      if (existingRecord) {
        updatedAttendance = attendance.map(r => r.id === existingRecord.id ? { ...newRecord, outTime: r.outTime } : r);
      } else {
        updatedAttendance = [...attendance, newRecord];
      }
    } else {
      // Out punch
      if (existingRecord) {
        if (existingRecord.outTime) {
          addToast(`⚠️ [${targetEmp.name}] 今日已有下班打卡记录: ${existingRecord.outTime}`);
          return;
        }
        
        let recordType = existingRecord.type;
        const [endH, endM] = config.endShift.split(":").map(Number);
        const [punchH, punchM] = punchTime.split(":").map(Number);
        if (punchH < endH || (punchH === endH && punchM < endM)) {
          if (recordType === "normal") {
            recordType = "early";
          }
        }
        
        updatedAttendance = attendance.map(r => {
          if (r.id === existingRecord.id) {
            return {
              ...r,
              outTime: punchTime,
              type: recordType,
              note: `${r.note || ""} / 下班: 主管极速考勤直录下班`
            };
          }
          return r;
        });
      } else {
        updatedAttendance = [...attendance, {
          id: `att-face-${Date.now()}-${empId}`,
          empId,
          date: simulatedDate,
          inTime: "",
          outTime: punchTime,
          type: "normal",
          note: `👤 经主管 [${currentUser?.name || "管理员"}] 极速考勤直录下班 (未打上班卡)`,
          outLat: config.companyLat || 16.8661,
          outLng: config.companyLng || 96.1951,
          outDistance: 0,
          outDeviated: false
        }];
      }
    }
    
    onUpdateAttendance(updatedAttendance);
    localStorage.setItem("wms_attendance", JSON.stringify(updatedAttendance));
    
    const monthlySummary = calculateEmployeeMonthlySummary(targetEmp, updatedAttendance);
    const result = {
      emp: targetEmp,
      isNewTemp: false,
      punchMode: mode,
      punchTime,
      date: simulatedDate,
      summary: monthlySummary,
      status: mode === "in" 
        ? (punchTime > config.startShift ? "迟到" : "正常")
        : (punchTime < config.endShift ? "早退" : "正常"),
      isDirect: true
    };
    setFaceScanResult(result);
    setFaceScanHistory(prev => [result, ...prev]);
    addToast(`🎉 [${targetEmp.name}] ${mode === "in" ? "上班" : "下班"}卡直录成功！`);
  };

  const handleResetPunch = (empId: number) => {
    const targetEmp = employees.find(e => e.id === empId);
    if (!targetEmp) return;
    const updatedAttendance = attendance.filter(r => !(r.empId === empId && r.date === simulatedDate));
    onUpdateAttendance(updatedAttendance);
    localStorage.setItem("wms_attendance", JSON.stringify(updatedAttendance));
    addToast(`🔄 [${targetEmp.name}] 今日考勤记录已成功重置！`);
  };

  const handleBatchPunch = (mode: 'in' | 'out', customTime?: string) => {
    if (batchSelectedIds.length === 0) {
      addToast("⚠️ 请先勾选要批量考勤的员工！");
      return;
    }
    
    const punchTime = customTime || getSimulatedInTime();
    let updatedAttendance = [...attendance];
    let successCount = 0;
    let skipCount = 0;
    
    batchSelectedIds.forEach(empId => {
      const targetEmp = employees.find(e => e.id === empId);
      if (!targetEmp) return;
      
      const existingRecord = updatedAttendance.find(r => r.empId === empId && r.date === simulatedDate);
      
      if (mode === "in") {
        if (existingRecord && existingRecord.inTime) {
          skipCount++;
          return;
        }
        
        let recordType: "normal" | "late" = "normal";
        const [startH, startM] = config.startShift.split(":").map(Number);
        const [punchH, punchM] = punchTime.split(":").map(Number);
        if (punchH > startH || (punchH === startH && punchM > startM)) {
          recordType = "late";
        }
        
        const newRecord: AttendanceRecord = {
          id: `att-face-${Date.now()}-${empId}-${Math.random().toString(36).substr(2, 4)}`,
          empId,
          date: simulatedDate,
          inTime: punchTime,
          outTime: existingRecord ? existingRecord.outTime : "",
          type: existingRecord ? existingRecord.type : recordType,
          note: `👥 主管 [${currentUser?.name || "管理员"}] 授权批量极速考勤上班`,
          inLat: config.companyLat || 16.8661,
          inLng: config.companyLng || 96.1951,
          inDistance: 0,
          inDeviated: false
        };
        
        if (existingRecord) {
          updatedAttendance = updatedAttendance.map(r => r.id === existingRecord.id ? { ...newRecord, outTime: r.outTime } : r);
        } else {
          updatedAttendance.push(newRecord);
        }
        successCount++;
      } else {
        // out
        if (existingRecord) {
          if (existingRecord.outTime) {
            skipCount++;
            return;
          }
          
          let recordType = existingRecord.type;
          const [endH, endM] = config.endShift.split(":").map(Number);
          const [punchH, punchM] = punchTime.split(":").map(Number);
          if (punchH < endH || (punchH === endH && punchM < endM)) {
            if (recordType === "normal") {
              recordType = "early";
            }
          }
          
          updatedAttendance = updatedAttendance.map(r => {
            if (r.id === existingRecord.id) {
              return {
                ...r,
                outTime: punchTime,
                type: recordType,
                note: `${r.note || ""} / 下班: 主管授权批量极速考勤下班`
              };
            }
            return r;
          });
          successCount++;
        } else {
          updatedAttendance.push({
            id: `att-face-${Date.now()}-${empId}-${Math.random().toString(36).substr(2, 4)}`,
            empId,
            date: simulatedDate,
            inTime: "",
            outTime: punchTime,
            type: "normal",
            note: `👥 主管 [${currentUser?.name || "管理员"}] 授权批量极速考勤下班 (未打上班卡)`,
            outLat: config.companyLat || 16.8661,
            outLng: config.companyLng || 96.1951,
            outDistance: 0,
            outDeviated: false
          });
          successCount++;
        }
      }
    });
    
    if (successCount > 0) {
      onUpdateAttendance(updatedAttendance);
      localStorage.setItem("wms_attendance", JSON.stringify(updatedAttendance));
      
      const lastEmpId = batchSelectedIds[batchSelectedIds.length - 1];
      const lastEmp = employees.find(e => e.id === lastEmpId);
      if (lastEmp) {
        const monthlySummary = calculateEmployeeMonthlySummary(lastEmp, updatedAttendance);
        const result = {
          emp: lastEmp,
          isNewTemp: false,
          punchMode: mode,
          punchTime,
          date: simulatedDate,
          summary: monthlySummary,
          status: mode === "in" 
            ? (punchTime > config.startShift ? "迟到" : "正常")
            : (punchTime < config.endShift ? "早退" : "正常"),
          isBatch: true,
          batchCount: successCount
        };
        setFaceScanResult(result);
        setFaceScanHistory(prev => [result, ...prev]);
      }
      
      addToast(`🎉 成功批量录入 ${successCount} 名员工的${mode === "in" ? "上班" : "下班"}卡！`);
      setBatchSelectedIds([]);
    } else {
      addToast("⚠️ 所选员工今日均已有相同的考勤记录");
    }
  };

  const triggerFaceRecognitionPunch = () => {
    if (isFaceScanning) return;
    setIsFaceScanning(true);
    
    setTimeout(() => {
      let targetEmp: Employee | null = null;
      let isNewTemp = false;
      
      if (faceSelectedEmpId === "unknown") {
        const nextName = getNextTempEmployeeName(employees);
        const nextId = Math.max(10, ...employees.map(e => e.id)) + 1;
        
        targetEmp = {
          id: nextId,
          name: nextName,
          gender: Math.random() > 0.5 ? 'male' : 'female',
          country: currentUser?.country || 'CN',
          role: '兼职工',
          dept: '全仓',
          hourlyRate: 200,
          baseMonthlyWage: 0,
          dailyWage: 1500,
          attendanceBonus: 0,
          socialSecurity: 0,
          currency: config.currency,
          joinDate: simulatedDate,
          status: '在职',
          photo: null,
          username: `temp_${nextName.toLowerCase()}_${nextId}`
        };
        
        const updatedEmployees = [...employees, targetEmp];
        onUpdateEmployees(updatedEmployees);
        localStorage.setItem("wms_employees", JSON.stringify(updatedEmployees));
        isNewTemp = true;
      } else {
        const empIdNum = parseInt(faceSelectedEmpId, 10);
        targetEmp = employees.find(e => e.id === empIdNum) || null;
      }
      
      if (!targetEmp) {
        setIsFaceScanning(false);
        addToast("⚠️ 未能匹配到在册员工人脸，请重试");
        return;
      }
      
      const punchTime = getSimulatedInTime();
      let updatedAttendance: AttendanceRecord[] = [];
      const existingRecord = attendance.find(r => r.empId === targetEmp!.id && r.date === simulatedDate);
      
      if (faceScanMode === "in") {
        if (existingRecord && existingRecord.inTime) {
          setIsFaceScanning(false);
          addToast(`⚠️ [${targetEmp.name}] 今日已有上班打卡记录: ${existingRecord.inTime}`);
          return;
        }
        
        let recordType: "normal" | "late" = "normal";
        const [startH, startM] = config.startShift.split(":").map(Number);
        const [punchH, punchM] = punchTime.split(":").map(Number);
        if (punchH > startH || (punchH === startH && punchM > startM)) {
          recordType = "late";
        }
        
        const newRecord: AttendanceRecord = {
          id: `att-face-${Date.now()}-${targetEmp.id}`,
          empId: targetEmp.id,
          date: simulatedDate,
          inTime: punchTime,
          outTime: existingRecord ? existingRecord.outTime : "",
          type: existingRecord ? existingRecord.type : recordType,
          note: `👤 经由主管 [${currentUser?.name || "管理人员"}] 授权人脸识别批量打卡上班`,
          inLat: config.companyLat || 16.8661,
          inLng: config.companyLng || 96.1951,
          inDistance: 0,
          inDeviated: false
        };
        
        if (existingRecord) {
          updatedAttendance = attendance.map(r => r.id === existingRecord.id ? { ...newRecord, outTime: r.outTime } : r);
        } else {
          updatedAttendance = [...attendance, newRecord];
        }
      } else {
        // Out punch
        if (existingRecord) {
          if (existingRecord.outTime) {
            setIsFaceScanning(false);
            addToast(`⚠️ [${targetEmp.name}] 今日已有下班打卡记录: ${existingRecord.outTime}`);
            return;
          }
          
          let recordType = existingRecord.type;
          const [endH, endM] = config.endShift.split(":").map(Number);
          const [punchH, punchM] = punchTime.split(":").map(Number);
          if (punchH < endH || (punchH === endH && punchM < endM)) {
            if (recordType === "normal") {
              recordType = "early";
            }
          }
          
          updatedAttendance = attendance.map(r => {
            if (r.id === existingRecord.id) {
              return {
                ...r,
                outTime: punchTime,
                type: recordType,
                note: `${r.note || ""} / 下班: 👤 人脸识别打卡`
              };
            }
            return r;
          });
        } else {
          updatedAttendance = [...attendance, {
            id: `att-face-${Date.now()}-${targetEmp.id}`,
            empId: targetEmp.id,
            date: simulatedDate,
            inTime: "",
            outTime: punchTime,
            type: "normal",
            note: `👤 经由主管 [${currentUser?.name || "管理人员"}] 授权人脸识别下班打卡 (未打上班卡)`,
            outLat: config.companyLat || 16.8661,
            outLng: config.companyLng || 96.1951,
            outDistance: 0,
            outDeviated: false
          }];
        }
      }
      
      onUpdateAttendance(updatedAttendance);
      localStorage.setItem("wms_attendance", JSON.stringify(updatedAttendance));
      
      const monthlySummary = calculateEmployeeMonthlySummary(targetEmp, updatedAttendance);
      
      const result = {
        emp: targetEmp,
        isNewTemp,
        punchMode: faceScanMode,
        punchTime,
        date: simulatedDate,
        summary: monthlySummary,
        status: faceScanMode === "in" 
          ? (punchTime > config.startShift ? "迟到" : "正常")
          : (punchTime < config.endShift ? "早退" : "正常")
      };
      
      setFaceScanResult(result);
      setFaceScanHistory(prev => [result, ...prev]);
      setIsFaceScanning(false);
      addToast(`🎉 [${targetEmp.name}] 人脸识别打卡成功！`);
      
    }, 1200);
  };

  // Employee Payslip Modal & Payout Confirmation states
  const [showEmployeeSlipModal, setShowEmployeeSlipModal] = useState(false);
  const [employeeSignName, setEmployeeSignName] = useState("");
  const [employeePledgeChecked, setEmployeePledgeChecked] = useState(false);
  
  // Handwriting signature states
  const [isSignatureModalOpen, setIsSignatureModalOpen] = useState(false);
  const [isPortrait, setIsPortrait] = useState(true);

  useEffect(() => {
    const handleResize = () => {
      setIsPortrait(window.innerHeight > window.innerWidth);
    };
    handleResize();
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || !isSignatureModalOpen) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    // Set line properties for nice smooth drawing ink
    ctx.strokeStyle = "#1e293b"; // slate-800
    ctx.lineWidth = 3.5;
    ctx.lineCap = "round";
    ctx.lineJoin = "round";

    let lastPoint: { x: number; y: number } | null = null;
    let drawing = false;

    const handleStart = (e: MouseEvent | TouchEvent) => {
      e.preventDefault();
      const coords = getCanvasCoords(e, canvas, true);
      if (!coords) return;
      drawing = true;
      lastPoint = coords;
      
      ctx.beginPath();
      ctx.moveTo(coords.x, coords.y);
    };

    const handleMove = (e: MouseEvent | TouchEvent) => {
      if (!drawing || !lastPoint) return;
      e.preventDefault();
      const coords = getCanvasCoords(e, canvas, true);
      if (!coords) return;

      ctx.beginPath();
      ctx.moveTo(lastPoint.x, lastPoint.y);
      ctx.lineTo(coords.x, coords.y);
      ctx.stroke();
      
      lastPoint = coords;
    };

    const handleEnd = () => {
      drawing = false;
      lastPoint = null;
    };

    // Attach mouse events
    canvas.addEventListener("mousedown", handleStart);
    canvas.addEventListener("mousemove", handleMove);
    canvas.addEventListener("mouseup", handleEnd);
    canvas.addEventListener("mouseleave", handleEnd);

    // Attach touch events with passive: false to prevent scrolling
    canvas.addEventListener("touchstart", handleStart, { passive: false });
    canvas.addEventListener("touchmove", handleMove, { passive: false });
    canvas.addEventListener("touchend", handleEnd, { passive: false });

    return () => {
      canvas.removeEventListener("mousedown", handleStart);
      canvas.removeEventListener("mousemove", handleMove);
      canvas.removeEventListener("mouseup", handleEnd);
      canvas.removeEventListener("mouseleave", handleEnd);

      canvas.removeEventListener("touchstart", handleStart);
      canvas.removeEventListener("touchmove", handleMove);
      canvas.removeEventListener("touchend", handleEnd);
    };
  }, [isSignatureModalOpen, isPortrait]);
  const [payouts, setPayouts] = useState<Record<string, boolean>>(() => {
    try {
      const saved = localStorage.getItem("payroll_payout_status");
      return saved ? JSON.parse(saved) : {};
    } catch {
      return {};
    }
  });

  const [empConfirmations, setEmpConfirmations] = useState<Record<string, string>>(() => {
    try {
      const saved = localStorage.getItem("payroll_employee_signatures");
      return saved ? JSON.parse(saved) : {};
    } catch {
      return {};
    }
  });

  useEffect(() => {
    localStorage.setItem("payroll_payout_status", JSON.stringify(payouts));
  }, [payouts]);

  // Sync payouts and signatures with localStorage when tab or visibility changes
  useEffect(() => {
    const syncPayoutsAndSignatures = () => {
      try {
        const saved = localStorage.getItem("payroll_payout_status");
        if (saved) {
          const parsed = JSON.parse(saved);
          setPayouts(parsed);
        }
        const savedSigs = localStorage.getItem("payroll_employee_signatures");
        if (savedSigs) {
          const parsedSigs = JSON.parse(savedSigs);
          setEmpConfirmations(parsedSigs);
        }
        const savedSops = localStorage.getItem("wms_sop_documents");
        if (savedSops) {
          setSops(JSON.parse(savedSops));
        }
      } catch (e) {
        console.error(e);
      }
    };
    syncPayoutsAndSignatures();
    
    window.addEventListener("storage", syncPayoutsAndSignatures);
    return () => {
      window.removeEventListener("storage", syncPayoutsAndSignatures);
    };
  }, [activeMobileTab]);

  // Clock state
  const [currentTime, setCurrentTime] = useState(new Date());
  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  const timeString = currentTime.toLocaleTimeString("zh-CN", { hour12: false });
  const dateString = currentTime.toLocaleDateString("zh-CN", { 
    month: "long", 
    day: "numeric", 
    weekday: "long" 
  });

  // Retrieve today's formatted time
  const getSimulatedInTime = () => {
    const hours = currentTime.getHours().toString().padStart(2, "0");
    const mins = currentTime.getMinutes().toString().padStart(2, "0");
    return `${hours}:${mins}`;
  };

  // Find today's record for logged-in user
  const todayRecord = currentUser 
    ? attendance.find(r => r.empId === currentUser.id && r.date === simulatedDate)
    : null;

  // SOP documents
  const [sops, setSops] = useState<SopDocument[]>([]);
  const loadSops = () => {
    try {
      const saved = localStorage.getItem("wms_sop_documents");
      if (saved) {
        setSops(JSON.parse(saved));
      } else {
        setSops([]);
      }
    } catch {
      setSops([]);
    }
  };

  // Expenses lists (for submitting and history)
  const [userExpenses, setUserExpenses] = useState<ExpenseRecord[]>([]);
  const loadUserExpenses = () => {
    try {
      const saved = localStorage.getItem("wms_expense_records");
      if (saved && currentUser) {
        const parsed: ExpenseRecord[] = JSON.parse(saved);
        setUserExpenses(parsed.filter(e => e.payerId === currentUser.id));
      }
    } catch {
      setUserExpenses([]);
    }
  };

  useEffect(() => {
    if (currentUser) {
      loadSops();
      loadUserExpenses();
    }
  }, [currentUser]);

  // Synchronize currentUser when the global employees list is updated (e.g., from the admin panel)
  useEffect(() => {
    if (currentUser) {
      const latest = employees.find(e => e.id === currentUser.id);
      if (latest) {
        if (JSON.stringify(latest) !== JSON.stringify(currentUser)) {
          setCurrentUser(latest);
        }
      }
    }
  }, [employees, currentUser]);

  // Real-time metrics calculations for logged-in user
  const employeeAttendance = currentUser ? attendance.filter(r => r.empId === currentUser.id) : [];
  const calculatedDays = employeeAttendance.length;
  const calculatedHours = employeeAttendance.reduce((acc, r) => {
    if (r.inTime && r.outTime) {
      const [inH, inM] = r.inTime.split(":").map(Number);
      const [outH, outM] = r.outTime.split(":").map(Number);
      const hours = outH - inH + (outM - inM) / 60;
      return acc + Math.max(0, parseFloat(hours.toFixed(1)));
    }
    return acc + 8;
  }, 0);
  const pendingSopsCount = currentUser ? sops.filter(sop => {
    if (sop.status !== 'published') return false;
    if (sop.category === 'catering') return false;
    const isTargeted = sop.targetType === 'all' || sop.targetEmployeeIds?.includes(currentUser.id);
    return isTargeted && !sop.reads[currentUser.id];
  }).length : 0;

  const dynamicNotifications = currentUser ? sops.filter(sop => {
    if (sop.status !== 'published') return false;
    const isCatering = sop.category === 'catering';
    if (!isCatering && (sop.docType || 'training') !== 'notification') return false;
    return sop.targetType === 'all' || sop.targetEmployeeIds?.includes(currentUser.id);
  }) : [];

  const filteredEmployeeSops = currentUser ? sops.filter(sop => {
    if (sop.status !== 'published') return false;
    if (sop.category === 'catering') return false;
    const type = sop.docType || 'training';
    if (type !== sopSubTab) return false;
    return sop.targetType === 'all' || sop.targetEmployeeIds?.includes(currentUser.id);
  }) : [];

  // Monitor leave request status changes for notifications
  const userLeaveRequests = useMemo(() => {
    if (!currentUser) return [];
    return leaveRequests.filter(l => l.empId === currentUser.id);
  }, [leaveRequests, currentUser]);

  useEffect(() => {
    if (!currentUser || userLeaveRequests.length === 0) return;

    const storageKey = `notified_leave_statuses_${currentUser.id}`;
    let acknowledgedStatuses: Record<string, string> = {};
    try {
      const saved = localStorage.getItem(storageKey);
      if (saved) acknowledgedStatuses = JSON.parse(saved);
    } catch (e) {
      console.error("Failed to load leave status notifications", e);
    }

    const isFirstRun = !localStorage.getItem(storageKey);
    if (isFirstRun) {
      // Initialize with current statuses to avoid spamming existing on first load
      userLeaveRequests.forEach(r => {
        acknowledgedStatuses[r.id] = r.status;
      });
      localStorage.setItem(storageKey, JSON.stringify(acknowledgedStatuses));
      return;
    }

    let updated = false;
    const newNotifications: { id: string; type: string; startDate: string; endDate: string; days: number; status: 'approved' | 'rejected' }[] = [];

    userLeaveRequests.forEach(req => {
      const prevStatus = acknowledgedStatuses[req.id];
      if (prevStatus !== req.status) {
        if (req.status === 'approved' || req.status === 'rejected') {
          newNotifications.push({
            id: req.id,
            type: req.type,
            startDate: req.startDate,
            endDate: req.endDate,
            days: req.days,
            status: req.status
          });
        }
        acknowledgedStatuses[req.id] = req.status;
        updated = true;
      }
    });

    if (updated) {
      localStorage.setItem(storageKey, JSON.stringify(acknowledgedStatuses));
    }

    if (newNotifications.length > 0) {
      setLeaveStatusAlerts(prev => [...prev, ...newNotifications]);
      playHappyMusic();
    }
  }, [userLeaveRequests, currentUser]);

  // Historic baseline padding for dashboard realism
  const displayHours = calculatedHours > 0 ? (Math.round(calculatedHours) + 156) : 164;
  const displayDays = calculatedDays > 0 ? (calculatedDays + 17) : 18;

  // Currency & reimbursement calculations
  const getConvertedAmount = (amount: number, from: string = "CNY", to: string) => {
    const rates: Record<string, number> = {
      USD: 1,
      CNY: 7.25,
      THB: 36.5,
      MYR: 4.70,
      IDR: 16300,
      PHP: 58.5,
      VND: 25400,
    };
    const amountInUSD = amount / (rates[from] || 7.25);
    return Math.round(amountInUSD * (rates[to] || 1) * 100) / 100;
  };

  const currentMonthStr = simulatedDate.slice(0, 7); // e.g. "2026-07"
  const formattedMonthStr = (() => {
    if (!currentMonthStr) return "";
    const [yr, mo] = currentMonthStr.split("-");
    return `${yr}年${parseInt(mo, 10)}月`;
  })();

  const monthlySummary = useMemo(() => {
    if (!currentUser) return null;
    
    // Filter records for current month
    const monthlyRecs = attendance.filter(rec => rec.empId === currentUser.id && rec.date && rec.date.startsWith(currentMonthStr));
    
    let valid = 0, ot = 0, otPay = 0, basePay = 0;
    let workingDays = 0;
    let otCount = 0;
    let mealAllowance = 0;
    
    monthlyRecs.forEach(rec => {
      const d = calcAttendanceDetails(rec, config);
      valid += d.valid;
      ot += d.ot;
      otPay += calcOvertimePay(currentUser, rec.date, d.ot, config, holidays).amount;
      
      if (d.ot > 0) {
        otCount += 1;
      }
      
      const isAbsentOrLeave = currentUser.status === '休假' || rec.type === 'absent' || rec.type === 'leave';
      if (!isAbsentOrLeave) {
        workingDays += 1;
        
        const getMealAllowanceVal = (e: Employee) => {
          return e.mealAllowanceDaily !== undefined && e.mealAllowanceDaily !== null ? e.mealAllowanceDaily : 0;
        };
        mealAllowance += getMealAllowanceVal(currentUser);

        const hasBaseWage = currentUser.baseMonthlyWage !== undefined && currentUser.baseMonthlyWage !== null && currentUser.baseMonthlyWage > 0;
        const hasDailyWage = currentUser.dailyWage !== undefined && currentUser.dailyWage !== null && currentUser.dailyWage > 0;
        if (hasBaseWage) {
          basePay += currentUser.baseMonthlyWage / 30; // Daily converted wage from base monthly salary
        } else if (hasDailyWage) {
          basePay += (d.valid - d.ot) * (currentUser.dailyWage / config.standardHours); // Proportional daily wage based on actual hours on duty
        } else {
          basePay += (d.valid - d.ot) * (currentUser.hourlyRate ?? 0); // Normal working hours * hourly rate
        }
      }
    });
    
    const bonus = currentUser.attendanceBonus ?? 0;
    const ssSec = currentUser.socialSecurity ?? 0;
    const gross = basePay + otPay + bonus + mealAllowance;
    const tax = (basePay + otPay + bonus) * config.taxRate;
    const net = Math.max(0, gross - tax - ssSec);
    
    return {
      workingDays,
      valid,
      ot,
      otCount,
      basePay,
      otPay,
      bonus,
      mealAllowance,
      gross,
      tax,
      ssSec,
      net
    };
  }, [currentUser, attendance, currentMonthStr, config]);

  const reimbursedAmount = currentUser ? userExpenses
    .filter(e => e.status === "approved")
    .reduce((acc, e) => {
      const converted = getConvertedAmount(e.amount, e.currency || "CNY", currentUser.currency);
      return acc + converted;
    }, 0) : 0;

  const basePay = monthlySummary ? monthlySummary.basePay : (currentUser ? (currentUser.baseMonthlyWage || (currentUser.dailyWage ? currentUser.dailyWage * 3 : 0) || 4500) : 4500);
  const otPay = monthlySummary ? monthlySummary.otPay : 0;
  const bonusPay = monthlySummary ? monthlySummary.bonus : (currentUser ? (currentUser.attendanceBonus ?? 500) : 500);
  const mealAllowancePay = monthlySummary ? monthlySummary.mealAllowance : 0;
  const securityDeduct = monthlySummary ? monthlySummary.ssSec : (currentUser ? (currentUser.socialSecurity ?? 150) : 150);
  const taxDeduct = monthlySummary ? monthlySummary.tax : ((basePay + otPay + bonusPay) * config.taxRate);
  const netPayoutWithoutReimbursement = monthlySummary ? monthlySummary.net : Math.max(0, basePay + otPay + bonusPay + mealAllowancePay - taxDeduct - securityDeduct);
  const netPayout = netPayoutWithoutReimbursement + reimbursedAmount;

  // Handle Punch In
  const handlePunchIn = () => {
    if (!currentUser) return;

    const currentPunchTime = getSimulatedInTime();
    
    // Determine shift late type
    let recordType: any = "normal";
    const [startH, startM] = config.startShift.split(":").map(Number);
    const [punchH, punchM] = currentPunchTime.split(":").map(Number);
    
    if (punchH > startH || (punchH === startH && punchM > startM)) {
      recordType = "late";
    }

    const companyLattitude = config.companyLat || 16.8661;
    const companyLongitude = config.companyLng || 96.1951;
    const distance = getDistanceInMeters(deviceLat, deviceLng, companyLattitude, companyLongitude);
    const isDeviated = distance > 800;

    const newRecord: AttendanceRecord = {
      id: `att-mob-${Date.now()}`,
      empId: currentUser.id,
      date: simulatedDate,
      inTime: currentPunchTime,
      outTime: "",
      type: recordType,
      note: isDeviated 
        ? `⚠️ 异地打卡，偏离规定办公点 ${distance} 米（超标）` 
        : `📍 正常打卡，距离规定办公点 ${distance} 米`,
      inLat: deviceLat,
      inLng: deviceLng,
      inDistance: distance,
      inDeviated: isDeviated
    };

    const updated = [...attendance, newRecord];
    onUpdateAttendance(updated);
    
    if (isDeviated) {
      addToast(`⚠️ 异地打卡警告: 您偏离了公司 ${distance}米！`);
    } else {
      addToast(`[${currentUser.name}] 上班打卡成功: ${currentPunchTime} (距离: ${distance}米)`);
    }
    
    // Auto sync back to memory
    localStorage.setItem("wms_attendance", JSON.stringify(updated));
  };

  // Handle Punch Out
  const handlePunchOut = () => {
    if (!currentUser) return;

    const currentPunchTime = getSimulatedInTime();
    let updated: AttendanceRecord[] = [];

    const companyLattitude = config.companyLat || 16.8661;
    const companyLongitude = config.companyLng || 96.1951;
    const distance = getDistanceInMeters(deviceLat, deviceLng, companyLattitude, companyLongitude);
    const isDeviated = distance > 800;

    if (todayRecord) {
      // Determine if early
      let recordType = todayRecord.type;
      const [endH, endM] = config.endShift.split(":").map(Number);
      const [punchH, punchM] = currentPunchTime.split(":").map(Number);
      
      if (punchH < endH || (punchH === endH && punchM < endM)) {
        if (recordType === "normal") {
          recordType = "early";
        }
      }

      updated = attendance.map(r => {
        if (r.id === todayRecord.id) {
          return {
            ...r,
            outTime: currentPunchTime,
            type: recordType,
            note: r.note 
              ? `${r.note} / 下班: ${isDeviated ? `⚠️ 异地偏离 ${distance}米` : `📍 正常 ${distance}米`}`
              : (isDeviated ? `⚠️ 下班异地打卡，偏离 ${distance} 米` : `📍 下班正常打卡，距离 ${distance} 米`),
            outLat: deviceLat,
            outLng: deviceLng,
            outDistance: distance,
            outDeviated: isDeviated
          };
        }
        return r;
      });
    } else {
      // Direct clock out without clock in
      updated = [...attendance, {
        id: `att-mob-${Date.now()}`,
        empId: currentUser.id,
        date: simulatedDate,
        inTime: "",
        outTime: currentPunchTime,
        type: "normal",
        note: isDeviated 
          ? `⚠️ 缺上班卡，下班异地打卡，偏离 ${distance} 米` 
          : `📍 缺上班卡，下班正常打卡，距离 ${distance} 米`,
        outLat: deviceLat,
        outLng: deviceLng,
        outDistance: distance,
        outDeviated: isDeviated
      }];
    }

    onUpdateAttendance(updated);
    
    if (isDeviated) {
      addToast(`⚠️ 异地下班打卡警告: 您偏离了公司 ${distance}米！`);
    } else {
      addToast(`[${currentUser.name}] 下班打卡成功: ${currentPunchTime} (距离: ${distance}米)`);
    }
    
    localStorage.setItem("wms_attendance", JSON.stringify(updated));
  };

  // Leave Application Action
  const handleApplyLeave = () => {
    if (currentUser?.status === '离职') {
      addToast("⚠️ 您已办理离职，该账号已进入只读归档状态，无法提交请假申请。如有疑问请联系HR。");
      return;
    }
    if (!leaveStart || !leaveEnd) {
      addToast("请选择完整的请假时间！");
      return;
    }
    if (!currentUser) return;

    if (editingLeaveId) {
      const updated = leaveRequests.map(l => {
        if (l.id === editingLeaveId) {
          return {
            ...l,
            type: leaveType,
            days: parseFloat(leaveDays) || 1,
            startDate: leaveStart,
            endDate: leaveEnd,
            reason: leaveReason || "未填写事由",
            status: "pending" as const
          };
        }
        return l;
      });
      setLeaveRequests(updated);
      addToast(`🎉 请假申请已成功修改，等待管理员审批。`);
      setEditingLeaveId(null);
    } else {
      const newLeave = {
        id: `leave-${Date.now()}`,
        empId: currentUser.id,
        type: leaveType,
        days: parseFloat(leaveDays) || 1,
        startDate: leaveStart,
        endDate: leaveEnd,
        reason: leaveReason || "未填写事由",
        status: "pending" as const
      };
      const updated = [newLeave, ...leaveRequests];
      setLeaveRequests(updated);
      addToast(`🎉 请假申请已提交，等待管理员审批。您可以在下方“请假申请历史”中查看实时状态。`);
    }

    setShowLeaveForm(false);
    setLeaveReason("");
    setLeaveStart("");
    setLeaveEnd("");
  };

  // SOP Reading Actions
  const [viewingSop, setViewingSop] = useState<SopDocument | null>(null);
  const [pledgeChecked, setPledgeChecked] = useState(false);
  const [viewingRecipeSop, setViewingRecipeSop] = useState<SopDocument | null>(null);
  const [recipeZoomPercent, setRecipeZoomPercent] = useState(100);

  const handleReadSop = (sopId: string) => {
    if (!currentUser) return;
    if (currentUser?.status === '离职') {
      addToast("⚠️ 您已办理离职，该账号已进入只读归档状态，无法进行SOP签署。如有疑问请联系HR。");
      return;
    }
    
    const nowStr = new Date().toLocaleString("zh-CN");
    const updatedSops = sops.map(s => {
      if (s.id === sopId) {
        return {
          ...s,
          reads: {
            ...s.reads,
            [currentUser.id]: nowStr
          }
        };
      }
      return s;
    });

    setSops(updatedSops);
    localStorage.setItem("wms_sop_documents", JSON.stringify(updatedSops));
    addToast("已成功确认阅读并签署SOP安全作业承诺");
    setViewingSop(null);
    setPledgeChecked(false);
  };

  const handleMarkAsRead = (sopId: string) => {
    if (!currentUser) return;
    const nowStr = new Date().toLocaleString("zh-CN");
    const updatedSops = sops.map(s => {
      if (s.id === sopId) {
        return {
          ...s,
          reads: {
            ...s.reads,
            [currentUser.id]: nowStr
          }
        };
      }
      return s;
    });

    setSops(updatedSops);
    localStorage.setItem("wms_sop_documents", JSON.stringify(updatedSops));
    window.dispatchEvent(new Event("storage"));
  };

  // New Expense states
  const [showExpenseForm, setShowExpenseForm] = useState(false);
  const [newExpName, setNewExpName] = useState("");
  const [newExpType, setNewExpType] = useState("物耗杂费");
  const [newExpAmount, setNewExpAmount] = useState("");
  const [newExpCurrency, setNewExpCurrency] = useState("CNY");
  const [newExpNote, setNewExpNote] = useState("");
  const [selectedReceipt, setSelectedReceipt] = useState(0);
  const [uploadedReceipt, setUploadedReceipt] = useState<string | null>(null);
  const [uploadedReceiptName, setUploadedReceiptName] = useState<string>("");
  const [expPurpose, setExpPurpose] = useState<'payout' | 'income' | 'advance'>('payout');
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [showCancelConfirm, setShowCancelConfirm] = useState(false);

  const handleCancelExpense = () => {
    setNewExpName("");
    setNewExpType("物耗杂费");
    setNewExpAmount("");
    setNewExpCurrency("CNY");
    setNewExpNote("");
    setUploadedReceipt(null);
    setUploadedReceiptName("");
    setExpPurpose("payout");
    if (fileInputRef.current) fileInputRef.current.value = "";
    setShowCancelConfirm(false);
    setActiveMobileTab("expense");
  };

  const checkCancelWithConfirm = () => {
    const hasInput = newExpName.trim() !== "" || newExpAmount.trim() !== "" || newExpNote.trim() !== "" || uploadedReceipt !== null;
    if (hasInput) {
      setShowCancelConfirm(true);
    } else {
      handleCancelExpense();
    }
  };

  const [selectedExpense, setSelectedExpense] = useState<ExpenseRecord | null>(null);

  useEffect(() => {
    setExpenseScrolled(false);
    setAttendanceScrolled(false);
  }, [activeMobileTab, selectedExpense]);

  const [editingExpenseId, setEditingExpenseId] = useState<string | null>(null);
  const [showExpenseActionConfirm, setShowExpenseActionConfirm] = useState<{
    type: 'edit' | 'recall' | 'delete';
    expense: ExpenseRecord;
  } | null>(null);

  // Real-time approval workflow config loader
  const approvalFlowConfig = useMemo(() => {
    try {
      const saved = localStorage.getItem("wms_approval_flow_config");
      if (saved) return JSON.parse(saved);
    } catch {}
    return {
      payout: {
        enabled: true,
        steps: ["提交申请", "部门主管审批", "财务专员审核", "完成"]
      },
      income: {
        enabled: false,
        steps: ["录入账目", "财务对账", "出纳确认"]
      }
    };
  }, [selectedExpense, activeMobileTab]);

  const handleStartEdit = (exp: ExpenseRecord) => {
    setNewExpName(exp.name);
    setNewExpType(exp.type);
    setNewExpAmount(exp.amount.toString());
    setNewExpCurrency(exp.currency || "CNY");
    setNewExpNote(exp.note || "");
    setUploadedReceipt(exp.receiptUrl || null);
    setUploadedReceiptName(exp.receiptName || "");
    setExpPurpose(exp.purpose || "payout");
    setEditingExpenseId(exp.id);
    setSelectedExpense(null);
    setActiveMobileTab("add_expense");
  };

  const handleRecallExpense = (expenseId: string) => {
    try {
      const saved = localStorage.getItem("wms_expense_records");
      if (saved) {
        const currentExpenses: ExpenseRecord[] = JSON.parse(saved);
        const updated = currentExpenses.map(exp => {
          if (exp.id === expenseId) {
            return {
              ...exp,
              status: "recalled" as any
            };
          }
          return exp;
        });
        localStorage.setItem("wms_expense_records", JSON.stringify(updated));
        addToast(locale === "zh-CN" ? "报销单已成功撤回" : locale === "zh-TW" ? "報銷單已成功撤回" : "Reimbursement recalled");
        loadUserExpenses();
        if (selectedExpense && selectedExpense.id === expenseId) {
          setSelectedExpense({
            ...selectedExpense,
            status: "recalled" as any
          });
        }
      }
    } catch {
      addToast("撤回失败，请重试");
    }
  };

  const handleDeleteExpense = (expenseId: string) => {
    try {
      const saved = localStorage.getItem("wms_expense_records");
      if (saved) {
        const currentExpenses: ExpenseRecord[] = JSON.parse(saved);
        const updated = currentExpenses.filter(exp => exp.id !== expenseId);
        localStorage.setItem("wms_expense_records", JSON.stringify(updated));
        addToast(locale === "zh-CN" ? "报销单已删除" : locale === "zh-TW" ? "報銷單已刪除" : "Reimbursement deleted");
        setSelectedExpense(null);
        loadUserExpenses();
      }
    } catch {
      addToast("删除失败，请重试");
    }
  };

  const handleFileChange = (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setUploadedReceiptName(file.name);
      const reader = new FileReader();
      reader.onloadend = () => {
        setUploadedReceipt(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const receiptPresets = [
    { name: "日常办公耗材账单", url: "https://images.unsplash.com/photo-1506784983877-45594efa4cbe?w=500&auto=format&fit=crop&q=60" },
    { name: "设备维修清单收据", url: "https://images.unsplash.com/photo-1554224155-8d04cb21cd6c?w=500&auto=format&fit=crop&q=60" },
    { name: "仓储物流发票凭证", url: "https://images.unsplash.com/photo-1554415707-6e8cfc93fe23?w=500&auto=format&fit=crop&q=60" }
  ];

  const handleSubmitExpense = (e: FormEvent) => {
    e.preventDefault();
    if (currentUser?.status === '离职') {
      addToast("⚠️ 您已办理离职，该账号已进入只读归档状态，无法提交报销申请。如有疑问请联系HR。");
      return;
    }
    if (!currentUser || !newExpName || !newExpAmount) {
      addToast("请填写完整信息");
      return;
    }

    const val = parseFloat(newExpAmount);
    if (isNaN(val) || val <= 0) {
      addToast("请输入合法的金额");
      return;
    }

    try {
      const saved = localStorage.getItem("wms_expense_records");
      const currentExpenses: ExpenseRecord[] = saved ? JSON.parse(saved) : [];

      let updated: ExpenseRecord[] = [];
      if (editingExpenseId) {
        updated = currentExpenses.map(exp => {
          if (exp.id === editingExpenseId) {
            return {
              ...exp,
              name: newExpName,
              type: newExpType,
              amount: val,
              currency: newExpCurrency,
              receiptUrl: uploadedReceipt || exp.receiptUrl || "",
              receiptName: uploadedReceiptName || exp.receiptName || "",
              note: newExpNote,
              purpose: expPurpose,
              status: "pending" as const // Resubmit resets to pending
            };
          }
          return exp;
        });
        localStorage.setItem("wms_expense_records", JSON.stringify(updated));
        addToast(locale === "zh-CN" ? "报销单已更新并重新提交审批" : locale === "zh-TW" ? "報銷單已更新並重新提交審批" : "Reimbursement application resubmitted successfully");
        setEditingExpenseId(null);
      } else {
        const newRecord: ExpenseRecord = {
          id: `exp-${Date.now()}`,
          name: newExpName,
          type: newExpType,
          paymentMethod: "员工代垫",
          amount: val,
          currency: newExpCurrency,
          receiptUrl: uploadedReceipt || "",
          receiptName: uploadedReceiptName || "",
          payerId: currentUser.id,
          payerName: currentUser.name,
          paymentTime: simulatedDate,
          status: "pending",
          note: newExpNote,
          purpose: expPurpose
        };
        updated = [newRecord, ...currentExpenses];
        localStorage.setItem("wms_expense_records", JSON.stringify(updated));
        addToast(t("reim_success"));
      }
      
      // Reset form and reload
      setNewExpName("");
      setNewExpAmount("");
      setNewExpNote("");
      setUploadedReceipt(null);
      setUploadedReceiptName("");
      setExpPurpose("payout");
      setShowExpenseForm(false);
      setActiveMobileTab("expense");
      loadUserExpenses();
    } catch {
      addToast("提交失败，请重试");
    }
  };

  return (
    <div className={`w-full rounded-2xl border border-slate-200 p-6 flex transition-all duration-500 relative min-h-[calc(100vh-10rem)] ${
      isImmersiveMode 
        ? "justify-center items-center bg-gradient-to-tr from-slate-950 via-slate-900 to-slate-950 p-10 shadow-inner" 
        : "bg-slate-100/50 flex-col-reverse md:flex-row-reverse gap-8"
    }`}>
      
      {/* Floating immersive controller */}
      {isImmersiveMode && (
        <div className="absolute top-4 left-4 z-50 flex items-center gap-2 bg-slate-800/90 backdrop-blur-md px-4 py-2.5 rounded-full border border-slate-700/80 shadow-2xl animate-fade-in">
          <span className="flex h-2 w-2 relative">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
          </span>
          <span className="text-xs font-black text-slate-100">沉浸式体验模式</span>
          <div className="h-4 w-px bg-slate-700 mx-1" />
          <button
            type="button"
            onClick={() => {
              setIsImmersiveMode(false);
              addToast("已返回标准调试面板");
            }}
            className="text-xs font-black text-brand-400 hover:text-brand-300 cursor-pointer flex items-center gap-1 transition"
          >
            <Sparkles className="w-3.5 h-3.5" /> 退出并返回调试面板
          </button>
        </div>
      )}

      {/* Admin Controller (Now on the Right, hidden in Immersive Mode) */}
      {!isImmersiveMode && (
        <div className="flex-1 space-y-6">
          <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm space-y-4">
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <span className="p-1.5 bg-brand-50 text-brand-600 rounded-lg">
                  <Sparkles className="w-5 h-5" />
                </span>
                <h3 className="font-extrabold text-slate-800 text-sm">员工移动端APP调试面板</h3>
              </div>
              
              <button
                type="button"
                onClick={() => {
                  setIsImmersiveMode(true);
                  addToast("✨ 已开启沉浸式体验！");
                }}
                className="px-3 py-1.5 bg-brand-600 hover:bg-brand-700 text-white rounded-xl text-xs font-black shadow-xs transition flex items-center gap-1 cursor-pointer"
              >
                <Smartphone className="w-3.5 h-3.5 animate-bounce" />
                沉浸模式
              </button>
            </div>
          
          <p className="text-xs text-slate-500 leading-relaxed">
            当前页面模拟了仓区员工日常使用的<b>掌上考勤APP</b>。所有在左侧菜单“员工管理”和“SOP管理”中新增或发布的数据均实时加载并同步至此APP。在APP内打卡、签署SOP、提交报销的数据，将<b>实时同步回管理系统后台</b>。
          </p>

          {/* Simulated Controls */}
          <div className="border-t border-slate-100 pt-4 space-y-4">
            <div>
              <label className="block text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                1. 模拟打卡考勤日期
              </label>
              <div className="mt-1 flex gap-2">
                <input 
                  type="date"
                  value={simulatedDate}
                  onChange={(e) => setSimulatedDate(e.target.value)}
                  className="px-3 py-1.5 border border-slate-200 rounded-lg text-xs bg-slate-50 text-slate-700 outline-none focus:border-brand-500 font-medium flex-1"
                />
                <button 
                  type="button"
                  onClick={() => {
                    const today = new Date();
                    setSimulatedDate(today.toISOString().split("T")[0]);
                  }}
                  className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-lg text-xs font-semibold cursor-pointer transition flex items-center gap-1"
                >
                  <RefreshCw className="w-3 h-3" /> 今天
                </button>
              </div>
              <p className="text-[10px] text-amber-600 mt-1">
                💡 更改此日期，可以打不同日期的考勤，用于测试历史考勤记录及月度薪资核算！
              </p>
            </div>

            <div className="bg-slate-50 p-3 rounded-xl border border-slate-100 space-y-2">
              <span className="block text-[11px] font-bold text-slate-500">
                2. 考勤规则快速检索 (后台配置)
              </span>
              <div className="grid grid-cols-2 gap-2 text-[11px]">
                <div className="bg-white p-2 rounded border border-slate-100">
                  <span className="text-slate-400 block">规定上班</span>
                  <span className="font-bold text-slate-700">{config.startShift}</span>
                </div>
                <div className="bg-white p-2 rounded border border-slate-100">
                  <span className="text-slate-400 block">规定下班</span>
                  <span className="font-bold text-slate-700">{config.endShift}</span>
                </div>
              </div>
            </div>

            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => onNavigateToTab("attendance")}
                className="flex-1 py-2 bg-brand-50 hover:bg-brand-100 text-brand-700 rounded-xl text-xs font-bold transition flex items-center justify-center gap-1.5 cursor-pointer"
              >
                <History className="w-3.5 h-3.5" /> 往返后台「考勤列表」
              </button>
              <button
                type="button"
                onClick={() => onNavigateToTab("expenses")}
                className="flex-1 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold transition flex items-center justify-center gap-1.5 cursor-pointer"
              >
                <Coins className="w-3.5 h-3.5" /> 往返后台「工资列表」
              </button>
            </div>
          </div>
        </div>

        {/* Info list */}
        <div className="bg-brand-50/50 p-4.5 rounded-2xl border border-brand-100 space-y-2.5">
          <h4 className="text-xs font-bold text-brand-800 flex items-center gap-1">
            <ShieldCheck className="w-4 h-4" /> 联调交互测试步骤：
          </h4>
          <ol className="text-[11px] text-slate-600 space-y-1.5 list-decimal list-inside pl-1">
            <li>
              右侧模拟器选择 <strong className="text-slate-800">Thin Thin Aung</strong> 登录员工APP
            </li>
            <li>
              在 <strong className="text-slate-800">打卡考勤</strong> 面板点击“上班打卡”
            </li>
            <li>
              点击左上角日期，更改模拟日期，多打几天卡
            </li>
            <li>
              前往左侧菜单的 <strong className="text-slate-800">“考勤列表”</strong> 选项，您会发现该员工的打卡数据完全实时写入，全勤奖、迟到状态、工作小时数瞬间核算成功！
            </li>
            <li>
              在员工APP的 <strong className="text-slate-800">“费用报销”</strong> 提交一份物资购买申请，登录后台的 <strong className="text-slate-800">“工资列表”</strong>，可以直接审批。
            </li>
          </ol>
        </div>
      </div>
    )}

      {/* Right panel: Simulated iPhone Frame */}
      <div className="w-full md:w-[380px] flex justify-center flex-shrink-0">
        <div className="relative w-[345px] h-[680px] bg-slate-900 rounded-[50px] shadow-2xl p-3 border-4 border-slate-800 flex flex-col overflow-hidden ring-12 ring-slate-900/10">
          
          {/* Speaker, camera (Notch) */}
          <div className="absolute top-0 left-1/2 -translate-x-1/2 h-[30px] w-[140px] bg-slate-900 rounded-b-2xl z-50 flex items-center justify-center gap-2">
            <div className="w-12 h-1 bg-slate-800 rounded-full"></div>
            <div className="w-2.5 h-2.5 bg-slate-900 border border-slate-800 rounded-full"></div>
          </div>

          {/* Screen Content Wrapper */}
          <div className="flex-1 bg-slate-50 rounded-[38px] overflow-hidden flex flex-col relative border border-slate-950/20 select-none">
            
            {/* Custom Status Bar */}
            <div className="h-10 bg-white px-6 flex items-end justify-between text-[11px] font-bold text-slate-800 pb-1 z-40 select-none">
              <span>{getSimulatedInTime()}</span>
              <div className="flex items-center gap-1.5">
                <Wifi className="w-3.5 h-3.5 text-slate-800" />
                <span className="text-[9px]">5G</span>
                <Battery className="w-4 h-4 text-slate-800" />
              </div>
            </div>

            {/* Local App Toasts inside iPhone Screen */}
            <div className="absolute top-[42px] left-3.5 right-3.5 z-[100] flex flex-col gap-2 pointer-events-none">
              <AnimatePresence>
                {localToasts.map(t => (
                  <motion.div
                    key={t.id}
                    initial={{ opacity: 0, y: -16, scale: 0.95 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.92, y: -8 }}
                    transition={{ type: "spring", stiffness: 350, damping: 26 }}
                    className="pointer-events-auto px-4 py-3 rounded-2xl shadow-xl text-[10px] font-black text-slate-100 bg-slate-900/95 backdrop-blur-md flex items-center gap-2 border border-slate-800"
                  >
                    <CheckCircle className="w-4 h-4 text-emerald-400 shrink-0" />
                    <span className="flex-1 text-left leading-snug">{t.msg}</span>
                  </motion.div>
                ))}
              </AnimatePresence>
            </div>

            {/* Simulated Router App Body */}
            <div className={`flex-1 flex flex-col relative bg-slate-50 ${currentUser ? "overflow-hidden" : "overflow-y-auto"}`}>
              
              {!isOnboarded ? (
                <div className="flex-1 p-6 flex flex-col justify-between bg-white relative">
                  {/* Skip and Progress */}
                  <div className="flex justify-between items-center pb-2">
                    <span className="text-[10px] font-black text-brand-600 bg-brand-50 px-2.5 py-1 rounded-full">
                      产品导览 {currentSlide + 1} / 4
                    </span>
                    <button
                      type="button"
                      onClick={() => {
                        setIsOnboarded(true);
                        localStorage.setItem("wms_app_onboarded", "true");
                        addToast("欢迎进入WMS智能终端！请登录。");
                      }}
                      className="text-[10px] font-bold text-slate-400 hover:text-slate-600 px-2.5 py-1 rounded-full bg-slate-100/60 transition cursor-pointer"
                    >
                      跳过引导
                    </button>
                  </div>

                  {/* Interactive Dynamic Feature Mockup Screen */}
                  <div className="my-3 bg-gradient-to-b from-slate-50 to-slate-100 border border-slate-150 rounded-2xl p-4 shadow-sm overflow-hidden min-h-[190px] flex flex-col justify-between relative">
                    <div className="absolute top-0 right-0 w-24 h-24 bg-brand-500/5 rounded-full blur-2xl -mr-6 -mt-6 pointer-events-none" />
                    
                    <AnimatePresence mode="wait">
                      {currentSlide === 0 && (
                      <motion.div 
                        initial={{ opacity: 0, scale: 0.95 }}
                        animate={{ opacity: 1, scale: 1 }}
                        className="flex-1 flex flex-col justify-between"
                      >
                        <div className="flex justify-between items-start">
                          <div>
                            <span className="text-[9px] font-bold text-emerald-600 bg-emerald-50 px-1.5 py-0.5 rounded-md flex items-center gap-1">
                              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-ping" />
                              高精度 GPS 围栏定位已就绪
                            </span>
                            <p className="text-[11px] font-black text-slate-800 mt-1">北京顺义智能冷链1号仓库</p>
                          </div>
                          <span className="text-[9px] font-bold text-slate-400">精度 ±1.2m</span>
                        </div>
                        {/* Radar Scan Grid */}
                        <div className="my-2 flex items-center justify-center relative h-16 bg-white/80 rounded-xl overflow-hidden border border-slate-200/50">
                          <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(59,130,246,0.08)_0%,transparent_70%)] animate-pulse" />
                          <div className="w-10 h-10 rounded-full border border-blue-200/60 flex items-center justify-center relative">
                            <div className="w-6 h-6 rounded-full bg-blue-100 border border-blue-300 flex items-center justify-center">
                              <MapPin className="w-3.5 h-3.5 text-blue-600" />
                            </div>
                            <div className="absolute w-2 h-2 rounded-full bg-blue-500 top-0 left-2.5 shadow-sm animate-bounce" />
                          </div>
                          <div className="absolute bottom-1 text-[8px] font-bold text-slate-500">
                            已接入无线网络: WMS-Hq-5G
                          </div>
                        </div>
                        <div className="flex justify-between items-center text-[9px] font-bold">
                          <span className="text-slate-500">工作时间: 09:00 - 18:00</span>
                          <span className="text-emerald-600 flex items-center gap-0.5">
                            <Check className="w-2.5 h-2.5" /> 已进入打卡区域
                          </span>
                        </div>
                      </motion.div>
                    )}

                    {currentSlide === 1 && (
                      <motion.div 
                        key="slide1"
                        initial={{ opacity: 0, scale: 0.95 }}
                        animate={{ opacity: 1, scale: 1 }}
                        exit={{ opacity: 0, scale: 0.95 }}
                        className="flex-1 flex flex-col justify-between text-left"
                      >
                        <div className="flex justify-between items-start">
                          <div>
                            <span className="text-[9px] font-bold text-indigo-600 bg-indigo-50 px-1.5 py-0.5 rounded-md flex items-center gap-1">
                              <Zap className="w-3 h-3 text-indigo-500" />
                              智能工时提成算薪
                            </span>
                            <p className="text-[11px] font-black text-slate-800 mt-1">当日预计工时收入统计</p>
                          </div>
                          <span className="text-[10px] font-extrabold text-indigo-600">￥ 285.50</span>
                        </div>
                        <div className="my-2 bg-slate-50 p-2.5 rounded-xl border border-slate-150 space-y-1.5">
                          <div className="flex justify-between text-[9px] text-slate-500">
                            <span>基本工时薪资: 8小时</span>
                            <span className="font-bold text-slate-700">180.00 元</span>
                          </div>
                          <div className="flex justify-between text-[9px] text-slate-500">
                            <span>拣货计件提成 (112件):</span>
                            <span className="font-bold text-emerald-600">+105.50 元</span>
                          </div>
                          <div className="w-full bg-slate-200 h-1.5 rounded-full overflow-hidden">
                            <div className="bg-gradient-to-r from-indigo-500 to-brand-500 h-1.5 rounded-full w-4/5" />
                          </div>
                        </div>
                        <p className="text-[8px] text-slate-400 font-bold leading-normal">
                          * 数据实时核算，每完成一笔分拣或出入库任务，薪资自动更新
                        </p>
                      </motion.div>
                    )}

                    {currentSlide === 2 && (
                      <motion.div 
                        key="slide2"
                        initial={{ opacity: 0, scale: 0.95 }}
                        animate={{ opacity: 1, scale: 1 }}
                        exit={{ opacity: 0, scale: 0.95 }}
                        className="flex-1 flex flex-col justify-between text-left"
                      >
                        <div className="flex justify-between items-start">
                          <div>
                            <span className="text-[9px] font-bold text-amber-600 bg-amber-50 px-1.5 py-0.5 rounded-md flex items-center gap-1">
                              <Sparkles className="w-3 h-3 text-amber-500" />
                              移动作业协同中心
                            </span>
                            <p className="text-[11px] font-black text-slate-800 mt-1">进行中的高效分拣单</p>
                          </div>
                          <span className="text-[9px] font-bold text-amber-600 bg-amber-100/50 px-2 py-0.5 rounded-md">待分拣 3</span>
                        </div>
                        <div className="my-2 border border-slate-150 rounded-xl bg-white p-2.5 space-y-2">
                          <div className="flex items-center justify-between text-[9px] border-b border-slate-100 pb-1.5">
                            <span className="text-slate-500 font-bold">任务单号: PICK-20260703</span>
                            <span className="text-brand-600 font-black">冷链库 C25 区</span>
                          </div>
                          <div className="flex justify-between items-center text-[10px]">
                            <span className="text-slate-700 font-black">进口黑樱桃 [5kg/箱]</span>
                            <span className="text-brand-600 font-black">x 12 箱</span>
                          </div>
                        </div>
                        <p className="text-[8px] text-slate-400 font-bold leading-normal">
                          * 支持手持 PDA 扫码或手机摄像头高速度扫码，降低错分率 99.8%
                        </p>
                      </motion.div>
                    )}

                    {currentSlide === 3 && (
                      <motion.div 
                        key="slide3"
                        initial={{ opacity: 0, scale: 0.95 }}
                        animate={{ opacity: 1, scale: 1 }}
                        exit={{ opacity: 0, scale: 0.95 }}
                        className="flex-1 flex flex-col justify-between text-left"
                      >
                        <div className="flex justify-between items-start">
                          <div>
                            <span className="text-[9px] font-bold text-brand-600 bg-brand-50 px-1.5 py-0.5 rounded-md flex items-center gap-1">
                              <Lock className="w-3 h-3 text-brand-500" />
                              安全密态身份关联
                            </span>
                            <p className="text-[11px] font-black text-slate-800 mt-1">专属 Google / 邮箱密保绑定</p>
                          </div>
                          <span className="text-[9px] font-bold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-md">已启用</span>
                        </div>
                        <div className="my-2 border border-dashed border-slate-200 rounded-xl p-3 flex flex-col items-center justify-center bg-slate-50/50 space-y-1.5">
                          <ShieldCheck className="w-7 h-7 text-emerald-500" />
                          <span className="text-[9px] font-black text-slate-600">全终端谷歌密保校验与重置服务已就绪</span>
                        </div>
                        <p className="text-[8px] text-slate-400 font-bold leading-normal">
                          * 重置密码后，旧凭证立刻失效，保障企业商业数据绝对安全
                        </p>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>

                {/* Indicator Dots & Buttons */}
                <div className="space-y-4">
                  <div className="flex justify-center gap-1.5">
                    {[0, 1, 2, 3].map((idx) => (
                      <button
                        key={idx}
                        type="button"
                        onClick={() => setCurrentSlide(idx)}
                        className={`h-1.5 rounded-full transition-all cursor-pointer ${
                          currentSlide === idx ? "w-6 bg-brand-600" : "w-1.5 bg-slate-200"
                        }`}
                      />
                    ))}
                  </div>

                  <div className="flex gap-2.5">
                    {currentSlide > 0 ? (
                      <button
                        type="button"
                        onClick={() => setCurrentSlide(currentSlide - 1)}
                        className="flex-1 py-3 border border-slate-200 hover:bg-slate-50 text-slate-600 font-black rounded-xl text-xs cursor-pointer transition"
                      >
                        上一步
                      </button>
                    ) : null}

                    {currentSlide < 3 ? (
                      <button
                        type="button"
                        onClick={() => setCurrentSlide(currentSlide + 1)}
                        className="flex-1 py-3 bg-brand-600 hover:bg-brand-700 text-white font-black rounded-xl text-xs cursor-pointer transition shadow-sm"
                      >
                        下一步
                      </button>
                    ) : (
                      <button
                        type="button"
                        onClick={() => {
                          setIsOnboarded(true);
                          localStorage.setItem("wms_app_onboarded", "true");
                          addToast("欢迎进入WMS智能终端！请登录。");
                        }}
                        className="flex-1 py-3 bg-gradient-to-r from-brand-600 to-indigo-600 hover:from-brand-700 hover:to-indigo-700 text-white font-black rounded-xl text-xs cursor-pointer transition shadow-md"
                      >
                        开始使用
                      </button>
                    )}
                  </div>
                </div>
              </div>
            ) : !currentUser ? (
              <>
              {/* Login / Employee Selection State */}
              <div className="flex-1 p-5 flex flex-col justify-between bg-white relative">
                
                {/* Biometric Scanning Overlay */}
                {isAutoLoggingIn && (
                  <div className="absolute inset-0 bg-white/95 backdrop-blur-sm z-40 flex flex-col items-center justify-center p-6 rounded-3xl animate-in fade-in duration-200">
                    <div className="relative flex flex-col items-center space-y-6">
                      {/* Scanning Circular Radar */}
                      <div className="relative w-24 h-24 flex items-center justify-center">
                        {/* Pulsing rings */}
                        <div className="absolute inset-0 rounded-full border-2 border-brand-500 animate-ping opacity-20" />
                        <div className="absolute -inset-2 rounded-full border-2 border-indigo-500 animate-pulse opacity-10" />
                        
                        {/* Inner Radar circle */}
                        <div className="w-16 h-16 rounded-full bg-gradient-to-tr from-brand-600 to-indigo-600 flex items-center justify-center text-white shadow-lg relative overflow-hidden">
                          <Fingerprint className="w-8 h-8 animate-pulse" />
                          {/* Scanning line */}
                          <div className="absolute inset-x-0 h-0.5 bg-cyan-400 shadow-[0_0_8px_#22d3ee] animate-bounce top-0" style={{ animationDuration: '1.5s' }} />
                        </div>
                      </div>

                      <div className="space-y-1.5 text-center">
                        <h4 className="text-sm font-black text-slate-800 flex items-center justify-center gap-1.5">
                          <Sparkles className="w-4 h-4 text-brand-500 animate-spin" />
                          安全通道建立中
                        </h4>
                        <p className="text-[11px] text-slate-400 font-bold leading-normal">
                          正在为 <span className="text-brand-600 font-black">[{isAutoLoggingIn}]</span> 进行密态安全验证登入
                        </p>
                      </div>
                    </div>
                  </div>
                )}

                {/* Top Header with Animated Floating Logo */}
                <div className="space-y-4 pt-2">
                  <div className="flex justify-between items-center">
                    <motion.div 
                      animate={{ y: [0, -3, 0] }}
                      transition={{ repeat: Infinity, duration: 3, ease: "easeInOut" }}
                      className="w-10 h-10 rounded-xl bg-brand-600 flex items-center justify-center text-white shadow-[0_4px_12px_rgba(79,70,229,0.25)] relative overflow-hidden"
                    >
                      <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.2" d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
                      </svg>
                    </motion.div>
                    <button
                      type="button"
                      onClick={() => {
                        setIsOnboarded(false);
                        setCurrentSlide(0);
                        localStorage.removeItem("wms_app_onboarded");
                      }}
                      className="text-[10px] font-black text-brand-600 hover:text-brand-700 bg-brand-50 hover:bg-brand-100 px-2.5 py-1.5 rounded-xl flex items-center gap-0.5 cursor-pointer transition shadow-3xs"
                      title="查看产品介绍"
                    >
                      <HelpCircle className="w-3.5 h-3.5" /> 引导介绍页
                    </button>
                  </div>

                  <div className="space-y-1 text-left">
                    <h3 className="font-black text-slate-800 text-lg tracking-tight bg-gradient-to-r from-slate-900 via-slate-800 to-brand-900 bg-clip-text text-transparent">WMS 智慧人资终端</h3>
                    <p className="text-[11px] text-slate-400 font-bold leading-normal">请选择登录或注册方式，开启您的掌上协同作业</p>
                  </div>

                  {/* Tab Selection with Slider */}
                  <div className="relative grid grid-cols-2 p-1 bg-slate-100/90 rounded-2xl border border-slate-200/30">
                    <motion.div
                      layoutId="activeTabIndicator"
                      className="absolute top-1 bottom-1 bg-white rounded-xl shadow-sm border border-slate-200/30 z-0"
                      style={{
                        width: "calc(50% - 4px)",
                        left: loginMethod === "credentials" ? "4px" : "calc(50%)"
                      }}
                      transition={{ type: "spring", stiffness: 350, damping: 26 }}
                    />
                    <button
                      type="button"
                      onClick={() => setLoginMethod("credentials")}
                      className={`relative z-10 py-2 text-xs font-black transition-all cursor-pointer ${
                        loginMethod === "credentials" ? "text-slate-800 animate-none" : "text-slate-400 hover:text-slate-600 animate-none"
                      }`}
                    >
                      员工账号登录
                    </button>
                    <button
                      type="button"
                      onClick={() => setLoginMethod("register")}
                      className={`relative z-10 py-2 text-xs font-black transition-all cursor-pointer ${
                        loginMethod === "register" ? "text-slate-800 animate-none" : "text-slate-400 hover:text-slate-600 animate-none"
                      }`}
                    >
                      快捷关联注册
                    </button>
                  </div>
                </div>

                {/* Form Container */}
                <div className="flex-1 flex flex-col justify-center my-3">
                  {loginMethod === "credentials" ? (
                    <div className="space-y-4 text-left animate-in fade-in duration-200">
                      
                      {/* Demo Experience Accounts Panel */}
                      <div className="bg-slate-50/80 rounded-2xl border border-slate-150 p-3 space-y-2">
                        <button
                          type="button"
                          onClick={() => setShowDemoAccounts(!showDemoAccounts)}
                          className="w-full flex items-center justify-between text-[11px] font-black text-slate-500 hover:text-slate-800 transition cursor-pointer select-none"
                        >
                          <span className="flex items-center gap-1.5">
                            <Fingerprint className="w-3.5 h-3.5 text-brand-500" />
                            演示体验：快捷免密安全登录通道
                          </span>
                          <div className="flex items-center gap-1 text-[10px] text-brand-600 bg-brand-50 px-2 py-0.5 rounded-md">
                            <span>选择身份</span>
                            {showDemoAccounts ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
                          </div>
                        </button>

                        <AnimatePresence>
                          {showDemoAccounts && (
                            <motion.div
                              initial={{ opacity: 0, height: 0 }}
                              animate={{ opacity: 1, height: "auto" }}
                              exit={{ opacity: 0, height: 0 }}
                              transition={{ duration: 0.2 }}
                              className="overflow-hidden space-y-2 pt-1.5 border-t border-slate-200/50"
                            >
                              <div className="flex items-center justify-between">
                                <p className="text-[10px] text-slate-400 font-bold leading-relaxed">
                                  选择下方员工一键指纹校验登入：
                                </p>
                              </div>

                              {/* Search Bar inside Demo list */}
                              {employees.length > 3 && (
                                <div className="relative group/search">
                                  <input
                                    type="text"
                                    placeholder="搜索姓名、岗位..."
                                    value={demoSearchQuery}
                                    onChange={(e) => setDemoSearchQuery(e.target.value)}
                                    className="w-full pl-7 pr-7 py-1 text-[10px] border border-slate-200 rounded-lg outline-none focus:border-brand-500 bg-white font-medium text-slate-700 transition"
                                  />
                                  <Search className="w-3 h-3 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
                                  {demoSearchQuery && (
                                    <button
                                      type="button"
                                      onClick={() => setDemoSearchQuery("")}
                                      className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-650 cursor-pointer"
                                    >
                                      <X className="w-2.5 h-2.5" />
                                    </button>
                                  )}
                                </div>
                              )}

                              {/* Scrollable Grid of Employees */}
                              <div className="max-h-[148px] overflow-y-auto pr-1 space-y-1.5 custom-scrollbar">
                                <div className="grid grid-cols-2 gap-1.5 pb-0.5">
                                  {employees
                                    .filter((emp) => {
                                      if (!demoSearchQuery) return true;
                                      const q = demoSearchQuery.toLowerCase();
                                      return (
                                        emp.name.toLowerCase().includes(q) ||
                                        (emp.role && emp.role.toLowerCase().includes(q)) ||
                                        (emp.dept && emp.dept.toLowerCase().includes(q)) ||
                                        emp.id.toString() === q
                                      );
                                    })
                                    .map((emp) => {
                                      const initial = emp.name.charAt(0);
                                      return (
                                        <button
                                          key={emp.id}
                                          type="button"
                                          onClick={() => {
                                            setIsAutoLoggingIn(emp.name);
                                            setInputAccount(emp.username || `emp${emp.id}`);
                                            setInputPassword("");
                                            
                                            setTimeout(() => {
                                              setCurrentUser(emp);
                                              addToast(`🎉 已成功代入 [${emp.name} - ${emp.role}] 安全终端！`);
                                              setIsAutoLoggingIn(null);
                                            }, 1000);
                                          }}
                                          className="p-1.5 text-left bg-white hover:bg-brand-50 border border-slate-200/60 hover:border-brand-300 rounded-xl transition duration-200 flex items-center gap-1.5 cursor-pointer relative group"
                                        >
                                          <div className="w-6 h-6 rounded-lg bg-gradient-to-tr from-brand-500 to-indigo-500 text-white font-black text-[10px] flex items-center justify-center shadow-xs shrink-0">
                                            {initial}
                                          </div>
                                          <div className="min-w-0 flex-1">
                                            <p className="text-[10px] font-black text-slate-700 truncate group-hover:text-brand-700 transition leading-tight">
                                              {emp.name}
                                            </p>
                                            <p className="text-[8px] text-slate-400 font-bold truncate leading-tight">
                                              {emp.role}
                                            </p>
                                          </div>
                                          <div className="absolute right-1 top-1 opacity-0 group-hover:opacity-100 transition">
                                            <Zap className="w-2 h-2 text-brand-500 fill-brand-500 animate-pulse" />
                                          </div>
                                        </button>
                                      );
                                    })}
                                </div>
                              </div>
                            </motion.div>
                          )}
                        </AnimatePresence>
                      </div>

                      {/* Account field */}
                      <div className="space-y-1.5">
                        <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                          输入员工账号
                        </label>
                        <div className="relative group/input">
                          <input
                            type="text"
                            value={inputAccount}
                            onChange={(e) => setInputAccount(e.target.value)}
                            placeholder="工号 (如 1, 2) / 姓名 / 专属账号"
                            className="w-full pl-9 pr-3 py-2.5 border border-slate-200 rounded-2xl text-xs bg-slate-50 text-slate-800 outline-none transition-all duration-200 focus:border-brand-500 focus:bg-white focus:shadow-[0_0_12px_rgba(79,70,229,0.1)] font-semibold"
                          />
                          <User className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 group-focus-within/input:text-brand-500 transition-colors" />
                        </div>
                      </div>

                      {/* Password field */}
                      <div className="space-y-1.5">
                        <div className="flex justify-between items-center">
                          <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                            登录密码
                          </label>
                        </div>
                        <div className="relative group/input">
                          <input
                            type={showPassword ? "text" : "password"}
                            value={inputPassword}
                            onChange={(e) => setInputPassword(e.target.value)}
                            placeholder="请输入该账户的登录密码"
                            className="w-full pl-9 pr-10 py-2.5 border border-slate-200 rounded-2xl text-xs bg-slate-50 text-slate-800 outline-none transition-all duration-200 focus:border-brand-500 focus:bg-white focus:shadow-[0_0_12px_rgba(79,70,229,0.1)] font-semibold"
                          />
                          <Lock className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 group-focus-within/input:text-brand-500 transition-colors" />
                          <button
                            type="button"
                            onClick={() => setShowPassword(!showPassword)}
                            className="p-1.5 hover:bg-slate-200/50 text-slate-400 hover:text-slate-600 rounded-xl absolute right-2.5 top-1/2 -translate-y-1/2 transition cursor-pointer"
                          >
                            {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                          </button>
                        </div>
                      </div>

                      <motion.button
                        whileHover={{ scale: 1.01 }}
                        whileTap={{ scale: 0.98 }}
                        type="button"
                        onClick={() => {
                          if (!inputAccount.trim()) {
                            addToast("请输入登录账号、工号或姓名！");
                            return;
                          }
                          if (!inputPassword) {
                            addToast("请输入安全登录密码！");
                            return;
                          }
                          
                          const accStr = inputAccount.trim().toLowerCase();
                          const emp = employees.find(e => 
                            e.id.toString() === accStr ||
                            e.name.toLowerCase() === accStr ||
                            (e.username && e.username.toLowerCase() === accStr)
                          );
                          
                          if (!emp) {
                            addToast("未查找到该账号！请输入正确的工号 (如: 1, 2)、姓名 or 登录账号。");
                            return;
                          }

                          addToast("员工密码验证已迁移至正式员工端登录接口，请从员工客户端登录。");
                        }}
                        className="w-full py-3.5 bg-gradient-to-r from-brand-600 via-indigo-600 to-indigo-700 hover:from-brand-700 hover:to-indigo-800 text-white font-extrabold rounded-2xl text-xs transition shadow-md hover:shadow-lg flex items-center justify-center gap-2 cursor-pointer"
                      >
                        <Shield className="w-4 h-4" />
                        安全验证并登入智慧终端
                      </motion.button>
                    </div>
                  ) : (
                    <div className="space-y-4 text-left animate-in fade-in duration-200">
                      {/* Option 1: Google Account Register */}
                      <div className="bg-gradient-to-br from-slate-50 to-slate-100/50 border border-slate-200/60 p-4 rounded-2xl space-y-3 shadow-xs">
                        <span className="text-[10px] font-black text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
                          <span className="w-1.5 h-1.5 rounded-full bg-blue-500 animate-pulse" />
                          方式 A：谷歌通道一键关联
                        </span>
                        <motion.button
                          whileHover={{ scale: 1.01 }}
                          whileTap={{ scale: 0.98 }}
                          type="button"
                          onClick={() => {
                            setRegisterType("google");
                            setShowGoogleAccounts(true);
                          }}
                          className="w-full py-3 bg-white hover:bg-slate-50 border border-slate-250 text-slate-700 font-extrabold rounded-xl text-xs transition shadow-3xs flex items-center justify-center gap-2.5 cursor-pointer"
                        >
                          <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                            <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
                            <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
                            <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z" fill="#FBBC05"/>
                            <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
                          </svg>
                          使用 Google 账号关联注册/登录
                        </motion.button>
                      </div>

                      {/* Option 2: Email Sign In & Register */}
                      <div className="bg-gradient-to-br from-slate-50 to-slate-100/50 border border-slate-200/60 p-4 rounded-2xl space-y-3 shadow-xs">
                        <span className="text-[10px] font-black text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
                          <span className="w-1.5 h-1.5 rounded-full bg-indigo-500 animate-pulse" />
                          方式 B：邮箱验证极速登入
                        </span>
                        
                        <div className="space-y-1.5">
                          <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider">电子邮箱 Email</label>
                          <div className="relative group/input">
                            <input
                              type="email"
                              value={inputEmail}
                              onChange={(e) => setInputEmail(e.target.value)}
                              placeholder="请输入您的电子邮箱地址"
                              className="w-full pl-9 pr-3 py-2.5 border border-slate-200 rounded-xl text-xs bg-white text-slate-800 outline-none transition-all focus:border-brand-500 focus:shadow-[0_0_12px_rgba(79,70,229,0.08)] font-semibold"
                            />
                            <Mail className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 group-focus-within/input:text-brand-500 transition-colors" />
                          </div>
                        </div>

                        <div className="space-y-1.5">
                          <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider">设置密码 Password</label>
                          <div className="relative group/input">
                            <input
                              type={showEmailPassword ? "text" : "password"}
                              value={inputEmailPassword}
                              onChange={(e) => setInputEmailPassword(e.target.value)}
                              placeholder="请设置或输入安全密码"
                              className="w-full pl-9 pr-10 py-2.5 border border-slate-200 rounded-xl text-xs bg-white text-slate-800 outline-none transition-all focus:border-brand-500 focus:shadow-[0_0_12px_rgba(79,70,229,0.08)] font-semibold"
                            />
                            <Lock className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 group-focus-within/input:text-brand-500 transition-colors" />
                            <button
                              type="button"
                              onClick={() => setShowEmailPassword(!showEmailPassword)}
                              className="p-1.5 hover:bg-slate-200/50 text-slate-400 hover:text-slate-600 rounded-xl absolute right-2.5 top-1/2 -translate-y-1/2 transition cursor-pointer"
                            >
                              {showEmailPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                            </button>
                          </div>
                        </div>

                        <motion.button
                          whileHover={{ scale: 1.01 }}
                          whileTap={{ scale: 0.98 }}
                          type="button"
                          onClick={() => {
                            if (!inputEmail.trim()) {
                              addToast("请输入电子邮箱！");
                              return;
                            }
                            if (!inputEmail.includes("@")) {
                              addToast("请输入有效的电子邮箱格式！");
                              return;
                            }
                            if (!inputEmailPassword) {
                              addToast("请设置或输入访问密码！");
                              return;
                            }
                            
                            // Check if there is an employee with this email
                            const existing = employees.find(e => 
                              (e as any).email?.toLowerCase() === inputEmail.trim().toLowerCase()
                            );

                            if (existing) {
                              setIsAutoLoggingIn(existing.name);
                              setTimeout(() => {
                                setCurrentUser(existing);
                                addToast(`🎉 欢迎回来，[${existing.name}]！邮箱登录成功。`);
                                setIsAutoLoggingIn(null);
                              }, 1000);
                            } else {
                              // Direct to register onboarding form
                              setRegisterType("email");
                              setEmailRegisterAddress(inputEmail.trim());
                              setEmailName(inputEmail.split("@")[0]);
                              setShowEmailRegister(true);
                            }
                          }}
                          className="w-full py-3.5 bg-gradient-to-r from-brand-600 to-indigo-600 hover:from-brand-700 hover:to-indigo-700 text-white font-extrabold rounded-xl text-xs transition shadow-sm hover:shadow-md flex items-center justify-center gap-1.5 cursor-pointer"
                        >
                          <ShieldCheck className="w-4 h-4" />
                          邮箱极速验证登录/注册
                        </motion.button>
                      </div>

                      <div className="flex items-center justify-center gap-1.5 text-[10px] text-slate-400 font-semibold pt-1">
                        <Shield className="w-3.5 h-3.5 text-emerald-500" />
                        多源密态安全身份关联通道已开通
                      </div>
                    </div>
                  )}
                </div>

                {/* Footnotes */}
                <p className="text-[10px] text-slate-400 text-center font-semibold leading-relaxed px-4 pt-1">
                  技术支持: 谷歌 AI Studio / 全套密保通道安全护航
                </p>
              </div>

                  {/* HIGH-FIDELITY SIMULATED GOOGLE POPUP DIALOGS */}
                  <AnimatePresence>
                    {showGoogleAccounts && (
                      <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="absolute inset-0 bg-slate-900/60 backdrop-blur-xs z-50 flex items-center justify-center p-4"
                      >
                        <motion.div
                          initial={{ scale: 0.9, y: 15 }}
                          animate={{ scale: 1, y: 0 }}
                          exit={{ scale: 0.9, y: 15 }}
                          className="w-full bg-white rounded-xl p-5 shadow-2xl space-y-4 max-h-[500px] overflow-y-auto"
                        >
                          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                            <div className="flex items-center gap-1.5">
                              {/* Google Icon */}
                              <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                                <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
                                <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
                                <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z" fill="#FBBC05"/>
                                <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
                              </svg>
                              <span className="text-xs font-black text-slate-700">谷歌账号认证中心</span>
                            </div>
                            <button
                              type="button"
                              onClick={() => setShowGoogleAccounts(false)}
                              className="text-xs font-bold text-slate-400 hover:text-slate-600 cursor-pointer"
                            >
                              取消
                            </button>
                          </div>

                          <div className="space-y-1 text-center">
                            <h4 className="text-xs font-black text-slate-800">使用 Google 登录</h4>
                            <p className="text-[10px] text-slate-500">以继续前往 WMS 智慧人资系统</p>
                          </div>

                          {/* Accounts list */}
                          <div className="space-y-2">
                            {/* Option 1: User's Metadata Email */}
                            <button
                              type="button"
                              onClick={() => {
                                setGoogleEmail("zhanyinglong0115@gmail.com");
                                setGoogleName("Zhanyinglong");
                                setShowGoogleAccounts(false);
                                // Check if this user exists in employees already
                                const existing = employees.find(e => e.name.toLowerCase().includes("zhanyinglong"));
                                if (existing) {
                                  setCurrentUser(existing);
                                  addToast(`欢迎回来, ${existing.name}! 谷歌账号关联成功。`);
                                } else {
                                  setShowGoogleRegister(true);
                                }
                              }}
                              className="w-full p-3 border border-slate-150 hover:bg-slate-50 active:bg-slate-100 rounded-2xl text-left flex items-center justify-between cursor-pointer transition"
                            >
                              <div className="flex items-center gap-3">
                                <div className="w-8 h-8 rounded-full bg-blue-100 text-blue-700 font-extrabold text-xs flex items-center justify-center">
                                  Z
                                </div>
                                <div className="text-left">
                                  <p className="text-xs font-black text-slate-800">Zhanyinglong</p>
                                  <p className="text-[9px] text-slate-500">zhanyinglong0115@gmail.com</p>
                                </div>
                              </div>
                              <span className="text-[9px] font-bold text-blue-600 bg-blue-50 px-1.5 py-0.5 rounded">最近使用</span>
                            </button>

                            {/* Option 2: Logistics Agent */}
                            <button
                              type="button"
                              onClick={() => {
                                setGoogleEmail("global.logistics@gmail.com");
                                setGoogleName("Logan Smith");
                                setShowGoogleAccounts(false);
                                const existing = employees.find(e => e.name === "Logan Smith");
                                if (existing) {
                                  setCurrentUser(existing);
                                  addToast(`欢迎回来, Logan Smith! 谷歌账号关联成功。`);
                                } else {
                                  setShowGoogleRegister(true);
                                }
                              }}
                              className="w-full p-3 border border-slate-150 hover:bg-slate-50 active:bg-slate-100 rounded-2xl text-left flex items-center justify-between cursor-pointer transition"
                            >
                              <div className="flex items-center gap-3">
                                <div className="w-8 h-8 rounded-full bg-emerald-100 text-emerald-700 font-extrabold text-xs flex items-center justify-center">
                                  L
                                </div>
                                <div className="text-left">
                                  <p className="text-xs font-black text-slate-800">Logan Smith</p>
                                  <p className="text-[9px] text-slate-500">global.logistics@gmail.com</p>
                                </div>
                              </div>
                            </button>

                            {/* Option 3: Guest */}
                            <button
                              type="button"
                              onClick={() => {
                                setGoogleEmail("wms.tester@gmail.com");
                                setGoogleName("WMS Tester");
                                setShowGoogleAccounts(false);
                                const existing = employees.find(e => e.name === "WMS Tester");
                                if (existing) {
                                  setCurrentUser(existing);
                                  addToast(`欢迎回来, WMS Tester! 谷歌账号关联成功。`);
                                } else {
                                  setShowGoogleRegister(true);
                                }
                              }}
                              className="w-full p-3 border border-slate-150 hover:bg-slate-50 active:bg-slate-100 rounded-2xl text-left flex items-center justify-between cursor-pointer transition"
                            >
                              <div className="flex items-center gap-3">
                                <div className="w-8 h-8 rounded-full bg-amber-100 text-amber-700 font-extrabold text-xs flex items-center justify-center">
                                  W
                                </div>
                                <div className="text-left">
                                  <p className="text-xs font-black text-slate-800">WMS Tester</p>
                                  <p className="text-[9px] text-slate-500">wms.tester@gmail.com</p>
                                </div>
                              </div>
                            </button>
                          </div>

                          <div className="text-center pt-2">
                            <span className="text-[9px] text-slate-400 font-semibold leading-relaxed block">
                              为了给您带来更真实的高级联调体验，我们已在沙盒内预设了您的 Google 身份。点击上述账号，未入职人员将启动“一键快捷入职登记”，直接将此人入库至系统！
                            </span>
                          </div>
                        </motion.div>
                      </motion.div>
                    )}

                    {(showGoogleRegister || showEmailRegister) && (
                      <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="absolute inset-0 bg-slate-900/60 backdrop-blur-xs z-50 flex items-center justify-center p-4"
                      >
                        <motion.div
                          initial={{ scale: 0.9, y: 15 }}
                          animate={{ scale: 1, y: 0 }}
                          exit={{ scale: 0.9, y: 15 }}
                          className="w-full bg-white rounded-xl p-5 shadow-2xl space-y-3.5 max-h-[580px] overflow-y-auto"
                        >
                          <div className="flex items-center justify-between border-b border-slate-100 pb-2.5">
                            <span className="text-xs font-black text-slate-800 flex items-center gap-1">
                              <UserPlus className="w-4 h-4 text-brand-600" />
                              完善入职登记 ({registerType === "google" ? "Google 注册" : "邮箱注册"})
                            </span>
                            <button
                              type="button"
                              onClick={() => {
                                setShowGoogleRegister(false);
                                setShowEmailRegister(false);
                              }}
                              className="text-xs font-bold text-slate-400 hover:text-slate-600 cursor-pointer"
                            >
                              取消
                            </button>
                          </div>

                          <div className="bg-brand-50/50 p-2.5 rounded-xl border border-brand-100/50 text-left space-y-0.5">
                            <p className="text-[10px] text-brand-800 font-bold">
                              {registerType === "google" ? "Google 账号已授权成功" : "邮箱验证成功"}
                            </p>
                            <p className="text-[9px] text-slate-500 leading-tight">
                              关联邮箱：{registerType === "google" ? googleEmail : emailRegisterAddress}
                            </p>
                          </div>

                          <div className="space-y-2 text-left">
                            {/* Name input */}
                            <div>
                              <label className="block text-[10px] font-bold text-slate-500 mb-1">
                                姓名 Name
                              </label>
                              <input
                                type="text"
                                value={registerType === "google" ? googleName : emailName}
                                onChange={(e) => {
                                  if (registerType === "google") {
                                    setGoogleName(e.target.value);
                                  } else {
                                    setEmailName(e.target.value);
                                  }
                                }}
                                className="w-full px-2.5 py-1.5 border border-slate-200 rounded-lg text-xs outline-none focus:border-brand-500 bg-slate-50 font-semibold"
                                placeholder="请输入员工姓名"
                              />
                            </div>

                            {/* Gender selection */}
                            <div>
                              <label className="block text-[10px] font-bold text-slate-500 mb-1">
                                性别 Gender
                              </label>
                              <div className="grid grid-cols-2 gap-2">
                                <button
                                  type="button"
                                  onClick={() => setRegGender("male")}
                                  className={`py-1.5 rounded-lg border text-xs font-bold transition-all ${
                                    regGender === "male"
                                      ? "bg-brand-50 border-brand-500 text-brand-700 font-extrabold"
                                      : "bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100"
                                  }`}
                                >
                                  男 Male
                                </button>
                                <button
                                  type="button"
                                  onClick={() => setRegGender("female")}
                                  className={`py-1.5 rounded-lg border text-xs font-bold transition-all ${
                                    regGender === "female"
                                      ? "bg-brand-50 border-brand-500 text-brand-700 font-extrabold"
                                      : "bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100"
                                  }`}
                                >
                                  女 Female
                                </button>
                              </div>
                            </div>

                            {/* Role selection */}
                            <div>
                              <label className="block text-[10px] font-bold text-slate-500 mb-1">
                                岗位角色 Role
                              </label>
                              <select
                                value={regRole}
                                onChange={(e) => setRegRole(e.target.value)}
                                className="w-full px-2.5 py-1.5 border border-slate-200 rounded-lg text-xs outline-none focus:border-brand-500 bg-slate-50 font-semibold"
                              >
                                <option value="系统管理员">系统管理员 (Admin)</option>
                                <option value="拣货主管">拣货主管 (Supervisor)</option>
                                <option value="包装主管">包装主管 (Supervisor)</option>
                                <option value="拣货员">拣货员 (Picker)</option>
                                <option value="包装员">包装员 (Packer)</option>
                                <option value="理货员">理货员 (Stocker)</option>
                                <option value="质检员">质检员 (QC Inspector)</option>
                              </select>
                            </div>

                            {/* Currency selection */}
                            <div>
                              <label className="block text-[10px] font-bold text-slate-500 mb-1">
                                结算币种 Currency
                              </label>
                              <select
                                value={regCurrency}
                                onChange={(e) => setRegCurrency(e.target.value as CurrencyCode)}
                                className="w-full px-2.5 py-1.5 border border-slate-200 rounded-lg text-xs outline-none focus:border-brand-500 bg-slate-50 font-semibold"
                              >
                                <option value="CNY">CNY (人民币)</option>
                                <option value="USD">USD (美元)</option>
                                <option value="EUR">EUR (欧元)</option>
                                <option value="SGD">SGD (新加坡元)</option>
                                <option value="MMR">MMR (缅币)</option>
                                <option value="THB">THB (泰铢)</option>
                              </select>
                            </div>
                          </div>

                          <button
                            type="button"
                            onClick={() => {
                              const nameVal = registerType === "google" ? googleName : emailName;
                              if (!nameVal.trim()) {
                                addToast("请输入姓名！");
                                return;
                              }
                              const nextId = employees.length > 0 ? Math.max(...employees.map(e => e.id)) + 1 : 1;
                              const targetEmp: Employee = {
                                id: nextId,
                                name: nameVal.trim(),
                                gender: regGender,
                                country: (config as any).country || 'CN',
                                role: regRole,
                                dept: regRole.includes("管理员") || regRole.includes("主管") ? '管理部' : '仓储部',
                                hourlyRate: regRole.includes("管理员") ? 400 : regRole.includes("主管") ? 300 : 200,
                                baseMonthlyWage: regRole.includes("管理员") ? 120000 : regRole.includes("主管") ? 80000 : 40000,
                                attendanceBonus: 1000,
                                socialSecurity: 500,
                                currency: regCurrency,
                                joinDate: simulatedDate,
                                status: '在职',
                                photo: null,
                                username: registerType === "google" ? googleEmail.split("@")[0] : emailRegisterAddress.split("@")[0]
                              };
                              const updated = [...employees, targetEmp];
                              onUpdateEmployees(updated);
                              localStorage.setItem("wms_employees", JSON.stringify(updated));
                              setCurrentUser(targetEmp);
                              setShowGoogleRegister(false);
                              setShowEmailRegister(false);
                              addToast(`🎉 欢迎新员工 [${targetEmp.name}] 加入系统，且已自动登录！`);
                            }}
                            className="w-full py-3 bg-brand-600 hover:bg-brand-700 text-white font-extrabold rounded-xl text-xs transition shadow-sm cursor-pointer"
                          >
                            完成入职登记并进入系统
                          </button>
                        </motion.div>
                      </motion.div>
                    )}
                  </AnimatePresence>

                  {isFaceAttendanceOpen && (
                    <BiometricTerminal
                      isFaceAttendanceOpen={isFaceAttendanceOpen}
                      setIsFaceAttendanceOpen={setIsFaceAttendanceOpen}
                      faceAttendanceTab={faceAttendanceTab}
                      setFaceAttendanceTab={setFaceAttendanceTab}
                      faceScanMode={faceScanMode}
                      setFaceScanMode={setFaceScanMode}
                      faceScanResult={faceScanResult}
                      setFaceScanResult={setFaceScanResult}
                      faceSelectedEmpId={faceSelectedEmpId}
                      setFaceSelectedEmpId={setFaceSelectedEmpId}
                      empSearchQuery={empSearchQuery}
                      setEmpSearchQuery={setEmpSearchQuery}
                      employees={employees}
                      triggerFaceRecognitionPunch={triggerFaceRecognitionPunch}
                      isFaceScanning={isFaceScanning}
                      simulatedDate={simulatedDate}
                      faceScanHistory={faceScanHistory}
                      attendanceStatusFilter={attendanceStatusFilter}
                      setAttendanceStatusFilter={setAttendanceStatusFilter}
                      batchTimeSource={batchTimeSource}
                      setBatchTimeSource={setBatchTimeSource}
                      batchCustomTime={batchCustomTime}
                      setBatchCustomTime={setBatchCustomTime}
                      config={config}
                      handleBatchPunch={handleBatchPunch}
                      attendance={attendance}
                      selectedDeptFilter={selectedDeptFilter}
                      setSelectedDeptFilter={setSelectedDeptFilter}
                      batchSelectedIds={batchSelectedIds}
                      setBatchSelectedIds={setBatchSelectedIds}
                      handleDirectPunch={handleDirectPunch}
                      handleResetPunch={handleResetPunch}
                      getSimulatedInTime={getSimulatedInTime}
                    />
                  )}
                </>
              ) : (
                <div className="flex-1 flex flex-col overflow-hidden bg-slate-50 relative animate-in fade-in duration-300">
                  {/* App Header */}
                  {activeMobileTab === "payslip" ? (
                    <div className="bg-white px-4 py-3 border-b border-slate-100 flex items-center justify-between sticky top-0 z-10 shadow-3xs">
                      <button
                        type="button"
                        onClick={() => {
                          setActiveMobileTab(previousTab);
                          setEmployeeSignName("");
                          setEmployeePledgeChecked(false);
                        }}
                        className="flex items-center gap-1.5 text-slate-600 hover:text-slate-800 font-extrabold text-xs cursor-pointer py-1 px-2 rounded-lg hover:bg-slate-50 transition"
                      >
                        <ArrowLeft className="w-4 h-4 text-slate-500" />
                        {t("reim_back")}
                      </button>
                      <h4 className="text-xs font-black text-slate-800 tracking-wide">{t("e_payslip")}</h4>
                      {currentUser && payouts[`${currentUser.id}_${currentMonthStr}`] ? (
                        <button
                          type="button"
                          disabled={isExporting}
                          onClick={handleExportPDF}
                          className="flex items-center gap-1 px-2.5 py-1 text-[10px] font-black text-brand-700 bg-brand-50 hover:bg-brand-100 active:bg-brand-200 border border-brand-200 rounded-lg transition cursor-pointer disabled:opacity-50"
                        >
                          <Download className="w-3 h-3" />
                          {locale === "zh-CN" ? "导出PDF" : locale === "zh-TW" ? "導出PDF" : "Export PDF"}
                        </button>
                      ) : (
                        <div className="w-12" />
                      )}
                    </div>
                  ) : activeMobileTab === "add_expense" ? (
                    <div className="bg-white px-4 py-3 border-b border-slate-100 flex items-center justify-between sticky top-0 z-10 shadow-3xs">
                      <button
                        type="button"
                        onClick={checkCancelWithConfirm}
                        className="flex items-center gap-1.5 text-slate-600 hover:text-slate-800 font-extrabold text-xs cursor-pointer py-1 px-2 rounded-lg hover:bg-slate-50 transition"
                      >
                        <ArrowLeft className="w-4 h-4 text-slate-500" />
                        {t("reim_back")}
                      </button>
                      <h4 className="text-xs font-black text-slate-800 tracking-wide">
                        {editingExpenseId 
                          ? (locale === "zh-CN" ? "编辑费用信息" : locale === "zh-TW" ? "編輯費用信息" : "Edit Reimbursement")
                          : t("reim_form_title")}
                      </h4>
                      <div className="w-12" /> {/* spacing placeholder */}
                    </div>
                  ) : activeMobileTab === "home" ? (
                    <div className="bg-white px-4 py-3 border-b border-slate-100 flex items-center justify-between sticky top-0 z-10 shadow-3xs">
                      <div className="flex items-center gap-2">
                        <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-brand-600 to-indigo-600 text-white flex items-center justify-center font-black text-xs shadow-sm uppercase overflow-hidden">
                          {currentUser.photo ? (
                            <img src={currentUser.photo} className="w-full h-full object-cover" alt="" referrerPolicy="no-referrer" />
                          ) : (
                            currentUser.name.charAt(0)
                          )}
                        </div>
                        <div>
                          <h4 className="text-[11.5px] font-black text-slate-800 leading-tight">{currentUser.name}</h4>
                          <span className="text-[9px] px-1 py-0.2 bg-slate-100 text-slate-500 font-bold rounded">
                            {currentUser.dept} · {currentUser.role}
                          </span>
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div className="bg-white px-4 py-3.5 border-b border-slate-100 flex items-center justify-center sticky top-0 z-10 shadow-3xs relative">
                      {activeMobileTab === "sop" && (
                        viewingSop ? (
                          <button
                            type="button"
                            onClick={() => { setViewingSop(null); setPledgeChecked(false); }}
                            className="absolute left-4 top-1/2 -translate-y-1/2 p-1 text-slate-500 hover:text-slate-800 cursor-pointer flex items-center gap-1 text-[11px] font-bold"
                          >
                            <ArrowLeft className="w-3.5 h-3.5" />
                            <span>{t("back_to_list")}</span>
                          </button>
                        ) : (
                          <button
                            type="button"
                            onClick={() => { setActiveMobileTab("home"); }}
                            className="absolute left-4 top-1/2 -translate-y-1/2 p-1 text-slate-500 hover:text-slate-800 cursor-pointer flex items-center gap-1 text-[11px] font-bold"
                          >
                            <ArrowLeft className="w-3.5 h-3.5" />
                            <span>{locale === "zh-CN" ? "返回" : locale === "zh-TW" ? "返回" : "Back"}</span>
                          </button>
                        )
                      )}
                      {activeMobileTab === "expense" && selectedExpense && (
                        <button
                          type="button"
                          onClick={() => setSelectedExpense(null)}
                          className="absolute left-4 top-1/2 -translate-y-1/2 p-1 text-slate-500 hover:text-brand-600 cursor-pointer flex items-center gap-1 text-[11px] font-bold"
                        >
                          <ArrowLeft className="w-3.5 h-3.5" />
                          <span>{locale === "zh-CN" ? "返回" : locale === "zh-TW" ? "返回" : "Back"}</span>
                        </button>
                      )}
                      {activeMobileTab === "expense" && !selectedExpense && expenseScrolled && (
                        <button
                          type="button"
                          onClick={() => {
                            setActiveMobileTab("add_expense");
                          }}
                          className="absolute right-4 top-1/2 -translate-y-1/2 px-2 py-1 bg-brand-600 hover:bg-brand-700 text-white rounded-lg text-[10px] font-bold flex items-center gap-1 cursor-pointer transition shadow-3xs animate-in fade-in duration-200"
                        >
                          <Plus className="w-3 h-3" />
                          <span>{t("reim_add")}</span>
                        </button>
                      )}
                      {activeMobileTab === "attendance" && (
                        isManager ? (
                          <button
                            type="button"
                            onClick={() => {
                              setIsFaceAttendanceOpen(true);
                              setFaceScanResult(null);
                            }}
                            className="absolute right-4 top-1/2 -translate-y-1/2 px-2.5 py-1 bg-brand-600 hover:bg-brand-700 text-white rounded-lg text-[10px] font-bold flex items-center gap-1.5 cursor-pointer transition shadow-3xs animate-in fade-in duration-200"
                          >
                            <Camera className="w-3 h-3 text-emerald-300 animate-pulse" />
                            <span>批量打卡</span>
                          </button>
                        ) : (
                          attendanceScrolled && (
                            <button
                              type="button"
                              onClick={() => {
                                const container = document.getElementById("employee-scroll-container");
                                if (!showLeaveForm) {
                                  setShowLeaveForm(true);
                                  if (container) {
                                    container.scrollTo({ top: 0, behavior: "smooth" });
                                  }
                                } else {
                                  setShowLeaveForm(false);
                                }
                              }}
                              className={`absolute right-4 top-1/2 -translate-y-1/2 px-2.5 py-1 rounded-lg text-[10px] font-bold flex items-center gap-1 cursor-pointer transition shadow-3xs animate-in fade-in duration-200 ${
                                showLeaveForm
                                  ? "bg-rose-50 hover:bg-rose-100 text-rose-700 font-bold"
                                  : "bg-brand-600 hover:bg-brand-700 text-white font-bold"
                              }`}
                            >
                              {showLeaveForm ? (
                                <>
                                  <X className="w-3 h-3" />
                                  <span>{t("reim_cancel")}</span>
                                </>
                              ) : (
                                <>
                                  <Plus className="w-3 h-3" />
                                  <span>{t("request_leave")}</span>
                                </>
                              )}
                            </button>
                          )
                        )
                      )}
                      <h4 className="text-xs font-black text-slate-800 tracking-wide">
                        {activeMobileTab === "attendance" && t("attendance_center")}
                        {activeMobileTab === "sop" && t("sop_center")}
                        {activeMobileTab === "expense" && t("reim_title")}
                        {activeMobileTab === "my" && t("my_center")}
                      </h4>
                    </div>
                  )}

                  {/* App Active Panel */}
                  <div 
                    id="employee-scroll-container"
                    onScroll={(e) => {
                      if (activeMobileTab === "expense") {
                        setExpenseScrolled(e.currentTarget.scrollTop > 100);
                      } else if (activeMobileTab === "attendance") {
                        setAttendanceScrolled(e.currentTarget.scrollTop > 100);
                      }
                    }}
                    className="flex-1 p-4 overflow-y-auto space-y-4"
                  >
                    
                    {activeMobileTab === "home" && (
                      <div className="space-y-3">
                        
                        {/* Resigned Warnings Banner */}
                        {currentUser?.status === '离职' && (
                          <div className="bg-rose-50 border border-rose-200 p-4 rounded-xl space-y-2 text-rose-800 text-left relative overflow-hidden">
                            <div className="flex items-center gap-2 font-black text-xs text-rose-700">
                              <span className="w-2 h-2 rounded-full bg-rose-500 animate-pulse shrink-0" />
                              <span>⚠️ 账号已进入只读归档状态</span>
                            </div>
                            <p className="text-[11px] leading-relaxed font-semibold text-rose-700">
                              您的账号当前处于「已离职」只读状态，已暂停打卡、报销及签字等业务。
                            </p>
                          </div>
                        )}

                        {/* Top Dynamic Attendance Status Bar */}
                        <div 
                          onClick={() => {
                            if (currentUser?.status === '离职') {
                              addToast("⚠️ 您已办理离职，该账号已进入只读归档状态，无法进入打卡或业务操作。如有疑问请联系HR。");
                              return;
                            }
                            setActiveMobileTab("attendance");
                          }}
                          className="bg-white p-3 rounded-xl flex items-center justify-start gap-3 shadow-sm hover:shadow-md cursor-pointer hover:bg-slate-50/50 transition duration-200"
                        >
                          <div className="flex items-center gap-1.5 text-[11px] font-bold text-slate-500">
                            <span>{t("today")}</span>
                          </div>
                          <div className="flex items-center gap-1.5 text-xs font-black text-slate-700">
                            <span className={`w-2 h-2 rounded-full ${
                              todayRecord?.inTime ? "bg-emerald-500 animate-pulse" : "bg-slate-400"
                            }`} />
                            <span>{todayRecord?.inTime ? t("punched") : t("not_punched")}</span>
                          </div>
                        </div>

                        {/* Redesigned Clocking Card */}
                        <div className="bg-white rounded-xl p-4 shadow-sm space-y-3 text-left relative overflow-hidden">
                          <div className="flex justify-between items-start">
                            <div>
                              <p className="text-[11px] text-slate-500 font-bold">{dateString}</p>
                              <h2 className="text-4xl font-extrabold text-slate-900 tracking-tight mt-1 font-mono">
                                {timeString}
                              </h2>
                              <span className="text-[10px] text-slate-400 font-extrabold block tracking-wide uppercase mt-1">{t("sys_time")}</span>
                            </div>
                            
                            {/* Top Right Status Badge */}
                            {!(todayRecord?.inTime && todayRecord?.outTime) && (
                              <span className={`px-2.5 py-1 rounded-full text-[10px] font-black ${
                                todayRecord?.inTime 
                                  ? "bg-brand-50 text-brand-700 border border-brand-100"
                                  : "bg-slate-100 text-slate-500 border border-slate-200"
                              }`}>
                                {todayRecord?.inTime 
                                  ? todayRecord.type === "late" ? t("late_badge") : t("punched") 
                                  : t("not_punched")}
                              </span>
                            )}
                          </div>

                          {/* Two Side-by-Side Clock Time Boxes */}
                          <div className="grid grid-cols-2 gap-3">
                            {/* Shift In Box */}
                            <div className="bg-slate-50/50 rounded-xl p-3 border border-slate-100 space-y-1">
                              <span className="text-[9px] text-slate-400 font-bold flex items-center gap-1">
                                <span className={`w-1.5 h-1.5 rounded-full ${todayRecord?.inTime ? "bg-emerald-500" : "bg-slate-300"}`} />
                                {t("shift_in")}
                              </span>
                              <p className="text-sm font-black text-slate-800 font-mono">
                                {todayRecord?.inTime || "--:--"}
                              </p>
                            </div>

                            {/* Shift Out Box */}
                            <div className="bg-slate-50/50 rounded-xl p-3 border border-slate-100 space-y-1">
                              <span className="text-[9px] text-slate-400 font-bold flex items-center gap-1">
                                <span className={`w-1.5 h-1.5 rounded-full ${todayRecord?.outTime ? "bg-emerald-500" : "bg-slate-300"}`} />
                                {t("shift_out")}
                              </span>
                              <p className="text-sm font-black text-slate-800 font-mono">
                                {todayRecord?.outTime || "--:--"}
                              </p>
                            </div>
                          </div>

                          {/* 地理定位与打卡围栏状态 - 极简显示 (只显示打卡的位置与距离/偏差状态) */}
                          <div className="space-y-2">
                            <div 
                              onClick={() => setShowSimControls(!showSimControls)}
                              className="bg-blue-50/50 hover:bg-blue-50 border border-blue-100/55 text-blue-600 px-3.5 py-2.5 rounded-xl text-[11px] flex items-center justify-between font-bold cursor-pointer transition"
                              title="点击切换高级 GPS 模拟/真实坐标调试"
                            >
                              <div className="flex items-center gap-1.5 overflow-hidden mr-2">
                                <MapPin className="w-3.5 h-3.5 text-blue-500 shrink-0" />
                                <span className="truncate">
                                  {config.companyAddress || "Yangon Logistics Center"}
                                </span>
                              </div>
                              {(() => {
                                const companyLattitude = config.companyLat || 16.8661;
                                const companyLongitude = config.companyLng || 96.1951;
                                const dist = getDistanceInMeters(deviceLat, deviceLng, companyLattitude, companyLongitude);
                                const exceeded = dist > 800;

                                return (
                                  <span className={`text-[10px] shrink-0 font-extrabold px-2 py-0.5 rounded-full ${
                                    exceeded ? "bg-red-100/70 text-red-600 border border-red-100" : "bg-emerald-100/70 text-emerald-600 border border-emerald-100"
                                  }`}>
                                    {exceeded ? `异地 (${dist}米)` : `${dist}米`}
                                  </span>
                                );
                              })()}
                            </div>

                            {/* 高级调试面板：默认隐藏，只有点击打卡位置栏时才显示 */}
                            {showSimControls && (
                              <div className="bg-slate-50 border border-slate-200 rounded-xl p-3 space-y-2.5 text-left text-slate-700 animate-in fade-in slide-in-from-top-1 duration-150">
                                <div className="flex justify-between items-center">
                                  <span className="text-[10px] font-extrabold text-slate-500 flex items-center gap-1 uppercase">
                                    <span className="w-1 h-3 bg-blue-500 rounded-full inline-block"></span>
                                    📍 手机 GPS 定位状态
                                  </span>
                                  <button
                                    type="button"
                                    onClick={() => {
                                      if (navigator.geolocation) {
                                        setIsLocating(true);
                                        navigator.geolocation.getCurrentPosition(
                                          (position) => {
                                            setDeviceLat(position.coords.latitude);
                                            setDeviceLng(position.coords.longitude);
                                            setLocationPreset("custom");
                                            setIsLocating(false);
                                            addToast("已成功读取真实设备 GPS 坐标！");
                                          },
                                          (error) => {
                                            setIsLocating(false);
                                            addToast("读取 GPS 失败: 浏览器拒绝。已使用模拟定位。");
                                          }
                                        );
                                      } else {
                                        addToast("您的浏览器不支持 HTML5 地理定位");
                                      }
                                    }}
                                    disabled={isLocating}
                                    className="text-[10px] text-blue-600 hover:text-blue-700 font-bold hover:underline flex items-center gap-1 cursor-pointer"
                                  >
                                    {isLocating ? "正在获取..." : "获取真实GPS"}
                                  </button>
                                </div>

                                <div className="space-y-1 text-[10px]">
                                  <div className="flex justify-between items-center font-mono font-bold text-slate-600">
                                    <span>打卡坐标：</span>
                                    <span>{deviceLat.toFixed(5)}, {deviceLng.toFixed(5)}</span>
                                  </div>
                                  <div className="flex justify-between items-center font-bold text-slate-500">
                                    <span>规定中心坐标：</span>
                                    <span>{(config.companyLat || 16.8661).toFixed(4)}, {(config.companyLng || 96.1951).toFixed(4)}</span>
                                  </div>
                                </div>

                                <div className="border-t border-slate-100 pt-2">
                                  <span className="text-[9px] text-slate-400 block mb-1.5 font-bold">考勤测试模拟定位：</span>
                                  <div className="grid grid-cols-2 gap-1.5">
                                    <button
                                      type="button"
                                      onClick={() => setLocationPreset("in_company")}
                                      className={`px-2 py-1 text-[10px] rounded-lg border font-semibold transition cursor-pointer text-center leading-none ${
                                        locationPreset === "in_company" 
                                          ? "bg-blue-50 text-blue-600 border-blue-200" 
                                          : "bg-white text-slate-500 hover:bg-slate-50 border-slate-200"
                                      }`}
                                    >
                                      🏢 仓内 (0米)
                                    </button>
                                    <button
                                      type="button"
                                      onClick={() => setLocationPreset("gate_offset")}
                                      className={`px-2 py-1 text-[10px] rounded-lg border font-semibold transition cursor-pointer text-center leading-none ${
                                        locationPreset === "gate_offset" 
                                          ? "bg-blue-50 text-blue-600 border-blue-200" 
                                          : "bg-white text-slate-500 hover:bg-slate-50 border-slate-200"
                                      }`}
                                    >
                                      🚶 仓门口 (~150m)
                                    </button>
                                    <button
                                      type="button"
                                      onClick={() => setLocationPreset("outpost_offset")}
                                      className={`px-2 py-1 text-[10px] rounded-lg border font-semibold transition cursor-pointer text-center leading-none ${
                                        locationPreset === "outpost_offset" 
                                          ? "bg-blue-50 text-blue-600 border-blue-200" 
                                          : "bg-white text-slate-500 hover:bg-slate-50 border-slate-200"
                                      }`}
                                    >
                                      ☕ 外派点 (~950m)
                                    </button>
                                    <button
                                      type="button"
                                      onClick={() => setLocationPreset("home_offset")}
                                      className={`px-2 py-1 text-[10px] rounded-lg border font-semibold transition cursor-pointer text-center leading-none ${
                                        locationPreset === "home_offset" 
                                          ? "bg-blue-50 text-blue-600 border-blue-200" 
                                          : "bg-white text-slate-500 hover:bg-slate-50 border-slate-200"
                                      }`}
                                    >
                                      🏡 家中 (~6km)
                                    </button>
                                  </div>
                                </div>
                              </div>
                            )}
                          </div>

                          {/* Large Punch Action Button */}
                          <button
                            type="button"
                            onClick={() => {
                              if (currentUser?.status === '离职') {
                                addToast("⚠️ 您已办理离职，该账号已进入只读归档状态，无法进行打卡操作。如有疑问请联系HR或管理员。");
                                return;
                              }
                              if (!todayRecord?.inTime) {
                                handlePunchIn();
                              } else if (!todayRecord?.outTime) {
                                handlePunchOut();
                              } else {
                                addToast(t("all_punched_toast"));
                              }
                            }}
                            className={`w-full py-3.5 bg-blue-600 hover:bg-blue-700 text-white font-extrabold rounded-xl text-xs transition shadow-md flex items-center justify-center gap-2 cursor-pointer ${
                              todayRecord?.inTime && todayRecord?.outTime ? "opacity-60 cursor-not-allowed bg-slate-600 hover:bg-slate-600 shadow-none" : ""
                            }`}
                          >
                            <Clock className="w-4 h-4" />
                            <span>
                              {!todayRecord?.inTime ? t("punch_in_btn") : !todayRecord?.outTime ? t("punch_out_btn") : t("punched")}
                            </span>
                          </button>
                        </div>

                        {/* Three Metric Cards Side-By-Side */}
                        <div className="grid grid-cols-3 gap-3">
                          {/* Card 1: 本月工时 */}
                          <div className="bg-white p-3 rounded-xl text-center space-y-1 shadow-sm hover:shadow-md transition duration-200">
                            <span className="text-[10px] text-slate-400 font-extrabold block">{t("hours_this_month")}</span>
                            <p className="text-base font-black text-slate-800 font-sans">
                              {displayHours} <span className="text-[9px] text-slate-400 font-normal">h</span>
                            </p>
                          </div>

                          {/* Card 2: 出勤天数 */}
                          <div className="bg-white p-3 rounded-xl text-center space-y-1 shadow-sm hover:shadow-md transition duration-200">
                            <span className="text-[10px] text-slate-400 font-extrabold block">{t("days_worked")}</span>
                            <p className="text-base font-black text-slate-800 font-sans">
                              {displayDays} <span className="text-[9px] text-slate-400 font-normal">d</span>
                            </p>
                          </div>

                          {/* Card 3: 待办SOP */}
                          <div className="bg-white p-3 rounded-xl text-center space-y-1 shadow-sm hover:shadow-md transition duration-200">
                            <span className="text-[10px] text-slate-400 font-extrabold block">{t("pending_sops")}</span>
                            <p className="text-base font-black text-slate-800 font-sans">
                              {pendingSopsCount} <span className="text-[9px] text-slate-400 font-normal">p</span>
                            </p>
                          </div>
                        </div>

                        {/* System Notification Panel */}
                        <div className="bg-white rounded-xl p-4.5 shadow-sm space-y-3.5 text-left">
                          <div className="flex justify-between items-center pb-1">
                            <h3 className="text-xs font-black text-slate-800 flex items-center gap-1.5">
                              {t("sys_notification")}
                            </h3>
                            <button
                              type="button"
                              onClick={() => {
                                setActiveMobileTab("sop");
                              }}
                              className="text-[10px] font-bold text-brand-600 hover:underline"
                            >
                              {t("view_all")}
                            </button>
                          </div>

                          <div className="space-y-2.5 divide-y divide-slate-100">
                            {dynamicNotifications.length === 0 ? (
                              <>
                                {/* Default static notifications if nothing was pushed yet */}
                                <button
                                  type="button"
                                  onClick={() => {
                                    setNotificationDetail({
                                      title: t("fire_drill_title"),
                                      time: "2026-07-03 14:00",
                                      content: t("fire_drill_content")
                                    });
                                  }}
                                  className="w-full text-left pt-2 first:pt-0 flex items-center justify-between cursor-pointer group transition"
                                >
                                  <div className="flex items-center gap-3">
                                    <div className="w-8 h-8 rounded-full bg-blue-50 text-blue-600 flex items-center justify-center shadow-3xs shrink-0 group-hover:bg-blue-100">
                                      <Bell className="w-4 h-4" />
                                    </div>
                                    <div>
                                      <h4 className="text-[11.5px] font-black text-slate-800 group-hover:text-blue-600 transition">{t("fire_drill_title")}</h4>
                                      <p className="text-[10px] text-slate-400 font-semibold">{t("fire_drill_desc")}</p>
                                    </div>
                                  </div>
                                  <ChevronRight className="w-3.5 h-3.5 text-slate-400 group-hover:text-slate-600 transition" />
                                </button>

                                {currentUser && payouts[`${currentUser.id}_${currentMonthStr}`] && (
                                  <button
                                    type="button"
                                    onClick={() => {
                                      if (currentUser?.status === '离职') {
                                        addToast("⚠️ 您已办理离职，该账号已进入只读归档状态，无法签署工资单。如有疑问请联系HR或管理员。");
                                        return;
                                      }
                                      setPreviousTab("home");
                                      setActiveMobileTab("payslip");
                                      addToast(t("payslip_notif_toast"));
                                    }}
                                    className="w-full text-left pt-2.5 flex items-center justify-between cursor-pointer group transition border-t border-slate-50 mt-1"
                                  >
                                    <div className="flex items-center gap-3">
                                      <div className="w-8 h-8 rounded-full bg-emerald-50 text-emerald-600 flex items-center justify-center shadow-3xs shrink-0 group-hover:bg-emerald-100">
                                        <CheckCircle className="w-4 h-4" />
                                      </div>
                                      <div>
                                        <h4 className="text-[11.5px] font-black text-slate-800 group-hover:text-emerald-600 transition">{t("payslip_notif_title")}</h4>
                                        <p className="text-[10px] text-slate-400 font-semibold">{t("payslip_notif_desc")}</p>
                                      </div>
                                    </div>
                                    <ChevronRight className="w-3.5 h-3.5 text-slate-400 group-hover:text-slate-600 transition" />
                                  </button>
                                )}
                              </>
                            ) : (
                              dynamicNotifications.map(notif => {
                                const isCatering = notif.category === 'catering';
                                const displayTitle = isCatering ? `新菜谱工艺发布: ${notif.title}` : notif.title;
                                const displayDesc = isCatering ? `膳食编号: ${notif.recipeCode || '无'} • 制作配方工艺标准已下发` : notif.content.replace(/<[^>]*>/g, '');
                                return (
                                  <button
                                    key={notif.id}
                                    type="button"
                                    onClick={() => {
                                      setNotificationDetail({
                                        id: notif.id,
                                        title: displayTitle,
                                        time: notif.createdAt,
                                        content: notif.content,
                                        category: notif.category,
                                        sop: notif
                                      });
                                      handleMarkAsRead(notif.id);

                                      // If it is a recall notice, hide/remove it from localStorage wms_sop_documents immediately when clicked
                                      if (notif.id && notif.id.startsWith("sop-payslip-recall-")) {
                                        try {
                                          const saved = localStorage.getItem("wms_sop_documents");
                                          if (saved) {
                                            const parsed = JSON.parse(saved);
                                            const updated = parsed.filter((s: any) => s.id !== notif.id);
                                            localStorage.setItem("wms_sop_documents", JSON.stringify(updated));
                                            window.dispatchEvent(new Event("storage"));
                                          }
                                        } catch (e) {
                                          console.error(e);
                                        }
                                      }
                                    }}
                                    className="w-full text-left pt-2 first:pt-0 flex items-center justify-between cursor-pointer group transition"
                                  >
                                    <div className="flex items-center gap-3 overflow-hidden flex-1 text-left">
                                      <div className={`w-8 h-8 rounded-full flex items-center justify-center shadow-3xs shrink-0 ${isCatering ? 'bg-amber-50 text-amber-600 group-hover:bg-amber-100' : 'bg-blue-50 text-blue-600 group-hover:bg-blue-100'}`}>
                                        {isCatering ? <Utensils className="w-4 h-4" /> : <Bell className="w-4 h-4" />}
                                      </div>
                                      <div className="overflow-hidden text-left flex-1">
                                        <div className="flex items-center gap-1.5 overflow-hidden">
                                          <h4 className="text-[11.5px] font-black text-slate-800 group-hover:text-blue-600 transition truncate">{displayTitle}</h4>
                                          {currentUser && !notif.reads[currentUser.id] && (
                                            <span className="w-1.5 h-1.5 bg-amber-500 rounded-full shrink-0" title="未读" />
                                          )}
                                        </div>
                                        <p className="text-[10px] text-slate-400 font-semibold truncate">
                                          {displayDesc}
                                        </p>
                                      </div>
                                    </div>
                                    <ChevronRight className="w-3.5 h-3.5 text-slate-400 group-hover:text-slate-600 transition shrink-0 ml-1" />
                                  </button>
                                );
                              })
                            )}
                          </div>
                        </div>

                      </div>
                    )}

                    {activeMobileTab === "attendance" && (
                      <div className="space-y-4 text-left">
                        
                        {/* Attendance Stats & Leave Request Header */}
                        <div className="bg-white p-4 rounded-xl shadow-sm space-y-3">
                          <div className="flex justify-between items-center">
                            <h3 className="text-xs font-black text-slate-800 flex items-center gap-1.5">
                              <Calendar className="w-4 h-4 text-brand-600" />
                              {editingLeaveId ? (locale === "zh-CN" || locale === "zh-TW" ? "编辑请假申请" : "Edit Leave") : t("calendar_header")}
                            </h3>
                            <button
                              type="button"
                              onClick={() => {
                                if (showLeaveForm) {
                                  setShowLeaveForm(false);
                                  setEditingLeaveId(null);
                                  setLeaveReason("");
                                  setLeaveStart("");
                                  setLeaveEnd("");
                                } else {
                                  setShowLeaveForm(true);
                                }
                              }}
                              className={`px-2.5 py-1 rounded-lg text-[10px] font-bold flex items-center gap-1 transition ${
                                showLeaveForm
                                  ? "bg-rose-50 hover:bg-rose-100 text-rose-700 animate-pulse-subtle"
                                  : "bg-brand-50 hover:bg-brand-100 text-brand-700"
                              }`}
                            >
                              {showLeaveForm ? (
                                <>
                                  <X className="w-3 h-3" />
                                  {t("reim_cancel")}
                                </>
                              ) : (
                                <>
                                  <Plus className="w-3 h-3" />
                                  {t("request_leave")}
                                </>
                              )}
                            </button>
                          </div>

                          {showLeaveForm && (
                            <motion.div
                              initial={{ opacity: 0, height: 0 }}
                              animate={{ opacity: 1, height: "auto" }}
                              className="pt-2 border-t border-slate-100 space-y-3"
                            >
                                <div className="grid grid-cols-2 gap-2">
                                  <div>
                                    <label className="block text-[9px] font-bold text-slate-400 mb-0.5">{t("leave_type")}</label>
                                    <button
                                      type="button"
                                      onClick={() => setShowLeaveTypePicker(true)}
                                      className="w-full px-2.5 py-2 border border-slate-200 rounded-lg text-[11px] font-bold bg-slate-50 text-slate-700 flex items-center justify-between cursor-pointer hover:bg-slate-100/70 hover:border-slate-300 transition text-left"
                                    >
                                      <span>{getLeaveTypeLabel(leaveType)}</span>
                                      <ChevronDown className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                                    </button>
                                  </div>
                                  <div>
                                    <label className="block text-[9px] font-bold text-slate-400 mb-0.5">{t("leave_days")}</label>
                                    <div className="flex items-center border border-slate-200 rounded-lg bg-slate-50 overflow-hidden h-[34px] w-full">
                                      <button
                                        type="button"
                                        onClick={() => setLeaveDays(prev => String(Math.max(0.5, parseFloat(prev) - 0.5)))}
                                        className="px-3 h-full flex items-center justify-center text-slate-500 hover:bg-slate-100 font-bold border-r border-slate-200 active:bg-slate-200/50 cursor-pointer select-none"
                                      >
                                        -
                                      </button>
                                      <input
                                        type="number"
                                        min="0.5"
                                        step="0.5"
                                        value={leaveDays}
                                        onChange={(e) => setLeaveDays(e.target.value)}
                                        className="w-full text-center text-[11px] font-bold bg-transparent border-none outline-none focus:ring-0 focus:outline-none p-0"
                                      />
                                      <button
                                        type="button"
                                        onClick={() => setLeaveDays(prev => String(parseFloat(prev) + 0.5))}
                                        className="px-3 h-full flex items-center justify-center text-slate-500 hover:bg-slate-100 font-bold border-l border-slate-200 active:bg-slate-200/50 cursor-pointer select-none"
                                      >
                                        +
                                      </button>
                                    </div>
                                  </div>
                                </div>
                              <div className="grid grid-cols-2 gap-2">
                                <div>
                                  <label className="block text-[9px] font-bold text-slate-400 mb-0.5">{t("start_date")}</label>
                                  <button
                                    type="button"
                                    onClick={() => {
                                      const baseDate = leaveStart || simulatedDate || "2026-07-06";
                                      const [y, m] = baseDate.split("-").map(Number);
                                      setPickerYear(y || 2026);
                                      setPickerMonth(m || 7);
                                      setShowDatePickerTarget("start");
                                    }}
                                    className="w-full px-2.5 py-2 border border-slate-200 rounded-lg text-[11px] font-semibold bg-slate-50 text-slate-700 flex items-center justify-between cursor-pointer hover:bg-slate-100/70 hover:border-slate-300 transition text-left"
                                  >
                                    <span>{leaveStart ? leaveStart.replace(/-/g, "/") : "请选择"}</span>
                                    <Calendar className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                                  </button>
                                </div>
                                <div>
                                  <label className="block text-[9px] font-bold text-slate-400 mb-0.5">{t("end_date")}</label>
                                  <button
                                    type="button"
                                    onClick={() => {
                                      const baseDate = leaveEnd || simulatedDate || "2026-07-06";
                                      const [y, m] = baseDate.split("-").map(Number);
                                      setPickerYear(y || 2026);
                                      setPickerMonth(m || 7);
                                      setShowDatePickerTarget("end");
                                    }}
                                    className="w-full px-2.5 py-2 border border-slate-200 rounded-lg text-[11px] font-semibold bg-slate-50 text-slate-700 flex items-center justify-between cursor-pointer hover:bg-slate-100/70 hover:border-slate-300 transition text-left"
                                  >
                                    <span>{leaveEnd ? leaveEnd.replace(/-/g, "/") : "请选择"}</span>
                                    <Calendar className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                                  </button>
                                </div>
                              </div>
                              <div>
                                <label className="block text-[9px] font-bold text-slate-400 mb-0.5">{t("leave_reason_label")}</label>
                                <textarea
                                  value={leaveReason}
                                  onChange={(e) => setLeaveReason(e.target.value)}
                                  placeholder={t("leave_reason_placeholder")}
                                  rows={2}
                                  className="w-full px-2.5 py-1.5 border border-slate-200 rounded-lg text-[11px] font-semibold bg-slate-50 resize-none"
                                />
                              </div>
                              <button
                                type="button"
                                onClick={handleApplyLeave}
                                className="w-full py-2 bg-brand-600 hover:bg-brand-700 text-white rounded-xl text-xs font-black transition shadow-3xs"
                              >
                                {editingLeaveId ? (locale === "zh-CN" || locale === "zh-TW" ? "保存修改" : "Save Changes") : t("leave_submit")}
                              </button>
                            </motion.div>
                          )}
                        </div>

                        {/* Interactive Attendance Calendar Card */}
                        <div className="bg-white p-4 rounded-xl shadow-sm space-y-3">
                          <div className="flex justify-between items-center border-b border-slate-100 pb-2">
                            <span className="text-[11px] font-black text-slate-800">
                              {locale === "zh-CN" || locale === "zh-TW" ? "2026年7月" : locale === "th" ? "กรกฎาคม 2026" : locale === "id" ? "Juli 2026" : "July 2026"}
                            </span>
                            <div className="flex gap-2 text-[8px] font-bold">
                              <span className="flex items-center gap-0.5 text-emerald-600">
                                <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full" /> {t("calendar_normal")}
                              </span>
                              <span className="flex items-center gap-0.5 text-rose-600">
                                <span className="w-1.5 h-1.5 bg-rose-500 rounded-full" /> {t("calendar_late")}
                              </span>
                              <span className="flex items-center gap-0.5 text-amber-500">
                                <span className="w-1.5 h-1.5 bg-amber-500 rounded-full" /> {t("calendar_leave")}
                              </span>
                            </div>
                          </div>

                          {/* Calendar Grid */}
                          <div className="grid grid-cols-7 gap-1 text-center">
                            {(locale === "zh-CN" || locale === "zh-TW" 
                              ? ["日", "一", "二", "三", "四", "五", "六"]
                              : locale === "th"
                              ? ["อา", "จ", "อ", "พ", "พฤ", "ศ", "ส"]
                              : locale === "id"
                              ? ["Min", "Sen", "Sel", "Rab", "Kam", "Jum", "Sab"]
                              : ["Su", "Mo", "Tu", "We", "Th", "Fr", "Sa"]
                            ).map(d => (
                              <span key={d} className="text-[9px] font-black text-slate-400 py-1">{d}</span>
                            ))}
                            
                            {/* Blank spaces for Wed start */}
                            {Array.from({ length: 3 }).map((_, i) => (
                              <span key={`empty-${i}`} className="text-[10px] py-1 text-slate-200"></span>
                            ))}

                            {/* Days 1 to 31 */}
                            {Array.from({ length: 31 }).map((_, i) => {
                              const day = i + 1;
                              const dateStr = `2026-07-${day.toString().padStart(2, "0")}`;
                              
                              const rec = attendance.find(r => r.empId === currentUser.id && r.date === dateStr);
                              const isLeaveDay = leaveRequests.some(l => {
                                if (l.empId !== currentUser.id || l.status !== "approved") return false;
                                const start = new Date(l.startDate);
                                const end = new Date(l.endDate);
                                const current = new Date(dateStr);
                                return current >= start && current <= end;
                              });

                              let dotColor = "";
                              if (isLeaveDay) {
                                dotColor = "bg-amber-500";
                              } else if (rec) {
                                dotColor = rec.type === "late" ? "bg-rose-500" : "bg-emerald-500";
                              }

                              const isToday = simulatedDate === dateStr;

                              return (
                                <div
                                  key={day}
                                  className={`py-1 rounded-lg flex flex-col items-center justify-between min-h-[28px] relative ${
                                    isToday ? "bg-brand-50 border border-brand-200" : ""
                                  }`}
                                >
                                  <span className={`text-[9px] font-black ${
                                    isToday ? "text-brand-700 font-black" : "text-slate-700"
                                  }`}>
                                    {day}
                                  </span>
                                  {dotColor && (
                                    <span className={`w-1 h-1 rounded-full ${dotColor} absolute bottom-0.5`} />
                                  )}
                                </div>
                              );
                            })}
                          </div>
                        </div>

                        {/* Sub tabs for Punch Logs vs Leave History */}
                        <div className="flex bg-slate-100 p-1 rounded-xl">
                          <button
                            type="button"
                            onClick={() => { setAttendanceSubTab('punch'); }}
                            className={`flex-1 py-1.5 rounded-lg text-[10px] font-black transition-all cursor-pointer ${
                              attendanceSubTab === 'punch'
                                ? "bg-white text-slate-800 shadow-3xs"
                                : "text-slate-500 hover:text-slate-800"
                            }`}
                          >
                            {t("punch_log")} ({employeeAttendance.length})
                          </button>
                          <button
                            type="button"
                            onClick={() => { setAttendanceSubTab('leave'); }}
                            className={`flex-1 py-1.5 rounded-lg text-[10px] font-black transition-all cursor-pointer ${
                              attendanceSubTab === 'leave'
                                ? "bg-white text-slate-800 shadow-3xs"
                                : "text-slate-500 hover:text-slate-800"
                            }`}
                          >
                            {t("leave_detail")} ({leaveRequests.filter(l => l.empId === currentUser?.id).length})
                          </button>
                        </div>

                        {/* Tab Content */}
                        {attendanceSubTab === 'punch' && (
                          <div className="bg-white p-4.5 rounded-xl shadow-sm space-y-3.5 text-left">
                            <h4 className="text-[11px] font-black text-slate-700 flex items-center justify-between pb-2.5 border-b border-slate-100">
                              <span className="flex items-center gap-1.5">
                                <span className="w-1.5 h-3 bg-brand-500 rounded-full shrink-0"></span>
                                {t("punch_log")}
                              </span>
                              <span className="text-[9px] text-slate-500 font-semibold bg-slate-50 border border-slate-100 px-2 py-0.5 rounded-full shadow-3xs">
                                {t("punch_count_month", { count: String(employeeAttendance.length) })}
                              </span>
                            </h4>
                            <div className="space-y-2.5">
                              {employeeAttendance.length === 0 ? (
                                <p className="text-[10px] text-slate-400 text-center py-5 font-bold">{t("no_punch_log")}</p>
                              ) : (
                                employeeAttendance.map(rec => (
                                  <div
                                    key={rec.id}
                                    className="bg-slate-50 hover:bg-slate-100 p-3 rounded-xl border border-slate-100 flex justify-between items-center transition shadow-3xs hover:shadow-2xs"
                                  >
                                    <div className="space-y-0.5 text-left">
                                      <p className="font-bold text-slate-800">{rec.date}</p>
                                      <p className="text-[9px] text-slate-400 font-mono">
                                        {t("punch_log_row", { inTime: rec.inTime || "--:--", outTime: rec.outTime || "--:--" })}
                                      </p>
                                    </div>
                                    <span className={`text-[9px] px-1.5 py-0.5 rounded font-black ${
                                      rec.type === "late" ? "bg-rose-50 text-rose-600 border border-rose-100" : "bg-emerald-50 text-emerald-600 border border-emerald-100"
                                    }`}>
                                      {rec.type === "late" ? t("late_badge") : t("calendar_normal")}
                                    </span>
                                  </div>
                                ))
                              )}
                            </div>
                          </div>
                        )}

                        {attendanceSubTab === 'leave' && (
                          <div className="bg-white p-4 rounded-xl shadow-sm space-y-2.5 text-left">
                            <h4 className="text-[11px] font-black text-slate-800 flex justify-between items-center pb-2 border-b border-slate-100">
                              <span className="flex items-center gap-1.5">
                                <span className="w-1.5 h-3 bg-amber-500 rounded-full shrink-0"></span>
                                {t("leave_detail")}
                              </span>
                              <span className="text-[9px] text-slate-400 font-bold">共 {leaveRequests.filter(l => l.empId === currentUser?.id).length} 次申请</span>
                            </h4>
                            <div className="space-y-2">
                              {leaveRequests.filter(l => l.empId === currentUser?.id).length === 0 ? (
                                <p className="text-[10px] text-slate-400 text-center py-5 font-bold">暂无请假申请记录</p>
                              ) : (
                                leaveRequests.filter(l => l.empId === currentUser?.id).map(req => {
                                  const isPending = req.status === 'pending';
                                  return (
                                    <div 
                                      key={req.id} 
                                      className={`bg-slate-50 border border-slate-100 p-3 rounded-xl text-[10px] font-semibold text-slate-600 hover:bg-slate-100/30 transition-colors flex ${
                                        isPending ? "flex-col gap-2.5" : "justify-between items-center"
                                      }`}
                                    >
                                      <div className={`text-left flex-1 min-w-0 pr-2 ${isPending ? "w-full flex justify-between items-start" : ""}`}>
                                        <div className="space-y-0.5 text-left flex-1 min-w-0 pr-2">
                                          <p className="font-bold text-slate-800">
                                            {getLeaveTypeLabel(req.type)} · {req.days} {locale === "zh-CN" || locale === "zh-TW" ? "天" : locale === "th" ? "วัน" : locale === "id" ? "hari" : "days"}
                                          </p>
                                          <p className="text-[9px] text-slate-400 font-mono">{req.startDate} 至 {req.endDate}</p>
                                          <p className="text-[9px] text-slate-500 italic mt-1 bg-white border border-slate-100 p-1.5 rounded-md truncate" title={req.reason}>
                                            "{req.reason}"
                                          </p>
                                        </div>
                                        {isPending && (
                                          <div className="shrink-0 ml-2">
                                            <span className="text-[9px] px-2 py-1 rounded-lg font-black bg-amber-50 text-amber-600 border border-amber-100 inline-flex items-center gap-0.5 animate-pulse">
                                              <Clock className="w-2.5 h-2.5" />
                                              等待审批
                                            </span>
                                          </div>
                                        )}
                                      </div>
                                      
                                      {!isPending && (
                                        <div className="shrink-0">
                                          {req.status === 'approved' && (
                                            <span className="text-[9px] px-2 py-1 rounded-lg font-black bg-emerald-50 text-emerald-600 border border-emerald-100 inline-flex items-center gap-0.5">
                                              <Check className="w-2.5 h-2.5" />
                                              已同意
                                            </span>
                                          )}
                                          {req.status === 'rejected' && (
                                            <span className="text-[9px] px-2 py-1 rounded-lg font-black bg-rose-50 text-rose-600 border border-rose-100 inline-flex items-center gap-0.5">
                                              <X className="w-2.5 h-2.5" />
                                              已拒绝
                                            </span>
                                          )}
                                        </div>
                                      )}

                                      {isPending && (
                                        <div className="flex gap-2 border-t border-slate-200/50 pt-2 justify-end w-full">
                                          <button
                                            type="button"
                                            onClick={() => {
                                              setLeaveType(req.type);
                                              setLeaveDays(String(req.days));
                                              setLeaveStart(req.startDate);
                                              setLeaveEnd(req.endDate);
                                              setLeaveReason(req.reason);
                                              setEditingLeaveId(req.id);
                                              setShowLeaveForm(true);
                                              // Smooth scroll to top of employee container
                                              const container = document.getElementById("employee-scroll-container");
                                              if (container) {
                                                container.scrollTo({ top: 0, behavior: "smooth" });
                                              }
                                            }}
                                            className="px-2.5 py-1 bg-white border border-slate-200 hover:border-brand-500 hover:text-brand-600 text-slate-600 rounded-lg text-[9px] font-black flex items-center gap-1 transition cursor-pointer shadow-3xs"
                                          >
                                            <Edit3 className="w-2.5 h-2.5 text-brand-500" />
                                            重新编辑
                                          </button>
                                          <button
                                            type="button"
                                            onClick={() => {
                                              if (confirm(locale === "zh-CN" || locale === "zh-TW" ? "确定要取消此请假申请吗？" : "Are you sure you want to cancel this leave request?")) {
                                                const updated = leaveRequests.filter(l => l.id !== req.id);
                                                setLeaveRequests(updated);
                                                addToast(locale === "zh-CN" || locale === "zh-TW" ? "🎉 请假申请已取消。" : "🎉 Leave request cancelled.");
                                              }
                                            }}
                                            className="px-2.5 py-1 bg-white border border-slate-200 hover:border-rose-500 hover:text-rose-600 text-slate-600 rounded-lg text-[9px] font-black flex items-center gap-1 transition cursor-pointer shadow-3xs"
                                          >
                                            <Trash2 className="w-2.5 h-2.5 text-rose-500" />
                                            取消申请
                                          </button>
                                        </div>
                                      )}
                                    </div>
                                  );
                                })
                              )}
                            </div>
                          </div>
                        )}

                      </div>
                    )}

                    {activeMobileTab === "sop" && (
                      <div className="space-y-4">

                        {/* Document sub-tabs */}
                        {!viewingSop && (
                          <div className="flex bg-slate-100 p-1 rounded-xl">
                            <button
                              type="button"
                              onClick={() => { setSopSubTab('training'); }}
                              className={`flex-1 py-1.5 rounded-lg text-[10px] font-black transition-all cursor-pointer ${
                                sopSubTab === 'training'
                                  ? "bg-white text-slate-800 shadow-3xs"
                                  : "text-slate-500 hover:text-slate-800"
                              }`}
                            >
                              {t("training_docs")} ({sops.filter(s => s.status === 'published' && s.category !== 'catering' && (s.docType || 'training') === 'training' && (s.targetType === 'all' || s.targetEmployeeIds?.includes(currentUser?.id))).length})
                            </button>
                            <button
                              type="button"
                              onClick={() => { setSopSubTab('notification'); }}
                              className={`flex-1 py-1.5 rounded-lg text-[10px] font-black transition-all cursor-pointer ${
                                sopSubTab === 'notification'
                                  ? "bg-white text-slate-800 shadow-3xs"
                                  : "text-slate-500 hover:text-slate-800"
                              }`}
                            >
                              {t("announcements")} ({sops.filter(s => s.status === 'published' && s.category !== 'catering' && s.docType === 'notification' && (s.targetType === 'all' || s.targetEmployeeIds?.includes(currentUser?.id))).length})
                            </button>
                          </div>
                        )}

                        {viewingSop ? (
                          <div className="bg-white p-4.5 rounded-xl shadow-sm space-y-3 text-left">
                            <h4 className="font-extrabold text-slate-800 text-sm border-b border-slate-100 pb-2">
                              {viewingSop.title}
                            </h4>

                            <div 
                              className="text-[11px] text-slate-600 leading-relaxed max-h-[220px] overflow-y-auto space-y-2 pr-1 select-text"
                              dangerouslySetInnerHTML={{ __html: viewingSop.content }}
                            />

                            <div className="bg-slate-50 p-3 rounded-xl border border-slate-100 space-y-2 text-[10px] text-slate-500 leading-normal">
                              <p className="font-bold text-slate-700">{t("sop_instructions_title")}</p>
                              <p>{t("sop_instructions_content")}</p>
                            </div>

                            <div className="pt-2 border-t border-slate-100 space-y-3">
                              <label className="flex items-start gap-2 cursor-pointer">
                                <input 
                                  type="checkbox"
                                  checked={pledgeChecked}
                                  onChange={(e) => setPledgeChecked(e.target.checked)}
                                  className="mt-0.5 cursor-pointer"
                                authorize-id="pledge_checkbox_sop"
                                />
                                <span className="text-[10px] text-slate-600 font-semibold select-none leading-tight">
                                  {t("sop_checkbox")}
                                </span>
                              </label>

                              <button
                                type="button"
                                disabled={!pledgeChecked}
                                onClick={() => handleReadSop(viewingSop.id)}
                                className={`w-full py-2 rounded-xl text-xs font-black transition-all flex items-center justify-center gap-1.5 shadow-3xs ${
                                  pledgeChecked
                                    ? "bg-brand-600 hover:bg-brand-700 text-white cursor-pointer"
                                    : "bg-slate-100 text-slate-400 cursor-not-allowed"
                                }`}
                              >
                                <Check className="w-3.5 h-3.5" /> {t("sop_agree_btn")}
                              </button>
                            </div>
                          </div>
                        ) : (
                          <div className="space-y-2.5">
                            {filteredEmployeeSops.length === 0 ? (
                              <div className="bg-white p-6 rounded-xl shadow-sm text-center text-slate-400">
                                <FileText className="w-8 h-8 mx-auto text-slate-300 mb-2" />
                                <p className="text-xs font-bold">{t("sop_empty")}</p>
                              </div>
                            ) : (
                              filteredEmployeeSops.map(sop => {
                                const readAt = sop.reads[currentUser.id];
                                return (
                                  <button
                                    key={sop.id}
                                    type="button"
                                    onClick={() => {
                                      if (sopSubTab === 'notification') {
                                        setNotificationDetail({
                                          id: sop.id,
                                          title: sop.title,
                                          time: sop.createdAt,
                                          content: sop.content
                                        });
                                        handleMarkAsRead(sop.id);
                                      } else {
                                        setViewingSop(sop);
                                      }
                                    }}
                                    className="w-full text-left bg-white p-3.5 rounded-xl transition shadow-sm hover:shadow-md flex items-center justify-between cursor-pointer gap-2 border-0"
                                  >
                                    <div className="space-y-1 overflow-hidden flex-1 text-left">
                                      <h4 className="text-[11.5px] font-extrabold text-slate-800 truncate">
                                        {sop.title}
                                      </h4>
                                      <p className="text-[9px] text-slate-400 font-medium flex items-center gap-1">
                                        <span>{t("sop_publish_date")} {sop.createdAt.split(" ")[0]}</span>
                                        <span>•</span>
                                        <span>{t("sop_publisher")} {sop.creator}</span>
                                      </p>
                                    </div>
                                    <div>
                                      {readAt ? (
                                        <span className="bg-emerald-50 text-emerald-600 border border-emerald-100 text-[9px] px-1.5 py-0.5 rounded-full font-bold whitespace-nowrap">
                                          {t("sop_read")}
                                        </span>
                                      ) : (
                                        <span className="bg-amber-50 text-amber-600 border border-amber-100 text-[9px] px-1.5 py-0.5 rounded-full font-bold whitespace-nowrap">
                                          {t("sop_unread")}
                                        </span>
                                      )}
                                    </div>
                                  </button>
                                );
                              })
                            )}
                          </div>
                        )}

                      </div>
                    )}

                    {activeMobileTab === "my" && (
                      <div className="space-y-4 text-left animate-fade-in">
                        
                        {/* Profile Info Header */}
                        <div className="bg-white p-4.5 rounded-xl shadow-sm space-y-4">
                          <div className="flex items-center gap-3.5">
                            <label className="w-12 h-12 rounded-full bg-gradient-to-tr from-brand-600 to-indigo-600 text-white flex items-center justify-center font-black text-base shadow-sm uppercase shrink-0 cursor-pointer overflow-hidden relative group hover:opacity-90 transition">
                              {currentUser.photo ? (
                                <img src={currentUser.photo} className="w-full h-full object-cover" alt="" referrerPolicy="no-referrer" />
                              ) : (
                                currentUser.name.charAt(0)
                              )}
                              <div className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                                <Camera className="w-4 h-4 text-white" />
                              </div>
                              <input 
                                type="file" 
                                className="hidden" 
                                accept="image/*" 
                                onChange={(e) => {
                                  if (currentUser?.status === '离职') {
                                    addToast("⚠️ 您已办理离职，该账号已进入只读归档状态，无法修改个人头像。");
                                    return;
                                  }
                                  const file = e.target.files?.[0];
                                  if (file) {
                                    const reader = new FileReader();
                                    reader.onload = (ev) => {
                                      const rawData = ev.target?.result as string;
                                      const img = new Image();
                                      img.onload = () => {
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
                                          const updatedEmp = { ...currentUser, photo: compressedBase64 };
                                          const updatedEmployees = employees.map(empItem => empItem.id === currentUser.id ? updatedEmp : empItem);
                                          onUpdateEmployees(updatedEmployees);
                                          setCurrentUser(updatedEmp);
                                          addToast(t("info_success"));
                                        }
                                      };
                                      img.src = rawData;
                                    };
                                    reader.readAsDataURL(file);
                                  }
                                }} 
                              />
                            </label>
                            <div className="flex-1">
                              <h4 className="text-sm font-black text-slate-800 leading-tight">{currentUser.name}</h4>
                              <p className="text-[10px] text-slate-400 font-semibold mt-1.5">
                                {t("dept")}：{currentUser.dept} · {t("role")}：{currentUser.role}
                              </p>
                              <p className="text-[9px] text-slate-400 font-semibold mt-0.5">
                                {t("join_date")}: {currentUser.joinDate || "2026-05-15"}
                              </p>
                            </div>
                          </div>
                          
                          <div className="grid grid-cols-2 gap-2 text-center border-t border-slate-100 pt-3">
                            <div className="bg-slate-50 p-2 rounded-xl border border-slate-100">
                              <span className="text-[8px] text-slate-400 block font-black">{t("hourly_rate")}</span>
                              <span className="text-[11px] font-extrabold text-slate-700">
                                {currentUser.currency} {(currentUser.hourlyRate || 180).toLocaleString()} /h
                              </span>
                            </div>
                            <div className="bg-slate-50 p-2 rounded-xl border border-slate-100">
                              <span className="text-[8px] text-slate-400 block font-black">{t("base_currency")}</span>
                              <span className="text-[11px] font-extrabold text-brand-600">
                                {currentUser.currency}
                              </span>
                            </div>
                          </div>
                        </div>

                        {/* System Preference / Language Settings Section */}
                        <div className="bg-white p-4.5 rounded-xl shadow-sm space-y-3">
                          <h3 className="text-xs font-black text-slate-800 flex items-center gap-1.5">
                            <Globe className="w-4 h-4 text-brand-500" />
                            {t("language_settings")}
                          </h3>
                          <p className="text-[10px] text-slate-400 font-semibold leading-relaxed">
                            {locale === "zh-CN" ? "选择您首选的系统语言。设置后，您的考勤、SOP、薪资单等所有模块的内容均会自动同步该语言。" :
                             locale === "zh-TW" ? "選擇您首選的系統語言。設置後，您的考勤、SOP、薪資單等所有模組的內容均會自動同步該語言。" :
                             locale === "th" ? "เลือกภาษาของระบบที่คุณต้องการ การตั้งค่าภาษาจะซิงค์การแสดงผลของโมดูลทั้งหมดอัตโนมัติ" :
                             locale === "id" ? "Pilih bahasa sistem pilihan Anda. Pengaturan ini akan otomatis menyelaraskan bahasa di seluruh modul." :
                             "Select your preferred system language. Once selected, all modules such as attendance, SOP, and payslips will automatically synchronize to this language."}
                          </p>
                          <div className="pt-2.5 border-t border-slate-100">
                            <div className="relative w-full">
                              <select
                                value={locale}
                                onChange={(e) => {
                                  const newLang = e.target.value as any;
                                  setLocale(newLang);
                                  const langNames = {
                                    "zh-CN": "简体中文",
                                    "zh-TW": "繁體中文",
                                    "en": "English",
                                    "th": "ภาษาไทย",
                                    "id": "Bahasa Indonesia"
                                  };
                                  addToast(`${TRANSLATIONS[newLang]?.lang_toast || "Language changed: "}${langNames[newLang]}`);
                                }}
                                className="w-full text-[11px] font-black text-slate-700 bg-slate-50 hover:bg-slate-100 border border-slate-200 pl-9 pr-9 py-2 rounded-xl cursor-pointer focus:outline-none focus:ring-1 focus:ring-brand-500 focus:border-brand-500 transition leading-tight appearance-none text-left"
                              >
                                <option value="zh-CN">简体中文</option>
                                <option value="zh-TW">繁體中文</option>
                                <option value="en">English</option>
                                <option value="th">ภาษาไทย</option>
                                <option value="id">Bahasa Indonesia</option>
                              </select>
                              <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3 text-slate-400">
                                <Globe className="w-3.5 h-3.5 text-slate-400" />
                              </div>
                              <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center pr-3 text-slate-400">
                                <ChevronRight className="w-3.5 h-3.5 rotate-90" />
                              </div>
                            </div>
                          </div>
                        </div>

                        {/* App Management & Settings */}
                        <div className="bg-white p-4.5 rounded-xl shadow-sm space-y-3.5">
                          <h3 className="text-xs font-black text-slate-800 flex items-center gap-1.5">
                            <Smartphone className="w-4 h-4 text-indigo-500" />
                            {locale === "zh-CN" ? "应用版本" :
                             locale === "zh-TW" ? "應用版本" :
                             "App Version"}
                          </h3>

                          <div className="divide-y divide-slate-100 text-xs">
                            {/* App Update Item */}
                            <div className="py-2 flex items-center justify-between">
                              <div className="space-y-0.5 text-left">
                                <span className="text-[11px] text-slate-500 font-bold block">
                                  {locale === "zh-CN" ? "当前版本 v2.4.6" :
                                   locale === "zh-TW" ? "當前版本 v2.4.6" :
                                   "Current Version v2.4.6"}
                                </span>
                              </div>
                              <button
                                type="button"
                                disabled={isCheckingUpdate}
                                onClick={() => {
                                  setIsCheckingUpdate(true);
                                  setTimeout(() => {
                                    setIsCheckingUpdate(false);
                                    addToast(
                                      locale === "zh-CN" ? "🎉 检测完成：当前已是最新版本 (v2.4.6)！" :
                                      locale === "zh-TW" ? "🎉 檢測完成：當前已是最新版本 (v2.4.6)！" :
                                      "🎉 Check complete: You are already using the latest version (v2.4.6)!"
                                    );
                                  }, 1500);
                                }}
                                className="px-2.5 py-1.5 border border-slate-200 hover:border-slate-300 bg-slate-50 hover:bg-slate-100 rounded-lg text-[10px] font-bold text-slate-700 flex items-center gap-1 cursor-pointer transition shrink-0"
                              >
                                {isCheckingUpdate ? (
                                  <>
                                    <RefreshCw className="w-3 h-3 text-slate-500 animate-spin" />
                                    <span>
                                      {locale === "zh-CN" ? "检测中..." :
                                       locale === "zh-TW" ? "檢測中..." :
                                       "Checking..."}
                                    </span>
                                  </>
                                ) : (
                                  <>
                                    <RefreshCw className="w-3 h-3 text-slate-500" />
                                    <span>
                                      {locale === "zh-CN" ? "检测更新" :
                                       locale === "zh-TW" ? "檢測更新" :
                                       "Check Update"}
                                    </span>
                                  </>
                                )}
                              </button>
                            </div>

                          </div>
                        </div>

                        {/* Standalone Logout Card */}
                        <button
                          type="button"
                          onClick={() => {
                            setCurrentUser(null);
                            addToast(
                              locale === "zh-CN" ? "已安全退出当前员工账号" :
                              locale === "zh-TW" ? "已安全退出當前員工帳號" :
                              "Successfully logged out from current account"
                            );
                          }}
                          className="w-full bg-white hover:bg-rose-50/20 active:bg-rose-100/30 border border-rose-100/60 py-3.5 rounded-xl shadow-sm text-xs font-black text-rose-600 flex items-center justify-center gap-2 cursor-pointer transition active:scale-[0.985] group animate-in fade-in slide-in-from-bottom-2 duration-300"
                        >
                          <LogOut className="w-4 h-4 text-rose-500 group-hover:scale-110 transition-transform" />
                          <span>
                            {locale === "zh-CN" ? "安全退出当前账号" :
                             locale === "zh-TW" ? "安全退出當前帳號" :
                             "Secure Sign Out"}
                          </span>
                        </button>

                      </div>
                    )}

                    {activeMobileTab === "expense" && (
                      selectedExpense ? (
                        <div className="space-y-4 text-left animate-fade-in">
                          {/* Reimbursement Detail Panel */}
                          <div className="bg-white p-4.5 rounded-xl shadow-sm space-y-4">


                            {/* Title (审核进度) and Status */}
                            <div className="flex items-center justify-between py-1 bg-slate-50/50 px-2 rounded-lg border border-slate-100">
                              <h3 className="text-xs font-black text-slate-800 flex items-center gap-1.5 leading-none">
                                <Coins className="w-4 h-4 text-emerald-500" />
                                <span>审核进度</span>
                              </h3>
                              <div className="flex items-center leading-none">
                                {selectedExpense.status === "approved" && (
                                  <span className="bg-emerald-50 text-emerald-600 border border-emerald-100 text-[9px] px-2 py-0.5 rounded-md font-bold inline-flex items-center leading-none">
                                    {t("reim_approved")}
                                  </span>
                                )}
                                {selectedExpense.status === "pending" && (
                                  <span className="bg-amber-50 text-amber-600 border border-amber-100 text-[9px] px-2 py-0.5 rounded-md font-bold animate-pulse inline-flex items-center leading-none">
                                    {t("reim_pending")}
                                  </span>
                                )}
                                {selectedExpense.status === "rejected" && (
                                  <span className="bg-rose-50 text-rose-600 border border-rose-100 text-[9px] px-2 py-0.5 rounded-md font-bold inline-flex items-center leading-none">
                                    {t("reim_rejected")}
                                  </span>
                                )}
                                {selectedExpense.status === "recalled" && (
                                  <span className="bg-slate-100 text-slate-500 border border-slate-200 text-[9px] px-2 py-0.5 rounded-md font-bold inline-flex items-center leading-none">
                                    {locale === "zh-CN" ? "已撤回" : locale === "zh-TW" ? "已撤回" : "Recalled"}
                                  </span>
                                )}
                              </div>
                            </div>

                            {/* Visual Timeline Section */}
                            {(() => {
                              const isIncome = selectedExpense.purpose === 'income';
                              const flowConfig = isIncome ? approvalFlowConfig.income : approvalFlowConfig.payout;
                              const steps = flowConfig?.enabled ? flowConfig.steps : ["提交申请", "主管审批", "财务审核", "完成"];
                              
                              // Determine current status step index
                              let currentStepIndex = 1; // Default to second step (主管审批) being active for pending
                              if (selectedExpense.status === 'approved') {
                                currentStepIndex = steps.length; // All steps completed
                              } else if (selectedExpense.status === 'recalled') {
                                currentStepIndex = 0; // Recalled at submission
                              } else if (selectedExpense.status === 'rejected') {
                                currentStepIndex = 1; // Rejected at approval stage
                              }

                              return (
                                <div className="bg-slate-50/50 p-3 rounded-xl border border-slate-100 space-y-3">
                                  <div className="text-[10px] text-slate-400 font-extrabold uppercase tracking-wider">审批环节流水</div>
                                  <div className="relative pl-4 border-l border-slate-200 space-y-4">
                                    {steps.map((step, sIdx) => {
                                      // Determine step state
                                      let stepState: 'completed' | 'active' | 'rejected' | 'recalled' | 'waiting' = 'waiting';
                                      
                                      if (selectedExpense.status === 'approved') {
                                        stepState = 'completed';
                                      } else if (selectedExpense.status === 'recalled') {
                                        if (sIdx === 0) stepState = 'recalled';
                                        else stepState = 'waiting';
                                      } else if (selectedExpense.status === 'rejected') {
                                        if (sIdx < 1) stepState = 'completed';
                                        else if (sIdx === 1) stepState = 'rejected';
                                        else stepState = 'waiting';
                                      } else { // pending
                                        if (sIdx < currentStepIndex) stepState = 'completed';
                                        else if (sIdx === currentStepIndex) stepState = 'active';
                                        else stepState = 'waiting';
                                      }

                                      return (
                                        <div key={sIdx} className="relative">
                                          {/* Step Node Marker Indicator */}
                                          <div className={`absolute -left-[22.5px] top-0.5 w-3 h-3 rounded-full flex items-center justify-center border bg-white
                                            ${stepState === 'completed' ? 'border-emerald-500 bg-emerald-500 text-white' : ''}
                                            ${stepState === 'active' ? 'border-amber-500 bg-white' : ''}
                                            ${stepState === 'rejected' ? 'border-rose-500 bg-rose-500 text-white' : ''}
                                            ${stepState === 'recalled' ? 'border-slate-400 bg-slate-400 text-white' : ''}
                                            ${stepState === 'waiting' ? 'border-slate-200 bg-white' : ''}
                                          `}>
                                            {stepState === 'completed' && <span className="block w-1 h-1 bg-white rounded-full"></span>}
                                            {stepState === 'active' && <span className="block w-1.5 h-1.5 bg-amber-500 rounded-full animate-ping"></span>}
                                            {stepState === 'rejected' && <span className="text-[7px] font-black leading-none">×</span>}
                                            {stepState === 'recalled' && <span className="text-[7px] font-black leading-none">↩</span>}
                                            {stepState === 'waiting' && <span className="block w-1 h-1 bg-slate-200 rounded-full"></span>}
                                          </div>

                                          {/* Step Info Content */}
                                          <div className="flex flex-col gap-0.5 text-[11px]">
                                            <div className="flex justify-between items-center gap-2">
                                              <span className={`font-bold
                                                ${stepState === 'completed' ? 'text-emerald-700' : ''}
                                                ${stepState === 'active' ? 'text-amber-700' : ''}
                                                ${stepState === 'rejected' ? 'text-rose-700' : ''}
                                                ${stepState === 'recalled' ? 'text-slate-500' : ''}
                                                ${stepState === 'waiting' ? 'text-slate-400' : ''}
                                              `}>
                                                {step}
                                              </span>
                                              
                                              {/* Timestamp or Actor */}
                                              {sIdx === 0 && (
                                                <span className="text-[9px] text-slate-400 font-mono">
                                                  {selectedExpense.paymentTime}
                                                </span>
                                              )}
                                              {sIdx === steps.length - 1 && selectedExpense.status === 'approved' && (
                                                <span className="text-[9px] text-slate-400 font-mono">
                                                  {selectedExpense.approvedTime || selectedExpense.paymentTime}
                                                </span>
                                              )}
                                            </div>

                                            {/* Explanatory subtexts */}
                                            {stepState === 'active' && (
                                              <p className="text-[9px] text-amber-600 font-semibold leading-relaxed">
                                                正在等待 {selectedExpense.targetApproverName || "管理员"} 进行审核评估...
                                              </p>
                                            )}
                                            {stepState === 'rejected' && (
                                              <div className="bg-rose-50/50 p-1.5 border border-rose-100 rounded mt-1 space-y-0.5">
                                                <p className="text-[9px] text-rose-700 font-bold">审批驳回意见</p>
                                                <p className="text-[9px] text-rose-600 font-semibold">
                                                  审批人：{selectedExpense.approvedBy || "系统管理员"}
                                                </p>
                                                <p className="text-[9px] text-rose-500 italic leading-relaxed">
                                                  “{selectedExpense.approvalNote || "无驳回备注说明"}”
                                                </p>
                                              </div>
                                            )}
                                            {stepState === 'completed' && sIdx === steps.length - 1 && (
                                              <div className="bg-emerald-50/50 p-1.5 border border-emerald-100 rounded mt-1 space-y-0.5">
                                                <p className="text-[9px] text-emerald-700 font-bold">审批通过意见</p>
                                                <p className="text-[9px] text-emerald-600 font-semibold">
                                                  审批人：{selectedExpense.approvedBy || "系统管理员"}
                                                </p>
                                                {selectedExpense.approvalNote && (
                                                  <p className="text-[9px] text-emerald-500 italic leading-relaxed">
                                                    “{selectedExpense.approvalNote}”
                                                  </p>
                                                )}
                                              </div>
                                            )}
                                            {stepState === 'recalled' && (
                                              <p className="text-[9px] text-slate-500 font-medium italic">
                                                员工已撤回该报销申请
                                              </p>
                                            )}
                                          </div>
                                        </div>
                                      );
                                    })}
                                  </div>
                                </div>
                              );
                            })()}

                            {/* Info Fields Grid */}
                            <div className="space-y-3 text-xs">
                              <div className="flex justify-between items-center py-1.5 border-b border-slate-50">
                                <span className="text-slate-400 font-bold">{locale === "zh-CN" ? "费用名称" : "Expense Name"}</span>
                                <span className="text-slate-800 font-black">{selectedExpense.name}</span>
                              </div>
                              <div className="flex justify-between items-center py-1.5 border-b border-slate-50">
                                <span className="text-slate-400 font-bold">{locale === "zh-CN" ? "费用类别" : "Category"}</span>
                                <span className="text-[10px] bg-slate-100 text-slate-700 px-2 py-0.5 rounded font-black">
                                  {getExpenseTypeLabel(selectedExpense.type)}
                                </span>
                              </div>
                              <div className="flex justify-between items-center py-1.5 border-b border-slate-50">
                                <span className="text-slate-400 font-bold">{locale === "zh-CN" ? "报销金额" : "Amount"}</span>
                                <span className="text-slate-800 font-black font-mono">
                                  {selectedExpense.currency === "USD" ? "$" : selectedExpense.currency === "THB" ? "฿" : selectedExpense.currency === "MYR" ? "RM" : selectedExpense.currency === "IDR" ? "Rp" : selectedExpense.currency === "PHP" ? "₱" : selectedExpense.currency === "VND" ? "₫" : "￥"}
                                  {selectedExpense.amount.toLocaleString()}
                                </span>
                              </div>
                              <div className="flex justify-between items-center py-1.5 border-b border-slate-50">
                                <span className="text-slate-400 font-bold">{locale === "zh-CN" ? "提报时间" : "Submission Time"}</span>
                                <span className="text-slate-600 font-semibold">{selectedExpense.paymentTime}</span>
                              </div>
                              <div className="flex justify-between items-start py-1.5 border-b border-slate-50 gap-4">
                                <span className="text-slate-400 font-bold shrink-0">{locale === "zh-CN" ? "申报备注" : "Note"}</span>
                                <span className="text-slate-600 font-semibold text-right break-words max-w-[200px]">
                                  {selectedExpense.note || "-"}
                                </span>
                              </div>
                              
                              {/* Receipt Attachment preview */}
                              <div className="space-y-1.5 pt-2">
                                <span className="text-slate-400 font-bold block">{locale === "zh-CN" ? "报销凭证" : "Receipt"}</span>
                                {selectedExpense.receiptUrl ? (
                                  <div className="relative rounded-xl overflow-hidden border border-slate-200 bg-slate-50 max-h-48 flex items-center justify-center">
                                    <img 
                                      src={selectedExpense.receiptUrl} 
                                      className="max-h-48 object-contain" 
                                      alt="Receipt" 
                                      referrerPolicy="no-referrer"
                                    />
                                  </div>
                                ) : (
                                  <div className="p-4 border border-dashed border-slate-200 rounded-xl text-center text-[10px] text-slate-400 font-bold">
                                    {locale === "zh-CN" ? "无报销凭证图片" : "No receipt image"}
                                  </div>
                                )}
                              </div>
                            </div>

                            {/* Operations for Pending/Recalled status */}
                            {(selectedExpense.status === "pending" || selectedExpense.status === "recalled") && (
                              <div className="pt-4 border-t border-slate-100 flex flex-col gap-2">
                                <div className="grid grid-cols-2 gap-2">
                                  {selectedExpense.status === "pending" && (
                                    <button
                                      type="button"
                                      onClick={() => setShowExpenseActionConfirm({ type: 'recall', expense: selectedExpense })}
                                      className="flex-1 py-2 bg-amber-50 hover:bg-amber-100 border border-amber-200 text-amber-700 rounded-lg text-[10px] font-black flex items-center justify-center gap-1 cursor-pointer transition shadow-3xs"
                                    >
                                      {locale === "zh-CN" ? "撤回报销" : "Recall"}
                                    </button>
                                  )}
                                  <button
                                    type="button"
                                    onClick={() => setShowExpenseActionConfirm({ type: 'edit', expense: selectedExpense })}
                                    className="flex-1 py-2 bg-brand-50 hover:bg-brand-100 border border-brand-200 text-brand-700 rounded-lg text-[10px] font-black flex items-center justify-center gap-1 cursor-pointer transition shadow-3xs"
                                  >
                                    {locale === "zh-CN" ? "重新编辑" : "Edit"}
                                  </button>
                                </div>
                                <button
                                  type="button"
                                  onClick={() => setShowExpenseActionConfirm({ type: 'delete', expense: selectedExpense })}
                                  className="w-full py-2 bg-rose-50 hover:bg-rose-100 border border-rose-200 text-rose-600 rounded-lg text-[10px] font-black flex items-center justify-center gap-1 cursor-pointer transition shadow-3xs"
                                >
                                  {locale === "zh-CN" ? "删除报销单" : "Delete"}
                                </button>
                              </div>
                            )}
                          </div>
                        </div>
                      ) : (
                        <div className="space-y-4 text-left animate-fade-in">
                          {/* Reimbursement expenses section */}
                          <div className="bg-white p-4.5 rounded-xl shadow-sm space-y-3">
                            <div className="flex items-center justify-between">
                              <h3 className="text-xs font-black text-slate-800 flex items-center gap-1.5">
                                <Coins className="w-4 h-4 text-emerald-500" />
                                {t("reim_title")}
                              </h3>
                              <button
                                type="button"
                                onClick={() => {
                                  setActiveMobileTab("add_expense");
                                }}
                                className="px-2 py-1 bg-brand-600 hover:bg-brand-700 text-white rounded-lg text-[10px] font-bold flex items-center gap-1 cursor-pointer transition shadow-3xs"
                              >
                                <Plus className="w-3 h-3" />
                                {t("reim_add")}
                              </button>
                            </div>

                            <p className="text-[10px] text-slate-400 font-semibold leading-relaxed">
                              {t("reim_desc")}
                            </p>
                          </div>

                          {/* Historical reimbursement logs */}
                          <div className="bg-white p-4.5 rounded-xl shadow-sm space-y-3.5 text-left">
                            <h4 className="text-[11px] font-black text-slate-700 flex items-center gap-1.5 pb-2.5 border-b border-slate-100">
                              <span className="w-1.5 h-3 bg-brand-500 rounded-full"></span>
                              {t("reim_history")}
                            </h4>
                            
                            <div className="space-y-2.5">
                              {userExpenses.length === 0 ? (
                                <p className="text-[10px] text-slate-400 font-bold text-center py-4">{t("reim_none")}</p>
                              ) : (
                                userExpenses.map(exp => (
                                  <div
                                    key={exp.id}
                                    onClick={() => setSelectedExpense(exp)}
                                    className="bg-slate-50 hover:bg-slate-100 hover:border-brand-200 cursor-pointer p-3 rounded-xl border border-slate-100 flex flex-col gap-2 transition shadow-3xs hover:shadow-2xs"
                                  >
                                    {/* Top Row: Title/Name & Status */}
                                    <div className="flex items-center justify-between gap-2">
                                      <h4 className="text-[11px] font-extrabold text-slate-800 truncate flex-1 text-left">
                                        {exp.name}
                                      </h4>
                                      <div className="shrink-0">
                                        {exp.status === "approved" && (
                                          <span className="bg-emerald-50 text-emerald-600 border border-emerald-100 text-[8px] px-1.5 py-0.5 rounded-md font-bold">
                                            {t("reim_approved")}
                                          </span>
                                        )}
                                        {exp.status === "pending" && (
                                          <span className="bg-amber-50 text-amber-600 border border-amber-100 text-[8px] px-1.5 py-0.5 rounded-md font-bold animate-pulse">
                                            {t("reim_pending")}
                                          </span>
                                        )}
                                        {exp.status === "rejected" && (
                                          <span className="bg-rose-50 text-rose-600 border border-rose-100 text-[8px] px-1.5 py-0.5 rounded-md font-bold">
                                            {t("reim_rejected")}
                                          </span>
                                        )}
                                        {exp.status === "recalled" && (
                                          <span className="bg-slate-100 text-slate-500 border border-slate-200 text-[8px] px-1.5 py-0.5 rounded-md font-bold">
                                            {locale === "zh-CN" ? "已撤回" : locale === "zh-TW" ? "已撤回" : "Recalled"}
                                          </span>
                                        )}
                                      </div>
                                    </div>

                                    {/* Middle Row: Expense Category & Amount */}
                                    <div className="flex items-center justify-between text-[10px] font-extrabold text-slate-500 pt-0.5 pb-1 border-b border-slate-200/50">
                                      <span className="text-[8px] bg-slate-200 text-slate-600 px-1.5 py-0.5 rounded font-bold">
                                        {getExpenseTypeLabel(exp.type)}
                                      </span>
                                      <span className="text-[11px] font-black font-mono text-slate-800">
                                        {exp.currency === "USD" ? "$" : exp.currency === "THB" ? "฿" : exp.currency === "MYR" ? "RM" : exp.currency === "IDR" ? "Rp" : exp.currency === "PHP" ? "₱" : exp.currency === "VND" ? "₫" : "￥"}
                                        {exp.amount.toLocaleString()}
                                      </span>
                                    </div>

                                    {/* Bottom Row: Time and Note */}
                                    <div className="flex items-center justify-between text-[9px] text-slate-400 font-semibold pt-1">
                                      <div className="flex items-center gap-1">
                                        <Clock className="w-3 h-3 text-slate-300" />
                                        <span>{exp.paymentTime}</span>
                                      </div>
                                      {exp.note && (
                                        <span className="text-[8px] text-slate-400 max-w-[120px] truncate" title={exp.note}>
                                          {exp.note}
                                        </span>
                                      )}
                                    </div>
                                  </div>
                                ))
                              )}
                            </div>
                          </div>
                        </div>
                      )
                    )}

                    {activeMobileTab === "add_expense" && (
                      <div className="space-y-4 text-left animate-fade-in">
                        <div className="bg-white p-4.5 rounded-xl shadow-sm space-y-4">
                          <form onSubmit={handleSubmitExpense} className="space-y-4">
                            <div className="space-y-3.5 text-xs">
                              <div>
                                <label className="block text-[10px] font-bold text-slate-500 mb-1">
                                  {locale === "zh-CN" ? "费用名称 *" : locale === "zh-TW" ? "費用名稱 *" : t("reim_name_label")}
                                </label>
                                <input 
                                  type="text"
                                  required
                                  value={newExpName}
                                  onChange={(e) => setNewExpName(e.target.value)}
                                  placeholder={t("reim_name_placeholder")}
                                  className="w-full px-3 py-2 border border-slate-200 rounded-xl text-slate-700 bg-slate-50 outline-none text-xs font-semibold focus:border-brand-500 focus:bg-white transition"
                                />
                              </div>

                              <div className="grid grid-cols-2 gap-3">
                                <div>
                                  <label className="block text-[10px] font-bold text-slate-500 mb-1">
                                    {locale === "zh-CN" ? "单据类型" : locale === "zh-TW" ? "單據類型" : "Document Type"}
                                  </label>
                                  <div className="grid grid-cols-2 gap-1 bg-slate-100 p-0.5 rounded-xl">
                                    <button
                                      type="button"
                                      onClick={() => setExpPurpose("payout")}
                                      className={`py-1.5 rounded-lg text-[10px] font-black transition text-center cursor-pointer ${
                                        expPurpose === "payout"
                                          ? "bg-white text-brand-600 shadow-3xs"
                                          : "text-slate-500 hover:text-slate-800"
                                      }`}
                                    >
                                      {locale === "zh-CN" ? "支出" : locale === "zh-TW" ? "支出" : "Payout"}
                                    </button>
                                    <button
                                      type="button"
                                      onClick={() => setExpPurpose("income")}
                                      className={`py-1.5 rounded-lg text-[10px] font-black transition text-center cursor-pointer ${
                                        expPurpose === "income"
                                          ? "bg-white text-emerald-600 shadow-3xs"
                                          : "text-slate-500 hover:text-slate-800"
                                      }`}
                                    >
                                      {locale === "zh-CN" ? "收入" : locale === "zh-TW" ? "收入" : "Income"}
                                    </button>
                                  </div>
                                </div>

                                <div>
                                  <label className="block text-[10px] font-bold text-slate-500 mb-1">{t("reim_type_label")}</label>
                                  <select
                                    value={newExpType}
                                    onChange={(e) => setNewExpType(e.target.value)}
                                    className="w-full px-3 py-2 border border-slate-200 rounded-xl text-slate-700 bg-slate-50 outline-none text-xs font-semibold focus:border-brand-500 focus:bg-white transition cursor-pointer"
                                  >
                                    <option value="物耗杂费">{t("expense_supplies")}</option>
                                    <option value="设备维护费">{t("expense_maintenance")}</option>
                                    <option value="水电动力费">{t("expense_utilities")}</option>
                                    <option value="差旅补贴">{t("expense_travel")}</option>
                                  </select>
                                </div>
                              </div>

                              <div className="grid grid-cols-2 gap-3">
                                <div>
                                  <label className="block text-[10px] font-bold text-slate-500 mb-1">{t("reim_currency_label")}</label>
                                  <select
                                    value={newExpCurrency}
                                    onChange={(e) => setNewExpCurrency(e.target.value)}
                                    className="w-full px-3 py-2 border border-slate-200 rounded-xl text-slate-700 bg-slate-50 outline-none text-xs font-semibold focus:border-brand-500 focus:bg-white transition cursor-pointer"
                                  >
                                    <option value="CNY">{locale === "zh-CN" ? "人民币 (￥)" : locale === "zh-TW" ? "人民幣 (￥)" : "CNY (￥)"}</option>
                                    <option value="THB">{locale === "zh-CN" ? "泰铢 (฿)" : locale === "zh-TW" ? "泰銖 (฿)" : "THB (฿)"}</option>
                                    <option value="USD">{locale === "zh-CN" ? "美元 ($)" : locale === "zh-TW" ? "美元 ($)" : "USD ($)"}</option>
                                    <option value="MYR">{locale === "zh-CN" ? "马币 (RM)" : locale === "zh-TW" ? "馬幣 (RM)" : "MYR (RM)"}</option>
                                    <option value="IDR">{locale === "zh-CN" ? "印尼盾 (Rp)" : locale === "zh-TW" ? "印尼盾 (Rp)" : "IDR (Rp)"}</option>
                                    <option value="PHP">{locale === "zh-CN" ? "菲律宾币 (₱)" : locale === "zh-TW" ? "菲律賓幣 (₱)" : "PHP (₱)"}</option>
                                    <option value="VND">{locale === "zh-CN" ? "越南盾 (₫)" : locale === "zh-TW" ? "越南盾 (₫)" : "VND (₫)"}</option>
                                  </select>
                                </div>

                                <div>
                                  <label className="block text-[10px] font-bold text-slate-500 mb-1">{t("reim_amount_label")}</label>
                                  <input 
                                    type="number"
                                    required
                                    value={newExpAmount}
                                    onChange={(e) => setNewExpAmount(e.target.value)}
                                    placeholder={t("reim_amount_placeholder")}
                                    className="w-full px-3 py-2 border border-slate-200 rounded-xl text-slate-700 bg-slate-50 outline-none text-xs font-semibold focus:border-brand-500 focus:bg-white transition"
                                  />
                                </div>
                              </div>

                              <div>
                                <label className="block text-[10px] font-bold text-slate-500 mb-1">{t("reim_receipt_label")} *</label>
                                <input 
                                  type="file"
                                  ref={fileInputRef}
                                  accept="image/*"
                                  className="hidden"
                                  onChange={handleFileChange}
                                />
                                <div className="grid grid-cols-2 gap-2.5">
                                  <button
                                    type="button"
                                    onClick={() => fileInputRef.current?.click()}
                                    className="flex items-center justify-center gap-1.5 p-2 border border-dashed border-slate-250 hover:border-brand-500 hover:bg-brand-50/20 bg-slate-50 rounded-xl text-slate-600 text-[10px] font-black transition cursor-pointer"
                                  >
                                    <Camera className="w-3.5 h-3.5 text-slate-400" />
                                    <span>{locale === "zh-CN" ? "拍照上传" : locale === "zh-TW" ? "拍照上傳" : "Take Photo"}</span>
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => fileInputRef.current?.click()}
                                    className="flex items-center justify-center gap-1.5 p-2 border border-dashed border-slate-250 hover:border-brand-500 hover:bg-brand-50/20 bg-slate-50 rounded-xl text-slate-600 text-[10px] font-black transition cursor-pointer"
                                  >
                                    <Upload className="w-3.5 h-3.5 text-slate-400" />
                                    <span>{locale === "zh-CN" ? "从相册选择" : locale === "zh-TW" ? "從相冊選擇" : "Choose Album"}</span>
                                  </button>
                                </div>

                                {uploadedReceipt && (
                                  <div className="mt-2.5 p-2 bg-slate-50 border border-slate-100 rounded-xl flex items-center justify-between gap-2.5">
                                    <div className="flex items-center gap-2 min-w-0">
                                      <div className="w-10 h-10 rounded-lg overflow-hidden border border-slate-200 bg-white shrink-0">
                                        <img src={uploadedReceipt} className="w-full h-full object-cover" alt="Receipt preview" referrerPolicy="no-referrer" />
                                      </div>
                                      <span className="text-[9px] text-slate-550 font-bold truncate max-w-[120px]">
                                        {uploadedReceiptName}
                                      </span>
                                    </div>
                                    <button
                                      type="button"
                                      onClick={() => {
                                        setUploadedReceipt(null);
                                        setUploadedReceiptName("");
                                        if (fileInputRef.current) fileInputRef.current.value = "";
                                      }}
                                      className="p-1 hover:bg-rose-50 text-rose-500 rounded-lg transition cursor-pointer shrink-0"
                                    >
                                      <X className="w-3.5 h-3.5" />
                                    </button>
                                  </div>
                                )}
                              </div>

                              <div>
                                <label className="block text-[10px] font-bold text-slate-500 mb-1">{t("reim_note_label")}</label>
                                <textarea 
                                  value={newExpNote}
                                  onChange={(e) => setNewExpNote(e.target.value)}
                                  placeholder={t("reim_note_placeholder")}
                                  rows={3}
                                  className="w-full px-3 py-2 border border-slate-200 rounded-xl text-slate-700 bg-slate-50 outline-none text-xs font-semibold focus:border-brand-500 focus:bg-white transition resize-none"
                                />
                              </div>

                              <div className="flex gap-2.5 pt-2">
                                <button
                                  type="button"
                                  onClick={checkCancelWithConfirm}
                                  className="flex-1 py-2.5 border border-slate-200 text-slate-600 hover:bg-slate-50 rounded-xl text-xs font-extrabold transition text-center cursor-pointer"
                                >
                                  {t("reim_cancel")}
                                </button>
                                <button
                                  type="submit"
                                  className="flex-1 py-2.5 bg-brand-600 hover:bg-brand-700 text-white rounded-xl text-xs font-black transition shadow-3xs flex items-center justify-center gap-1 cursor-pointer"
                                >
                                  <Send className="w-3.5 h-3.5" /> 
                                  {editingExpenseId 
                                    ? (locale === "zh-CN" ? "保存并重新提交" : locale === "zh-TW" ? "保存並重新提交" : "Save & Resubmit")
                                    : t("reim_submit")}
                                </button>
                              </div>
                            </div>
                          </form>
                        </div>
                      </div>
                    )}

                    {activeMobileTab === "payslip" && currentUser && (
                      <div className="space-y-4 text-left animate-scale-up relative">
                        {showConfetti && <ConfettiRain />}
                        {/* Hidden Beautiful A4 printable container for high-fidelity PDF export */}
                        <div style={{ position: "fixed", top: 0, left: 0, width: "794px", zIndex: -50, opacity: 0, pointerEvents: "none" }}>
                          <div 
                            ref={payslipPrintRef} 
                            className="bg-white text-slate-800 p-10 font-sans border-2 border-slate-200"
                            style={{ width: "794px", minHeight: "1123px" }} // A4 paper size at 96 DPI
                          >
                            {/* Beautiful Header */}
                            <div className="flex justify-between items-start border-b-2 border-brand-600 pb-6 mb-8">
                              <div>
                                <div className="flex items-center gap-2 mb-2">
                                  <div className="w-9 h-9 rounded-xl bg-brand-600 text-white flex items-center justify-center font-black text-sm">
                                    W
                                  </div>
                                  <div>
                                    <h1 className="text-lg font-black text-slate-900 tracking-wider">WMS SMART HR TERMINAL</h1>
                                    <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">Enterprise Class Cloud Management</p>
                                  </div>
                                </div>
                                <p className="text-xs font-semibold text-slate-500">Official Electronic Receipt & Verification</p>
                              </div>
                              <div className="text-right">
                                <span className="inline-block bg-brand-50 text-brand-700 text-[10px] font-black px-3 py-1 rounded-full uppercase tracking-wider mb-2 border border-brand-200/50">
                                  CONFIDENTIAL PAYSLIP / 绝密薪资单
                                </span>
                                <h2 className="text-xl font-black text-brand-600 tracking-tight">{formattedMonthStr} 电子薪资单</h2>
                                <p className="text-[10px] font-mono text-slate-400 mt-1">REF: WMS-PAY-{currentMonthStr}-{currentUser?.id}</p>
                              </div>
                            </div>

                            {/* Employee Details Grid */}
                            <div className="bg-slate-50/75 rounded-2xl p-6 border border-slate-100 mb-8">
                              <h3 className="text-xs font-black text-slate-400 uppercase tracking-wider mb-4 pb-2 border-b border-slate-200/60 flex items-center gap-1.5">
                                <User className="w-4 h-4 text-brand-500" />
                                Employee Profile / 员工基本信息
                              </h3>
                              <div className="grid grid-cols-2 gap-y-4 gap-x-8 text-xs font-medium text-slate-600">
                                <div className="flex justify-between items-center border-b border-dashed border-slate-200 pb-1.5">
                                  <span className="text-slate-400 font-bold">Full Name (姓名):</span>
                                  <span className="text-slate-800 font-extrabold">{currentUser?.name}</span>
                                </div>
                                <div className="flex justify-between items-center border-b border-dashed border-slate-200 pb-1.5">
                                  <span className="text-slate-400 font-bold">Employee ID (工号):</span>
                                  <span className="text-slate-800 font-bold font-mono">#{currentUser?.id}</span>
                                </div>
                                <div className="flex justify-between items-center border-b border-dashed border-slate-200 pb-1.5">
                                  <span className="text-slate-400 font-bold">Department (部门):</span>
                                  <span className="text-slate-800 font-bold">{currentUser && getDeptLabel(currentUser.dept)}</span>
                                </div>
                                <div className="flex justify-between items-center border-b border-dashed border-slate-200 pb-1.5">
                                  <span className="text-slate-400 font-bold">Role (岗位):</span>
                                  <span className="text-slate-800 font-bold">{currentUser && getRoleLabel(currentUser.role)}</span>
                                </div>
                                <div className="flex justify-between items-center border-b border-dashed border-slate-200 pb-1.5">
                                  <span className="text-slate-400 font-bold">Nationality (国籍/外籍):</span>
                                  <span className="text-slate-800 font-bold">{currentUser && getCountryName(currentUser.nationality)}</span>
                                </div>
                                <div className="flex justify-between items-center border-b border-dashed border-slate-200 pb-1.5">
                                  <span className="text-slate-400 font-bold">Payout Currency (发放币种):</span>
                                  <span className="text-slate-850 font-black font-mono">{currentUser?.currency}</span>
                                </div>
                              </div>
                            </div>

                            {/* Attendance Accounting Table */}
                            <div className="bg-white rounded-2xl border border-slate-150 p-6 mb-8 space-y-3 text-left">
                              <h3 className="text-xs font-black text-slate-400 uppercase tracking-wider pb-2 border-b border-slate-200/60 flex items-center gap-1.5">
                                <Clock className="w-4 h-4 text-amber-500" />
                                {locale === "zh-CN" ? "出勤与工时核算" : locale === "zh-TW" ? "出勤與工時核算" : "Attendance & Hours Calculation"}
                              </h3>
                              <div className="grid grid-cols-2 gap-4 text-xs bg-slate-50 p-4 rounded-xl border border-slate-100 font-mono">
                                <div className="flex justify-between items-center border-b border-slate-100 pb-2">
                                  <span className="text-slate-500">{locale === "zh-CN" ? "标准计薪时限 (每日):" : locale === "zh-TW" ? "標準計薪時限 (每日):" : "Standard Daily Limit:"}</span>
                                  <span className="font-semibold text-slate-800">{config.standardHours} 小时/天</span>
                                </div>
                                <div className="flex justify-between items-center border-b border-slate-100 pb-2">
                                  <span className="text-slate-500">{locale === "zh-CN" ? "有效上班天数:" : locale === "zh-TW" ? "有效上班天數:" : "Effective Working Days:"}</span>
                                  <span className="font-bold text-slate-800">{monthlySummary?.workingDays ?? 0} 天</span>
                                </div>
                                <div className="flex justify-between items-center pt-1">
                                  <span className="text-slate-500">{locale === "zh-CN" ? "累计上班工时:" : locale === "zh-TW" ? "累計上班工時:" : "Total Work Hours:"}</span>
                                  <span className="font-semibold text-slate-800">{monthlySummary ? formatDuration(monthlySummary.valid) : "0.00h"}</span>
                                </div>
                                <div className="flex justify-between items-center pt-1">
                                  <span className="text-slate-500">{locale === "zh-CN" ? "有效加班工时:" : locale === "zh-TW" ? "有效加班工時:" : "Effective Overtime:"}</span>
                                  <span className="font-bold text-blue-600">
                                    {monthlySummary ? formatDuration(monthlySummary.ot) : "0.00h"} {monthlySummary?.otCount !== undefined && monthlySummary.otCount > 0 ? ` (${monthlySummary.otCount}次)` : ""}
                                  </span>
                                </div>
                              </div>
                            </div>

                            {/* Financial Detail Summary */}
                            <div className="bg-white rounded-2xl border border-slate-150 p-6 mb-8 space-y-3 text-left">
                              <h3 className="text-xs font-black text-slate-400 uppercase tracking-wider pb-2 border-b border-slate-200/60 flex items-center gap-1.5">
                                <Coins className="w-4 h-4 text-brand-500" />
                                {locale === "zh-CN" ? "应纳发计算说明" : locale === "zh-TW" ? "應納發計算說明" : "Earnings & Deductions Calculation Details"}
                              </h3>
                              <div className="bg-slate-50 border border-slate-100 rounded-xl p-4 space-y-3 text-xs text-slate-600 font-mono">
                                {currentUser?.baseMonthlyWage !== undefined && currentUser.baseMonthlyWage !== null && currentUser.baseMonthlyWage > 0 && (
                                  <div className="flex justify-between items-center border-b border-slate-200/50 pb-2">
                                    <span className="text-slate-500 font-medium">
                                      {locale === "zh-CN" ? "基础工资 (月薪计):" : locale === "zh-TW" ? "基礎工資 (月薪計):" : "Base Salary (Monthly):"}
                                    </span>
                                    <span className="text-slate-700 font-bold">
                                      {formatCurrency(currentUser.baseMonthlyWage, currentUser.currency)} /月
                                    </span>
                                  </div>
                                )}
                                
                                <div className="flex justify-between items-center">
                                  <span className="text-slate-500 font-medium">
                                    {locale === "zh-CN" ? (
                                      currentUser?.baseMonthlyWage !== undefined && currentUser.baseMonthlyWage > 0
                                        ? `基础工资 (月薪折算/30 × ${monthlySummary?.workingDays ?? 0}天):`
                                        : currentUser?.dailyWage !== undefined && currentUser.dailyWage > 0
                                          ? `基础工资 (固定日薪 × ${monthlySummary?.workingDays ?? 0}天):`
                                          : `基础工资 (时薪计件 × ${formatDuration((monthlySummary?.valid ?? 0) - (monthlySummary?.ot ?? 0))}h):`
                                    ) : locale === "zh-TW" ? (
                                      currentUser?.baseMonthlyWage !== undefined && currentUser.baseMonthlyWage > 0
                                        ? `基礎工資 (月薪折算/30 × ${monthlySummary?.workingDays ?? 0}天):`
                                        : currentUser?.dailyWage !== undefined && currentUser.dailyWage > 0
                                          ? `基礎工資 (固定日薪 × ${monthlySummary?.workingDays ?? 0}天):`
                                          : `基礎工資 (時薪計件 × ${formatDuration((monthlySummary?.valid ?? 0) - (monthlySummary?.ot ?? 0))}h):`
                                    ) : (
                                      currentUser?.baseMonthlyWage !== undefined && currentUser.baseMonthlyWage > 0
                                        ? `Base Pay (Pro-rated/30 × ${monthlySummary?.workingDays ?? 0}d):`
                                        : currentUser?.dailyWage !== undefined && currentUser.dailyWage > 0
                                          ? `Base Pay (Fixed Daily × ${monthlySummary?.workingDays ?? 0}d):`
                                          : `Base Pay (Hourly × ${formatDuration((monthlySummary?.valid ?? 0) - (monthlySummary?.ot ?? 0))}h):`
                                    )}
                                  </span>
                                  <span className="text-slate-800 font-bold">
                                    {formatCurrency(basePay, currentUser?.currency || "THB")}
                                  </span>
                                </div>

                                <div className="flex justify-between items-center">
                                  <span className="text-slate-500 font-medium">
                                    {locale === "zh-CN"
                                      ? `加班应得 (时薪 × ${(monthlySummary?.ot ?? 0).toFixed(1)}h):`
                                      : locale === "zh-TW"
                                        ? `加班應得 (時薪 × ${(monthlySummary?.ot ?? 0).toFixed(1)}h):`
                                        : `Overtime Earnings (Hourly × ${(monthlySummary?.ot ?? 0).toFixed(1)}h):`}
                                  </span>
                                  <span className="text-green-600 font-bold">
                                    + {formatCurrency(otPay, currentUser?.currency || "THB")}
                                  </span>
                                </div>

                                {bonusPay > 0 && (
                                  <div className="flex justify-between items-center">
                                    <span className="text-slate-500 font-medium">
                                      {locale === "zh-CN" ? "全勤奖 (津贴):" : locale === "zh-TW" ? "全勤獎 (津貼):" : "Attendance Bonus (Allowance):"}
                                    </span>
                                    <span className="text-green-600 font-bold">
                                      + {formatCurrency(bonusPay, currentUser?.currency || "THB")}
                                    </span>
                                  </div>
                                )}

                                {mealAllowancePay > 0 && (
                                  <div className="flex justify-between items-center">
                                    <span className="text-slate-500 font-medium">
                                      {locale === "zh-CN" ? "餐饮费 (餐补):" : locale === "zh-TW" ? "餐飲費 (餐補):" : "Meal Allowance (Subsidy):"}
                                    </span>
                                    <span className="text-amber-600 font-bold">
                                      + {formatCurrency(mealAllowancePay, currentUser?.currency || "THB")}
                                    </span>
                                  </div>
                                )}

                                <div className="flex justify-between items-center">
                                  <span className="text-slate-500 font-medium">
                                    {locale === "zh-CN"
                                      ? `所得税代扣 (${Math.round(config.taxRate * 100)}%):`
                                      : locale === "zh-TW"
                                        ? `所得稅代扣 (${Math.round(config.taxRate * 100)}%):`
                                        : `Individual Tax Withholding (${Math.round(config.taxRate * 100)}%):`}
                                  </span>
                                  <span className="text-red-500 font-bold">
                                    - {formatCurrency(taxDeduct, currentUser?.currency || "THB")}
                                  </span>
                                </div>

                                {securityDeduct > 0 && (
                                  <div className="flex justify-between items-center">
                                    <span className="text-slate-500 font-medium">
                                      {locale === "zh-CN" ? "社保扣款:" : locale === "zh-TW" ? "社保扣款:" : "Social Security:"}
                                    </span>
                                    <span className="text-red-500 font-bold">
                                      - {formatCurrency(securityDeduct, currentUser?.currency || "THB")}
                                    </span>
                                  </div>
                                )}

                                {currentUser?.sourceType === '劳务派遣' && (
                                  <div className="flex justify-between items-center border-t border-dashed border-slate-200 pt-2 mt-2">
                                    <span className="text-teal-600 font-medium">
                                      {locale === "zh-CN" 
                                        ? `派遣抽佣 (${currentUser.dispatchCommissionRate ?? 0}% - 仅限基本薪资):` 
                                        : locale === "zh-TW" 
                                          ? `派遣抽傭 (${currentUser.dispatchCommissionRate ?? 0}% - 僅限基本薪資):` 
                                          : `Dispatch Commission (${currentUser.dispatchCommissionRate ?? 0}% - Base wage only):`}
                                    </span>
                                    <span className="text-teal-600 font-bold">
                                      + {formatCurrency(basePay * ((currentUser.dispatchCommissionRate ?? 0) / 100), currentUser?.currency || "THB")}
                                    </span>
                                  </div>
                                )}

                                {reimbursedAmount > 0 && (
                                  <div className="flex justify-between items-center border-t border-slate-200/60 pt-2 mt-2">
                                    <span className="text-slate-500 font-medium">
                                      {locale === "zh-CN" ? "实报实销费用:" : locale === "zh-TW" ? "實報實銷費用:" : "Approved Reimbursement:"}
                                    </span>
                                    <span className="text-blue-600 font-bold">
                                      + {formatCurrency(reimbursedAmount, currentUser?.currency || "THB")}
                                    </span>
                                  </div>
                                )}
                              </div>
                            </div>

                            {/* Grand Net Payout Box */}
                            <div className="bg-brand-600 rounded-3xl p-6 text-white flex justify-between items-center mb-8 shadow-sm">
                              <div className="space-y-1">
                                <h4 className="text-sm font-black tracking-widest uppercase">Net Payout Amount / 最终实发薪资</h4>
                                <p className="text-[10px] text-white/70 font-semibold">Includes basic wages, extra hourly payments, bonuses, reimbursements minus tax</p>
                              </div>
                              <div className="text-right">
                                <div className="text-3xl font-black font-mono tracking-tight text-white leading-none">
                                  {formatCurrency(netPayout, currentUser?.currency || "THB")}
                                </div>
                                <span className="inline-block bg-white/20 text-white text-[9px] font-bold px-2.5 py-0.5 rounded-full mt-2 uppercase tracking-widest">
                                  Paid / 已结清发放
                                </span>
                              </div>
                            </div>

                            {/* Digital Verification, Signature & Stamp */}
                            <div className="grid grid-cols-2 gap-8 border-t border-slate-200 pt-8 mt-4">
                              <div className="space-y-4">
                                <h4 className="text-[11px] font-black text-slate-400 uppercase tracking-wider">Corporate Audit Verification</h4>
                                <div className="flex items-start gap-3">
                                  <div className="w-10 h-10 rounded-full bg-emerald-50 text-emerald-600 border border-emerald-100 flex items-center justify-center shrink-0">
                                    <ShieldCheck className="w-6 h-6" />
                                  </div>
                                  <div className="space-y-1">
                                    <p className="text-xs font-extrabold text-slate-800">WMS Security Center Authenticated</p>
                                    <p className="text-[10px] text-slate-400 font-medium leading-relaxed">
                                      This electronic ledger payroll report is digitally audited. High-fidelity verification key matched. Secure SSL certified data delivery.
                                    </p>
                                  </div>
                                </div>
                              </div>
                              
                              <div className="flex flex-col items-end justify-between text-right">
                                <h4 className="text-[11px] font-black text-slate-400 uppercase tracking-wider mb-2">Employee Confirmation / 员工手写回执签名</h4>
                                {empConfirmations[`${currentUser?.id}_${currentMonthStr}`] ? (
                                  <div className="flex items-center gap-4">
                                    <div className="text-right">
                                      <p className="text-xs font-extrabold text-slate-800">Digitally Confirmed</p>
                                      <p className="text-[10px] text-slate-400 font-bold font-mono">Status: Verified ✍️</p>
                                    </div>
                                    {empConfirmations[`${currentUser?.id}_${currentMonthStr}`]?.startsWith("data:image/") ? (
                                      <div className="border border-slate-200/80 bg-white p-1 rounded-xl shadow-3xs flex justify-center items-center h-14 w-24">
                                        <img 
                                          src={empConfirmations[`${currentUser?.id}_${currentMonthStr}`]} 
                                          alt="handwritten signature" 
                                          className="max-h-full max-w-full object-contain -rotate-90"
                                          referrerPolicy="no-referrer"
                                        />
                                      </div>
                                    ) : (
                                      <div className="border border-slate-200/80 bg-slate-50 px-3 py-2 rounded-xl text-xs font-black text-brand-600 tracking-wider">
                                        {empConfirmations[`${currentUser?.id}_${currentMonthStr}`]}
                                      </div>
                                    )}
                                  </div>
                                ) : (
                                  <div className="text-[11px] text-slate-400 font-bold italic border border-slate-150 border-dashed rounded-xl px-4 py-2 bg-slate-50/50">
                                    Pending Handdrawn Signature / 待手写签收
                                  </div>
                                )}
                              </div>
                            </div>

                            {/* Aesthetic Slogan Footer */}
                            <div className="text-center pt-8 border-t border-slate-100 mt-8 text-[10px] text-slate-350 font-bold tracking-widest uppercase">
                              Powered by WMS Smart HR Systems · Empowering Enterprises Worldwide
                            </div>
                          </div>
                        </div>

                        {!payouts[`${currentUser.id}_${currentMonthStr}`] ? (
                          <div className="bg-white p-8 rounded-xl border border-slate-100 shadow-3xs flex flex-col items-center justify-center text-center space-y-4 py-12">
                            <div className="w-16 h-16 rounded-full bg-amber-50 text-amber-500 flex items-center justify-center shadow-3xs">
                              <Lock className="w-8 h-8 animate-bounce" />
                            </div>
                            <div className="space-y-1 max-w-[260px]">
                              <h5 className="text-sm font-black text-slate-800">{t("payslip_unreleased")}</h5>
                              <p className="text-[11px] text-slate-400 font-semibold leading-relaxed">
                                {t("payslip_unreleased_desc")}
                              </p>
                            </div>
                          </div>
                        ) : (
                          <>
                            {/* Employee Profile Card */}
                            <div className="bg-white p-4 rounded-xl border border-slate-100 shadow-3xs flex items-center gap-3">
                              <div className="w-12 h-12 rounded-full bg-brand-50 border border-brand-100 text-brand-600 flex items-center justify-center text-lg font-black font-sans uppercase shrink-0 overflow-hidden">
                                {currentUser.photo ? (
                                  <img src={currentUser.photo} className="w-full h-full object-cover" alt="" referrerPolicy="no-referrer" />
                                ) : (
                                  currentUser.name.charAt(0)
                                )}
                              </div>
                              <div className="flex-1 space-y-0.5 min-w-0">
                                <h5 className="text-sm font-extrabold text-slate-800 leading-tight truncate">
                                  {currentUser.name}
                                </h5>
                                <p className="text-[10px] text-slate-400 font-bold truncate">
                                  {t("emp_id_label")} #{currentUser.id} · {getDeptLabel(currentUser.dept)} · {getRoleLabel(currentUser.role)}
                                </p>
                                <div className="flex items-center gap-1 mt-1">
                                  <span className="text-[10px]">
                                    {COUNTRY_FLAGS[currentUser.nationality as keyof typeof COUNTRY_FLAGS] || "🏳️"}
                                  </span>
                                  <span className="text-[10px] font-bold text-slate-500">
                                    {getCountryName(currentUser.nationality)}{t("flag_suffix")}
                                  </span>
                                </div>
                              </div>
                            </div>

                            {/* High-Fidelity Joyful Animated Net Payout Card */}
                            <div className="bg-gradient-to-tr from-[#FF007F] via-[#FF5E00] to-[#FFD700] animate-gradient-bg p-[3px] rounded-2xl shadow-[0_10px_25px_-5px_rgba(255,0,127,0.4)] relative overflow-hidden animate-in fade-in slide-in-from-bottom-3 duration-700 animate-shine-reflection">
                              {/* Animated floating background elements */}
                              <div className="absolute left-[8%] bottom-[10%] text-2xl opacity-60 animate-float-bubble-1 pointer-events-none select-none">🎈</div>
                              <div className="absolute right-[12%] bottom-[15%] text-2xl opacity-50 animate-float-bubble-2 pointer-events-none select-none">🎉</div>
                              <div className="absolute left-[30%] bottom-[5%] text-xl opacity-40 animate-float-bubble-3 pointer-events-none select-none">💵</div>
                              <div className="absolute right-[35%] bottom-[25%] text-2xl opacity-65 animate-float-bubble-4 pointer-events-none select-none">🧧</div>
                              <div className="absolute left-[65%] bottom-[20%] text-xl opacity-50 animate-float-bubble-1 pointer-events-none select-none">🪙</div>
                              
                              {/* High-contrast gorgeous inner content card with semi-transparent backdrop */}
                              <div className="bg-black/10 backdrop-blur-xs p-5 text-center space-y-4 rounded-[13px] text-white relative z-10">
                                {/* Joyful title badge */}
                                <div className="flex flex-col items-center gap-1">
                                  <span className="inline-flex items-center gap-1 px-3 py-1 text-[9px] font-black uppercase tracking-widest bg-yellow-300/30 text-yellow-100 rounded-full border border-yellow-200/30 backdrop-blur-md animate-pulse">
                                    🌟 {locale === "zh-CN" ? "今日发薪 财富自由" : locale === "zh-TW" ? "今日發薪 財富自由" : "HAPPY PAYDAY"} 🌟
                                  </span>
                                  <div className="flex items-center justify-center gap-1.5 mt-1">
                                    <Sparkles className="w-5 h-5 text-yellow-200 animate-spin" style={{ animationDuration: "4s" }} />
                                    <h4 className="text-sm font-black tracking-wider text-yellow-100 drop-shadow-[0_2px_4px_rgba(0,0,0,0.5)]">
                                      {locale === "zh-CN" ? "恭喜发薪 · 幸福到账" : locale === "zh-TW" ? "恭喜發薪 · 幸福到帳" : "Payroll Successfully Disbursed"}
                                    </h4>
                                    <Sparkles className="w-5 h-5 text-yellow-200 animate-spin" style={{ animationDuration: "4s" }} />
                                  </div>
                                </div>
                                
                                {/* Payout Display */}
                                <div className="space-y-0.5 relative group cursor-pointer transition-transform duration-300 active:scale-95">
                                  <p className="text-[10px] text-white/95 font-bold uppercase tracking-wider drop-shadow-xs">
                                    {t("net_payout_title")}
                                  </p>
                                  <p className="text-4xl font-black font-mono tracking-tight drop-shadow-[0_4px_12px_rgba(0,0,0,0.35)] text-yellow-100 selection:bg-yellow-500 selection:text-white">
                                    {formatCurrency(netPayout, currentUser.currency)}
                                  </p>
                                  <p className="text-[10px] text-yellow-200 font-black tracking-wide drop-shadow-xs flex items-center justify-center gap-1">
                                    <span>{t("payout_currency_label")}</span>
                                    <span className="px-1.5 py-0.5 rounded bg-black/25 text-white text-[9px] font-bold">
                                      {currentUser.currency} {currentUser.currency === "THB" ? (locale === "zh-CN" || locale === "zh-TW" ? "泰铢" : locale === "th" ? "บาท" : locale === "id" ? "Baht" : "THB") : ""}
                                    </span>
                                  </p>
                                </div>

                                {/* Warm Emotional Message */}
                                <div className="bg-white/15 rounded-xl p-3.5 text-left border border-white/15 backdrop-blur-md shadow-inner transition-all duration-300 hover:bg-white/20">
                                  <p className="text-[10.5px] text-white font-medium leading-relaxed drop-shadow-xs">
                                    {locale === "zh-CN" ? (
                                      <>
                                        <strong>辛苦啦，{currentUser.name}！</strong>这是您本月努力拼搏的汗水结晶 🌟 每一分耕耘，都值得被甜美款待。愿新的一月，所得皆所愿，生活常明朗，幸福长相伴！✨💖
                                      </>
                                    ) : locale === "zh-TW" ? (
                                      <>
                                        <strong>辛苦啦，{currentUser.name}！</strong>這是您本月努力拼搏的汗水結晶 🌟 每一分耕耘，都值得被甜美款待。願新的一月，所得皆所願，生活常明朗，幸福長相伴！✨💖
                                      </>
                                    ) : (
                                      <>
                                        <strong>Thank you, {currentUser.name}!</strong> This is the fruit of your dedication and hard work this month. 🌟 Every effort deserves a sweet reward. May the new month bring more success, health, and prosperity! ✨💖
                                      </>
                                    )}
                                  </p>
                                </div>
                              </div>
                            </div>

                            {/* Working Details Grid */}
                            <div className="bg-white p-4 rounded-xl border border-slate-100 shadow-3xs space-y-2.5">
                          <h6 className="text-[11px] font-black text-slate-400 uppercase tracking-wider">
                            {t("attendance_accounting")}
                          </h6>
                          <div className="grid grid-cols-2 gap-x-4 gap-y-2 text-[11px] font-semibold text-slate-600 bg-slate-50/50 p-3 rounded-xl border border-slate-100">
                            <div className="space-y-0.5">
                              <p className="text-[9px] text-slate-400 font-bold">{t("std_work_hours")}</p>
                              <p className="text-slate-800 font-bold font-mono">
                                {t("hours_per_day", { hours: config.standardHours })}
                              </p>
                            </div>
                            <div className="space-y-0.5">
                              <p className="text-[9px] text-slate-400 font-bold">{t("working_days_month")}</p>
                              <p className="text-slate-800 font-bold font-mono">
                                {t("days_unit", { days: monthlySummary?.workingDays ?? 0 })}
                              </p>
                            </div>
                            <div className="space-y-0.5">
                              <p className="text-[9px] text-slate-400 font-bold">{t("valid_hours_month")}</p>
                              <p className="text-slate-800 font-bold font-mono">
                                {formatDuration(monthlySummary?.valid ?? 0)}
                              </p>
                            </div>
                            <div className="space-y-0.5">
                              <p className="text-[9px] text-slate-400 font-bold">{t("ot_hours_month")}</p>
                              <p className="text-slate-800 font-bold font-mono">
                                {formatDuration(monthlySummary?.ot ?? 0)} {monthlySummary?.otCount !== undefined && monthlySummary?.otCount > 0 ? `(${t("ot_count_unit", { count: monthlySummary?.otCount ?? 0 })})` : ""}
                              </p>
                            </div>
                          </div>
                        </div>

                        {/* Financial Detail Summary */}
                        <div className="bg-white p-4 rounded-xl border border-slate-100 shadow-3xs space-y-2.5">
                          <h6 className="text-[11px] font-black text-slate-400 uppercase tracking-wider">
                            {t("payslip_detail")}
                          </h6>
                          <div className="bg-slate-50 border border-slate-100 rounded-xl p-3.5 space-y-2.5 text-xs text-slate-600">
                            {currentUser.baseMonthlyWage !== undefined && currentUser.baseMonthlyWage !== null && currentUser.baseMonthlyWage > 0 && (
                              <div className="flex justify-between items-center text-[11px] border-b border-slate-100 pb-1.5">
                                <span className="text-slate-500 font-medium font-mono">
                                  {locale === "zh-CN" ? "基础工资 (月薪计):" : locale === "zh-TW" ? "基礎工資 (月薪計):" : "Base Salary (Monthly):"}
                                </span>
                                <span className="text-slate-700 font-mono font-bold">
                                  {formatCurrency(currentUser.baseMonthlyWage, currentUser.currency)} /月
                                </span>
                              </div>
                            )}
                            <div className="flex justify-between items-center text-[11px]">
                              <span className="text-slate-500 font-medium font-mono">
                                {locale === "zh-CN" ? (
                                  currentUser.baseMonthlyWage !== undefined && currentUser.baseMonthlyWage > 0
                                    ? `基础工资 (月薪折算/30 × ${monthlySummary?.workingDays ?? 0}天):`
                                    : currentUser.dailyWage !== undefined && currentUser.dailyWage > 0
                                      ? `基础工资 (固定日薪 × ${monthlySummary?.workingDays ?? 0}天):`
                                      : `基础工资 (时薪计件 × ${formatDuration((monthlySummary?.valid ?? 0) - (monthlySummary?.ot ?? 0))}h):`
                                ) : locale === "zh-TW" ? (
                                  currentUser.baseMonthlyWage !== undefined && currentUser.baseMonthlyWage > 0
                                    ? `基礎工資 (月薪折算/30 × ${monthlySummary?.workingDays ?? 0}天):`
                                    : currentUser.dailyWage !== undefined && currentUser.dailyWage > 0
                                      ? `基礎工資 (固定日薪 × ${monthlySummary?.workingDays ?? 0}天):`
                                      : `基礎工資 (時薪計件 × ${formatDuration((monthlySummary?.valid ?? 0) - (monthlySummary?.ot ?? 0))}h):`
                                ) : (
                                  currentUser.baseMonthlyWage !== undefined && currentUser.baseMonthlyWage > 0
                                    ? `Base Pay (Pro-rated/30 × ${monthlySummary?.workingDays ?? 0}d):`
                                    : currentUser.dailyWage !== undefined && currentUser.dailyWage > 0
                                      ? `Base Pay (Fixed Daily × ${monthlySummary?.workingDays ?? 0}d):`
                                      : `Base Pay (Hourly × ${formatDuration((monthlySummary?.valid ?? 0) - (monthlySummary?.ot ?? 0))}h):`
                                )}
                              </span>
                              <span className="text-slate-800 font-mono font-bold">
                                {formatCurrency(basePay, currentUser.currency)}
                              </span>
                            </div>
                            <div className="flex justify-between items-center text-[11px]">
                              <span className="text-slate-500 font-medium font-mono">
                                {locale === "zh-CN"
                                  ? `加班应得 (时薪 × ${(monthlySummary?.ot ?? 0).toFixed(1)}h):`
                                  : locale === "zh-TW"
                                    ? `加班應得 (時薪 × ${(monthlySummary?.ot ?? 0).toFixed(1)}h):`
                                    : `Overtime Earnings (Hourly × ${(monthlySummary?.ot ?? 0).toFixed(1)}h):`}
                              </span>
                              <span className="text-green-600 font-mono font-bold">
                                + {formatCurrency(otPay, currentUser.currency)}
                              </span>
                            </div>
                            {bonusPay > 0 && (
                              <div className="flex justify-between items-center text-[11px]">
                                <span className="text-slate-500 font-medium font-mono">
                                  {locale === "zh-CN" ? "全勤奖 (津贴):" : locale === "zh-TW" ? "全勤獎 (津貼):" : "Attendance Bonus (Allowance):"}
                                </span>
                                <span className="text-emerald-600 font-mono font-bold">
                                  + {formatCurrency(bonusPay, currentUser.currency)}
                                </span>
                              </div>
                            )}
                            {mealAllowancePay > 0 && (
                              <div className="flex justify-between items-center text-[11px]">
                                <span className="text-slate-500 font-medium font-mono">
                                  {locale === "zh-CN" ? "餐饮费 (餐补):" : locale === "zh-TW" ? "餐飲費 (餐補):" : "Meal Allowance (Subsidy):"}
                                </span>
                                <span className="text-amber-600 font-mono font-bold">
                                  + {formatCurrency(mealAllowancePay, currentUser.currency)}
                                </span>
                              </div>
                            )}
                            <div className="flex justify-between items-center text-[11px]">
                              <span className="text-slate-500 font-medium font-mono">
                                {locale === "zh-CN"
                                  ? `所得税代扣 (${Math.round(config.taxRate * 100)}%):`
                                  : locale === "zh-TW"
                                    ? `所得稅代扣 (${Math.round(config.taxRate * 100)}%):`
                                    : `Individual Tax Withholding (${Math.round(config.taxRate * 100)}%):`}
                              </span>
                              <span className="text-red-500 font-mono font-bold">
                                - {formatCurrency(taxDeduct, currentUser.currency)}
                              </span>
                            </div>
                             {securityDeduct > 0 && (
                              <div className="flex justify-between items-center text-[11px]">
                                <span className="text-slate-500 font-medium font-mono">
                                  {locale === "zh-CN" ? "社保扣款:" : locale === "zh-TW" ? "社保扣款:" : "Social Security:"}
                                </span>
                                <span className="text-rose-600 font-mono font-bold">
                                  - {formatCurrency(securityDeduct, currentUser.currency)}
                                </span>
                              </div>
                            )}
                            {currentUser?.sourceType === '劳务派遣' && (
                              <div className="flex justify-between items-center text-[11px] border-t border-dashed border-slate-100 pt-1.5 mt-1.5">
                                <span className="text-teal-600 font-medium font-mono">
                                  {locale === "zh-CN" 
                                    ? `派遣抽佣 (${currentUser.dispatchCommissionRate ?? 0}% - 仅限基本薪资):` 
                                    : locale === "zh-TW" 
                                      ? `派遣抽傭 (${currentUser.dispatchCommissionRate ?? 0}% - 僅限基本薪資):` 
                                      : `Dispatch Commission (${currentUser.dispatchCommissionRate ?? 0}% - Base wage only):`}
                                </span>
                                <span className="text-teal-600 font-mono font-bold">
                                  + {formatCurrency(basePay * ((currentUser.dispatchCommissionRate ?? 0) / 100), currentUser.currency)}
                                </span>
                              </div>
                            )}
                            {reimbursedAmount > 0 && (
                              <div className="flex justify-between items-center text-[11px] border-t border-slate-200/60 pt-2">
                                <span className="text-slate-500 font-medium font-mono">
                                  {locale === "zh-CN" ? "实报实销费用:" : locale === "zh-TW" ? "實報實銷費用:" : "Approved Reimbursement:"}
                                </span>
                                <span className="text-blue-600 font-mono font-bold">
                                  + {formatCurrency(reimbursedAmount, currentUser.currency)}
                                </span>
                              </div>
                            )}
                          </div>
                        </div>

                        {/* E-Signature & Sign-Off Box */}
                        <div className="bg-white p-4 rounded-xl border border-slate-100 shadow-3xs">
                          {empConfirmations[`${currentUser.id}_${currentMonthStr}`] ? (
                            <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-3.5 text-center relative overflow-hidden flex flex-col items-center justify-center gap-1.5 animate-scale-up">
                              {/* Watermark sign */}
                              <div className="absolute -right-2 -bottom-2 text-emerald-200/25 font-mono text-3xl font-black tracking-widest pointer-events-none select-none uppercase rotate-12">
                                SIGNED
                              </div>
                              <CheckCircle className="w-8 h-8 text-emerald-500" />
                              <span className="text-xs font-black text-emerald-800">{t("signed_status")}</span>
                              <p className="text-[10px] text-emerald-600 font-semibold leading-relaxed max-w-[220px]">
                                {t("signed_payout_desc")}
                              </p>
                              <div className="mt-1 px-3 py-1 bg-white border border-emerald-100 rounded-md shadow-xs font-mono text-[10px] text-slate-500 font-black flex items-center justify-center gap-2">
                                <span>{t("signatory")}</span>
                                {empConfirmations[`${currentUser.id}_${currentMonthStr}`]?.startsWith("data:image/") ? (
                                  <img 
                                    src={empConfirmations[`${currentUser.id}_${currentMonthStr}`]} 
                                    alt="signature" 
                                    className="h-8 max-w-[140px] object-contain border border-slate-100 rounded px-1 bg-slate-50 -rotate-90"
                                    referrerPolicy="no-referrer"
                                  />
                                ) : (
                                  <span>{empConfirmations[`${currentUser.id}_${currentMonthStr}`]}</span>
                                )}
                              </div>
                            </div>
                          ) : (
                            <div className="bg-amber-50 border border-amber-200 rounded-xl p-3.5 space-y-3">
                              <h6 className="text-[11px] font-black text-amber-800 flex items-center gap-1">
                                <Lock className="w-3.5 h-3.5 text-amber-500" />
                                {t("safety_receipt_title")}
                              </h6>
                              <label className="flex items-start gap-2 cursor-pointer select-none">
                                <input 
                                  type="checkbox"
                                  checked={employeePledgeChecked}
                                  onChange={(e) => setEmployeePledgeChecked(e.target.checked)}
                                  className="mt-0.5 rounded text-brand-600 focus:ring-brand-500 cursor-pointer w-3.5 h-3.5"
                                />
                                <span className="text-[10px] text-slate-600 leading-tight font-medium">
                                  {t("receipt_pledge")}
                                </span>
                              </label>
                              
                              <div className="space-y-1">
                                <label className="block text-[10px] font-extrabold text-slate-500 flex justify-between items-center">
                                  <span>{t("signature_input_label")}</span>
                                  {employeeSignName && (
                                    <button 
                                      type="button" 
                                      onClick={() => setEmployeeSignName("")} 
                                      className="text-[10px] text-red-500 hover:text-red-600 font-bold flex items-center gap-0.5 cursor-pointer"
                                    >
                                      重签
                                    </button>
                                  )}
                                </label>
                                
                                {employeeSignName ? (
                                  <div className="w-full p-2.5 border border-slate-200 rounded-xl bg-white flex justify-center items-center h-24 overflow-hidden relative shadow-3xs">
                                    <img 
                                      src={employeeSignName} 
                                      alt="Handwritten signature" 
                                      className="max-h-full max-w-full object-contain -rotate-90" 
                                      referrerPolicy="no-referrer"
                                    />
                                    <div className="absolute right-2 bottom-1 text-[8px] font-mono text-emerald-600/70 font-black tracking-widest uppercase pointer-events-none">
                                      CAPTURED
                                    </div>
                                  </div>
                                ) : (
                                  <button
                                    type="button"
                                    onClick={() => setIsSignatureModalOpen(true)}
                                    className="w-full py-4 border-2 border-dashed border-slate-200 hover:border-brand-400 bg-white hover:bg-slate-50 rounded-xl flex flex-col items-center justify-center gap-1 transition text-slate-400 hover:text-brand-600 cursor-pointer shadow-3xs"
                                  >
                                    <span className="text-lg">✍️</span>
                                    <span className="text-[10px] font-black text-slate-700">点击此处手写姓名签署</span>
                                    <span className="text-[8px] text-slate-400 font-medium">请横屏书写姓名，系统会自动保存</span>
                                  </button>
                                )}
                              </div>
                              
                              {/* Inner '我已确认' button has been hidden as requested. Confirmation is handled by the bottom navigation bar. */}
                            </div>
                          )}
                        </div>
                          </>
                        )}

                        {/* Back navigation button has been hidden as requested. */}
                      </div>
                    )}

                  </div>

                  {/* Redesigned App Bottom Navigation (Switch to "我已确认" when viewing payslip) */}
                  {activeMobileTab === "payslip" ? (
                    <div className="h-16 bg-white border-t border-slate-100 px-4 flex items-center justify-center pb-1 z-30 select-none shadow-3xs w-full">
                      <button
                        type="button"
                        disabled={empConfirmations[`${currentUser.id}_${currentMonthStr}`] ? false : (!employeePledgeChecked || !employeeSignName)}
                        onClick={() => {
                          if (empConfirmations[`${currentUser.id}_${currentMonthStr}`]) {
                            // If already signed, bottom button just takes them back
                            setActiveMobileTab(previousTab);
                            setEmployeeSignName("");
                            setEmployeePledgeChecked(false);
                            return;
                          }
                          
                          // Submit signature
                          if (!employeePledgeChecked) {
                            addToast(t("pleas_check_receipt"));
                            return;
                          }
                          if (!employeeSignName) {
                            addToast("请先完成手写签名！");
                            return;
                          }
                          
                          // Sign successfully
                          const key = `${currentUser.id}_${currentMonthStr}`;
                          const updatedSigs = { ...empConfirmations, [key]: employeeSignName.trim() };
                          setEmpConfirmations(updatedSigs);
                          localStorage.setItem("payroll_employee_signatures", JSON.stringify(updatedSigs));
                          window.dispatchEvent(new Event("storage"));
                          addToast(t("sign_success_toast"));
                        }}
                        className={`w-full py-2.5 rounded-xl text-xs font-extrabold flex items-center justify-center gap-1.5 transition cursor-pointer ${
                          empConfirmations[`${currentUser.id}_${currentMonthStr}`]
                            ? "bg-emerald-600 hover:bg-emerald-700 text-white shadow-3xs"
                            : (employeePledgeChecked && employeeSignName)
                              ? "bg-brand-600 hover:bg-brand-700 text-white animate-pulse shadow-3xs"
                              : "bg-slate-300 text-slate-500 cursor-not-allowed"
                        }`}
                      >
                        {empConfirmations[`${currentUser.id}_${currentMonthStr}`] ? (
                          <>
                            <CheckCircle className="w-4 h-4" />
                            <span>已确认并签收 (点击返回)</span>
                          </>
                        ) : (
                          <>
                            <ShieldCheck className="w-4 h-4" />
                            <span>{t("sign_confirm_btn")}</span>
                          </>
                        )}
                      </button>
                    </div>
                  ) : (
                    <div className="h-16 bg-white border-t border-slate-100 px-2 flex items-center justify-around text-slate-400 pb-1 z-30 select-none shadow-3xs">
                      <button
                        type="button"
                        onClick={() => { setActiveMobileTab("home"); setViewingSop(null); }}
                        className={`flex flex-col items-center gap-0.5 cursor-pointer transition ${
                          activeMobileTab === "home" ? "text-blue-600 font-bold" : "hover:text-slate-600"
                        }`}
                      >
                        <Home className="w-5 h-5" />
                        <span className="text-[9px]">{t("home")}</span>
                        {activeMobileTab === "home" && (
                          <span className="w-1 h-1 bg-blue-600 rounded-full mt-0.5" />
                        )}
                      </button>
                      
                      <button
                        type="button"
                        onClick={() => {
                          setActiveMobileTab("attendance");
                          if (currentUser?.status === '离职') {
                            addToast("⚠️ 您已办理离职，该账号已进入只读归档状态，无法打卡或进行业务操作。如有疑问请联系HR或管理员。");
                          }
                        }}
                        className={`flex flex-col items-center gap-0.5 cursor-pointer transition ${
                          activeMobileTab === "attendance" ? "text-blue-600 font-bold" : "hover:text-slate-600"
                        }`}
                      >
                        <ClipboardCheck className="w-5 h-5" />
                        <span className="text-[9px]">{t("attendance")}</span>
                        {activeMobileTab === "attendance" && (
                          <span className="w-1 h-1 bg-blue-600 rounded-full mt-0.5" />
                        )}
                      </button>
                      
                      <button
                        type="button"
                        onClick={() => {
                          setActiveMobileTab("expense");
                          if (currentUser?.status === '离职') {
                            addToast("⚠️ 您已办理离职，该账号已进入只读归档状态，无法提交报销申请。如有疑问请联系HR或管理员。");
                          }
                        }}
                        className={`flex flex-col items-center gap-0.5 cursor-pointer transition ${
                          (activeMobileTab === "expense" || activeMobileTab === "add_expense") ? "text-blue-600 font-bold" : "hover:text-slate-600"
                        }`}
                      >
                        <Coins className="w-5 h-5" />
                        <span className="text-[9px]">
                          {locale === "zh-CN" ? "报销" : locale === "zh-TW" ? "報銷" : "Reimbursement"}
                        </span>
                        {(activeMobileTab === "expense" || activeMobileTab === "add_expense") && (
                          <span className="w-1 h-1 bg-blue-600 rounded-full mt-0.5" />
                        )}
                      </button>

                      <button
                        type="button"
                        onClick={() => {
                          setActiveMobileTab("my");
                          if (currentUser?.status === '离职') {
                            addToast("⚠️ 您已办理离职，该账号已进入只读归档状态，无法签署工资单。如有疑问请联系HR或管理员。");
                          }
                        }}
                        className={`flex flex-col items-center gap-0.5 cursor-pointer transition ${
                          (activeMobileTab === "my" || (activeMobileTab as any) === "payslip") ? "text-blue-600 font-bold" : "hover:text-slate-600"
                        }`}
                      >
                        <User className="w-5 h-5" />
                        <span className="text-[9px]">{t("my")}</span>
                        {(activeMobileTab === "my" || (activeMobileTab as any) === "payslip") && (
                          <span className="w-1 h-1 bg-blue-600 rounded-full mt-0.5" />
                        )}
                      </button>
                    </div>
                  )}

                    {isFaceAttendanceOpen && (
                    <BiometricTerminal
                      isFaceAttendanceOpen={isFaceAttendanceOpen}
                      setIsFaceAttendanceOpen={setIsFaceAttendanceOpen}
                      faceAttendanceTab={faceAttendanceTab}
                      setFaceAttendanceTab={setFaceAttendanceTab}
                      faceScanMode={faceScanMode}
                      setFaceScanMode={setFaceScanMode}
                      faceScanResult={faceScanResult}
                      setFaceScanResult={setFaceScanResult}
                      faceSelectedEmpId={faceSelectedEmpId}
                      setFaceSelectedEmpId={setFaceSelectedEmpId}
                      empSearchQuery={empSearchQuery}
                      setEmpSearchQuery={setEmpSearchQuery}
                      employees={employees}
                      triggerFaceRecognitionPunch={triggerFaceRecognitionPunch}
                      isFaceScanning={isFaceScanning}
                      simulatedDate={simulatedDate}
                      faceScanHistory={faceScanHistory}
                      attendanceStatusFilter={attendanceStatusFilter}
                      setAttendanceStatusFilter={setAttendanceStatusFilter}
                      batchTimeSource={batchTimeSource}
                      setBatchTimeSource={setBatchTimeSource}
                      batchCustomTime={batchCustomTime}
                      setBatchCustomTime={setBatchCustomTime}
                      config={config}
                      handleBatchPunch={handleBatchPunch}
                      attendance={attendance}
                      selectedDeptFilter={selectedDeptFilter}
                      setSelectedDeptFilter={setSelectedDeptFilter}
                      batchSelectedIds={batchSelectedIds}
                      setBatchSelectedIds={setBatchSelectedIds}
                      handleDirectPunch={handleDirectPunch}
                      handleResetPunch={handleResetPunch}
                      getSimulatedInTime={getSimulatedInTime}
                    />
                  )}
                </div>
              )}



              {/* Custom Mobile-Style Date Picker Bottom Sheet / Modal */}
              <AnimatePresence>
                {showDatePickerTarget && (
                  <motion.div
                    key="datepicker-backdrop"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    transition={{ duration: 0.15 }}
                    className="absolute inset-0 bg-black/60 backdrop-blur-xs flex items-end justify-center z-[100]"
                  >
                    {/* Backdrop Click to close */}
                    <div 
                      className="absolute inset-0 cursor-default" 
                      onClick={() => setShowDatePickerTarget(null)} 
                    />
                    
                    {/* Bottom Sheet Card */}
                    <motion.div
                      initial={{ y: "100%" }}
                      animate={{ y: 0 }}
                      exit={{ y: "100%" }}
                      transition={{ type: "spring", damping: 30, stiffness: 400 }}
                      className="bg-white rounded-t-3xl w-full max-w-[360px] shadow-2xl p-5 border-t border-slate-100 flex flex-col gap-4 z-10 text-left relative"
                    >
                      {/* Pull Bar */}
                      <div className="w-10 h-1 bg-slate-200 rounded-full mx-auto -mt-2 mb-1" />

                      <div className="flex justify-between items-center">
                        <span className="text-xs font-black text-slate-800 flex items-center gap-1.5">
                          <Calendar className="w-4 h-4 text-brand-600" />
                          {showDatePickerTarget === "start" ? "选择起始日期" : "选择结束日期"}
                        </span>
                        <button
                          type="button"
                          onClick={() => setShowDatePickerTarget(null)}
                          className="text-slate-400 hover:text-slate-600 font-bold text-sm cursor-pointer p-1"
                        >
                          ✕
                        </button>
                      </div>

                      {/* Month & Year switcher */}
                      <div className="flex items-center justify-between bg-slate-50 p-2 rounded-xl border border-slate-100">
                        <button
                          type="button"
                          onClick={() => {
                            if (pickerMonth === 1) {
                              setPickerYear(prev => prev - 1);
                              setPickerMonth(12);
                            } else {
                              setPickerMonth(prev => prev - 1);
                            }
                          }}
                          className="p-1.5 hover:bg-white hover:shadow-3xs rounded-lg text-slate-500 hover:text-slate-800 transition cursor-pointer"
                        >
                          <ChevronLeft className="w-4 h-4" />
                        </button>
                        <span className="text-xs font-black text-slate-700">
                          {pickerYear}年 {pickerMonth.toString().padStart(2, "0")}月
                        </span>
                        <button
                          type="button"
                          onClick={() => {
                            if (pickerMonth === 12) {
                              setPickerYear(prev => prev + 1);
                              setPickerMonth(1);
                            } else {
                              setPickerMonth(prev => prev + 1);
                            }
                          }}
                          className="p-1.5 hover:bg-white hover:shadow-3xs rounded-lg text-slate-500 hover:text-slate-800 transition cursor-pointer"
                        >
                          <ChevronRight className="w-4 h-4" />
                        </button>
                      </div>

                      {/* Day of week headers */}
                      <div className="grid grid-cols-7 gap-1 text-center border-b border-slate-100 pb-1.5">
                        {["日", "一", "二", "三", "四", "五", "六"].map(d => (
                          <span key={d} className="text-[10px] font-black text-slate-400">{d}</span>
                        ))}
                      </div>

                      {/* Grid of Days */}
                      <div className="grid grid-cols-7 gap-1 text-center">
                        {/* Empty spacing before the first day */}
                        {(() => {
                          const firstDay = new Date(pickerYear, pickerMonth - 1, 1).getDay();
                          return Array.from({ length: firstDay }).map((_, idx) => (
                            <span key={`empty-${idx}`} className="py-1 text-[11px]" />
                          ));
                        })()}

                        {/* Month Days */}
                        {(() => {
                          const numDays = new Date(pickerYear, pickerMonth, 0).getDate();
                          return Array.from({ length: numDays }).map((_, idx) => {
                            const day = idx + 1;
                            const dayStr = day.toString().padStart(2, "0");
                            const monthStr = pickerMonth.toString().padStart(2, "0");
                            const dateStr = `${pickerYear}-${monthStr}-${dayStr}`;

                            const isSelected = (showDatePickerTarget === "start" ? leaveStart : leaveEnd) === dateStr;
                            const isToday = simulatedDate === dateStr;

                            return (
                              <button
                                key={day}
                                type="button"
                                onClick={() => {
                                  if (showDatePickerTarget === "start") {
                                    setLeaveStart(dateStr);
                                    if (leaveEnd && new Date(dateStr) > new Date(leaveEnd)) {
                                      setLeaveEnd(dateStr);
                                    }
                                  } else {
                                    setLeaveEnd(dateStr);
                                    if (leaveStart && new Date(leaveStart) > new Date(dateStr)) {
                                      setLeaveStart(dateStr);
                                    }
                                  }
                                  setShowDatePickerTarget(null);
                                }}
                                className={`py-1.5 text-[11px] font-black rounded-lg cursor-pointer transition flex flex-col items-center justify-center relative min-h-[30px] ${
                                  isSelected
                                    ? "bg-brand-600 text-white font-black shadow-3xs"
                                    : isToday
                                    ? "bg-brand-50 text-brand-700 border border-brand-200"
                                    : "text-slate-700 hover:bg-slate-50"
                                }`}
                              >
                                <span>{day}</span>
                                {isToday && !isSelected && (
                                  <span className="w-1.5 h-1.5 bg-brand-500 rounded-full absolute bottom-1 scale-75" />
                                )}
                              </button>
                            );
                          });
                        })()}
                      </div>

                      {/* Footer controls */}
                      <div className="flex gap-2 border-t border-slate-100 pt-3">
                        <button
                          type="button"
                          onClick={() => {
                            const todayStr = simulatedDate || new Date().toISOString().split("T")[0];
                            if (showDatePickerTarget === "start") {
                              setLeaveStart(todayStr);
                              if (leaveEnd && new Date(todayStr) > new Date(leaveEnd)) {
                                setLeaveEnd(todayStr);
                              }
                            } else {
                              setLeaveEnd(todayStr);
                              if (leaveStart && new Date(leaveStart) > new Date(todayStr)) {
                                setLeaveStart(todayStr);
                              }
                            }
                            setShowDatePickerTarget(null);
                          }}
                          className="flex-1 py-2 bg-slate-50 hover:bg-slate-100 text-slate-700 rounded-xl text-[11px] font-bold transition border border-slate-200/60 cursor-pointer"
                        >
                          设为今日
                        </button>
                        <button
                          type="button"
                          onClick={() => setShowDatePickerTarget(null)}
                          className="flex-1 py-2 bg-brand-600 hover:bg-brand-700 text-white rounded-xl text-[11px] font-black transition shadow-3xs cursor-pointer"
                        >
                          确定
                        </button>
                      </div>
                    </motion.div>
                  </motion.div>
                )}
              </AnimatePresence>

              {/* Custom Mobile-Style Leave Type Bottom Sheet */}
              <AnimatePresence>
                {showLeaveTypePicker && (
                  <motion.div
                    key="leavetype-backdrop"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    transition={{ duration: 0.15 }}
                    className="absolute inset-0 bg-black/60 backdrop-blur-xs flex items-end justify-center z-[100]"
                  >
                    {/* Backdrop Click to close */}
                    <div 
                      className="absolute inset-0 cursor-default" 
                      onClick={() => setShowLeaveTypePicker(false)} 
                    />
                    
                    {/* Bottom Sheet Card */}
                    <motion.div
                      initial={{ y: "100%" }}
                      animate={{ y: 0 }}
                      exit={{ y: "100%" }}
                      transition={{ type: "spring", damping: 30, stiffness: 400 }}
                      className="bg-white rounded-t-3xl w-full max-w-[360px] shadow-2xl p-5 border-t border-slate-100 flex flex-col gap-4 z-10 text-left relative"
                    >
                      {/* Pull Bar */}
                      <div className="w-10 h-1 bg-slate-200 rounded-full mx-auto -mt-2 mb-1" />

                      <div className="flex justify-between items-center pb-2 border-b border-slate-100">
                        <span className="text-xs font-black text-slate-800 flex items-center gap-1.5">
                          <ClipboardCheck className="w-4 h-4 text-brand-600" />
                          选择请假类型 (Select Type)
                        </span>
                        <button
                          type="button"
                          onClick={() => setShowLeaveTypePicker(false)}
                          className="text-slate-400 hover:text-slate-600 font-bold text-sm cursor-pointer p-1"
                        >
                          ✕
                        </button>
                      </div>

                      {/* Options Grid */}
                      <div className="space-y-1 max-h-[250px] overflow-y-auto">
                        {[
                          { key: "事假", label: t("personal_leave") || "事假", sub: "Personal Leave" },
                          { key: "病假", label: t("sick_leave") || "病假", sub: "Sick Leave" },
                          { key: "年假", label: t("annual_leave") || "年假", sub: "Annual Leave" },
                          { key: "婚产假", label: t("special_leave") || "婚产假", sub: "Special Leave" }
                        ].map((opt) => {
                          const isSelected = leaveType === opt.key;
                          return (
                            <button
                              key={opt.key}
                              type="button"
                              onClick={() => {
                                setLeaveType(opt.key);
                                setShowLeaveTypePicker(false);
                              }}
                              className={cn(
                                "w-full p-3.5 rounded-xl text-left flex justify-between items-center transition cursor-pointer font-bold",
                                isSelected
                                  ? "bg-brand-50 text-brand-700 border border-brand-200/50"
                                  : "text-slate-700 hover:bg-slate-50 border border-transparent"
                              )}
                            >
                              <div>
                                <p className="text-[11px] font-bold">{opt.label}</p>
                                <p className="text-[9px] text-slate-400 font-medium mt-0.5">{opt.sub}</p>
                              </div>
                              {isSelected && (
                                <Check className="w-4 h-4 text-brand-500 font-bold shrink-0" />
                              )}
                            </button>
                          );
                        })}
                      </div>
                    </motion.div>
                  </motion.div>
                )}
              </AnimatePresence>

              {/* Notification Detail Modal */}
              {notificationDetail && (
                <div className="absolute inset-0 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 z-[99] animate-fade-in">
                  <div className="bg-white rounded-2xl w-full max-w-[290px] shadow-xl p-5 border border-slate-100 flex flex-col gap-4 animate-scale-up text-left">
                    <div className="flex justify-between items-start gap-2">
                      <div className="space-y-1">
                        <span className="px-2 py-0.5 rounded text-[10px] font-black text-amber-700 bg-amber-50 border border-amber-200">
                          {t("announcements")}
                        </span>
                        <h4 className="text-sm font-black text-slate-800 leading-tight">
                          {notificationDetail.title}
                        </h4>
                        <p className="text-[9px] text-slate-400 font-semibold">
                          {t("sop_publish_date")} {notificationDetail.time}
                        </p>
                      </div>
                      <button
                        type="button"
                        onClick={() => setNotificationDetail(null)}
                        className="text-slate-400 hover:text-slate-600 font-bold text-lg leading-none cursor-pointer p-1"
                      >
                        ✕
                      </button>
                    </div>
                    
                    <div className="h-px bg-slate-100"></div>
                    
                    <div 
                      className="text-[11px] text-slate-600 leading-relaxed max-h-[220px] overflow-y-auto select-text font-medium whitespace-pre-wrap"
                      dangerouslySetInnerHTML={{ 
                        __html: notificationDetail.content
                          .replace(/<br\s*\/?>\s*<br\s*\/?>\s*请您登录APP员工端，点击此通知或前往.*?核对详情并完成在线签名确认。/gi, "")
                          .replace(/请您登录APP员工端，点击此通知或前往.*?核对详情并完成在线签名确认。/gi, "")
                      }}
                    />
                    
                    {(notificationDetail.title.includes("工资条") || notificationDetail.title.includes("薪资") || notificationDetail.title.includes("payslip") || notificationDetail.title.includes("Payslip")) && (
                      <button
                        type="button"
                        onClick={() => {
                          setNotificationDetail(null);
                          setPreviousTab("home");
                          setActiveMobileTab("payslip");
                        }}
                        className="w-full py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold rounded-xl text-xs transition cursor-pointer flex items-center justify-center gap-1.5"
                      >
                        <Eye className="w-4 h-4" />
                        <span>查看工资条 (View Payslip)</span>
                      </button>
                    )}

                    {(notificationDetail.category === 'catering' || notificationDetail.sop?.category === 'catering') && (
                      <button
                        type="button"
                        onClick={() => {
                          setViewingRecipeSop(notificationDetail.sop || null);
                          setNotificationDetail(null);
                        }}
                        className="w-full py-2 bg-blue-600 hover:bg-blue-700 text-white font-extrabold rounded-xl text-xs transition cursor-pointer flex items-center justify-center gap-1.5 shadow-sm hover:shadow-md"
                      >
                        <Eye className="w-4 h-4" />
                        <span>查看菜谱 (View Recipe)</span>
                      </button>
                    )}

                    <button
                      type="button"
                      onClick={() => setNotificationDetail(null)}
                      className="w-full py-2 bg-brand-600 hover:bg-brand-700 text-white font-extrabold rounded-xl text-xs transition cursor-pointer"
                    >
                      {locale === "zh-CN" || locale === "zh-TW" ? "我知道了" : locale === "th" ? "รับทราบ" : locale === "id" ? "Saya Mengerti" : "Got It"}
                    </button>
                  </div>
                </div>
              )}

              {/* Employee Recipe Mobile Viewer Modal */}
              <AnimatePresence>
                {viewingRecipeSop && (
                  <div className="absolute inset-0 bg-slate-50 z-[100] flex flex-col animate-fade-in font-sans">
                    {/* Native App Header */}
                    <div className="bg-white text-slate-900 px-4 py-3.5 flex items-center justify-between shrink-0 border-b border-slate-100 shadow-3xs">
                      <div className="flex items-center gap-3 overflow-hidden">
                        <button 
                          onClick={() => setViewingRecipeSop(null)}
                          className="px-2.5 py-1.5 hover:bg-slate-100 text-slate-600 hover:text-slate-900 rounded-xl transition cursor-pointer border-0 flex items-center justify-center gap-1 bg-slate-50 font-extrabold text-xs shrink-0"
                        >
                          <ArrowLeft className="w-3.5 h-3.5" />
                          <span>返回</span>
                        </button>
                        <div className="text-left overflow-hidden">
                          <span className="font-black text-slate-900 text-sm tracking-tight truncate block">{viewingRecipeSop.title}</span>
                        </div>
                      </div>
                    </div>

                    {/* Native Culinary Content Area */}
                    <div className="flex-1 overflow-y-auto bg-slate-50 p-4">
                      <RecipeDocumentView sop={viewingRecipeSop} isMobile={true} />
                    </div>

                    {/* Bottom Acknowledgment Action Panel */}
                    {currentUser && viewingRecipeSop.reads && !viewingRecipeSop.reads[currentUser.id] && (
                      <div className="bg-white p-4 shrink-0 border-t border-slate-100 shadow-lg">
                        <button
                          type="button"
                          onClick={() => {
                            handleReadSop(viewingRecipeSop.id);
                            setViewingRecipeSop(null);
                          }}
                          className="w-full py-3 bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold rounded-xl text-xs transition shadow-md hover:shadow-lg flex items-center justify-center gap-1.5 cursor-pointer border-0"
                        >
                          <Check className="w-4 h-4" />
                          <span>确认签收并开始制作此菜谱</span>
                        </button>
                      </div>
                    )}
                  </div>
                )}
              </AnimatePresence>

              {/* Leave Status Change Notification Modal */}
              {leaveStatusAlerts.length > 0 && (() => {
                const alertItem = leaveStatusAlerts[0];
                const isApproved = alertItem.status === 'approved';
                return (
                  <div className="absolute inset-0 bg-black/70 backdrop-blur-xs flex items-center justify-center p-4 z-[99] animate-fade-in">
                    <div className="bg-white rounded-2xl w-full max-w-[290px] shadow-2xl p-5 border border-slate-100 flex flex-col gap-4 animate-scale-up text-left">
                      <div className="flex justify-between items-start">
                        <div className="flex items-center gap-1.5">
                          <span className="text-lg">📢</span>
                          <span className={cn(
                            "px-2 py-0.5 rounded text-[10px] font-black",
                            isApproved ? "text-emerald-700 bg-emerald-50 border border-emerald-100" : "text-rose-700 bg-rose-50 border border-rose-100"
                          )}>
                            {isApproved ? (locale === "zh-CN" || locale === "zh-TW" ? "请假已同意" : "Leave Approved") : (locale === "zh-CN" || locale === "zh-TW" ? "请假已拒绝" : "Leave Rejected")}
                          </span>
                        </div>
                        <button
                          type="button"
                          onClick={() => setLeaveStatusAlerts(prev => prev.slice(1))}
                          className="text-slate-400 hover:text-slate-600 font-bold text-lg leading-none cursor-pointer p-1"
                        >
                          ✕
                        </button>
                      </div>

                      <div className="space-y-3">
                        <div className="p-3.5 rounded-xl bg-slate-50/80 border border-slate-100 space-y-2">
                          <p className="text-xs font-black text-slate-800">
                            {locale === "zh-CN" || locale === "zh-TW" 
                              ? `您申请的【${alertItem.type}】审批结果已出` 
                              : `Your leave request for [${alertItem.type}] has been processed`
                            }
                          </p>
                          <div className="text-[10px] space-y-1 text-slate-500 font-medium">
                            <p className="flex justify-between">
                              <span>{locale === "zh-CN" || locale === "zh-TW" ? "起止日期:" : "Dates:"}</span>
                              <span className="font-mono font-semibold text-slate-700">{alertItem.startDate} ~ {alertItem.endDate}</span>
                            </p>
                            <p className="flex justify-between">
                              <span>{locale === "zh-CN" || locale === "zh-TW" ? "请假时长:" : "Duration:"}</span>
                              <span className="font-bold text-slate-700">{alertItem.days} {locale === "zh-CN" || locale === "zh-TW" ? "天" : "days"}</span>
                            </p>
                          </div>
                        </div>

                        <div className="p-3 rounded-xl border border-dashed flex items-start gap-2.5 text-xs">
                          {isApproved ? (
                            <>
                              <span className="text-xl shrink-0">🎉</span>
                              <div className="space-y-0.5">
                                <p className="font-bold text-emerald-800">
                                  {locale === "zh-CN" || locale === "zh-TW" ? "已批准您的请假申请！" : "Approved!"}
                                </p>
                                <p className="text-[10px] text-slate-400 font-medium leading-relaxed">
                                  {locale === "zh-CN" || locale === "zh-TW" 
                                    ? "系统已自动同步您的考勤状态。祝您假期愉快，出行平安！" 
                                    : "Attendance synced automatically. Enjoy your time off!"
                                  }
                                </p>
                              </div>
                            </>
                          ) : (
                            <>
                              <span className="text-xl shrink-0">⚠️</span>
                              <div className="space-y-0.5">
                                <p className="font-bold text-rose-800">
                                  {locale === "zh-CN" || locale === "zh-TW" ? "您的请假申请未被批准" : "Rejected"}
                                </p>
                                <p className="text-[10px] text-slate-400 font-medium leading-relaxed">
                                  {locale === "zh-CN" || locale === "zh-TW" 
                                    ? "如有疑问，请及时与您的直属主管或仓库负责人联系沟通。" 
                                    : "Please contact your team leader or supervisor for clarification."
                                  }
                                </p>
                              </div>
                            </>
                          )}
                        </div>
                      </div>

                      <button
                        type="button"
                        onClick={() => setLeaveStatusAlerts(prev => prev.slice(1))}
                        className={cn(
                          "w-full py-2.5 text-white font-extrabold rounded-xl text-xs transition cursor-pointer shadow-sm flex items-center justify-center gap-1.5",
                          isApproved ? "bg-emerald-600 hover:bg-emerald-700" : "bg-slate-700 hover:bg-slate-800"
                        )}
                      >
                        <span>{locale === "zh-CN" || locale === "zh-TW" ? "我知道了" : locale === "th" ? "รับทราบ" : locale === "id" ? "Saya Mengerti" : "Got It"}</span>
                      </button>
                    </div>
                  </div>
                );
              })()}

              {/* Handwriting Signature Modal */}
              {isSignatureModalOpen && (
                <div className="absolute inset-0 bg-slate-900/95 backdrop-blur-xs flex items-center justify-center p-4 z-[100] animate-fade-in select-none">
                  <div 
                    className="bg-white rounded-3xl shadow-2xl flex flex-col items-center justify-between overflow-hidden p-4 border border-slate-100 rotate-90 origin-center h-[580px] w-[290px]"
                  >
                    {/* Header */}
                    <div className="w-full flex items-center justify-between pb-2 border-b border-slate-100">
                      <div className="flex items-center gap-1.5">
                        <span className="text-sm">✍️</span>
                        <h4 className="text-xs font-black text-slate-800">
                          {locale === "zh-CN" || locale === "zh-TW" ? "请手写您的完整姓名签署" : "Please Handwrite Your Signature"}
                        </h4>
                      </div>
                      <span className="text-[9px] font-mono font-bold bg-slate-100 text-slate-500 px-1.5 py-0.5 rounded uppercase">
                        LANDSCAPE MODE
                      </span>
                    </div>

                    {/* Canvas Container */}
                    <div className="w-full flex-1 my-3 relative overflow-hidden rounded-2xl border border-slate-200 shadow-3xs bg-slate-50/50">
                      <canvas
                        ref={canvasRef}
                        width={220}
                        height={420}
                        className="w-full h-full cursor-crosshair bg-slate-50 relative z-10"
                        style={{
                          backgroundImage: "radial-gradient(#e2e8f0 1.2px, transparent 1.2px), linear-gradient(to bottom, transparent 75%, #cbd5e1 75%, #cbd5e1 75.5%, transparent 75.5%)",
                          backgroundSize: "24px 24px, 100% 100%",
                          backgroundPosition: "center, center"
                        }}
                      />
                      <div className="absolute inset-0 flex items-center justify-center pointer-events-none select-none z-0 opacity-15">
                        <span className="text-xs font-black tracking-widest text-slate-400 uppercase">
                          {locale === "zh-CN" || locale === "zh-TW" ? "在此区域手写书画姓名" : "Sign in this area"}
                        </span>
                      </div>
                    </div>

                    {/* Action Bar */}
                    <div className="w-full flex items-center justify-between pt-2 gap-3 border-t border-slate-100">
                      <p className="text-[9px] text-slate-400 font-medium leading-tight max-w-[55%]">
                        {locale === "zh-CN" || locale === "zh-TW"
                          ? "请点击并拖动进行书写，完成后点击“保存签署”"
                          : "Drag to write. Tap Save to apply."}
                      </p>
                      
                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() => {
                            const canvas = canvasRef.current;
                            if (canvas) {
                              const ctx = canvas.getContext("2d");
                              ctx?.clearRect(0, 0, canvas.width, canvas.height);
                            }
                          }}
                          className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-lg text-[10px] font-extrabold transition cursor-pointer"
                        >
                          {locale === "zh-CN" || locale === "zh-TW" ? "清除" : "Clear"}
                        </button>
                        
                        <button
                          type="button"
                          onClick={() => setIsSignatureModalOpen(false)}
                          className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-lg text-[10px] font-extrabold transition cursor-pointer"
                        >
                          {locale === "zh-CN" || locale === "zh-TW" ? "取消" : "Cancel"}
                        </button>
                        
                        <button
                          type="button"
                          onClick={() => {
                            const canvas = canvasRef.current;
                            if (!canvas) return;
                            
                            // Check if canvas is blank
                            const ctx = canvas.getContext("2d");
                            if (ctx) {
                              const buffer = new Uint32Array(ctx.getImageData(0, 0, canvas.width, canvas.height).data.buffer);
                              const isBlank = !buffer.some(color => color !== 0);
                              if (isBlank) {
                                addToast(locale === "zh-CN" || locale === "zh-TW" ? "请先在画板上进行手写签署！" : "Please sign first!");
                                return;
                              }
                            }
                            
                            const dataUrl = canvas.toDataURL("image/png");
                            setEmployeeSignName(dataUrl);
                            setIsSignatureModalOpen(false);
                            addToast(locale === "zh-CN" || locale === "zh-TW" ? "✍️ 手写签名录入成功！" : "✍️ Signature recorded!");
                          }}
                          className="px-4 py-1.5 bg-brand-600 hover:bg-brand-700 text-white rounded-lg text-[10px] font-extrabold shadow-xs transition cursor-pointer"
                        >
                          {locale === "zh-CN" || locale === "zh-TW" ? "保存签署" : "Save Signature"}
                        </button>
                      </div>
                    </div>

                  </div>
                </div>
              )}

              {/* Cancel Expense Form Confirmation Modal */}
              {showCancelConfirm && (
                <div className="absolute inset-0 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 z-[99] animate-fade-in">
                  <div className="bg-white rounded-2xl w-full max-w-xs shadow-xl p-5 border border-slate-100 flex flex-col items-center text-center gap-4 animate-scale-up">
                    <div className="w-12 h-12 rounded-full bg-rose-50 flex items-center justify-center text-rose-500 border border-rose-100">
                      <svg className="w-6 h-6" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                      </svg>
                    </div>
                    
                    <div className="space-y-1.5">
                      <h4 className="text-sm font-black text-slate-800">
                        {locale === "zh-CN" ? "是否放弃本次添加？" : locale === "zh-TW" ? "是否放棄本次添加？" : "Discard Changes?"}
                      </h4>
                      <p className="text-[11px] text-slate-500 font-medium leading-relaxed px-1">
                        {locale === "zh-CN" 
                          ? "您已填写了部分报销信息，退出后当前输入的内容将不会被保存。" 
                          : locale === "zh-TW" 
                          ? "您已填寫了部分報銷信息，退出後當前輸入的内容將不會被保存。" 
                          : "You have filled out some reimbursement details. Leaving now will discard all your input."}
                      </p>
                    </div>
                    
                    <div className="w-full flex flex-col gap-2">
                      <button
                        type="button"
                        onClick={() => setShowCancelConfirm(false)}
                        className="w-full py-2.5 bg-brand-600 hover:bg-brand-700 text-white font-extrabold rounded-xl text-xs transition cursor-pointer"
                      >
                        {locale === "zh-CN" ? "继续编辑" : locale === "zh-TW" ? "繼續編輯" : "Continue Editing"}
                      </button>
                      <button
                        type="button"
                        onClick={handleCancelExpense}
                        className="w-full py-2.5 border border-slate-200 text-slate-600 hover:bg-slate-50 font-extrabold rounded-xl text-xs transition cursor-pointer"
                      >
                        {locale === "zh-CN" ? "放弃并返回" : locale === "zh-TW" ? "放棄並返回" : "Discard & Exit"}
                      </button>
                    </div>
                  </div>
                </div>
              )}

              {/* Expense actions inner-app confirmation modal (Recall/Edit/Delete) */}
              {showExpenseActionConfirm && (
                <div className="absolute inset-0 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 z-[99] animate-fade-in">
                  <div className="bg-white rounded-2xl w-full max-w-xs shadow-xl p-5 border border-slate-100 flex flex-col items-center text-center gap-4 animate-scale-up">
                    <div className="w-12 h-12 rounded-full bg-rose-50 flex items-center justify-center text-rose-500 border border-rose-100">
                      <svg className="w-6 h-6" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                      </svg>
                    </div>
                    
                    <div className="space-y-1.5">
                      <h4 className="text-sm font-black text-slate-800">
                        {showExpenseActionConfirm.type === 'recall' && (locale === "zh-CN" ? "确认撤回报销单吗？" : locale === "zh-TW" ? "確認撤回報銷單嗎？" : "Confirm Recall?")}
                        {showExpenseActionConfirm.type === 'edit' && (locale === "zh-CN" ? "确认重新编辑吗？" : locale === "zh-TW" ? "確認重新編輯嗎？" : "Confirm Re-edit?")}
                        {showExpenseActionConfirm.type === 'delete' && (locale === "zh-CN" ? "确认删除报销单吗？" : locale === "zh-TW" ? "確認刪除報銷單嗎？" : "Confirm Delete?")}
                      </h4>
                      <p className="text-[11px] text-slate-500 font-medium leading-relaxed px-1">
                        {showExpenseActionConfirm.type === 'recall' && (
                          locale === "zh-CN" 
                            ? "撤回后审批流程将被中止，报销单会恢复为已撤回状态，您可以重新编辑修改内容。" 
                            : locale === "zh-TW"
                            ? "撤回後審批流程將被中止，報銷單會恢復為已撤回狀態，您可以重新編輯修改内容。"
                            : "Recalling this expense report will pause the approval process and set its status to recalled, allowing you to edit and resubmit."
                        )}
                        {showExpenseActionConfirm.type === 'edit' && (
                          locale === "zh-CN" 
                            ? "重新编辑将会加载该报销单的内容，允许您修改后重新提交审批。" 
                            : locale === "zh-TW"
                            ? "重新編輯將會加載該報銷單的內容，允許您修改後重新提交審批。"
                            : "Re-editing will load this expense report into the form and reset its status to pending upon resubmission."
                        )}
                        {showExpenseActionConfirm.type === 'delete' && (
                          locale === "zh-CN" 
                            ? "删除操作不可撤销，确认要彻底删除该报销单吗？" 
                            : locale === "zh-TW"
                            ? "刪除操作不可撤銷，確認要徹底刪除該報銷單嗎？"
                            : "Deleting this expense record is irreversible. Are you sure you want to delete it?"
                        )}
                      </p>
                    </div>
                    
                    <div className="w-full flex flex-col gap-2">
                      <button
                        type="button"
                        onClick={() => {
                          const { type, expense } = showExpenseActionConfirm;
                          setShowExpenseActionConfirm(null);
                          if (type === 'recall') {
                            handleRecallExpense(expense.id);
                          } else if (type === 'edit') {
                            handleStartEdit(expense);
                          } else if (type === 'delete') {
                            handleDeleteExpense(expense.id);
                          }
                        }}
                        className="w-full py-2.5 bg-rose-600 hover:bg-rose-700 text-white font-extrabold rounded-xl text-xs transition cursor-pointer"
                      >
                        {locale === "zh-CN" ? "确认执行" : locale === "zh-TW" ? "確認執行" : "Confirm"}
                      </button>
                      <button
                        type="button"
                        onClick={() => setShowExpenseActionConfirm(null)}
                        className="w-full py-2.5 border border-slate-200 text-slate-600 hover:bg-slate-50 font-extrabold rounded-xl text-xs transition cursor-pointer bg-white"
                      >
                        {locale === "zh-CN" ? "取消" : locale === "zh-TW" ? "取消" : "Cancel"}
                      </button>
                    </div>
                  </div>
                </div>
              )}

            </div>

            {/* Bottom Bar indicator */}
            <div className="h-5 bg-white w-full flex items-center justify-center pb-2 select-none z-40">
              <div className="w-28 h-1 bg-slate-300 rounded-full"></div>
            </div>

          </div>

        </div>
      </div>

    </div>
  );
}
