import type { Context } from 'hono';
import type { Env } from '../../env.js';
import type { LhdnService } from './lhdn.service.js';
import { NotificationService, fireNotification } from '../notification/notification.service.js';
import { createDb } from '../../db/client.js';
import { successResponse } from '../../types/api-response.js';

export class LhdnController {
  constructor(private readonly service: LhdnService) {}

  async submit(c: Context<{ Bindings: Env; Variables: { businessId: string; userId: string } }>) {
    const businessId = c.get('businessId');
    const userId = c.get('userId');
    const { id } = c.req.param();
    const result = await this.service.submit(id, businessId);

    if (c.env.NOTIFICATION_QUEUE) {
      const notifService = new NotificationService(createDb(c.env.DB));
      const appUrl = c.env.APP_URL ?? '';
      notifService.getBusinessName(businessId).then((businessName) => {
        fireNotification(c.executionCtx, notifService, {
          event: 'INVOICE_SUBMITTED',
          recipientUserId: userId,
          businessId,
          invoiceId: id,
          emailCtx: { invoiceId: id, businessName, appUrl },
          queue: c.env.NOTIFICATION_QUEUE,
        });
      }).catch(() => {});
    }

    return c.json(successResponse(result), 202);
  }

  async pollStatus(c: Context<{ Bindings: Env; Variables: { businessId: string; userId: string } }>) {
    const businessId = c.get('businessId');
    const userId = c.get('userId');
    const { id } = c.req.param();
    const result = await this.service.pollStatus(id, businessId);

    // Fire notification only when status reaches a terminal state
    if (c.env.NOTIFICATION_QUEUE && (result.status === 'Valid' || result.status === 'Invalid')) {
      const event = result.status === 'Valid' ? 'INVOICE_VALIDATED' : 'INVOICE_REJECTED';
      const notifService = new NotificationService(createDb(c.env.DB));
      const appUrl = c.env.APP_URL ?? '';
      notifService.getBusinessName(businessId).then((businessName) => {
        fireNotification(c.executionCtx, notifService, {
          event,
          recipientUserId: userId,
          businessId,
          invoiceId: id,
          emailCtx: { invoiceId: id, businessName, appUrl },
          queue: c.env.NOTIFICATION_QUEUE,
        });
      }).catch(() => {});
    }

    return c.json(successResponse(result));
  }

  async cancel(c: Context<{ Bindings: Env; Variables: { businessId: string; userId: string } }>) {
    const businessId = c.get('businessId');
    const userId = c.get('userId');
    const { id } = c.req.param();
    const body = await c.req.json<{ reason?: string }>();
    const reason = body.reason ?? 'Cancelled by user';
    const result = await this.service.cancel(id, businessId, reason);

    if (c.env.NOTIFICATION_QUEUE) {
      const notifService = new NotificationService(createDb(c.env.DB));
      const appUrl = c.env.APP_URL ?? '';
      notifService.getBusinessName(businessId).then((businessName) => {
        fireNotification(c.executionCtx, notifService, {
          event: 'INVOICE_CANCELLED',
          recipientUserId: userId,
          businessId,
          invoiceId: id,
          emailCtx: { invoiceId: id, businessName, appUrl },
          queue: c.env.NOTIFICATION_QUEUE,
        });
      }).catch(() => {});
    }

    return c.json(successResponse(result));
  }
}
