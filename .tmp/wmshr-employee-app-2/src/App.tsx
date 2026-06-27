/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, Component, useRef } from 'react';
import { 
  Home, 
  ClipboardCheck, 
  FileText, 
  User, 
  MapPin, 
  CheckCircle2, 
  Bell, 
  ChevronRight,
  Settings,
  ShieldCheck,
  LogOut,
  Timer,
  RefreshCw,
  Globe,
  ChevronDown,
  Edit,
  X,
  Check,
  Camera,
  Trash2,
  Image as ImageIcon,
  ChevronLeft,
  Calendar,
  AlertCircle,
  AlertTriangle,
  Phone,
  Shield,
  Clock,
  CheckSquare,
  Square
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

interface ErrorBoundaryProps {
  children: React.ReactNode;
}

interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
}

class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    // @ts-ignore
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error) {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error("ErrorBoundary caught an error", error, errorInfo);
  }

  render() {
    // @ts-ignore
    if (this.state.hasError) {
      return (
        <div style={{ padding: '24px', background: '#fef2f2', color: '#991b1b', fontFamily: 'monospace', minHeight: '100vh' }}>
          <h2 style={{ fontSize: '18px', fontWeight: 'bold', marginBottom: '8px' }}>应用渲染出现异常 (Application Render Error)</h2>
          {/* @ts-ignore */}
          <p style={{ fontSize: '14px', marginBottom: '16px' }}>{this.state.error?.toString()}</p>
          <pre style={{ fontSize: '12px', background: '#fee2e2', padding: '12px', borderRadius: '8px', overflowX: 'auto' }}>
            {/* @ts-ignore */}
            {this.state.error?.stack}
          </pre>
        </div>
      );
    }

    // @ts-ignore
    return this.props.children;
  }
}

// --- Types ---
type Page = 'home' | 'attendance' | 'sop' | 'mine';

interface LeaveRecord {
  id: number;
  type: 'personal' | 'sick' | 'annual' | 'special';
  startDate: string;
  endDate: string;
  days: number;
  reason: string;
  status: 'pending' | 'approved' | 'rejected';
}

interface CheckInData {
  status: 'none' | 'in' | 'out';
  inTime: string | null;
  outTime: string | null;
  gps: string;
}

interface AttendanceRecord {
  date: string;
  in: string;
  out: string;
  type: 'normal' | 'overtime';
  hours: string;
}

interface SOP {
  id: number;
  title: string;
  ver: string;
  date: string;
  read: boolean;
}

type Lang = 'zh' | 'en' | 'th';

const localeMap = {
  zh: 'zh-CN',
  en: 'en-US',
  th: 'th-TH'
};

const t = {
  zh: {
    appName: 'WMSHR 客户端',
    home: '首页',
    attendance: '考勤请假',
    leave: '请假',
    leaveTitle: '我的假单',
    leaveHistory: '请假历史记录',
    applyLeave: '提交请假申请',
    leaveType: '请假类别',
    startDate: '开始日期',
    endDate: '结束日期',
    leaveReason: '请假原因',
    leaveStatus: '审批状态',
    reasonPlaceholder: '请输入具体的请假事由（例如：突发感冒就医、家中有事处理等）...',
    submitSuccess: '请假申请提交成功，请等待主管与HR审批',
    typePersonal: '事假',
    typeSick: '病假',
    typeAnnual: '年假',
    typeSpecial: '特殊假/其它',
    statusPending: '审批中',
    statusApproved: '已批准',
    statusRejected: '已拒绝',
    totalDays: '天',
    duration: '请假时长',
    btnSubmit: '提交申请',
    btnCancel: '取消',
    leaveHours: '本月已请假',
    leaveDaysLabel: '天',
    sop: 'SOP',
    mine: '我的',
    goodAfternoon: '语言切换',
    systemTime: '系统时间',
    active: '在勤中',
    completed: '已完成',
    noRecord: '未打卡',
    clockIn: '上班时间',
    clockOut: '下班时间',
    bangkokWh: '曼谷 Warehouse A · 精度 3.2m',
    btnClockIn: '上班打卡',
    btnClockOut: '下班打卡',
    btnCompleted: '今日已下班',
    monthlyHours: '本月工时',
    attendedDays: '出勤天数',
    pendingSOPs: '待办SOP',
    sysNotice: '系统通知',
    viewAll: '查看全部',
    notice1Title: '仓库消防演练通知',
    notice1Desc: '本周五下午 14:00 全员参与...',
    notice2Title: '4月工资条已生成',
    notice2Desc: '请前往个人中心查看详情...',
    attendanceLog: '考勤流水',
    normal: '常规',
    overtime: '加班',
    sopTitle: '作业规范',
    sop1Title: '仓库安全操作规范',
    sop2Title: '拣货作业标准流程',
    sop3Title: '叉车安全驾驶指南',
    updatedAt: '更新于',
    dept: 'A区-入库部门',
    hrManageTitle: '员工头像后台管理模拟',
    hrManageDesc: '模拟HR后台系统的行为。你可以上传本地照片，或者直接一键加载默认的高级头像资源进行预览。',
    btnPreset: '一键设置头像',
    btnRestore: '恢复首字母显示',
    lblUpload: '上传真实本地照片测试',
    lblAttendanceRate: '出勤率',
    lblExceptions: '异常',
    lblOvertimeHours: '加班',
    lblUpdateApp: '更新应用',
    lblPrivacyPolicy: '隐私策略',
    btnLogout: '退出登录',
    statusResetDemo: '已重置状态 (演示)',
    avatarSuccess: '头像更新成功',
    avatarLoaded: '已加载推荐内置头像',
    avatarCleared: '头像已清除，已恢复为首字母显示',
    clockInSuccess: '上班打卡成功',
    clockOutSuccess: '下班打卡成功',
    previewDoc: '预览文档: ',
    safeLogout: '已安全登出',
    switchLang: '系统多语言设置',
    avatarPhotoLabel: '头像照片',
    tapToChange: '点击编辑更改',
    editAvatarTitle: '编辑更换头像',
    uploadLocal: '从本地相册上传',
    usePreset: '使用推荐内置头像',
    clearPhoto: '恢复成首字母显示',
    closeModal: '取消',
    langZh: '简体中文',
    langEn: 'English',
    langTh: 'ไทย',
    sopBack: '返回上一级',
    sopOverview: '概述',
    sopGuidelines: '核心作业准则',
    sopChecklist: '自查确认步骤 (请逐一确认完成)',
    sopWarning: '特级警告 & 红线提示',
    sopCompleteBtn: '我已认真阅读并确认遵守此作业规范',
    sopCompleteSuccess: '已成功确认学习本项作业规范！',
    sopToRead: '待学习',
    sopRead: '已掌握',
    statusNotClockedIn: '今天未完成',
    statusClockedIn: '今天已完成',
    statusMissedClockIn: '今天漏打卡',
    statusLate: '今天迟到',
    statusLeftEarly: '今天早退',
    statusNotClockedInDesc: '您今天尚未登记考勤，请及时打卡记录工时避免缺勤',
    statusClockedInDesc: '您今天已完成两次打卡（标准工时 09:00 - 18:00），状态良好',
    statusMissedClockInDesc: '系统检测到您漏刷考勤卡（缺少上班或下班记录），请提交补卡申请',
    statusLateDesc: '您今天上班时间晚于 09:00，属于迟到状态，请注意后续出勤时间',
    statusLeftEarlyDesc: '您今天在 18:00 之前刷卡下班，属于早退状态，请确认无误',
    attendanceStatusTitle: '今日考勤状态',
    simulationControl: '考勤状态模拟',
    noticeDetailTitle: '通知详情',
    noticeSender: '发布部门',
    noticeTime: '发布时间',
    btnUnderstand: '我知道了',
    payslipDailyReqHours: '每天需要上班的工时：',
    payslipEffDays: '本月有效出勤天数：',
    payslipCumHours: '本月累计上班工时：',
    payslipEffOTHours: '本月有效加班工时：',
    payslipCalcDesc: '应纳发计算说明',
    payslipStdWageText: '标准工时工资',
    payslipOTEarnText: '加班应得',
    payslipMealText: '餐补',
    payslipMealConvert: '折算 {days} 天 × ฿{amount}',
    payslipFullBonus: '全勤奖',
    payslipServiceCharge: '服务费 12.00%',
    payslipSocialSec: '社保扣款',
    payslipBottomNote: '派遣人员社保按本月有效出勤天数计算，员工档案中的社保金按每日金额使用。',
    payslipActualPosedValue: '本月实际应发放',
    payslipCurrencyText: '发放币种：THB',
    btnConfirmPayslip: '确认',
    btnRejectPayslip: '驳回',
    payslipStatusPending: '待核对',
    payslipStatusConfirmed: '已确认',
    payslipStatusRejected: '已驳回',
    payslipSuccessToast: '工资条已确认！',
    payslipRejectToast: '工资条已驳回，人力资源部门会尽快与您联系。',
  },
  en: {
    appName: 'WMSHR Client',
    home: 'Home',
    attendance: 'Attendance & Leave',
    leave: 'Leave',
    leaveTitle: 'Leave Requests',
    leaveHistory: 'Leave History',
    applyLeave: 'Submit Leave Application',
    leaveType: 'Leave Type',
    startDate: 'Start Date',
    endDate: 'End Date',
    leaveReason: 'Leave Reason',
    leaveStatus: 'Status',
    reasonPlaceholder: 'Please describe the leave reason in detail...',
    submitSuccess: 'Leave request submitted successfully! Awaiting approval.',
    typePersonal: 'Personal',
    typeSick: 'Sick',
    typeAnnual: 'Annual',
    typeSpecial: 'Special/Other',
    statusPending: 'Pending',
    statusApproved: 'Approved',
    statusRejected: 'Rejected',
    totalDays: 'Days',
    duration: 'Duration',
    btnSubmit: 'Submit Request',
    btnCancel: 'Cancel',
    leaveHours: 'Leave Days This Month',
    leaveDaysLabel: 'days',
    sop: 'SOP',
    mine: 'Profile',
    goodAfternoon: 'Language Switch',
    systemTime: 'SYSTEM TIME',
    active: 'In-service',
    completed: 'Completed',
    noRecord: 'No Record',
    clockIn: 'CLOCK IN',
    clockOut: 'CLOCK OUT',
    bangkokWh: 'Bangkok Warehouse A · Acc 3.2m',
    btnClockIn: 'CLOCK IN',
    btnClockOut: 'CLOCK OUT',
    btnCompleted: 'COMPLETED TODAY',
    monthlyHours: 'MONTHLY HOURS',
    attendedDays: 'DAYS ATTENDED',
    pendingSOPs: 'PENDING SOPS',
    sysNotice: 'Notifications',
    viewAll: 'View All',
    notice1Title: 'Warehouse Fire Drill Notice',
    notice1Desc: 'Friday 14:00. All staff must participate...',
    notice2Title: 'April Payslip Generated',
    notice2Desc: 'Please check your Profile for details...',
    attendanceLog: 'Attendance Log',
    normal: 'Normal',
    overtime: 'Overtime',
    sopTitle: 'Operating Standards',
    sop1Title: 'Warehouse Safety Procedures',
    sop2Title: 'Standard Picking Process',
    sop3Title: 'Forklift Safety Driving Guide',
    updatedAt: 'Updated',
    dept: 'Zone A - Inbound Dept',
    hrManageTitle: 'Avatar Management Simulation',
    hrManageDesc: 'Simulate HR system actions. You can upload local photos, or directly set a recommended preset avatar for instant preview.',
    btnPreset: 'Set Preset Avatar',
    btnRestore: 'Reset to Initial',
    lblUpload: 'Upload Local Photo to Test',
    lblAttendanceRate: 'Attendance Rate',
    lblExceptions: 'Exceptions',
    lblOvertimeHours: 'Overtime',
    lblUpdateApp: 'Update Application',
    lblPrivacyPolicy: 'Privacy Policy',
    btnLogout: 'Logout',
    statusResetDemo: 'Status reset (Demo)',
    avatarSuccess: 'Avatar updated successfully',
    avatarLoaded: 'Recommended avatar loaded',
    avatarCleared: 'Avatar cleared, back to initials',
    clockInSuccess: 'Clock in successful',
    clockOutSuccess: 'Clock out successful',
    previewDoc: 'Previewing SOP: ',
    safeLogout: 'Logged out safely',
    switchLang: 'Language Settings',
    avatarPhotoLabel: 'Avatar Photo',
    tapToChange: 'Click to upload/change',
    editAvatarTitle: 'Edit Avatar Photo',
    uploadLocal: 'Upload from Album',
    usePreset: 'Use Recommended Preset',
    clearPhoto: 'Reset to Initial Letter',
    closeModal: 'Cancel',
    langZh: '简体中文',
    langEn: 'English',
    langTh: 'ไทย',
    sopBack: 'Back to List',
    sopOverview: 'Overview',
    sopGuidelines: 'Core Directives',
    sopChecklist: 'Step Self-Checklist (Complete All)',
    sopWarning: 'Emergency & Safety Redlines',
    sopCompleteBtn: 'I Have Reviewed & Will Adhere to SOP',
    sopCompleteSuccess: 'SOP training confirmed and logs registered!',
    sopToRead: 'To Read',
    sopRead: 'Mastered',
    statusNotClockedIn: 'Incomplete Today',
    statusClockedIn: 'Completed Today',
    statusMissedClockIn: 'Missed Clock-In/Out',
    statusLate: 'Late Attendance',
    statusLeftEarly: 'Early Departure',
    statusNotClockedInDesc: 'You have not clocked in today. Please check in to record your shift.',
    statusClockedInDesc: 'You have completed both clock-in and clock-out cycles perfectly today.',
    statusMissedClockInDesc: 'System detected a missing card record. Please apply for a correction.',
    statusLateDesc: 'Clock-in time was after 09:00, marked as Late. Please check your schedule.',
    statusLeftEarlyDesc: 'Clock-out time was before 18:00, marked as Left Early. Please confirm.',
    attendanceStatusTitle: 'Today\'s Attendance',
    simulationControl: 'Simulation Setup',
    noticeDetailTitle: 'Notice Details',
    noticeSender: 'Department',
    noticeTime: 'Date Posted',
    btnUnderstand: 'Got it',
    payslipDailyReqHours: 'Daily Required Hours:',
    payslipEffDays: 'Effective Attended Days:',
    payslipCumHours: 'Cumulative Worked Hours:',
    payslipEffOTHours: 'Effective Overtime Hours:',
    payslipCalcDesc: 'Taxable Earnings Calculation',
    payslipStdWageText: 'Standard Hours Wage',
    payslipOTEarnText: 'Overtime Pay',
    payslipMealText: 'Meal Subsidy',
    payslipMealConvert: 'converted {days} days × ฿{amount}',
    payslipFullBonus: 'Perfect Attd. Bonus',
    payslipServiceCharge: 'Service Fee 12.00%',
    payslipSocialSec: 'Social Security Ded.',
    payslipBottomNote: 'Social security for dispatched workers is computed by effective attendance days. The rate in profile runs daily.',
    payslipActualPosedValue: 'Actual Net Issued Pay',
    payslipCurrencyText: 'Payout Currency: THB',
    btnConfirmPayslip: 'Confirmed',
    btnRejectPayslip: 'Dispute / Reject',
    payslipStatusPending: 'To Verify',
    payslipStatusConfirmed: 'Confirmed',
    payslipStatusRejected: 'Disputed',
    payslipSuccessToast: 'Payslip successfully verified and signed!',
    payslipRejectToast: 'Payslip verification rejected. HR team notified!',
  },
  th: {
    appName: 'WMSHR ไคลเอนต์',
    home: 'หน้าแรก',
    attendance: 'เข้างาน/ลา',
    leave: 'การลา',
    leaveTitle: 'รายการขอลา',
    leaveHistory: 'ประวัติการลา',
    applyLeave: 'ยื่นพิจารณาขอใบลา',
    leaveType: 'ประเภทการลา',
    startDate: 'วันที่เริ่มต้น',
    endDate: 'วันที่สิ้นสุด',
    leaveReason: 'ระบุเหตุผลการลา',
    leaveStatus: 'สถานะสมัคร',
    reasonPlaceholder: 'โปรดระบุรายละเอียดเหตุผล (เช่น รู้สึกมีไข้ไม่สบาย, ไปจัดการธุระด่วนที่บ้าน)...',
    submitSuccess: 'ยื่นอนุมัติการลาเสร็จสมบูรณ์! รอฝ่ายบุคคลตรวจสอบ',
    typePersonal: 'ลากิจ',
    typeSick: 'ลาป่วย',
    typeAnnual: 'ลาพักร้อน',
    typeSpecial: 'ลาพิเศษ/อื่นๆ',
    statusPending: 'รอตรวจสอบ',
    statusApproved: 'อนุมัติแล้ว',
    statusRejected: 'ปฏิเสธ',
    totalDays: 'วัน',
    duration: 'ระยะเวลาลา',
    btnSubmit: 'ยื่นใบคำขอ',
    btnCancel: 'ยกเลิก',
    leaveHours: 'วันลาในเดือนนี้',
    leaveDaysLabel: 'วัน',
    sop: 'SOP',
    mine: 'ข้อมูลของฉัน',
    goodAfternoon: 'ตั้งค่าภาษา',
    systemTime: 'เวลาในระบบ',
    active: 'กำลังเข้างาน',
    completed: 'ทำงานเสร็จสิ้น',
    noRecord: 'ยังไม่ลงเวลา',
    clockIn: 'เวลาเข้างาน',
    clockOut: 'เวลาเลิกงาน',
    bangkokWh: 'คลังสินค้ากรุงเทพโซน A · แม่นยำ 3.2ม.',
    btnClockIn: 'ลงเวลาเข้างาน',
    btnClockOut: 'ลงเวลาเลิกงาน',
    btnCompleted: 'วันนี้เลิกงานแล้ว',
    monthlyHours: 'ชั่วโมงงานเดือนนี้',
    attendedDays: 'วันเข้างาน',
    pendingSOPs: 'SOP รออ่าน',
    sysNotice: 'ประกาศระเบียบระบบ',
    viewAll: 'ดูทั่งหมด',
    notice1Title: 'ประกาศซ้อมดับเพลิงคลังสินค้า',
    notice1Desc: 'บ่ายวันศุกร์นี้ 14:00 น. พนักงานทุกคนจะต้องเข้าร่วม...',
    notice2Title: 'สลิปเงินเดือนเดือนเมษายนพร้อมแล้ว',
    notice2Desc: 'โปรดไปที่ศูนย์บุคคลรายละเอียดคลังเพื่อตรวจสอบ...',
    attendanceLog: 'บันทึกเข้าเลิกงาน',
    normal: 'เวลาปกติ',
    overtime: 'ล่วงเวลา (OT)',
    sopTitle: 'มาตรฐานปฏิบัติการ (SOP)',
    sop1Title: 'กฎระเบียบความปลอดภัยในคลังสินค้า',
    sop2Title: 'มาตรฐานขั้นตอนการเลือกและหยิบจัดส่ง',
    sop3Title: 'คู่มือการขับขี่รถยกพาเลทความปลอดภัย',
    updatedAt: 'อัปเดตระบบเมื่อ',
    dept: 'โซน A - แผนกขาเข้า',
    hrManageTitle: 'แผงควบคุมทดลองระบบรูปโปรไฟล์',
    hrManageDesc: 'จำลองระบบการกระทำของฝ่ายบุคคล คุณสามารถอัปโหลดรูปภาพจริง หรือจะใช้รูปถ่ายเสมือนจริงระดับพรีเมียมที่เตรียมไว้ให้ด่วนก็ได้',
    btnPreset: 'โหลดภาพโปร์ไฟล์เทมเพลต',
    btnRestore: 'เปลี่ยนกลับเป็นชื่อเริ่มต้น',
    lblUpload: 'อัปโหลดรูปภาพจริงการทดสอบ',
    lblAttendanceRate: 'อัตราเข้างาน',
    lblExceptions: 'ผิดปกติ',
    lblOvertimeHours: 'ชั่วโมงล่วงเวลา',
    lblUpdateApp: 'อัปเดตแอปพลิเคชัน',
    lblPrivacyPolicy: 'นโยบายความเป็นส่วนตัว',
    btnLogout: 'ออกจากระบบ',
    statusResetDemo: 'รีเซ็ตสถานะจำลองเรียบร้อย',
    avatarSuccess: 'อัปเดตรูปประจำตัวพนักงานเรียบร้อย',
    avatarLoaded: 'ประมวลผลอัปเดตภาพโปร์ไฟล์เริ่มต้นสำเร็จ',
    avatarCleared: 'ล้างค่ารูปประจำตัว กลับเป็นชื่อย่อเรียบร้อย',
    clockInSuccess: 'ลงชื่อเข้างานเสร็จสิ้น',
    clockOutSuccess: 'ลงชื่อเลิกงานเสร็จสิ้น',
    previewDoc: 'ตัวอย่างตรวจสอบคู่มือ: ',
    safeLogout: 'ออกจากระบบความปลอดภัยแล้ว',
    switchLang: 'ตั้งค่าภาษา / Language',
    avatarPhotoLabel: 'รูปประจำตัว',
    tapToChange: 'คลิกเพื่อแก้ไขรูป',
    editAvatarTitle: 'แก้ไขรูปประจำตัว',
    uploadLocal: 'อัปโหลดภาพจากมือถือ',
    usePreset: 'ใช้รูปประจำตัวเริ่มต้น',
    clearPhoto: 'เปลี่ยนกลับเป็นอักษรย่อ',
    closeModal: 'ยกเลิก',
    langZh: '简体中文',
    langEn: 'English',
    langTh: 'ไทย',
    sopBack: 'ย้อนกลับ',
    sopOverview: 'ภาพรวมของมาตรฐาน',
    sopGuidelines: 'คำสั่งและแนวทางปฏิบัติขั้นสำคัญ',
    sopChecklist: 'รายการประเมินตรวจเช็กด้วยตนเอง (คลิกให้ครบ)',
    sopWarning: 'ประกาศแจ้งเตือนด่วน & ข้อห้ามเด็ดขาด',
    sopCompleteBtn: 'ฉันได้ทบทวนและสัญญาว่าจะปฏิบัติตามมาตรฐานนี้',
    sopCompleteSuccess: 'ลงบันทึกการอบรมและการเรียนรู้คู่มือเรียบร้อย!',
    sopToRead: 'ยังไม่อ่าน',
    sopRead: 'เข้าใจแล้ว',
    statusNotClockedIn: 'วันนี้ยังไม่เสร็จสิ้น',
    statusClockedIn: 'วันนี้เสร็จสิ้นแล้ว',
    statusMissedClockIn: 'วันนี้ลืมลงเวลาเข้า/ออก',
    statusLate: 'วันนี้เข้างานสาย',
    statusLeftEarly: 'วันนี้เลิกงานก่อนเวลา',
    statusNotClockedInDesc: 'คุณยังไม่ได้บันทึกเวลาทำงานในวันนี้ โปรดกดลงเวลาให้เรียบร้อยเพื่อบันทึกประวัติ',
    statusClockedInDesc: 'คุณลงเวลาเข้าและออกงานเรียบร้อยสมบูรณ์แล้วในวันนี้ ขอบคุณที่ตั้งใจทำงาน',
    statusMissedClockInDesc: 'ตรวจพบว่าละเลยการลงชื่อเข้าหรืองาน โปรดยื่นคำร้องเพื่อปรับปรุงข้อมูล',
    statusLateDesc: 'คุณลงเวลาหลังจาก 09:00 น. ซึ่งถือเป็นการเข้าสาย โปรดรักษาเวลาทำงาน',
    statusLeftEarlyDesc: 'คุณลงชื่อออกงานก่อนเวลา 18:00 น. ซึ่งถือเป็นเบิกงานก่อนกำหนด',
    attendanceStatusTitle: 'สถานะเข้างานวันนี้',
    simulationControl: 'จำลองสถานะเข้างาน',
    noticeDetailTitle: 'รายละเอียดประกาศ',
    noticeSender: 'หน่วยงานที่ออก',
    noticeTime: 'วันที่โพสต์',
    btnUnderstand: 'รับทราบแล้ว',
    payslipDailyReqHours: 'เวลาทำงานปกติที่ต้องการต่อวัน:',
    payslipEffDays: 'จำนวนวันเข้างานในเดือนนี้:',
    payslipCumHours: 'ชั่วโมงทำงานสะสมในเดือนนี้:',
    payslipEffOTHours: 'ชั่วโมงทำงานล่วงเวลาสะสม:',
    payslipCalcDesc: 'คำอธิบายสรุปยอดรายได้สุทธิเพื่อการจ่ายเงินเดือน',
    payslipStdWageText: 'ค่าจ้างชั่วโมงปกติ',
    payslipOTEarnText: 'สิทธิประโยชน์จากโอที',
    payslipMealText: 'เงินช่วยเหลือค่าอาหาร',
    payslipMealConvert: 'คำนวณ {days} วัน × ฿{amount}',
    payslipFullBonus: 'เงินรางวัลจูงใจเบี้ยขยัน',
    payslipServiceCharge: 'ค่าตอบแทนบริการเสริม 12.00%',
    payslipSocialSec: 'ค่าประกันสังคมหักออก',
    payslipBottomNote: 'ประกันสังคมสำหรับพนักงานซับคอนแทรคคำนวณตามจำนวนวันที่ปฏิบัติงานจริง ค่าประกันสังคมในแฟ้มประวัติจะคำนวณเป็นแบบรายวัน',
    payslipActualPosedValue: 'จำนวนเงินสุทธิที่จะออกจริงประจำเดือนนี้',
    payslipCurrencyText: 'สกุลเงินผู้รับจ่าย: THB',
    btnConfirmPayslip: 'ยืนยันถูกต้อง',
    btnRejectPayslip: 'ทักท้วง (ปฏิเสธ)',
    payslipStatusPending: 'รอตรวจทาน',
    payslipStatusConfirmed: 'ยืนยันแล้ว',
    payslipStatusRejected: 'ยื่นคัดค้าน',
    payslipSuccessToast: 'คุณระบุยืนยันข้อมูลรายการเงินเดือนถูกต้องเรียบร้อยแล้ว!',
    payslipRejectToast: 'คุณระบุทักท้วงรายการสำเร็จแล้ว ฝ่ายทรัพยากรบุคคลจะติดต่อกลับโดยด่วน',
  }
};

