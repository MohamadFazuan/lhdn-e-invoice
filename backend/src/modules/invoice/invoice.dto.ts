import { z } from 'zod';

const decimalString = z
  .string()
  .regex(/^\d+(\.\d{1,2})?$/, 'Must be a decimal number with up to 2 decimal places');

const invoiceItemDto = z.object({
  description: z.string().min(1).max(500),
  classificationCode: z.string().max(10).default('001'),
  quantity: decimalString,
  unitCode: z.string().max(10).default('UNT'),
  unitPrice: decimalString,
  taxType: z.enum(['01', '02', 'E', 'AE', 'NA']).default('NA'),
  taxRate: decimalString.default('0'),
});

export const createInvoiceDto = z.object({
  invoiceNumber: z.string().max(50).optional(),
  invoiceType: z.enum(['01', '02', '03', '04']).default('01'),
  supplierName: z.string().max(255).optional(),
  supplierTin: z.string().max(20).optional(),
  supplierRegistration: z.string().max(50).optional(),
  buyerName: z.string().max(255).optional(),
  buyerTin: z.string().max(20).optional(),
  buyerRegistrationNumber: z.string().max(50).optional(),
  buyerSstNumber: z.string().max(50).optional(),
  buyerEmail: z.string().email().optional(),
  buyerPhone: z.string().max(20).optional(),
  buyerAddressLine0: z.string().max(255).optional(),
  buyerAddressLine1: z.string().max(255).optional(),
  buyerCityName: z.string().max(100).optional(),
  buyerStateCode: z.string().max(5).optional(),
  buyerCountryCode: z.string().length(3).default('MYS'),
  currencyCode: z.string().length(3).default('MYR'),
  issueDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Date must be YYYY-MM-DD').optional(),
  dueDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  notes: z.string().max(2000).optional(),
  items: z.array(invoiceItemDto).min(1, 'At least one line item is required'),
});

export const updateInvoiceDto = createInvoiceDto.partial().omit({ items: true }).extend({
  items: z.array(invoiceItemDto).min(1).optional(),
}).refine((data) => Object.keys(data).length > 0, {
  message: 'At least one field must be provided',
});

export const listInvoicesQueryDto = z.object({
  status: z.enum([
    'DRAFT', 'OCR_PROCESSING', 'REVIEW_REQUIRED', 'READY_FOR_SUBMISSION',
    'SUBMITTED', 'VALIDATED', 'REJECTED', 'CANCELLED',
  ]).optional(),
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(100).default(20),
});

export type CreateInvoiceDto = z.infer<typeof createInvoiceDto>;
export type UpdateInvoiceDto = z.infer<typeof updateInvoiceDto>;
export type ListInvoicesQueryDto = z.infer<typeof listInvoicesQueryDto>;
export type InvoiceItemDto = z.infer<typeof invoiceItemDto>;
