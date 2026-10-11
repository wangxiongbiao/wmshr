/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

// 重新导出 Deep Module 组织后的请假组件与类型，维持全系统引用向后兼容
export { LeaveTable } from "./leave/LeaveTable";
export type { LeaveTableProps, LeaveStatusFilter } from "./leave/types";
export { LeaveCreateModal } from "./leave/LeaveCreateModal";
export { LeaveStatusBadge, LeaveTypeTag } from "./leave/LeaveStatusBadge";
