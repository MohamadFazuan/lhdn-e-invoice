import { eq } from 'drizzle-orm';
import type { DrizzleDB } from '../../db/client.js';
import { businesses } from '../../db/schema/index.js';
import type { Business, NewBusiness } from '../../db/schema/index.js';
import type { IBusinessRepository } from './business.repository.interface.js';

export class BusinessRepository implements IBusinessRepository {
  constructor(private readonly db: DrizzleDB) {}

  async findByUserId(userId: string): Promise<Business | null> {
    const result = await this.db
      .select()
      .from(businesses)
      .where(eq(businesses.userId, userId))
      .limit(1);
    return result[0] ?? null;
  }

  async findById(id: string): Promise<Business | null> {
    const result = await this.db
      .select()
      .from(businesses)
      .where(eq(businesses.id, id))
      .limit(1);
    return result[0] ?? null;
  }

  async create(data: NewBusiness): Promise<Business> {
    await this.db.insert(businesses).values(data);
    return (await this.findById(data.id))!;
  }

  async update(
    id: string,
    data: Partial<Omit<Business, 'id' | 'userId' | 'createdAt'>>,
  ): Promise<Business> {
    await this.db.update(businesses).set(data).where(eq(businesses.id, id));
    return (await this.findById(id))!;
  }
}
