import dotenv from "dotenv";
import { Telegraf } from 'telegraf';
import { CronJob } from 'cron';
import View from './Helpers/View.js';
import UnmarkedLessonsNotification from './UseCases/UnmarkedLessonsNotification.js';
import SubscriptionDebtNotification from './UseCases/SubscriptionDebtNotification.js';

dotenv.config();
const ADMIN_IDS = [Number(process.env.DEVELOPER_CHAT_ID), Number(process.env.ADMIN_CHAT_ID)];

const notificationsConfig = {
  subscriptionDebt: {
    service: SubscriptionDebtNotification,
    render: View.renderSubscriptionDebtNotificationTemplate,
    cronTime: '0 9 * * 1-5',
    adminOnly: true,
    command: 'subscription_debts',
    description: 'Показать все задолженности по ученикам'
  },
  AllUnmarkedLessons: {
    service: UnmarkedLessonsNotification,
    render: View.renderUnmarkedLessonsNotificationTemplate,
    cronTime: '0 9 * * 1-5',
    adminOnly: true,
    command: 'all_unmarked_lessons',
    description: 'Показать неотмеченные уроки по учителям'
  },
  unmarkedLessons: {
    service: UnmarkedLessonsNotification,
    render: View.renderUnmarkedLessonsNotificationTemplate,
    cronTime: null,
    adminOnly: false,
    command: 'unmarked_lessons',
    description: 'Показать мои неотмеченные уроки'
  }
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

    Object.values(notificationsConfig).forEach((cfg) => {
      if (!cfg.cronTime) {
        return
      }

      CronJob.from({
        cronTime: cfg.cronTime,
        onTick: async () => {
          await this.sendNotification(cfg, null);
        },
        start: true,
        timeZone: 'Europe/Moscow'
      });
    });
  }

  initCommands = async () => {
    console.log('CompanyTgBot.initCommands');

    const userCommands = Object.values(notificationsConfig)
      .map((cfg) => ({
        command: cfg.command,
        description: cfg.description
      }));

    await this.bot.telegram.setMyCommands(userCommands, { scope: { type: 'all_private_chats' } });

    const adminOnly = async (ctx, next) => {
      if (!ctx.from || !ADMIN_IDS.includes(ctx.from.id)) {
        await ctx.reply('⛔ Нет доступа');
        return;
      }
      return next();
    }

    Object.values(notificationsConfig).forEach(cfg => {
      const middlewares = [];
      if (cfg.adminOnly) {
        middlewares.push(adminOnly);
      }
      middlewares.push((ctx) => this.sendNotification(cfg, ctx));
      this.bot.command(cfg.command, ...middlewares);
    });

    this.bot.start((ctx) => ctx.reply('Запуск бота'));
    this.bot.help((ctx) => ctx.reply('Помощь'));
  }

  sendNotification = async (cfg, ctx = null) => {
    console.log(`CompanyTgBot.${cfg.command}:start`);

    await cfg.service.execute((templateData) => {
      const html = cfg.render(templateData);

      if (ctx) {
        ctx.replyWithHTML(html);
      } else {
        for (const adminId of ADMIN_IDS) {
          this.bot.telegram.sendMessage(adminId, html, { parse_mode: 'HTML' });
        }
      }

      console.log(`CompanyTgBot.${cfg.command}:end`);
    });
  }
}
