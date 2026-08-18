import Time from '../Helpers/Time.js';
import { Invoice } from '../Invoice/Invoice.js';
import { Student } from '../Student/Student.js';
import { IInvoiceRepository } from '../Invoice/IInvoiceRepository.js';
import { IStudentRepository } from '../Student/IStudentRepository.js';

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
  constructor(
    private readonly invoiceRepository: IInvoiceRepository,
    private readonly studentRepository: IStudentRepository
  ) {}

  public execute = async (send: (data: TemplateData) => void): Promise<void> => {
    const allInvoices = await this.invoiceRepository.findSince(new Date('2025-09-01'));

    const today = new Date(Time.formatYMD(new Date()));
    const overduePaymentInvoices = allInvoices.filter((invoice) => invoice.isDebt && invoice.isOverdue(today));

    const overduePaymentStudentIds = overduePaymentInvoices.map((invoice) => invoice.studentId);
    const uniqueOverduePaymentStudentIds = [...new Set(overduePaymentStudentIds)];

    if (uniqueOverduePaymentStudentIds.length === 0) {
      send({ students: [], stats: { totalStudents: 0, totalDebt: 0 } });
      return;
    }

    const students = await this.studentRepository.findByIds(uniqueOverduePaymentStudentIds);

    const templateData: TemplateData = students.reduce(
      (acc: TemplateData, student: Student) => {
        const userInvoices = overduePaymentInvoices.filter((invoice) => invoice.studentId === student.id);
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
