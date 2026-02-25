import type { ExtractedInvoice } from './ai-extraction.dto.js';
import {
  AI_CONFIDENCE_OVERALL_MIN,
  AI_CONFIDENCE_OVERALL_AUTO_APPROVE,
  AI_CONFIDENCE_CRITICAL_FIELD_MIN,
} from '../../config/constants.js';

export interface ValidationResult {
  needsReview: boolean;
  reasons: string[];
}

/**
 * Determines whether extracted invoice data requires human review.
 *
 * Critical fields (must be present + confidence ≥ 0.6):
 *   supplier.name, supplier.tin, invoice.number, invoice.date, totals.grand_total
 *
 * Auto-approve conditions:
 *   All critical fields present, all critical confidences ≥ 0.6, overall_confidence ≥ 0.8
 */
export function validateExtractedFields(data: ExtractedInvoice): ValidationResult {
  const reasons: string[] = [];

  const criticalChecks: Array<{ label: string; value: unknown; confidence: number }> = [
    { label: 'supplier.name', value: data.supplier.name, confidence: data.supplier.confidence.name },
    { label: 'supplier.tin', value: data.supplier.tin, confidence: data.supplier.confidence.tin },
    { label: 'invoice.number', value: data.invoice.number, confidence: data.invoice.confidence.number },
    { label: 'invoice.date', value: data.invoice.date, confidence: data.invoice.confidence.date },
    { label: 'totals.grand_total', value: data.totals.grand_total, confidence: data.totals.confidence.grand_total },
  ];

  for (const { label, value, confidence } of criticalChecks) {
    if (value === null || value === undefined) {
      reasons.push(`Missing critical field: ${label}`);
    } else if (confidence < AI_CONFIDENCE_CRITICAL_FIELD_MIN) {
      reasons.push(`Low confidence on ${label}: ${(confidence * 100).toFixed(0)}%`);
    }
  }

  if (data.overall_confidence < AI_CONFIDENCE_OVERALL_MIN) {
    reasons.push(`Overall confidence too low: ${(data.overall_confidence * 100).toFixed(0)}% (min ${AI_CONFIDENCE_OVERALL_MIN * 100}%)`);
  }

  if (data.line_items.length === 0) {
    reasons.push('No line items extracted');
  }

  return {
    needsReview: reasons.length > 0,
    reasons,
  };
}
