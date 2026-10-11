import type { RefObject } from "react";
import { Loader2, Clock, MapPin, Eye, Edit } from "lucide-react";
import type { AppConfig, AttendanceRecord, Employee, HolidayRecord, LeaveRequest } from "../../../types";
import { cn, formatCurrency, formatDuration, formatTime } from "../../../lib/utils";
import { Button } from "../../ui/button";
import { Badge } from "../../ui/badge";
import { ATTENDANCE_TYPE_CLASSES } from "../constants";
import type { AttendanceDetailRecord, FlatAttendanceRow } from "../types";
import { getRowMetrics } from "../utils/rowMetrics";

interface AttendanceMainTableProps {
  // 表头与表格引用
  tableContainerRef: RefObject<HTMLDivElement | null>;
  mirrorHeaderRef: RefObject<HTMLDivElement | null>;
  realTableRef: RefObject<HTMLTableElement | null>;
  realTheadRef: RefObject<HTMLTableSectionElement | null>;
  tableHeadSentinelRef: RefObject<HTMLDivElement | null>;
  isMirrorHeaderVisible: boolean;
  colWidths: number[];
  realTableWidth: number;
  handleTableScroll: () => void;

  // 数据与状态
  flatRows: FlatAttendanceRow[];
  pagedRows: FlatAttendanceRow[];
  isTableLoading: boolean;
  selectedIds: Set<string>;
  onSelect: (id: string, checked: boolean) => void;
  onSelectAll: (ids: string[]) => void;
  visibleAttendanceRecords: AttendanceRecord[];
  isAllSelected: boolean;
  isPartiallySelected: boolean;

  // 配置与依赖
  config: AppConfig;
  holidays: HolidayRecord[];
  leaveRequests: LeaveRequest[];
  hasPermission?: (permId: string) => boolean;

  // 操作交互
  onViewDetail: (rec: AttendanceDetailRecord) => void;
  onEditRecord: (id: string | null, empId?: number, date?: string, rec?: AttendanceRecord | null) => void;
  onResetFilters: () => void;
  isFiltered: boolean;
}

