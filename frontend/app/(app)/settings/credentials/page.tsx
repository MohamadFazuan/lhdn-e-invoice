'use client';

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { toast } from 'sonner';
import { Loader2, Eye, EyeOff, ShieldCheck } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { PageHeader } from '@/components/shared/page-header';
import { api } from '@/lib/api';

const schema = z.object({
  clientId: z.string().min(1, 'Required'),
  clientSecret: z.string().min(1, 'Required'),
});
type FormData = z.infer<typeof schema>;

export default function CredentialsPage() {
  const [loading, setLoading] = useState(false);
  const [showSecret, setShowSecret] = useState(false);

  const { register, handleSubmit, formState: { errors } } = useForm<FormData>({ resolver: zodResolver(schema) });

  const onSubmit = async (data: FormData) => {
    setLoading(true);
    try {
      const res = await api.patch('api/businesses/me/credentials', { json: data });
      const json = await res.json() as { success: boolean; error?: { message?: string } };
      if (!json.success) throw new Error(json.error?.message);
      toast.success('Credentials updated');
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to update credentials');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-lg space-y-6">
      <PageHeader title="LHDN Credentials" />

      <Card className="border-zinc-200 shadow-sm">
        <CardHeader>
          <div className="flex items-center gap-2">
            <ShieldCheck className="h-5 w-5 text-emerald-600" />
            <CardTitle className="text-base">Update Credentials</CardTitle>
          </div>
          <CardDescription>
            Your credentials are encrypted at rest using AES-GCM-256. They are never exposed in API responses.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="mb-4 rounded-lg bg-zinc-50 border border-zinc-200 p-3 text-sm text-zinc-500">
            Current credentials: <span className="font-mono">••••••••••••</span>
          </div>
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <div className="space-y-1.5">
              <Label>Client ID</Label>
              <Input placeholder="New Client ID" {...register('clientId')} />
              {errors.clientId && <p className="text-xs text-red-600">{errors.clientId.message}</p>}
            </div>
            <div className="space-y-1.5">
              <Label>Client Secret</Label>
              <div className="relative">
                <Input
                  type={showSecret ? 'text' : 'password'}
                  placeholder="New Client Secret"
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
            <Button type="submit" className="w-full bg-zinc-900 hover:bg-zinc-700 text-white" disabled={loading}>
              {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Update Credentials
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
