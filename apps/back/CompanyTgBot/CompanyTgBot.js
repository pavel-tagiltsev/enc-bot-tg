import { Telegraf } from 'telegraf';
import { CronJob } from 'cron';
import { actionsConfig } from './config.js';

const ADMIN_IDS = [
  Number(process.env.DEVELOPER_CHAT_ID),
  Number(process.env.ADMIN_CHAT_ID)
];

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

    Object.values(actionsConfig).forEach((cfg) => {
      if (!cfg.cronTime) {
        return;
      }

      CronJob.from({
        cronTime: cfg.cronTime,
        onTick: () => this.sendNotification(cfg, null),
        start: true,
        timeZone: 'Europe/Moscow'
      });
    });
  }

  initCommands = async () => {
    console.log('CompanyTgBot.initCommands');

    const adminOnly = async (ctx, next) => {
      if (!ctx.from || !ADMIN_IDS.includes(ctx.from.id)) {
        await ctx.reply('⛔ Нет доступа');
        return;
      }
      return next();
    };

    const userCommands = [];

    Object.values(actionsConfig).forEach((cfg) => {
      if (!cfg.command) {
        return;
      }

      userCommands.push({
        command: cfg.command,
        description: cfg.description
      });

      const middlewares = [];
      if (cfg.adminOnly) {
        middlewares.push(adminOnly);
      }

      middlewares.push((ctx) => this.sendNotification(cfg, ctx));
      this.bot.command(cfg.command, ...middlewares);
    });

    await this.bot.telegram.setMyCommands(userCommands, { scope: { type: 'all_private_chats' } });
  }

  sendNotification = async (cfg, ctx = null) => {
    console.log(`CompanyTgBot.${cfg.command}:start`);

    await cfg.service.execute((templateData) => {
      const html = cfg.render(templateData);

      if (ctx) {
        ctx.replyWithHTML(html);
        console.log(`CompanyTgBot.${cfg.command}:end`);
        return;
      }

      for (const adminId of ADMIN_IDS) {
        this.bot.telegram.sendMessage(adminId, html, { parse_mode: 'HTML' });
      }

      console.log(`CompanyTgBot.${cfg.command}:end`);
    });
  }

  async stop(signal) {
    console.log(`CompanyTgBot.stop(${signal})`);
    await this.bot.stop(signal);
  }
}
