import type { Business, NewBusiness } from '../../db/schema/index.js';

export interface IBusinessRepository {
  findByUserId(userId: string): Promise<Business | null>;
  findById(id: string): Promise<Business | null>;
  create(data: NewBusiness): Promise<Business>;
  update(id: string, data: Partial<Omit<Business, 'id' | 'userId' | 'createdAt'>>): Promise<Business>;
}
