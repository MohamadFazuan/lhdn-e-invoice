import { sqliteTable, text } from 'drizzle-orm/sqlite-core';

export const NOTIFICATION_CHANNELS = ['EMAIL'] as const;
export type NotificationChannel = (typeof NOTIFICATION_CHANNELS)[number];

export const NOTIFICATION_EVENTS = [
  'INVOICE_SUBMITTED',
  'INVOICE_VALIDATED',
  'INVOICE_REJECTED',
  'INVOICE_CANCELLED',
  'TEAM_INVITE',
  'BUYER_RECEIPT',
] as const;
export type NotificationEvent = (typeof NOTIFICATION_EVENTS)[number];

export const NOTIFICATION_STATUSES = ['QUEUED', 'SENT', 'FAILED'] as const;
export type NotificationStatus = (typeof NOTIFICATION_STATUSES)[number];

export const notificationLogs = sqliteTable('notification_logs', {
  id: text('id').primaryKey(),
  userId: text('user_id'),
  businessId: text('business_id'),
  invoiceId: text('invoice_id'),
  channel: text('channel', { enum: NOTIFICATION_CHANNELS }).notNull(),
  event: text('event', { enum: NOTIFICATION_EVENTS }).notNull(),
  recipientEmail: text('recipient_email').notNull(),
  subject: text('subject').notNull(),
  status: text('status', { enum: NOTIFICATION_STATUSES }).notNull().default('QUEUED'),
  errorMessage: text('error_message'),
  sentAt: text('sent_at'),
  createdAt: text('created_at').notNull(),
});

export type NotificationLog = typeof notificationLogs.$inferSelect;
export type NewNotificationLog = typeof notificationLogs.$inferInsert;
