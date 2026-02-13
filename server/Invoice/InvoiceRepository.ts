import { Invoice } from './Invoice.js';
import { IInvoiceRepository } from './IInvoiceRepository.js';
import { IMoyKlassAPI } from '../types/IMoyKlassAPI.js';
import Time from '../Helpers/Time.js';

export class InvoiceRepository implements IInvoiceRepository {
  constructor(private readonly moyKlassAPI: IMoyKlassAPI) {}

  async findSince(date: Date): Promise<Invoice[]> {
    return await this.moyKlassAPI.getInvoices({
      createdAt: [Time.formatYMD(date), Time.formatYMD(new Date())],
      includeUserSubscriptions: true,
    });
  }
}
