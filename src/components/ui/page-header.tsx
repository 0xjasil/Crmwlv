import React from 'react';
import { cn } from '@/lib/utils';

interface PageContainerProps extends React.HTMLAttributes<HTMLDivElement> {
  children: React.ReactNode;
  className?: string;
  maxWidth?: 'default' | 'full' | 'narrow';
}

export function PageContainer({
  children,
  className,
  maxWidth = 'default',
  ...props
}: PageContainerProps) {
  return (
    <div
      className={cn(
        'w-full mx-auto p-4 sm:p-6 lg:p-8 space-y-6',
        maxWidth === 'default' && 'max-w-[1600px]',
        maxWidth === 'narrow' && 'max-w-5xl',
        maxWidth === 'full' && 'max-w-full',
        className
      )}
      {...props}
    >
      {children}
    </div>
  );
}

interface PageHeaderProps extends React.HTMLAttributes<HTMLDivElement> {
  title: string;
  description?: React.ReactNode;
  badge?: React.ReactNode;
  actions?: React.ReactNode;
  className?: string;
}

export function PageHeader({
  title,
  description,
  badge,
  actions,
  className,
  ...props
}: PageHeaderProps) {
  return (
    <div
      className={cn(
        'flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between pb-2',
        className
      )}
      {...props}
    >
      <div className="space-y-1">
        <div className="flex items-center gap-2.5 flex-wrap">
          <h1 className="text-2xl font-bold tracking-tight text-foreground">{title}</h1>
          {badge}
        </div>
        {description && (
          <p className="text-sm text-muted-foreground">{description}</p>
        )}
      </div>
      {actions && (
        <div className="flex items-center gap-2.5 flex-wrap">{actions}</div>
      )}
    </div>
  );
}
