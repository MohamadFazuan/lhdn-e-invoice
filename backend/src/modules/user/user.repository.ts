import { eq } from 'drizzle-orm';
import type { DrizzleDB } from '../../db/client.js';
import { users } from '../../db/schema/index.js';
import type { User } from '../../db/schema/index.js';
import type { IUserRepository } from './user.repository.interface.js';

export class UserRepository implements IUserRepository {
  constructor(private readonly db: DrizzleDB) {}

  async findById(id: string): Promise<User | null> {
    const result = await this.db.select().from(users).where(eq(users.id, id)).limit(1);
    return result[0] ?? null;
  }

  async findByEmail(email: string): Promise<User | null> {
    const result = await this.db.select().from(users).where(eq(users.email, email)).limit(1);
    return result[0] ?? null;
  }

  async update(
    id: string,
    data: Partial<Pick<User, 'email' | 'passwordHash' | 'updatedAt'>>,
  ): Promise<User> {
    await this.db.update(users).set(data).where(eq(users.id, id));
    return (await this.findById(id))!;
  }
}
