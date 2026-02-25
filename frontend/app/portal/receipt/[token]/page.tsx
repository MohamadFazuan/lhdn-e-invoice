import { FileText, CheckCircle2, Download } from 'lucide-react';
import type { ApiResponse, PortalReceipt } from '@/types/api';
import { formatCurrency, formatDate } from '@/lib/utils';
import { Separator } from '@/components/ui/separator';

async function getReceipt(token: string): Promise<PortalReceipt | null> {
  try {
    const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/portal/receipt/${token}`, { cache: 'no-store' });
    const json: ApiResponse<PortalReceipt> = await res.json();
    return json.data ?? null;
  } catch {
    return null;
  }
}

export default async function PortalReceiptPage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const data = await getReceipt(token);

  if (!data) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-zinc-50">
        <div className="text-center">
          <p className="text-lg font-semibold text-zinc-900">Receipt not found</p>
          <p className="text-sm text-zinc-500 mt-1">This link may have expired or been revoked.</p>
        </div>
      </div>
    );
  }

  const { invoice, items, business } = data;
  const pdfUrl = `${process.env.NEXT_PUBLIC_API_URL}/api/portal/receipt/${token}/pdf`;

  return (
    <div className="min-h-screen bg-zinc-50 py-10 px-4">
      <div className="max-w-2xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-zinc-900">
              <FileText className="h-4 w-4 text-white" />
            </div>
            <span className="font-semibold text-zinc-900">e-Invoice</span>
          </div>
          <p className="text-xs text-zinc-400">Powered by LHDN e-Invoice</p>
        </div>

        {/* LHDN validation badge */}
        {invoice.lhdnUuid && (
          <div className="flex items-center gap-2 rounded-lg bg-emerald-50 border border-emerald-200 px-4 py-3 mb-6 text-sm text-emerald-700">
            <CheckCircle2 className="h-4 w-4 shrink-0" />
            <div>
              <p className="font-semibold">LHDN Validated</p>
              <p className="font-mono text-xs opacity-80">{invoice.lhdnUuid}</p>
            </div>
            {invoice.lhdnValidatedAt && (
              <span className="ml-auto text-xs opacity-70">{formatDate(invoice.lhdnValidatedAt)}</span>
            )}
          </div>
        )}

        {/* Invoice card */}
        <div className="rounded-xl border border-zinc-200 bg-white p-8 shadow-sm space-y-6">
          {/* Meta */}
          <div className="flex justify-between items-start">
            <div>
              <h1 className="text-xl font-semibold text-zinc-900">{invoice.invoiceNumber ?? 'Invoice'}</h1>
              <p className="text-sm text-zinc-500 mt-0.5">Issue Date: {invoice.issueDate ? formatDate(invoice.issueDate) : '—'}</p>
            </div>
            <div className="text-right">
              <p className="text-2xl font-bold text-zinc-900">{formatCurrency(invoice.grandTotal ?? '0')}</p>
              <p className="text-xs text-zinc-400">{invoice.currencyCode}</p>
            </div>
          </div>

          <Separator />

          {/* Parties */}
          <div className="grid grid-cols-2 gap-6 text-sm">
            <div>
              <p className="text-xs font-semibold text-zinc-500 uppercase tracking-wide mb-2">Supplier</p>
              <p className="font-medium text-zinc-900">{invoice.supplierName ?? business.name}</p>
              <p className="text-zinc-500">{invoice.supplierTin ?? business.tin}</p>
              <p className="text-zinc-500">{business.address}</p>
            </div>
            <div>
              <p className="text-xs font-semibold text-zinc-500 uppercase tracking-wide mb-2">Bill To</p>
              <p className="font-medium text-zinc-900">{invoice.buyerName ?? '—'}</p>
              <p className="text-zinc-500">{invoice.buyerTin}</p>
              <p className="text-zinc-500">{invoice.buyerEmail}</p>
            </div>
          </div>

          <Separator />

          {/* Line items */}
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-zinc-100">
                <th className="text-left py-2 font-medium text-zinc-500">Description</th>
                <th className="text-right py-2 font-medium text-zinc-500">Qty</th>
                <th className="text-right py-2 font-medium text-zinc-500">Price</th>
                <th className="text-right py-2 font-medium text-zinc-500">Total</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-50">
              {items.map((item) => (
                <tr key={item.id}>
                  <td className="py-2 text-zinc-700">{item.description}</td>
                  <td className="py-2 text-right text-zinc-500">{item.quantity}</td>
                  <td className="py-2 text-right text-zinc-500">{formatCurrency(item.unitPrice)}</td>
                  <td className="py-2 text-right font-medium text-zinc-900">{formatCurrency(item.total)}</td>
                </tr>
              ))}
            </tbody>
          </table>

          <Separator />

          {/* Totals */}
          <div className="space-y-1.5 max-w-xs ml-auto">
            <div className="flex justify-between text-sm text-zinc-600"><span>Subtotal</span><span>{formatCurrency(invoice.subtotal ?? '0')}</span></div>
            <div className="flex justify-between text-sm text-zinc-600"><span>Tax</span><span>{formatCurrency(invoice.taxTotal ?? '0')}</span></div>
            <Separator />
            <div className="flex justify-between font-semibold text-zinc-900"><span>Grand Total</span><span>{formatCurrency(invoice.grandTotal ?? '0')}</span></div>
          </div>
        </div>

        {/* Actions */}
        <div className="mt-6 flex gap-3">
          <a
            href={pdfUrl}
            download
            className="flex items-center gap-2 rounded-lg border border-zinc-200 bg-white px-4 py-2.5 text-sm font-medium text-zinc-700 hover:bg-zinc-50 shadow-sm"
          >
            <Download className="h-4 w-4" />Download PDF
          </a>
        </div>

        {/* Tax relief callout */}
        <div className="mt-6 rounded-lg bg-blue-50 border border-blue-200 p-4 text-sm text-blue-700">
          <p className="font-semibold mb-1">Save for personal tax relief</p>
          <p className="text-xs text-blue-600">
            This e-invoice is LHDN-validated and can be used as proof of purchase for claiming personal income tax relief.
            Keep a copy of this receipt for your records when filing taxes.
          </p>
        </div>

        <p className="mt-8 text-center text-xs text-zinc-400">Powered by LHDN e-Invoice platform</p>
      </div>
    </div>
  );
}
