import { z } from 'zod';

const confidenceNumber = z.number().min(0).max(1);

export const extractedInvoiceSchema = z.object({
  supplier: z.object({
    name: z.string().nullable(),
    tin: z.string().nullable(),
    registration_number: z.string().nullable(),
    address: z.string().nullable(),
    confidence: z.object({
      name: confidenceNumber,
      tin: confidenceNumber,
      registration_number: confidenceNumber,
      address: confidenceNumber,
    }),
  }),
  buyer: z.object({
    name: z.string().nullable(),
    tin: z.string().nullable(),
    registration_number: z.string().nullable(),
    email: z.string().nullable(),
    phone: z.string().nullable(),
    address: z.string().nullable(),
    confidence: z.object({
      name: confidenceNumber,
      tin: confidenceNumber,
    }),
  }),
  invoice: z.object({
    number: z.string().nullable(),
    date: z.string().nullable(), // ISO YYYY-MM-DD
    currency: z.string().default('MYR'),
    confidence: z.object({
      number: confidenceNumber,
      date: confidenceNumber,
    }),
  }),
  line_items: z.array(
    z.object({
      description: z.string(),
      quantity: z.number(),
      unit_price: z.number(),
      tax_type: z.enum(['01', '02', 'E', 'AE', 'NA']).default('NA'),
      tax_rate: z.number().default(0),
      tax_amount: z.number(),
      subtotal: z.number(),
      total: z.number(),
      confidence: confidenceNumber,
    }),
  ),
  totals: z.object({
    subtotal: z.number().nullable(),
    tax_total: z.number().nullable(),
    grand_total: z.number().nullable(),
    confidence: z.object({
      subtotal: confidenceNumber,
      tax_total: confidenceNumber,
      grand_total: confidenceNumber,
    }),
  }),
  overall_confidence: confidenceNumber,
});

export type ExtractedInvoice = z.infer<typeof extractedInvoiceSchema>;
