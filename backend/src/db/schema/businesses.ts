import { sqliteTable, text, integer } from 'drizzle-orm/sqlite-core';
import { users } from './users';

export const businesses = sqliteTable('businesses', {
  id: text('id').primaryKey(),
  userId: text('user_id')
    .notNull()
    .references(() => users.id, { onDelete: 'cascade' }),
  name: text('name').notNull(),
  tin: text('tin').notNull(),
  registrationNumber: text('registration_number').notNull(),
  msicCode: text('msic_code').notNull(),
  sstRegistrationNumber: text('sst_registration_number'),
  addressLine0: text('address_line0'),
  addressLine1: text('address_line1'),
  addressLine2: text('address_line2'),
  postalZone: text('postal_zone'),
  cityName: text('city_name'),
  stateCode: text('state_code'),
  countryCode: text('country_code').notNull().default('MYS'),
  email: text('email').notNull(),
  phone: text('phone'),
  lhdnClientIdEncrypted: text('lhdn_client_id_encrypted'),
  lhdnClientSecretEncrypted: text('lhdn_client_secret_encrypted'),
  isActive: integer('is_active', { mode: 'boolean' }).notNull().default(true),
  createdAt: text('created_at').notNull(),
  updatedAt: text('updated_at').notNull(),
});

export type Business = typeof businesses.$inferSelect;
export type NewBusiness = typeof businesses.$inferInsert;
