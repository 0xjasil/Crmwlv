import React from 'react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';

interface EmptyStateProps {
  icon?: React.ElementType | React.ReactNode;
  title: string;
  description?: string;
  action?:
    | React.ReactNode
    | {
        label: string;
        onClick?: () => void;
        href?: string;
      };
  className?: string;
}

export function EmptyState({
  icon: Icon,
  title,
  description,
  action,
  className,
}: EmptyStateProps) {
  const renderIcon = () => {
    if (!Icon) return null;
    if (React.isValidElement(Icon)) {
      return Icon;
    }
    if (typeof Icon === 'function') {
      const Component = Icon as React.ComponentType<{ className?: string }>;
      return <Component className="size-6 text-muted-foreground" />;
    }
    if (typeof Icon === 'object' && Icon !== null) {
      return React.createElement(Icon as unknown as React.ComponentType<{ className?: string }>, {
        className: 'size-6 text-muted-foreground',
      });
    }
    return Icon;
  };

  return (
    <div
      className={cn(
        'flex flex-col items-center justify-center p-8 sm:p-12 text-center rounded-xl border border-dashed border-border/80 bg-card/50',
        className
      )}
    >
      {Icon && (
        <div className="flex size-12 items-center justify-center rounded-full bg-muted text-muted-foreground mb-4 ring-1 ring-border/60">
          {renderIcon()}
        </div>
      )}
      <h3 className="text-base font-semibold text-foreground">{title}</h3>
      {description && (
        <p className="mt-1 text-sm text-muted-foreground max-w-sm">
          {description}
        </p>
      )}
      {action && (
        <div className="mt-5">
          {React.isValidElement(action) ? (
            action
          ) : typeof action === 'object' && 'label' in action ? (
            action.href ? (
              <Button asChild size="sm">
                <a href={action.href}>{action.label}</a>
              </Button>
            ) : (
              <Button size="sm" onClick={action.onClick}>
                {action.label}
              </Button>
            )
          ) : null}
        </div>
      )}
    </div>
  );
}
