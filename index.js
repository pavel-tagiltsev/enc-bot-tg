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
    this.bot.command('subscription_debts', this.executeSubscriptionDebtNotification);
    console.log('TgBot.initCommands');
  }

  executeSubscriptionDebtNotification = async () => {
    await moyKlassAPI.setToken();
    const lessons = await moyKlassAPI.get('/lessons');
    await moyKlassAPI.revokeToken();
    console.log('TgBot.executeSubscriptionDebtNotification', lessons);
  }
}

const botInstance = new TgBot(process.env.TELEGRAM_TOKEN);
botInstance.launch();
