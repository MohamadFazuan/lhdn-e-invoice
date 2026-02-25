import { sqliteTable, text } from 'drizzle-orm/sqlite-core';
import { users } from './users';

export const refreshTokens = sqliteTable('refresh_tokens', {
  id: text('id').primaryKey(),
  userId: text('user_id')
    .notNull()
    .references(() => users.id, { onDelete: 'cascade' }),
  tokenHash: text('token_hash').notNull().unique(), // SHA-256 hex — plaintext never stored
  expiresAt: text('expires_at').notNull(),
  revokedAt: text('revoked_at'), // NULL = active; set on use (rotation) or logout
  createdAt: text('created_at').notNull(),
});

export type RefreshToken = typeof refreshTokens.$inferSelect;
export type NewRefreshToken = typeof refreshTokens.$inferInsert;
