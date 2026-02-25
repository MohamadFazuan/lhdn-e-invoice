'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { toast } from 'sonner';
import { Loader2, Eye, EyeOff } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useAuthStore } from '@/stores/auth';
import type { ApiResponse, LoginResponse, User, Business, TeamMember } from '@/types/api';

const schema = z.object({
  email: z.string().email('Invalid email address'),
  password: z.string().min(1, 'Password is required'),
});
type FormData = z.infer<typeof schema>;

export default function LoginPage() {
  const router = useRouter();
  const { setAccessToken, setUser, setBusiness, setMemberRole } = useAuthStore();
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  const { register, handleSubmit, formState: { errors } } = useForm<FormData>({
    resolver: zodResolver(schema),
  });

  const onSubmit = async (data: FormData) => {
    setLoading(true);
    try {
      const baseUrl = process.env.NEXT_PUBLIC_API_URL;
      const res = await fetch(`${baseUrl}/api/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(data),
      });
      const json: ApiResponse<LoginResponse> = await res.json();

      if (!res.ok || !json.success) {
        toast.error(json.error?.message ?? 'Login failed');
        return;
      }

      const token = json.data!.accessToken;
      setAccessToken(token);
      setUser(json.data!.user);

      const headers = { Authorization: `Bearer ${token}` };

      // Fetch business
      const bizRes = await fetch(`${baseUrl}/api/businesses/me`, { headers, credentials: 'include' });
      if (bizRes.ok) {
        const bizJson: ApiResponse<Business> = await bizRes.json();
        if (bizJson.data) {
          setBusiness(bizJson.data);
          // Fetch member role
          const memberRes = await fetch(`${baseUrl}/api/team/me`, { headers, credentials: 'include' });
          if (memberRes.ok) {
            const m: ApiResponse<TeamMember> = await memberRes.json();
            if (m.data) setMemberRole(m.data.role);
          }
          router.push('/dashboard');
        } else {
          router.push('/onboarding/business');
        }
      } else {
        router.push('/onboarding/business');
      }
    } catch {
      toast.error('An error occurred. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card className="w-full max-w-md border-zinc-200 shadow-sm">
      <CardHeader className="space-y-1">
        <CardTitle className="text-xl font-semibold">Welcome back</CardTitle>
        <CardDescription>Sign in to your account</CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="email">Email</Label>
            <Input id="email" type="email" placeholder="you@company.com" {...register('email')} />
            {errors.email && <p className="text-xs text-red-600">{errors.email.message}</p>}
          </div>
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <Label htmlFor="password">Password</Label>
              <span className="text-xs text-zinc-500 cursor-pointer hover:text-zinc-700">Forgot password?</span>
            </div>
            <div className="relative">
              <Input id="password" type={showPassword ? 'text' : 'password'} className="pr-10" {...register('password')} />
              <button
                type="button"
                onClick={() => setShowPassword((v) => !v)}
                className="absolute inset-y-0 right-0 flex items-center pr-3 text-zinc-400 hover:text-zinc-600"
                tabIndex={-1}
              >
                {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
            {errors.password && <p className="text-xs text-red-600">{errors.password.message}</p>}
          </div>
          <Button type="submit" className="w-full bg-zinc-900 hover:bg-zinc-700 text-white" disabled={loading}>
            {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Sign in
          </Button>
        </form>
        <p className="mt-4 text-center text-sm text-zinc-500">
          Don&apos;t have an account?{' '}
          <Link href="/register" className="font-medium text-zinc-900 hover:underline">
            Sign up
          </Link>
        </p>
      </CardContent>
    </Card>
  );
}
