import { sqliteTable, text, integer } from 'drizzle-orm/sqlite-core';
import { users } from './users';

export const notificationPreferences = sqliteTable('notification_preferences', {
  id: text('id').primaryKey(),
  userId: text('user_id')
    .notNull()
    .references(() => users.id, { onDelete: 'cascade' })
    .unique(),
  emailOnSubmitted: integer('email_on_submitted', { mode: 'boolean' }).notNull().default(true),
  emailOnValidated: integer('email_on_validated', { mode: 'boolean' }).notNull().default(true),
  emailOnRejected: integer('email_on_rejected', { mode: 'boolean' }).notNull().default(true),
  emailOnCancelled: integer('email_on_cancelled', { mode: 'boolean' }).notNull().default(false),
  emailOnTeamInvite: integer('email_on_team_invite', { mode: 'boolean' }).notNull().default(true),
  createdAt: text('created_at').notNull(),
  updatedAt: text('updated_at').notNull(),
});

export type NotificationPreferences = typeof notificationPreferences.$inferSelect;
export type NewNotificationPreferences = typeof notificationPreferences.$inferInsert;
