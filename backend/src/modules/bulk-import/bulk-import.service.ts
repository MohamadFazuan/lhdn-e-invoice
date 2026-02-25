import { eq, and, inArray } from 'drizzle-orm';
import type { DrizzleDB } from '../../db/client.js';
import { bulkImports, invoices, ocrDocuments } from '../../db/schema/index.js';
import type { BulkImport, NewBulkImport } from '../../db/schema/bulk-imports.js';
import { newId } from '../../utils/uuid.js';
import { nowISO } from '../../utils/date.js';
import { AppError } from '../../errors/app-error.js';

const BULK_IMPORT_MAX_FILE_MB = 5;
const BULK_IMPORT_ACCEPTED_TYPES = ['text/csv', 'application/csv'];

export interface BulkImportJob {
  bulkImportId: string;
  r2Key: string;
  businessId: string;
  userId: string;
}

export interface SessionInvoice {
  invoice: typeof invoices.$inferSelect;
  ocrDocument: (typeof ocrDocuments.$inferSelect) | null;
}

export interface SessionWithInvoices {
  session: BulkImport;
  invoices: SessionInvoice[];
  stats: { total: number; ready: number; reviewing: number; processing: number; failed: number };
}

export class BulkImportService {
  constructor(
    private readonly db: DrizzleDB,
    private readonly fileBucket: R2Bucket,
    private readonly bulkQueue: Queue<BulkImportJob>,
  ) {}

  // ── CSV bulk import (existing) ──────────────────────────────────────────

  async initiateUpload(businessId: string, userId: string, file: File): Promise<BulkImport> {
    if (!BULK_IMPORT_ACCEPTED_TYPES.includes(file.type) && !file.name.endsWith('.csv')) {
      throw new AppError(415, 'UNSUPPORTED_FILE_TYPE', 'Only CSV files are accepted');
    }
    if (file.size > BULK_IMPORT_MAX_FILE_MB * 1024 * 1024) {
      throw new AppError(413, 'FILE_TOO_LARGE', `File must not exceed ${BULK_IMPORT_MAX_FILE_MB} MB`);
    }

    const r2Key = `bulk-imports/${businessId}/${newId()}.csv`;
    await this.fileBucket.put(r2Key, await file.arrayBuffer(), {
      httpMetadata: { contentType: 'text/csv' },
    });

    const now = nowISO();
    const record: NewBulkImport = {
      id: newId(),
      businessId,
      initiatedByUserId: userId,
      r2Key,
      originalFilename: file.name,
      source: 'CSV',
      status: 'QUEUED',
      totalRows: null,
      successCount: 0,
      errorCount: 0,
      errorSummary: null,
      createdInvoiceIds: null,
      processingError: null,
      completedAt: null,
      createdAt: now,
      updatedAt: now,
    };

    await this.db.insert(bulkImports).values(record);
    const created = await this._findById(record.id);

    await this.bulkQueue.send({ bulkImportId: record.id, r2Key, businessId, userId });

    return created!;
  }

  // ── Document session (new) ──────────────────────────────────────────────

  async createDocumentSession(businessId: string, userId: string): Promise<BulkImport> {
    const id = newId();
    const now = nowISO();
    await this.db.insert(bulkImports).values({
      id,
      businessId,
      initiatedByUserId: userId,
      r2Key: `sessions/${businessId}/${id}`,
      originalFilename: 'Document Session',
      source: 'DOCUMENTS',
      status: 'PROCESSING',
      totalRows: 0,
      successCount: 0,
      errorCount: 0,
      errorSummary: null,
      createdInvoiceIds: '[]',
      processingError: null,
      completedAt: null,
      createdAt: now,
      updatedAt: now,
    });
    return (await this._findById(id))!;
  }

  async addInvoiceToSession(
    sessionId: string,
    businessId: string,
    invoiceId: string,
  ): Promise<void> {
    const session = await this._findByIdAndBusiness(sessionId, businessId);
    const ids: string[] = session.createdInvoiceIds
      ? JSON.parse(session.createdInvoiceIds)
      : [];
    if (!ids.includes(invoiceId)) ids.push(invoiceId);
    await this.db
      .update(bulkImports)
      .set({ createdInvoiceIds: JSON.stringify(ids), totalRows: ids.length, updatedAt: nowISO() })
      .where(eq(bulkImports.id, sessionId));
  }

  async getSessionWithInvoices(sessionId: string, businessId: string): Promise<SessionWithInvoices> {
    const session = await this._findByIdAndBusiness(sessionId, businessId);
    const invoiceIds: string[] = session.createdInvoiceIds
      ? JSON.parse(session.createdInvoiceIds)
      : [];

    if (invoiceIds.length === 0) {
      return { session, invoices: [], stats: { total: 0, ready: 0, reviewing: 0, processing: 0, failed: 0 } };
    }

    const rows = await this.db
      .select({ invoice: invoices, ocrDocument: ocrDocuments })
      .from(invoices)
      .leftJoin(ocrDocuments, eq(invoices.ocrDocumentId, ocrDocuments.id))
      .where(inArray(invoices.id, invoiceIds));

    const stats = { total: rows.length, ready: 0, reviewing: 0, processing: 0, failed: 0 };
    for (const { invoice } of rows) {
      if (invoice.status === 'READY_FOR_SUBMISSION') stats.ready++;
      else if (invoice.status === 'REVIEW_REQUIRED') stats.reviewing++;
      else if (invoice.status === 'OCR_PROCESSING') stats.processing++;
      else if (invoice.status === 'REJECTED') stats.failed++;
    }

    return { session, invoices: rows as SessionInvoice[], stats };
  }

  async getReadyInvoiceIds(sessionId: string, businessId: string): Promise<string[]> {
    const { invoices: rows } = await this.getSessionWithInvoices(sessionId, businessId);
    return rows
      .filter((r) => r.invoice.status === 'READY_FOR_SUBMISSION')
      .map((r) => r.invoice.id);
  }

  // ── Shared queries ──────────────────────────────────────────────────────

  async getStatus(id: string, businessId: string): Promise<BulkImport> {
    return this._findByIdAndBusiness(id, businessId);
  }

  async list(businessId: string, limit = 20, offset = 0): Promise<BulkImport[]> {
    return this.db
      .select()
      .from(bulkImports)
      .where(eq(bulkImports.businessId, businessId))
      .limit(limit)
      .offset(offset);
  }

  private async _findById(id: string): Promise<BulkImport | null> {
    const rows = await this.db.select().from(bulkImports).where(eq(bulkImports.id, id)).limit(1);
    return rows[0] ?? null;
  }

  private async _findByIdAndBusiness(id: string, businessId: string): Promise<BulkImport> {
    const rows = await this.db
      .select()
      .from(bulkImports)
      .where(and(eq(bulkImports.id, id), eq(bulkImports.businessId, businessId)))
      .limit(1);
    if (!rows[0]) throw new AppError(404, 'IMPORT_NOT_FOUND', 'Bulk import session not found');
    return rows[0];
  }
}
