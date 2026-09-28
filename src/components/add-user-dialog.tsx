// src/components/add-user-dialog.tsx
'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { PlusIcon } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { UserForm } from '@/components/user-form';
import type { Role, Branch } from '@prisma/client';

interface AddUserDialogProps {
  roles: Role[];
  branches: Branch[];
}

export function AddUserDialog({ roles, branches }: AddUserDialogProps) {
  const [isOpen, setIsOpen] = useState(false);
  const router = useRouter();

  const handleSuccess = () => {
    setIsOpen(false);
    // Use router refresh instead of window.location.reload()
    setTimeout(() => {
      router.refresh();
    }, 100);
  };

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button>
          <PlusIcon className="w-4 h-4" />
          Add User
        </Button>
      </DialogTrigger>
      <DialogContent className="!max-w-md space-y-4">
        <DialogHeader>
          <DialogTitle>Add User</DialogTitle>
          <DialogDescription>Add a new user to the system</DialogDescription>
        </DialogHeader>
        <UserForm roles={roles} branches={branches} onSuccess={handleSuccess} />
      </DialogContent>
    </Dialog>
  );
}
