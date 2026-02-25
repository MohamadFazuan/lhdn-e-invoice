import { sqliteTable, text } from 'drizzle-orm/sqlite-core';

export const auditLogs = sqliteTable('audit_logs', {
  id: text('id').primaryKey(),
  userId: text('user_id'),     // nullable: system actions have no user
  businessId: text('business_id'),
  invoiceId: text('invoice_id'),
  action: text('action').notNull(),      // e.g. 'INVOICE_STATUS_CHANGED'
  entityType: text('entity_type').notNull(), // e.g. 'invoice', 'business'
  entityId: text('entity_id').notNull(),
  oldValue: text('old_value'),  // JSON snapshot before change
  newValue: text('new_value'),  // JSON snapshot after change
  ipAddress: text('ip_address'),
  userAgent: text('user_agent'),
  createdAt: text('created_at').notNull(),
});

export type AuditLog = typeof auditLogs.$inferSelect;
export type NewAuditLog = typeof auditLogs.$inferInsert;
