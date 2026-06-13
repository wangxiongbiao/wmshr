function resolveLocale(language?: string) {
  if (!language) {
    return undefined;
  }

  switch (language) {
    case 'zh':
      return 'zh-CN';
    case 'zht':
      return 'zh-Hant';
    default:
      return language;
  }
}

export function formatFullTime(date: Date, language?: string) {
  return date.toLocaleTimeString(resolveLocale(language), {hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false});
}

export function formatDateLabel(date: Date, language?: string) {
  return date.toLocaleDateString(resolveLocale(language), {weekday: 'long', month: 'long', day: 'numeric'});
}