// --- Components ---

const TabBar = ({ current, onNav, lang }: { current: Page, onNav: (page: Page) => void, lang: Lang }) => {
  const tabs: { id: Page; label: string; icon: typeof Home }[] = [
    { id: 'home', label: t[lang].home, icon: Home },
    { id: 'attendance', label: t[lang].attendance, icon: ClipboardCheck },
    { id: 'sop', label: t[lang].sop, icon: FileText },
    { id: 'mine', label: t[lang].mine, icon: User },
  ];

  return (
    <div className="fixed bottom-0 left-0 right-0 max-w-md mx-auto h-20 bg-white/85 backdrop-blur-2xl border-t border-slate-100 flex justify-around items-center z-40 px-2 pb-2">
      {tabs.map((tab) => {
        const isActive = current === tab.id;
        return (
          <button 
            key={tab.id}
            onClick={() => onNav(tab.id)}
            className={`flex flex-col items-center gap-1 transition-all duration-300 flex-1 ${isActive ? 'text-blue-600 scale-105' : 'text-slate-400 hover:text-slate-500'}`}
          >
            <tab.icon size={22} strokeWidth={isActive ? 2.5 : 2} />
            <span className="text-[10px] font-bold uppercase tracking-wider">{tab.label}</span>
            {isActive && (
              <motion.div 
                layoutId="tab-dot"
                className="w-1 h-1 bg-blue-600 rounded-full mt-0.5"
              />
            )}
          </button>
        );
      })}
    </div>
  );
};

interface SopDetail {
  overview: string;
  guidelines: string[];
  steps: { text: string; sub?: string }[];
  warning: string;
}

