import SubscriptionDebtNotification from './UseCases/SubscriptionDebtNotification.js';
import View from './Helpers/View.js';
import UnmarkedLessonsNotification from './UseCases/UnmarkedLessonsNotification.js';

export const actionsConfig = {
  start: {
    service: { execute: (cb) => cb()},
    render: () => 'Запуск бота',
    cronTime: null,
    adminOnly: false,
    command: 'start',
    description: 'Запуск бота',
  },
  help: {
    service: { execute: (cb) => cb()},
    render: () => 'Помощь',
    cronTime: null,
    adminOnly: false,
    command: 'help',
    description: 'Помощь',
  },
  subscriptionDebt: {
    service: SubscriptionDebtNotification,
    render: View.renderSubscriptionDebtNotificationTemplate,
    cronTime: '* * * * *',
    adminOnly: true,
    command: 'subscription_debts',
    description: 'Показать все задолженности по ученикам',
  },
  AllUnmarkedLessons: {
    service: UnmarkedLessonsNotification,
    render: View.renderUnmarkedLessonsNotificationTemplate,
    cronTime: '0 9 * * 1-5',
    adminOnly: true,
    command: 'all_unmarked_lessons',
    description: 'Показать неотмеченные уроки по учителям',
  },
  unmarkedLessons: {
    service: UnmarkedLessonsNotification,
    render: View.renderUnmarkedLessonsNotificationTemplate,
    cronTime: null,
    adminOnly: false,
    command: 'unmarked_lessons',
    description: 'Показать мои неотмеченные уроки',
  }
};
