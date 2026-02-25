import type { CreateInvoiceDto } from '../invoice/invoice.dto.js';

export interface ParsedRow {
  row: number;
  data?: CreateInvoiceDto;
  error?: string;
}

/**
 * CSV column layout (one invoice per row, single line item per row):
 *
 * invoiceNumber, invoiceType, issueDate, dueDate,
 * buyerName, buyerTin, buyerEmail, buyerPhone, buyerRegistrationNumber,
 * currencyCode, notes,
 * item_description, item_quantity, item_unitPrice, item_taxType, item_taxRate
 */
const EXPECTED_COLUMNS = 16;

export function parseCsvRows(csvText: string): ParsedRow[] {
  const lines = csvText
    .split('\n')
    .map((l) => l.trim())
    .filter((l) => l.length > 0);

  if (lines.length === 0) return [];

  // Skip header row
  const dataLines = lines[0].toLowerCase().includes('invoicenumber')
    ? lines.slice(1)
    : lines;

  return dataLines.map((line, idx) => {
    const row = idx + 2; // 1-indexed, accounting for optional header
    const cols = line.split(',').map((c) => c.trim().replace(/^"|"$/g, ''));

    if (cols.length < EXPECTED_COLUMNS) {
      return {
        row,
        error: `Expected ${EXPECTED_COLUMNS} columns, got ${cols.length}`,
      };
    }

    const [
      invoiceNumber,
      invoiceType,
      issueDate,
      dueDate,
      buyerName,
      buyerTin,
      buyerEmail,
      buyerPhone,
      buyerRegistrationNumber,
      currencyCode,
      notes,
      item_description,
      item_quantity,
      item_unitPrice,
      item_taxType,
      item_taxRate,
    ] = cols;

    try {
      const dto: CreateInvoiceDto = {
        invoiceNumber: invoiceNumber || undefined,
        invoiceType: (invoiceType || '01') as '01' | '02' | '03' | '04',
        issueDate: issueDate || undefined,
        dueDate: dueDate || undefined,
        buyerName: buyerName || undefined,
        buyerTin: buyerTin || undefined,
        buyerEmail: buyerEmail || undefined,
        buyerPhone: buyerPhone || undefined,
        buyerRegistrationNumber: buyerRegistrationNumber || undefined,
        currencyCode: (currencyCode || 'MYR').substring(0, 3),
        notes: notes || undefined,
        items: [
          {
            description: item_description,
            classificationCode: '001',
            quantity: item_quantity || '1',
            unitCode: 'UNT',
            unitPrice: item_unitPrice || '0',
            taxType: (item_taxType || 'NA') as '01' | '02' | 'E' | 'AE' | 'NA',
            taxRate: item_taxRate || '0',
          },
        ],
      };

      if (!dto.items[0].description) {
        return { row, error: 'item_description is required' };
      }

      return { row, data: dto };
    } catch (err) {
      return { row, error: err instanceof Error ? err.message : 'Parse error' };
    }
  });
}
