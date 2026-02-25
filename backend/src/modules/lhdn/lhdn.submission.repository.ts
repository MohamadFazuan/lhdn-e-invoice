import { eq } from 'drizzle-orm';
import type { DrizzleDB } from '../../db/client.js';
import { lhdnSubmissions } from '../../db/schema/index.js';
import type { LhdnSubmission, NewLhdnSubmission } from '../../db/schema/index.js';

export class LhdnSubmissionRepository {
  constructor(private readonly db: DrizzleDB) {}

  async findByInvoiceId(invoiceId: string): Promise<LhdnSubmission[]> {
    return this.db
      .select()
      .from(lhdnSubmissions)
      .where(eq(lhdnSubmissions.invoiceId, invoiceId));
  }

  async findLatestByInvoiceId(invoiceId: string): Promise<LhdnSubmission | null> {
    const rows = await this.findByInvoiceId(invoiceId);
    return rows.sort((a, b) => (a.createdAt > b.createdAt ? -1 : 1))[0] ?? null;
  }

  async create(data: NewLhdnSubmission): Promise<LhdnSubmission> {
    await this.db.insert(lhdnSubmissions).values(data);
    const result = await this.db
      .select()
      .from(lhdnSubmissions)
      .where(eq(lhdnSubmissions.id, data.id))
      .limit(1);
    return result[0]!;
  }

  async update(
    id: string,
    data: Partial<Omit<LhdnSubmission, 'id' | 'invoiceId' | 'businessId' | 'createdAt'>>,
  ): Promise<void> {
    await this.db.update(lhdnSubmissions).set(data).where(eq(lhdnSubmissions.id, id));
  }
}
