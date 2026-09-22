/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { AppConfig, AttendanceRecord, Employee, GoodsRecord, HolidayRecord } from "./types";

export const INITIAL_CONFIG: AppConfig = {
  startShift: "08:30",
  endShift: "17:30",
  breakStart: "12:00",
  breakEnd: "13:00",
  standardHours: 8,
  otHourlyFee: 50,
  overtimeMultiplier: 1.5,
  taxRate: 0.05,
  dailyBreakMinutes: 60,
  currency: 'THB',
  companyLat: 16.8661,
  companyLng: 96.1951,
  companyAddress: "Yangon Logistics Center"
};

export const INITIAL_EMPLOYEES: Employee[] = [
  { id: 1, name: 'Thin Thin Aung', gender: 'female', country: 'MM', role: '拣货员', dept: 'A区入库', hourlyRate: 280, baseMonthlyWage: 66000, attendanceBonus: 1000, socialSecurity: 750, currency: 'THB', joinDate: '2025-01-10', status: '在职', photo: null, bankName: "盘谷银行 (Bangkok Bank)", bankCardNumber: "101849204859", idCard: "1 4299 00601 37 2" },
  { id: 2, name: 'Khin Yu Swe', gender: 'female', country: 'MM', role: '打包员', dept: 'B区出库', hourlyRate: 260, baseMonthlyWage: 60000, attendanceBonus: 1000, socialSecurity: 750, currency: 'THB', joinDate: '2025-02-14', status: '在职', photo: null, bankName: "泰华农民银行 (Kasikornbank)", bankCardNumber: "702958102938", idCard: "3 1505 00319 17 4" },
  { id: 3, name: 'Khin Yu Wai', gender: 'female', country: 'MM', role: '打包员', dept: 'B区出库', hourlyRate: 260, baseMonthlyWage: 60000, attendanceBonus: 1000, socialSecurity: 750, currency: 'THB', joinDate: '2025-03-01', status: '在职', photo: null, bankName: "大城银行 (Krungsri)", bankCardNumber: "553948201294", idCard: "1 6299 00483 97 1" },
  { id: 4, name: 'Khin Htar Win', gender: 'female', country: 'MM', role: '组长', dept: '全仓', hourlyRate: 350, baseMonthlyWage: 84000, attendanceBonus: 1500, socialSecurity: 1000, currency: 'THB', joinDate: '2024-11-05', status: '休假', photo: null, bankName: "盘谷银行 (Bangkok Bank)", bankCardNumber: "101958203958", idCard: "1 4799 00191 90 5" },
  { id: 5, name: 'Soe Thinzar Nwe', gender: 'female', country: 'MM', role: '质检员', dept: 'D区质检', hourlyRate: 290, baseMonthlyWage: 69000, attendanceBonus: 1000, socialSecurity: 750, currency: 'THB', joinDate: '2025-04-20', status: '在职', photo: null, idCard: "1 6502 00069 98 8" },
  { id: 6, name: 'Phyo Lin Aung', gender: 'male', country: 'MM', role: '叉车工', dept: 'C区包装', hourlyRate: 320, baseMonthlyWage: 75000, attendanceBonus: 1200, socialSecurity: 800, currency: 'THB', joinDate: '2024-12-15', status: '在职', photo: null, idCard: "1 7401 00234 56 9" },
  { id: 7, name: 'Zin Min Htet', gender: 'male', country: 'MM', role: '拣货员', dept: 'A区入库', hourlyRate: 280, baseMonthlyWage: 66000, attendanceBonus: 1000, socialSecurity: 750, currency: 'THB', joinDate: '2025-01-25', status: '在职', photo: null, idCard: "1 5202 00059 88 1" },
  { id: 8, name: 'Aang Myint Than', gender: 'male', country: 'MM', role: '仓管员', dept: '仓库管理', hourlyRate: 300, baseMonthlyWage: 72000, attendanceBonus: 1200, socialSecurity: 800, currency: 'THB', joinDate: '2024-06-20', status: '在职', photo: null, idCard: "1 4403 00122 74 3" },
  { id: 9, name: 'Miss onuma', gender: 'female', country: 'TH', role: '打包员', dept: 'E区包装', hourlyRate: 300, baseMonthlyWage: 72000, attendanceBonus: 1000, socialSecurity: 750, currency: 'THB', joinDate: '2025-03-10', status: '在职', photo: null, bankName: "汇商银行 (Siam Commercial Bank)", bankCardNumber: "045294850123", idCard: "1 4799 00191 90 5" },
  { id: 10, name: 'Miss Namphueng', gender: 'female', country: 'TH', role: '拣货员', dept: 'A区入库', hourlyRate: 290, baseMonthlyWage: 69000, attendanceBonus: 1000, socialSecurity: 750, currency: 'THB', joinDate: '2025-04-05', status: '休假', photo: null, idCard: "3 1505 00319 17 4" },
  { id: 11, name: 'Gary-1', gender: 'male', country: 'CN', role: '系统管理员', dept: '全仓', hourlyRate: 400, baseMonthlyWage: 120000, attendanceBonus: 2000, socialSecurity: 1500, currency: 'CNY', joinDate: '2025-01-01', status: '在职', photo: null, bankName: "中国工商银行", bankCardNumber: "6222021001234567890", idCard: "110101199001011234", username: "Gary-1" }
];

