import { sqliteTable, text } from 'drizzle-orm/sqlite-core';
import { businesses } from './businesses';

export const lhdnTokens = sqliteTable('lhdn_tokens', {
  id: text('id').primaryKey(),
  businessId: text('business_id')
    .notNull()
    .unique()
    .references(() => businesses.id, { onDelete: 'cascade' }),
  accessTokenEncrypted: text('access_token_encrypted').notNull(),
  expiresAt: text('expires_at').notNull(), // ISO 8601 with 60s pre-expiry buffer applied
  createdAt: text('created_at').notNull(),
});

export type LHDNToken = typeof lhdnTokens.$inferSelect;
export type NewLHDNToken = typeof lhdnTokens.$inferInsert;
