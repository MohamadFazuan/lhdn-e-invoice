'use client';

import { useQuery } from '@tanstack/react-query';
import Link from 'next/link';
import { Upload, Plus, Package, FileText, CheckCircle2, Clock, TrendingUp } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { PageHeader } from '@/components/shared/page-header';
import { InvoiceStatusBadge } from '@/components/invoices/invoice-status-badge';
import { api } from '@/lib/api';
import { formatCurrency, formatDate } from '@/lib/utils';
import { useAuthStore } from '@/stores/auth';
import type { AnalyticsSummary, ApiResponse, Invoice, RevenueDataPoint } from '@/types/api';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { format, subMonths } from 'date-fns';

function KpiCard({ title, value, icon, sub }: { title: string; value: string | number; icon: React.ReactNode; sub?: string }) {
  return (
    <Card className="border-zinc-200 shadow-sm">
      <CardContent className="p-6">
        <div className="flex items-center justify-between mb-3">
          <p className="text-sm font-medium text-zinc-500">{title}</p>
          <div className="text-zinc-400">{icon}</div>
        </div>
        <p className="text-2xl font-semibold text-zinc-900">{value}</p>
        {sub && <p className="mt-1 text-xs text-zinc-500">{sub}</p>}
      </CardContent>
    </Card>
  );
}

export default function DashboardPage() {
  const { business } = useAuthStore();

  const { data: summary, isLoading: summaryLoading } = useQuery({
    queryKey: ['analytics', 'summary'],
    queryFn: async () => {
      const res = await api.get('api/analytics/summary');
      const json: ApiResponse<AnalyticsSummary> = await res.json();
      return json.data!;
    },
  });

  const from = format(subMonths(new Date(), 6), 'yyyy-MM-dd');
  const { data: revenue, isLoading: revenueLoading } = useQuery({
    queryKey: ['analytics', 'revenue', from],
    queryFn: async () => {
      const res = await api.get(`api/analytics/revenue?granularity=month&from=${from}`);
      const json: ApiResponse<RevenueDataPoint[]> = await res.json();
      return json.data ?? [];
    },
  });

  const { data: recentInvoices } = useQuery({
    queryKey: ['invoices', 'recent'],
    queryFn: async () => {
      const res = await api.get('api/invoices?limit=5&page=1');
      const json: ApiResponse<Invoice[]> = await res.json();
      return json.data ?? [];
    },
  });

  return (
    <div className="space-y-6">
      <PageHeader
        title={`Welcome back${business ? ', ' + business.name.split(' ')[0] : ''}`}
        description="Here's what's happening with your invoices"
      />

      {/* KPI cards */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {summaryLoading ? (
          Array.from({ length: 4 }).map((_, i) => (
            <Card key={i} className="border-zinc-200"><CardContent className="p-6"><Skeleton className="h-16" /></CardContent></Card>
          ))
        ) : (
          <>
            <KpiCard title="Total Invoices" value={summary?.totalInvoices ?? 0} icon={<FileText className="h-4 w-4" />} />
            <KpiCard title="Validated" value={summary?.validated ?? 0} icon={<CheckCircle2 className="h-4 w-4 text-emerald-500" />} sub="LHDN approved" />
            <KpiCard title="Pending Review" value={summary?.pendingReview ?? 0} icon={<Clock className="h-4 w-4 text-amber-500" />} sub="Needs attention" />
            <KpiCard title="Revenue This Month" value={formatCurrency(summary?.revenueThisMonth ?? '0')} icon={<TrendingUp className="h-4 w-4 text-blue-500" />} />
          </>
        )}
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        {/* Revenue chart */}
        <Card className="lg:col-span-2 border-zinc-200 shadow-sm">
          <CardHeader>
            <CardTitle className="text-base font-medium">Revenue (Last 6 Months)</CardTitle>
          </CardHeader>
          <CardContent>
            {revenueLoading ? (
              <Skeleton className="h-48 w-full" />
            ) : (
              <ResponsiveContainer width="100%" height={200}>
                <AreaChart data={revenue} margin={{ top: 0, right: 0, left: -20, bottom: 0 }}>
                  <defs>
                    <linearGradient id="revenueGradient" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#18181b" stopOpacity={0.1} />
                      <stop offset="95%" stopColor="#18181b" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f4f4f5" />
                  <XAxis dataKey="period" tick={{ fontSize: 11, fill: '#a1a1aa' }} />
                  <YAxis tick={{ fontSize: 11, fill: '#a1a1aa' }} tickFormatter={(v) => `RM${(v / 1000).toFixed(0)}k`} />
                  <Tooltip formatter={(v) => [formatCurrency(Number(v ?? 0)), 'Revenue']} labelStyle={{ color: '#18181b' }} />
                  <Area type="monotone" dataKey="revenue" stroke="#18181b" strokeWidth={2} fill="url(#revenueGradient)" />
                </AreaChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>

        {/* Quick actions */}
        <Card className="border-zinc-200 shadow-sm">
          <CardHeader>
            <CardTitle className="text-base font-medium">Quick Actions</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            <Button asChild variant="outline" className="w-full justify-start gap-3 h-10">
              <Link href="/upload"><Upload className="h-4 w-4" />Upload Document</Link>
            </Button>
            <Button asChild className="w-full justify-start gap-3 h-10 bg-zinc-900 hover:bg-zinc-700 text-white">
              <Link href="/invoices/new"><Plus className="h-4 w-4" />Create Invoice</Link>
            </Button>
            <Button asChild variant="outline" className="w-full justify-start gap-3 h-10">
              <Link href="/bulk-import"><Package className="h-4 w-4" />Import CSV</Link>
            </Button>
          </CardContent>
        </Card>
      </div>

      {/* Recent invoices */}
      <Card className="border-zinc-200 shadow-sm">
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="text-base font-medium">Recent Invoices</CardTitle>
          <Link href="/invoices" className="text-xs text-zinc-500 hover:text-zinc-900">View all</Link>
        </CardHeader>
        <CardContent>
          {!recentInvoices?.length ? (
            <div className="text-center py-8 text-sm text-zinc-500">No invoices yet. <Link href="/invoices/new" className="text-zinc-900 font-medium hover:underline">Create one</Link></div>
          ) : (
            <div className="divide-y divide-zinc-100">
              {recentInvoices.map((inv) => (
                <div key={inv.id} className="flex items-center justify-between py-3">
                  <div className="flex items-center gap-3">
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-zinc-900">{inv.invoiceNumber ?? '—'}</p>
                      <p className="text-xs text-zinc-500 truncate">{inv.buyerName ?? 'Unknown buyer'}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-4 shrink-0">
                    <InvoiceStatusBadge status={inv.status} />
                    <p className="text-sm font-medium text-zinc-900 w-24 text-right">{formatCurrency(inv.grandTotal ?? '0')}</p>
                    <p className="text-xs text-zinc-400 w-20 text-right">{inv.issueDate ? formatDate(inv.issueDate) : '—'}</p>
                    <Button asChild variant="ghost" size="sm" className="text-xs text-zinc-500 h-7">
                      <Link href={`/invoices/${inv.id}`}>View</Link>
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
