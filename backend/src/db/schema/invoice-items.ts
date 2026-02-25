import { sqliteTable, text, integer } from 'drizzle-orm/sqlite-core';
import { invoices } from './invoices';

export const TAX_TYPES = ['01', '02', 'E', 'AE', 'NA'] as const;
export type TaxType = (typeof TAX_TYPES)[number];

export const invoiceItems = sqliteTable('invoice_items', {
  id: text('id').primaryKey(),
  invoiceId: text('invoice_id')
    .notNull()
    .references(() => invoices.id, { onDelete: 'cascade' }),
  description: text('description').notNull(),
  classificationCode: text('classification_code').notNull().default('001'),
  quantity: text('quantity').notNull(),
  unitCode: text('unit_code').notNull().default('KGM'),
  unitPrice: text('unit_price').notNull(),
  subtotal: text('subtotal').notNull(),
  taxType: text('tax_type', { enum: TAX_TYPES }).notNull(),
  taxRate: text('tax_rate').notNull().default('0'),
  taxAmount: text('tax_amount').notNull().default('0.00'),
  total: text('total').notNull(),
  sortOrder: integer('sort_order').notNull().default(0),
  createdAt: text('created_at').notNull(),
});

export type InvoiceItem = typeof invoiceItems.$inferSelect;
export type NewInvoiceItem = typeof invoiceItems.$inferInsert;
