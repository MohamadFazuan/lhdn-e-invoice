import { INVOICE_TOTAL_TOLERANCE } from '../../config/constants.js';
import type { InvoiceItem } from '../../db/schema/index.js';

export interface TotalsValidationResult {
  valid: boolean;
  computedSubtotal: string;
  computedTaxTotal: string;
  computedGrandTotal: string;
  errors: string[];
}

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}

/**
 * Validates that stored invoice totals match computed totals from line items.
 * Uses tolerance of 0.01 MYR for floating-point comparison.
 */
export function validateInvoiceTotals(
  items: InvoiceItem[],
  storedSubtotal: string,
  storedTaxTotal: string,
  storedGrandTotal: string,
): TotalsValidationResult {
  const errors: string[] = [];

  let computedSubtotal = 0;
  let computedTaxTotal = 0;

  for (const item of items) {
    computedSubtotal += parseFloat(item.subtotal);
    computedTaxTotal += parseFloat(item.taxAmount);
  }

  const computedGrandTotal = round2(computedSubtotal + computedTaxTotal);
  computedSubtotal = round2(computedSubtotal);
  computedTaxTotal = round2(computedTaxTotal);

  const storedSub = parseFloat(storedSubtotal);
  const storedTax = parseFloat(storedTaxTotal);
  const storedGrand = parseFloat(storedGrandTotal);

  if (Math.abs(computedSubtotal - storedSub) > INVOICE_TOTAL_TOLERANCE) {
    errors.push(
      `Subtotal mismatch: expected ${computedSubtotal.toFixed(2)}, got ${storedSub.toFixed(2)}`,
    );
  }
  if (Math.abs(computedTaxTotal - storedTax) > INVOICE_TOTAL_TOLERANCE) {
    errors.push(
      `Tax total mismatch: expected ${computedTaxTotal.toFixed(2)}, got ${storedTax.toFixed(2)}`,
    );
  }
  if (Math.abs(computedGrandTotal - storedGrand) > INVOICE_TOTAL_TOLERANCE) {
    errors.push(
      `Grand total mismatch: expected ${computedGrandTotal.toFixed(2)}, got ${storedGrand.toFixed(2)}`,
    );
  }

  return {
    valid: errors.length === 0,
    computedSubtotal: computedSubtotal.toFixed(2),
    computedTaxTotal: computedTaxTotal.toFixed(2),
    computedGrandTotal: computedGrandTotal.toFixed(2),
    errors,
  };
}

/**
 * Computes totals from line item DTOs (for new invoice creation).
 */
export function computeTotalsFromDtos(
  items: Array<{
    quantity: string;
    unitPrice: string;
    taxRate: string;
    taxType: string;
  }>,
): { subtotal: string; taxTotal: string; grandTotal: string } {
  let subtotal = 0;
  let taxTotal = 0;

  for (const item of items) {
    const qty = parseFloat(item.quantity);
    const unitPrice = parseFloat(item.unitPrice);
    const itemSubtotal = round2(qty * unitPrice);
    const taxRate = parseFloat(item.taxRate) / 100;
    const taxAmount = item.taxType === 'NA' || item.taxType === 'E'
      ? 0
      : round2(itemSubtotal * taxRate);
    subtotal += itemSubtotal;
    taxTotal += taxAmount;
  }

  return {
    subtotal: round2(subtotal).toFixed(2),
    taxTotal: round2(taxTotal).toFixed(2),
    grandTotal: round2(subtotal + taxTotal).toFixed(2),
  };
}
