import { PDFDocument, rgb, StandardFonts } from 'pdf-lib';
import type { Invoice, InvoiceItem } from '../../db/schema/index.js';

function safeText(value: string | null | undefined): string {
  return value ?? '';
}

/**
 * Generates an A4 invoice PDF using pdf-lib.
 * Returns raw PDF bytes (Uint8Array).
 */
export async function generateInvoicePdf(
  invoice: Invoice,
  items: InvoiceItem[],
): Promise<Uint8Array> {
  const doc = await PDFDocument.create();
  const page = doc.addPage([595.28, 841.89]); // A4 in points
  const { width, height } = page.getSize();
  const font = await doc.embedFont(StandardFonts.Helvetica);
  const boldFont = await doc.embedFont(StandardFonts.HelveticaBold);

  const margin = 50;
  let y = height - margin;

  const draw = (text: string, x: number, fontSize: number, bold = false, color = rgb(0, 0, 0)) => {
    page.drawText(text, { x, y, size: fontSize, font: bold ? boldFont : font, color });
  };

  const line = (x1: number, y1: number, x2: number, y2: number) => {
    page.drawLine({ start: { x: x1, y: y1 }, end: { x: x2, y: y2 }, thickness: 0.5, color: rgb(0.7, 0.7, 0.7) });
  };

  // Header
  draw('TAX INVOICE', margin, 22, true);
  y -= 30;

  draw(`Invoice #: ${safeText(invoice.invoiceNumber)}`, margin, 10);
  draw(`Date: ${safeText(invoice.issueDate)}`, margin + 300, 10);
  y -= 20;
  draw(`Status: ${invoice.status}`, margin, 9, false, rgb(0.4, 0.4, 0.4));
  y -= 30;

  line(margin, y, width - margin, y);
  y -= 15;

  // Supplier / Buyer columns
  draw('FROM', margin, 10, true);
  draw('TO', margin + 300, 10, true);
  y -= 15;

  draw(safeText(invoice.supplierName), margin, 10, true);
  draw(safeText(invoice.buyerName), margin + 300, 10, true);
  y -= 12;
  draw(`TIN: ${safeText(invoice.supplierTin)}`, margin, 9);
  draw(`TIN: ${safeText(invoice.buyerTin)}`, margin + 300, 9);
  y -= 12;
  draw(safeText(invoice.supplierRegistration), margin, 9);
  draw(safeText(invoice.buyerRegistrationNumber), margin + 300, 9);
  y -= 30;

  // Line items header
  line(margin, y, width - margin, y);
  y -= 15;
  draw('Description', margin, 9, true);
  draw('Qty', margin + 260, 9, true);
  draw('Unit Price', margin + 300, 9, true);
  draw('Tax', margin + 370, 9, true);
  draw('Total', margin + 430, 9, true);
  y -= 10;
  line(margin, y, width - margin, y);
  y -= 15;

  // Line items
  for (const item of items) {
    if (y < 100) {
      // Add new page if needed (simplified — no multi-page header repeat)
      break;
    }
    const desc = item.description.slice(0, 40);
    draw(desc, margin, 8);
    draw(item.quantity, margin + 260, 8);
    draw(item.unitPrice, margin + 300, 8);
    draw(`${item.taxType} ${item.taxRate}%`, margin + 370, 8);
    draw(item.total, margin + 430, 8);
    y -= 14;
  }

  y -= 5;
  line(margin, y, width - margin, y);
  y -= 20;

  // Totals
  const totalsX = margin + 350;
  draw('Subtotal:', totalsX, 9);
  draw(`${invoice.currencyCode} ${invoice.subtotal}`, totalsX + 90, 9);
  y -= 14;
  draw('Tax Total:', totalsX, 9);
  draw(`${invoice.currencyCode} ${invoice.taxTotal}`, totalsX + 90, 9);
  y -= 14;
  draw('Grand Total:', totalsX, 10, true);
  draw(`${invoice.currencyCode} ${invoice.grandTotal}`, totalsX + 90, 10, true);
  y -= 30;

  // LHDN info (if validated)
  if (invoice.lhdnUuid) {
    line(margin, y, width - margin, y);
    y -= 15;
    draw(`LHDN UUID: ${invoice.lhdnUuid}`, margin, 8, false, rgb(0.4, 0.4, 0.4));
    y -= 12;
    if (invoice.lhdnSubmissionUid) {
      draw(`Submission UID: ${invoice.lhdnSubmissionUid}`, margin, 8, false, rgb(0.4, 0.4, 0.4));
    }
  }

  const pdfBytes = await doc.save();
  return pdfBytes;
}
