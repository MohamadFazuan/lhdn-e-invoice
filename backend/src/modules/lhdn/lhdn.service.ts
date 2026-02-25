import type { DrizzleDB } from '../../db/client.js';
import type { Env } from '../../env.js';
import { LhdnApiClient } from './lhdn.api-client.js';
import { LhdnTokenRepository } from './lhdn.token.repository.js';
import { LhdnSubmissionRepository } from './lhdn.submission.repository.js';
import { InvoiceRepository } from '../invoice/invoice.repository.js';
import { InvoiceItemRepository } from '../invoice/invoice-item.repository.js';
import { BusinessRepository } from '../business/business.repository.js';
import { buildUblDocument } from './lhdn.ubl-builder.js';
import { prepareDocument } from './lhdn.signer.js';
import { decrypt } from '../../utils/crypto.js';
import { nowISO, expiresInSeconds, isExpired } from '../../utils/date.js';
import { newId } from '../../utils/uuid.js';
import {
  LHDN_TOKEN_BUFFER_SECONDS,
  LHDN_TOKEN_EXPIRY_SECONDS,
} from '../../config/constants.js';
import {
  LHDNCredentialsMissingError,
  LHDNTokenError,
  LHDNSubmissionError,
} from '../../errors/lhdn-errors.js';
import { AppError } from '../../errors/app-error.js';

export class LhdnService {
  private readonly apiClient: LhdnApiClient;
  private readonly tokenRepo: LhdnTokenRepository;
  private readonly submissionRepo: LhdnSubmissionRepository;
  private readonly invoiceRepo: InvoiceRepository;
  private readonly itemRepo: InvoiceItemRepository;
  private readonly businessRepo: BusinessRepository;

  constructor(
    private readonly db: DrizzleDB,
    private readonly env: Env,
  ) {
    this.apiClient = new LhdnApiClient(env.LHDN_ENV);
    this.tokenRepo = new LhdnTokenRepository(db);
    this.submissionRepo = new LhdnSubmissionRepository(db);
    this.invoiceRepo = new InvoiceRepository(db);
    this.itemRepo = new InvoiceItemRepository(db);
    this.businessRepo = new BusinessRepository(db);
  }

  async submit(invoiceId: string, businessId: string) {
    const [invoice, business] = await Promise.all([
      this.invoiceRepo.findById(invoiceId),
      this.businessRepo.findById(businessId),
    ]);

    if (!invoice || invoice.businessId !== businessId) {
      throw new AppError(404, 'INVOICE_NOT_FOUND', 'Invoice not found');
    }
    if (invoice.status !== 'READY_FOR_SUBMISSION') {
      throw new AppError(409, 'INVALID_STATUS', 'Only READY_FOR_SUBMISSION invoices can be submitted');
    }
    if (!business) throw new AppError(404, 'BUSINESS_NOT_FOUND', 'Business not found');

    const accessToken = await this._getOrRefreshToken(business);
    const items = await this.itemRepo.findByInvoiceId(invoiceId);

    const { document: ublDoc } = await buildUblDocument(invoice, items, business);
    const { document: docBase64, documentHash, codeNumber } = await prepareDocument(
      ublDoc,
      invoice.invoiceNumber ?? invoiceId,
    );

    const submissionPayload = {
      documents: [
        {
          format: 'JSON',
          document: docBase64,
          documentHash,
          codeNumber,
        },
      ],
    };

    const submissionId = newId();
    const now = nowISO();

    // Create submission record before calling LHDN (for audit trail)
    await this.submissionRepo.create({
      id: submissionId,
      invoiceId,
      businessId,
      submissionUid: null,
      documentUuid: null,
      submissionPayload: JSON.stringify(submissionPayload),
      responsePayload: null,
      status: 'PENDING',
      errorMessage: null,
      submittedAt: null,
      validatedAt: null,
      createdAt: now,
    });

    try {
      const response = await this.apiClient.submitDocuments(accessToken, submissionPayload);

      const accepted = response.acceptedDocuments[0];
      const rejected = response.rejectedDocuments[0];

      if (rejected && !accepted) {
        await this.submissionRepo.update(submissionId, {
          status: 'REJECTED',
          responsePayload: JSON.stringify(response),
          errorMessage: rejected.error.message,
        });
        await this.invoiceRepo.update(invoiceId, { status: 'REJECTED', updatedAt: nowISO() });
        throw new LHDNSubmissionError(rejected.error.message);
      }

      await Promise.all([
        this.submissionRepo.update(submissionId, {
          submissionUid: response.submissionUid,
          documentUuid: accepted?.uuid ?? null,
          status: 'SUBMITTED',
          responsePayload: JSON.stringify(response),
          submittedAt: nowISO(),
        }),
        this.invoiceRepo.update(invoiceId, {
          status: 'SUBMITTED',
          lhdnSubmissionUid: response.submissionUid,
          lhdnUuid: accepted?.uuid ?? null,
          lhdnSubmittedAt: nowISO(),
          updatedAt: nowISO(),
        }),
      ]);

      return { submissionUid: response.submissionUid, status: 'SUBMITTED' };
    } catch (err) {
      if (err instanceof LHDNSubmissionError) throw err;
      const message = err instanceof Error ? err.message : 'Submission failed';
      await this.submissionRepo.update(submissionId, {
        status: 'REJECTED',
        errorMessage: message,
      });
      throw err;
    }
  }

