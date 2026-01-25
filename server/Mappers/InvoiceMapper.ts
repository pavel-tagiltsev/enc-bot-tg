import { z } from 'zod';
import { components } from '../types/moyklass-api.js';
import { Invoice } from '../Domain/Invoice.js';

type InvoiceDTO = components['schemas']['UserInvoice'];

const InvoiceDTOSchema = z.object({
  price: z.number(),
  payed: z.number(),
  payUntil: z.string(),
  userId: z.number(),
});

export class InvoiceMapper {
  public static toDomain(dto: InvoiceDTO): Invoice {
    const validatedDTO = InvoiceDTOSchema.parse(dto);
    return new Invoice(
      validatedDTO.price,
      validatedDTO.payed,
      new Date(validatedDTO.payUntil),
      validatedDTO.userId
    );
  }
}
