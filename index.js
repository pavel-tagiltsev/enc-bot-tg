import dotenv from "dotenv";
import { Telegraf } from 'telegraf';

dotenv.config();

class TgBot {
  constructor(token) {
    this.bot = new Telegraf(token);

    this.bot.start((ctx) => ctx.reply('Привет!'));
    this.bot.help((ctx) => ctx.reply('Чем могу помочь? Напишите что-нибудь!'));
    this.bot.hears('Привет', (ctx) => ctx.reply('Привет! Как дела?'));
    this.bot.on('text', (ctx) => ctx.reply('Вы написали: ' + ctx.message.text));
  }

  launch() {
    this.bot.launch();
    console.log('Бот запущен');
  }
}

const botInstance = new TgBot(process.env.TELEGRAM_TOKEN);
botInstance.launch();
