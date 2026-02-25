import { eq } from 'drizzle-orm';
import type { DrizzleDB } from '../../db/client.js';
import { buyerPortalTokens, invoices, invoiceItems } from '../../db/schema/index.js';
import type { BuyerPortalToken, NewBuyerPortalToken } from '../../db/schema/buyer-portal-tokens.js';
import { sha256Hex } from '../../utils/hash.js';
import { newId } from '../../utils/uuid.js';
import { nowISO, expiresInSeconds } from '../../utils/date.js';
import { AppError } from '../../errors/app-error.js';

const TOKEN_EXPIRY_DAYS = 90;

export class BuyerPortalService {
  constructor(private readonly db: DrizzleDB) {}

  /**
   * Generate a new buyer portal token for a VALIDATED invoice.
   * Returns the raw token (only time it is available — not stored).
   */
  async createShareToken(
    invoiceId: string,
    businessId: string,
  ): Promise<{ rawToken: string; shareUrl?: string }> {
    const invoiceRows = await this.db
      .select()
      .from(invoices)
      .where(eq(invoices.id, invoiceId))
      .limit(1);

    const invoice = invoiceRows[0];
    if (!invoice || invoice.businessId !== businessId) {
      throw new AppError(404, 'INVOICE_NOT_FOUND', 'Invoice not found');
    }
    if (invoice.status !== 'VALIDATED') {
      throw new AppError(
        409,
        'INVOICE_NOT_VALIDATED',
        'Only validated invoices can be shared with buyers',
      );
    }

    const rawToken = `${crypto.randomUUID()}-${crypto.randomUUID()}`;
    const tokenHash = await sha256Hex(rawToken);
    const now = nowISO();

    await this.db.insert(buyerPortalTokens).values({
      id: newId(),
      invoiceId,
      tokenHash,
      recipientEmail: invoice.buyerEmail ?? '',
      viewCount: 0,
      lastViewedAt: null,
      expiresAt: expiresInSeconds(TOKEN_EXPIRY_DAYS * 24 * 60 * 60),
      revokedAt: null,
      createdAt: now,
    } satisfies NewBuyerPortalToken);

    return { rawToken };
  }

  /**
   * Validate a raw token and return the associated invoice data.
   * Increments the view count on each successful access.
   */
  async getReceiptByToken(rawToken: string) {
    const tokenHash = await sha256Hex(rawToken);

    const tokenRows = await this.db
      .select()
      .from(buyerPortalTokens)
      .where(eq(buyerPortalTokens.tokenHash, tokenHash))
      .limit(1);

    const tokenRow = tokenRows[0];
    if (!tokenRow) {
      throw new AppError(404, 'TOKEN_NOT_FOUND', 'Invalid or expired receipt link');
    }
    if (tokenRow.revokedAt) {
      throw new AppError(403, 'TOKEN_REVOKED', 'This receipt link has been revoked');
    }
    if (tokenRow.expiresAt && new Date(tokenRow.expiresAt) <= new Date()) {
      throw new AppError(410, 'TOKEN_EXPIRED', 'This receipt link has expired');
    }

    // Update view count
    await this.db
      .update(buyerPortalTokens)
      .set({ viewCount: tokenRow.viewCount + 1, lastViewedAt: nowISO() })
      .where(eq(buyerPortalTokens.id, tokenRow.id));

    const invoiceRows = await this.db
      .select()
      .from(invoices)
      .where(eq(invoices.id, tokenRow.invoiceId))
      .limit(1);

    const invoice = invoiceRows[0];
    if (!invoice) throw new AppError(404, 'INVOICE_NOT_FOUND', 'Invoice no longer exists');

    const items = await this.db
      .select()
      .from(invoiceItems)
      .where(eq(invoiceItems.invoiceId, invoice.id));

    return { invoice, items };
  }

  /**
   * Return the R2 key for the PDF of the invoice associated with a token.
   * Used by the download endpoint to stream from R2.
   */
  async getPdfKeyByToken(rawToken: string): Promise<{ pdfStorageKey: string; invoiceId: string }> {
    const { invoice } = await this.getReceiptByToken(rawToken);
    if (!invoice.pdfStorageKey) {
      throw new AppError(404, 'PDF_NOT_FOUND', 'PDF has not been generated for this invoice');
    }
    return { pdfStorageKey: invoice.pdfStorageKey, invoiceId: invoice.id };
  }

  /**
   * Revoke a share token — called by the business owner.
   */
  async revokeToken(tokenId: string, businessId: string): Promise<void> {
    const tokenRows = await this.db
      .select()
      .from(buyerPortalTokens)
      .where(eq(buyerPortalTokens.id, tokenId))
      .limit(1);

    const tokenRow = tokenRows[0];
    if (!tokenRow) throw new AppError(404, 'TOKEN_NOT_FOUND', 'Token not found');

    // Verify the token belongs to an invoice in this business
    const invoiceRows = await this.db
      .select({ businessId: invoices.businessId })
      .from(invoices)
      .where(eq(invoices.id, tokenRow.invoiceId))
      .limit(1);

    if (!invoiceRows[0] || invoiceRows[0].businessId !== businessId) {
      throw new AppError(403, 'FORBIDDEN', 'You do not have permission to revoke this token');
    }

    await this.db
      .update(buyerPortalTokens)
      .set({ revokedAt: nowISO() })
      .where(eq(buyerPortalTokens.id, tokenId));
  }
}
