import type { Env } from './env.js';
import { createDb } from './db/client.js';
import { NotificationService } from './modules/notification/notification.service.js';
import type { NotificationJobPayload } from './modules/notification/notification.dto.js';

export default {
  async queue(batch: MessageBatch<NotificationJobPayload>, env: Env): Promise<void> {
    const db = createDb(env.DB);
    const service = new NotificationService(db);

    for (const msg of batch.messages) {
      const job = msg.body;
      try {
        await env.EMAIL_SENDER.send({
          from: {
            name: 'LHDN e-Invoice',
            email: env.FROM_EMAIL,
          },
          to: [{ email: job.recipientEmail }],
          subject: job.subject,
          content: [{ type: 'text/html', value: job.htmlBody }],
        } as any);

        await service.markSent(job.notificationLogId);
        msg.ack();
      } catch (err) {
        const message = err instanceof Error ? err.message : String(err);
        console.error('[NOTIFICATION WORKER] Failed to send email:', message);
        await service.markFailed(job.notificationLogId, message).catch(() => {});
        msg.retry();
      }
    }
  },
};
