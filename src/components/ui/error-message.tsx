import { cn } from '@/lib/utils';

interface ErrorMessageProps {
  message?: string | string[] | null;
  className?: string;
}

export function ErrorMessage({ message, className }: ErrorMessageProps) {
  if (!message) return null;

  const messageText = Array.isArray(message) ? message.join(', ') : message;

  return (
    <div
      className={cn(
        'text-sm text-destructive bg-destructive/10 p-3 rounded-md border border-destructive/20',
        className
      )}
    >
      {messageText}
    </div>
  );
}
