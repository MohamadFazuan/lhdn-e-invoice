'use client';

import { use, useState } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { Loader2, UserCheck, FileText } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useAuthStore } from '@/stores/auth';
import { api } from '@/lib/api';
import Link from 'next/link';

export default function InviteAcceptPage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = use(params);
  const router = useRouter();
  const { accessToken, isInitialized } = useAuthStore();
  const [accepting, setAccepting] = useState(false);

  const handleAccept = async () => {
    setAccepting(true);
    try {
      const res = await api.post(`api/team/invite/${token}/accept`);
      const json = await res.json() as { success: boolean; error?: { message?: string } };
      if (!json.success) throw new Error(json.error?.message);
      toast.success("You've joined the team!");
      router.push('/dashboard');
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to accept invite');
    } finally {
      setAccepting(false);
    }
  };

  if (!isInitialized) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-zinc-50">
        <Loader2 className="h-6 w-6 animate-spin text-zinc-400" />
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-zinc-50 px-4">
      <div className="mb-8 flex items-center gap-2">
        <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-zinc-900">
          <FileText className="h-5 w-5 text-white" />
        </div>
        <span className="text-xl font-semibold tracking-tight text-zinc-900">invoisJer!</span>
      </div>

      <Card className="w-full max-w-md border-zinc-200 shadow-sm">
        <CardHeader className="text-center pb-2">
          <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-emerald-100">
            <UserCheck className="h-6 w-6 text-emerald-600" />
          </div>
          <CardTitle className="text-xl">Team Invitation</CardTitle>
          <CardDescription>You&apos;ve been invited to join an invoisJer! team.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {!accessToken ? (
            <div className="space-y-3 text-center">
              <p className="text-sm text-zinc-500">Sign in or register to accept this invitation.</p>
              <Button asChild className="w-full bg-zinc-900 hover:bg-zinc-700 text-white">
                <Link href={`/login?redirect=/invite/${token}`}>Sign In</Link>
              </Button>
              <Button asChild variant="outline" className="w-full">
                <Link href={`/register?redirect=/invite/${token}`}>Create Account</Link>
              </Button>
            </div>
          ) : (
            <Button onClick={handleAccept} disabled={accepting} className="w-full bg-zinc-900 hover:bg-zinc-700 text-white">
              {accepting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Accept Invitation
            </Button>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
