import { Hono } from 'hono';
import type { Env } from '../../env.js';
import { createDb } from '../../db/client.js';
import { BusinessRepository } from './business.repository.js';
import { BusinessService } from './business.service.js';
import { BusinessController } from './business.controller.js';
import { TeamRepository } from '../team/team.repository.js';
import { authMiddleware } from '../../middleware/auth.middleware.js';
import { validateBody } from '../../middleware/validate.middleware.js';
import { createBusinessDto, updateBusinessDto, updateCredentialsDto } from './business.dto.js';

export function businessRoutes(): Hono<{ Bindings: Env }> {
  const router = new Hono<{ Bindings: Env }>();

  router.use('*', authMiddleware());

  const getController = (c: { env: Env }) => {
    const db = createDb(c.env.DB);
    const repo = new BusinessRepository(db);
    const teamRepo = new TeamRepository(db);
    const service = new BusinessService(repo, c.env.ENCRYPTION_KEY, teamRepo);
    return new BusinessController(service);
  };

  router.get('/me', async (c) => getController(c).getMe(c as any));

  router.post('/', validateBody(createBusinessDto), async (c) =>
    getController(c).create(c as any),
  );

  router.patch('/me', validateBody(updateBusinessDto), async (c) =>
    getController(c).update(c as any),
  );

  router.patch('/me/credentials', validateBody(updateCredentialsDto), async (c) =>
    getController(c).updateCredentials(c as any),
  );

  return router;
}
