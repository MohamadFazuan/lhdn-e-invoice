import { eq } from 'drizzle-orm';
import type { DrizzleDB } from '../../db/client.js';
import {
  notificationPreferences,
  notificationLogs,
  users,
  businesses,
} from '../../db/schema/index.js';
import type { NotificationEvent, NewNotificationLog } from '../../db/schema/notification-logs.js';
import type { NotificationPreferences } from '../../db/schema/notification-preferences.js';
import type { UpdatePreferencesDto, NotificationJobPayload } from './notification.dto.js';
import { renderEmail, type EmailContext } from './notification.email-renderer.js';
import { newId } from '../../utils/uuid.js';
import { nowISO } from '../../utils/date.js';

// Maps notification events to preference fields
const EVENT_PREF_MAP: Partial<Record<NotificationEvent, keyof NotificationPreferences>> = {
  INVOICE_SUBMITTED: 'emailOnSubmitted',
  INVOICE_VALIDATED: 'emailOnValidated',
  INVOICE_REJECTED: 'emailOnRejected',
  INVOICE_CANCELLED: 'emailOnCancelled',
  TEAM_INVITE: 'emailOnTeamInvite',
};

export interface EnqueueNotificationParams {
  event: NotificationEvent;
  /** Provide recipientEmail directly, or recipientUserId to look up automatically */
  recipientEmail?: string;
  recipientUserId?: string;
  businessId?: string;
  invoiceId?: string;
  emailCtx: EmailContext;
  queue: Queue;
}

export class NotificationService {
  constructor(private readonly db: DrizzleDB) {}

  async getPreferences(userId: string): Promise<NotificationPreferences> {
    const rows = await this.db
      .select()
      .from(notificationPreferences)
      .where(eq(notificationPreferences.userId, userId))
      .limit(1);

    if (rows.length > 0) return rows[0];

    // Auto-create default preferences on first access
    const now = nowISO();
    const prefs = {
      id: newId(),
      userId,
      emailOnSubmitted: true,
      emailOnValidated: true,
      emailOnRejected: true,
      emailOnCancelled: false,
      emailOnTeamInvite: true,
      createdAt: now,
      updatedAt: now,
    };
    await this.db.insert(notificationPreferences).values(prefs);
    return prefs as NotificationPreferences;
  }

  async updatePreferences(userId: string, dto: UpdatePreferencesDto): Promise<NotificationPreferences> {
    await this.getPreferences(userId); // ensure row exists
    await this.db
      .update(notificationPreferences)
      .set({ ...dto, updatedAt: nowISO() })
      .where(eq(notificationPreferences.userId, userId));
    return this.getPreferences(userId);
  }

  async getLogs(userId: string, limit = 50, offset = 0) {
    return this.db
      .select()
      .from(notificationLogs)
      .where(eq(notificationLogs.userId, userId))
      .limit(limit)
      .offset(offset);
  }

  /** Look up the business name for use in email templates */
  async getBusinessName(businessId: string): Promise<string> {
    const rows = await this.db
      .select({ name: businesses.name })
      .from(businesses)
      .where(eq(businesses.id, businessId))
      .limit(1);
    return rows[0]?.name ?? 'your business';
  }

  /**
   * Resolves recipient email (via DB lookup if needed), checks preferences,
   * inserts a QUEUED log, and pushes the job to the notification queue.
   * Call from controllers via waitUntil().
   */
  async enqueue(params: EnqueueNotificationParams): Promise<void> {
    let recipientEmail = params.recipientEmail;

    // Look up user email if not provided directly
    if (!recipientEmail && params.recipientUserId) {
      const userRows = await this.db
        .select({ email: users.email })
        .from(users)
        .where(eq(users.id, params.recipientUserId))
        .limit(1);
      if (userRows.length === 0) return;
      recipientEmail = userRows[0].email;
    }

    if (!recipientEmail) return;

    // Check preference opt-out for known users
    if (params.recipientUserId) {
      const prefs = await this.getPreferences(params.recipientUserId);
      const prefKey = EVENT_PREF_MAP[params.event];
      if (prefKey && prefs[prefKey] === false) return;
    }

    const { subject, htmlBody } = renderEmail(params.event, params.emailCtx);

    const log: NewNotificationLog = {
      id: newId(),
      userId: params.recipientUserId ?? null,
      businessId: params.businessId ?? null,
      invoiceId: params.invoiceId ?? null,
      channel: 'EMAIL',
      event: params.event,
      recipientEmail,
      subject,
      status: 'QUEUED',
      errorMessage: null,
      sentAt: null,
      createdAt: nowISO(),
    };

    await this.db.insert(notificationLogs).values(log);

    const payload: NotificationJobPayload = {
      notificationLogId: log.id,
      recipientEmail,
      subject,
      htmlBody,
    };

    await params.queue.send(payload);
  }

  async markSent(logId: string): Promise<void> {
    await this.db
      .update(notificationLogs)
      .set({ status: 'SENT', sentAt: nowISO() })
      .where(eq(notificationLogs.id, logId));
  }

  async markFailed(logId: string, errorMessage: string): Promise<void> {
    await this.db
      .update(notificationLogs)
      .set({ status: 'FAILED', errorMessage })
      .where(eq(notificationLogs.id, logId));
  }
}

/**
 * Fire-and-forget helper. Call from controllers (which have access to executionCtx).
 * Mirrors the pattern of fireAuditLog().
 */
export function fireNotification(
  ctx: ExecutionContext,
  service: NotificationService,
  params: EnqueueNotificationParams,
): void {
  ctx.waitUntil(
    service.enqueue(params).catch((err) => console.error('[NOTIFICATION ERROR]', err)),
  );
}
