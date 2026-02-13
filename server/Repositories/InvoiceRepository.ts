import { Invoice } from '../Domain/Invoice.js';
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

  async save(invoice: Invoice): Promise<void> {
    console.warn('InvoiceRepository.save not implemented.');
    // Do nothing for now
  }
}
