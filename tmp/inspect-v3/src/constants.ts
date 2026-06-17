/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { AppConfig, AttendanceRecord, Employee, GoodsRecord } from "./types";

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
  currency: 'THB'
};

export const INITIAL_EMPLOYEES: Employee[] = [
  { id: 1, name: 'Thin Thin Aung', gender: 'female', country: 'MM', role: '拣货员', dept: 'A区入库', hourlyRate: 280, baseMonthlyWage: 66000, attendanceBonus: 1000, socialSecurity: 750, currency: 'THB', joinDate: '2025-01-10', status: '在职', photo: null },
  { id: 2, name: 'Khin Yu Swe', gender: 'female', country: 'MM', role: '打包员', dept: 'B区出库', hourlyRate: 260, baseMonthlyWage: 60000, attendanceBonus: 1000, socialSecurity: 750, currency: 'THB', joinDate: '2025-02-14', status: '在职', photo: null },
  { id: 3, name: 'Khin Yu Wai', gender: 'female', country: 'MM', role: '打包员', dept: 'B区出库', hourlyRate: 260, baseMonthlyWage: 60000, attendanceBonus: 1000, socialSecurity: 750, currency: 'THB', joinDate: '2025-03-01', status: '在职', photo: null },
  { id: 4, name: 'Khin Htar Win', gender: 'female', country: 'MM', role: '组长', dept: '全仓', hourlyRate: 350, baseMonthlyWage: 84000, attendanceBonus: 1500, socialSecurity: 1000, currency: 'THB', joinDate: '2024-11-05', status: '休假', photo: null },
  { id: 5, name: 'Soe Thinzar Nwe', gender: 'female', country: 'MM', role: '质检员', dept: 'D区质检', hourlyRate: 290, baseMonthlyWage: 69000, attendanceBonus: 1000, socialSecurity: 750, currency: 'THB', joinDate: '2025-04-20', status: '在职', photo: null },
  { id: 6, name: 'Phyo Lin Aung', gender: 'male', country: 'MM', role: '叉车工', dept: 'C区包装', hourlyRate: 320, baseMonthlyWage: 75000, attendanceBonus: 1200, socialSecurity: 800, currency: 'THB', joinDate: '2024-12-15', status: '在职', photo: null },
  { id: 7, name: 'Zin Min Htet', gender: 'male', country: 'MM', role: '拣货员', dept: 'A区入库', hourlyRate: 280, baseMonthlyWage: 66000, attendanceBonus: 1000, socialSecurity: 750, currency: 'THB', joinDate: '2025-01-25', status: '在职', photo: null },
  { id: 8, name: 'Aang Myint Than', gender: 'male', country: 'MM', role: '仓管员', dept: '仓库管理', hourlyRate: 300, baseMonthlyWage: 72000, attendanceBonus: 1200, socialSecurity: 800, currency: 'THB', joinDate: '2024-06-20', status: '在职', photo: null },
  { id: 9, name: 'Miss onuma', gender: 'female', country: 'TH', role: '打包员', dept: 'E区包装', hourlyRate: 300, baseMonthlyWage: 72000, attendanceBonus: 1000, socialSecurity: 750, currency: 'THB', joinDate: '2025-03-10', status: '在职', photo: null },
  { id: 10, name: 'Miss Namphueng', gender: 'female', country: 'TH', role: '拣货员', dept: 'A区入库', hourlyRate: 290, baseMonthlyWage: 69000, attendanceBonus: 1000, socialSecurity: 750, currency: 'THB', joinDate: '2025-04-05', status: '休假', photo: null }
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

