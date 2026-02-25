import { eq } from 'drizzle-orm';
import type { DrizzleDB } from '../../db/client.js';
import { lhdnTokens } from '../../db/schema/index.js';
import type { LhdnToken, NewLhdnToken } from '../../db/schema/index.js';

export class LhdnTokenRepository {
  constructor(private readonly db: DrizzleDB) {}

  async findByBusinessId(businessId: string): Promise<LhdnToken | null> {
    const result = await this.db
      .select()
      .from(lhdnTokens)
      .where(eq(lhdnTokens.businessId, businessId))
      .limit(1);
    return result[0] ?? null;
  }

  async upsert(data: NewLhdnToken): Promise<void> {
    const existing = await this.findByBusinessId(data.businessId);
    if (existing) {
      await this.db
        .update(lhdnTokens)
        .set({ accessTokenEncrypted: data.accessTokenEncrypted, expiresAt: data.expiresAt })
        .where(eq(lhdnTokens.businessId, data.businessId));
    } else {
      await this.db.insert(lhdnTokens).values(data);
    }
  }
}
