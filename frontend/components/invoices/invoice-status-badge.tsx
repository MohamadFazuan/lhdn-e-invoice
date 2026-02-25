import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import type { InvoiceStatus } from '@/types/api';

const STATUS_CONFIG: Record<InvoiceStatus, { label: string; className: string; pulse?: boolean }> = {
  DRAFT: {
    label: 'Draft',
    className: 'bg-zinc-100 text-zinc-600 border-zinc-200 hover:bg-zinc-100',
  },
  OCR_PROCESSING: {
    label: 'Processing',
    className: 'bg-blue-50 text-blue-600 border-blue-200 hover:bg-blue-50',
    pulse: true,
  },
  REVIEW_REQUIRED: {
    label: 'Review Required',
    className: 'bg-amber-50 text-amber-700 border-amber-200 hover:bg-amber-50',
  },
  READY_FOR_SUBMISSION: {
    label: 'Ready',
    className: 'bg-emerald-50 text-emerald-700 border-emerald-200 hover:bg-emerald-50',
  },
  SUBMITTED: {
    label: 'Submitted',
    className: 'bg-blue-50 text-blue-700 border-blue-200 hover:bg-blue-50',
  },
  VALIDATED: {
    label: 'Validated',
    className: 'bg-green-50 text-green-700 border-green-200 hover:bg-green-50',
  },
  REJECTED: {
    label: 'Rejected',
    className: 'bg-red-50 text-red-700 border-red-200 hover:bg-red-50',
  },
  CANCELLED: {
    label: 'Cancelled',
    className: 'bg-zinc-100 text-zinc-400 border-zinc-200 hover:bg-zinc-100 line-through',
  },
};

interface InvoiceStatusBadgeProps {
  status: InvoiceStatus;
  className?: string;
}

export function InvoiceStatusBadge({ status, className }: InvoiceStatusBadgeProps) {
  const config = STATUS_CONFIG[status] ?? { label: status, className: '' };
  return (
    <Badge
      variant="outline"
      className={cn('font-medium', config.className, config.pulse && 'animate-pulse', className)}
    >
      {config.label}
    </Badge>
  );
}

export const INVOICE_TYPE_LABELS: Record<string, string> = {
  '01': 'Invoice',
  '02': 'Credit Note',
  '03': 'Debit Note',
  '04': 'Refund Note',
};
