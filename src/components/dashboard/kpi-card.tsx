import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { cn } from '@/lib/utils';
import Link from 'next/link';

interface KpiCardProps {
  title: string;
  value: string | number;
  icon?: React.ReactNode;
  description?: React.ReactNode;
  trend?: {
    value: string | number;
    isPositive?: boolean;
    label?: string;
  };
  href?: string;
  className?: string;
}

export function KpiCard({
  title,
  value,
  icon,
  description,
  trend,
  href,
  className,
}: KpiCardProps) {
  const content = (
    <Card
      className={cn(
        'relative overflow-hidden border border-border/80 bg-card p-5 shadow-xs transition-all duration-200 hover:shadow-md hover:border-border',
        href && 'cursor-pointer hover:border-primary/40',
        className
      )}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="space-y-1.5 flex-1 min-w-0">
          <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground truncate">
            {title}
          </p>
          <div className="flex items-baseline gap-2">
            <span className="text-2xl sm:text-3xl font-bold tracking-tight text-foreground">
              {value}
            </span>
            {trend && (
              <span
                className={cn(
                  'inline-flex items-center text-xs font-semibold px-1.5 py-0.5 rounded-sm',
                  trend.isPositive
                    ? 'text-emerald-700 bg-emerald-50 dark:bg-emerald-950/60 dark:text-emerald-400'
                    : 'text-rose-700 bg-rose-50 dark:bg-rose-950/60 dark:text-rose-400'
                )}
              >
                {trend.isPositive ? '↑' : '↓'} {trend.value}
                {trend.label && <span className="ml-1 text-[10px] font-normal text-muted-foreground">{trend.label}</span>}
              </span>
            )}
          </div>
          {description && (
            <p className="text-xs text-muted-foreground pt-0.5">{description}</p>
          )}
        </div>
        {icon && (
          <div className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-neutral-100/90 dark:bg-neutral-800/80 text-foreground/80 ring-1 ring-border/50">
            {icon}
          </div>
        )}
      </div>
    </Card>
  );

  if (href) {
    return <Link href={href} className="block">{content}</Link>;
  }

  return content;
}
