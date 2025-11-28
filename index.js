import dotenv from "dotenv";
import { Telegraf } from 'telegraf';
import { CronJob } from 'cron';
import moyKlassAPI from './MoyKlassAPI.js';
import View from './View.js';
import Time from './Time.js';

dotenv.config();

class TgBot {
  constructor(token) {
    this.bot = new Telegraf(token);

    this.bot.start((ctx) => ctx.reply('Привет!'));
    this.bot.help((ctx) => ctx.reply('Чем могу помочь? Напишите что-нибудь!'));
    this.bot.hears('Привет', (ctx) => ctx.reply('Привет! Как дела?'));
  }

  launch() {
    console.log('TgBot.launch');
    this.bot.launch();
    this.initCommands();
    this.initNotifications();
  }

  initNotifications = () => {
    console.log('TgBot.initNotifications');
    CronJob.from({
      cronTime: '0 9 * * 1-5',
      onTick: this.executeSubscriptionDebtNotification,
      start: true,
      timeZone: 'Europe/Moscow'
    });
  }

  initCommands = () => {
    console.log('TgBot.initCommands');
    this.bot.command('subscription_debts', (ctx) => this.executeSubscriptionDebtNotification(ctx));
  }

  executeSubscriptionDebtNotification = async (ctx = null) => {
    console.log('TgBot.executeSubscriptionDebtNotification:start');

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
      console.log('TgBot.executeSubscriptionDebtNotification:end');
      return;
    }

    this.bot.telegram.sendMessage(process.env.DEVELOPER_CHAT_ID, template, { parse_mode: 'HTML' });
    console.log('TgBot.executeSubscriptionDebtNotification:end');
  }
}

const botInstance = new TgBot(process.env.TELEGRAM_TOKEN);
botInstance.launch();
