/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from "react";
import { CheckCircle, Clock, XCircle } from "lucide-react";
import { Badge } from "../ui/badge";
import { cn } from "../../lib/utils";

interface LeaveStatusBadgeProps {
  status: string;
}

export const LeaveStatusBadge: React.FC<LeaveStatusBadgeProps> = ({ status }) => {
  if (status === "approved") {
    return (
      <Badge variant="outline" className="bg-emerald-50 text-emerald-700 border-emerald-200/80 gap-1.5 font-bold whitespace-nowrap inline-flex items-center shrink-0">
        <CheckCircle className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
        <span className="whitespace-nowrap">已批准</span>
      </Badge>
    );
  }
  if (status === "rejected") {
    return (
      <Badge variant="outline" className="bg-rose-50 text-rose-700 border-rose-200/80 gap-1.5 font-bold whitespace-nowrap inline-flex items-center shrink-0">
        <XCircle className="w-3.5 h-3.5 text-rose-600 shrink-0" />
        <span className="whitespace-nowrap">已驳回</span>
      </Badge>
    );
  }
  return (
    <Badge variant="outline" className="bg-amber-50 text-amber-700 border-amber-200/80 gap-1.5 font-bold whitespace-nowrap inline-flex items-center shrink-0">
      <Clock className="w-3.5 h-3.5 text-amber-600 shrink-0" />
      <span className="whitespace-nowrap">待审批</span>
    </Badge>
  );
};

interface LeaveTypeTagProps {
  type: string;
}

export const LeaveTypeTag: React.FC<LeaveTypeTagProps> = ({ type }) => {
  const isSickLeave = type === "病假" || type === "sick";
  const isPersonalLeave = type === "事假" || type === "personal";
  const isAnnualLeave = type === "年假" || type === "annual";

  const displayType = isSickLeave
    ? "病假"
    : isPersonalLeave
    ? "事假"
    : isAnnualLeave
    ? "年假"
    : type;

  return (
    <span
      className={cn(
        "inline-flex items-center px-2 py-0.5 rounded-full text-xs font-bold whitespace-nowrap shrink-0",
        isSickLeave && "bg-rose-100 text-rose-800",
        isPersonalLeave && "bg-blue-100 text-blue-800",
        isAnnualLeave && "bg-purple-100 text-purple-800",
        !isSickLeave && !isPersonalLeave && !isAnnualLeave && "bg-slate-100 text-slate-800"
      )}
    >
      {displayType}
    </span>
  );
};
