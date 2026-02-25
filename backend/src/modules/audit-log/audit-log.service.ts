import type { AuditLogRepository } from './audit-log.repository.js';
import { newId } from '../../utils/uuid.js';
import { nowISO } from '../../utils/date.js';

export interface AuditEvent {
  userId?: string;
  businessId?: string;
  invoiceId?: string;
  action: string;        // e.g. 'INVOICE_STATUS_CHANGED', 'LHDN_SUBMIT'
  entityType: string;    // e.g. 'invoice', 'business', 'user'
  entityId: string;
  oldValue?: unknown;
  newValue?: unknown;
  ipAddress?: string;
  userAgent?: string;
}

export class AuditLogService {
  constructor(private readonly repo: AuditLogRepository) {}

  /**
   * Records an audit event.
   * Intended to be called via `waitUntil()` for fire-and-forget behaviour.
   */
  async log(event: AuditEvent): Promise<void> {
    await this.repo.insert({
      id: newId(),
      userId: event.userId ?? null,
      businessId: event.businessId ?? null,
      invoiceId: event.invoiceId ?? null,
      action: event.action,
      entityType: event.entityType,
      entityId: event.entityId,
      oldValue: event.oldValue !== undefined ? JSON.stringify(event.oldValue) : null,
      newValue: event.newValue !== undefined ? JSON.stringify(event.newValue) : null,
      ipAddress: event.ipAddress ?? null,
      userAgent: event.userAgent ?? null,
      createdAt: nowISO(),
    });
  }
}

/**
 * Helper: creates a fire-and-forget audit log via waitUntil().
 * Usage: fireAuditLog(c.executionCtx, db, { ... })
 */
export function fireAuditLog(
  ctx: ExecutionContext,
  auditService: AuditLogService,
  event: AuditEvent,
): void {
  ctx.waitUntil(
    auditService.log(event).catch((err) => console.error('[AUDIT LOG ERROR]', err)),
  );
}
