export function formatFullTime(date: Date) {
  return date.toLocaleTimeString('zh-CN', {hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false});
}

export function formatDateLabel(date: Date) {
  return date.toLocaleDateString('zh-CN', {weekday: 'long', month: 'long', day: 'numeric'});
}
