import { sqliteTable, text } from 'drizzle-orm/sqlite-core';
import { businesses } from './businesses';

export const INVOICE_TYPES = ['01', '02', '03', '04'] as const;
export const INVOICE_STATUSES = [
  'DRAFT',
  'OCR_PROCESSING',
  'REVIEW_REQUIRED',
  'READY_FOR_SUBMISSION',
  'SUBMITTED',
  'VALIDATED',
  'REJECTED',
  'CANCELLED',
] as const;

export type InvoiceType = (typeof INVOICE_TYPES)[number];
export type InvoiceStatus = (typeof INVOICE_STATUSES)[number];

export const invoices = sqliteTable('invoices', {
  id: text('id').primaryKey(),
  businessId: text('business_id')
    .notNull()
    .references(() => businesses.id, { onDelete: 'cascade' }),
  ocrDocumentId: text('ocr_document_id'),
  invoiceNumber: text('invoice_number'), // nullable until OCR/user fills it
  invoiceType: text('invoice_type', { enum: INVOICE_TYPES }).notNull().default('01'),
  status: text('status', { enum: INVOICE_STATUSES }).notNull().default('DRAFT'),
  // Supplier (from business profile, user-editable per invoice)
  supplierName: text('supplier_name'),
  supplierTin: text('supplier_tin'),
  supplierRegistration: text('supplier_registration'),
  // Buyer
  buyerName: text('buyer_name'),
  buyerTin: text('buyer_tin'),
  buyerRegistrationNumber: text('buyer_registration_number'),
  buyerSstNumber: text('buyer_sst_number'),
  buyerEmail: text('buyer_email'),
  buyerPhone: text('buyer_phone'),
  buyerAddressLine0: text('buyer_address_line0'),
  buyerAddressLine1: text('buyer_address_line1'),
  buyerCityName: text('buyer_city_name'),
  buyerStateCode: text('buyer_state_code'),
  buyerCountryCode: text('buyer_country_code').notNull().default('MYS'),
  // Financial (stored as decimal strings for precision)
  currencyCode: text('currency_code').notNull().default('MYR'),
  subtotal: text('subtotal').notNull().default('0.00'),
  taxTotal: text('tax_total').notNull().default('0.00'),
  grandTotal: text('grand_total').notNull().default('0.00'),
  // Dates (nullable until OCR fills or user enters)
  issueDate: text('issue_date'),
  dueDate: text('due_date'),
  notes: text('notes'),
  // LHDN fields (populated after submission)
  lhdnUuid: text('lhdn_uuid'),
  lhdnSubmissionUid: text('lhdn_submission_uid'),
  lhdnValidationStatus: text('lhdn_validation_status'),
  lhdnSubmittedAt: text('lhdn_submitted_at'),
  lhdnValidatedAt: text('lhdn_validated_at'),
  // Storage
  pdfStorageKey: text('pdf_storage_key'),
  createdAt: text('created_at').notNull(),
  updatedAt: text('updated_at').notNull(),
});

export type Invoice = typeof invoices.$inferSelect;
export type NewInvoice = typeof invoices.$inferInsert;
