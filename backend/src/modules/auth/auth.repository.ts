import { eq, lt } from 'drizzle-orm';
import type { DrizzleDB } from '../../db/client.js';
import { users, refreshTokens } from '../../db/schema/index.js';
import type { User, NewUser, RefreshToken, NewRefreshToken } from '../../db/schema/index.js';
import type { IAuthRepository } from './auth.repository.interface.js';

export class AuthRepository implements IAuthRepository {
  constructor(private readonly db: DrizzleDB) {}

  async findUserByEmail(email: string): Promise<User | null> {
    const result = await this.db
      .select()
      .from(users)
      .where(eq(users.email, email))
      .limit(1);
    return result[0] ?? null;
  }

  async findUserById(id: string): Promise<User | null> {
    const result = await this.db
      .select()
      .from(users)
      .where(eq(users.id, id))
      .limit(1);
    return result[0] ?? null;
  }

  async createUser(data: NewUser): Promise<User> {
    await this.db.insert(users).values(data);
    return (await this.findUserById(data.id))!;
  }

  async createRefreshToken(data: NewRefreshToken): Promise<RefreshToken> {
    await this.db.insert(refreshTokens).values(data);
    const result = await this.db
      .select()
      .from(refreshTokens)
      .where(eq(refreshTokens.id, data.id))
      .limit(1);
    return result[0]!;
  }

  async findRefreshTokenByHash(hash: string): Promise<RefreshToken | null> {
    const result = await this.db
      .select()
      .from(refreshTokens)
      .where(eq(refreshTokens.tokenHash, hash))
      .limit(1);
    return result[0] ?? null;
  }

  async revokeRefreshToken(id: string, revokedAt: string): Promise<void> {
    await this.db
      .update(refreshTokens)
      .set({ revokedAt })
      .where(eq(refreshTokens.id, id));
  }

  async deleteExpiredRefreshTokens(userId: string): Promise<void> {
    await this.db
      .delete(refreshTokens)
      .where(eq(refreshTokens.userId, userId));
  }
}
