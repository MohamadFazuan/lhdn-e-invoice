import type { BusinessMember, NewBusinessMember, MemberRole } from '../../db/schema/business-members.js';

export interface ITeamRepository {
  findByBusinessId(businessId: string): Promise<BusinessMember[]>;
  findById(id: string): Promise<BusinessMember | null>;
  findByUserAndBusiness(userId: string, businessId: string): Promise<BusinessMember | null>;
  findByInviteToken(tokenHash: string): Promise<BusinessMember | null>;
  create(data: NewBusinessMember): Promise<BusinessMember>;
  update(id: string, data: Partial<Omit<BusinessMember, 'id' | 'businessId' | 'createdAt'>>): Promise<BusinessMember>;
  delete(id: string): Promise<void>;
}
