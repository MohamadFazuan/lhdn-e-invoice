import { sqliteTable, text, integer } from 'drizzle-orm/sqlite-core';
import { businesses } from './businesses';

export const BULK_IMPORT_STATUSES = ['QUEUED', 'PROCESSING', 'COMPLETED', 'FAILED'] as const;
export type BulkImportStatus = (typeof BULK_IMPORT_STATUSES)[number];

export const BULK_IMPORT_SOURCES = ['CSV', 'DOCUMENTS'] as const;
export type BulkImportSource = (typeof BULK_IMPORT_SOURCES)[number];

export const bulkImports = sqliteTable('bulk_imports', {
  id: text('id').primaryKey(),
  businessId: text('business_id')
    .notNull()
    .references(() => businesses.id, { onDelete: 'cascade' }),
  initiatedByUserId: text('initiated_by_user_id').notNull(),
  r2Key: text('r2_key').notNull(),
  originalFilename: text('original_filename').notNull(),
  source: text('source', { enum: BULK_IMPORT_SOURCES }).notNull().default('CSV'),
  status: text('status', { enum: BULK_IMPORT_STATUSES }).notNull().default('QUEUED'),
  totalRows: integer('total_rows'),
  successCount: integer('success_count').notNull().default(0),
  errorCount: integer('error_count').notNull().default(0),
  /** JSON array of { row: number, error: string } for CSV | { filename: string, error: string } for DOCUMENTS */
  errorSummary: text('error_summary'),
  /** JSON array of created invoice IDs */
  createdInvoiceIds: text('created_invoice_ids'),
  processingError: text('processing_error'),
  completedAt: text('completed_at'),
  createdAt: text('created_at').notNull(),
  updatedAt: text('updated_at').notNull(),
});

export type BulkImport = typeof bulkImports.$inferSelect;
export type NewBulkImport = typeof bulkImports.$inferInsert;
