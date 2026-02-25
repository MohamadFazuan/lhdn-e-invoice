'use client';

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { toast } from 'sonner';
import { Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { PageHeader } from '@/components/shared/page-header';
import { api } from '@/lib/api';
import { useAuthStore } from '@/stores/auth';
import type { ApiResponse, Business } from '@/types/api';

const MY_STATES = [
  'Johor', 'Kedah', 'Kelantan', 'Melaka', 'Negeri Sembilan',
  'Pahang', 'Pulau Pinang', 'Perak', 'Perlis', 'Selangor',
  'Terengganu', 'Sabah', 'Sarawak',
  'WP Kuala Lumpur', 'WP Labuan', 'WP Putrajaya',
];

const schema = z.object({
  name: z.string().min(2),
  tin: z.string().min(1),
  registrationNumber: z.string().min(1),
  msicCode: z.string().min(1),
  sstRegistration: z.string().optional(),
  email: z.string().email(),
  phone: z.string().min(1),
  addressLine1: z.string().min(1),
  addressLine2: z.string().optional(),
  city: z.string().min(1),
  postcode: z.string().min(1),
  state: z.string().min(1),
  country: z.string().min(1),
});
type FormData = z.infer<typeof schema>;

export default function SettingsPage() {
  const { business, setBusiness } = useAuthStore();
  const [loading, setLoading] = useState(false);

  const { register, handleSubmit, setValue, watch, formState: { errors } } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: {
      name: business?.name ?? '',
      tin: business?.tin ?? '',
      registrationNumber: business?.registrationNumber ?? '',
      msicCode: business?.msicCode ?? '',
      sstRegistration: business?.sstRegistration ?? '',
      email: business?.email ?? '',
      phone: business?.phone ?? '',
      addressLine1: business?.addressLine1 ?? '',
      addressLine2: business?.addressLine2 ?? '',
      city: business?.city ?? '',
      postcode: business?.postcode ?? '',
      state: business?.state ?? '',
      country: business?.country ?? 'MY',
    },
  });

  const onSubmit = async (data: FormData) => {
    setLoading(true);
    try {
      const res = await api.patch('api/businesses/me', { json: data });
      const json: ApiResponse<Business> = await res.json();
      if (!json.success) throw new Error(json.error?.message);
      setBusiness(json.data!);
      toast.success('Business profile updated');
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to update');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-2xl space-y-6">
      <PageHeader title="Settings" description="Manage your business profile and preferences" />

      <Card className="border-zinc-200 shadow-sm">
        <CardHeader>
          <CardTitle className="text-base">Business Profile</CardTitle>
          <CardDescription>This information appears on your invoices.</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit(onSubmit)} className="grid grid-cols-2 gap-4">
            <div className="col-span-2 space-y-1.5">
              <Label>Company Name *</Label>
              <Input {...register('name')} />
              {errors.name && <p className="text-xs text-red-600">{errors.name.message}</p>}
            </div>
            <div className="space-y-1.5"><Label>TIN *</Label><Input {...register('tin')} /></div>
            <div className="space-y-1.5"><Label>SSM Registration No. *</Label><Input {...register('registrationNumber')} /></div>
            <div className="space-y-1.5"><Label>MSIC Code *</Label><Input {...register('msicCode')} /></div>
            <div className="space-y-1.5"><Label>SST Registration</Label><Input {...register('sstRegistration')} /></div>
            <div className="space-y-1.5"><Label>Email *</Label><Input type="email" {...register('email')} /></div>
            <div className="space-y-1.5"><Label>Phone *</Label><Input {...register('phone')} /></div>
            <div className="col-span-2 space-y-1.5"><Label>Address Line 1 *</Label><Input {...register('addressLine1')} /></div>
            <div className="col-span-2 space-y-1.5"><Label>Address Line 2</Label><Input {...register('addressLine2')} /></div>
            <div className="space-y-1.5"><Label>City *</Label><Input {...register('city')} /></div>
            <div className="space-y-1.5"><Label>Postcode *</Label><Input {...register('postcode')} /></div>
            <div className="col-span-2 space-y-1.5">
              <Label>State *</Label>
              <Select onValueChange={(v) => setValue('state', v)} value={watch('state')}>
                <SelectTrigger><SelectValue placeholder="Select state" /></SelectTrigger>
                <SelectContent>{MY_STATES.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div className="col-span-2 flex justify-end pt-2">
              <Button type="submit" className="bg-zinc-900 hover:bg-zinc-700 text-white" disabled={loading}>
                {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Save Changes
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
