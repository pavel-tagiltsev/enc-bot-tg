import { moyKlassAPI } from '../config.js';
import Time from '../Helpers/Time.js';
import { Invoice } from '../Domain/Invoice.js';
import { User } from '../Domain/User.js';

interface TemplateUser {
  id: number;
  name: string;
  totalDebt: number;
  earliestPayUntil: string;
}

export interface TemplateData {
  users: TemplateUser[];
  stats: {
    totalUsers: number;
    totalDebt: number;
  };
}

export default class SubscriptionDebtNotification {
  static execute = async (send: (data: TemplateData) => void): Promise<void> => {
    const allInvoices = await moyKlassAPI.getInvoices({
      createdAt: ['2025-09-01', Time.formatYMD(new Date())],
      includeUserSubscriptions: true,
    });

    const today = new Date(Time.formatYMD(new Date()));
    const overduePaymentInvoices = allInvoices.filter((invoice) => invoice.isDebt && invoice.isOverdue(today));

    const overduePaymentUsersIds = overduePaymentInvoices.map((invoice) => invoice.userId);
    const uniqueOverduePaymentUsersIds = [...new Set(overduePaymentUsersIds)];

    if (uniqueOverduePaymentUsersIds.length === 0) {
      send({ users: [], stats: { totalUsers: 0, totalDebt: 0 } });
      return;
    }

    const users = await moyKlassAPI.getUsers({
      userIds: uniqueOverduePaymentUsersIds,
    });

    const templateData: TemplateData = users.reduce(
      (acc: TemplateData, user: User) => {
        const userInvoices = overduePaymentInvoices.filter((invoice) => invoice.userId === user.id);
        const userTotalDebt = Invoice.calculateTotalDebt(userInvoices);
        const userEarliestPayUntilDate = Time.formatYMD(Invoice.findEarliestPayUntil(userInvoices));

        acc.users.push({
          id: user.id,
          name: user.name,
          totalDebt: userTotalDebt,
          earliestPayUntil: userEarliestPayUntilDate,
        });

        acc.stats.totalUsers += 1;
        acc.stats.totalDebt += userTotalDebt;

        return acc;
      },
      { users: [], stats: { totalUsers: 0, totalDebt: 0 } }
    );

    send(templateData);
  };
}
