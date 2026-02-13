import { Invoice } from '../Domain/Invoice.js';
import { IInvoiceRepository } from './IInvoiceRepository.js';

export class InvoiceRepository implements IInvoiceRepository {
  async findById(id: number): Promise<Invoice | null> {
    console.warn('InvoiceRepository.findById not implemented.');
    return null;
  }

  async findAll(): Promise<Invoice[]> {
    console.warn('InvoiceRepository.findAll not implemented.');
    return [];
  }

  async save(invoice: Invoice): Promise<void> {
    console.warn('InvoiceRepository.save not implemented.');
    // Do nothing for now
  }
}