const SOP_DETAILS_DATA: Record<Lang, Record<number, SopDetail>> = {
  zh: {
    1: {
      overview: '本规范作为WMS仓储中心全员日常作业的安全基准，旨在最大程度降低货损率，确保人身生命安全与消防安全，规范所有现场行为。',
      guidelines: [
        '进入仓储作业区域必须穿着防砸安全鞋、高亮反光背心。',
        '严禁在非吸烟区吸烟、携带易燃易爆或违禁物品进入作业区。',
        '高空堆梯、周转箱堆码高度严禁超过 1.8 米，确保安全承重范围。',
        '随时保持安全通道、消防消火栓及配电箱前 1 米范围内无任何障碍堆积物。'
      ],
      steps: [
        { text: '班前考勤与个人防护穿戴双重自查', sub: '确保劳保用品齐全，背心拉链扣好' },
        { text: '现场安全消防巡检，确认疏散出口畅通', sub: '发现通道堆堵必须立即清理并反馈' },
        { text: '设备通电预检，查看是否有电源裸露及漏水点', sub: '如遇电路不正常必须挂牌停用并报修' },
        { text: '作业完成后的断电清扫、垃圾分类与工位整理', sub: '物归原位，5S现场确认签字' }
      ],
      warning: '【紧急响应】若发生消防险情，请立即按下就近红色报警器，并拨打库区消防热线：02-123-4567 分机 119 撤离。'
    },
    2: {
      overview: '拣货作业流程（Picking Process）是决定仓库交单时效的灵魂，通过对路径、货位、批量拣选逻辑的精确遵循，达到“零差错、高速率”的标准。',
      guidelines: [
        '必须使用PDA扫描设备扫除条码，严禁无单盲拣、凭记忆拿货。',
        '在拣选液体、易碎品时，必须与笨重钢性货物进行物理隔离包装。',
        '实行“先进先出 (FIFO)”和“批次控制”，防止临效期物资沉淀库底。',
        '多单合流拣选（Cluster Picking）严禁跨箱投掷货物，必须轻拿轻放。'
      ],
      steps: [
        { text: '登录PDA，根据任务池规则领取当前推荐的拣货批次单', sub: '查看库位编号（如 A-12-03）' },
        { text: '推拣货车进入目标通道，核对货架货位条码', sub: '对准扫描，确认无误再取货' },
        { text: '取出对应数量的货品，逐件扫描商品条码', sub: '注意多规格商品的颜色、尺码差异' },
        { text: '将货品分类投入周转箱，并妥善黏贴箱标，推送至打包流水线', sub: 'PDA显示拣货批次100%完成后点击提交' }
      ],
      warning: '【异常处理】若发现货位实物数量不足或商品破损，请立即激活PDA“阻断上报”机制，切勿伪造条码或拿错补齐。'
    },
    3: {
      overview: '大型叉车（双向电动堆高车/燃油前移式叉车）属于高危特种设备。本驾驶指南用以保证在复杂多货架库区中，车辆平稳运转并完全避免倾翻、物资碰撞事故发生。',
      guidelines: [
        '驾驶叉车必须持有国家质监部门颁发的特种设备作业人员资格证，严禁无证驾驶。',
        '库区限速 5 km/h，交叉路口、转弯处以及视线盲区必须强制鸣笛减速，遵循车辆礼让人、主干道优先原则。',
        '叉车运行时，搬运货叉离地高度应保持在 15-20 厘米之间，作业门架应极度收回或后倾。',
        '严禁任何人站在货叉、卡板上随叉车升空作业，严禁超载、超高超宽堆装前行。'
      ],
      steps: [
        { text: '进行班前360度车辆状态点检与异常登记', sub: '检查电量、刹车、液压漏油、油漆碰伤' },
        { text: '系好安全带，确认周围视野开阔及无障碍路况后再起步', sub: '解除手刹，平稳给踏板加力' },
        { text: '操作货叉插入卡板中心，门架后倾锁死后再平稳提升起步', sub: '倒车行进时必须高度关注后视镜与盲点' },
        { text: '对位堆垛动作：平稳泊车，调整回正，平稳举升至所需条格层，插准并落下', sub: '货叉完全抽出、降至安全高度后方可驶离工位' }
      ],
      warning: '【致命红线】严禁单叉负重或高速漂移转弯。工作结束后必须将货叉平置于地面，切断电源、拔掉钥匙放回指定柜，并拉起手刹。'
    }
  },
  en: {
    1: {
      overview: 'This procedure serves as the daily safety code for all members in WMS Logistics Center, aiming to minimize damage rates, secure personal health/fire safety, and regulate site behaviors.',
      guidelines: [
        'You must wear safety steel-toed shoes and a high-visibility reflective vest before stepping into workzones.',
        'Smoking is strictly prohibited outside designated smoking zones; do not bring flammable materials on site.',
        'Stacking ladders or bins is strictly capped at 1.8m to prevent dynamic tipping injuries.',
        'Keep fire hydrants, emergency exit tracks, and electrical breaker panels clear within a 1-meter range.'
      ],
      steps: [
        { text: 'Pre-shift self-check on posture and PPE status', sub: 'Ensure vests are fully zipped and safety shoes tied' },
        { text: 'On-site continuous fire routes check', sub: 'Ensure emergency doors and routing channels are clear of debris' },
        { text: 'Pre-check on powering states of stations', sub: 'Check for water leakage or exposed circuits' },
        { text: 'Completing tasks, power down machines, 5S workstation tidiness', sub: 'Return elements to original bins, sign 5S logs' }
      ],
      warning: '【EMERGENCY】If a fire occurs, sound the alarms immediately and call Warehouse Safety Hotline: 02-123-4567 Ext. 119 to evacuate.'
    },
    2: {
      overview: 'The Standard Picking Process governs operational delivery lead times. Adherence to routing logic and bin identifiers achieves high pick rates with zero-error performance.',
      guidelines: [
        'PDA scanner devices must be utilized to scan barcode items; picking by memory is strictly banned.',
        'When picking fragile or fluid goods, isolate them from metal or heavy bulky orders.',
        'Enforce First-In-First-Out (FIFO) batch rules to prevent shelf-life expiration on materials.',
        'When packing cluster picked carts, place items softly; throwing materials across bins is strictly forbidden.'
      ],
      steps: [
        { text: 'Log in to PDA system, claim the recommended pick assignment lot', sub: 'Identify correct location coordinate (e.g. A-12-03)' },
        { text: 'Push picking cart into designated aisle, verify physical shelf coordinates', sub: 'Perform match scan to prevent wrong shelf picker actions' },
        { text: 'Extract corresponding quantity and scan individual item barcodes', sub: 'Watch for multiple color/size differences' },
        { text: 'Place picked items into correct totes with tags and transfer to conveyer', sub: 'Click submit on PDA once 100% finished' }
      ],
      warning: '【EXCEPTION】If inventory is short or item is broken, trigger "Shortage Alert" on PDA immediately. Never override with other barcode items.'
    },
    3: {
      overview: 'Electric stackers and reach trucks are high-risk machinery. This driver safety checklist ensures normal operation without tipping or warehouse structural hits.',
      guidelines: [
        'Forklift operation requires a valid certificate/license issued by regulatory state bureaus; unlicensed driving is banned.',
        'Warehouse speed limit is strictly capped at 5 km/h. Slow down and horn at blind-spot corridors.',
        'Fork height during travel must stay within 15-20cm, with mast fully tilted backwards.',
        'Passengers on cargo pallets or fork surfaces are severely banned; never load beyond technical limits.'
      ],
      steps: [
        { text: 'Perform 360-degree visual pre-start check and logs registration', sub: 'Check battery cells, breaking pressure, leakages' },
        { text: 'Fasten safety belt and examine clearances around vehicles', sub: 'Release emergency handbrakes, proceed gently' },
        { text: 'Insert forks into card board center, tilt mast backwards, lift and move', sub: 'Observe rear view mirrors and reverse camera indicators' },
        { text: 'Stacking: align precisely, lift to grid height, insert cargo gently', sub: 'Lower forks to safe standard levels after retraction' }
      ],
      warning: '【CRITICAL REDLINE】Do not slide/drift at bends or lift single-fork loads. After shift, ground fork completely, pull handbrake, power off and return keys.'
    }
  },
  th: {
    1: {
      overview: 'แนวทางปฏิบัตินี้เป็นมาตรฐานความปลอดภัยประจำวันสำหรับพนักงานทุกคนในศูนย์โลจิสติกส์ WMS โดยมีเป้าหมายเพื่อลดอัตราความเสียหายและรักษาระดับความปลอดภัยของพนักงานทุกคน',
      guidelines: [
        'คุณต้องสวมรองเท้านิรภัยหัวเหล็กและเสื้อกั๊กสะท้อนแสงก่อนก้าวเข้าสู่พื้นที่ปฏิบัติงานทุกครั้ง',
        'ห้ามสูบบุหรี่นอกพื้นที่กำหนดโดยเด็ดขาด และห้ามพกพาวัตถุไวไฟเข้าสู่ไซต์งาน',
        'การวางซ้อนของบันไดหรือถังเก็บของจำกัดความสูงที่ 1.8 เมตร เพื่อป้องกันการล้มทับ',
        'รักษาช่องทางเข้าออกฉุกเฉิน หัวจ่ายน้ำดับเพลิง และแผงตัดไฟให้ปลอดโปร่งในระยะ 1 เมตรเสมอ'
      ],
      steps: [
        { text: 'ตรวจสอบความพร้อมส่วนบุคคลและอุปกรณ์ PPE ก่อนเริ่มงาน', sub: 'ตรวจสอบเสื้อกั๊กรูดซิปเรียบร้อยและสวมรองเท้านิรภัยแบบปิดหัว' },
        { text: 'เดินตรวจความปลอดภัยอัคคีภัยภายในพื้นที่ประจำชั่วโมง', sub: 'ดูแลพื้นที่ทางออกฉุกเฉินและทางเดินให้ปราศจากสิ่งกีดขวาง' },
        { text: 'ตรวจสวิตช์ควบคุมพลังงานของอุปกรณ์เวิร์กสเตชัน', sub: 'ส่องดูจุดเปียกชื้นที่อาจเกิดไฟฟ้ารั่วไหลได้ง่าย' },
        { text: 'ปิดไฟ ปิดเครื่อง และรักษาความสะอาด 5ส ของสถานีงานหลังเสร็จสิ้น', sub: 'จัดเก็บของกลับที่เดิมและเซ็นชื่อรับรอง' }
      ],
      warning: '【กรณีฉุกเฉิน】หากเกิดเพลิงไหม้ ให้กดปัญญาเตือนภัยทันที และโทรสายด่วนความปลอดภัยคลังสินค้า: 02-123-4567 ต่อ 119 เพื่ออพยพทันที'
    },
    2: {
      overview: 'ขั้นตอนการจัดเตรียมใบสินค้าคลังกำหนดจังหวะการจัดส่งที่น่าพึงพอใจ การปฏิบัติตามจุดจัดวางอย่างเคร่งครัดช่วยเพิ่มอัตราการจัดเตรียมให้ถูกต้องและรวดเร็วเป็นศูนย์ข้อผิดพลาด',
      guidelines: [
        'ต้องใช้งานอุปกรณ์สแกนเนอร์ PDA ในการตัดจัดยอดไอเท็มทุกครั้ง ห้ามหยิบของด้วยความจำ',
        'เมื่อหยิบสินค้าที่เปราะบางหรือเป็นของเหลว ต้องแยกสัดส่วนการแพ็กร่วมกับสินค้าที่มีน้ำหนักมาก',
        'ปฏิบัติตามหลักการเข้าก่อนออกก่อน (FIFO) อย่างเคร่งครัดเพื่อป้องกันสินค้าหมดอายุคาชั้นวาง',
        'เมื่อทำการบรรจุหีบห่อรถจัดเตรียม ห้ามโยนของข้ามถังเด็ดขาด ต้องวางอย่างเบามือ'
      ],
      steps: [
        { text: 'ล็อกอินเข้าสู่ระบบ PDA แล้วกดรับรายการจัดเตรียมที่ระบบแนะนำ', sub: 'สังเกตพิกัดตำแหน่งชั้นวาง เช่น โซน A-12-03' },
        { text: 'เข็นรถจัดสินค้าไปยังช่องทางเป้าหมาย ตรวจสอบรหัสตำแหน่งให้ตรงและสแกนเช็กเกอร์', sub: 'ทำการสแกนเพื่อป้องกันความผิดพลาดและเสียเวลากรณีผิดตำแหน่ง' },
        { text: 'นำสินค้าแยกจำนวนออกตามใบคำสั่ง และทำการสแกนบาร์โค้ดสินค้าแต่ละชิ้น', sub: 'ระมัดระวังความแตกต่างของสีและขนาดสินค้าที่มีความคล้ายคลึงกัน' },
        { text: 'วางสินค้าลงตะกร้าหมวนเวียน พิมพ์สติกเกอร์และนำส่งไปยังสายพานบรรจุแพ็ก', sub: 'กดยืนยันใบออเดอร์ใน PDA เมื่อจัดเตรียมเสร็จสิ้นครบ 100%' }
      ],
      warning: '【ข้อพิจารณา】หากพบจำนวนสินค้าจริงบนเชลฟ์ขาดหรือกล่องฉีกขาด ให้กด "แจ้งของขาดคลัง" ใน PDA ทันที ห้ามใช้บาร์โค้ดตัวอื่นสแกนแทนโดยพลการ'
    },
    3: {
      overview: 'รถยกระบบไฟฟ้าและรถตักแบบผลักเป็นเครื่องจักรอุตสาหกรรมที่มีความเสี่ยงสูง คู่มือขับขี่ปลอดภัยชิ้นนี้รับประกันการประสานงานพนักงานและลดเหตุชนหรือถล่มชั้นวาง',
      guidelines: [
        'การขับขี่รถยกต้องมีใบอนุญาตขับขี่เครื่องจักรพิเศษที่ออกโดยหน่วยงานกำกับรัฐอย่างเป็นทางการเท่านั้น',
        'จำกัดความเร็วสูงสุดภายในคลังสินค้าไม่เกิน 5 กม./ชม. ชะลอความเร็วและบีบแตรรับตรงทุกมุมอับสายตา',
        'ขณะขับขี่ความสูงของงายกควรอยู่ระหว่าง 15-20 ซม. จากพื้นดิน และปรับเอนเสามาด้านหลังสุด',
        'ห้ามพนักงานซ้อนท้ายงาหรือยืนบนพาเลทรถยกเพื่อขึ้นที่สูงเด็ดขาด และห้ามบรรทุกเกินพิกัดสูงสุด'
      ],
      steps: [
        { text: 'ตรวจสอบรอบรถ 360 องศา และประเมินจุดชำรุดเป็นประจำวัน', sub: 'เช็กแรงดันลมยาง ระดับแบตเตอรี่ แรงบิดเบรก และจุดหล่อลื่น' },
        { text: 'คาดเข็มขัดนิรภัยและประเมินรอบข้างว่าไม่มีสิ่งกีดขวางก่อนออกรถ', sub: 'ปลดเบรกมือฉุกเฉินและเริ่มเลื่อนรถอย่างนิ่มนวล' },
        { text: 'สอดงาเข้าตรงใจกลางพาเลท ปรับเอนเสาไปด้านหลังให้ล็อก และยกเคลื่อนที่เบาๆ', sub: 'มองรอบข้างและเช็กกระจกส่องฝั่งเมื่อถอยหลัง' },
        { text: 'การจัดวางตำแหน่ง: จอดให้นิ่ง ปรับทิศทาง ยกสูงให้ถึงระดับคาน ค่อยๆ เลื่อนหน้าและพักน้ำหนักลง', sub: 'ดึงงารถยกลงมาสู่ระดับปลอดภัย 20 ซม. ก่อนขับเคลื่อนออกจากเสารับ' }
      ],
      warning: '【ข้อแนะนำสำคัญ】ห้ามขับฉวัดเฉวียนดริฟต์โค้งหรือตักรับน้ำหนักข้างเดียวโดยเด็ดขาด หลังปฏิบัติงานเสร็จโปรดพับงาลงติดพื้น ใส่เบรกมือ ดึงระบบคีย์ควบคุมออกส่งคืนตู้'
    }
  }
};

const getSopTitle = (id: number, lang: Lang) => {
  if (id === 1) return t[lang].sop1Title;
  if (id === 2) return t[lang].sop2Title;
  if (id === 3) return t[lang].sop3Title;
  return '';
};

