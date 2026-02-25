/**
 * Cloudflare Queue consumer — handles OCR/AI background processing.
 *
 * This is a SEPARATE Worker entry point from src/index.ts.
 * Registered as a queue consumer in wrangler.toml:
 *   [[queues.consumers]]
 *   queue = "lhdn-ocr-queue"
 */

import type { Env } from './env.js';
import { createDb } from './db/client.js';
import { OcrRepository } from './modules/ocr/ocr.repository.js';
import { extractPDFText } from './modules/ocr/ocr.pdf-parser.js';
import { extractImageText } from './modules/ocr/ocr.image-extractor.js';
import { extractInvoiceData } from './modules/ai-extraction/ai-extraction.service.js';
import { validateExtractedFields } from './modules/ai-extraction/ai-extraction.validator.js';
import { InvoiceRepository } from './modules/invoice/invoice.repository.js';
import { InvoiceItemRepository } from './modules/invoice/invoice-item.repository.js';
import { nowISO } from './utils/date.js';
import { newId } from './utils/uuid.js';

export interface OcrJob {
  ocrDocumentId: string;
  r2Key: string;
  fileType: string; // 'pdf' | 'jpg' | 'jpeg' | 'png'
  invoiceId: string;
  userId: string;
  businessId: string;
}

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}

export default {
  async queue(batch: MessageBatch<OcrJob>, env: Env): Promise<void> {
    const db = createDb(env.DB);
    const ocrRepo = new OcrRepository(db);
    const invoiceRepo = new InvoiceRepository(db);
    const itemRepo = new InvoiceItemRepository(db);

    for (const msg of batch.messages) {
      const job = msg.body;

      try {
        // 1. Mark ocr_document as PROCESSING
        await ocrRepo.update(job.ocrDocumentId, {
          ocrStatus: 'PROCESSING',
          updatedAt: nowISO(),
        });

        // 2. Fetch file bytes from R2
        const r2Object = await env.FILE_BUCKET.get(job.r2Key);
        if (!r2Object) {
          throw new Error(`File not found in R2: ${job.r2Key}`);
        }
        const fileBytes = new Uint8Array(await r2Object.arrayBuffer());

        // 3. Extract raw text based on file type
        const fileType = job.fileType.toLowerCase();
        let rawText: string;
        if (fileType === 'pdf') {
          rawText = await extractPDFText(fileBytes);
        } else {
          // jpg, jpeg, png — vision model
          rawText = await extractImageText(fileBytes, env.AI);
        }

        // 4. AI structured extraction (JSON Mode)
        const extracted = await extractInvoiceData(rawText, env.AI);

        // 5. Validate extracted fields → determine status
        const { needsReview, reasons } = validateExtractedFields(extracted);
        const targetStatus = needsReview ? 'REVIEW_REQUIRED' : 'READY_FOR_SUBMISSION';
        const confidenceScore = extracted.overall_confidence.toFixed(2);
        const now = nowISO();

        // 6. Update ocr_document: raw_text, extracted_json, confidence_score, status=COMPLETED
        await ocrRepo.update(job.ocrDocumentId, {
          ocrStatus: 'COMPLETED',
          rawText,
          extractedJson: JSON.stringify(extracted),
          confidenceScore,
          processedAt: now,
          processingError: null,
          updatedAt: now,
        });

        // 7. Create invoice_items from extracted line_items (server computes all totals)
        const items = extracted.line_items.map((item, idx) => {
          const subtotal = round2(item.quantity * item.unit_price);
          const taxAmount = item.tax_type === 'NA' || item.tax_type === 'E'
            ? 0
            : round2(subtotal * (item.tax_rate / 100));
          return {
            id: newId(),
            invoiceId: job.invoiceId,
            description: item.description,
            classificationCode: '001',
            quantity: String(item.quantity),
            unitCode: 'UNT',
            unitPrice: String(round2(item.unit_price)),
            subtotal: subtotal.toFixed(2),
            taxType: item.tax_type,
            taxRate: String(item.tax_rate),
            taxAmount: taxAmount.toFixed(2),
            total: round2(subtotal + taxAmount).toFixed(2),
            sortOrder: idx,
            createdAt: now,
          };
        });
        await itemRepo.replaceAll(job.invoiceId, items);

        // 8. Update invoice with extracted fields + status
        const totalSubtotal = round2(
          items.reduce((sum, i) => sum + parseFloat(i.subtotal), 0),
        );
        const totalTax = round2(
          items.reduce((sum, i) => sum + parseFloat(i.taxAmount), 0),
        );
        const grandTotal = round2(totalSubtotal + totalTax);

        await invoiceRepo.update(job.invoiceId, {
          status: targetStatus,
          invoiceNumber: extracted.invoice.number ?? undefined,
          issueDate: extracted.invoice.date ?? undefined,
          currencyCode: extracted.invoice.currency ?? 'MYR',
          supplierName: extracted.supplier.name ?? undefined,
          supplierTin: extracted.supplier.tin ?? undefined,
          supplierRegistration: extracted.supplier.registration_number ?? undefined,
          buyerName: extracted.buyer.name ?? undefined,
          buyerTin: extracted.buyer.tin ?? undefined,
          buyerRegistrationNumber: extracted.buyer.registration_number ?? undefined,
          buyerEmail: extracted.buyer.email ?? undefined,
          buyerPhone: extracted.buyer.phone ?? undefined,
          subtotal: totalSubtotal.toFixed(2),
          taxTotal: totalTax.toFixed(2),
          grandTotal: grandTotal.toFixed(2),
          updatedAt: now,
        });

        console.log(
          `[OCR Queue] ${job.ocrDocumentId} → ${targetStatus}`,
          needsReview ? `(review: ${reasons.join('; ')})` : '',
        );

        msg.ack();
      } catch (err) {
        console.error(`[OCR Queue] Failed for ${job.ocrDocumentId}:`, err);

        const errorMessage = err instanceof Error ? err.message : 'Unknown error';
        const now = nowISO();

        // Mark OCR document as FAILED
        await ocrRepo.update(job.ocrDocumentId, {
          ocrStatus: 'FAILED',
          processingError: errorMessage,
          updatedAt: now,
        }).catch(() => {}); // don't throw if this also fails

        // Mark invoice as REVIEW_REQUIRED so user can correct manually
        await invoiceRepo.update(job.invoiceId, {
          status: 'REVIEW_REQUIRED',
          updatedAt: now,
        }).catch(() => {});

        msg.retry(); // retries up to max_retries (3), then goes to DLQ
      }
    }
  },
};
