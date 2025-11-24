import dotenv from "dotenv";
import { Telegraf } from 'telegraf';
import { CronJob } from 'cron';

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
    console.log('Бот запущен');
  }

  initNotifications = () => {
    CronJob.from({
      cronTime: '* * * * * *',
      onTick: this.executeSubscriptionDebtNotification,
      start: true,
      timeZone: 'Europe/Moscow'
    });
  }

  initCommands = () => {
    this.bot.command('subscription_debts', this.executeSubscriptionDebtNotification);
  }

  executeSubscriptionDebtNotification = () => {
    console.log('executeSubscriptionDebtNotification');
  }
}

const botInstance = new TgBot(process.env.TELEGRAM_TOKEN);
botInstance.launch();