const getAttendanceStatusInfo = (inTime: string | null, outTime: string | null, lang: Lang) => {
  let statusKey: 'not_clocked_in' | 'clocked_in_completed' | 'missed_clock_in' | 'late' | 'early_leave' = 'not_clocked_in';
  
  if (!inTime && !outTime) {
    statusKey = 'not_clocked_in';
  } else if (!inTime && outTime) {
    statusKey = 'missed_clock_in';
  } else if (inTime && outTime) {
    if (inTime > '09:00') {
      statusKey = 'late';
    } else if (outTime < '18:00') {
      statusKey = 'early_leave';
    } else {
      statusKey = 'clocked_in_completed';
    }
  } else if (inTime && !outTime) {
    if (inTime > '09:00') {
      statusKey = 'late';
    } else {
      statusKey = 'clocked_in_completed';
    }
  }

  const config = {
    not_clocked_in: {
      label: t[lang].statusNotClockedIn,
      desc: t[lang].statusNotClockedInDesc,
      bgColor: 'bg-slate-50 border-slate-200/60',
      textColor: 'text-slate-700',
      badgeColor: 'bg-slate-100 text-slate-500 border-slate-200',
      indicatorBg: 'bg-slate-400',
    },
    clocked_in_completed: {
      label: t[lang].statusClockedIn,
      desc: t[lang].statusClockedInDesc,
      bgColor: 'bg-emerald-50/70 border-emerald-100/50',
      textColor: 'text-emerald-800',
      badgeColor: 'bg-emerald-100/80 text-emerald-700 border-emerald-200/40',
      indicatorBg: 'bg-emerald-500',
    },
    missed_clock_in: {
      label: t[lang].statusMissedClockIn,
      desc: t[lang].statusMissedClockInDesc,
      bgColor: 'bg-rose-50/70 border-rose-100/50',
      textColor: 'text-rose-800',
      badgeColor: 'bg-rose-100/80 text-rose-700 border-rose-200/40',
      indicatorBg: 'bg-rose-500',
    },
    late: {
      label: t[lang].statusLate,
      desc: t[lang].statusLateDesc,
      bgColor: 'bg-amber-50/70 border-amber-100/50',
      textColor: 'text-amber-800',
      badgeColor: 'bg-amber-100/80 text-amber-700 border-amber-200/40',
      indicatorBg: 'bg-amber-500',
    },
    early_leave: {
      label: t[lang].statusLeftEarly,
      desc: t[lang].statusLeftEarlyDesc,
      bgColor: 'bg-orange-50/70 border-orange-100/50',
      textColor: 'text-orange-850',
      badgeColor: 'bg-orange-100/80 text-orange-700 border-orange-200/40',
      indicatorBg: 'bg-orange-500',
    },
  };

  return { key: statusKey, ...config[statusKey] };
};

