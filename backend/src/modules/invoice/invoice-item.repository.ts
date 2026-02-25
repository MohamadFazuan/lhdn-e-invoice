import { eq } from 'drizzle-orm';
import type { DrizzleDB } from '../../db/client.js';
import { invoiceItems } from '../../db/schema/index.js';
import type { InvoiceItem, NewInvoiceItem } from '../../db/schema/index.js';

export class InvoiceItemRepository {
  constructor(private readonly db: DrizzleDB) {}

  async findByInvoiceId(invoiceId: string): Promise<InvoiceItem[]> {
    return this.db
      .select()
      .from(invoiceItems)
      .where(eq(invoiceItems.invoiceId, invoiceId));
  }

  async replaceAll(invoiceId: string, items: NewInvoiceItem[]): Promise<void> {
    await this.db.delete(invoiceItems).where(eq(invoiceItems.invoiceId, invoiceId));
    if (items.length > 0) {
      await this.db.insert(invoiceItems).values(items);
    }
  }
}
