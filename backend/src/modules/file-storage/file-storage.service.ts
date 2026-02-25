import { eq, and } from 'drizzle-orm';
import { AwsClient } from 'aws4fetch';
import type { Env } from '../../env.js';
import type { UploadRequestDto, ConfirmUploadDto, UploadUrlResponse, ConfirmUploadResponse } from './file-storage.dto.js';
import type { DrizzleDB } from '../../db/client.js';
import { ocrDocuments, invoices, bulkImports } from '../../db/schema/index.js';
import { newId } from '../../utils/uuid.js';
import { nowISO } from '../../utils/date.js';
import {
  ALLOWED_FILE_TYPES,
  FILE_UPLOAD_PREFIX,
  PRESIGNED_URL_EXPIRY_SECONDS,
} from '../../config/constants.js';
import { UnsupportedFileTypeError, FileTooLargeError } from '../../errors/ocr-errors.js';

export class FileStorageService {
  constructor(
    private readonly db: DrizzleDB,
    private readonly env: Env,
  ) {}

  async getUploadUrl(
    userId: string,
    businessId: string,
    dto: UploadRequestDto,
  ): Promise<UploadUrlResponse> {
    const ext = dto.fileType.toLowerCase();
    if (!(ALLOWED_FILE_TYPES as readonly string[]).includes(ext)) {
      throw new UnsupportedFileTypeError(ext);
    }

    const maxBytes = parseInt(this.env.MAX_FILE_SIZE_MB, 10) * 1024 * 1024;
    if (dto.fileSize > maxBytes) {
      throw new FileTooLargeError(parseInt(this.env.MAX_FILE_SIZE_MB, 10));
    }

    const uuid = newId();
    const r2Key = `${FILE_UPLOAD_PREFIX}/${userId}/${uuid}.${ext}`;

    const aws = new AwsClient({
      accessKeyId: this.env.R2_ACCESS_KEY_ID,
      secretAccessKey: this.env.R2_SECRET_ACCESS_KEY,
      region: 'auto',
      service: 's3',
    });

    const url = new URL(
      `https://${this.env.R2_ACCOUNT_ID}.r2.cloudflarestorage.com/${this.env.R2_FILE_BUCKET_NAME}/${r2Key}`,
    );
    url.searchParams.set('X-Amz-Expires', String(PRESIGNED_URL_EXPIRY_SECONDS));

    const signed = await aws.sign(
      new Request(url.toString(), { method: 'PUT' }),
      { aws: { signQuery: true } },
    );

    return {
      uploadUrl: signed.url,
      r2Key,
      expiresIn: PRESIGNED_URL_EXPIRY_SECONDS,
    };
  }

  async confirmUpload(
    userId: string,
    businessId: string,
    dto: ConfirmUploadDto,
  ): Promise<ConfirmUploadResponse> {
    const maxBytes = parseInt(this.env.MAX_FILE_SIZE_MB, 10) * 1024 * 1024;

    // Verify file actually exists in R2 and check size
    const object = await this.env.FILE_BUCKET.head(dto.r2Key);
    if (!object) {
      throw new Error('File not found in storage. Upload the file before confirming.');
    }
    if (object.size > maxBytes) {
      throw new FileTooLargeError(parseInt(this.env.MAX_FILE_SIZE_MB, 10));
    }

    // Detect file type from key extension
    const extMatch = dto.r2Key.match(/\.([^.]+)$/);
    const ext = extMatch?.[1]?.toLowerCase() ?? '';
    if (!(ALLOWED_FILE_TYPES as readonly string[]).includes(ext)) {
      throw new UnsupportedFileTypeError(ext);
    }

    const originalFilename = dto.r2Key.split('/').pop() ?? dto.r2Key;
    const now = nowISO();

    const ocrDocId = newId();
    const invoiceId = newId();

    // Create ocr_document record
    await this.db.insert(ocrDocuments).values({
      id: ocrDocId,
      invoiceId,
      userId,
      businessId,
      r2Key: dto.r2Key,
      originalFilename,
      fileType: ext as any,
      fileSize: object.size,
      ocrStatus: 'PENDING',
      rawText: null,
      extractedJson: null,
      confidenceScore: null,
      processingError: null,
      processedAt: null,
      createdAt: now,
      updatedAt: now,
    });

    // Create invoice record in OCR_PROCESSING state
    await this.db.insert(invoices).values({
      id: invoiceId,
      businessId,
      ocrDocumentId: ocrDocId,
      invoiceNumber: null,
      invoiceType: '01',
      status: 'OCR_PROCESSING',
      supplierName: null,
      supplierTin: null,
      supplierRegistration: null,
      buyerName: null,
      buyerTin: null,
      buyerRegistrationNumber: null,
      buyerSstNumber: null,
      buyerEmail: null,
      buyerPhone: null,
      buyerAddressLine0: null,
      buyerAddressLine1: null,
      buyerCityName: null,
      buyerStateCode: null,
      buyerCountryCode: 'MYS',
      currencyCode: 'MYR',
      subtotal: '0.00',
      taxTotal: '0.00',
      grandTotal: '0.00',
      issueDate: null,
      dueDate: null,
      notes: null,
      lhdnUuid: null,
      lhdnSubmissionUid: null,
      lhdnValidationStatus: null,
      lhdnSubmittedAt: null,
      lhdnValidatedAt: null,
      pdfStorageKey: null,
      createdAt: now,
      updatedAt: now,
    });

    // Enqueue OCR job
    await this.env.OCR_QUEUE.send({
      ocrDocumentId: ocrDocId,
      r2Key: dto.r2Key,
      fileType: ext,
      invoiceId,
      userId,
      businessId,
    });

    // Link invoice to bulk document session if provided
    if (dto.bulkSessionId) {
      const sessionRows = await this.db
        .select()
        .from(bulkImports)
        .where(
          and(
            eq(bulkImports.id, dto.bulkSessionId),
            eq(bulkImports.businessId, businessId),
          ),
        )
        .limit(1);

      if (sessionRows[0]) {
        const ids: string[] = sessionRows[0].createdInvoiceIds
          ? JSON.parse(sessionRows[0].createdInvoiceIds)
          : [];
        if (!ids.includes(invoiceId)) ids.push(invoiceId);
        await this.db
          .update(bulkImports)
          .set({
            createdInvoiceIds: JSON.stringify(ids),
            totalRows: ids.length,
            updatedAt: nowISO(),
          })
          .where(eq(bulkImports.id, dto.bulkSessionId));
      }
    }

    return { invoiceId, ocrDocumentId: ocrDocId, status: 'OCR_PROCESSING' };
  }
}
