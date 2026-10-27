import React from 'react';
import { cn } from '@/lib/utils';
import Link from 'next/link';
import {
  IconChevronRight,
  IconArrowUpRight,
  IconArrowDownRight,
} from '@tabler/icons-react';

export type IndicatorColor =
  | 'amber'
  | 'orange'
  | 'emerald'
  | 'green'
  | 'blue'
  | 'purple'
  | 'rose'
  | 'red'
  | 'cyan'
  | 'sky'
  | 'teal'
  | 'slate'
  | 'gray';

export interface KpiCardProps {
  title: string;
  value: string | number;
  indicatorColor?: IndicatorColor | string;
  icon?: React.ReactNode;
  description?: React.ReactNode;
  trend?: {
    value: string | number;
    isPositive?: boolean;
    label?: string;
  };
  href?: string;
  onClick?: () => void;
  showChevron?: boolean;
  className?: string;
}

const COLOR_MAP: Record<string, string> = {
  amber: 'bg-amber-500 dark:bg-amber-400',
  orange: 'bg-orange-500 dark:bg-orange-400',
  emerald: 'bg-emerald-500 dark:bg-emerald-400',
  green: 'bg-emerald-500 dark:bg-emerald-400',
  blue: 'bg-blue-500 dark:bg-blue-400',
  purple: 'bg-purple-500 dark:bg-purple-400',
  rose: 'bg-rose-500 dark:bg-rose-400',
  red: 'bg-rose-500 dark:bg-rose-400',
  cyan: 'bg-cyan-500 dark:bg-cyan-400',
  sky: 'bg-sky-500 dark:bg-sky-400',
  teal: 'bg-teal-500 dark:bg-teal-400',
  slate: 'bg-slate-400 dark:bg-slate-500',
  gray: 'bg-slate-400 dark:bg-slate-500',
};

function getIndicatorColorClass(color?: string, title?: string): string {
  if (color && COLOR_MAP[color.toLowerCase()]) {
    return COLOR_MAP[color.toLowerCase()];
  }
  if (color && color.startsWith('bg-')) {
    return color;
  }

  // Automatic heuristic based on title keyword matching
  const t = (title || '').toLowerCase();
  if (t.includes('total') || t.includes('order') || t.includes('revenue') || t.includes('income')) {
    return 'bg-amber-500 dark:bg-amber-400';
  }
  if (t.includes('ongoing') || t.includes('active') || t.includes('new') || t.includes('enroll') || t.includes('success')) {
    return 'bg-emerald-500 dark:bg-emerald-400';
  }
  if (t.includes('pending') || t.includes('wait') || t.includes('scheduled')) {
    return 'bg-slate-400 dark:bg-slate-500';
  }
  if (t.includes('overdue') || t.includes('urgent') || t.includes('action') || t.includes('expense') || t.includes('drop')) {
    return 'bg-rose-500 dark:bg-rose-400';
  }
  if (t.includes('call') || t.includes('phone') || t.includes('telecaller')) {
    return 'bg-purple-500 dark:bg-purple-400';
  }
  if (t.includes('branch') || t.includes('center')) {
    return 'bg-blue-500 dark:bg-blue-400';
  }

  return 'bg-emerald-500 dark:bg-emerald-400';
}

export function KpiCard({
  title,
  value,
  indicatorColor,
  icon,
  description,
  trend,
  href,
  onClick,
  showChevron = true,
  className,
}: KpiCardProps) {
  const colorClass = getIndicatorColorClass(indicatorColor, title);

  const cardContent = (
    <div
      onClick={onClick}
      className={cn(
        'group relative flex flex-col justify-between rounded-2xl bg-card border border-border/70 p-5 sm:p-6 shadow-xs transition-all duration-200 text-card-foreground',
        (href || onClick) && 'cursor-pointer hover:shadow-md hover:border-border hover:-translate-y-0.5',
        className
      )}
    >
      {/* Top Header: Vertical color pill + Title on left, optional icon & Chevron on right */}
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2.5 min-w-0">
          <span
            className={cn('w-1.5 h-4.5 rounded-full shrink-0', colorClass)}
            aria-hidden="true"
          />
          <span className="text-sm sm:text-[15px] font-medium text-foreground tracking-tight truncate">
            {title}
          </span>
        </div>
        <div className="flex items-center gap-1.5 shrink-0 text-muted-foreground/60">
          {icon && (
            <span className="transition-colors group-hover:text-foreground">
              {icon}
            </span>
          )}
          {showChevron && (
            <IconChevronRight className="w-4 h-4 transition-transform duration-200 group-hover:translate-x-0.5" />
          )}
        </div>
      </div>

      {/* Value & Inline Trend Section */}
      <div className="flex items-baseline gap-2.5 mt-4">
        <span className="text-3xl sm:text-4xl font-bold tracking-tight text-foreground">
          {value}
        </span>
        {trend && (
          <span
            className={cn(
              'inline-flex items-center gap-1 text-sm sm:text-base font-semibold',
              trend.isPositive !== false
                ? 'text-emerald-600 dark:text-emerald-400'
                : 'text-rose-600 dark:text-rose-400'
            )}
          >
            {trend.isPositive !== false ? (
              <IconArrowUpRight className="w-4 h-4 stroke-[2.5]" />
            ) : (
              <IconArrowDownRight className="w-4 h-4 stroke-[2.5]" />
            )}
            <span>{trend.value}</span>
            {trend.label && (
              <span className="text-xs font-normal text-muted-foreground ml-0.5">
                {trend.label}
              </span>
            )}
          </span>
        )}
      </div>

      {/* Description Text */}
      {description && (
        <p className="text-xs sm:text-[13px] text-muted-foreground leading-relaxed mt-2.5">
          {description}
        </p>
      )}
    </div>
  );

  if (href) {
    return (
      <Link href={href} className="block focus:outline-hidden">
        {cardContent}
      </Link>
    );
  }

  return cardContent;
}

export default KpiCard;