export const INITIAL_ATTENDANCE: AttendanceRecord[] = [
  { id: 'a1', empId: 1, date: '2026-05-15', inTime: '08:00', outTime: '18:00', type: 'normal', note: '' },
  { id: 'a2', empId: 1, date: '2026-05-16', inTime: '08:00', outTime: '19:30', type: 'overtime', note: '' },
  { id: 'a3', empId: 2, date: '2026-05-15', inTime: '08:30', outTime: '19:00', type: 'normal', note: '' },
  { id: 'a4', empId: 2, date: '2026-05-16', inTime: '08:15', outTime: '20:00', type: 'normal', note: '' },
  { id: 'a5', empId: 3, date: '2026-05-15', inTime: '08:30', outTime: '18:30', type: 'normal', note: '' },
  { id: 'a6', empId: 3, date: '2026-05-16', inTime: '08:30', outTime: '19:30', type: 'normal', note: '' },
  { id: 'a7', empId: 5, date: '2026-05-15', inTime: '08:30', outTime: '17:30', type: 'normal', note: '' },
  { id: 'a8', empId: 5, date: '2026-05-17', inTime: '09:17', outTime: '16:01', type: 'normal', note: '' },
  { id: 'a9', empId: 6, date: '2026-05-15', inTime: '08:30', outTime: '19:30', type: 'normal', note: '' },
  { id: 'a10', empId: 6, date: '2026-05-16', inTime: '08:30', outTime: '17:30', type: 'normal', note: '' },
  { id: 'a11', empId: 7, date: '2026-05-15', inTime: '08:30', outTime: '17:30', type: 'normal', note: '' },
  { id: 'a12', empId: 8, date: '2026-05-15', inTime: '08:30', outTime: '17:30', type: 'normal', note: '' },
  { id: 'a13', empId: 9, date: '2026-05-15', inTime: '08:30', outTime: '18:30', type: 'normal', note: '' }
];

