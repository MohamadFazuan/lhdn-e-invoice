import { sqliteTable, text } from 'drizzle-orm/sqlite-core';
import { invoices } from './invoices';
import { businesses } from './businesses';

export const SUBMISSION_STATUSES = [
  'PENDING',
  'SUBMITTED',
  'VALIDATED',
  'REJECTED',
] as const;

export type SubmissionStatus = (typeof SUBMISSION_STATUSES)[number];

export const lhdnSubmissions = sqliteTable('lhdn_submissions', {
  id: text('id').primaryKey(),
  invoiceId: text('invoice_id')
    .notNull()
    .references(() => invoices.id, { onDelete: 'cascade' }),
  businessId: text('business_id')
    .notNull()
    .references(() => businesses.id, { onDelete: 'cascade' }),
  submissionUid: text('submission_uid'),       // LHDN async submission UID
  documentUuid: text('document_uuid'),         // LHDN assigned document UUID
  submissionPayload: text('submission_payload').notNull(), // UBL JSON sent
  responsePayload: text('response_payload'),               // LHDN response JSON
  status: text('status', { enum: SUBMISSION_STATUSES }).notNull().default('PENDING'),
  errorMessage: text('error_message'),
  submittedAt: text('submitted_at'),
  validatedAt: text('validated_at'),
  createdAt: text('created_at').notNull(),
});

export type LhdnSubmission = typeof lhdnSubmissions.$inferSelect;
export type NewLhdnSubmission = typeof lhdnSubmissions.$inferInsert;
