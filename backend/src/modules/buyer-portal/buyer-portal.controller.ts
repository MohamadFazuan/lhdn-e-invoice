import type { Context } from 'hono';
import type { Env } from '../../env.js';
import type { BuyerPortalService } from './buyer-portal.service.js';

type AppContext = Context<{ Bindings: Env }>;

export class BuyerPortalController {
  constructor(private readonly service: BuyerPortalService) {}

  /** Public: return invoice + items JSON for a valid share token */
  async getReceipt(c: AppContext) {
    const token = c.req.param('token');
    const { invoice, items } = await this.service.getReceiptByToken(token);
    // Strip sensitive internal fields before returning to the public
    return c.json({
      success: true,
      data: {
        invoice: {
          id: invoice.id,
          invoiceNumber: invoice.invoiceNumber,
          invoiceType: invoice.invoiceType,
          status: invoice.status,
          issueDate: invoice.issueDate,
          dueDate: invoice.dueDate,
          supplierName: invoice.supplierName,
          supplierTin: invoice.supplierTin,
          buyerName: invoice.buyerName,
          buyerEmail: invoice.buyerEmail,
          currencyCode: invoice.currencyCode,
          subtotal: invoice.subtotal,
          taxTotal: invoice.taxTotal,
          grandTotal: invoice.grandTotal,
          lhdnUuid: invoice.lhdnUuid,
          lhdnValidatedAt: invoice.lhdnValidatedAt,
        },
        items: items.map((item) => ({
          id: item.id,
          description: item.description,
          quantity: item.quantity,
          unitPrice: item.unitPrice,
          subtotal: item.subtotal,
          taxType: item.taxType,
          taxRate: item.taxRate,
          taxAmount: item.taxAmount,
          total: item.total,
        })),
      },
    });
  }

  /** Public: stream PDF from R2 for a valid share token */
  async downloadPdf(c: AppContext) {
    const token = c.req.param('token');
    const { pdfStorageKey } = await this.service.getPdfKeyByToken(token);

    const object = await c.env.FILE_BUCKET.get(pdfStorageKey);
    if (!object) {
      return c.json({ success: false, error: { code: 'PDF_NOT_FOUND', message: 'PDF not found' } }, 404);
    }

    const filename = `receipt-${pdfStorageKey.split('/').pop()}`;
    return new Response(object.body, {
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="${filename}"`,
        'Cache-Control': 'private, no-store',
      },
    });
  }

  /** Authenticated: generate a share token for a validated invoice */
  async createShareToken(c: AppContext) {
    const invoiceId = c.req.param('id');
    const businessId = c.get('businessId') as string;
    const { rawToken } = await this.service.createShareToken(invoiceId, businessId);
    const appUrl = (c.env as any).APP_URL ?? '';
    const shareUrl = appUrl ? `${appUrl}/portal/receipt/${rawToken}` : rawToken;
    return c.json({ success: true, data: { shareUrl, token: rawToken } }, 201);
  }

  /** Authenticated: revoke a share token */
  async revokeToken(c: AppContext) {
    const tokenId = c.req.param('tokenId');
    const businessId = c.get('businessId') as string;
    await this.service.revokeToken(tokenId, businessId);
    return c.json({ success: true, data: null });
  }
}
