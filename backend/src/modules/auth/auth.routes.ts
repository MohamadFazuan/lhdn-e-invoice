import { Hono } from 'hono';
import type { Env } from '../../env.js';
import { createDb } from '../../db/client.js';
import { AuthRepository } from './auth.repository.js';
import { AuthService } from './auth.service.js';
import { AuthController } from './auth.controller.js';
import { validateBody } from '../../middleware/validate.middleware.js';
import { rateLimitMiddleware } from '../../middleware/rate-limit.middleware.js';
import { registerDto, loginDto } from './auth.dto.js';

export function authRoutes(): Hono<{ Bindings: Env }> {
  const router = new Hono<{ Bindings: Env }>();

  router.use('*', rateLimitMiddleware());

  const getController = (c: { env: Env }) => {
    const db = createDb(c.env.DB);
    const repo = new AuthRepository(db);
    const service = new AuthService(
      repo,
      c.env.JWT_ACCESS_SECRET,
      c.env.JWT_REFRESH_SECRET,
      parseInt(c.env.BCRYPT_SALT_ROUNDS, 10),
    );
    return new AuthController(service);
  };

  router.post('/register', validateBody(registerDto), async (c) => {
    return getController(c).register(c);
  });

  router.post('/login', validateBody(loginDto), async (c) => {
    return getController(c).login(c);
  });

  router.post('/refresh', async (c) => {
    return getController(c).refresh(c);
  });

  router.post('/logout', async (c) => {
    return getController(c).logout(c);
  });

  return router;
}
