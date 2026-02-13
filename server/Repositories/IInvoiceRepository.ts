import { Invoice } from '../Domain/Invoice.js';

export interface IInvoiceRepository {
  findById(id: number): Promise<Invoice | null>;
  findAll(): Promise<Invoice[]>;
  save(invoice: Invoice): Promise<void>;
}
