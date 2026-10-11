export const ATTENDANCE_TYPE_NAMES: Record<string, string> = {
  normal: "正常",
  exempt_present: "免打卡",
  rest: "休息",
  late: "迟到",
  early: "早退",
  absent: "缺勤",
  leave: "假期",
  sick_leave: "病假",
  overtime: "加班",
  manual_adjusted: "人工调整",
  checked_in: "已上班",
  pending: "待打卡",
  exception: "异常"
};

export const ATTENDANCE_TYPE_CLASSES: Record<string, string> = {
  normal: "bg-green-100 text-green-700",
  exempt_present: "bg-sky-100 text-sky-700",
  rest: "bg-slate-100 text-slate-600",
  late: "bg-yellow-100 text-yellow-700",
  early: "bg-orange-100 text-orange-700",
  absent: "bg-red-100 text-red-700",
  leave: "bg-blue-100 text-blue-700",
  sick_leave: "bg-cyan-100 text-cyan-700",
  overtime: "bg-purple-100 text-purple-700",
  manual_adjusted: "bg-amber-100 text-amber-700",
  checked_in: "bg-indigo-100 text-indigo-700",
  pending: "bg-slate-100 text-slate-700",
  exception: "bg-rose-100 text-rose-700"
};

export const COUNTRY_NAMES: Record<string, string> = {
  MM: "缅甸",
  TH: "泰国",
  CN: "中国",
  VN: "越南",
  KH: "柬埔寨",
  MY: "马来西亚",
  PH: "菲律宾",
  ID: "印尼",
  LA: "老挝"
};

export const isNonWorkingAttendanceType = (t: string) =>
  t === "absent" || t === "leave" || t === "sick_leave" || t === "pending";
