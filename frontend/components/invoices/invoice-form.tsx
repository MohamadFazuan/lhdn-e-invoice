'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useForm, useFieldArray } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { toast } from 'sonner';
import { Plus, Trash2, Loader2, ArrowLeft } from 'lucide-react';
import Link from 'next/link';
import { useQuery } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { PageHeader } from '@/components/shared/page-header';
import { api } from '@/lib/api';
import { formatCurrency } from '@/lib/utils';
import { useAuthStore } from '@/stores/auth';
import type { ApiResponse, Invoice } from '@/types/api';

const MY_STATES = [
  'Johor', 'Kedah', 'Kelantan', 'Melaka', 'Negeri Sembilan',
  'Pahang', 'Pulau Pinang', 'Perak', 'Perlis', 'Selangor',
  'Terengganu', 'Sabah', 'Sarawak',
  'WP Kuala Lumpur', 'WP Labuan', 'WP Putrajaya',
];

const TAX_TYPES = [
  { value: '01', label: '01 – Sales Tax (5%)' },
  { value: '02', label: '02 – Service Tax (8%)' },
  { value: 'E', label: 'E – Exempt' },
  { value: 'AE', label: 'AE – Not Subject' },
  { value: 'NA', label: 'NA – Not Applicable' },
];

const lineItemSchema = z.object({
  description: z.string().min(1, 'Required'),
  quantity: z.string().min(1, 'Required'),
  unitPrice: z.string().min(1, 'Required'),
  taxType: z.string().min(1),
  taxRate: z.string().min(1),
});

const schema = z.object({
  invoiceNumber: z.string().optional(),
  invoiceType: z.string().min(1),
  issueDate: z.string().min(1, 'Required'),
  dueDate: z.string().optional(),
  supplierName: z.string().optional(),
  supplierTin: z.string().optional(),
  supplierRegistration: z.string().optional(),
  buyerName: z.string().optional(),
  buyerTin: z.string().optional(),
  buyerRegistrationNumber: z.string().optional(),
  buyerEmail: z.string().optional(),
  buyerPhone: z.string().optional(),
  buyerAddressLine1: z.string().optional(),
  buyerCity: z.string().optional(),
  buyerPostcode: z.string().optional(),
  buyerState: z.string().optional(),
  buyerCountry: z.string().optional(),
  currencyCode: z.string().min(1),
  notes: z.string().optional(),
  items: z.array(lineItemSchema).min(1, 'Add at least one line item'),
});
type FormData = z.infer<typeof schema>;

function computeItemTotals(qty: string, price: string, taxType: string, taxRate: string) {
  const q = parseFloat(qty) || 0;
  const p = parseFloat(price) || 0;
  const subtotal = q * p;
  const isExempt = taxType === 'E' || taxType === 'NA' || taxType === 'AE';
  const tax = isExempt ? 0 : subtotal * (parseFloat(taxRate) || 0) / 100;
  return { subtotal: subtotal.toFixed(2), tax: tax.toFixed(2), total: (subtotal + tax).toFixed(2) };
}

interface InvoiceFormProps {
  mode: 'create' | 'edit';
  invoiceId?: string;
}

