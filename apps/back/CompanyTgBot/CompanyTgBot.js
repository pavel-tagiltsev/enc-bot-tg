import dotenv from "dotenv";
import { Telegraf } from 'telegraf';
import { CronJob } from 'cron';
import moyKlassAPI from './Helpers/MoyKlassAPI.js';
import View from './Helpers/View.js';
import Time from './Helpers/Time.js';
import UnmarkedLessonsNotification from './UseCases/UnmarkedLessonsNotification.js';

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

    await moyKlassAPI.setToken();
    const invoicesRes = await moyKlassAPI.get('/invoices', {
      params: {
        createdAt: ['2025-09-01', Time.formatYMD(new Date())],
        includeUserSubscriptions: true
      }
    });

    const overduePaymentInvoices = invoicesRes.invoices.filter((invoice) => {
      const isDebt = invoice.price !== invoice.payed;
      const isOverdue = new Date(invoice.payUntil) < new Date(Time.formatYMD(new Date()));

      return isDebt && isOverdue;
    });

    const overduePaymentUsersIds = overduePaymentInvoices.map((invoice) => invoice.userId);
    const uniqueOverduePaymentUsersIds = [...new Set(overduePaymentUsersIds)];

    const usersRes = await moyKlassAPI.get('/users', {
      params: {
        userIds: uniqueOverduePaymentUsersIds,
      }
    });
    await moyKlassAPI.revokeToken();

    const templateData = usersRes.users.reduce((acc, user) => {
      const userInvoices = overduePaymentInvoices.filter(invoice => invoice.userId === user.id);
      const userTotalDebt = userInvoices.reduce((sum, invoice) => sum + (invoice.price - invoice.payed), 0);
      const userPayUntilDates = userInvoices.map(invoice => new Date(invoice.payUntil));
      const userEarliestPayUntilDate = Time.formatYMD(new Date(Math.min(...userPayUntilDates)));

      acc.users.push({
        id: user.id,
        name: user.name,
        totalDebt: userTotalDebt,
        earliestPayUntil: userEarliestPayUntilDate
      });

      acc.stats.totalUsers += 1;
      acc.stats.totalDebt += userTotalDebt;

      return acc;
    }, { users: [], stats: { totalUsers: 0, totalDebt: 0 } });

    const template = View.renderSubscriptionDebtNotificationTemplate(templateData);

    if (ctx) {
      ctx.replyWithHTML(template);
      console.log('CompanyTgBot.executeSubscriptionDebtNotification:end');
      return;
    }

    for (const adminId of ADMIN_IDS) {
      this.bot.telegram.sendMessage(adminId, template, { parse_mode: 'HTML' });
    }
    console.log('CompanyTgBot.executeSubscriptionDebtNotification:end');
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
