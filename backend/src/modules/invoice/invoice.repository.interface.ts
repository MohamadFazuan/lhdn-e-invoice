import type { Invoice, NewInvoice } from '../../db/schema/index.js';
import type { InvoiceStatus } from '../../db/schema/invoices.js';

export interface IInvoiceRepository {
  findById(id: string): Promise<Invoice | null>;
  findByBusinessId(
    businessId: string,
    opts: { status?: InvoiceStatus; limit: number; offset: number },
  ): Promise<{ invoices: Invoice[]; total: number }>;
  create(data: NewInvoice): Promise<Invoice>;
  update(
    id: string,
    data: Partial<Omit<Invoice, 'id' | 'businessId' | 'createdAt'>>,
  ): Promise<Invoice>;
  delete(id: string): Promise<void>;
}
