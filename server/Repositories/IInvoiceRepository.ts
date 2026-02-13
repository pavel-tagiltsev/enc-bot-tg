import { Invoice } from '../Domain/Invoice.js';

export interface IInvoiceRepository {
  findSince(date: Date): Promise<Invoice[]>;
  save(invoice: Invoice): Promise<void>;
}
