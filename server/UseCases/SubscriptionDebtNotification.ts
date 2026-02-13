import Time from '../Helpers/Time.js';
import { Invoice } from '../Domain/Invoice.js';
import { Student } from '../Domain/Student.js';
import { IMoyKlassAPI } from '../types/IMoyKlassAPI.js';

interface TemplateStudent {
  id: number;
  name: string;
  totalDebt: number;
  earliestPayUntil: string;
}

export interface TemplateData {
  students: TemplateStudent[];
  stats: {
    totalStudents: number;
    totalDebt: number;
  };
}

export default class SubscriptionDebtNotification {
  constructor(private readonly moyKlassAPI: IMoyKlassAPI) {}

  public execute = async (send: (data: TemplateData) => void): Promise<void> => {
    const allInvoices = await this.moyKlassAPI.getInvoices({
      createdAt: ['2025-09-01', Time.formatYMD(new Date())],
      includeUserSubscriptions: true,
    });

    const today = new Date(Time.formatYMD(new Date()));
    const overduePaymentInvoices = allInvoices.filter((invoice) => invoice.isDebt && invoice.isOverdue(today));

    const overduePaymentStudentIds = overduePaymentInvoices.map((invoice) => invoice.userId);
    const uniqueOverduePaymentStudentIds = [...new Set(overduePaymentStudentIds)];

    if (uniqueOverduePaymentStudentIds.length === 0) {
      send({ students: [], stats: { totalStudents: 0, totalDebt: 0 } });
      return;
    }

    const students = await this.moyKlassAPI.getUsers({
      userIds: uniqueOverduePaymentStudentIds,
    });

    const templateData: TemplateData = students.reduce(
      (acc: TemplateData, student: Student) => {
        const userInvoices = overduePaymentInvoices.filter((invoice) => invoice.userId === student.id);
        const userTotalDebt = Invoice.calculateTotalDebt(userInvoices);
        const userEarliestPayUntilDate = Time.formatYMD(Invoice.findEarliestPayUntil(userInvoices));

        acc.students.push({
          id: student.id,
          name: student.name,
          totalDebt: userTotalDebt,
          earliestPayUntil: userEarliestPayUntilDate,
        });

        acc.stats.totalStudents += 1;
        acc.stats.totalDebt += userTotalDebt;

        return acc;
      },
      { students: [], stats: { totalStudents: 0, totalDebt: 0 } }
    );

    send(templateData);
  };
}
