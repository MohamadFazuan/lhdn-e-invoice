import { sqliteTable, text, integer } from 'drizzle-orm/sqlite-core';
import { users } from './users';
import { businesses } from './businesses';

export const OCR_STATUSES = ['PENDING', 'PROCESSING', 'COMPLETED', 'FAILED'] as const;
export type OcrStatus = (typeof OCR_STATUSES)[number];

export const OCR_FILE_TYPES = ['pdf', 'jpg', 'jpeg', 'png'] as const;
export type OcrFileType = (typeof OCR_FILE_TYPES)[number];

export const ocrDocuments = sqliteTable('ocr_documents', {
  id: text('id').primaryKey(),
  invoiceId: text('invoice_id'), // set after invoice record is created
  userId: text('user_id')
    .notNull()
    .references(() => users.id, { onDelete: 'cascade' }),
  businessId: text('business_id')
    .notNull()
    .references(() => businesses.id, { onDelete: 'cascade' }),
  r2Key: text('r2_key').notNull(),
  originalFilename: text('original_filename').notNull(),
  fileType: text('file_type', { enum: OCR_FILE_TYPES }).notNull(),
  fileSize: integer('file_size').notNull(), // bytes
  ocrStatus: text('ocr_status', { enum: OCR_STATUSES }).notNull().default('PENDING'),
  rawText: text('raw_text'),          // extracted text (PDF or vision OCR output)
  extractedJson: text('extracted_json'), // AI-structured JSON string
  confidenceScore: text('confidence_score'), // e.g. "0.87"
  processingError: text('processing_error'),
  processedAt: text('processed_at'),
  createdAt: text('created_at').notNull(),
  updatedAt: text('updated_at').notNull(),
});

export type OcrDocument = typeof ocrDocuments.$inferSelect;
export type NewOcrDocument = typeof ocrDocuments.$inferInsert;
