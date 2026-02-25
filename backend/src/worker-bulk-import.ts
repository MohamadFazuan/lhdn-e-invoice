/**
 * Cloudflare Queue consumer — handles CSV bulk invoice import processing.
 *
 * This is a SEPARATE Worker entry point from src/index.ts and src/worker-queue.ts.
 * Registered as a queue consumer in wrangler.toml:
 *   [[queues.consumers]]
 *   queue = "lhdn-bulk-import-queue"
 */

import type { Env } from './env.js';
import { createDb } from './db/client.js';
import { bulkImports } from './db/schema/index.js';
import { eq } from 'drizzle-orm';
import { InvoiceRepository } from './modules/invoice/invoice.repository.js';
import { InvoiceItemRepository } from './modules/invoice/invoice-item.repository.js';
import { InvoiceService } from './modules/invoice/invoice.service.js';
import { parseCsvRows } from './modules/bulk-import/bulk-import.csv-parser.js';
import type { BulkImportJob } from './modules/bulk-import/bulk-import.service.js';
import { nowISO } from './utils/date.js';

const BULK_IMPORT_MAX_ROWS = 500;

export default {
  async queue(batch: MessageBatch<BulkImportJob>, env: Env): Promise<void> {
    const db = createDb(env.DB);

    for (const msg of batch.messages) {
      const job = msg.body;

      try {
        // Mark as PROCESSING
        await db
          .update(bulkImports)
          .set({ status: 'PROCESSING', updatedAt: nowISO() })
          .where(eq(bulkImports.id, job.bulkImportId));

        // Fetch CSV from R2
        const r2Object = await env.FILE_BUCKET.get(job.r2Key);
        if (!r2Object) throw new Error(`CSV file not found in R2: ${job.r2Key}`);

        const csvText = await r2Object.text();
        const rows = parseCsvRows(csvText);

        if (rows.length > BULK_IMPORT_MAX_ROWS) {
          throw new Error(`CSV has ${rows.length} rows — maximum is ${BULK_IMPORT_MAX_ROWS}`);
        }

        // Update total rows count
        await db
          .update(bulkImports)
          .set({ totalRows: rows.length, updatedAt: nowISO() })
          .where(eq(bulkImports.id, job.bulkImportId));

        const invoiceRepo = new InvoiceRepository(db);
        const itemRepo = new InvoiceItemRepository(db);
        const invoiceService = new InvoiceService(invoiceRepo, itemRepo);

        const errors: Array<{ row: number; error: string }> = [];
        const createdIds: string[] = [];

        for (const parsedRow of rows) {
          if (parsedRow.error || !parsedRow.data) {
            errors.push({ row: parsedRow.row, error: parsedRow.error ?? 'Unknown parse error' });
            continue;
          }

          try {
            const invoice = await invoiceService.create(job.businessId, parsedRow.data);
            createdIds.push(invoice.id);
          } catch (err) {
            const message = err instanceof Error ? err.message : 'Creation failed';
            errors.push({ row: parsedRow.row, error: message });
          }
        }

        // Mark as COMPLETED
        await db
          .update(bulkImports)
          .set({
            status: 'COMPLETED',
            successCount: createdIds.length,
            errorCount: errors.length,
            errorSummary: errors.length > 0 ? JSON.stringify(errors) : null,
            createdInvoiceIds: JSON.stringify(createdIds),
            completedAt: nowISO(),
            updatedAt: nowISO(),
          })
          .where(eq(bulkImports.id, job.bulkImportId));

        console.log(
          `[BULK IMPORT] ${job.bulkImportId} → COMPLETED`,
          `(${createdIds.length} created, ${errors.length} errors)`,
        );

        msg.ack();
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : 'Unknown error';
        console.error(`[BULK IMPORT] Failed for ${job.bulkImportId}:`, errorMessage);

        await db
          .update(bulkImports)
          .set({
            status: 'FAILED',
            processingError: errorMessage,
            updatedAt: nowISO(),
          })
          .where(eq(bulkImports.id, job.bulkImportId))
          .catch(() => {});

        msg.retry();
      }
    }
  },
};
