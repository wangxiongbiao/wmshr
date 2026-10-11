/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState, useMemo, useEffect } from "react";
import { Employee, LeaveRequest } from "../../types";
import { LeaveStatusFilter } from "./types";

interface UseLeaveTableFilterProps {
  employees: Employee[];
  leaveRequests: LeaveRequest[];
}

export function useLeaveTableFilter({ employees, leaveRequests }: UseLeaveTableFilterProps) {
  const [leaveSearch, setLeaveSearch] = useState("");
  const [leaveStatusFilter, setLeaveStatusFilter] = useState<LeaveStatusFilter>("all");
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  // 员工 ID 索引映射，用于快速检索
  const empMap = useMemo(() => {
    const map = new Map<string, Employee>();
    for (const emp of employees) {
      map.set(String(emp.id), emp);
    }
    return map;
  }, [employees]);

  const getEmployeeInfo = (empId: number | string) => {
    return empMap.get(String(empId));
  };

  // 重置分页
  useEffect(() => {
    setPage(1);
  }, [leaveSearch, leaveStatusFilter, employees]);

  const currentEmpIds = useMemo(() => new Set(employees.map(e => String(e.id))), [employees]);

  const filteredLeaveRequests = useMemo(() => {
    let list = leaveRequests;
    // 跨仓隔离：仅展示归属于当前所选国家/仓库员工的请假单
    if (employees.length > 0) {
      list = list.filter(l => currentEmpIds.has(String(l.empId)));
    }
    if (leaveStatusFilter !== "all") {
      list = list.filter(l => l.status === leaveStatusFilter);
    }
    if (leaveSearch.trim()) {
      const q = leaveSearch.trim().toLowerCase();
      list = list.filter(l => {
        const emp = empMap.get(String(l.empId));
        const name = emp?.name || "";
        const dept = emp?.dept || "";
        const role = emp?.role || "";
        const type = l.type || "";
        const reason = l.reason || "";
        const workId = emp?.workId || "";
        return (
          name.toLowerCase().includes(q) ||
          dept.toLowerCase().includes(q) ||
          role.toLowerCase().includes(q) ||
          type.toLowerCase().includes(q) ||
          reason.toLowerCase().includes(q) ||
          workId.toLowerCase().includes(q)
        );
      });
    }
    return list;
  }, [leaveRequests, employees.length, currentEmpIds, leaveStatusFilter, leaveSearch, empMap]);

  const totalPages = Math.max(1, Math.ceil(filteredLeaveRequests.length / pageSize));
  const currentPage = Math.min(page, totalPages);
  const paginatedLeaveRequests = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return filteredLeaveRequests.slice(start, start + pageSize);
  }, [filteredLeaveRequests, currentPage, pageSize]);

  return {
    leaveSearch,
    setLeaveSearch,
    leaveStatusFilter,
    setLeaveStatusFilter,
    page: currentPage,
    setPage,
    pageSize,
    setPageSize,
    filteredLeaveRequests,
    paginatedLeaveRequests,
    totalPages,
    getEmployeeInfo
  };
}
