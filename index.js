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
      onTick: async () => {
        await this.executeSubscriptionDebtNotification();
        await this.executeUnmarkedLessonsNotification();
      },
      start: true,
      timeZone: 'Europe/Moscow'
    });
  }

  initCommands = () => {
    console.log('TgBot.initCommands');
    this.bot.command('subscription_debts', (ctx) => this.executeSubscriptionDebtNotification(ctx));
    this.bot.command('unmarked_lessons', (ctx) => this.executeUnmarkedLessonsNotification(ctx));
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
  executeUnmarkedLessonsNotification = async (ctx = null) => {
    console.log('TgBot.executeUnmarkedLessonsNotification:start');

    const data = await this.getUnmarkedLessonsNotificationData();
    const templateData = this.buildUnmarkedLessonsNotificationTemplateData(data);

    this.sendHTMLMessage({
      template: View.renderUnmarkedLessonsNotificationTemplate(templateData),
      consoleMsg: 'TgBot.executeUnmarkedLessonsNotification:end',
      ctx
    });
  }

  sendHTMLMessage = ({template, consoleMsg, ctx = null}) => {
    if (ctx) {
      ctx.replyWithHTML(template);
      console.log(consoleMsg);
      return;
    }

    this.bot.telegram.sendMessage(process.env.DEVELOPER_CHAT_ID, template, { parse_mode: 'HTML' });
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

const botInstance = new TgBot(process.env.TELEGRAM_TOKEN);
botInstance.launch();
