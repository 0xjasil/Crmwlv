'use client';

import { useAction } from 'next-safe-action/hooks';
import { logoutAction } from '@/lib/actions/auth';
import { Button } from '@/components/ui/button';
import { LogOut } from 'lucide-react';

interface LogoutButtonProps {
  variant?: 'default' | 'ghost' | 'outline' | 'destructive';
  size?: 'default' | 'sm' | 'lg' | 'icon';
  className?: string;
  showIcon?: boolean;
  children?: React.ReactNode;
}

export function LogoutButton({
  variant = 'ghost',
  size = 'default',
  className = '',
  showIcon = true,
  children,
}: LogoutButtonProps) {
  const { execute, isExecuting } = useAction(logoutAction);

  const handleLogout = () => {
    execute();
  };

  return (
    <Button
      variant={variant}
      size={size}
      className={className}
      onClick={handleLogout}
      disabled={isExecuting}
    >
      {showIcon && <LogOut className="mr-2 h-4 w-4" />}
      {children || (isExecuting ? 'Signing out...' : 'Sign out')}
    </Button>
  );
}
