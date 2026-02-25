import { eq, and } from 'drizzle-orm';
import type { DrizzleDB } from '../../db/client.js';
import { businessMembers } from '../../db/schema/index.js';
import type { BusinessMember, NewBusinessMember } from '../../db/schema/business-members.js';
import type { ITeamRepository } from './team.repository.interface.js';

export class TeamRepository implements ITeamRepository {
  constructor(private readonly db: DrizzleDB) {}

  async findByBusinessId(businessId: string): Promise<BusinessMember[]> {
    return this.db
      .select()
      .from(businessMembers)
      .where(eq(businessMembers.businessId, businessId));
  }

  async findById(id: string): Promise<BusinessMember | null> {
    const result = await this.db
      .select()
      .from(businessMembers)
      .where(eq(businessMembers.id, id))
      .limit(1);
    return result[0] ?? null;
  }

  async findByUserAndBusiness(userId: string, businessId: string): Promise<BusinessMember | null> {
    const result = await this.db
      .select()
      .from(businessMembers)
      .where(
        and(
          eq(businessMembers.userId, userId),
          eq(businessMembers.businessId, businessId),
        ),
      )
      .limit(1);
    return result[0] ?? null;
  }

  async findByInviteToken(tokenHash: string): Promise<BusinessMember | null> {
    const result = await this.db
      .select()
      .from(businessMembers)
      .where(eq(businessMembers.inviteToken, tokenHash))
      .limit(1);
    return result[0] ?? null;
  }

  async create(data: NewBusinessMember): Promise<BusinessMember> {
    await this.db.insert(businessMembers).values(data);
    return (await this.findById(data.id))!;
  }

  async update(
    id: string,
    data: Partial<Omit<BusinessMember, 'id' | 'businessId' | 'createdAt'>>,
  ): Promise<BusinessMember> {
    await this.db.update(businessMembers).set(data).where(eq(businessMembers.id, id));
    return (await this.findById(id))!;
  }

  async delete(id: string): Promise<void> {
    await this.db.delete(businessMembers).where(eq(businessMembers.id, id));
  }
}
