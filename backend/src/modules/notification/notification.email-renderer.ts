import type { NotificationEvent } from '../../db/schema/notification-logs.js';

export interface EmailContent {
  subject: string;
  htmlBody: string;
}

export interface EmailContext {
  invoiceNumber?: string;
  invoiceId?: string;
  businessName?: string;
  buyerName?: string;
  inviteUrl?: string;
  rejectionReason?: string;
  appUrl: string;
}

export function renderEmail(event: NotificationEvent, ctx: EmailContext): EmailContent {
  switch (event) {
    case 'INVOICE_SUBMITTED':
      return {
        subject: `Invoice ${ctx.invoiceNumber ?? ''} submitted to LHDN`,
        htmlBody: `<p>Your invoice <strong>${ctx.invoiceNumber ?? ctx.invoiceId}</strong> has been submitted to LHDN MyInvois and is pending validation.</p>
<p><a href="${ctx.appUrl}/invoices/${ctx.invoiceId}">View invoice</a></p>`,
      };

    case 'INVOICE_VALIDATED':
      return {
        subject: `Invoice ${ctx.invoiceNumber ?? ''} validated by LHDN`,
        htmlBody: `<p>Your invoice <strong>${ctx.invoiceNumber ?? ctx.invoiceId}</strong> has been validated by LHDN MyInvois.</p>
<p><a href="${ctx.appUrl}/invoices/${ctx.invoiceId}">View invoice</a></p>`,
      };

    case 'INVOICE_REJECTED':
      return {
        subject: `Invoice ${ctx.invoiceNumber ?? ''} rejected by LHDN`,
        htmlBody: `<p>Your invoice <strong>${ctx.invoiceNumber ?? ctx.invoiceId}</strong> was rejected by LHDN MyInvois.</p>
${ctx.rejectionReason ? `<p>Reason: ${ctx.rejectionReason}</p>` : ''}
<p><a href="${ctx.appUrl}/invoices/${ctx.invoiceId}">Review and resubmit</a></p>`,
      };

    case 'INVOICE_CANCELLED':
      return {
        subject: `Invoice ${ctx.invoiceNumber ?? ''} cancelled`,
        htmlBody: `<p>Invoice <strong>${ctx.invoiceNumber ?? ctx.invoiceId}</strong> has been cancelled.</p>
<p><a href="${ctx.appUrl}/invoices/${ctx.invoiceId}">View invoice</a></p>`,
      };

    case 'TEAM_INVITE':
      return {
        subject: `You have been invited to join ${ctx.businessName ?? 'a business'} on LHDN e-Invoice`,
        htmlBody: `<p>You have been invited to join <strong>${ctx.businessName ?? 'a business'}</strong> on LHDN e-Invoice.</p>
<p><a href="${ctx.inviteUrl}">Accept invitation</a></p>
<p>This invitation expires in 7 days.</p>`,
      };

    case 'BUYER_RECEIPT':
      return {
        subject: `Your e-receipt from ${ctx.businessName ?? 'a business'}`,
        htmlBody: `<p>An e-receipt has been issued to you by <strong>${ctx.businessName ?? 'a business'}</strong>.</p>
<p><a href="${ctx.inviteUrl}">View your e-receipt</a></p>
<p>You can use this receipt for your LHDN tax relief claims.</p>`,
      };
  }
}
