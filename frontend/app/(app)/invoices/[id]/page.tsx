'use client';

import { use, useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  Edit, Download, Share2, Send, RefreshCw, XCircle, Loader2, ArrowLeft, CheckCircle2, AlertCircle,
} from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import { InvoiceStatusBadge } from '@/components/invoices/invoice-status-badge';
import { ConfirmDialog } from '@/components/shared/confirm-dialog';
import { api } from '@/lib/api';
import { formatCurrency, formatDate, formatDatetime } from '@/lib/utils';
import type { ApiResponse, Invoice } from '@/types/api';

function DetailRow({ label, value }: { label: string; value?: string | null }) {
  return (
    <div className="grid grid-cols-2 gap-2 py-1.5">
      <dt className="text-xs text-zinc-500">{label}</dt>
      <dd className="text-sm text-zinc-900 font-medium truncate">{value || '—'}</dd>
    </div>
  );
}

export default function InvoiceDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const router = useRouter();
  const qc = useQueryClient();
  const [submitDialogOpen, setSubmitDialogOpen] = useState(false);
  const [cancelDialogOpen, setCancelDialogOpen] = useState(false);
  const [isPolling, setIsPolling] = useState(false);

  const { data: invoice, isLoading } = useQuery({
    queryKey: ['invoice', id],
    queryFn: async () => {
      const res = await api.get(`api/invoices/${id}`);
      const json: ApiResponse<Invoice> = await res.json();
      return json.data!;
    },
    refetchInterval: (q) =>
      q.state.data?.status === 'OCR_PROCESSING' || q.state.data?.status === 'SUBMITTED' ? 5000 : false,
  });

  const submitMutation = useMutation({
    mutationFn: async () => { await api.post(`api/lhdn/invoices/${id}/submit`); },
    onSuccess: () => {
      toast.success('Submitted to LHDN. Polling for result…');
      setSubmitDialogOpen(false);
      setIsPolling(true);
      qc.invalidateQueries({ queryKey: ['invoice', id] });
    },
    onError: () => toast.error('Submission failed'),
  });

  const cancelMutation = useMutation({
    mutationFn: async () => { await api.post(`api/lhdn/invoices/${id}/cancel`, { json: { reason: 'Cancelled by user' } }); },
    onSuccess: () => {
      toast.success('Invoice cancelled');
      setCancelDialogOpen(false);
      qc.invalidateQueries({ queryKey: ['invoice', id] });
    },
    onError: () => toast.error('Cancellation failed'),
  });

  const shareMutation = useMutation({
    mutationFn: async () => {
      const res = await api.post(`api/invoices/${id}/share-receipt`);
      const json: ApiResponse<{ token: string }> = await res.json();
      return json.data!.token;
    },
    onSuccess: (token) => {
      const url = `${process.env.NEXT_PUBLIC_APP_URL}/portal/receipt/${token}`;
      navigator.clipboard.writeText(url).then(() => toast.success('Receipt link copied to clipboard!'));
    },
    onError: () => toast.error('Failed to generate share link'),
  });

  const downloadPdf = async () => {
    try {
      await api.post(`api/pdf/invoices/${id}/generate`);
      const res = await api.get(`api/pdf/invoices/${id}/download`);
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `invoice-${invoice?.invoiceNumber ?? id}.pdf`;
      a.click();
      URL.revokeObjectURL(url);
    } catch {
      toast.error('Failed to download PDF');
    }
  };

  if (isLoading) {
    return <div className="space-y-4"><Skeleton className="h-8 w-64" /><Skeleton className="h-64 w-full" /></div>;
  }
  if (!invoice) return <div className="text-zinc-500">Invoice not found.</div>;

  const canEdit = ['DRAFT', 'REVIEW_REQUIRED'].includes(invoice.status);
  const canSubmit = invoice.status === 'READY_FOR_SUBMISSION';
  const canCancel = ['SUBMITTED', 'VALIDATED'].includes(invoice.status);
  const isValidated = invoice.status === 'VALIDATED';
  const isRejected = invoice.status === 'REJECTED';

  return (
    <div className="space-y-6 max-w-4xl">
      {/* Back + Header */}
      <div>
        <Link href="/invoices" className="flex items-center gap-1.5 text-sm text-zinc-500 hover:text-zinc-900 mb-4">
          <ArrowLeft className="h-3.5 w-3.5" />Back to Invoices
        </Link>
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-semibold text-zinc-900">
              {invoice.invoiceNumber ?? 'Untitled Invoice'}
            </h1>
            <InvoiceStatusBadge status={invoice.status} />
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            {canEdit && (
              <Button asChild variant="outline" size="sm">
                <Link href={`/invoices/${id}/edit`}><Edit className="mr-1.5 h-3.5 w-3.5" />Edit & Approve</Link>
              </Button>
            )}
            {canSubmit && (
              <Button size="sm" className="bg-zinc-900 hover:bg-zinc-700 text-white" onClick={() => setSubmitDialogOpen(true)}>
                <Send className="mr-1.5 h-3.5 w-3.5" />Submit to LHDN
              </Button>
            )}
            {isValidated && (
              <>
                <Button variant="outline" size="sm" onClick={downloadPdf}>
                  <Download className="mr-1.5 h-3.5 w-3.5" />Download PDF
                </Button>
                <Button variant="outline" size="sm" onClick={() => shareMutation.mutate()} disabled={shareMutation.isPending}>
                  {shareMutation.isPending ? <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" /> : <Share2 className="mr-1.5 h-3.5 w-3.5" />}
                  Share Receipt
                </Button>
              </>
            )}
            {invoice.status === 'SUBMITTED' && (
              <Button variant="outline" size="sm" onClick={() => qc.invalidateQueries({ queryKey: ['invoice', id] })} disabled={isPolling}>
                <RefreshCw className={`mr-1.5 h-3.5 w-3.5 ${isPolling ? 'animate-spin' : ''}`} />Check Status
              </Button>
            )}
            {canCancel && (
              <Button variant="outline" size="sm" className="text-red-600 border-red-200 hover:bg-red-50" onClick={() => setCancelDialogOpen(true)}>
                <XCircle className="mr-1.5 h-3.5 w-3.5" />Cancel
              </Button>
            )}
          </div>
        </div>

        {/* LHDN validation info */}
        {(isValidated || isRejected) && (
          <div className={`mt-3 flex items-center gap-2 rounded-lg px-4 py-2.5 text-sm ${isValidated ? 'bg-emerald-50 text-emerald-700' : 'bg-red-50 text-red-700'}`}>
            {isValidated ? <CheckCircle2 className="h-4 w-4" /> : <AlertCircle className="h-4 w-4" />}
            <span>LHDN UUID: <span className="font-mono font-medium">{invoice.lhdnUuid ?? '—'}</span></span>
            {invoice.lhdnValidatedAt && <span className="ml-auto text-xs opacity-70">{formatDatetime(invoice.lhdnValidatedAt)}</span>}
            {isRejected && invoice.lhdnRejectionReason && (
              <span className="ml-2">Reason: {invoice.lhdnRejectionReason}</span>
            )}
          </div>
        )}
      </div>

      {/* Two-column detail */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {/* Left: Supplier + Buyer + Metadata */}
        <div className="space-y-4">
          <Card className="border-zinc-200 shadow-sm">
            <CardHeader className="pb-2"><CardTitle className="text-sm font-semibold text-zinc-500 uppercase tracking-wide">Supplier</CardTitle></CardHeader>
            <CardContent>
              <dl>
                <DetailRow label="Name" value={invoice.supplierName} />
                <DetailRow label="TIN" value={invoice.supplierTin} />
                <DetailRow label="Registration No." value={invoice.supplierRegistration} />
              </dl>
            </CardContent>
          </Card>

          <Card className="border-zinc-200 shadow-sm">
            <CardHeader className="pb-2"><CardTitle className="text-sm font-semibold text-zinc-500 uppercase tracking-wide">Buyer</CardTitle></CardHeader>
            <CardContent>
              <dl>
                <DetailRow label="Name" value={invoice.buyerName} />
                <DetailRow label="TIN" value={invoice.buyerTin} />
                <DetailRow label="Registration No." value={invoice.buyerRegistrationNumber} />
                <DetailRow label="Email" value={invoice.buyerEmail} />
                <DetailRow label="Phone" value={invoice.buyerPhone} />
                <DetailRow label="Address" value={[invoice.buyerAddressLine1, invoice.buyerCity, invoice.buyerState, invoice.buyerPostcode].filter(Boolean).join(', ')} />
              </dl>
            </CardContent>
          </Card>

          <Card className="border-zinc-200 shadow-sm">
            <CardHeader className="pb-2"><CardTitle className="text-sm font-semibold text-zinc-500 uppercase tracking-wide">Invoice Details</CardTitle></CardHeader>
            <CardContent>
              <dl>
                <DetailRow label="Invoice No." value={invoice.invoiceNumber} />
                <DetailRow label="Issue Date" value={invoice.issueDate ? formatDate(invoice.issueDate) : undefined} />
                <DetailRow label="Due Date" value={invoice.dueDate ? formatDate(invoice.dueDate) : undefined} />
                <DetailRow label="Currency" value={invoice.currencyCode} />
                {invoice.notes && <DetailRow label="Notes" value={invoice.notes} />}
              </dl>
            </CardContent>
          </Card>
        </div>

        {/* Right: Line items + totals */}
        <div className="space-y-4">
          <Card className="border-zinc-200 shadow-sm">
            <CardHeader className="pb-2"><CardTitle className="text-sm font-semibold text-zinc-500 uppercase tracking-wide">Line Items</CardTitle></CardHeader>
            <CardContent className="p-0">
              {invoice.items?.length ? (
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-zinc-100 bg-zinc-50/50">
                      <th className="text-left px-4 py-2 font-medium text-zinc-500">Description</th>
                      <th className="text-right px-4 py-2 font-medium text-zinc-500">Qty</th>
                      <th className="text-right px-4 py-2 font-medium text-zinc-500">Price</th>
                      <th className="text-right px-4 py-2 font-medium text-zinc-500">Total</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-zinc-100">
                    {invoice.items.map((item) => (
                      <tr key={item.id}>
                        <td className="px-4 py-2 text-zinc-700">{item.description}</td>
                        <td className="px-4 py-2 text-right text-zinc-600">{item.quantity}</td>
                        <td className="px-4 py-2 text-right text-zinc-600">{formatCurrency(item.unitPrice)}</td>
                        <td className="px-4 py-2 text-right font-medium text-zinc-900">{formatCurrency(item.total)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              ) : (
                <p className="px-4 py-6 text-sm text-zinc-400 text-center">No line items</p>
              )}
            </CardContent>
          </Card>

          <Card className="border-zinc-200 shadow-sm">
            <CardContent className="pt-4 space-y-2">
              <div className="flex justify-between text-sm text-zinc-600">
                <span>Subtotal</span><span>{formatCurrency(invoice.subtotal ?? '0')}</span>
              </div>
              <div className="flex justify-between text-sm text-zinc-600">
                <span>Tax</span><span>{formatCurrency(invoice.taxTotal ?? '0')}</span>
              </div>
              <Separator />
              <div className="flex justify-between font-semibold text-zinc-900">
                <span>Grand Total</span><span>{formatCurrency(invoice.grandTotal ?? '0')}</span>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      <ConfirmDialog
        open={submitDialogOpen}
        onOpenChange={setSubmitDialogOpen}
        title="Submit to LHDN MyInvois"
        description={`This will submit invoice ${invoice.invoiceNumber ?? ''} to LHDN MyInvois. This action cannot be undone.`}
        confirmLabel="Submit"
        onConfirm={() => submitMutation.mutate()}
      />
      <ConfirmDialog
        open={cancelDialogOpen}
        onOpenChange={setCancelDialogOpen}
        title="Cancel Invoice"
        description="This will cancel the invoice in LHDN MyInvois. This action cannot be undone."
        confirmLabel="Cancel Invoice"
        destructive
        onConfirm={() => cancelMutation.mutate()}
      />
    </div>
  );
}
