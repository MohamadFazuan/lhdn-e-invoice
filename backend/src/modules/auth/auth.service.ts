import type { IAuthRepository } from './auth.repository.interface.js';
import type { RegisterDto, LoginDto, AuthTokensResponse } from './auth.dto.js';
import { hashPassword, verifyPassword, sha256Hex } from '../../utils/hash.js';
import { signAccessToken, signRefreshToken, verifyRefreshToken } from '../../utils/jwt.js';
import { newId } from '../../utils/uuid.js';
import { nowISO, expiresInSeconds } from '../../utils/date.js';
import {
  JWT_ACCESS_EXPIRY,
  JWT_REFRESH_EXPIRY,
  JWT_REFRESH_EXPIRY_MS,
  REFRESH_COOKIE_NAME,
} from '../../config/constants.js';
import {
  InvalidCredentialsError,
  UnauthorizedError,
  TokenExpiredError,
} from '../../errors/auth-errors.js';
import { AppError } from '../../errors/app-error.js';

export class AuthService {
  constructor(
    private readonly repo: IAuthRepository,
    private readonly jwtAccessSecret: string,
    private readonly jwtRefreshSecret: string,
    private readonly bcryptRounds: number,
  ) {}

  async register(dto: RegisterDto): Promise<AuthTokensResponse> {
    const existing = await this.repo.findUserByEmail(dto.email);
    if (existing) {
      throw new AppError(409, 'EMAIL_TAKEN', 'An account with this email already exists');
    }

    const passwordHash = await hashPassword(dto.password, this.bcryptRounds);
    const now = nowISO();
    const user = await this.repo.createUser({
      id: newId(),
      email: dto.email,
      name: dto.name ?? '',
      passwordHash,
      role: 'USER',
      isActive: true,
      createdAt: now,
      updatedAt: now,
    });

    const tokens = await this._issueTokens(user.id, user.role as 'USER' | 'ADMIN');
    return { ...tokens, _user: { id: user.id, email: user.email, name: user.name ?? '' } } as any;
  }

  async login(dto: LoginDto): Promise<AuthTokensResponse> {
    const user = await this.repo.findUserByEmail(dto.email);
    if (!user || !user.isActive) throw new InvalidCredentialsError();

    const valid = await verifyPassword(dto.password, user.passwordHash);
    if (!valid) throw new InvalidCredentialsError();

    const tokens = await this._issueTokens(user.id, user.role as 'USER' | 'ADMIN');
    return { ...tokens, _user: { id: user.id, email: user.email, name: user.name ?? '' } } as any;
  }

  async refresh(rawRefreshToken: string): Promise<AuthTokensResponse> {
    const payload = await verifyRefreshToken(rawRefreshToken, this.jwtRefreshSecret).catch(() => {
      throw new TokenExpiredError();
    });

    const tokenHash = await sha256Hex(rawRefreshToken);
    const stored = await this.repo.findRefreshTokenByHash(tokenHash);

    if (!stored || stored.revokedAt !== null) throw new UnauthorizedError('Refresh token revoked');

    const now = nowISO();
    if (stored.expiresAt < now) throw new TokenExpiredError();

    // Rotate: revoke old token
    await this.repo.revokeRefreshToken(stored.id, now);

    const user = await this.repo.findUserById(payload.sub);
    if (!user || !user.isActive) throw new UnauthorizedError('User not found or inactive');

    return this._issueTokens(user.id, user.role as 'USER' | 'ADMIN');
  }

  async logout(rawRefreshToken: string): Promise<void> {
    const tokenHash = await sha256Hex(rawRefreshToken);
    const stored = await this.repo.findRefreshTokenByHash(tokenHash);
    if (stored && !stored.revokedAt) {
      await this.repo.revokeRefreshToken(stored.id, nowISO());
    }
  }

  private async _issueTokens(
    userId: string,
    role: 'USER' | 'ADMIN',
  ): Promise<AuthTokensResponse> {
    const jti = newId();
    const [accessToken, rawRefreshToken] = await Promise.all([
      signAccessToken({ sub: userId, role }, this.jwtAccessSecret),
      signRefreshToken({ sub: userId, jti }, this.jwtRefreshSecret),
    ]);

    const tokenHash = await sha256Hex(rawRefreshToken);
    const now = nowISO();
    await this.repo.createRefreshToken({
      id: jti,
      userId,
      tokenHash,
      expiresAt: expiresInSeconds(JWT_REFRESH_EXPIRY_MS / 1000),
      revokedAt: null,
      createdAt: now,
    });

    return {
      accessToken,
      // Expose raw refresh token once (caller sets cookie)
      // Using a discriminated union here would add complexity for minimal gain
      ..._rawToken(rawRefreshToken),
      expiresIn: 15 * 60, // 15 min in seconds
    } as unknown as AuthTokensResponse & { _refreshToken: string };
  }
}

// Internal helper — packages the raw refresh token alongside the response
// so the controller can set the HttpOnly cookie without the service knowing about HTTP.
function _rawToken(token: string): { _refreshToken: string } {
  return { _refreshToken: token };
}

// Re-export the combined type for the controller
export type AuthServiceResult = AuthTokensResponse & { _refreshToken: string };
