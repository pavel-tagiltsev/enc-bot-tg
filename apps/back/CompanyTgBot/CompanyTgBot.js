import dotenv from "dotenv";
import { Telegraf } from 'telegraf';
import { CronJob } from 'cron';
import View from './Helpers/View.js';
import UnmarkedLessonsNotification from './UseCases/UnmarkedLessonsNotification.js';
import SubscriptionDebtNotification from './UseCases/SubscriptionDebtNotification.js';

dotenv.config();
const ADMIN_IDS = [Number(process.env.DEVELOPER_CHAT_ID), Number(process.env.ADMIN_CHAT_ID)];

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
        await this.executeSubscriptionDebtNotification();
        await this.executeUnmarkedLessonsNotification();
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
    this.bot.command('subscription_debts', adminOnly, (ctx) => this.executeSubscriptionDebtNotification(ctx));
    this.bot.command('all_unmarked_lessons', adminOnly, (ctx) => this.executeUnmarkedLessonsNotification(ctx));
  }

  executeSubscriptionDebtNotification = async (ctx = null) => {
    console.log('CompanyTgBot.executeSubscriptionDebtNotification:start');
    const callback = (templateData) => {
      this.sendHTMLMessage({
        template: View.renderSubscriptionDebtNotificationTemplate(templateData),
        consoleMsg: 'CompanyTgBot.executeSubscriptionDebtNotification:end',
        ctx
      });
    }

    await SubscriptionDebtNotification.execute(callback);
  }
  executeUnmarkedLessonsNotification = async (ctx = null) => {
    console.log('CompanyTgBot.executeUnmarkedLessonsNotification:start');
    const callback = (templateData) => {
      this.sendHTMLMessage({
        template: View.renderUnmarkedLessonsNotificationTemplate(templateData),
        consoleMsg: 'CompanyTgBot.executeUnmarkedLessonsNotification:end',
        ctx
      });
    }

    await UnmarkedLessonsNotification.execute(callback);
  }

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
