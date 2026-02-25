'use client';

import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { format, subDays } from 'date-fns';
import {
  AreaChart, Area, BarChart, Bar, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend,
} from 'recharts';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { PageHeader } from '@/components/shared/page-header';
import { api } from '@/lib/api';
import { formatCurrency } from '@/lib/utils';
import type { ApiResponse, AnalyticsSummary, RevenueDataPoint, RejectionRate, TopBuyer, InvoiceVolumeByType } from '@/types/api';

const GRANULARITIES = ['day', 'week', 'month'] as const;
const PIE_COLORS = ['#18181b', '#3f3f46', '#71717a', '#a1a1aa', '#d4d4d8', '#10b981', '#ef4444'];

const INVOICE_TYPE_NAMES: Record<string, string> = {
  '01': 'Invoice', '02': 'Credit Note', '03': 'Debit Note', '04': 'Refund Note',
};

function KpiCard({ title, value, sub }: { title: string; value: string | number; sub?: string }) {
  return (
    <Card className="border-zinc-200 shadow-sm">
      <CardContent className="p-5">
        <p className="text-xs font-medium text-zinc-500 uppercase tracking-wide mb-1">{title}</p>
        <p className="text-2xl font-semibold text-zinc-900">{value}</p>
        {sub && <p className="text-xs text-zinc-400 mt-0.5">{sub}</p>}
      </CardContent>
    </Card>
  );
}

