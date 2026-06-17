/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useEffect, useState } from "react";

interface HeaderProps {
  title: string;
}

export function Header({ title }: HeaderProps) {
  const [time, setTime] = useState(new Date());

  useEffect(() => {
    const timer = setInterval(() => setTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  const clockTime = time.toLocaleTimeString('zh-CN', { hour12: false });
  const days = ['周日', '周一', '周二', '周三', '周四', '周五', '周六'];
  const clockDate = `${time.getMonth() + 1}月${time.getDate()}日 ${days[time.getDay()]}`;

  return (
    <header className="bg-white border-b border-slate-200 h-16 flex items-center justify-between px-6 flex-shrink-0">
      <h2 className="text-lg font-semibold text-slate-800">{title}</h2>
      <div className="flex items-center gap-3 text-right">
        <div>
          <div className="text-sm font-medium text-slate-700 font-mono">{clockTime}</div>
          <div className="text-xs text-slate-500">{clockDate}</div>
        </div>
      </div>
    </header>
  );
}
