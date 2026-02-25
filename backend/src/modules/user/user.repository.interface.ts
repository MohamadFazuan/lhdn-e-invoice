import type { User } from '../../db/schema/index.js';

export interface IUserRepository {
  findById(id: string): Promise<User | null>;
  findByEmail(email: string): Promise<User | null>;
  update(id: string, data: Partial<Pick<User, 'email' | 'passwordHash' | 'updatedAt'>>): Promise<User>;
}
