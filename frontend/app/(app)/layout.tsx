'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/stores/auth';
import { Sidebar } from '@/components/layout/sidebar';
import { Topbar } from '@/components/layout/topbar';
import { Skeleton } from '@/components/ui/skeleton';

export default function AppLayout({ children }: { children: React.ReactNode }) {
  const { isInitialized, accessToken, business } = useAuthStore();
  const router = useRouter();

  useEffect(() => {
    if (!isInitialized) return;
    if (!accessToken) {
      router.push('/login');
    } else if (!business) {
      router.push('/onboarding/business');
    }
  }, [isInitialized, accessToken, business, router]);

  if (!isInitialized) {
    return (
      <div className="flex h-screen items-center justify-center bg-zinc-50">
        <div className="space-y-3 w-64">
          <Skeleton className="h-4 w-full" />
          <Skeleton className="h-4 w-3/4" />
          <Skeleton className="h-4 w-1/2" />
        </div>
      </div>
    );
  }

  if (!accessToken) return null;

  return (
    <div className="flex h-screen overflow-hidden bg-zinc-50">
      <aside className="hidden lg:flex lg:flex-shrink-0">
        <Sidebar />
      </aside>
      <div className="flex flex-1 flex-col overflow-hidden">
        <Topbar />
        <main className="flex-1 overflow-y-auto p-6">
          {children}
        </main>
      </div>
    </div>
  );
}
