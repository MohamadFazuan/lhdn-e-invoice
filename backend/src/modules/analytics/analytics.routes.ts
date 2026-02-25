import { Hono } from 'hono';
import type { Env } from '../../env.js';
import { createDb } from '../../db/client.js';
import { AnalyticsService } from './analytics.service.js';
import { AnalyticsController } from './analytics.controller.js';
import { authMiddleware } from '../../middleware/auth.middleware.js';
import { requireBusiness } from '../../middleware/require-business.middleware.js';

export function analyticsRoutes(): Hono<{ Bindings: Env }> {
  const router = new Hono<{ Bindings: Env }>();

  router.use('*', authMiddleware());
  router.use('*', requireBusiness('VIEWER'));

  const getController = (c: { env: Env }) => {
    const db = createDb(c.env.DB);
    const service = new AnalyticsService(db);
    return new AnalyticsController(service);
  };

  router.get('/summary', async (c) => getController(c).summary(c as any));
  router.get('/revenue', async (c) => getController(c).revenue(c as any));
  router.get('/rejection-rate', async (c) => getController(c).rejectionRate(c as any));
  router.get('/top-buyers', async (c) => getController(c).topBuyers(c as any));
  router.get('/invoice-volume', async (c) => getController(c).invoiceVolume(c as any));

  return router;
}
