import dotenv from "dotenv";
import { Telegraf } from 'telegraf';
import { CronJob } from 'cron';
import moyKlassAPI from './Helpers/MoyKlassAPI.js';
import View from './Helpers/View.js';
import Time from './Helpers/Time.js';

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

    const data = await this.getUnmarkedLessonsNotificationData();
    const templateData = this.buildUnmarkedLessonsNotificationTemplateData(data);

    this.sendHTMLMessage({
      template: View.renderUnmarkedLessonsNotificationTemplate(templateData),
      consoleMsg: 'CompanyTgBot.executeUnmarkedLessonsNotification:end',
      ctx
    });
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

  getUnmarkedLessonsNotificationData = async () => {
    let data = {};

    await moyKlassAPI.setToken();
    const { lessons } = await moyKlassAPI.get('/lessons', {
      params: {
        date: ['2025-09-01', Time.formatYMD(new Date())],
        includeRecords: true,
        limit: 500,
        sort: 'date',
        sortDirection: 'desc'
      }
    });

    data.lessons = lessons.filter((lesson) => {
      const { records, comment, status } = lesson;
      const isHasStatus = status;
      const isNoVisits = records.every(({ visit }) => !visit);
      const isNoReasonComment = !comment || !comment.trim().startsWith('#');

      return isNoVisits && isNoReasonComment && isHasStatus;
    });

    const { users } = await moyKlassAPI.get('/users', {
      params: {
        userIds: [...new Set(data.lessons.flatMap(({ records }) => records.flatMap(({ userId }) => userId)))],
        limit: 500,
      }
    });

    data.users = users;

    data.classes = await moyKlassAPI.get('/classes', {
      params: {
        classId: [...new Set(data.lessons.map(({ classId }) => classId))]
      }
    });

    const unmarkedLessonsTeacherIds = data.lessons.flatMap(({ teacherIds }) => teacherIds);
    const uniqueUnmarkedLessonsTeacherIds = [...new Set(unmarkedLessonsTeacherIds)];

    const managers = await moyKlassAPI.get('/managers');

    data.managers = managers.filter(({ id }) => uniqueUnmarkedLessonsTeacherIds.includes(id));
    await moyKlassAPI.revokeToken();

    return data;
  }

  buildUnmarkedLessonsNotificationTemplateData = (data) => {
    const { lessons, managers, classes, users } = data;

    return managers.reduce((acc, manager) => {
      const { teachers, stats } = acc;
      const { id, name } = manager;
      const teacherLessons = lessons.filter(({ teacherIds }) => teacherIds.includes(id));

      teachers.push({
        id,
        name,
        totalLessons: teacherLessons.length,
        lessons: teacherLessons.map((lesson) => {
          const { date, beginTime, classId, records } = lesson;
          const cls = classes.find(({ id }) => id === classId);
          const isIndividual = cls.courseId === 0;

          return {
            date,
            beginTime,
            classId: classId,
            className: cls.name,
            userId: isIndividual ? records[0].userId : null,
            userName: isIndividual ? users.find(({ id }) => id === records[0].userId).name : null,
          }
        })
      });

      stats.totalTeachers += 1;
      stats.totalLessons += teacherLessons.length;

      return acc;
    }, { teachers: [], stats: { totalTeachers: 0, totalLessons: 0 } });
  }
}
