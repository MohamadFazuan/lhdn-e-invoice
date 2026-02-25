import { FileText } from 'lucide-react';

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-zinc-50 px-4 py-12">
      <div className="mb-8 flex items-center gap-2">
        <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-zinc-900">
          <FileText className="h-5 w-5 text-white" />
        </div>
        <span className="text-xl font-semibold tracking-tight text-zinc-900">invoisJer!</span>
      </div>
      {children}
    </div>
  );
}
