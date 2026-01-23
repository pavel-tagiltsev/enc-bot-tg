import SubscriptionDebtNotification from './UseCases/SubscriptionDebtNotification.js';
import View from './Helpers/View.js';
import UnmarkedLessonsNotification from './UseCases/UnmarkedLessonsNotification.js';
import { TemplateData as UnmarkedLessonsTemplateData } from './UseCases/UnmarkedLessonsNotification.js';
import { TemplateData as SubscriptionDebtTemplateData } from './UseCases/SubscriptionDebtNotification.js';

// Define interfaces for the types used in actionsConfig

// For services that are classes with a static execute method
interface StaticExecuteService {
  execute: (send: (data: any) => void) => Promise<void>;
}

interface RenderFunction<T> {
  (data: T): string;
}

export interface ActionConfig {
  service: StaticExecuteService | { execute: (send: (data: any) => void) => Promise<void> };
  render: RenderFunction<any>;
  cronTime: string | null;
  adminOnly: boolean;
  command: string;
  description: string;
}

export const actionsConfig: Record<string, ActionConfig> = {
  start: {
    service: { execute: async (cb: (data: any) => void) => cb(null) },
    render: (data: any) => 'Запуск бота', // Ensure render also has a type for data
    cronTime: null,
    adminOnly: false,
    command: 'start',
    description: 'Запуск бота',
  },
  help: {
    service: { execute: async (cb: (data: any) => void) => cb(null) },
    render: (data: any) => 'Помощь',
    cronTime: null,
    adminOnly: false,
    command: 'help',
    description: 'Помощь',
  },
  subscriptionDebt: {
    service: SubscriptionDebtNotification, // SubscriptionDebtNotification is a class with static execute
    render: View.renderSubscriptionDebtNotificationTemplate,
    cronTime: '0 9 * * 1-5',
    adminOnly: true,
    command: 'subscription_debts',
    description: 'Показать все задолженности по ученикам',
  },
  AllUnmarkedLessons: {
    service: UnmarkedLessonsNotification, // UnmarkedLessonsNotification is a class with static execute
    render: View.renderUnmarkedLessonsNotificationTemplate,
    cronTime: '5 9 * * 1-5',
    adminOnly: true,
    command: 'all_unmarked_lessons',
    description: 'Показать неотмеченные уроки по учителям',
  },
  unmarkedLessons: {
    service: UnmarkedLessonsNotification, // UnmarkedLessonsNotification is a class with static execute
    render: View.renderUnmarkedLessonsNotificationTemplate,
    cronTime: null,
    adminOnly: false,
    command: 'unmarked_lessons',
    description: 'Показать мои неотмеченные уроки',
  },
};