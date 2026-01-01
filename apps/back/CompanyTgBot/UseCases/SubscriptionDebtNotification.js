import moyKlassAPI from '../Helpers/MoyKlassAPI.js';
import Time from '../Helpers/Time.js';

export default class SubscriptionDebtNotification {
  static execute = async (send) => {
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

    send(templateData);
  }
}
