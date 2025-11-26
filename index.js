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
    this.bot.launch();
    this.initCommands();
    this.initNotifications();
    console.log('TgBot.launch');
  }

  initNotifications = () => {
    CronJob.from({
      cronTime: '* * * * *',
      onTick: this.executeSubscriptionDebtNotification,
      start: true,
      timeZone: 'Europe/Moscow'
    });
    console.log('TgBot.initNotifications');
  }

  initCommands = () => {
    this.bot.command('subscription_debts', (ctx) => this.executeSubscriptionDebtNotification(ctx));
    console.log('TgBot.initCommands');
  }

  executeSubscriptionDebtNotification = async (ctx = null) => {
    await moyKlassAPI.setToken();
    const invoicesRes = await moyKlassAPI.get('/invoices', {
      params: {
        createdAt: ['2025-09-01', '2025-11-26'],
        includeUserSubscriptions: true
      }
    });

    const invoicesWithDebts = invoicesRes.invoices.filter((invoice) => {
      return invoice.price !== invoice.payed && new Date(invoice.payUntil) < new Date();
    });

    const usersRes = await moyKlassAPI.get('/users', {
      params: {
        userIds: [...new Set(invoicesWithDebts.map((invoice) => invoice.userId))],
      }
    });
    await moyKlassAPI.revokeToken();

    const users = [...new Set(usersRes.users.map((user) => user.name))];

    console.log('TgBot.executeSubscriptionDebtNotification', users.length);

    if (ctx) {
      ctx.reply(users.join(','));
      return;
    }

    this.bot.telegram.sendMessage(process.env.DEVELOPER_CHAT_ID, users);
  }
}

const botInstance = new TgBot(process.env.TELEGRAM_TOKEN);
botInstance.launch();
