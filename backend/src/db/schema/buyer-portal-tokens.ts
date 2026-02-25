import { sqliteTable, text, integer } from 'drizzle-orm/sqlite-core';
import { invoices } from './invoices';

export const buyerPortalTokens = sqliteTable('buyer_portal_tokens', {
  id: text('id').primaryKey(),
  invoiceId: text('invoice_id')
    .notNull()
    .references(() => invoices.id, { onDelete: 'cascade' }),
  /** SHA-256 hex of the raw token — never store raw token */
  tokenHash: text('token_hash').notNull().unique(),
  recipientEmail: text('recipient_email').notNull(),
  viewCount: integer('view_count').notNull().default(0),
  lastViewedAt: text('last_viewed_at'),
  expiresAt: text('expires_at'),
  revokedAt: text('revoked_at'),
  createdAt: text('created_at').notNull(),
});

export type BuyerPortalToken = typeof buyerPortalTokens.$inferSelect;
export type NewBuyerPortalToken = typeof buyerPortalTokens.$inferInsert;
