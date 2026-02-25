import { Hono } from 'hono';
import type { Env } from '../../env.js';
import { createDb } from '../../db/client.js';
import { InvoiceRepository } from './invoice.repository.js';
import { InvoiceItemRepository } from './invoice-item.repository.js';
import { InvoiceService } from './invoice.service.js';
import { InvoiceController } from './invoice.controller.js';
import { BuyerPortalService } from '../buyer-portal/buyer-portal.service.js';
import { BuyerPortalController } from '../buyer-portal/buyer-portal.controller.js';
import { authMiddleware } from '../../middleware/auth.middleware.js';
import { validateBody, validateQuery } from '../../middleware/validate.middleware.js';
import { createInvoiceDto, updateInvoiceDto, listInvoicesQueryDto } from './invoice.dto.js';
import { requireBusiness } from '../../middleware/require-business.middleware.js';

export function invoiceRoutes(): Hono<{ Bindings: Env }> {
  const router = new Hono<{ Bindings: Env }>();

  router.use('*', authMiddleware());
  router.use('*', requireBusiness('ACCOUNTANT'));

  const getController = (c: { env: Env }) => {
    const db = createDb(c.env.DB);
    const invoiceRepo = new InvoiceRepository(db);
    const itemRepo = new InvoiceItemRepository(db);
    const service = new InvoiceService(invoiceRepo, itemRepo);
    return new InvoiceController(service);
  };

  const getBuyerPortalController = (c: { env: Env }) => {
    const db = createDb(c.env.DB);
    const service = new BuyerPortalService(db);
    return new BuyerPortalController(service);
  };

  router.get('/', validateQuery(listInvoicesQueryDto), async (c) =>
    getController(c).list(c as any),
  );

  router.get('/:id', async (c) => getController(c).getById(c as any));

  router.post('/', validateBody(createInvoiceDto), async (c) =>
    getController(c).create(c as any),
  );

  router.patch('/:id', validateBody(updateInvoiceDto), async (c) =>
    getController(c).update(c as any),
  );

  router.post('/:id/finalize', async (c) => getController(c).finalize(c as any));

  router.delete('/:id', async (c) => getController(c).delete(c as any));

  // Share a validated invoice with its buyer (generates a tokenized public link)
  router.post('/:id/share-receipt', requireBusiness('ACCOUNTANT'), async (c) =>
    getBuyerPortalController(c).createShareToken(c as any),
  );

  return router;
}
