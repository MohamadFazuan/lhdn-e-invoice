import type { MiddlewareHandler } from 'hono';
import type { Env } from '../env.js';
import { verifyAccessToken } from '../utils/jwt.js';
import { UnauthorizedError, ForbiddenError } from '../errors/auth-errors.js';

export function authMiddleware(): MiddlewareHandler<{ Bindings: Env }> {
  return async (c, next) => {
    const authHeader = c.req.header('Authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      throw new UnauthorizedError('Missing or malformed Authorization header');
    }

    const token = authHeader.slice(7);
    const payload = await verifyAccessToken(token, c.env.JWT_ACCESS_SECRET);

    if (!payload.sub) {
      throw new UnauthorizedError('Invalid token payload');
    }

    c.set('userId', payload.sub);
    c.set('role', payload.role);

    await next();
  };
}

export function requireRole(
  role: 'ADMIN' | 'USER',
): MiddlewareHandler<{ Bindings: Env }> {
  return async (c, next) => {
    const userRole = c.get('role');
    if (userRole !== role && userRole !== 'ADMIN') {
      throw new ForbiddenError();
    }
    await next();
  };
}
