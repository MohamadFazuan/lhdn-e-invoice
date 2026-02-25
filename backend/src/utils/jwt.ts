import { SignJWT, jwtVerify, type JWTPayload } from 'jose';
import { JWT_ACCESS_EXPIRY, JWT_REFRESH_EXPIRY } from '../config/constants.js';
import { TokenExpiredError, TokenInvalidError } from '../errors/auth-errors.js';

function secretKey(secret: string): Uint8Array {
  return new TextEncoder().encode(secret);
}

export interface AccessTokenPayload extends JWTPayload {
  sub: string;
  role: 'ADMIN' | 'USER';
}

export interface RefreshTokenPayload extends JWTPayload {
  sub: string;
  jti: string;
}

export async function signAccessToken(
  payload: { sub: string; role: 'ADMIN' | 'USER' },
  secret: string,
): Promise<string> {
  return new SignJWT({ role: payload.role })
    .setProtectedHeader({ alg: 'HS256' })
    .setSubject(payload.sub)
    .setIssuedAt()
    .setExpirationTime(JWT_ACCESS_EXPIRY)
    .sign(secretKey(secret));
}

export async function signRefreshToken(
  payload: { sub: string; jti: string },
  secret: string,
): Promise<string> {
  return new SignJWT({})
    .setProtectedHeader({ alg: 'HS256' })
    .setSubject(payload.sub)
    .setJti(payload.jti)
    .setIssuedAt()
    .setExpirationTime(JWT_REFRESH_EXPIRY)
    .sign(secretKey(secret));
}

export async function verifyAccessToken(
  token: string,
  secret: string,
): Promise<AccessTokenPayload> {
  try {
    const { payload } = await jwtVerify(token, secretKey(secret));
    return payload as AccessTokenPayload;
  } catch (err) {
    if (err instanceof Error && err.message.includes('expired')) {
      throw new TokenExpiredError();
    }
    throw new TokenInvalidError();
  }
}

export async function verifyRefreshToken(
  token: string,
  secret: string,
): Promise<RefreshTokenPayload> {
  try {
    const { payload } = await jwtVerify(token, secretKey(secret));
    return payload as RefreshTokenPayload;
  } catch (err) {
    if (err instanceof Error && err.message.includes('expired')) {
      throw new TokenExpiredError();
    }
    throw new TokenInvalidError();
  }
}
