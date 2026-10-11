/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { LeaveRequest, Employee } from "../../types";

export type LeaveStatusFilter = 'all' | 'pending' | 'approved' | 'rejected';

export interface LeaveCreatePayload {
  empId: number;
  type: string;
  startDate: string;
  endDate: string;
  reason: string;
  status: 'approved' | 'pending';
}

export interface LeaveTableProps {
  employees: Employee[];
  leaveRequests: LeaveRequest[];
  onUpdateLeaveRequests: (newList: LeaveRequest[]) => void;
  hasPermission?: (permId: string) => boolean;
  addToast?: (msg: string, kind?: "success" | "error" | "info") => void;
  warehouseCode?: string;
  onRefreshAttendance?: () => void;
  onRefresh?: () => Promise<void> | void;
}
