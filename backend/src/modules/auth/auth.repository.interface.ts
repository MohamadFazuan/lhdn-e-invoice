import type { User, NewUser } from '../../db/schema/index.js';
import type { RefreshToken, NewRefreshToken } from '../../db/schema/index.js';

export interface IAuthRepository {
  findUserByEmail(email: string): Promise<User | null>;
  findUserById(id: string): Promise<User | null>;
  createUser(data: NewUser): Promise<User>;

  createRefreshToken(data: NewRefreshToken): Promise<RefreshToken>;
  findRefreshTokenByHash(hash: string): Promise<RefreshToken | null>;
  revokeRefreshToken(id: string, revokedAt: string): Promise<void>;
  deleteExpiredRefreshTokens(userId: string): Promise<void>;
}
