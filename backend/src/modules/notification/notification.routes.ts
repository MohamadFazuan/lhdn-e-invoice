import { Hono } from 'hono';
import type { Env } from '../../env.js';
import { createDb } from '../../db/client.js';
import { NotificationService } from './notification.service.js';
import { NotificationController } from './notification.controller.js';
import { authMiddleware } from '../../middleware/auth.middleware.js';
import { validateBody } from '../../middleware/validate.middleware.js';
import { updatePreferencesDto } from './notification.dto.js';

export function notificationRoutes(): Hono<{ Bindings: Env }> {
  const router = new Hono<{ Bindings: Env }>();

  router.use('*', authMiddleware());

  const getController = (c: { env: Env }) => {
    const db = createDb(c.env.DB);
    const service = new NotificationService(db);
    return new NotificationController(service);
  };

  router.get('/preferences', async (c) => getController(c).getPreferences(c as any));

  router.patch(
    '/preferences',
    validateBody(updatePreferencesDto),
    async (c) => getController(c).updatePreferences(c as any),
  );

  router.get('/logs', async (c) => getController(c).getLogs(c as any));

  return router;
}
