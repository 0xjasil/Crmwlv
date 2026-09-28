'use client';

import { useState } from 'react';
import { Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  AlertDialog,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import { toast } from 'sonner';
import { deleteExpenseAction } from '@/server/actions/expense-actions';

interface DeleteExpenseDialogProps {
  open?: boolean;
  onClose?: () => void;
  onSuccess?: () => void;
  expense: {
    id: string;
    title: string;
    amount?: number;
  };
  trigger?: React.ReactNode;
}

export function DeleteExpenseDialog({
  open,
  onClose,
  onSuccess,
  expense,
  trigger,
}: DeleteExpenseDialogProps) {
  const [isOpen, setIsOpen] = useState(open || false);
  const [isDeleting, setIsDeleting] = useState(false);

  const handleClose = () => {
    setIsOpen(false);
    onClose?.();
  };

  const handleDelete = async () => {
    try {
      setIsDeleting(true);
      const result = await deleteExpenseAction({ id: expense.id });

      if (result?.data?.success) {
        toast.success(result.data.message || 'Expense deleted successfully');
        handleClose();
        onSuccess?.();
      } else {
        toast.error('Failed to delete expense');
      }
    } catch (error) {
      console.error('Error deleting expense:', error);
      toast.error('Failed to delete expense');
    } finally {
      setIsDeleting(false);
    }
  };

  const dialogContent = (
    <AlertDialogContent>
      <AlertDialogHeader>
        <AlertDialogTitle className="flex items-center gap-2 text-destructive">
          <Trash2 className="h-5 w-5" />
          Delete Expense
        </AlertDialogTitle>
        <AlertDialogDescription>
          Are you sure you want to delete expense <span className="font-bold">{expense.title}</span> ? This action cannot be undone and will permanently remove the expense and all associated data.
        </AlertDialogDescription>
      </AlertDialogHeader>

      <AlertDialogFooter>
        <AlertDialogCancel onClick={handleClose} disabled={isDeleting}>
          Cancel
        </AlertDialogCancel>
        <Button
          variant="destructive"
          onClick={handleDelete}
          disabled={isDeleting}
        >
          {isDeleting ? 'Deleting...' : 'Delete Expense'}
        </Button>
      </AlertDialogFooter>
    </AlertDialogContent>
  );

  if (trigger) {
    return (
      <AlertDialog open={isOpen} onOpenChange={setIsOpen}>
        <AlertDialogTrigger asChild>{trigger}</AlertDialogTrigger>
        {dialogContent}
      </AlertDialog>
    );
  }

  return (
    <AlertDialog open={isOpen} onOpenChange={setIsOpen}>
      {dialogContent}
    </AlertDialog>
  );
}

// Default trigger component
DeleteExpenseDialog.defaultProps = {
  trigger: (
    <Button variant="destructive" size="sm">
      <Trash2 className="mr-2 h-4 w-4" />
      Delete
    </Button>
  ),
};