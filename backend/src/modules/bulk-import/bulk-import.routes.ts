import { Hono } from 'hono';
import type { Env } from '../../env.js';
import { createDb } from '../../db/client.js';
import { BulkImportService } from './bulk-import.service.js';
import { BulkImportController } from './bulk-import.controller.js';
import { LhdnService } from '../lhdn/lhdn.service.js';
import { authMiddleware } from '../../middleware/auth.middleware.js';
import { requireBusiness } from '../../middleware/require-business.middleware.js';
import { successResponse } from '../../types/api-response.js';

export function bulkImportRoutes(): Hono<{ Bindings: Env }> {
  const router = new Hono<{ Bindings: Env }>();

  router.use('*', authMiddleware());
  router.use('*', requireBusiness('ACCOUNTANT'));

  const getServices = (env: Env) => {
    const db = createDb(env.DB);
    const bulkService = new BulkImportService(db, env.FILE_BUCKET, env.BULK_IMPORT_QUEUE);
    const controller = new BulkImportController(bulkService);
    return { db, bulkService, controller };
  };

  // CSV upload
  router.post('/upload', async (c) => getServices(c.env).controller.upload(c as any));

  // Document session — create
  router.post('/session', async (c) => getServices(c.env).controller.createSession(c as any));

  // Document session — get invoices with OCR results
  router.get('/:id/invoices', async (c) => getServices(c.env).controller.getSessionInvoices(c as any));

  // Document session — submit all READY_FOR_SUBMISSION invoices to LHDN
  router.post('/:id/submit', async (c) => {
    const id = c.req.param('id');
    const businessId = c.get('businessId') as string;
    const { db, bulkService } = getServices(c.env);

    const invoiceIds = await bulkService.getReadyInvoiceIds(id, businessId);
    if (invoiceIds.length === 0) {
      return c.json(successResponse({ submitted: 0, failed: 0, total: 0, results: [] }));
    }

    const lhdnService = new LhdnService(db, c.env);
    const settled = await Promise.allSettled(
      invoiceIds.map((invId) =>
        lhdnService.submit(invId, businessId).then((r) => ({ invoiceId: invId, ...r })),
      ),
    );

    const results = settled.map((r, i) =>
      r.status === 'fulfilled'
        ? { invoiceId: invoiceIds[i], success: true, submissionUid: r.value.submissionUid }
        : { invoiceId: invoiceIds[i], success: false, error: (r.reason as Error).message },
    );

    return c.json(
      successResponse({
        submitted: results.filter((r) => r.success).length,
        failed: results.filter((r) => !r.success).length,
        total: results.length,
        results,
      }),
    );
  });

  // Shared
  router.get('/', async (c) => getServices(c.env).controller.list(c as any));
  router.get('/:id/status', async (c) => getServices(c.env).controller.getStatus(c as any));

  return router;
}