  async pollStatus(invoiceId: string, businessId: string) {
    const invoice = await this.invoiceRepo.findById(invoiceId);
    if (!invoice || invoice.businessId !== businessId) {
      throw new AppError(404, 'INVOICE_NOT_FOUND', 'Invoice not found');
    }
    if (!invoice.lhdnSubmissionUid) {
      throw new AppError(400, 'NOT_SUBMITTED', 'Invoice has not been submitted to LHDN');
    }

    const business = await this.businessRepo.findById(businessId);
    if (!business) throw new AppError(404, 'BUSINESS_NOT_FOUND', 'Business not found');

    const accessToken = await this._getOrRefreshToken(business);
    const statusResponse = await this.apiClient.getSubmissionStatus(
      accessToken,
      invoice.lhdnSubmissionUid,
    );

    const doc = statusResponse.documentSummary[0];
    if (!doc) return { status: statusResponse.overallStatus };

    const submission = await this.submissionRepo.findLatestByInvoiceId(invoiceId);

    if (doc.status === 'Valid') {
      await Promise.all([
        submission
          ? this.submissionRepo.update(submission.id, {
              status: 'VALIDATED',
              validatedAt: doc.dateTimeValidated ?? nowISO(),
              responsePayload: JSON.stringify(statusResponse),
            })
          : Promise.resolve(),
        this.invoiceRepo.update(invoiceId, {
          status: 'VALIDATED',
          lhdnValidationStatus: 'Valid',
          lhdnValidatedAt: doc.dateTimeValidated ?? nowISO(),
          updatedAt: nowISO(),
        }),
      ]);
    } else if (doc.status === 'Invalid') {
      await Promise.all([
        submission
          ? this.submissionRepo.update(submission.id, {
              status: 'REJECTED',
              errorMessage: doc.error?.message ?? 'Rejected by LHDN',
              responsePayload: JSON.stringify(statusResponse),
            })
          : Promise.resolve(),
        this.invoiceRepo.update(invoiceId, {
          status: 'REJECTED',
          lhdnValidationStatus: 'Invalid',
          updatedAt: nowISO(),
        }),
      ]);
    }

    return { status: doc.status, details: statusResponse };
  }

  async cancel(invoiceId: string, businessId: string, reason: string) {
    const invoice = await this.invoiceRepo.findById(invoiceId);
    if (!invoice || invoice.businessId !== businessId) {
      throw new AppError(404, 'INVOICE_NOT_FOUND', 'Invoice not found');
    }
    if (invoice.status !== 'VALIDATED') {
      throw new AppError(409, 'INVALID_STATUS', 'Only VALIDATED invoices can be cancelled');
    }
    if (!invoice.lhdnUuid) {
      throw new AppError(400, 'MISSING_UUID', 'Invoice does not have an LHDN UUID');
    }

    const business = await this.businessRepo.findById(businessId);
    if (!business) throw new AppError(404, 'BUSINESS_NOT_FOUND', 'Business not found');

    const accessToken = await this._getOrRefreshToken(business);
    await this.apiClient.cancelDocument(accessToken, invoice.lhdnUuid, reason);

    await this.invoiceRepo.update(invoiceId, {
      status: 'CANCELLED',
      updatedAt: nowISO(),
    });

    return { status: 'CANCELLED' };
  }

  private async _getOrRefreshToken(business: Awaited<ReturnType<BusinessRepository['findById']>>): Promise<string> {
    if (!business!.lhdnClientIdEncrypted || !business!.lhdnClientSecretEncrypted) {
      throw new LHDNCredentialsMissingError();
    }

    const cached = await this.tokenRepo.findByBusinessId(business!.id);
    if (cached && !isExpired(cached.expiresAt, LHDN_TOKEN_BUFFER_SECONDS)) {
      return decrypt(cached.accessTokenEncrypted, this.env.ENCRYPTION_KEY);
    }

    const [clientId, clientSecret] = await Promise.all([
      decrypt(business!.lhdnClientIdEncrypted, this.env.ENCRYPTION_KEY),
      decrypt(business!.lhdnClientSecretEncrypted, this.env.ENCRYPTION_KEY),
    ]);

    const tokenRes = await this.apiClient.getToken(clientId, clientSecret);
    const encryptedToken = await import('../../utils/crypto.js').then((m) =>
      m.encrypt(tokenRes.access_token, this.env.ENCRYPTION_KEY),
    );

    await this.tokenRepo.upsert({
      id: newId(),
      businessId: business!.id,
      accessTokenEncrypted: encryptedToken,
      expiresAt: expiresInSeconds(tokenRes.expires_in - LHDN_TOKEN_BUFFER_SECONDS),
      createdAt: nowISO(),
    });

    return tokenRes.access_token;
  }
}
