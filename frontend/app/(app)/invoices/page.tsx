'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import Link from 'next/link';
import { Plus, Package, Trash2, Edit, Eye, Send, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { PageHeader } from '@/components/shared/page-header';
import { EmptyState } from '@/components/shared/empty-state';
import { InvoiceStatusBadge, INVOICE_TYPE_LABELS } from '@/components/invoices/invoice-status-badge';
import { ConfirmDialog } from '@/components/shared/confirm-dialog';
import { api } from '@/lib/api';
import { formatCurrency, formatDate } from '@/lib/utils';
import type { ApiResponse, Invoice, InvoiceStatus } from '@/types/api';

const STATUSES: InvoiceStatus[] = [
  'DRAFT', 'OCR_PROCESSING', 'REVIEW_REQUIRED', 'READY_FOR_SUBMISSION',
  'SUBMITTED', 'VALIDATED', 'REJECTED', 'CANCELLED',
];

export default function InvoicesPage() {
  const qc = useQueryClient();
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState<string>('');
  const [page, setPage] = useState(1);
  const [deleteId, setDeleteId] = useState<string | null>(null);

  const params = new URLSearchParams({ limit: '20', page: String(page) });
  if (status) params.set('status', status);
  if (search) params.set('search', search);

  const { data, isLoading } = useQuery({
    queryKey: ['invoices', status, search, page],
    queryFn: async () => {
      const res = await api.get(`api/invoices?${params}`);
      const json: ApiResponse<{ invoices: Invoice[]; pagination: { page: number; limit: number; total: number; totalPages: number } }> = await res.json();
      return { invoices: json.data?.invoices ?? [], meta: json.data?.pagination };
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      await api.delete(`api/invoices/${id}`);
    },
    onSuccess: () => {
      toast.success('Invoice deleted');
      qc.invalidateQueries({ queryKey: ['invoices'] });
      setDeleteId(null);
    },
    onError: () => toast.error('Failed to delete invoice'),
  });

  const submitMutation = useMutation({
    mutationFn: async (id: string) => {
      await api.post(`api/lhdn/invoices/${id}/submit`);
    },
    onSuccess: () => {
      toast.success('Invoice submitted to LHDN');
      qc.invalidateQueries({ queryKey: ['invoices'] });
    },
    onError: () => toast.error('Failed to submit invoice'),
  });

  return (
    <div>
      <PageHeader title="Invoices">
        <Button asChild variant="outline" size="sm">
          <Link href="/bulk-import"><Package className="mr-2 h-4 w-4" />Import CSV</Link>
        </Button>
        <Button asChild size="sm" className="bg-zinc-900 hover:bg-zinc-700 text-white">
          <Link href="/invoices/new"><Plus className="mr-2 h-4 w-4" />New Invoice</Link>
        </Button>
      </PageHeader>

      {/* Filters */}
      <div className="mb-4 flex gap-3 flex-wrap">
        <Input
          placeholder="Search by invoice # or buyer..."
          value={search}
          onChange={(e) => { setSearch(e.target.value); setPage(1); }}
          className="w-64 bg-white"
        />
        <Select value={status || 'all'} onValueChange={(v) => { setStatus(v === 'all' ? '' : v); setPage(1); }}>
          <SelectTrigger className="w-48 bg-white">
            <SelectValue placeholder="All statuses" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All statuses</SelectItem>
            {STATUSES.map((s) => <SelectItem key={s} value={s}>{s.replace(/_/g, ' ')}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>

      {isLoading ? (
        <Card className="border-zinc-200">
          <CardContent className="p-0">
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="px-6 py-4 border-b border-zinc-100 last:border-0">
                <Skeleton className="h-5 w-full" />
              </div>
            ))}
          </CardContent>
        </Card>
      ) : !data?.invoices.length ? (
        <EmptyState
          icon={<FileText className="h-5 w-5" />}
          title="No invoices found"
          description={search || status ? 'Try adjusting your filters.' : 'Create your first invoice to get started.'}
          action={!search && !status ? { label: 'Create Invoice', href: '/invoices/new' } : undefined}
        />
      ) : (
        <Card className="border-zinc-200 shadow-sm overflow-hidden">
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-zinc-100 bg-zinc-50/50">
                    <th className="text-left px-6 py-3 font-medium text-zinc-500 whitespace-nowrap">Invoice #</th>
                    <th className="text-left px-4 py-3 font-medium text-zinc-500 whitespace-nowrap">Type</th>
                    <th className="text-left px-4 py-3 font-medium text-zinc-500 whitespace-nowrap">Buyer</th>
                    <th className="text-right px-4 py-3 font-medium text-zinc-500 whitespace-nowrap">Amount</th>
                    <th className="text-left px-4 py-3 font-medium text-zinc-500 whitespace-nowrap">Status</th>
                    <th className="text-left px-4 py-3 font-medium text-zinc-500 whitespace-nowrap">Date</th>
                    <th className="text-right px-6 py-3 font-medium text-zinc-500 whitespace-nowrap">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-100">
                  {data.invoices.map((inv) => {
                    const canEdit = ['DRAFT', 'REVIEW_REQUIRED'].includes(inv.status);
                    const canDelete = ['DRAFT', 'REVIEW_REQUIRED'].includes(inv.status);
                    const canSubmit = inv.status === 'READY_FOR_SUBMISSION';
                    return (
                      <tr key={inv.id} className="hover:bg-zinc-50/50 transition-colors">
                        <td className="px-6 py-3 font-medium text-zinc-900 whitespace-nowrap">
                          {inv.invoiceNumber ?? <span className="text-zinc-400 italic">Draft</span>}
                        </td>
                        <td className="px-4 py-3">
                          <Badge variant="outline" className="text-xs font-normal">
                            {INVOICE_TYPE_LABELS[inv.invoiceType] ?? inv.invoiceType}
                          </Badge>
                        </td>
                        <td className="px-4 py-3 text-zinc-600 max-w-[200px] truncate">{inv.buyerName ?? '—'}</td>
                        <td className="px-4 py-3 text-right font-medium text-zinc-900 whitespace-nowrap">
                          {formatCurrency(inv.grandTotal ?? '0')}
                        </td>
                        <td className="px-4 py-3"><InvoiceStatusBadge status={inv.status} /></td>
                        <td className="px-4 py-3 text-zinc-500 whitespace-nowrap">
                          {inv.issueDate ? formatDate(inv.issueDate) : '—'}
                        </td>
                        <td className="px-6 py-3">
                          <div className="flex items-center justify-end gap-1">
                            <Button asChild variant="ghost" size="icon" className="h-7 w-7 text-zinc-400 hover:text-zinc-900">
                              <Link href={`/invoices/${inv.id}`}><Eye className="h-3.5 w-3.5" /></Link>
                            </Button>
                            {canEdit && (
                              <Button asChild variant="ghost" size="icon" className="h-7 w-7 text-zinc-400 hover:text-zinc-900">
                                <Link href={`/invoices/${inv.id}/edit`}><Edit className="h-3.5 w-3.5" /></Link>
                              </Button>
                            )}
                            {canSubmit && (
                              <Button
                                variant="ghost" size="icon"
                                className="h-7 w-7 text-emerald-500 hover:text-emerald-700"
                                onClick={() => submitMutation.mutate(inv.id)}
                                disabled={submitMutation.isPending}
                              >
                                {submitMutation.isPending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Send className="h-3.5 w-3.5" />}
                              </Button>
                            )}
                            {canDelete && (
                              <Button
                                variant="ghost" size="icon"
                                className="h-7 w-7 text-zinc-400 hover:text-red-600"
                                onClick={() => setDeleteId(inv.id)}
                              >
                                <Trash2 className="h-3.5 w-3.5" />
                              </Button>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Pagination */}
      {data && data.meta && (data.meta.total ?? 0) > 20 && (
        <div className="mt-4 flex items-center justify-between text-sm text-zinc-500">
          <p>Page {page} of {data.meta.totalPages ?? 1}</p>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" disabled={page === 1} onClick={() => setPage(p => p - 1)}>Previous</Button>
            <Button variant="outline" size="sm" disabled={page >= (data.meta?.totalPages ?? 1)} onClick={() => setPage(p => p + 1)}>Next</Button>
          </div>
        </div>
      )}

      <ConfirmDialog
        open={!!deleteId}
        onOpenChange={(o) => !o && setDeleteId(null)}
        title="Delete Invoice"
        description="Are you sure you want to delete this invoice? This action cannot be undone."
        confirmLabel="Delete"
        destructive
        onConfirm={() => deleteId && deleteMutation.mutate(deleteId)}
      />
    </div>
  );
}

function FileText(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg {...props} xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
    </svg>
  );
}