export const INITIAL_GOODS: GoodsRecord[] = [
  {
    id: "g-1",
    customerName: "跨境先锋贸易有限公司 (Pioneer Trade)",
    goodsName: "智能穿戴手表 & 蓝牙耳机 (精装箱)",
    goodsPhoto: "https://images.unsplash.com/photo-1546868871-7041f2a55e12?w=150&auto=format&fit=crop&q=60",
    arrivalDate: "2026-05-15",
    pieces: 450,
    entryNo: "WMS-IN-20260515001",
    status: "completed",
    receiverId: 8,
    receiverName: "Aang Myint Than",
    signSlipName: "WMS_SIGNED_REC_G1.pdf",
    note: "外包装完好，高货值贵重物品已完成盘点",
    skus: [
      { sku: "WT-225-BLK", qty: 250, desc: "智能穿戴手表-幻影黑" },
      { sku: "EP-880-WHT", qty: 200, desc: "立体声低音蓝牙耳机-白色" }
    ]
  },
  {
    id: "g-2",
    customerName: "宏达汽车配件厂 (Honda Parts Supply)",
    goodsName: "高强度合金轴承 H-201型",
    goodsPhoto: "https://images.unsplash.com/photo-1581092160607-ee22621dd758?w=150&auto=format&fit=crop&q=60",
    arrivalDate: "2026-05-16",
    pieces: 1200,
    entryNo: "WMS-IN-20260516008",
    status: "completed",
    receiverId: 6,
    receiverName: "Phyo Lin Aung",
    signSlipName: "RECEIPT_BATCH_8A_SIGNED.jpg",
    note: "双托盘，堆垛机已运入C区包装托架",
    skus: [
      { sku: "BRG-H201-HD", qty: 1200, desc: "精工高合金抗腐蚀轴承 H-201型" }
    ]
  },
  {
    id: "g-3",
    customerName: "优选百货供应链 (BestMart Logistics)",
    goodsName: "夏季防晒喷雾 & 保湿水套装",
    goodsPhoto: "https://images.unsplash.com/photo-1526413232644-8a4000b0e991?w=150&auto=format&fit=crop&q=60",
    arrivalDate: "2026-05-17",
    pieces: 800,
    entryNo: "WMS-IN-20260517012",
    status: "arrived",
    note: "已卸货至入库待检区，等待扫描质检 and 签字确认",
    skus: [
      { sku: "SUN-SP-05", qty: 450, desc: "夏季高倍清爽防晒喷雾 spf50+" },
      { sku: "MST-WTR-10", qty: 350, desc: "透明特润草本保湿水套装" }
    ]
  },
  {
    id: "g-4",
    customerName: "极光电脑配件经销 (Aurora Components)",
    goodsName: "高分子散热硅脂架 & 防静电袋包",
    goodsPhoto: "https://images.unsplash.com/photo-1591405351990-4726e33df58d?w=150&auto=format&fit=crop&q=60",
    arrivalDate: "2026-05-18",
    pieces: 1500,
    entryNo: "WMS-IN-20260518003",
    status: "pending",
    note: "货主反馈已发货，预计2026-05-18上午由德邦物流送达",
    skus: [
      { sku: "PAD-THM-12", qty: 1500, desc: "高分子固态导热硅脂架" }
    ]
  }
];

