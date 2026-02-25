'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { toast } from 'sonner';
import { Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useAuthStore } from '@/stores/auth';
import type { ApiResponse, Business } from '@/types/api';

const MY_STATES = [
  'Johor', 'Kedah', 'Kelantan', 'Melaka', 'Negeri Sembilan',
  'Pahang', 'Pulau Pinang', 'Perak', 'Perlis', 'Selangor',
  'Terengganu', 'Sabah', 'Sarawak',
  'WP Kuala Lumpur', 'WP Labuan', 'WP Putrajaya',
];

const schema = z.object({
  name: z.string().min(2, 'Company name is required'),
  tin: z.string().min(1, 'TIN is required'),
  registrationNumber: z.string().min(1, 'SSM registration number is required'),
  msicCode: z.string().min(1, 'MSIC code is required'),
  sstRegistration: z.string().optional(),
  email: z.string().email('Invalid email'),
  phone: z.string().min(1, 'Phone is required'),
  addressLine1: z.string().min(1, 'Address is required'),
  addressLine2: z.string().optional(),
  city: z.string().min(1, 'City is required'),
  postcode: z.string().min(1, 'Postcode is required'),
  state: z.string().min(1, 'State is required'),
  country: z.string().min(1),
});
type FormData = z.infer<typeof schema>;

export default function OnboardingBusinessPage() {
  const router = useRouter();
  const { accessToken, setBusiness } = useAuthStore();
  const [loading, setLoading] = useState(false);

  const { register, handleSubmit, setValue, watch, formState: { errors } } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: { country: 'MY' },
  });

  const onSubmit = async (data: FormData) => {
    setLoading(true);
    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/businesses`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${accessToken}`,
        },
        credentials: 'include',
        body: JSON.stringify(data),
      });
      const json: ApiResponse<Business> = await res.json();
      if (!res.ok || !json.success) {
        toast.error(json.error?.message ?? 'Failed to create business');
        return;
      }
      setBusiness(json.data!);
      toast.success('Business profile saved!');
      router.push('/onboarding/credentials');
    } catch {
      toast.error('An error occurred. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-zinc-50 py-12 px-4">
      <div className="max-w-2xl mx-auto">
        {/* Progress */}
        <div className="mb-8">
          <div className="flex items-center gap-3 mb-2">
            <div className="flex h-6 w-6 items-center justify-center rounded-full bg-zinc-900 text-xs font-medium text-white">1</div>
            <div className="flex-1 h-1 rounded-full bg-zinc-200">
              <div className="h-1 w-1/2 rounded-full bg-zinc-900" />
            </div>
            <div className="flex h-6 w-6 items-center justify-center rounded-full border border-zinc-300 text-xs font-medium text-zinc-500">2</div>
          </div>
          <p className="text-sm text-zinc-500">Step 1 of 2 — Business Profile</p>
        </div>

        <Card className="border-zinc-200 shadow-sm">
          <CardHeader>
            <CardTitle className="text-xl">Set up your business profile</CardTitle>
            <CardDescription>This information will be used on your invoices.</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="col-span-2 space-y-1.5">
                  <Label htmlFor="name">Company Name *</Label>
                  <Input id="name" placeholder="Syarikat ABC Sdn Bhd" {...register('name')} />
                  {errors.name && <p className="text-xs text-red-600">{errors.name.message}</p>}
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="tin">TIN (Tax ID) *</Label>
                  <Input id="tin" placeholder="C12345678901" {...register('tin')} />
                  {errors.tin && <p className="text-xs text-red-600">{errors.tin.message}</p>}
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="registrationNumber">SSM Registration No. *</Label>
                  <Input id="registrationNumber" placeholder="1234567-X" {...register('registrationNumber')} />
                  {errors.registrationNumber && <p className="text-xs text-red-600">{errors.registrationNumber.message}</p>}
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="msicCode">MSIC Code *</Label>
                  <Input id="msicCode" placeholder="e.g. 46510" {...register('msicCode')} />
                  {errors.msicCode && <p className="text-xs text-red-600">{errors.msicCode.message}</p>}
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="sstRegistration">SST Registration (optional)</Label>
                  <Input id="sstRegistration" placeholder="A01-1234-56789012" {...register('sstRegistration')} />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="email">Business Email *</Label>
                  <Input id="email" type="email" placeholder="info@company.com" {...register('email')} />
                  {errors.email && <p className="text-xs text-red-600">{errors.email.message}</p>}
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="phone">Phone *</Label>
                  <Input id="phone" placeholder="+60 12-345 6789" {...register('phone')} />
                  {errors.phone && <p className="text-xs text-red-600">{errors.phone.message}</p>}
                </div>
                <div className="col-span-2 space-y-1.5">
                  <Label htmlFor="addressLine1">Address Line 1 *</Label>
                  <Input id="addressLine1" placeholder="No. 1, Jalan ABC" {...register('addressLine1')} />
                  {errors.addressLine1 && <p className="text-xs text-red-600">{errors.addressLine1.message}</p>}
                </div>
                <div className="col-span-2 space-y-1.5">
                  <Label htmlFor="addressLine2">Address Line 2</Label>
                  <Input id="addressLine2" placeholder="Taman XYZ" {...register('addressLine2')} />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="city">City *</Label>
                  <Input id="city" placeholder="Kuala Lumpur" {...register('city')} />
                  {errors.city && <p className="text-xs text-red-600">{errors.city.message}</p>}
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="postcode">Postcode *</Label>
                  <Input id="postcode" placeholder="50000" {...register('postcode')} />
                  {errors.postcode && <p className="text-xs text-red-600">{errors.postcode.message}</p>}
                </div>
                <div className="col-span-2 space-y-1.5">
                  <Label>State *</Label>
                  <Select onValueChange={(v) => setValue('state', v)} value={watch('state')}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select state" />
                    </SelectTrigger>
                    <SelectContent>
                      {MY_STATES.map((s) => (
                        <SelectItem key={s} value={s}>{s}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {errors.state && <p className="text-xs text-red-600">{errors.state.message}</p>}
                </div>
              </div>
              <Button type="submit" className="w-full bg-zinc-900 hover:bg-zinc-700 text-white mt-2" disabled={loading}>
                {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Continue to LHDN Credentials
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
