import React from 'react';
import { cn } from '@/lib/utils';

export type CrmStatus =
  | 'NEW'
  | 'CONTACTED'
  | 'INTERESTED'
  | 'NOT_INTERESTED'
  | 'FOLLOW_UP'
  | 'ENROLLED'
  | 'DROPPED'
  | 'INVALID'
  | 'PENDING'
  | 'CONFIRMED'
  | 'COMPLETED'
  | 'CANCELLED'
  | 'RESCHEDULED'
  | 'DRAFT'
  | 'SENT'
  | 'PAID'
  | 'PARTIALLY_PAID'
  | 'UNPAID'
  | 'OVERDUE'
  | 'CLOSED'
  | (string & {});

interface StatusBadgeProps extends React.HTMLAttributes<HTMLSpanElement> {
  status: CrmStatus | string | null | undefined;
  className?: string;
  size?: 'sm' | 'default';
}

const statusConfig: Record<
  string,
  { label: string; className: string }
> = {
  // Enquiry statuses
  NEW: {
    label: 'New',
    className: 'bg-blue-50 text-blue-700 border-blue-200/80 dark:bg-blue-950/50 dark:text-blue-400 dark:border-blue-900/60',
  },
  CONTACTED: {
    label: 'Contacted',
    className: 'bg-indigo-50 text-indigo-700 border-indigo-200/80 dark:bg-indigo-950/50 dark:text-indigo-400 dark:border-indigo-900/60',
  },
  INTERESTED: {
    label: 'Interested',
    className: 'bg-emerald-50 text-emerald-700 border-emerald-200/80 dark:bg-emerald-950/50 dark:text-emerald-400 dark:border-emerald-900/60',
  },
  NOT_INTERESTED: {
    label: 'Not Interested',
    className: 'bg-neutral-100 text-neutral-600 border-neutral-200/80 dark:bg-neutral-800/60 dark:text-neutral-400 dark:border-neutral-700/60',
  },
  FOLLOW_UP: {
    label: 'Follow Up',
    className: 'bg-amber-50 text-amber-700 border-amber-200/80 dark:bg-amber-950/50 dark:text-amber-400 dark:border-amber-900/60',
  },
  ENROLLED: {
    label: 'Enrolled',
    className: 'bg-emerald-50 text-emerald-800 border-emerald-300 dark:bg-emerald-950/70 dark:text-emerald-300 dark:border-emerald-800',
  },
  DROPPED: {
    label: 'Dropped',
    className: 'bg-rose-50 text-rose-700 border-rose-200/80 dark:bg-rose-950/50 dark:text-rose-400 dark:border-rose-900/60',
  },
  INVALID: {
    label: 'Invalid',
    className: 'bg-neutral-100 text-neutral-500 border-neutral-200 dark:bg-neutral-900 dark:text-neutral-500 dark:border-neutral-800',
  },

  // Generic / Admission / FollowUp statuses
  PENDING: {
    label: 'Pending',
    className: 'bg-amber-50 text-amber-700 border-amber-200/80 dark:bg-amber-950/50 dark:text-amber-400 dark:border-amber-900/60',
  },
  CONFIRMED: {
    label: 'Confirmed',
    className: 'bg-emerald-50 text-emerald-700 border-emerald-200/80 dark:bg-emerald-950/50 dark:text-emerald-400 dark:border-emerald-900/60',
  },
  COMPLETED: {
    label: 'Completed',
    className: 'bg-emerald-50 text-emerald-700 border-emerald-200/80 dark:bg-emerald-950/50 dark:text-emerald-400 dark:border-emerald-900/60',
  },
  CANCELLED: {
    label: 'Cancelled',
    className: 'bg-rose-50 text-rose-700 border-rose-200/80 dark:bg-rose-950/50 dark:text-rose-400 dark:border-rose-900/60',
  },
  RESCHEDULED: {
    label: 'Rescheduled',
    className: 'bg-purple-50 text-purple-700 border-purple-200/80 dark:bg-purple-950/50 dark:text-purple-400 dark:border-purple-900/60',
  },
  CLOSED: {
    label: 'Closed',
    className: 'bg-neutral-100 text-neutral-700 border-neutral-200 dark:bg-neutral-800 dark:text-neutral-300 dark:border-neutral-700',
  },

  // Invoices & Billing
  DRAFT: {
    label: 'Draft',
    className: 'bg-neutral-100 text-neutral-600 border-neutral-200/80 dark:bg-neutral-800 dark:text-neutral-400 dark:border-neutral-700',
  },
  SENT: {
    label: 'Sent',
    className: 'bg-blue-50 text-blue-700 border-blue-200/80 dark:bg-blue-950/50 dark:text-blue-400 dark:border-blue-900/60',
  },
  PAID: {
    label: 'Paid',
    className: 'bg-emerald-50 text-emerald-700 border-emerald-200/80 dark:bg-emerald-950/50 dark:text-emerald-400 dark:border-emerald-900/60',
  },
  PARTIALLY_PAID: {
    label: 'Partially Paid',
    className: 'bg-amber-50 text-amber-700 border-amber-200/80 dark:bg-amber-950/50 dark:text-amber-400 dark:border-amber-900/60',
  },
  UNPAID: {
    label: 'Unpaid',
    className: 'bg-rose-50 text-rose-700 border-rose-200/80 dark:bg-rose-950/50 dark:text-rose-400 dark:border-rose-900/60',
  },
  OVERDUE: {
    label: 'Overdue',
    className: 'bg-rose-50 text-rose-800 border-rose-300 dark:bg-rose-950/70 dark:text-rose-300 dark:border-rose-800',
  },
};

export function StatusBadge({ status, className, size = 'default', ...props }: StatusBadgeProps) {
  if (!status) return null;
  const normalized = String(status).toUpperCase();
  const config = statusConfig[normalized] || {
    label: String(status).replace(/_/g, ' '),
    className: 'bg-neutral-100 text-neutral-700 border-neutral-200 dark:bg-neutral-800 dark:text-neutral-300 dark:border-neutral-700',
  };

  return (
    <span
      className={cn(
        'inline-flex items-center justify-center font-medium rounded-full border transition-colors whitespace-nowrap select-none',
        size === 'sm' ? 'px-2 py-0.5 text-[11px]' : 'px-2.5 py-0.5 text-xs',
        config.className,
        className
      )}
      {...props}
    >
      {config.label}
    </span>
  );
}
