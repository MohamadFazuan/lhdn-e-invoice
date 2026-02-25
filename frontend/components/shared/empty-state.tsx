import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import Link from 'next/link';

interface EmptyStateProps {
  icon?: React.ReactNode;
  title: string;
  description?: string;
  action?: { label: string; href: string };
  className?: string;
}

export function EmptyState({ icon, title, description, action, className }: EmptyStateProps) {
  return (
    <div
      className={cn(
        'flex flex-col items-center justify-center rounded-xl border border-dashed border-zinc-200 bg-white py-16 text-center',
        className,
      )}
    >
      {icon && (
        <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-zinc-100 text-zinc-400">
          {icon}
        </div>
      )}
      <h3 className="text-sm font-semibold text-zinc-900">{title}</h3>
      {description && <p className="mt-1 text-sm text-zinc-500 max-w-xs">{description}</p>}
      {action && (
        <Button asChild className="mt-4 bg-zinc-900 hover:bg-zinc-700 text-white">
          <Link href={action.href}>{action.label}</Link>
        </Button>
      )}
    </div>
  );
}
