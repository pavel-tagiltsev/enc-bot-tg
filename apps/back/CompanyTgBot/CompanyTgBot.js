import dotenv from "dotenv";
import { Telegraf } from 'telegraf';
import { CronJob } from 'cron';
import { actionsConfig } from './config.js';

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

    Object.values(actionsConfig).forEach((cfg) => {
      if (!cfg.cronTime) {
        return;
      }

      CronJob.from({
        cronTime: cfg.cronTime,
        onTick: async () => this.sendNotification(cfg, null),
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
    }

    Object.values(actionsConfig).forEach((cfg) => {
      if (!cfg.command) {
        return;
      }

      const middlewares = [];
      if (cfg.adminOnly) {
        middlewares.push(adminOnly);
      }

      middlewares.push((ctx) => this.sendNotification(cfg, ctx));
      this.bot.command(cfg.command, ...middlewares);
    });

    const userCommands = Object.values(actionsConfig)
      .filter((cfg) => cfg.command)
      .map((cfg) => ({
        command: cfg.command,
        description: cfg.description
      }));

    await this.bot.telegram.setMyCommands(userCommands, { scope: { type: 'all_private_chats' } });
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
