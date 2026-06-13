import {TFunction} from 'i18next';
import {EmployeeNotification} from '../../attendance/types';

function formatBizMonth(bizMonth: string | null) {
  return bizMonth || '--';
}

export function localizeNotificationCopy(
  notification: Pick<EmployeeNotification, 'type' | 'bizMonth' | 'title' | 'content'>,
  t: TFunction<'app'>,
) {
  if (notification.type === 'payroll_confirmed') {
    return {
      title: t('工资条通知标题', {month: formatBizMonth(notification.bizMonth)}),
      content: t('工资条通知内容', {month: formatBizMonth(notification.bizMonth)}),
    };
  }

  return {
    title: notification.title,
    content: notification.content,
  };
}
