import { Hono } from 'hono';
import type { Env } from '../../env.js';
import { createDb } from '../../db/client.js';
import { UserRepository } from './user.repository.js';
import { UserService } from './user.service.js';
import { UserController } from './user.controller.js';
import { authMiddleware } from '../../middleware/auth.middleware.js';
import { validateBody } from '../../middleware/validate.middleware.js';
import { updateUserDto } from './user.dto.js';

export function userRoutes(): Hono<{ Bindings: Env }> {
  const router = new Hono<{ Bindings: Env }>();

  router.use('*', authMiddleware());

  const getController = (c: { env: Env }) => {
    const db = createDb(c.env.DB);
    const repo = new UserRepository(db);
    const service = new UserService(repo, parseInt(c.env.BCRYPT_SALT_ROUNDS, 10));
    return new UserController(service);
  };

  router.get('/me', async (c) => getController(c).getMe(c as any));

  router.patch('/me', validateBody(updateUserDto), async (c) =>
    getController(c).updateMe(c as any),
  );

  return router;
}
