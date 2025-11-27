import dotenv from "dotenv";
import { Telegraf } from 'telegraf';
import { CronJob } from 'cron';
import moyKlassAPI from './MoyKlassAPI.js';

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
    console.log('TgBot.executeSubscriptionDebtNotification');

    await moyKlassAPI.setToken();
    const invoicesRes = await moyKlassAPI.get('/invoices', {
      params: {
        createdAt: ['2025-09-01', '2025-11-26'],
        includeUserSubscriptions: true
      }
    });

    const overduePaymentInvoices = invoicesRes.invoices.filter((invoice) => {
      return invoice.price !== invoice.payed && new Date(invoice.payUntil) < new Date();
    });

    const usersRes = await moyKlassAPI.get('/users', {
      params: {
        userIds: [...new Set(overduePaymentInvoices.map((invoice) => invoice.userId))],
      }
    });
    await moyKlassAPI.revokeToken();

    const users = [...new Set(usersRes.users.map((user) => user.name))];

    if (ctx) {
      ctx.reply(users.join(','));
      return;
    }

    this.bot.telegram.sendMessage(process.env.DEVELOPER_CHAT_ID, users);
  }
}

const botInstance = new TgBot(process.env.TELEGRAM_TOKEN);
botInstance.launch();
