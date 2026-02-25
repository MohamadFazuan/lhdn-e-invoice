import { WifiOff, FileText, BarChart3 } from 'lucide-react';
import Link from 'next/link';

export default function OfflinePage() {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-zinc-50 px-4 text-center">
      <div className="mb-6 flex h-16 w-16 items-center justify-center rounded-full bg-zinc-100">
        <WifiOff className="h-8 w-8 text-zinc-400" />
      </div>
      <h1 className="text-2xl font-semibold text-zinc-900 mb-2">You&apos;re offline</h1>
      <p className="text-sm text-zinc-500 max-w-xs mb-8">
        No internet connection detected. Some features are still available from cache.
      </p>
      <div className="space-y-2 w-full max-w-xs">
        <Link
          href="/invoices"
          className="flex items-center gap-3 rounded-xl border border-zinc-200 bg-white p-4 text-left text-sm hover:bg-zinc-50 transition-colors"
        >
          <FileText className="h-5 w-5 text-zinc-500" />
          <div>
            <p className="font-medium text-zinc-900">View Invoices</p>
            <p className="text-xs text-zinc-500">Recently viewed invoices are cached</p>
          </div>
        </Link>
        <Link
          href="/dashboard"
          className="flex items-center gap-3 rounded-xl border border-zinc-200 bg-white p-4 text-left text-sm hover:bg-zinc-50 transition-colors"
        >
          <BarChart3 className="h-5 w-5 text-zinc-500" />
          <div>
            <p className="font-medium text-zinc-900">Dashboard</p>
            <p className="text-xs text-zinc-500">Cached analytics data available</p>
          </div>
        </Link>
      </div>
    </div>
  );
}
