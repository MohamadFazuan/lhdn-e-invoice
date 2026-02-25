import { sqliteTable, text } from 'drizzle-orm/sqlite-core';
import { businesses } from './businesses';
import { users } from './users';

export const MEMBER_ROLES = ['OWNER', 'ADMIN', 'ACCOUNTANT', 'VIEWER'] as const;
export type MemberRole = (typeof MEMBER_ROLES)[number];

// Role hierarchy (higher index = higher privilege)
export const MEMBER_ROLE_HIERARCHY: Record<MemberRole, number> = {
  VIEWER: 0,
  ACCOUNTANT: 1,
  ADMIN: 2,
  OWNER: 3,
};

export const businessMembers = sqliteTable('business_members', {
  id: text('id').primaryKey(),
  businessId: text('business_id')
    .notNull()
    .references(() => businesses.id, { onDelete: 'cascade' }),
  userId: text('user_id').references(() => users.id, { onDelete: 'cascade' }),
  role: text('role', { enum: MEMBER_ROLES }).notNull().default('VIEWER'),
  invitedByUserId: text('invited_by_user_id'),
  inviteToken: text('invite_token').unique(),
  inviteEmail: text('invite_email'),
  inviteExpiresAt: text('invite_expires_at'),
  acceptedAt: text('accepted_at'), // null = invite still pending
  createdAt: text('created_at').notNull(),
  updatedAt: text('updated_at').notNull(),
});

export type BusinessMember = typeof businessMembers.$inferSelect;
export type NewBusinessMember = typeof businessMembers.$inferInsert;
