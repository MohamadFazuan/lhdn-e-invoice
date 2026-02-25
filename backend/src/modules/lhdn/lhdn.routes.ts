import { Hono } from 'hono';
import type { Env } from '../../env.js';
import { createDb } from '../../db/client.js';
import { LhdnService } from './lhdn.service.js';
import { LhdnController } from './lhdn.controller.js';
import { authMiddleware } from '../../middleware/auth.middleware.js';
import { requireBusiness } from '../../middleware/require-business.middleware.js';

export function lhdnRoutes(): Hono<{ Bindings: Env }> {
  const router = new Hono<{ Bindings: Env }>();

  router.use('*', authMiddleware());
  router.use('*', requireBusiness('ACCOUNTANT'));

  const getController = (c: { env: Env }) => {
    const db = createDb(c.env.DB);
    const service = new LhdnService(db, c.env);
    return new LhdnController(service);
  };

  router.post('/invoices/:id/submit', async (c) => getController(c).submit(c as any));
  router.get('/invoices/:id/status', async (c) => getController(c).pollStatus(c as any));
  router.post('/invoices/:id/cancel', async (c) => getController(c).cancel(c as any));

  return router;
}