export default function AnalyticsPage() {
  const [granularity, setGranularity] = useState<'day' | 'week' | 'month'>('month');
  const from = format(subDays(new Date(), 30), 'yyyy-MM-dd');
  const to = format(new Date(), 'yyyy-MM-dd');

  const { data: summary } = useQuery({
    queryKey: ['analytics', 'summary'],
    queryFn: async () => {
      const res = await api.get('api/analytics/summary');
      const json: ApiResponse<AnalyticsSummary> = await res.json();
      return json.data!;
    },
  });

  const { data: revenue, isLoading: revLoading } = useQuery({
    queryKey: ['analytics', 'revenue', granularity, from],
    queryFn: async () => {
      const res = await api.get(`api/analytics/revenue?from=${from}&to=${to}&granularity=${granularity}`);
      const json: ApiResponse<RevenueDataPoint[]> = await res.json();
      return json.data ?? [];
    },
  });

  const { data: rejection } = useQuery({
    queryKey: ['analytics', 'rejection', from],
    queryFn: async () => {
      const res = await api.get(`api/analytics/rejection-rate?from=${from}&to=${to}`);
      const json: ApiResponse<RejectionRate> = await res.json();
      return json.data!;
    },
  });

  const { data: topBuyers } = useQuery({
    queryKey: ['analytics', 'top-buyers'],
    queryFn: async () => {
      const res = await api.get('api/analytics/top-buyers?limit=5');
      const json: ApiResponse<TopBuyer[]> = await res.json();
      return json.data ?? [];
    },
  });

  const { data: volume } = useQuery({
    queryKey: ['analytics', 'volume'],
    queryFn: async () => {
      const res = await api.get('api/analytics/invoice-volume');
      const json: ApiResponse<InvoiceVolumeByType[]> = await res.json();
      return json.data ?? [];
    },
  });

  return (
    <div className="space-y-6">
      <PageHeader title="Analytics" description="Last 30 days" />

      {/* KPI row */}
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <KpiCard title="Total Invoices" value={summary?.totalInvoices ?? 0} />
        <KpiCard title="Total Revenue" value={formatCurrency(summary?.revenueThisMonth ?? '0')} />
        <KpiCard title="Validated" value={summary?.validated ?? 0} />
        <KpiCard title="Rejection Rate" value={`${rejection?.rate ?? '0'}%`} sub={`${rejection?.rejected ?? 0} of ${rejection?.totalSubmitted ?? 0} submitted`} />
      </div>

      {/* Revenue chart */}
      <Card className="border-zinc-200 shadow-sm">
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="text-base font-medium">Revenue Trend</CardTitle>
          <div className="flex gap-1">
            {GRANULARITIES.map((g) => (
              <Button
                key={g} size="sm" variant={granularity === g ? 'default' : 'ghost'}
                className={`h-7 text-xs capitalize ${granularity === g ? 'bg-zinc-900 text-white' : 'text-zinc-500'}`}
                onClick={() => setGranularity(g)}
              >
                {g}
              </Button>
            ))}
          </div>
        </CardHeader>
        <CardContent>
          {revLoading ? <Skeleton className="h-52" /> : (
            <ResponsiveContainer width="100%" height={220}>
              <AreaChart data={revenue} margin={{ top: 0, right: 0, left: -20, bottom: 0 }}>
                <defs>
                  <linearGradient id="grad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#18181b" stopOpacity={0.1} />
                    <stop offset="95%" stopColor="#18181b" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#f4f4f5" />
                <XAxis dataKey="period" tick={{ fontSize: 11, fill: '#a1a1aa' }} />
                <YAxis tick={{ fontSize: 11, fill: '#a1a1aa' }} tickFormatter={(v) => `RM${(v / 1000).toFixed(0)}k`} />
                <Tooltip formatter={(v) => [formatCurrency(Number(v ?? 0)), 'Revenue']} />
                <Area type="monotone" dataKey="revenue" stroke="#18181b" strokeWidth={2} fill="url(#grad)" />
              </AreaChart>
            </ResponsiveContainer>
          )}
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {/* Invoice Volume by Type */}
        <Card className="border-zinc-200 shadow-sm">
          <CardHeader><CardTitle className="text-base font-medium">Invoice Volume by Type</CardTitle></CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={(volume ?? []).map((v) => ({ ...v, name: INVOICE_TYPE_NAMES[v.invoiceType] ?? v.invoiceType }))}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f4f4f5" />
                <XAxis dataKey="name" tick={{ fontSize: 11, fill: '#a1a1aa' }} />
                <YAxis tick={{ fontSize: 11, fill: '#a1a1aa' }} />
                <Tooltip />
                <Bar dataKey="count" fill="#18181b" radius={[3, 3, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Status breakdown */}
        <Card className="border-zinc-200 shadow-sm">
          <CardHeader><CardTitle className="text-base font-medium">Status Breakdown</CardTitle></CardHeader>
          <CardContent className="flex items-center justify-center">
            <ResponsiveContainer width="100%" height={200}>
              <PieChart>
                <Pie
                  data={[
                    { name: 'Validated', value: summary?.validated ?? 0 },
                    { name: 'Pending Review', value: summary?.pendingReview ?? 0 },
                    { name: 'Submitted', value: summary?.submitted ?? 0 },
                    { name: 'Rejected', value: summary?.rejected ?? 0 },
                    { name: 'Draft', value: (summary?.totalInvoices ?? 0) - (summary?.validated ?? 0) - (summary?.pendingReview ?? 0) - (summary?.submitted ?? 0) - (summary?.rejected ?? 0) },
                  ].filter((d) => d.value > 0)}
                  cx="50%" cy="50%" innerRadius={55} outerRadius={85}
                  dataKey="value"
                >
                  {PIE_COLORS.map((color, index) => <Cell key={index} fill={color} />)}
                </Pie>
                <Tooltip />
                <Legend iconSize={8} iconType="circle" wrapperStyle={{ fontSize: 11 }} />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      {/* Top buyers */}
      <Card className="border-zinc-200 shadow-sm">
        <CardHeader><CardTitle className="text-base font-medium">Top Buyers</CardTitle></CardHeader>
        <CardContent className="p-0">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-zinc-100 bg-zinc-50/50">
                <th className="text-left px-6 py-2 font-medium text-zinc-500">#</th>
                <th className="text-left px-4 py-2 font-medium text-zinc-500">Buyer</th>
                <th className="text-right px-4 py-2 font-medium text-zinc-500">Invoices</th>
                <th className="text-right px-6 py-2 font-medium text-zinc-500">Revenue</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-100">
              {(topBuyers ?? []).map((b, i) => (
                <tr key={i} className="hover:bg-zinc-50/50">
                  <td className="px-6 py-2 text-zinc-400 font-medium">{i + 1}</td>
                  <td className="px-4 py-2 text-zinc-700">{b.buyerName}</td>
                  <td className="px-4 py-2 text-right text-zinc-600">{b.invoiceCount}</td>
                  <td className="px-6 py-2 text-right font-medium text-zinc-900">{formatCurrency(b.totalRevenue)}</td>
                </tr>
              ))}
              {!topBuyers?.length && (
                <tr><td colSpan={4} className="py-6 text-center text-zinc-400 text-xs">No data yet</td></tr>
              )}
            </tbody>
          </table>
        </CardContent>
      </Card>
    </div>
  );
}
