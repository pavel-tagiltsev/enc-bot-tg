import SubscriptionDebtNotification from './UseCases/SubscriptionDebtNotification.js';
import View from './Helpers/View.js';
import UnmarkedLessonsNotification from './UseCases/UnmarkedLessonsNotification.js';
import MoyKlassAPI from './Helpers/MoyKlassAPI.js';
import { env } from './env.js';

export const moyKlassAPI = new MoyKlassAPI({ apiKey: env.MOY_KLASS_API_KEY });

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
    render: (data: any) => 'Запуск бота',
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
    service: SubscriptionDebtNotification,
    render: View.renderSubscriptionDebtNotificationTemplate,
    cronTime: '0 9 * * 1-5',
    adminOnly: true,
    command: 'subscription_debts',
    description: 'Показать все задолженности по ученикам',
  },
  AllUnmarkedLessons: {
    service: UnmarkedLessonsNotification,
    render: View.renderUnmarkedLessonsNotificationTemplate,
    cronTime: '5 9 * * 1-5',
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
  },
};
