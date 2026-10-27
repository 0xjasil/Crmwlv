'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { ProfileDialog } from './profile-dialog';
import { Button } from '@/components/ui/button';
import { ArrowLeft } from 'lucide-react';

interface ProfilePageClientProps {
  user: {
    id?: string;
    name: string;
    email: string;
    image?: string | null;
    role?: string | null;
    branch?: string | null;
  };
}

export function ProfilePageClient({ user }: ProfilePageClientProps) {
  const router = useRouter();
  const [open, setOpen] = useState(true);

  const handleOpenChange = (isOpen: boolean) => {
    setOpen(isOpen);
    if (!isOpen) {
      router.back();
    }
  };

  return (
    <div className="flex flex-1 items-center justify-center min-h-[80vh] p-4">
      {/* Background container if modal is closed */}
      <div className="text-center space-y-4">
        <Button
          variant="outline"
          onClick={() => setOpen(true)}
          className="gap-2 shadow-sm"
        >
          Open Profile & Account Settings
        </Button>
        <div className="block">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => router.push('/dashboard')}
            className="text-xs text-muted-foreground gap-1"
          >
            <ArrowLeft className="h-3.5 w-3.5" />
            Return to Dashboard
          </Button>
        </div>
      </div>

      {/* The Profile Dialog Modal */}
      <ProfileDialog
        user={user}
        open={open}
        onOpenChange={handleOpenChange}
      />
    </div>
  );
}
