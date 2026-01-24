import dotenv from 'dotenv';
import { Telegraf, Context } from 'telegraf';
import { Update } from 'telegraf/types';
import { CronJob } from 'cron';
import { actionsConfig, ActionConfig } from './config.js';

const isProduction = process.env.NODE_ENV === 'production';

dotenv.config({
  path: isProduction ? '.env.prod' : '.env.local',
});

const ADMIN_IDS: number[] = [
  Number(process.env.DEVELOPER_CHAT_ID),
  Number(process.env.ADMIN_CHAT_ID),
];

export default class CompanyTgBot {
  private bot: Telegraf<Context<Update>>;

  constructor(token: string) {
    this.bot = new Telegraf(token);
  }

  async launch(): Promise<void> {
    console.log('CompanyTgBot.launch');
    this.bot.launch();
    await this.initCommands();
    this.initNotifications();
  }

  initNotifications = (): void => {
    console.log('CompanyTgBot.initNotifications');

    Object.values(actionsConfig).forEach((cfg: ActionConfig) => {
      if (!cfg.cronTime) {
        return;
      }

      CronJob.from({
        cronTime: cfg.cronTime,
        onTick: () => this.sendNotification(cfg, null),
        start: true,
        timeZone: 'Europe/Moscow',
      });
    });
  };

  initCommands = async (): Promise<void> => {
    console.log('CompanyTgBot.initCommands');

    const adminOnly = async (ctx: Context, next: () => Promise<void>): Promise<void> => {
      if (!ctx.from || !ADMIN_IDS.includes(Number(ctx.from.id))) {
        await ctx.reply('⛔ Нет доступа');
        return;
      }
      return next();
    };

    const userCommands: { command: string; description: string }[] = [];

    Object.values(actionsConfig).forEach((cfg: ActionConfig) => {
      if (!cfg.command) {
        return;
      }

      userCommands.push({
        command: cfg.command,
        description: cfg.description,
      });

      const middlewares: any[] = [];
      if (cfg.adminOnly) {
        middlewares.push(adminOnly);
      }

      middlewares.push((ctx: Context) => this.sendNotification(cfg, ctx));
      this.bot.command(cfg.command, ...middlewares as [any, ...any[]]);
    });

    await this.bot.telegram.setMyCommands(userCommands, { scope: { type: 'all_private_chats' } });
  };

  sendNotification = async (cfg: ActionConfig, ctx: Context | null = null): Promise<void> => {
    console.log(`CompanyTgBot.${cfg.command}:start`);
    if(ctx?.from?.id){
        console.info(ctx.from.id);
    }

    await cfg.service.execute((templateData: any) => {
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
  };

  async stop(signal: string): Promise<void> {
    console.log(`CompanyTgBot.stop(${signal})`);
    await this.bot.stop(signal);
  }
}
