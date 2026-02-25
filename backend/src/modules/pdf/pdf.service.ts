import type { DrizzleDB } from '../../db/client.js';
import type { R2Bucket } from '@cloudflare/workers-types';
import { InvoiceRepository } from '../invoice/invoice.repository.js';
import { InvoiceItemRepository } from '../invoice/invoice-item.repository.js';
import { generateInvoicePdf } from './pdf.generator.js';
import { getPdfStorageKey, putPdf, getPdf } from './pdf.storage.js';
import { nowISO } from '../../utils/date.js';
import { AppError } from '../../errors/app-error.js';

export class PdfService {
  private readonly invoiceRepo: InvoiceRepository;
  private readonly itemRepo: InvoiceItemRepository;

  constructor(
    private readonly db: DrizzleDB,
    private readonly bucket: R2Bucket,
  ) {
    this.invoiceRepo = new InvoiceRepository(db);
    this.itemRepo = new InvoiceItemRepository(db);
  }

  async generate(invoiceId: string, businessId: string): Promise<{ storageKey: string }> {
    const invoice = await this.invoiceRepo.findById(invoiceId);
    if (!invoice || invoice.businessId !== businessId) {
      throw new AppError(404, 'INVOICE_NOT_FOUND', 'Invoice not found');
    }

    const items = await this.itemRepo.findByInvoiceId(invoiceId);
    const pdfBytes = await generateInvoicePdf(invoice, items);

    const storageKey = getPdfStorageKey(invoiceId);
    await putPdf(this.bucket, storageKey, pdfBytes);

    // Persist the storage key on the invoice
    await this.invoiceRepo.update(invoiceId, {
      pdfStorageKey: storageKey,
      updatedAt: nowISO(),
    });

    return { storageKey };
  }

  async getDownloadStream(invoiceId: string, businessId: string): Promise<ReadableStream> {
    const invoice = await this.invoiceRepo.findById(invoiceId);
    if (!invoice || invoice.businessId !== businessId) {
      throw new AppError(404, 'INVOICE_NOT_FOUND', 'Invoice not found');
    }

    const key = invoice.pdfStorageKey ?? getPdfStorageKey(invoiceId);
    const stream = await getPdf(this.bucket, key);
    if (!stream) {
      throw new AppError(404, 'PDF_NOT_FOUND', 'PDF not yet generated. Call /generate first');
    }

    return stream;
  }
}
