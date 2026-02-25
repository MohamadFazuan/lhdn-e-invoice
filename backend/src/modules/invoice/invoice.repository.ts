import { eq, and, count } from 'drizzle-orm';
import type { DrizzleDB } from '../../db/client.js';
import { invoices } from '../../db/schema/index.js';
import type { Invoice, NewInvoice } from '../../db/schema/index.js';
import type { InvoiceStatus } from '../../db/schema/invoices.js';
import type { IInvoiceRepository } from './invoice.repository.interface.js';

export class InvoiceRepository implements IInvoiceRepository {
  constructor(private readonly db: DrizzleDB) {}

  async findById(id: string): Promise<Invoice | null> {
    const result = await this.db
      .select()
      .from(invoices)
      .where(eq(invoices.id, id))
      .limit(1);
    return result[0] ?? null;
  }

  async findByBusinessId(
    businessId: string,
    opts: { status?: InvoiceStatus; limit: number; offset: number },
  ): Promise<{ invoices: Invoice[]; total: number }> {
    const conditions = [eq(invoices.businessId, businessId)];
    if (opts.status) conditions.push(eq(invoices.status, opts.status));
    const where = and(...conditions);

    const [rows, [{ value: total }]] = await Promise.all([
      this.db
        .select()
        .from(invoices)
        .where(where)
        .limit(opts.limit)
        .offset(opts.offset),
      this.db.select({ value: count() }).from(invoices).where(where),
    ]);

    return { invoices: rows, total: total ?? 0 };
  }

  async create(data: NewInvoice): Promise<Invoice> {
    await this.db.insert(invoices).values(data);
    return (await this.findById(data.id))!;
  }

  async update(
    id: string,
    data: Partial<Omit<Invoice, 'id' | 'businessId' | 'createdAt'>>,
  ): Promise<Invoice> {
    await this.db.update(invoices).set(data).where(eq(invoices.id, id));
    return (await this.findById(id))!;
  }

  async delete(id: string): Promise<void> {
    await this.db.delete(invoices).where(eq(invoices.id, id));
  }
}
