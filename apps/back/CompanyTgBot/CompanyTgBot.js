import dotenv from "dotenv";
import { Telegraf } from 'telegraf';
import { CronJob } from 'cron';
import View from './Helpers/View.js';
import UnmarkedLessonsNotification from './UseCases/UnmarkedLessonsNotification.js';
import SubscriptionDebtNotification from './UseCases/SubscriptionDebtNotification.js';

dotenv.config();
const ADMIN_IDS = [Number(process.env.DEVELOPER_CHAT_ID), Number(process.env.ADMIN_CHAT_ID)];

const notifications = {
  subscriptionDebt: {
    service: SubscriptionDebtNotification,
    render: View.renderSubscriptionDebtNotificationTemplate,
  },
  unmarkedLessons: {
    service: UnmarkedLessonsNotification,
    render: View.renderUnmarkedLessonsNotificationTemplate,
  },
};

export default class CompanyTgBot {
  constructor(token) {
    this.bot = new Telegraf(token);
  }

  async launch() {
    console.log('CompanyTgBot.launch');
    this.bot.launch();
    await this.initCommands();
    this.initNotifications();
  }

  initNotifications = () => {
    console.log('CompanyTgBot.initNotifications');
    CronJob.from({
      cronTime: '0 9 * * 1-5',
      onTick: async () => {
        await this.executeNotification('subscriptionDebt');
        await this.executeNotification('unmarkedLessons');
      },
      start: true,
      timeZone: 'Europe/Moscow'
    });
  }

  initCommands = async () => {
    console.log('CompanyTgBot.initCommands');
    const userCommands = [
      { command: 'start', description: 'Запуск бота' },
      { command: 'help', description: 'Помощь' },
      { command: 'unmarked_lessons', description: 'Показать мои неотмеченные уроки' },
      { command: 'all_unmarked_lessons', description: 'Показать неотмеченные уроки по учителям' },
      { command: 'subscription_debts', description: 'Показать все задолженности по ученикам' },
    ];

    await this.bot.telegram.setMyCommands(userCommands, {
      scope: { type: 'all_private_chats' }
    });

    const adminOnly = async (ctx, next) => {
      if (!ctx.from || !ADMIN_IDS.includes(ctx.from.id)) {
        await ctx.reply('⛔ Нет доступа');
        return;
      }

      return next();
    }

    this.bot.start((ctx) => ctx.reply('Запуск бота'));
    this.bot.help((ctx) => ctx.reply('Помощь'));
    this.bot.command('unmarked_lessons', (ctx) => ctx.reply('Показать мои неотмеченные уроки'));
    this.bot.command('subscription_debts', adminOnly, (ctx) => this.executeNotification('subscriptionDebt', ctx));
    this.bot.command('all_unmarked_lessons', adminOnly, (ctx) => this.executeNotification('unmarkedLessons', ctx));
  }

  executeNotification = async (key, ctx = null) => {
    const { service, render } = notifications[key];

    console.log(`CompanyTgBot.${key}:start`);

    await service.execute((templateData) => {
      this.sendHTMLMessage({
        template: render(templateData),
        consoleMsg: `CompanyTgBot.${key}:end`,
        ctx,
      });
    });
  };

  sendHTMLMessage = ({template, consoleMsg, ctx = null}) => {
    if (ctx) {
      ctx.replyWithHTML(template);
      console.log(consoleMsg);
      return;
    }

    for (const adminId of ADMIN_IDS) {
      this.bot.telegram.sendMessage(adminId, template, { parse_mode: 'HTML' });
    }
    console.log(consoleMsg);
  }
}