export const INITIAL_HOLIDAYS: HolidayRecord[] = [
  // 中国 2026 常用法定节假日
  { date: '2026-01-01', name: '元旦 (CN)', country: 'CN' },
  { date: '2026-02-17', name: '春节 (CN)', country: 'CN' },
  { date: '2026-04-05', name: '清明节 (CN)', country: 'CN' },
  { date: '2026-05-01', name: '五一劳动节 (CN)', country: 'CN' },
  { date: '2026-10-01', name: '国庆节 (CN)', country: 'CN' },
  
  // 泰国 2026 常用法定节假日
  { date: '2026-01-01', name: '新年元旦 (TH)', country: 'TH' },
  { date: '2026-04-13', name: '泼水节/宋干节 (TH)', country: 'TH' },
  { date: '2026-04-14', name: '泼水节/宋干节 (TH)', country: 'TH' },
  { date: '2026-04-15', name: '泼水节/宋干节 (TH)', country: 'TH' },
  { date: '2026-05-01', name: '国际劳动节 (TH)', country: 'TH' },
  { date: '2026-12-05', name: '国庆节/先王诞辰 (TH)', country: 'TH' },
  
  // 缅甸 2026 常用法定节假日
  { date: '2026-01-04', name: '独立日 (MM)', country: 'MM' },
  { date: '2026-04-13', name: '泼水节/新年 (MM)', country: 'MM' },
  { date: '2026-04-14', name: '泼水节/新年 (MM)', country: 'MM' },
  { date: '2026-04-15', name: '泼水节/新年 (MM)', country: 'MM' },
  { date: '2026-04-16', name: '泼水节/新年 (MM)', country: 'MM' },
  { date: '2026-05-01', name: '劳动节 (MM)', country: 'MM' },

  // 越南 2026 常用法定节假日
  { date: '2026-01-01', name: '新年元旦 (VN)', country: 'VN' },
  { date: '2026-02-17', name: '越南春节 (VN)', country: 'VN' },
  { date: '2026-04-30', name: '南方解放日 (VN)', country: 'VN' },
  { date: '2026-05-01', name: '国际劳动节 (VN)', country: 'VN' },
  { date: '2026-09-02', name: '国庆节 (VN)', country: 'VN' },

  // 柬埔寨 2026 常用法定节假日
  { date: '2026-01-01', name: '国际元旦 (KH)', country: 'KH' },
  { date: '2026-01-07', name: '胜利纪念日 (KH)', country: 'KH' },
  { date: '2026-04-14', name: '柬埔寨新年 (KH)', country: 'KH' },
  { date: '2026-04-15', name: '柬埔寨新年 (KH)', country: 'KH' },
  { date: '2026-04-16', name: '柬埔寨新年 (KH)', country: 'KH' },
  { date: '2026-05-01', name: '国际劳动节 (KH)', country: 'KH' },

  // 马来西亚 2026 常用法定节假日
  { date: '2026-01-01', name: '元旦 (MY)', country: 'MY' },
  { date: '2026-02-17', name: '农历新年 (MY)', country: 'MY' },
  { date: '2026-02-18', name: '农历新年第二天 (MY)', country: 'MY' },
  { date: '2026-03-20', name: '开斋节 (MY)', country: 'MY' },
  { date: '2026-05-01', name: '劳动节 (MY)', country: 'MY' },
  { date: '2026-08-31', name: '国庆节 (MY)', country: 'MY' },

  // 印度尼西亚 2026 常用法定节假日
  { date: '2026-01-01', name: '元旦 (ID)', country: 'ID' },
  { date: '2026-02-17', name: '农历新年 (ID)', country: 'ID' },
  { date: '2026-03-20', name: '开斋节 (ID)', country: 'ID' },
  { date: '2026-05-01', name: '劳动节 (ID)', country: 'ID' },
  { date: '2026-08-17', name: '独立日 (ID)', country: 'ID' },

  // 新加坡 2026 常用法定节假日
  { date: '2026-01-01', name: '元旦 (SG)', country: 'SG' },
  { date: '2026-02-17', name: '农历新年 (SG)', country: 'SG' },
  { date: '2026-02-18', name: '农历新年第二天 (SG)', country: 'SG' },
  { date: '2026-03-20', name: '开斋节 (SG)', country: 'SG' },
  { date: '2026-05-01', name: '劳动节 (SG)', country: 'SG' },
  { date: '2026-08-09', name: '国庆节 (SG)', country: 'SG' },

  // 菲律宾 2026 常用法定节假日
  { date: '2026-01-01', name: '元旦 (PH)', country: 'PH' },
  { date: '2026-04-02', name: '濯足节 (PH)', country: 'PH' },
  { date: '2026-04-03', name: '耶稣受难日 (PH)', country: 'PH' },
  { date: '2026-05-01', name: '劳动节 (PH)', country: 'PH' },
  { date: '2026-06-12', name: '独立日 (PH)', country: 'PH' },
  { date: '2026-11-30', name: '滂尼发秀日 (PH)', country: 'PH' },
  { date: '2026-12-25', name: '圣诞节 (PH)', country: 'PH' },

  // 韩国 2026 常用法定节假日
  { date: '2026-01-01', name: '新正元旦 (KR)', country: 'KR' },
  { date: '2026-02-17', name: '旧正/春节 (KR)', country: 'KR' },
  { date: '2026-03-01', name: '三一节 (KR)', country: 'KR' },
  { date: '2026-05-05', name: '儿童节 (KR)', country: 'KR' },
  { date: '2026-08-15', name: '光复节 (KR)', country: 'KR' },
  { date: '2026-10-03', name: '开天节 (KR)', country: 'KR' },

  // 日本 2026 常用法定节假日
  { date: '2026-01-01', name: '元旦 (JP)', country: 'JP' },
  { date: '2026-01-12', name: '成人之日 (JP)', country: 'JP' },
  { date: '2026-02-11', name: '建国纪念日 (JP)', country: 'JP' },
  { date: '2026-04-29', name: '昭和之日 (JP)', country: 'JP' },
  { date: '2026-05-03', name: '宪法纪念日 (JP)', country: 'JP' },
  { date: '2026-05-04', name: '绿之日 (JP)', country: 'JP' },
  { date: '2026-05-05', name: '儿童之日 (JP)', country: 'JP' },
  { date: '2026-11-23', name: '勤劳感谢之日 (JP)', country: 'JP' },

  // 文莱 2026 常用法定节假日
  { date: '2026-01-01', name: '元旦 (BN)', country: 'BN' },
  { date: '2026-02-17', name: '农历新年 (BN)', country: 'BN' },
  { date: '2026-02-23', name: '国庆节 (BN)', country: 'BN' },
  { date: '2026-03-20', name: '开斋节 (BN)', country: 'BN' },
  { date: '2026-07-15', name: '苏丹陛下华诞 (BN)', country: 'BN' }
];
