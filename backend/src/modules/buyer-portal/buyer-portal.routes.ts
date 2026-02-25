import { Hono } from 'hono';
import type { Env } from '../../env.js';
import { createDb } from '../../db/client.js';
import { BuyerPortalService } from './buyer-portal.service.js';
import { BuyerPortalController } from './buyer-portal.controller.js';
import { authMiddleware } from '../../middleware/auth.middleware.js';
import { requireBusiness } from '../../middleware/require-business.middleware.js';

export function buyerPortalRoutes(): Hono<{ Bindings: Env }> {
  const router = new Hono<{ Bindings: Env }>();

  const getController = (c: { env: Env }) => {
    const db = createDb(c.env.DB);
    const service = new BuyerPortalService(db);
    return new BuyerPortalController(service);
  };

  // ── Public routes — no auth required ─────────────────────────────────────
  router.get('/receipt/:token', async (c) => getController(c).getReceipt(c as any));
  router.get('/receipt/:token/pdf', async (c) => getController(c).downloadPdf(c as any));

  // ── Authenticated routes ──────────────────────────────────────────────────
  // Mounted on /api/invoices/:id/share-receipt via invoice.routes.ts but also
  // kept here for token revocation
  router.delete(
    '/tokens/:tokenId',
    authMiddleware(),
    requireBusiness('ADMIN'),
    async (c) => getController(c).revokeToken(c as any),
  );

  return router;
}