export function InvoiceForm({ mode, invoiceId }: InvoiceFormProps) {
  const router = useRouter();
  const { business } = useAuthStore();
  const [loading, setLoading] = useState(false);

  const { data: existingInvoice } = useQuery({
    queryKey: ['invoice', invoiceId],
    queryFn: async () => {
      const res = await api.get(`api/invoices/${invoiceId}`);
      const json: ApiResponse<Invoice> = await res.json();
      return json.data!;
    },
    enabled: mode === 'edit' && !!invoiceId,
  });

  const { register, handleSubmit, control, setValue, watch, formState: { errors } } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: {
      invoiceType: '01',
      currencyCode: 'MYR',
      items: [{ description: '', quantity: '1', unitPrice: '0', taxType: 'NA', taxRate: '0' }],
      supplierName: business?.name,
      supplierTin: business?.tin,
      supplierRegistration: business?.registrationNumber,
      issueDate: new Date().toISOString().split('T')[0],
    },
  });

  const { fields, append, remove } = useFieldArray({ control, name: 'items' });
  const watchItems = watch('items');

  // Pre-fill with existing invoice data
  useEffect(() => {
    if (existingInvoice) {
      const fields: (keyof FormData)[] = [
        'invoiceNumber', 'invoiceType', 'issueDate', 'dueDate', 'supplierName',
        'supplierTin', 'supplierRegistration', 'buyerName', 'buyerTin',
        'buyerRegistrationNumber', 'buyerEmail', 'buyerPhone', 'buyerAddressLine1',
        'buyerCity', 'buyerPostcode', 'buyerState', 'buyerCountry', 'currencyCode', 'notes',
      ];
      fields.forEach((f) => {
        const val = existingInvoice[f as keyof Invoice];
        if (val) setValue(f, String(val));
      });
      if (existingInvoice.items?.length) {
        setValue('items', existingInvoice.items.map((i) => ({
          description: i.description,
          quantity: i.quantity,
          unitPrice: i.unitPrice,
          taxType: i.taxType,
          taxRate: i.taxRate,
        })));
      }
    }
  }, [existingInvoice, setValue]);

  // Compute totals
  const totals = watchItems.reduce((acc, item) => {
    const t = computeItemTotals(item.quantity, item.unitPrice, item.taxType, item.taxRate);
    return {
      subtotal: acc.subtotal + parseFloat(t.subtotal),
      tax: acc.tax + parseFloat(t.tax),
    };
  }, { subtotal: 0, tax: 0 });

  const onSubmit = async (data: FormData) => {
    setLoading(true);
    try {
      const payload = {
        ...data,
        items: data.items.map((item) => {
          const t = computeItemTotals(item.quantity, item.unitPrice, item.taxType, item.taxRate);
          return { ...item, subtotal: t.subtotal, taxAmount: t.tax, total: t.total };
        }),
      };

      if (mode === 'create') {
        const res = await api.post('api/invoices', { json: payload });
        const json: ApiResponse<Invoice> = await res.json();
        if (json.success) {
          toast.success('Invoice created');
          router.push(`/invoices/${json.data!.id}`);
        } else {
          toast.error(json.error?.message ?? 'Failed to create invoice');
        }
      } else {
        const res = await api.patch(`api/invoices/${invoiceId}`, { json: payload });
        const json: ApiResponse<Invoice> = await res.json();
        if (json.success) {
          toast.success('Invoice updated');
          router.push(`/invoices/${invoiceId}`);
        } else {
          toast.error(json.error?.message ?? 'Failed to update invoice');
        }
      }
    } catch {
      toast.error('An error occurred');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-4xl space-y-6">
      <div>
        <Link href="/invoices" className="flex items-center gap-1.5 text-sm text-zinc-500 hover:text-zinc-900 mb-4">
          <ArrowLeft className="h-3.5 w-3.5" />Back to Invoices
        </Link>
        <PageHeader title={mode === 'create' ? 'Create Invoice' : 'Edit Invoice'} />
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
        {/* Section 1: Invoice Info */}
        <Card className="border-zinc-200 shadow-sm">
          <CardHeader><CardTitle className="text-base">Invoice Info</CardTitle></CardHeader>
          <CardContent className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label>Invoice Number</Label>
              <Input placeholder="INV-001 (auto if blank)" {...register('invoiceNumber')} />
            </div>
            <div className="space-y-1.5">
              <Label>Invoice Type</Label>
              <Select defaultValue="01" onValueChange={(v) => setValue('invoiceType', v)} value={watch('invoiceType')}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="01">01 – Invoice</SelectItem>
                  <SelectItem value="02">02 – Credit Note</SelectItem>
                  <SelectItem value="03">03 – Debit Note</SelectItem>
                  <SelectItem value="04">04 – Refund Note</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Issue Date *</Label>
              <Input type="date" {...register('issueDate')} />
              {errors.issueDate && <p className="text-xs text-red-600">{errors.issueDate.message}</p>}
            </div>
            <div className="space-y-1.5">
              <Label>Due Date</Label>
              <Input type="date" {...register('dueDate')} />
            </div>
          </CardContent>
        </Card>

        {/* Section 2: Supplier */}
        <Card className="border-zinc-200 shadow-sm">
          <CardHeader><CardTitle className="text-base">Supplier</CardTitle></CardHeader>
          <CardContent className="grid grid-cols-2 gap-4">
            <div className="col-span-2 space-y-1.5">
              <Label>Supplier Name</Label>
              <Input {...register('supplierName')} />
            </div>
            <div className="space-y-1.5">
              <Label>TIN</Label>
              <Input {...register('supplierTin')} />
            </div>
            <div className="space-y-1.5">
              <Label>Registration No.</Label>
              <Input {...register('supplierRegistration')} />
            </div>
          </CardContent>
        </Card>

        {/* Section 3: Buyer */}
        <Card className="border-zinc-200 shadow-sm">
          <CardHeader><CardTitle className="text-base">Buyer</CardTitle></CardHeader>
          <CardContent className="grid grid-cols-2 gap-4">
            <div className="col-span-2 space-y-1.5">
              <Label>Buyer Name</Label>
              <Input {...register('buyerName')} />
            </div>
            <div className="space-y-1.5"><Label>TIN</Label><Input {...register('buyerTin')} /></div>
            <div className="space-y-1.5"><Label>Registration No.</Label><Input {...register('buyerRegistrationNumber')} /></div>
            <div className="space-y-1.5"><Label>Email</Label><Input type="email" {...register('buyerEmail')} /></div>
            <div className="space-y-1.5"><Label>Phone</Label><Input {...register('buyerPhone')} /></div>
            <div className="col-span-2 space-y-1.5"><Label>Address</Label><Input {...register('buyerAddressLine1')} /></div>
            <div className="space-y-1.5"><Label>City</Label><Input {...register('buyerCity')} /></div>
            <div className="space-y-1.5"><Label>Postcode</Label><Input {...register('buyerPostcode')} /></div>
            <div className="space-y-1.5">
              <Label>State</Label>
              <Select onValueChange={(v) => setValue('buyerState', v)} value={watch('buyerState') ?? ''}>
                <SelectTrigger><SelectValue placeholder="Select state" /></SelectTrigger>
                <SelectContent>{MY_STATES.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5"><Label>Country</Label><Input defaultValue="MY" {...register('buyerCountry')} /></div>
          </CardContent>
        </Card>

        {/* Section 4: Line Items */}
        <Card className="border-zinc-200 shadow-sm">
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="text-base">Line Items</CardTitle>
            <Button
              type="button" size="sm" variant="outline"
              onClick={() => append({ description: '', quantity: '1', unitPrice: '0', taxType: 'NA', taxRate: '0' })}
            >
              <Plus className="mr-1.5 h-3.5 w-3.5" />Add Item
            </Button>
          </CardHeader>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-zinc-100 bg-zinc-50/50">
                    <th className="text-left px-4 py-2 font-medium text-zinc-500 w-[30%]">Description</th>
                    <th className="text-right px-3 py-2 font-medium text-zinc-500 w-16">Qty</th>
                    <th className="text-right px-3 py-2 font-medium text-zinc-500 w-24">Unit Price</th>
                    <th className="text-left px-3 py-2 font-medium text-zinc-500 w-36">Tax Type</th>
                    <th className="text-right px-3 py-2 font-medium text-zinc-500 w-16">Rate %</th>
                    <th className="text-right px-3 py-2 font-medium text-zinc-500 w-24">Subtotal</th>
                    <th className="text-right px-3 py-2 font-medium text-zinc-500 w-20">Tax</th>
                    <th className="text-right px-4 py-2 font-medium text-zinc-500 w-24">Total</th>
                    <th className="w-8" />
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-100">
                  {fields.map((field, idx) => {
                    const item = watchItems[idx] ?? {};
                    const t = computeItemTotals(item.quantity, item.unitPrice, item.taxType, item.taxRate);
                    return (
                      <tr key={field.id} className="align-top">
                        <td className="px-4 py-2">
                          <Input className="h-8 text-xs" {...register(`items.${idx}.description`)} placeholder="Description" />
                        </td>
                        <td className="px-3 py-2">
                          <Input className="h-8 text-xs text-right" {...register(`items.${idx}.quantity`)} />
                        </td>
                        <td className="px-3 py-2">
                          <Input className="h-8 text-xs text-right" {...register(`items.${idx}.unitPrice`)} />
                        </td>
                        <td className="px-3 py-2">
                          <Select
                            value={item.taxType ?? 'NA'}
                            onValueChange={(v) => {
                              setValue(`items.${idx}.taxType`, v);
                              if (v === 'NA' || v === 'E' || v === 'AE') setValue(`items.${idx}.taxRate`, '0');
                              else if (v === '01') setValue(`items.${idx}.taxRate`, '5');
                              else if (v === '02') setValue(`items.${idx}.taxRate`, '8');
                            }}
                          >
                            <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
                            <SelectContent>
                              {TAX_TYPES.map((t) => <SelectItem key={t.value} value={t.value} className="text-xs">{t.label}</SelectItem>)}
                            </SelectContent>
                          </Select>
                        </td>
                        <td className="px-3 py-2">
                          <Input className="h-8 text-xs text-right" {...register(`items.${idx}.taxRate`)} />
                        </td>
                        <td className="px-3 py-2 text-right text-zinc-600 text-xs pt-3">{formatCurrency(t.subtotal)}</td>
                        <td className="px-3 py-2 text-right text-zinc-600 text-xs pt-3">{formatCurrency(t.tax)}</td>
                        <td className="px-4 py-2 text-right font-medium text-zinc-900 text-xs pt-3">{formatCurrency(t.total)}</td>
                        <td className="py-2 pr-2">
                          {fields.length > 1 && (
                            <Button type="button" variant="ghost" size="icon" className="h-8 w-8 text-zinc-400 hover:text-red-600" onClick={() => remove(idx)}>
                              <Trash2 className="h-3.5 w-3.5" />
                            </Button>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>

        {/* Section 5: Summary + Notes */}
        <div className="grid grid-cols-2 gap-6">
          <Card className="border-zinc-200 shadow-sm">
            <CardHeader><CardTitle className="text-base">Notes</CardTitle></CardHeader>
            <CardContent>
              <Textarea placeholder="Optional notes..." rows={3} {...register('notes')} />
            </CardContent>
          </Card>
          <Card className="border-zinc-200 shadow-sm">
            <CardHeader><CardTitle className="text-base">Summary</CardTitle></CardHeader>
            <CardContent className="space-y-2">
              <div className="flex justify-between text-sm text-zinc-600">
                <span>Subtotal</span><span>{formatCurrency(totals.subtotal)}</span>
              </div>
              <div className="flex justify-between text-sm text-zinc-600">
                <span>Tax</span><span>{formatCurrency(totals.tax)}</span>
              </div>
              <Separator />
              <div className="flex justify-between font-semibold text-zinc-900">
                <span>Grand Total</span><span>{formatCurrency(totals.subtotal + totals.tax)}</span>
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="flex justify-end gap-3">
          <Button type="button" variant="outline" onClick={() => router.back()}>Cancel</Button>
          <Button type="submit" className="bg-zinc-900 hover:bg-zinc-700 text-white" disabled={loading}>
            {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            {mode === 'create' ? 'Create Invoice' : 'Save Changes'}
          </Button>
        </div>
      </form>
    </div>
  );
}
