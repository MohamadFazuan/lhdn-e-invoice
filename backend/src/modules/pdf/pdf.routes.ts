import { Hono } from 'hono';
import type { Env } from '../../env.js';
import { createDb } from '../../db/client.js';
import { PdfService } from './pdf.service.js';
import { PdfController } from './pdf.controller.js';
import { authMiddleware } from '../../middleware/auth.middleware.js';
import { requireBusiness } from '../../middleware/require-business.middleware.js';

export function pdfRoutes(): Hono<{ Bindings: Env }> {
  const router = new Hono<{ Bindings: Env }>();

  router.use('*', authMiddleware());
  router.use('*', requireBusiness('VIEWER'));

  const getController = (c: { env: Env }) => {
    const db = createDb(c.env.DB);
    const service = new PdfService(db, c.env.FILE_BUCKET);
    return new PdfController(service);
  };

  router.post('/invoices/:id/generate', async (c) => getController(c).generate(c as any));
  router.get('/invoices/:id/download', async (c) => getController(c).download(c as any));

  return router;
}
