import moyKlassAPI from '../Helpers/MoyKlassAPI.js';
import Time from '../Helpers/Time.js';

interface MoyKlassInvoice {
  price: number;
  payed: number;
  payUntil: string;
  userId: number;
  // Potentially other fields
}

interface MoyKlassInvoicesResponse {
  invoices: MoyKlassInvoice[];
  // Potentially other fields
}

interface MoyKlassUser {
  id: number;
  name: string;
  // Potentially other fields
}

interface MoyKlassUsersResponse {
  users: MoyKlassUser[];
  // Potentially other fields
}

interface TemplateUser {
  id: number;
  name: string;
  totalDebt: number;
  earliestPayUntil: string;
}

export interface TemplateData { // Added export keyword
  users: TemplateUser[];
  stats: {
    totalUsers: number;
    totalDebt: number;
  };
}

export default class SubscriptionDebtNotification {
  static execute = async (send: (data: TemplateData) => void): Promise<void> => {
    await moyKlassAPI.setToken();
    const invoicesRes: MoyKlassInvoicesResponse = await moyKlassAPI.get('/invoices', {
      params: {
        createdAt: ['2025-09-01', Time.formatYMD(new Date())],
        includeUserSubscriptions: true,
      },
    });

    const overduePaymentInvoices: MoyKlassInvoice[] = invoicesRes.invoices.filter((invoice: MoyKlassInvoice) => {
      const isDebt = invoice.price !== invoice.payed;
      const isOverdue = new Date(invoice.payUntil) < new Date(Time.formatYMD(new Date()));

      return isDebt && isOverdue;
    });

    const overduePaymentUsersIds: number[] = overduePaymentInvoices.map((invoice: MoyKlassInvoice) => invoice.userId);
    const uniqueOverduePaymentUsersIds = [...new Set(overduePaymentUsersIds)];

    const usersRes: MoyKlassUsersResponse = await moyKlassAPI.get('/users', {
      params: {
        userIds: uniqueOverduePaymentUsersIds,
      },
    });
    await moyKlassAPI.revokeToken();

    const templateData: TemplateData = usersRes.users.reduce(
      (acc: TemplateData, user: MoyKlassUser) => {
        const userInvoices: MoyKlassInvoice[] = overduePaymentInvoices.filter((invoice: MoyKlassInvoice) => invoice.userId === user.id);
        const userTotalDebt: number = userInvoices.reduce(
          (sum: number, invoice: MoyKlassInvoice) => sum + (invoice.price - invoice.payed),
          0
        );
        const userPayUntilDates: Date[] = userInvoices.map((invoice: MoyKlassInvoice) => new Date(invoice.payUntil));
        const userEarliestPayUntilDate: string = Time.formatYMD(new Date(Math.min(...userPayUntilDates.map(date => date.getTime()))));

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