export default function App() {
  const [currentPage, setCurrentPage] = useState<Page>('home');
  const [attendanceSubTab, setAttendanceSubTab] = useState<'log' | 'leave'>('log');
  const [currentTime, setCurrentTime] = useState(new Date());
  const [toast, setToast] = useState<{ msg: string; type: 'success' | 'error' | 'info' } | null>(null);

  const homeFileInputRef = useRef<HTMLInputElement>(null);
  const [isLangOpen, setIsLangOpen] = useState(false);
  const [isAvatarModalOpen, setIsAvatarModalOpen] = useState(false);
  const [isAttendanceDetailOpen, setIsAttendanceDetailOpen] = useState(false);
  const [selectedNotice, setSelectedNotice] = useState<{
    id: number;
    iconType: 'bell' | 'payroll';
    title: string;
    sender: string;
    time: string;
    content: string;
    isPayslip?: boolean;
  } | null>(null);

  const [payslipStatus, setPayslipStatus] = useState<'pending' | 'confirmed' | 'rejected'>(() => {
    const saved = localStorage.getItem('wmshr_payslip_status');
    return (saved === 'confirmed' || saved === 'rejected') ? saved : 'pending';
  });

  const handleUpdatePayslipStatus = (status: 'confirmed' | 'rejected') => {
    setPayslipStatus(status);
    localStorage.setItem('wmshr_payslip_status', status);
  };

  const [lang, setLang] = useState<Lang>(() => {
    const saved = localStorage.getItem('wmshr_lang');
    return (saved === 'zh' || saved === 'en' || saved === 'th') ? saved : 'zh';
  });

  const changeLang = (l: Lang) => {
    setLang(l);
    localStorage.setItem('wmshr_lang', l);
  };
  
  const [user, setUser] = useState<{ name: string; dept: string; avatarUrl: string | null }>({
    name: 'Phyo Lin Aung',
    dept: 'A区-入库部门 / Warehouse Zone A',
    avatarUrl: 'https://images.unsplash.com/photo-1540569014015-19a7be504e3a?auto=format&fit=crop&q=80&w=250&h=250'
  });

  const [checkInData, setCheckInData] = useState<CheckInData>({
    status: 'none',
    inTime: null,
    outTime: null,
    gps: '曼谷 Warehouse A · 精度 3.2m'
  });

  const [leaves, setLeaves] = useState<LeaveRecord[]>(() => {
    const saved = localStorage.getItem('wmshr_leaves');
    if (saved) {
      try { return JSON.parse(saved); } catch (e) { console.error(e); }
    }
    return [
      { id: 1, type: 'annual', startDate: '2026-06-01', endDate: '2026-06-03', days: 3, reason: '家庭年假出游 / Family annual trip', status: 'approved' },
      { id: 2, type: 'sick', startDate: '2026-05-12', endDate: '2026-05-12', days: 1, reason: '身体不适感冒就医 / Fever and hospital checkup', status: 'approved' }
    ];
  });

  const [isApplying, setIsApplying] = useState(false);
  const [leaveForm, setLeaveForm] = useState({
    type: 'personal' as 'personal' | 'sick' | 'annual' | 'special',
    startDate: '',
    endDate: '',
    reason: ''
  });

  const calculateDays = (start: string, end: string) => {
    if (!start || !end) return 0;
    const s = new Date(start);
    const e = new Date(end);
    const diffTime = e.getTime() - s.getTime();
    if (diffTime < 0) return 0;
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1;
    return isNaN(diffDays) ? 0 : diffDays;
  };

  const handleApplyLeave = (e: React.FormEvent) => {
    e.preventDefault();
    if (!leaveForm.startDate || !leaveForm.endDate) {
      showToast(lang === 'zh' ? '请选择开始和结束日期' : lang === 'en' ? 'Please select start and end dates' : 'โปรดระบุวันที่เริ่มต้นและสิ้นสุด', 'error');
      return;
    }
    const daysCount = calculateDays(leaveForm.startDate, leaveForm.endDate);
    if (daysCount <= 0) {
      showToast(lang === 'zh' ? '结束日期不能早于开始日期' : lang === 'en' ? 'End date cannot be earlier than start date' : 'วันที่สิ้นสุดต้องไม่เร็วกว่าวันที่เริ่มต้น', 'error');
      return;
    }
    if (!leaveForm.reason.trim()) {
      showToast(lang === 'zh' ? '请输入请假原因' : lang === 'en' ? 'Please describe the reason' : 'โปรดระบุเหตุผลการลา', 'error');
      return;
    }

    const newRecord: LeaveRecord = {
      id: Date.now(),
      type: leaveForm.type,
      startDate: leaveForm.startDate,
      endDate: leaveForm.endDate,
      days: daysCount,
      reason: leaveForm.reason,
      status: 'pending'
    };

    const updatedLeaves = [newRecord, ...leaves];
    setLeaves(updatedLeaves);
    localStorage.setItem('wmshr_leaves', JSON.stringify(updatedLeaves));
    
    // Reset
    setLeaveForm({
      type: 'personal',
      startDate: '',
      endDate: '',
      reason: ''
    });
    setIsApplying(false);
    showToast(t[lang].submitSuccess, 'success');
  };

  const renderAvatarContainer = (sizeClasses: string, textClass: string, isRoundCornerLarge = false, borderType: 'none' | 'thin' | 'thick' = 'thick') => {
    const firstLetter = user.name ? user.name.trim().charAt(0).toUpperCase() : '?';
    const borderRadiusClass = isRoundCornerLarge ? (sizeClasses.includes('w-7') ? 'rounded-lg' : 'rounded-2xl') : 'rounded-xl';
    
    let borderClass = '';
    if (borderType === 'thick') {
      borderClass = isRoundCornerLarge ? 'border-4 border-white' : 'border-2 border-white';
    } else if (borderType === 'thin') {
      borderClass = 'border border-slate-200/40';
    }
    
    if (user.avatarUrl) {
      return (
        <div className={`${sizeClasses} ${borderRadiusClass} bg-slate-100 overflow-hidden ${borderClass} flex items-center justify-center shrink-0`}>
          <img 
            src={user.avatarUrl} 
            alt={user.name} 
            referrerPolicy="no-referrer"
            className="w-full h-full object-cover"
          />
        </div>
      );
    }
    
    return (
      <div className={`${sizeClasses} ${borderRadiusClass} bg-gradient-to-br from-blue-600 to-blue-800 flex items-center justify-center text-white font-black overflow-hidden ${borderClass} shrink-0 shadow-lg shadow-blue-500/10`}>
        <span className={textClass}>
          {firstLetter}
        </span>
      </div>
    );
  };

  const handleAvatarChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setUser(prev => ({ ...prev, avatarUrl: reader.result as string }));
        showToast(t[lang].avatarSuccess, 'success');
      };
      reader.readAsDataURL(file);
    }
  };

  const setPresetAvatar = () => {
    setUser(prev => ({ 
      ...prev, 
      avatarUrl: 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?auto=format&fit=crop&q=80&w=200&h=200' 
    }));
    showToast(t[lang].avatarLoaded, 'success');
  };

  const clearAvatar = () => {
    setUser(prev => ({ ...prev, avatarUrl: null }));
    showToast(t[lang].avatarCleared, 'info');
  };

  const [attendance] = useState<AttendanceRecord[]>([
    { date: '2026-05-17', in: '08:30', out: '17:35', type: 'normal', hours: '8.1h' },
    { date: '2026-05-16', in: '08:45', out: '19:20', type: 'overtime', hours: '9.6h' },
    { date: '2026-05-15', in: '08:32', out: '17:40', type: 'normal', hours: '8.1h' },
    { date: '2026-05-14', in: '08:28', out: '17:30', type: 'normal', hours: '8.0h' }
  ]);

  const [sops, setSops] = useState<SOP[]>([
    { id: 1, title: '仓库安全操作规范', ver: 'V2.1', date: '05-10', read: true },
    { id: 2, title: '拣货作业标准流程', ver: 'V1.8', date: '05-08', read: false },
    { id: 3, title: '叉车安全驾驶指南', ver: 'V3.0', date: '05-05', read: false }
  ]);

  const [selectedSopId, setSelectedSopId] = useState<number | null>(null);
  const [checkedSteps, setCheckedSteps] = useState<Record<number, boolean>>({});

  useEffect(() => {
    setCheckedSteps({});
  }, [selectedSopId]);

  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  const showToast = (msg: string, type: 'success' | 'error' | 'info' = 'success') => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3000);
  };

  const handleCheckIn = () => {
    const now = new Date();
    const timeStr = now.toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit', hour12: false });
    
    if (checkInData.status === 'none') {
      setCheckInData(prev => ({ ...prev, status: 'in', inTime: timeStr }));
      showToast(t[lang].clockInSuccess, 'success');
    } else if (checkInData.status === 'in') {
      setCheckInData(prev => ({ ...prev, status: 'out', outTime: timeStr }));
      showToast(t[lang].clockOutSuccess, 'success');
    } else {
      setCheckInData({
        status: 'none',
        inTime: null,
        outTime: null,
        gps: '曼谷 Warehouse A · 精度 3.2m'
      });
      showToast(t[lang].statusResetDemo, 'info');
    }
  };

  const detailedTime = currentTime.toLocaleTimeString(localeMap[lang], { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false });
  const formattedDate = currentTime.toLocaleDateString(localeMap[lang], { weekday: 'long', month: 'long', day: 'numeric' });

  return (
    <ErrorBoundary>
      <div className="min-h-screen bg-slate-50 flex flex-col max-w-md mx-auto relative shadow-2xl overflow-x-hidden border-x border-slate-100 font-sans antialiased">
        {/* Toast */}
        <AnimatePresence>
          {toast && (
            <motion.div 
              initial={{ opacity: 0, y: -20, scale: 0.9 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -20, scale: 0.9 }}
              className={`fixed top-4 left-4 right-4 max-w-sm mx-auto z-[100] p-4 rounded-2xl shadow-xl text-white font-bold text-sm text-center border backdrop-blur-md
                ${toast.type === 'success' ? 'bg-emerald-500/90 border-emerald-400' : toast.type === 'error' ? 'bg-rose-500/90 border-rose-400' : 'bg-slate-800/90 border-slate-700'}`}
            >
              {toast.msg}
            </motion.div>
          )}
        </AnimatePresence>

        {/* Avatar Editing Modal */}
        <AnimatePresence>
          {isAvatarModalOpen && (
            <div className="absolute inset-0 z-50 flex items-center justify-center p-6 bg-slate-950/45 backdrop-blur-md">
              <motion.div 
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                onClick={() => setIsAvatarModalOpen(false)}
                className="absolute inset-0"
              />
              
              <motion.div 
                initial={{ opacity: 0, scale: 0.95, y: 20 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95, y: 20 }}
                transition={{ type: "spring", damping: 25, stiffness: 350 }}
                className="relative bg-white/95 w-full max-w-xs rounded-[32px] p-6 shadow-2xl border border-slate-100 z-10 flex flex-col items-center"
              >
                {/* Close Button */}
                <button 
                  onClick={() => setIsAvatarModalOpen(false)}
                  className="absolute top-4 right-4 p-1.5 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-500 hover:text-slate-800 transition-colors"
                >
                  <X size={14} />
                </button>

                {/* Title */}
                <h3 className="text-sm font-black text-slate-900 mt-1 mb-5">
                  {t[lang].editAvatarTitle}
                </h3>

                {/* Current Avatar Large Preview */}
                <div className="relative mb-6 group select-none">
                  <div className="p-1 rounded-full bg-slate-100/50 border border-slate-200/40 shadow-inner">
                    {renderAvatarContainer('w-20 h-20', 'text-3xl', true)}
                  </div>
                  <div className="absolute bottom-0 right-0 w-6 h-6 bg-blue-600 rounded-full border border-white flex items-center justify-center text-white shadow-md">
                    <Camera size={12} />
                  </div>
                </div>

                {/* Action buttons list */}
                <div className="w-full space-y-2.5">
                  {/* Option 1: Upload from Album */}
                  <button 
                    onClick={() => {
                      setIsAvatarModalOpen(false);
                      setTimeout(() => {
                        homeFileInputRef.current?.click();
                      }, 150);
                    }}
                    className="w-full flex items-center gap-3 p-3 text-slate-700 bg-slate-50 border border-slate-200/40 hover:bg-slate-100/50 active:scale-[0.98] transition-all rounded-xl font-bold text-xs"
                  >
                    <div className="w-8 h-8 rounded-lg bg-blue-600 flex items-center justify-center text-white shrink-0 shadow-md">
                      <ImageIcon size={14} />
                    </div>
                    <div className="text-left flex-1">
                      <p className="font-extrabold text-slate-900 text-xs">
                        {t[lang].uploadLocal}
                      </p>
                    </div>
                  </button>

                  {/* Option 2: Use Recommended Preset */}
                  <button 
                    onClick={() => {
                      setPresetAvatar();
                      setIsAvatarModalOpen(false);
                    }}
                    className="w-full flex items-center gap-3 p-3 text-slate-700 bg-slate-50 border border-slate-200/40 hover:bg-slate-100/50 active:scale-[0.98] transition-all rounded-xl font-bold text-xs"
                  >
                    <div className="w-8 h-8 rounded-lg bg-emerald-600 flex items-center justify-center text-white shrink-0 shadow-md">
                      <Camera size={14} />
                    </div>
                    <div className="text-left flex-1">
                      <p className="font-extrabold text-slate-900 text-xs">
                        {t[lang].usePreset}
                      </p>
                    </div>
                  </button>

                  {/* Option 3: Clear Photo */}
                  {user.avatarUrl && (
                    <button 
                      onClick={() => {
                        clearAvatar();
                        setIsAvatarModalOpen(false);
                      }}
                      className="w-full flex items-center gap-3 p-3 text-rose-700 bg-rose-50/70 border border-rose-100/30 hover:bg-rose-100/50 active:scale-[0.98] transition-all rounded-xl font-bold text-xs"
                    >
                      <div className="w-8 h-8 rounded-lg bg-rose-600 flex items-center justify-center text-white shrink-0 shadow-md">
                        <Trash2 size={14} />
                      </div>
                      <div className="text-left flex-1">
                        <p className="font-extrabold text-rose-600 text-xs">
                          {t[lang].clearPhoto}
                        </p>
                      </div>
                    </button>
                  )}
                </div>

                {/* Cancel button */}
                <button 
                  onClick={() => setIsAvatarModalOpen(false)}
                  className="w-full mt-5 py-3 px-4 bg-slate-100 hover:bg-slate-200 active:bg-slate-200 text-slate-700 rounded-xl text-[10px] font-black tracking-widest uppercase transition-colors"
                >
                  {t[lang].closeModal}
                </button>
              </motion.div>
            </div>
          )}
        </AnimatePresence>

        {/* Selected Notice Detail Modal */}
        <AnimatePresence>
          {selectedNotice && (
            <div className="absolute inset-0 z-50 flex items-center justify-center p-6 bg-slate-950/45 backdrop-blur-md">
              <motion.div 
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                onClick={() => setSelectedNotice(null)}
                className="absolute inset-0"
              />
              
              <motion.div 
                initial={{ opacity: 0, scale: 0.95, y: 20 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95, y: 20 }}
                transition={{ type: "spring", damping: 25, stiffness: 350 }}
                className={`relative bg-white/95 w-full ${selectedNotice.isPayslip ? 'max-w-md' : 'max-w-sm'} rounded-3xl p-6 sm:p-7 shadow-2xl border border-slate-100 z-10 flex flex-col`}
              >
                {/* Close Button */}
                <button 
                  onClick={() => setSelectedNotice(null)}
                  className="absolute top-5 right-5 p-2 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-500 hover:text-slate-850 transition-colors"
                >
                  <X size={15} />
                </button>

                {/* Big Icon */}
                <div className="flex justify-center mb-4 mt-2">
                  <div className={`w-14 h-14 rounded-2xl flex items-center justify-center shadow-sm ${
                    selectedNotice.isPayslip ? 'bg-emerald-50 text-emerald-600' : 'bg-blue-50 text-blue-600'
                  }`}>
                    {selectedNotice.isPayslip ? <CheckCircle2 size={26} className="text-emerald-600" /> : <Bell size={26} className="text-blue-600" />}
                  </div>
                </div>

                {/* Section subtitle */}
                <span className="text-xs text-center text-blue-600 font-extrabold uppercase tracking-[0.14em] mb-1.5 block">
                  {selectedNotice.isPayslip 
                    ? (lang === 'zh' ? '电子薪资账单' : lang === 'en' ? 'Digital Payslip' : 'สลิปเงินเดือนอิเล็กทรอนิกส์') 
                    : t[lang].noticeDetailTitle}
                </span>
                
                {/* Notice Title */}
                <h3 className="text-base font-black text-slate-900 text-center px-1 leading-relaxed mb-4">
                  {selectedNotice.title}
                </h3>

                {/* Metadata card */}
                <div className="bg-slate-50 border border-slate-100 rounded-2xl p-4 space-y-2.5 mb-4.5">
                  <div className="flex justify-between items-center text-xs font-bold">
                    <span className="text-slate-400 uppercase tracking-widest">{t[lang].noticeSender}</span>
                    <span className="text-slate-800 font-black">{selectedNotice.sender}</span>
                  </div>
                  <div className="flex justify-between items-center text-xs font-bold">
                    <span className="text-slate-400 uppercase tracking-widest">{t[lang].noticeTime}</span>
                    <span className="text-slate-800 font-mono font-black">{selectedNotice.time}</span>
                  </div>
                </div>

                {/* Conditional Body */}
                {!selectedNotice.isPayslip ? (
                  <>
                    {/* Standard Notice Content */}
                    <div className="border-t border-b border-dashed border-slate-150 py-4 max-h-48 overflow-y-auto no-scrollbar">
                      <p className="text-xs font-bold leading-relaxed text-slate-600 text-justify whitespace-pre-line px-0.5">
                        {selectedNotice.content}
                      </p>
                    </div>

                    <button 
                      onClick={() => setSelectedNotice(null)}
                      className="w-full mt-5 py-3.5 bg-blue-600 hover:bg-blue-700 active:scale-[0.98] text-white rounded-2xl text-xs font-black tracking-widest uppercase transition-all shadow-md flex items-center justify-center gap-1.5"
                    >
                      <Check size={12} strokeWidth={3} />
                      {t[lang].btnUnderstand}
                    </button>
                  </>
                ) : (
                  /* Payslip breakdown structure - Receipt style with screenshot-like detail contents */
                  <div className="space-y-4">
                    {/* Notice text introduction snippet */}
                    <p className="text-xs font-bold text-slate-600 leading-normal bg-slate-50 border border-slate-150 rounded-2xl p-3 text-justify">
                      {lang === 'zh' 
                        ? '请确认您 2026 年 4 月薪资账单。如有疑义，请点击“驳回”申诉：' 
                        : lang === 'en' 
                          ? 'Please verify your April 2026 wage list. Click "Dispute" if anything is incorrect:' 
                          : 'โปรดตรวจสอบสลิปเดือนเมษายน หากมีข้อโต้แย้งโปรดกดคัดค้าน:'
                      }
                    </p>

                    {/* Receipt Container */}
                    <div className="bg-slate-50/60 border border-slate-200 rounded-2xl p-5 space-y-4">
                      {/* Employee Identification */}
                      <div className="flex justify-between items-center text-xs pb-3 border-b border-slate-200/60 font-bold">
                        <span className="text-slate-550 font-bold uppercase tracking-wider">{lang === 'zh' ? '员工姓名' : lang === 'en' ? 'Employee' : 'ชื่อพนักงาน'}</span>
                        <div className="flex items-center gap-2.5">
                          {renderAvatarContainer('w-8 h-8', 'text-xs font-black', true, 'thin')}
                          <span className="text-slate-900 font-extrabold text-sm">{user.name}</span>
                        </div>
                      </div>

                      {/* Stat summary grid */}
                      <div className="grid grid-cols-2 gap-4 pb-3 border-b border-slate-200/60">
                        <div>
                          <p className="text-[11px] text-slate-500 font-extrabold uppercase tracking-wider">{lang === 'zh' ? '有效出勤天数' : lang === 'en' ? 'Effective Days' : 'วันทำงานจริง'}</p>
                          <p className="text-sm font-black text-slate-900 mt-1">22 {lang === 'zh' ? '天' : 'days'}</p>
                        </div>
                        <div>
                          <p className="text-[11px] text-slate-500 font-extrabold uppercase tracking-wider">{lang === 'zh' ? '累计/加班工时' : lang === 'en' ? 'Total/OT Hours' : 'ชั่วโมงรวม/OT'}</p>
                          <p className="text-sm font-black text-slate-900 mt-1">176h / 12.5h</p>
                        </div>
                      </div>

                      {/* Line items list */}
                      <div className="space-y-3 pt-1">
                        {/* 1. Std Hours Wage */}
                        <div className="flex justify-between items-center text-xs font-bold">
                          <span className="text-slate-600 font-medium">{t[lang].payslipStdWageText}</span>
                          <span className="font-mono text-slate-900 font-black text-[13px]">+ ฿13,200.00</span>
                        </div>

                        {/* 2. Overtime earnings */}
                        <div className="flex justify-between items-center text-xs font-bold">
                          <span className="text-slate-600 font-medium">{t[lang].payslipOTEarnText} (1.5x)</span>
                          <span className="font-mono text-slate-900 font-black text-[13px]">+ ฿1,125.00</span>
                        </div>

                        {/* 3. Meal Allowance */}
                        <div className="flex justify-between items-center text-xs font-bold">
                          <span className="text-slate-600 font-medium flex flex-wrap items-center gap-1">
                            <span>{t[lang].payslipMealText}</span>
                            <span className="font-mono text-[10px] text-slate-400 font-normal">({t[lang].payslipMealConvert.replace('{days}', '22').replace('{amount}', '50.00')})</span>
                          </span>
                          <span className="font-mono text-slate-900 font-black text-[13px]">+ ฿1,100.00</span>
                        </div>

                        {/* 4. Perfect Attendance */}
                        <div className="flex justify-between items-center text-xs font-bold">
                          <span className="text-slate-600 font-medium">{t[lang].payslipFullBonus}</span>
                          <span className="font-mono text-slate-900 font-black text-[13px]">+ ฿500.00</span>
                        </div>

                        {/* 5. Service Charge / Commission */}
                        <div className="flex justify-between items-center text-xs font-bold">
                          <span className="text-slate-600 font-medium">{t[lang].payslipServiceCharge}</span>
                          <span className="font-mono text-slate-900 font-black text-[13px]">+ ฿1,599.00</span>
                        </div>

                        {/* 6. Social Security */}
                        <div className="flex justify-between items-center text-xs font-bold">
                          <span className="text-rose-700 font-medium">{t[lang].payslipSocialSec}</span>
                          <span className="font-mono text-rose-600 font-black text-[13px]">- ฿750.00</span>
                        </div>
                      </div>

                      {/* Receipt divider */}
                      <div className="border-t border-dashed border-slate-300 my-2" />

                      {/* Total Net Pay */}
                      <div className="flex justify-between items-center">
                        <div>
                          <p className="text-[11px] font-black tracking-wider text-blue-650 uppercase mb-0.5">{t[lang].payslipActualPosedValue}</p>
                          <p className="text-[10px] text-slate-500 font-semibold tracking-wider font-mono">{t[lang].payslipCurrencyText}</p>
                        </div>
                        <p className="text-2xl font-black text-slate-900 font-sans tracking-tight">
                          ฿16,774.00
                        </p>
                      </div>

                      {/* Bottom disclaimer note */}
                      <div className="text-[10px] text-slate-500 font-semibold leading-normal text-justify pt-2 border-t border-slate-200">
                        {t[lang].payslipBottomNote}
                      </div>
                    </div>

                    {/* Action buttons or status indicator */}
                    <div className="pt-2">
                      {payslipStatus === 'pending' ? (
                        <div className="flex gap-3">
                          <button 
                            onClick={() => {
                              handleUpdatePayslipStatus('rejected');
                              showToast(t[lang].payslipRejectToast, 'error');
                            }}
                            className="flex-1 py-3.5 bg-white hover:bg-rose-50 border border-rose-250 active:scale-[0.98] text-rose-600 rounded-2xl text-xs font-black tracking-widest uppercase transition-all flex items-center justify-center gap-1.5 shadow-xs"
                          >
                            <X size={13} strokeWidth={3} />
                            {t[lang].btnRejectPayslip}
                          </button>
                          <button 
                            onClick={() => {
                              handleUpdatePayslipStatus('confirmed');
                              showToast(t[lang].payslipSuccessToast, 'success');
                            }}
                            className="flex-1 py-3.5 bg-blue-600 hover:bg-blue-700 active:scale-[0.98] text-white rounded-2xl text-xs font-black tracking-widest uppercase transition-all shadow-md flex items-center justify-center gap-1.5 animate-pulse"
                          >
                            <Check size={13} strokeWidth={3} />
                            {t[lang].btnConfirmPayslip}
                          </button>
                        </div>
                      ) : payslipStatus === 'confirmed' ? (
                        <div className="bg-emerald-50 border border-emerald-150/40 rounded-2xl py-3.5 flex items-center justify-center gap-2 shadow-xs">
                          <CheckCircle2 size={16} className="text-emerald-600 animate-bounce" />
                          <span className="text-[11px] font-black text-emerald-800 uppercase tracking-widest">
                            {t[lang].payslipStatusConfirmed} (2026-06-19)
                          </span>
                        </div>
                      ) : (
                        <div className="bg-rose-50 border border-rose-150/40 rounded-2xl py-3.5 flex items-center justify-center gap-2 shadow-xs">
                          <AlertCircle size={16} className="text-rose-500 animate-pulse" />
                          <span className="text-[11px] font-black text-rose-800 uppercase tracking-widest">
                            {t[lang].payslipStatusRejected}
                          </span>
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </motion.div>
            </div>
          )}
        </AnimatePresence>

        {/* Daily Attendance Status Detail Modal */}
        <AnimatePresence>
          {isAttendanceDetailOpen && (() => {
            const statusInfo = getAttendanceStatusInfo(checkInData.inTime, checkInData.outTime, lang);
            return (
              <div className="absolute inset-0 z-50 flex items-center justify-center p-6 bg-slate-950/45 backdrop-blur-md">
                <motion.div 
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  onClick={() => setIsAttendanceDetailOpen(false)}
                  className="absolute inset-0"
                />
                
                <motion.div 
                  initial={{ opacity: 0, scale: 0.95, y: 20 }}
                  animate={{ opacity: 1, scale: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.95, y: 20 }}
                  transition={{ type: "spring", damping: 25, stiffness: 350 }}
                  className="relative bg-white/95 w-full max-w-sm rounded-2xl p-6 shadow-2xl border border-slate-100 z-10 flex flex-col"
                >
                  {/* Close Button */}
                  <button 
                    onClick={() => setIsAttendanceDetailOpen(false)}
                    className="absolute top-4.5 right-4.5 p-1.5 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-500 hover:text-slate-800 transition-colors"
                  >
                    <X size={14} />
                  </button>

                  {/* Icon */}
                  <div className="flex justify-center mb-4 mt-2">
                    <div className={`w-12 h-12 rounded-2xl flex items-center justify-center shadow-sm ${
                      statusInfo.key === 'clocked_in_completed' ? 'bg-emerald-50 text-emerald-600' :
                      statusInfo.key === 'not_clocked_in' ? 'bg-slate-100 text-slate-500' :
                      statusInfo.key === 'missed_clock_in' ? 'bg-rose-50 text-rose-600' : 'bg-amber-50 text-amber-600'
                    }`}>
                      {statusInfo.key === 'clocked_in_completed' ? <CheckCircle2 size={22} className="text-emerald-600" /> :
                       statusInfo.key === 'not_clocked_in' ? <Timer size={22} className="text-slate-500" /> :
                       statusInfo.key === 'missed_clock_in' ? <AlertCircle size={22} className="text-rose-600" /> : <AlertTriangle size={22} className="text-amber-600" />}
                    </div>
                  </div>

                  {/* Section Label */}
                  <span className="text-[10px] text-center text-blue-600 font-extrabold uppercase tracking-[0.14em] mb-1.5 block">
                    {lang === 'zh' ? '考勤状态详情' : lang === 'en' ? 'Attendance Status Description' : 'รายละเอียดสถานะการเข้างาน'}
                  </span>

                  {/* State Name */}
                  <h3 className="text-base font-black text-slate-900 text-center px-1 leading-relaxed mb-4 flex items-center justify-center gap-2">
                    <span className={`w-2.5 h-2.5 rounded-full ${statusInfo.indicatorBg}`} />
                    {statusInfo.label}
                  </h3>

                  {/* Descriptions Card */}
                  <div className="bg-slate-50/60 border border-slate-100/50 rounded-2xl p-4 mb-4.5">
                    <p className="text-xs font-bold leading-relaxed text-slate-600 text-justify mb-3">
                      {statusInfo.desc}
                    </p>

                    <div className="border-t border-slate-150/40 pt-3 space-y-2">
                      <div className="flex justify-between items-center text-[10px] font-bold">
                        <span className="text-slate-400 uppercase tracking-widest">{t[lang].clockIn}</span>
                        <span className="font-mono text-slate-700 font-black">{checkInData.inTime || '--:--'}</span>
                      </div>
                      <div className="flex justify-between items-center text-[10px] font-bold">
                        <span className="text-slate-400 uppercase tracking-widest">{t[lang].clockOut}</span>
                        <span className="font-mono text-slate-700 font-black">{checkInData.outTime || '--:--'}</span>
                      </div>
                      <div className="flex justify-between items-center text-[10px] font-bold">
                        <span className="text-slate-400 uppercase tracking-widest">{lang === 'zh' ? '打卡地点' : lang === 'en' ? 'Location' : 'สถานที่บันทึก'}</span>
                        <span className="text-slate-750 font-black truncate max-w-[180px]">{t[lang].bangkokWh.replace('曼谷 ', '').replace('Bangkok ', '')}</span>
                      </div>
                    </div>
                  </div>

                  {/* Standard notice text instruction */}
                  <div className="text-[9px] text-slate-400 leading-normal text-center mb-4 px-2">
                    {lang === 'zh' 
                      ? '系统打卡数据实时核算，如有代打卡、漏打卡、出勤异常，请及时呈批请假或联系HR修正。' 
                      : lang === 'en' 
                        ? 'Punch-card logs are synchronized in real-time. Please file a dispute with HR in case of errors.' 
                        : 'ข้อมูลล็อกประสานงานเวลาจริง หากพบข้อผิดพลาดหรือเข้าคู่สายโปรดติดต่อหน่วยบุคคลพัฒนาคลังสินค้าเพื่อสืบประวัติแก้ไข'}
                  </div>

                  <button 
                    onClick={() => setIsAttendanceDetailOpen(false)}
                    className="w-full py-3.5 bg-slate-900 hover:bg-slate-800 active:scale-[0.98] text-white rounded-2xl text-[10px] font-black tracking-widest uppercase transition-all shadow-md flex items-center justify-center gap-1.5"
                  >
                    <Check size={12} strokeWidth={3} />
                    {lang === 'zh' ? '关闭详情' : lang === 'en' ? 'Close Details' : 'ปิดหน้านี้'}
                  </button>
                </motion.div>
              </div>
            );
          })()}
        </AnimatePresence>

        <div className="flex-1 pb-24 pt-4 overflow-y-auto no-scrollbar scroll-smooth">
          <AnimatePresence mode="wait">
            {currentPage === 'home' && (
              <motion.div 
                key="home"
                initial={{ opacity: 0, scale: 0.98 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.98 }}
                transition={{ duration: 0.2 }}
                className="px-6 pt-4 space-y-5"
              >
                {/* Daily Attendance Status Banner */}
                {(() => {
                  const statusInfo = getAttendanceStatusInfo(checkInData.inTime, checkInData.outTime, lang);
                  return (
                    <div 
                      onClick={() => setIsAttendanceDetailOpen(true)}
                      className={`rounded-xl border p-4.5 shadow-xs transition-all duration-300 cursor-pointer hover:scale-[1.01] active:scale-[0.99] ${statusInfo.bgColor}`}
                    >
                      <div className="flex justify-between items-center">
                        <span className="text-xs text-slate-500 font-extrabold uppercase tracking-wider flex items-center gap-1">
                          {t[lang].attendanceStatusTitle}
                          <span className="text-[9px] text-slate-400 font-normal normal-case">({lang === 'zh' ? '点击查看详情' : lang === 'en' ? 'click to view' : 'คลิกเพื่อดูรายละเอียด'})</span>
                        </span>
                        <div className="flex items-center gap-2">
                          <span className={`w-2.5 h-2.5 rounded-full ${statusInfo.indicatorBg}`} />
                          <span className="text-sm font-black text-slate-800">
                            {statusInfo.label}
                          </span>
                        </div>
                      </div>
                    </div>
                  );
                })()}

                {/* Check-in Card */}
                <div className="relative group">
                  <div className={`absolute inset-0 bg-gradient-to-br transition-all duration-500 rounded-2xl blur-xl opacity-20 group-hover:opacity-30
                    ${checkInData.status === 'in' ? 'from-emerald-500 to-green-500' : checkInData.status === 'out' ? 'from-slate-400 to-slate-500' : 'from-blue-500 to-blue-600'}`} />
                  
                  <div className="relative bg-white rounded-2xl border border-slate-100 p-6 shadow-sm overflow-hidden">
                    <div className="flex justify-between items-start mb-6">
                      <div>
                        <p className="text-[10px] text-slate-400 font-black uppercase tracking-[0.15em]">{t[lang].systemTime}</p>
                        <p className="text-4xl font-black text-slate-900 mono tracking-tighter mt-1">{detailedTime}</p>
                        <p className="text-[11px] text-slate-500 font-semibold mt-1">{formattedDate}</p>
                      </div>
                      <div>
                        {checkInData.status === 'in' ? (
                          <div className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-50 text-emerald-600 rounded-full text-[10px] font-black uppercase tracking-wider border border-emerald-100">
                            <span className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse shadow-[0_0_8px_rgba(16,185,129,0.5)]" />
                            {t[lang].active}
                          </div>
                        ) : checkInData.status === 'out' ? (
                          <div className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-100 text-slate-500 rounded-full text-[10px] font-black uppercase tracking-wider border border-slate-200">
                            {t[lang].completed}
                          </div>
                        ) : (
                          <div className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-100 text-slate-400 rounded-full text-[10px] font-black uppercase tracking-wider border border-slate-200">
                            {t[lang].noRecord}
                          </div>
                        )}
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4 mb-6">
                      <div className="bg-slate-50 rounded-xl p-4 border border-slate-100/80 text-center">
                        <div className="flex items-center justify-center gap-2 mb-2">
                          <div className={`w-2 h-2 rounded-full ${checkInData.inTime ? 'bg-emerald-500' : 'bg-slate-300'}`} />
                          <span className="text-[9px] text-slate-400 font-black uppercase tracking-widest">{t[lang].clockIn}</span>
                        </div>
                        <p className={`text-2xl font-black mono tracking-tight ${checkInData.inTime ? 'text-slate-800' : 'text-slate-300'}`}>
                          {checkInData.inTime || '--:--'}
                        </p>
                      </div>
                      <div className="bg-slate-50 rounded-xl p-4 border border-slate-100/80 text-center">
                        <div className="flex items-center justify-center gap-2 mb-2">
                          <div className={`w-2 h-2 rounded-full ${checkInData.outTime ? 'bg-blue-500' : 'bg-slate-300'}`} />
                          <span className="text-[9px] text-slate-400 font-black uppercase tracking-widest">{t[lang].clockOut}</span>
                        </div>
                        <p className={`text-2xl font-black mono tracking-tight ${checkInData.outTime ? 'text-slate-800' : 'text-slate-300'}`}>
                          {checkInData.outTime || '--:--'}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 py-3 px-4 bg-blue-50/50 rounded-xl border border-blue-100 text-[11px] text-blue-600 font-bold mb-6">
                      <MapPin size={14} strokeWidth={2.5} />
                      <span className="truncate">{t[lang].bangkokWh}</span>
                    </div>

                    <button 
                      onClick={handleCheckIn}
                      disabled={checkInData.status === 'out'}
                      className={`w-full py-4.5 rounded-xl font-black text-sm uppercase tracking-widest transition-all shadow-lg active:scale-95 flex items-center justify-center gap-2
                        ${checkInData.status === 'none' 
                           ? 'bg-blue-600 text-white shadow-blue-500/25 hover:bg-blue-700' 
                           : checkInData.status === 'in' 
                           ? 'bg-amber-500 text-white shadow-amber-500/25 hover:bg-amber-600'
                           : 'bg-slate-100 text-slate-400 shadow-none cursor-not-allowed'
                        }`}
                    >
                      {checkInData.status === 'none' ? <Timer size={18} /> : checkInData.status === 'in' ? <LogOut size={18} /> : <CheckCircle2 size={18} />}
                      {checkInData.status === 'none' ? t[lang].btnClockIn : checkInData.status === 'in' ? t[lang].btnClockOut : t[lang].btnCompleted}
                    </button>
                  </div>
                </div>

                {/* Stats Grid */}
                <div className="grid grid-cols-3 gap-3">
                  <div className="bg-white p-4 rounded-xl border border-slate-100 shadow-sm text-center">
                    <p className="text-[9px] text-slate-400 font-black uppercase tracking-widest">{t[lang].monthlyHours}</p>
                    <p className="text-xl font-black text-slate-900 mt-1">164<span className="text-[10px] text-slate-400 ml-0.5">h</span></p>
                  </div>
                  <div className="bg-white p-4 rounded-xl border border-slate-100 shadow-sm text-center">
                    <p className="text-[9px] text-slate-400 font-black uppercase tracking-widest">{t[lang].attendedDays}</p>
                    <p className="text-xl font-black text-slate-900 mt-1">18<span className="text-[10px] text-slate-400 ml-0.5">d</span></p>
                  </div>
                  <div className="bg-white p-4 rounded-xl border border-slate-100 shadow-sm text-center">
                    <p className="text-[9px] text-slate-400 font-black uppercase tracking-widest">{t[lang].pendingSOPs}</p>
                    <p className="text-xl font-black text-slate-900 mt-1">{sops.filter(s => !s.read).length}<span className="text-[10px] text-slate-400 ml-0.5">p</span></p>
                  </div>
                </div>

                {/* Notifications */}
                <div className="bg-white rounded-xl border border-slate-100 p-5 space-y-4 shadow-sm">
                  <div className="flex justify-between items-center">
                    <h2 className="text-sm font-black text-slate-900 uppercase tracking-widest">{t[lang].sysNotice}</h2>
                    <button className="text-[10px] font-black text-blue-600 uppercase tracking-widest hover:underline">{t[lang].viewAll}</button>
                  </div>
                  
                  <div className="space-y-4">
                    <div className="flex gap-4 items-start group cursor-pointer" 
                      onClick={() => setSelectedNotice({
                        id: 1,
                        iconType: 'bell',
                        title: t[lang].notice1Title,
                        sender: lang === 'zh' ? '仓储安全管理部' : lang === 'en' ? 'Warehouse Safety Division' : 'ส่วนบริการความปลอดภัยคลังสินค้า',
                        time: '2026-06-19 14:00',
                        content: lang === 'zh' 
                          ? '为了切实提高全体仓储人员的消防安全意识，熟练掌握仓库火灾应急处置技能及灭火器材的正确使用方法，公司定于本周五（2026年6月23日）下午 14:00-15:30 在大仓外部空地及A区集货区举行半年度消防疏散演练及灭火实操考核。届时火灾警报声将响起，请各区域操作主管有序组织组员，按照预定疏散路线迅速且安全地撤离至集结区。请全体员工务必准时参加签名，此活动已纳入季度班组安全生产与合规绩效考核，如有特殊事由确实无法参训，须提前提交书面加盖公章请假，谢谢配合。'
                          : lang === 'en'
                            ? 'In order to effectively improve risk preparedness and fire safety awareness of all personnel, WMS management will hold a professional evacuation protocol rehearsal and fire extinguishing equipment assessment dry-run this Friday (June 23, 2026) from 14:00 to 15:30. Evacuation alarms will sound. Shift supervisors must lead their workers swiftly to the safety assembly area near Logistics Gateway 3. Attendance is highly essential and affects team regulatory safety performance metrics.'
                            : 'เพื่อยกระดับทักษะการเผชิญเหตุและการซ้อมอพยพหนีไฟสำหรับพนักงานคลังสินค้าทั้งหมด ฝ่ายบริหารจะจัดซ้อมปฏิบัติการดับเพลิงและการอพยพประจำครึ่งปีในบ่ายวันศุกร์นี้ (23 มิถุนายน พ.ศ. 2569) เวลา 14:00 - 15:30 น. สัญญาณเตือนภัยจะดังขึ้นในช่วงเวลาดังกล่าว โปรดเตรียมความพร้อมและปฏิบัติตามคำสั่งของหัวหน้างานเพื่อเดินทางออกไปยังจุดระดมพลที่ปลอดภัยอย่างเคร่งครัด'
                      })}
                    >
                      <div className="w-10 h-10 rounded-xl bg-blue-50 flex items-center justify-center shrink-0 group-hover:bg-blue-100 transition-colors">
                        <Bell size={18} className="text-blue-600" />
                      </div>
                      <div className="flex-1 overflow-hidden">
                        <p className="text-xs font-bold text-slate-800">{t[lang].notice1Title}</p>
                        <p className="text-[11px] text-slate-500 mt-0.5 truncate mr-2">{t[lang].notice1Desc}</p>
                      </div>
                      <ChevronRight size={14} className="text-slate-300 self-center" />
                    </div>
                    <div className="flex gap-4 items-start group cursor-pointer" 
                      onClick={() => setSelectedNotice({
                        id: 2,
                        iconType: 'payroll',
                        title: t[lang].notice2Title,
                        sender: lang === 'zh' ? '综合人力资源部' : lang === 'en' ? 'HR Operations' : 'ฝ่ายบริหารทรัพยากรบุคคล',
                        time: '2026-06-10 09:00',
                        content: lang === 'zh' 
                          ? '亲爱的同事，您 2026 年 4 月份实发工资与津贴、社会保险申报明细已核算发放，并已正式发布至系统数据库中。请您直接登录“我的”面板中的工资条与出勤工时明细子页面进行线上解密查阅。请核对本月打卡出勤天数、公假扣减和加班核算工时是否相符。如有任何对账疑问或信息偏差，请务必于 2026 年 6 月 25 日 18:00 前将书面申诉表交递给HR考勤管理组人员。逾期此期账目将强制封存确认为最终发放金额，祝您生活愉快！'
                          : lang === 'en'
                            ? 'Your official salary transaction history and localized allowance calculations for the period of April 2026 have been successfully balanced and published. Please navigate to "Profile" -> "Payslip & Shift logs" to decode and view detail entries. Please double-check days attended, sick leaves, and custom overtime (OT) counts. Address any ledger discrepancies or dispute files with General HR Operations explicitly before June 25, 2026, at 18:00.'
                            : 'รายละเอียดการจ่ายค่าจ้าง รายจ่าย และสิทธิประโยชน์ของท่านสําหรับงวดเดือน เมษายน พ.ศ. 2569 ได้มีการกระจายและอัปเดตเข้าระบบอย่างเป็นทางการแล้ว โปรดเข้าไปที่หน้า "ข้อมูลของฉัน" เพื่อดูสลิปเงินเดือนและประวัติการลงเวลาส่วนบุคคลของท่าน หากพบข้อผิดพลาดหรือมีข้อยืนยันคลาดเคลื่อน โปรดดำเนินการติดต่อประสานงานกับฝ่าย HR ทันทีภายในวันที่ 25 มิถุนายน พ.ศ. 2569 เวลา 18:00 น.',
                        isPayslip: true
                      })}
                    >
                      <div className="w-10 h-10 rounded-xl bg-emerald-50 flex items-center justify-center shrink-0 group-hover:bg-emerald-100 transition-colors">
                        <CheckCircle2 size={18} className="text-emerald-600" />
                      </div>
                      <div className="flex-1 overflow-hidden">
                        <p className="text-xs font-bold text-slate-800">{t[lang].notice2Title}</p>
                        <p className="text-[11px] text-slate-500 mt-0.5 truncate mr-2">{t[lang].notice2Desc}</p>
                      </div>
                      <ChevronRight size={14} className="text-slate-300 self-center" />
                    </div>
                  </div>
                </div>
              </motion.div>
            )}

            {currentPage === 'attendance' && (
              <motion.div 
                key="attendance"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                className="px-6 space-y-6"
              >
                <div className="flex justify-between items-center">
                  <h1 className="text-2xl font-black text-slate-900 uppercase tracking-tight">{t[lang].attendance}</h1>
                  {attendanceSubTab === 'leave' && (
                    <button 
                      onClick={() => setIsApplying(!isApplying)}
                      className="py-2 px-4 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-black uppercase tracking-wider transition-all shadow-md active:scale-95 flex items-center gap-1 shrink-0"
                    >
                      {isApplying ? t[lang].btnCancel : t[lang].applyLeave}
                    </button>
                  )}
                </div>

                {/* Sub-tab Selector Segmented Control */}
                <div className="flex bg-slate-100 p-1 rounded-xl border border-slate-50 shadow-sm">
                  <button
                    onClick={() => {
                      setAttendanceSubTab('log');
                      setIsApplying(false);
                    }}
                    className={`flex-1 py-1.5 text-center text-xs font-black rounded-lg transition-all active:scale-95 ${
                      attendanceSubTab === 'log'
                        ? 'bg-white text-slate-900 shadow-[0_2px_8px_rgba(0,0,0,0.06)]'
                        : 'text-slate-500 hover:text-slate-700'
                    }`}
                  >
                    {lang === 'zh' ? '打卡记录' : lang === 'en' ? 'Clock Logs' : 'บันทึกเข้างาน'}
                  </button>
                  <button
                    onClick={() => setAttendanceSubTab('leave')}
                    className={`flex-1 py-1.5 text-center text-xs font-black rounded-lg transition-all active:scale-95 ${
                      attendanceSubTab === 'leave'
                        ? 'bg-white text-slate-900 shadow-[0_2px_8px_rgba(0,0,0,0.06)]'
                        : 'text-slate-500 hover:text-slate-700'
                    }`}
                  >
                    {lang === 'zh' ? '请假管理' : lang === 'en' ? 'Leave Requests' : 'การขอลา'}
                  </button>
                </div>

                {/* Tab Content */}
                {attendanceSubTab === 'log' ? (
                  <div className="bg-white rounded-2xl border border-slate-100 overflow-hidden shadow-sm">
                    {attendance.map((record, i) => (
                      <div key={i} className="flex justify-between items-center p-5 border-b border-slate-50 last:border-0 hover:bg-slate-50 transition-colors cursor-pointer">
                        <div>
                          <p className="text-xs font-black text-slate-800">{record.date}</p>
                          <p className="text-[11px] text-slate-500 font-bold mono mt-1">{record.in} - {record.out}</p>
                        </div>
                        <div className="text-right">
                          <span className={`inline-block px-3 py-1 rounded-full text-[9px] font-black uppercase tracking-widest border
                            ${record.type === 'overtime' ? 'bg-purple-50 text-purple-600 border-purple-100' : 'bg-emerald-50 text-emerald-600 border-emerald-100'}`}>
                            {record.type === 'overtime' ? t[lang].overtime : t[lang].normal}
                          </span>
                          <p className="text-[11px] text-slate-400 font-bold mono mt-1.5 tracking-tight">{record.hours}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="space-y-6">
                    {/* Leaves Stats card */}
                    <div className="bg-white rounded-xl border border-slate-100 p-4 shadow-sm flex justify-around text-center">
                      <div>
                        <p className="text-[10px] text-slate-400 font-black uppercase tracking-widest">{t[lang].leaveHours}</p>
                        <p className="text-2xl font-black text-slate-900 mt-1">
                          {leaves.reduce((acc, curr) => curr.status === 'approved' ? acc + curr.days : acc, 0)}
                          <span className="text-[11px] text-slate-400 ml-1 font-semibold">{t[lang].leaveDaysLabel}</span>
                        </p>
                      </div>
                      <div className="w-px bg-slate-100 self-stretch" />
                      <div>
                        <p className="text-[10px] text-slate-400 font-black uppercase tracking-widest">{t[lang].leaveStatus}</p>
                        <p className="text-2xl font-black text-amber-500 mt-1">
                          {leaves.filter(l => l.status === 'pending').length}
                          <span className="text-[11px] text-slate-400 ml-1 font-semibold">{lang === 'zh' ? '单待审' : 'pending'}</span>
                        </p>
                      </div>
                    </div>

                    {/* Application Form */}
                    <AnimatePresence>
                      {isApplying && (
                        <motion.div
                          initial={{ opacity: 0, height: 0, y: -10 }}
                          animate={{ opacity: 1, height: 'auto', y: 0 }}
                          exit={{ opacity: 0, height: 0, y: -10 }}
                          className="overflow-hidden"
                        >
                          <form onSubmit={handleApplyLeave} className="bg-white rounded-xl border border-blue-100/80 p-5 space-y-4 shadow-sm">
                            <h2 className="text-xs font-black text-slate-800 uppercase tracking-wider mb-2 flex items-center gap-2 text-blue-600">
                              <span className="w-1.5 h-3 bg-blue-600 rounded-full" />
                              {t[lang].applyLeave}
                            </h2>

                            <div>
                              <label className="block text-[10px] text-slate-400 font-black uppercase tracking-wider mb-1.5">{t[lang].leaveType}</label>
                              <div className="grid grid-cols-4 gap-2">
                                {(['personal', 'sick', 'annual', 'special'] as const).map((type) => {
                                  const label = type === 'personal' ? t[lang].typePersonal 
                                              : type === 'sick' ? t[lang].typeSick 
                                              : type === 'annual' ? t[lang].typeAnnual 
                                              : t[lang].typeSpecial;
                                  const isActive = leaveForm.type === type;
                                  return (
                                    <button
                                      key={type}
                                      type="button"
                                      onClick={() => setLeaveForm(prev => ({ ...prev, type }))}
                                      className={`py-2 px-1 text-[11px] font-bold rounded-xl border text-center transition-all active:scale-95
                                        ${isActive 
                                          ? 'text-white bg-blue-600 border-blue-600 shadow-sm' 
                                          : 'text-slate-500 bg-slate-50 hover:bg-slate-100 border-slate-200'}`}
                                    >
                                      {label}
                                    </button>
                                  );
                                })}
                              </div>
                            </div>

                            <div className="grid grid-cols-2 gap-3">
                              <div>
                                <label className="block text-[10px] text-slate-400 font-black uppercase tracking-wider mb-1.5">{t[lang].startDate}</label>
                                <input 
                                  type="date"
                                  value={leaveForm.startDate}
                                  onChange={(e) => setLeaveForm(prev => ({ ...prev, startDate: e.target.value }))}
                                  className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold focus:outline-none focus:border-blue-500 transition-colors"
                                />
                              </div>
                              <div>
                                <label className="block text-[10px] text-slate-400 font-black uppercase tracking-wider mb-1.5">{t[lang].endDate}</label>
                                <input 
                                  type="date"
                                  value={leaveForm.endDate}
                                  onChange={(e) => setLeaveForm(prev => ({ ...prev, endDate: e.target.value }))}
                                  className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold focus:outline-none focus:border-blue-500 transition-colors"
                                />
                              </div>
                            </div>

                            {leaveForm.startDate && leaveForm.endDate && (
                              <div className="text-right text-[11px] font-black text-blue-600 uppercase tracking-wider">
                                {t[lang].duration}: <span className="text-sm">{calculateDays(leaveForm.startDate, leaveForm.endDate)}</span> {t[lang].totalDays}
                              </div>
                            )}

                            <div>
                              <label className="block text-[10px] text-slate-400 font-black uppercase tracking-wider mb-1.5">{t[lang].leaveReason}</label>
                              <textarea
                                rows={3}
                                placeholder={t[lang].reasonPlaceholder}
                                value={leaveForm.reason}
                                onChange={(e) => setLeaveForm(prev => ({ ...prev, reason: e.target.value }))}
                                className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold focus:outline-none focus:border-blue-500 transition-colors placeholder-slate-350 resize-none"
                              />
                            </div>

                            <div className="grid grid-cols-2 gap-3 pt-2">
                              <button
                                type="button"
                                onClick={() => setIsApplying(false)}
                                className="w-full py-3 bg-slate-100 hover:bg-slate-200 text-slate-600 font-bold rounded-xl text-xs uppercase tracking-wider transition-colors"
                              >
                                {t[lang].btnCancel}
                              </button>
                              <button
                                type="submit"
                                className="w-full py-3 bg-blue-600 hover:bg-blue-700 text-white font-black rounded-xl text-xs uppercase tracking-wider transition-colors shadow-md active:scale-95"
                              >
                                {t[lang].btnSubmit}
                              </button>
                            </div>
                          </form>
                        </motion.div>
                      )}
                    </AnimatePresence>

                    {/* History List */}
                    <div className="space-y-3">
                      <h2 className="text-xs font-black text-slate-400 uppercase tracking-widest">{t[lang].leaveHistory}</h2>

                      {leaves.length === 0 ? (
                        <div className="bg-white rounded-xl border border-slate-100 p-8 text-center text-slate-400">
                          <p className="text-xs font-bold">{lang === 'zh' ? '暂无请假记录' : lang === 'en' ? 'No leave records found' : 'ไม่พบประวัติการลา'}</p>
                        </div>
                      ) : (
                        <div className="space-y-3">
                          {leaves.map((record) => {
                            const typeLabel = record.type === 'personal' ? t[lang].typePersonal 
                                            : record.type === 'sick' ? t[lang].typeSick 
                                            : record.type === 'annual' ? t[lang].typeAnnual 
                                            : t[lang].typeSpecial;
                                            
                            const typeColor = record.type === 'personal' ? 'bg-blue-50 text-blue-600 border-blue-100'
                                            : record.type === 'sick' ? 'bg-rose-50 text-rose-600 border-rose-100'
                                            : record.type === 'annual' ? 'bg-emerald-50 text-emerald-600 border-emerald-100'
                                            : 'bg-purple-50 text-purple-600 border-purple-100';

                            const statusLabel = record.status === 'pending' ? t[lang].statusPending 
                                              : record.status === 'approved' ? t[lang].statusApproved 
                                              : t[lang].statusRejected;
                                              
                            const statusColor = record.status === 'pending' ? 'bg-amber-50 text-amber-600 border-amber-100'
                                              : record.status === 'approved' ? 'bg-emerald-50 text-emerald-600 border-emerald-100'
                                              : 'bg-rose-50 text-rose-600 border-rose-100';

                            return (
                              <div key={record.id} className="bg-white rounded-xl border border-slate-100 p-4 shadow-sm space-y-2.5">
                                <div className="flex justify-between items-center">
                                  <div className="flex items-center gap-2">
                                    <span className={`px-2.5 py-0.5 rounded-lg text-[9px] font-black uppercase tracking-wider border ${typeColor}`}>
                                      {typeLabel}
                                    </span>
                                    <span className="text-xs font-black text-slate-800">
                                      {record.days} {t[lang].totalDays}
                                    </span>
                                  </div>
                                  <span className={`px-2.5 py-0.5 rounded-lg text-[9px] font-black uppercase tracking-wider border ${statusColor}`}>
                                    {statusLabel}
                                  </span>
                                </div>

                                <div className="text-[11px] font-bold text-slate-500">
                                  {record.startDate} {lang === 'zh' ? '至' : lang === 'en' ? 'to' : 'ถึง'} {record.endDate}
                                </div>

                                <p className="text-xs font-bold text-slate-700 bg-slate-50/70 p-2.5 rounded-lg border border-slate-100/50">
                                  {record.reason}
                                </p>
                              </div>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </motion.div>
            )}

            {currentPage === 'sop' && (
              <motion.div 
                key={selectedSopId === null ? "sop-list" : `sop-details-${selectedSopId}`}
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                className="px-6"
              >
                {selectedSopId === null ? (
                  <>
                    <h1 className="text-2xl font-black text-slate-900 mb-6 uppercase tracking-tight">{t[lang].sopTitle}</h1>
                    <div className="space-y-3">
                      {sops.map((sop) => (
                        <div 
                          key={sop.id} 
                          onClick={() => {
                            setSelectedSopId(sop.id);
                          }}
                          className="flex justify-between items-center p-5 bg-white rounded-xl border border-slate-100 shadow-sm active:scale-95 hover:border-blue-100/80 transition-all cursor-pointer group"
                        >
                          <div className="flex items-center gap-4">
                            <div className={`w-11 h-11 rounded-xl flex items-center justify-center shrink-0 border transition-colors
                              ${sop.read ? 'bg-slate-50 border-slate-100 text-slate-400' : 'bg-blue-50 border-blue-100 text-blue-600'}`}>
                              <FileText size={20} strokeWidth={sop.read ? 2 : 2.5} />
                            </div>
                            <div>
                              <p className={`text-sm font-bold ${sop.read ? 'text-slate-600' : 'text-slate-900'}`}>{getSopTitle(sop.id, lang)}</p>
                              <p className="text-[10px] text-slate-400 font-bold mt-1 uppercase tracking-widest">{sop.ver} · {t[lang].updatedAt} {sop.date}</p>
                            </div>
                          </div>
                          {!sop.read ? (
                            <div className="w-2 h-2 bg-rose-500 rounded-full shadow-[0_0_8px_rgba(244,63,94,0.6)]" />
                          ) : (
                            <ChevronRight size={14} className="text-slate-300 group-hover:text-slate-400 transition-colors" />
                          )}
                        </div>
                      ))}
                    </div>
                  </>
                ) : (() => {
                  const activeSop = sops.find(s => s.id === selectedSopId);
                  const details = activeSop && SOP_DETAILS_DATA[lang][activeSop.id];
                  if (!activeSop || !details) return null;
                  return (
                    <div className="space-y-6">
                      {/* Top Header Layer */}
                      <div className="flex justify-between items-center bg-slate-50/80 backdrop-blur-md sticky top-0 py-2 z-10 bg-white/40 border-b border-safe border-slate-100/30 -mx-6 px-6">
                        <button
                          onClick={() => setSelectedSopId(null)}
                          className="flex items-center gap-1.5 py-1.5 px-3 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-full text-xs font-black uppercase tracking-wider transition-all shadow-sm active:scale-95"
                        >
                          <ChevronLeft size={14} strokeWidth={2.5} />
                          <span>{t[lang].sopBack}</span>
                        </button>
                        
                        {activeSop.read ? (
                          <span className="px-3 py-1 bg-emerald-50 text-emerald-600 rounded-full text-[10px] font-black uppercase tracking-wider border border-emerald-100 flex items-center gap-1">
                            <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full" />
                            {t[lang].sopRead}
                          </span>
                        ) : (
                          <span className="px-3 py-1 bg-rose-50 text-rose-600 rounded-full text-[10px] font-black uppercase tracking-wider border border-rose-100 flex items-center gap-1 animate-pulse">
                            <span className="w-1.5 h-1.5 bg-rose-500 rounded-full animate-ping" />
                            {t[lang].sopToRead}
                          </span>
                        )}
                      </div>

                      {/* Header Title Info */}
                      <div>
                        <h1 className="text-xl font-black text-slate-900 mt-2 leading-tight tracking-tight">
                          {getSopTitle(activeSop.id, lang)}
                        </h1>
                        
                        <div className="flex items-center gap-4 mt-2 text-[10px] text-slate-400 font-bold uppercase tracking-wider">
                          <div className="flex items-center gap-1.5">
                            <Calendar size={12} />
                            <span>{activeSop.ver}</span>
                          </div>
                          <div className="flex items-center gap-1.5">
                            <Clock size={12} />
                            <span>{t[lang].updatedAt} {activeSop.date}</span>
                          </div>
                        </div>
                      </div>

                      {/* Content Section 1: Overview */}
                      <div className="bg-gradient-to-br from-blue-50/40 to-indigo-50/30 rounded-xl p-5 border border-blue-50/50 shadow-sm">
                        <div className="flex items-center gap-2 mb-2">
                          <Shield size={16} className="text-blue-600" />
                          <h3 className="text-xs font-black text-slate-850 uppercase tracking-wider">{t[lang].sopOverview}</h3>
                        </div>
                        <p className="text-xs leading-relaxed text-slate-600 font-bold">
                          {details.overview}
                        </p>
                      </div>

                      {/* Content Section 2: Core Directives */}
                      <div className="bg-white rounded-xl p-5 border border-slate-100 shadow-sm space-y-3">
                        <div className="flex items-center gap-2 mb-1">
                          <AlertCircle size={16} className="text-amber-500" />
                          <h3 className="text-xs font-black text-slate-800 uppercase tracking-wider">{t[lang].sopGuidelines}</h3>
                        </div>
                        <ul className="space-y-3">
                          {details.guidelines.map((rule, idx) => (
                            <li key={idx} className="flex gap-2.5 items-start text-xs text-slate-600 leading-relaxed font-bold">
                              <span className="w-1.5 h-1.5 bg-blue-600 rounded-full shrink-0 mt-1.5" />
                              <span>{rule}</span>
                            </li>
                          ))}
                        </ul>
                      </div>

                      {/* Content Section 3: Step-by-step self checklist */}
                      <div className="bg-white rounded-xl p-5 border border-slate-100 shadow-sm space-y-4">
                        <div className="flex items-center gap-2">
                          <CheckCircle2 size={16} className="text-emerald-500" />
                          <h3 className="text-xs font-black text-slate-800 uppercase tracking-wider">{t[lang].sopChecklist}</h3>
                        </div>
                        <div className="space-y-3">
                          {details.steps.map((step, idx) => {
                            const isChecked = !!checkedSteps[idx];
                            return (
                              <div 
                                key={idx}
                                onClick={() => {
                                  setCheckedSteps(prev => ({ ...prev, [idx]: !prev[idx] }));
                                }}
                                className={`flex items-start gap-3 p-3.5 rounded-lg border transition-all cursor-pointer group select-none
                                  ${isChecked 
                                    ? 'bg-emerald-50/30 border-emerald-100/60' 
                                    : 'bg-slate-50/50 border-slate-100 hover:bg-slate-50'}`}
                              >
                                <button className="shrink-0 mt-0.5 text-blue-600 focus:outline-none transition-transform group-hover:scale-110 active:scale-90">
                                  {isChecked ? (
                                    <CheckSquare size={18} className="text-emerald-600" strokeWidth={2.5} />
                                  ) : (
                                    <Square size={18} className="text-slate-400 group-hover:text-slate-600 font-semibold" strokeWidth={2} />
                                  )}
                                </button>
                                <div className="flex-1 min-w-0">
                                  <p className={`text-xs font-bold leading-tight ${isChecked ? 'text-slate-500 line-through decoration-slate-300' : 'text-slate-800'}`}>
                                    {step.text}
                                  </p>
                                  {step.sub && (
                                    <p className={`text-[10px] mt-1 font-bold ${isChecked ? 'text-slate-400 font-medium' : 'text-slate-450'}`}>
                                      {step.sub}
                                    </p>
                                  )}
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </div>

                      {/* Content Section 4: Emergency Warning */}
                      <div className="bg-rose-50/50 rounded-xl p-5 border border-rose-100/40 shadow-sm">
                        <div className="flex items-center gap-2 mb-2">
                          <Phone size={16} className="text-rose-600 animate-pulse" />
                          <h3 className="text-xs font-black text-slate-800 uppercase tracking-wider">{t[lang].sopWarning}</h3>
                        </div>
                        <p className="text-xs leading-relaxed text-rose-700 font-extrabold">
                          {details.warning}
                        </p>
                      </div>

                      {/* Content Section 5: Signature Complete button */}
                      <div className="mt-8 mb-4">
                        <button
                          onClick={() => {
                            setSops(prev => prev.map(s => s.id === activeSop.id ? { ...s, read: true } : s));
                            showToast(t[lang].sopCompleteSuccess, 'success');
                            setSelectedSopId(null);
                          }}
                          className="w-full py-4.5 rounded-xl bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 active:scale-[0.98] text-white text-xs font-black tracking-widest uppercase shadow-lg shadow-blue-500/20 transition-all flex items-center justify-center gap-2"
                        >
                          <ShieldCheck size={16} />
                          <span>{t[lang].sopCompleteBtn}</span>
                        </button>
                      </div>
                    </div>
                  );
                })()}
              </motion.div>
            )}

            {currentPage === 'mine' && (
              <motion.div 
                key="mine"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                className="px-6 bg-slate-50 h-full"
              >
                <div className="text-center py-8">
                  <div 
                    onClick={() => setIsAvatarModalOpen(true)}
                    className="relative inline-block cursor-pointer group hover:scale-[1.03] active:scale-95 transition-transform"
                  >
                    {renderAvatarContainer('w-28 h-28', 'text-4xl', true)}
                    <div className="absolute -bottom-1 -right-1 w-10 h-10 bg-emerald-500 border-4 border-white rounded-xl z-20 flex items-center justify-center shadow-lg group-hover:bg-blue-600 transition-colors">
                      <CheckCircle2 size={20} className="text-white" />
                    </div>
                  </div>
                  <h2 className="text-2xl font-black text-slate-900 mt-6 tracking-tight">{user.name}</h2>
                  <span className="inline-block mt-2 px-4 py-1.5 bg-white rounded-full border border-slate-200 text-[10px] font-black text-slate-500 uppercase tracking-widest shadow-sm">
                    {t[lang].dept}
                  </span>
                </div>

                {/* Language Settings Card */}
                <div className="bg-white rounded-xl border border-slate-100 p-5 shadow-sm mb-6">
                  <div className="flex items-center gap-2 mb-3">
                    <span className="flex h-2 w-2 relative">
                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-blue-400 opacity-75"></span>
                      <span className="relative inline-flex rounded-full h-2 w-2 bg-blue-500"></span>
                    </span>
                    <h3 className="text-xs font-black text-slate-800 uppercase tracking-wider">
                      {t[lang].switchLang}
                    </h3>
                  </div>
                  
                  <div className="grid grid-cols-3 gap-2">
                    <button 
                      onClick={() => { changeLang('zh'); showToast('已切换至简体中文', 'success'); }}
                      className={`py-3 px-2 text-xs font-black rounded-xl border transition-all text-center active:scale-95
                        ${lang === 'zh' 
                          ? 'text-white bg-blue-600 border-blue-600 shadow-sm font-bold' 
                          : 'text-slate-500 bg-slate-50 hover:bg-slate-100 border-slate-200/60'}`}
                    >
                      {t[lang].langZh}
                    </button>
                    <button 
                      onClick={() => { changeLang('en'); showToast('Switched to English', 'success'); }}
                      className={`py-3 px-2 text-xs font-black rounded-xl border transition-all text-center active:scale-95
                        ${lang === 'en' 
                          ? 'text-white bg-blue-600 border-blue-600 shadow-sm font-bold' 
                          : 'text-slate-500 bg-slate-50 hover:bg-slate-100 border-slate-200/60'}`}
                    >
                      {t[lang].langEn}
                    </button>
                    <button 
                      onClick={() => { changeLang('th'); showToast('เปลี่ยนเป็นภาษาไทยแล้ว', 'success'); }}
                      className={`py-3 px-2 text-xs font-black rounded-xl border transition-all text-center active:scale-95
                        ${lang === 'th' 
                          ? 'text-white bg-blue-600 border-blue-600 shadow-sm font-bold' 
                          : 'text-slate-500 bg-slate-50 hover:bg-slate-100 border-slate-200/60'}`}
                    >
                      {t[lang].langTh}
                    </button>
                  </div>
                </div>





                <div className="bg-white rounded-xl border border-slate-100 overflow-hidden shadow-sm divide-y divide-slate-50">
                  <div 
                    onClick={() => {
                      showToast(lang === 'zh' ? '正在检查新版本...' : lang === 'en' ? 'Checking for updates...' : 'กำลังตรวจสอบการอัปเดต...', 'info');
                      setTimeout(() => {
                        showToast(lang === 'zh' ? '当前已是最新版本 (V1.0.24)' : lang === 'en' ? 'Your app is up to date (V1.0.24)' : 'แอปพลิเคชันเป็นเวอร์ชันล่าสุดแล้ว (V1.0.24)', 'success');
                      }, 1000);
                    }}
                    className="flex items-center justify-between p-5 hover:bg-slate-50 transition-colors cursor-pointer group select-none"
                  >
                    <div className="flex items-center gap-4">
                      <div className="w-10 h-10 rounded-xl bg-blue-50 flex items-center justify-center border border-blue-100 group-hover:scale-110 transition-transform">
                        <RefreshCw size={18} className="text-blue-600 group-hover:rotate-180 duration-500 transition-transform" />
                      </div>
                      <div className="flex flex-col">
                        <span className="text-sm font-bold text-slate-800">{t[lang].lblUpdateApp}</span>
                        <span className="text-[10px] text-slate-400 font-bold mt-0.5">V1.0.24</span>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="px-2 py-0.5 rounded-full bg-blue-50/50 border border-blue-100 text-blue-600 font-extrabold text-[9px] uppercase tracking-wider scale-90">
                        {lang === 'zh' ? '最新' : lang === 'en' ? 'LATEST' : 'ล่าสุด'}
                      </span>
                      <ChevronRight size={18} className="text-slate-300 group-hover:translate-x-0.5 transition-transform" />
                    </div>
                  </div>
                  <div className="flex items-center justify-between p-5 hover:bg-slate-50 transition-colors cursor-pointer group">
                    <div className="flex items-center gap-4">
                      <div className="w-10 h-10 rounded-xl bg-emerald-50 flex items-center justify-center border border-emerald-100 group-hover:scale-110 transition-transform">
                        <ShieldCheck size={18} className="text-emerald-600" />
                      </div>
                      <span className="text-sm font-bold text-slate-800">{t[lang].lblPrivacyPolicy}</span>
                    </div>
                    <ChevronRight size={18} className="text-slate-300" />
                  </div>
                  <button 
                    onClick={() => showToast(t[lang].safeLogout, 'info')}
                    className="w-full p-5 text-rose-500 font-black text-sm uppercase tracking-[0.2em] hover:bg-rose-50 transition-colors flex items-center justify-center gap-2"
                  >
                    <LogOut size={16} />
                    {t[lang].btnLogout}
                  </button>
                </div>
                
                <p className="text-center text-[9px] text-slate-300 font-bold uppercase tracking-widest mt-12 mb-6">
                  WMSHR Global · v1.0.24
                </p>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        <TabBar current={currentPage} onNav={(page) => {
          setCurrentPage(page);
          if (page !== 'sop') {
            setSelectedSopId(null);
          }
        }} lang={lang} />
      </div>
    </ErrorBoundary>
  );
}
