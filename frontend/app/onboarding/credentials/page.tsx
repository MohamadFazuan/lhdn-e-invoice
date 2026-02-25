'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { toast } from 'sonner';
import { Loader2, Eye, EyeOff, ShieldCheck } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useAuthStore } from '@/stores/auth';

const schema = z.object({
  clientId: z.string().min(1, 'Client ID is required'),
  clientSecret: z.string().min(1, 'Client Secret is required'),
});
type FormData = z.infer<typeof schema>;

export default function OnboardingCredentialsPage() {
  const router = useRouter();
  const { accessToken } = useAuthStore();
  const [loading, setLoading] = useState(false);
  const [showSecret, setShowSecret] = useState(false);

  const { register, handleSubmit, formState: { errors } } = useForm<FormData>({
    resolver: zodResolver(schema),
  });

  const onSubmit = async (data: FormData) => {
    setLoading(true);
    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/businesses/me/credentials`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${accessToken}` },
        credentials: 'include',
        body: JSON.stringify(data),
      });
      const json = await res.json();
      if (!res.ok || !json.success) {
        toast.error(json.error?.message ?? 'Failed to save credentials');
        return;
      }
      toast.success('LHDN credentials saved!');
      router.push('/dashboard');
    } catch {
      toast.error('An error occurred. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-zinc-50 py-12 px-4">
      <div className="max-w-lg mx-auto">
        {/* Progress */}
        <div className="mb-8">
          <div className="flex items-center gap-3 mb-2">
            <div className="flex h-6 w-6 items-center justify-center rounded-full bg-zinc-300 text-xs font-medium text-white">1</div>
            <div className="flex-1 h-1 rounded-full bg-zinc-900" />
            <div className="flex h-6 w-6 items-center justify-center rounded-full bg-zinc-900 text-xs font-medium text-white">2</div>
          </div>
          <p className="text-sm text-zinc-500">Step 2 of 2 — LHDN Credentials</p>
        </div>

        <Card className="border-zinc-200 shadow-sm">
          <CardHeader>
            <div className="flex items-center gap-2 mb-1">
              <ShieldCheck className="h-5 w-5 text-emerald-600" />
              <CardTitle className="text-xl">LHDN MyInvois Credentials</CardTitle>
            </div>
            <CardDescription>
              Your credentials are required to submit invoices to LHDN MyInvois. They are encrypted at rest and never exposed.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
              <div className="space-y-1.5">
                <Label htmlFor="clientId">Client ID</Label>
                <Input id="clientId" placeholder="Your LHDN Client ID" {...register('clientId')} />
                {errors.clientId && <p className="text-xs text-red-600">{errors.clientId.message}</p>}
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="clientSecret">Client Secret</Label>
                <div className="relative">
                  <Input
                    id="clientSecret"
                    type={showSecret ? 'text' : 'password'}
                    placeholder="Your LHDN Client Secret"
                    className="pr-10"
                    {...register('clientSecret')}
                  />
                  <button
                    type="button"
                    onClick={() => setShowSecret(!showSecret)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-zinc-600"
                  >
                    {showSecret ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
                {errors.clientSecret && <p className="text-xs text-red-600">{errors.clientSecret.message}</p>}
              </div>

              <div className="rounded-lg bg-zinc-50 border border-zinc-200 p-3 text-xs text-zinc-500">
                Get your credentials from the{' '}
                <span className="font-medium text-zinc-700">LHDN MyInvois Developer Portal</span>.
                For sandbox testing, use your sandbox Client ID and Secret.
              </div>

              <Button type="submit" className="w-full bg-zinc-900 hover:bg-zinc-700 text-white" disabled={loading}>
                {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Save & Go to Dashboard
              </Button>
            </form>
            <Button
              variant="ghost"
              className="w-full mt-2 text-zinc-500"
              onClick={() => router.push('/dashboard')}
            >
              Skip for now
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