export function AttendanceMainTable({
  tableContainerRef,
  mirrorHeaderRef,
  realTableRef,
  realTheadRef,
  tableHeadSentinelRef,
  isMirrorHeaderVisible,
  colWidths,
  realTableWidth,
  handleTableScroll,
  flatRows,
  pagedRows,
  isTableLoading,
  selectedIds,
  onSelect,
  onSelectAll,
  visibleAttendanceRecords,
  isAllSelected,
  isPartiallySelected,
  config,
  holidays,
  leaveRequests,
  hasPermission = () => true,
  onViewDetail,
  onEditRecord,
  onResetFilters,
  isFiltered
}: AttendanceMainTableProps) {
  return (
    <>
      {/* 悬浮镜像表头 (Sticky Mirror Header) */}
      {isMirrorHeaderVisible && (
        <div
          ref={mirrorHeaderRef}
          className="sticky top-[57px] z-20 overflow-hidden bg-white/95 backdrop-blur-xs shadow-md border-b border-slate-200 transition-all pointer-events-none"
        >
          <table
            style={{ width: realTableWidth > 0 ? `${realTableWidth}px` : undefined }}
            className="text-left border-collapse min-w-[1440px]"
          >
            <thead>
              <tr className="text-slate-500 text-xs uppercase bg-slate-50/90 select-none">
                <th style={{ width: colWidths[0] ? `${colWidths[0]}px` : undefined }} className="px-4 py-3 text-center w-10 border-b border-slate-200">
                  <input
                    type="checkbox"
                    checked={isAllSelected}
                    readOnly
                    tabIndex={-1}
                    className="w-4 h-4 accent-brand-600 cursor-pointer"
                  />
                </th>
                <th style={{ width: colWidths[1] ? `${colWidths[1]}px` : undefined }} className="px-4 py-3 font-medium text-left border-b border-slate-200 whitespace-nowrap">日期</th>
                <th style={{ width: colWidths[2] ? `${colWidths[2]}px` : undefined }} className="px-4 py-3 font-medium text-left border-b border-slate-200 whitespace-nowrap">员工</th>
                <th style={{ width: colWidths[3] ? `${colWidths[3]}px` : undefined }} className="px-4 py-3 font-medium text-center border-b border-slate-200 whitespace-nowrap">状态</th>
                <th style={{ width: colWidths[4] ? `${colWidths[4]}px` : undefined }} className="px-4 py-3 font-medium text-center border-b border-slate-200 whitespace-nowrap">上班</th>
                <th style={{ width: colWidths[5] ? `${colWidths[5]}px` : undefined }} className="px-4 py-3 font-medium text-center border-b border-slate-200 whitespace-nowrap">下班</th>
                <th style={{ width: colWidths[6] ? `${colWidths[6]}px` : undefined }} className="px-4 py-3 font-medium text-center border-b border-slate-200 whitespace-nowrap">工时</th>
                <th style={{ width: colWidths[7] ? `${colWidths[7]}px` : undefined }} className="px-4 py-3 font-medium text-center border-b border-slate-200 whitespace-nowrap">加班</th>
                <th style={{ width: colWidths[8] ? `${colWidths[8]}px` : undefined }} className="px-4 py-3 font-medium text-right border-b border-slate-200 whitespace-nowrap">薪资</th>
                <th style={{ width: colWidths[9] ? `${colWidths[9]}px` : undefined }} className="px-4 py-3 font-medium text-right border-b border-slate-200 whitespace-nowrap">加班费</th>
                <th style={{ width: colWidths[10] ? `${colWidths[10]}px` : undefined }} className="px-4 py-3 font-medium text-right border-b border-slate-200 whitespace-nowrap">餐补</th>
                <th style={{ width: colWidths[11] ? `${colWidths[11]}px` : undefined }} className="px-4 py-3 font-medium text-right border-b border-slate-200 whitespace-nowrap">社保</th>
                <th style={{ width: colWidths[12] ? `${colWidths[12]}px` : undefined }} className="px-4 py-3 font-medium text-right border-b border-slate-200 whitespace-nowrap">服务费</th>
                <th style={{ width: colWidths[13] ? `${colWidths[13]}px` : undefined }} className="px-4 py-3 font-medium text-right text-blue-600 border-b border-slate-200 whitespace-nowrap">合计</th>
                <th style={{ width: colWidths[14] ? `${colWidths[14]}px` : undefined }} className="sticky right-0 bg-slate-50/95 px-4 py-3 font-medium text-center border-b border-slate-200 whitespace-nowrap shadow-[-4px_0_6px_-2px_rgba(0,0,0,0.05)]">操作</th>
              </tr>
            </thead>
          </table>
        </div>
      )}

      <div ref={tableHeadSentinelRef} className="h-0 w-full" />
      <div ref={tableContainerRef} onScroll={handleTableScroll} className="overflow-x-auto relative rounded-b-xl">
        <table ref={realTableRef} className="w-full text-left border-collapse min-w-[1440px]">
          <thead ref={realTheadRef}>
            <tr className="text-slate-500 text-xs uppercase border-b border-slate-100 bg-slate-50/75">
              <th className="px-4 py-3 text-center w-10 border-b border-slate-100">
                <input
                  type="checkbox"
                  ref={el => {
                    if (el) {
                      el.indeterminate = isPartiallySelected;
                    }
                  }}
                  checked={isAllSelected}
                  onChange={(e) => {
                    if (e.target.checked) {
                      onSelectAll(visibleAttendanceRecords.map(r => r.id));
                    } else {
                      onSelectAll([]);
                    }
                  }}
                  className="w-4 h-4 accent-brand-600 cursor-pointer"
                />
              </th>
              <th className="px-4 py-3 font-medium text-left border-b border-slate-100 whitespace-nowrap min-w-[110px]">日期</th>
              <th className="px-4 py-3 font-medium text-left border-b border-slate-100 whitespace-nowrap min-w-[140px]">员工</th>
              <th className="px-4 py-3 font-medium text-center border-b border-slate-100 whitespace-nowrap min-w-[80px]">状态</th>
              <th className="px-4 py-3 font-medium text-center border-b border-slate-100 whitespace-nowrap min-w-[100px]">上班</th>
              <th className="px-4 py-3 font-medium text-center border-b border-slate-100 whitespace-nowrap min-w-[100px]">下班</th>
              <th className="px-4 py-3 font-medium text-center border-b border-slate-100 whitespace-nowrap min-w-[70px]">工时</th>
              <th className="px-4 py-3 font-medium text-center border-b border-slate-100 whitespace-nowrap min-w-[70px]">加班</th>
              <th className="px-4 py-3 font-medium text-right border-b border-slate-100 whitespace-nowrap min-w-[90px]">薪资</th>
              <th className="px-4 py-3 font-medium text-right border-b border-slate-100 whitespace-nowrap min-w-[85px]">加班费</th>
              <th className="px-4 py-3 font-medium text-right border-b border-slate-100 whitespace-nowrap min-w-[75px]">餐补</th>
              <th className="px-4 py-3 font-medium text-right border-b border-slate-100 whitespace-nowrap min-w-[75px]">社保</th>
              <th className="px-4 py-3 font-medium text-right border-b border-slate-100 whitespace-nowrap min-w-[85px]">服务费</th>
              <th className="px-4 py-3 font-medium text-right text-blue-600 border-b border-slate-100 whitespace-nowrap min-w-[100px]">合计</th>
              <th className="sticky right-0 bg-slate-50/95 px-4 py-3 font-medium text-center border-b border-slate-100 whitespace-nowrap shadow-[-4px_0_6px_-2px_rgba(0,0,0,0.05)] z-10 min-w-[130px]">操作</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {isTableLoading ? (
              <tr>
                <td colSpan={15} className="px-6 py-16 text-center text-slate-400">
                  <div className="flex flex-col items-center justify-center gap-3">
                    <Loader2 className="w-8 h-8 text-brand-500 animate-spin" />
                    <span className="text-sm font-medium text-slate-500">正在核算加载考勤数据...</span>
                  </div>
                </td>
              </tr>
            ) : flatRows.length === 0 ? (
              <tr>
                <td colSpan={15} className="px-6 py-12 text-center text-slate-400 text-sm">
                  <div className="flex flex-col items-center justify-center gap-2">
                    <Clock className="w-8 h-8 text-slate-300 stroke-[1.5]" />
                    <p>没有找到符合筛选条件的考勤记录</p>
                    {isFiltered && (
                      <button
                        type="button"
                        onClick={onResetFilters}
                        className="mt-1 text-xs text-brand-600 hover:text-brand-700 font-medium underline cursor-pointer"
                      >
                        重置所有筛选条件并查看全部
                      </button>
                    )}
                  </div>
                </td>
              </tr>
            ) : (
              pagedRows.map((row) => {
                const { emp, rec, date } = row;
                const isSelected = rec ? selectedIds.has(rec.id) : false;
                const { details, shiftPay, otPay, mealAllowance, dailySocialSecurity, dailyServiceFee, totalPay, type, typeName, isAbsentOrLeave } = getRowMetrics(row, config, holidays, leaveRequests);

                const statusBadge = (
                  <span className={cn("px-2.5 py-0.5 rounded text-xs font-medium inline-block whitespace-nowrap", ATTENDANCE_TYPE_CLASSES[type] || "bg-slate-100 text-slate-700")}>
                    {typeName}
                  </span>
                );

                return (
                  <tr
                    key={`${emp.id}_${date}`}
                    className={cn(
                      "hover:bg-slate-50/80 transition-colors group",
                      isSelected && "bg-blue-50/50"
                    )}
                  >
                    <td className="px-4 py-3.5 text-center">
                      <input
                        type="checkbox"
                        disabled={!rec}
                        checked={isSelected}
                        onChange={(e) => rec && onSelect(rec.id, e.target.checked)}
                        className={cn("w-4 h-4 accent-brand-600 cursor-pointer", !rec && "opacity-30")}
                      />
                    </td>
                    <td className="px-4 py-3.5 text-sm text-slate-500 font-mono text-left whitespace-nowrap">{date}</td>
                    <td className="px-4 py-3.5 whitespace-nowrap">
                      <div className="flex items-center gap-2.5">
                        <div className="w-8 h-8 rounded-full bg-slate-200 flex items-center justify-center text-slate-600 font-bold overflow-hidden border-2 border-white shadow-xs shrink-0">
                          {emp.photo ? (
                            <img src={emp.photo} className="w-full h-full object-cover" alt="" />
                          ) : (
                            <span style={{ fontSize: "14px" }}>{emp.name.charAt(0)}</span>
                          )}
                        </div>
                        <span
                          className="font-medium text-slate-900 whitespace-nowrap truncate max-w-[120px]"
                          title={emp.name}
                        >
                          {emp.name}
                        </span>
                        {emp.requiresAttendance === false && (
                          <span className="text-[9px] font-bold text-sky-600 bg-sky-50 px-1 py-0.2 rounded border border-sky-150 shrink-0">
                            免打卡
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="px-4 py-3.5 text-center whitespace-nowrap">
                      {statusBadge}
                    </td>
                    <td className="px-4 py-3.5 text-sm text-slate-700 text-center font-mono whitespace-nowrap">
                      {isAbsentOrLeave ? "-" : (
                        <div className="flex flex-col items-center justify-center">
                          <span>{formatTime(rec?.inTime)}</span>
                          {rec && rec.inLat != null && (
                            <div className={cn(
                              "text-[10px] mt-0.5 flex items-center justify-center gap-0.5 font-semibold leading-none",
                              rec.inDeviated ? "text-red-600" : "text-emerald-600"
                            )} title={`打卡坐标: ${Number(rec.inLat).toFixed(6)}, ${rec.inLng != null ? Number(rec.inLng).toFixed(6) : "-"}\n距离公司: ${rec.inDistance != null ? `${rec.inDistance}米` : "-"}`}>
                              <MapPin className="w-2.5 h-2.5 shrink-0" />
                              <span>{rec.inDistance != null ? `${rec.inDistance}米` : "已定位"}</span>
                              {rec.inDeviated && (
                                <Badge variant="destructive" className="text-[9px] px-1 py-0 h-3.5 leading-none font-normal rounded-xs">
                                  异地
                                </Badge>
                              )}
                            </div>
                          )}
                        </div>
                      )}
                    </td>
                    <td className="px-4 py-3.5 text-sm text-slate-700 text-center font-mono whitespace-nowrap">
                      {isAbsentOrLeave ? "-" : (
                        <div className="flex flex-col items-center justify-center">
                          <span>{formatTime(rec?.outTime)}</span>
                          {rec && rec.outLat != null && (
                            <div className={cn(
                              "text-[10px] mt-0.5 flex items-center justify-center gap-0.5 font-semibold leading-none",
                              rec.outDeviated ? "text-red-600" : "text-emerald-600"
                            )} title={`打卡坐标: ${Number(rec.outLat).toFixed(6)}, ${rec.outLng != null ? Number(rec.outLng).toFixed(6) : "-"}\n距离公司: ${rec.outDistance != null ? `${rec.outDistance}米` : "-"}`}>
                              <MapPin className="w-2.5 h-2.5 shrink-0" />
                              <span>{rec.outDistance != null ? `${rec.outDistance}米` : "已定位"}</span>
                              {rec.outDeviated && (
                                <Badge variant="destructive" className="text-[9px] px-1 py-0 h-3.5 leading-none font-normal rounded-xs">
                                  异地
                                </Badge>
                              )}
                            </div>
                          )}
                        </div>
                      )}
                    </td>
                    <td className="px-4 py-3.5 text-sm text-center whitespace-nowrap">
                      {isAbsentOrLeave ? <span className="text-slate-400">-</span> : <span className="text-slate-700 font-mono">{formatDuration(details.valid)}</span>}
                    </td>
                    <td className="px-4 py-3.5 text-sm text-center whitespace-nowrap">
                      {isAbsentOrLeave ? <span className="text-slate-400">-</span> : <span className="font-mono text-slate-700">{formatDuration(details.ot)}</span>}
                    </td>
                    <td className={cn(
                      "px-4 py-3.5 text-sm font-mono text-right font-medium whitespace-nowrap",
                      isAbsentOrLeave ? "text-slate-400" : "text-slate-700"
                    )}>
                      {isAbsentOrLeave ? "-" : formatCurrency(shiftPay, emp.currency)}
                    </td>
                    <td className={cn(
                      "px-4 py-3.5 text-sm font-mono text-right font-medium whitespace-nowrap",
                      isAbsentOrLeave ? "text-slate-400" : "text-amber-600"
                    )}>
                      {isAbsentOrLeave ? "-" : formatCurrency(otPay, emp.currency)}
                    </td>
                    <td className={cn(
                      "px-4 py-3.5 text-sm font-mono text-right font-medium whitespace-nowrap",
                      isAbsentOrLeave ? "text-slate-400" : "text-slate-700"
                    )}>
                      {isAbsentOrLeave ? "-" : formatCurrency(mealAllowance, emp.currency)}
                    </td>
                    <td className={cn(
                      "px-4 py-3.5 text-sm font-mono text-right font-medium whitespace-nowrap",
                      isAbsentOrLeave ? "text-slate-400" : "text-slate-700"
                    )}>
                      {isAbsentOrLeave ? "-" : formatCurrency(dailySocialSecurity, emp.currency)}
                    </td>
                    <td className={cn(
                      "px-4 py-3.5 text-sm font-mono text-right font-medium whitespace-nowrap",
                      isAbsentOrLeave ? "text-slate-400" : "text-slate-700"
                    )}>
                      {isAbsentOrLeave ? "-" : formatCurrency(dailyServiceFee, emp.currency)}
                    </td>
                    <td className={cn(
                      "px-4 py-3.5 text-sm font-mono text-right font-bold whitespace-nowrap",
                      isAbsentOrLeave ? "text-slate-400" : "text-blue-600"
                    )}>
                      {isAbsentOrLeave ? "-" : formatCurrency(totalPay, emp.currency)}
                    </td>
                    <td className={cn(
                      "sticky right-0 transition-colors z-10 px-4 py-3.5 text-center whitespace-nowrap shadow-[-4px_0_6px_-2px_rgba(0,0,0,0.05)]",
                      isSelected ? "bg-blue-50" : "bg-white group-hover:bg-slate-50"
                    )}>
                      <div className="flex items-center justify-center gap-1.5">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => {
                            onViewDetail({
                              emp,
                              rec,
                              date,
                              details,
                              shiftPay,
                              otPay,
                              mealAllowance,
                              dailySocialSecurity,
                              dailyServiceFee,
                              totalPay
                            });
                          }}
                          className="h-7 px-2.5 bg-teal-50 hover:bg-teal-100 text-teal-700 border-teal-200 text-xs font-semibold rounded-lg inline-flex items-center gap-1 shadow-2xs"
                          title="查看考勤与薪酬费用详情"
                        >
                          <Eye className="w-3.5 h-3.5" />
                          <span>查看</span>
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => {
                            if (hasPermission("attendance_edit")) {
                              const rowRec: AttendanceRecord = rec ? {
                                ...rec,
                                type: rec.type || (type as any) || "normal"
                              } : {
                                id: `new-${emp.id}-${date}`,
                                empId: emp.id,
                                date,
                                inTime: isAbsentOrLeave ? "" : (config.startShift || "08:30"),
                                outTime: isAbsentOrLeave ? "" : (config.endShift || "17:30"),
                                type: (type as any) || (isAbsentOrLeave ? "absent" : "normal"),
                                note: ""
                              };
                              onEditRecord(rowRec.id, emp.id, date, rowRec);
                            }
                          }}
                          disabled={!hasPermission("attendance_edit")}
                          className={cn(
                            "h-7 px-2.5 text-xs font-semibold rounded-lg inline-flex items-center gap-1 shadow-2xs",
                            hasPermission("attendance_edit")
                              ? "bg-indigo-50 hover:bg-indigo-100 text-indigo-700 border-indigo-200"
                              : "bg-slate-50 text-slate-400 border-slate-200 opacity-60 cursor-not-allowed"
                          )}
                          title={hasPermission("attendance_edit") ? "手动补签/调整该员工当天的考勤记录" : "无权限修改考勤记录"}
                        >
                          <Edit className="w-3.5 h-3.5" />
                          <span>{!hasPermission("attendance_edit") && "🔒"}调整</span>
                        </Button>
                      </div>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </>
  );
}
